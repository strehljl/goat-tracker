-- =============================================================================
-- Herd Tracker Migration: Goat Tracker → Herd Tracker
-- Run this ONCE against your Supabase database BEFORE running `prisma db push`.
-- Use the DIRECT (non-pooler) connection string.
--
-- What this does:
--   1. Creates new enum types (AnimalType, AnimalGender, AnimalStatus, OffspringStatus)
--   2. Renames table "Goat" → "Animal"
--   3. Renames table "KiddingRecord" → "BirthRecord"
--   4. Renames table "Kid" → "Offspring"
--   5. Renames goatId columns → animalId across all child tables
--   6. Migrates gender values: DOE→FEMALE, BUCK→MALE, WETHER→NEUTERED_MALE
--   7. Migrates GoatStatus → AnimalStatus (same values, new type)
--   8. Renames breeding foreign key columns (doeId→parentFemaleId, buckId→parentMaleId)
--   9. Renames kiddingRecord relation columns
--  10. Creates the new "Herd" table
--  11. Adds herdId to Animal table
--  12. Creates a default "Default Herd" for each farm with animalType=GOAT
--  13. Links all existing animals to their farm's default herd
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Create new enum types
-- ---------------------------------------------------------------------------

CREATE TYPE "AnimalType" AS ENUM ('GOAT', 'SHEEP', 'CATTLE', 'PIG', 'ALPACA', 'OTHER');

CREATE TYPE "AnimalGender" AS ENUM ('FEMALE', 'MALE', 'NEUTERED_MALE');

CREATE TYPE "AnimalStatus" AS ENUM ('ACTIVE', 'SOLD', 'DECEASED');

CREATE TYPE "OffspringStatus" AS ENUM ('ALIVE', 'STILLBORN');

-- ---------------------------------------------------------------------------
-- 2. Rename table "Goat" → "Animal"
-- ---------------------------------------------------------------------------

ALTER TABLE "Goat" RENAME TO "Animal";

-- ---------------------------------------------------------------------------
-- 3. Migrate gender column on Animal: Gender → AnimalGender
-- ---------------------------------------------------------------------------

ALTER TABLE "Animal"
  ALTER COLUMN "gender" TYPE "AnimalGender"
  USING CASE "gender"::text
    WHEN 'DOE'    THEN 'FEMALE'::"AnimalGender"
    WHEN 'BUCK'   THEN 'MALE'::"AnimalGender"
    WHEN 'WETHER' THEN 'NEUTERED_MALE'::"AnimalGender"
  END;

-- ---------------------------------------------------------------------------
-- 4. Migrate status column on Animal: GoatStatus → AnimalStatus
-- ---------------------------------------------------------------------------

ALTER TABLE "Animal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Animal"
  ALTER COLUMN "status" TYPE "AnimalStatus"
  USING "status"::text::"AnimalStatus";
ALTER TABLE "Animal"
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"AnimalStatus";

-- ---------------------------------------------------------------------------
-- 5. Rename "KiddingRecord" → "BirthRecord", column kiddingDate → birthDate
-- ---------------------------------------------------------------------------

ALTER TABLE "KiddingRecord" RENAME TO "BirthRecord";
ALTER TABLE "BirthRecord" RENAME COLUMN "kiddingDate" TO "birthDate";

-- ---------------------------------------------------------------------------
-- 6. Rename "Kid" → "Offspring", fix columns and migrate gender/status enums
--    (must happen BEFORE dropping old enum types)
-- ---------------------------------------------------------------------------

ALTER TABLE "Kid" RENAME TO "Offspring";
ALTER TABLE "Offspring" RENAME COLUMN "kiddingRecordId" TO "birthRecordId";
ALTER TABLE "Offspring" RENAME COLUMN "goatId" TO "animalId";

-- Migrate Kid.gender: Gender → AnimalGender
ALTER TABLE "Offspring"
  ALTER COLUMN "gender" TYPE "AnimalGender"
  USING CASE "gender"::text
    WHEN 'DOE'    THEN 'FEMALE'::"AnimalGender"
    WHEN 'BUCK'   THEN 'MALE'::"AnimalGender"
    WHEN 'WETHER' THEN 'NEUTERED_MALE'::"AnimalGender"
  END;

-- Migrate Kid.status: KidStatus → OffspringStatus (same values)
ALTER TABLE "Offspring" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Offspring"
  ALTER COLUMN "status" TYPE "OffspringStatus"
  USING "status"::text::"OffspringStatus";
ALTER TABLE "Offspring"
  ALTER COLUMN "status" SET DEFAULT 'ALIVE'::"OffspringStatus";

-- ---------------------------------------------------------------------------
-- 7. Drop old enum types (now safe — all columns migrated off them)
-- ---------------------------------------------------------------------------

DROP TYPE "Gender";
DROP TYPE "GoatStatus";
DROP TYPE "KidStatus";

-- ---------------------------------------------------------------------------
-- 8. Rename goatId → animalId in all health/financial tables
-- ---------------------------------------------------------------------------

ALTER TABLE "Vaccination" RENAME COLUMN "goatId" TO "animalId";
ALTER TABLE "Medication"  RENAME COLUMN "goatId" TO "animalId";
ALTER TABLE "VetVisit"    RENAME COLUMN "goatId" TO "animalId";
ALTER TABLE "Deworming"   RENAME COLUMN "goatId" TO "animalId";
ALTER TABLE "HealthNote"  RENAME COLUMN "goatId" TO "animalId";
ALTER TABLE "Expense"     RENAME COLUMN "goatId" TO "animalId";
ALTER TABLE "Sale"        RENAME COLUMN "goatId" TO "animalId";

-- ---------------------------------------------------------------------------
-- 9. Rename BreedingEvent columns: doeId/buckId → parentFemaleId/parentMaleId
--    and rename kiddingRecord relation (table already renamed above)
-- ---------------------------------------------------------------------------

ALTER TABLE "BreedingEvent" RENAME COLUMN "doeId"  TO "parentFemaleId";
ALTER TABLE "BreedingEvent" RENAME COLUMN "buckId"  TO "parentMaleId";

-- ---------------------------------------------------------------------------
-- 10. Rename Farm relation column (goats[] → animals[] handled by Prisma;
--     FarmLocation.goats → animals[] also Prisma-level, no column to rename)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 11. Create the Herd table
-- ---------------------------------------------------------------------------

CREATE TABLE "Herd" (
  "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "farmId"      TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "animalType"  "AnimalType" NOT NULL DEFAULT 'GOAT',
  "description" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Herd_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Herd_farmId_name_key" ON "Herd"("farmId", "name");
CREATE INDEX "Herd_farmId_idx" ON "Herd"("farmId");

ALTER TABLE "Herd"
  ADD CONSTRAINT "Herd_farmId_fkey"
  FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 12. Add herdId column to Animal
-- ---------------------------------------------------------------------------

ALTER TABLE "Animal" ADD COLUMN "herdId" TEXT;
CREATE INDEX "Animal_herdId_idx" ON "Animal"("herdId");

ALTER TABLE "Animal"
  ADD CONSTRAINT "Animal_herdId_fkey"
  FOREIGN KEY ("herdId") REFERENCES "Herd"("id") ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 13. Create a default "Goats" herd for every existing farm and assign animals
-- ---------------------------------------------------------------------------

-- Insert one default herd per farm that has animals
INSERT INTO "Herd" ("id", "farmId", "name", "animalType", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  f."id",
  'Goats',
  'GOAT'::"AnimalType",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Farm" f;

-- Link all existing animals to their farm's default herd
UPDATE "Animal" a
SET "herdId" = h."id"
FROM "Herd" h
WHERE h."farmId" = a."farmId"
  AND h."name" = 'Goats';

COMMIT;
