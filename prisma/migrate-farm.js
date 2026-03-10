/**
 * One-time migration: assign all existing records (farmId = null)
 * to the first user's farm, creating one if needed.
 *
 * Run with: node prisma/migrate-farm.js
 */

const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();

async function main() {
  // 1. Find the first registered user
  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!firstUser) {
    console.log("No users found. Nothing to migrate.");
    return;
  }

  console.log(`Migrating to first user: ${firstUser.email} (${firstUser.id})`);

  // 2. Find or create an owner farm for that user
  const existingMembership = await prisma.farmMembership.findFirst({
    where: { userId: firstUser.id, isOwner: true },
    include: { farm: true },
    orderBy: { createdAt: "asc" },
  });

  let farmId;

  if (existingMembership) {
    farmId = existingMembership.farmId;
    console.log(`Using existing farm: "${existingMembership.farm.name}" (${farmId})`);
  } else {
    const farm = await prisma.farm.create({
      data: {
        name: "My Farm",
        joinCode: randomUUID(),
        members: {
          create: { userId: firstUser.id, isOwner: true },
        },
      },
    });
    farmId = farm.id;
    console.log(`Created new farm: "${farm.name}" (${farmId})`);
  }

  // 3. Update all records with farmId = null
  const [goats, vaccinations, medications, vetVisits, dewormings, breedingEvents, expenses, sales] =
    await Promise.all([
      prisma.goat.updateMany({ where: { farmId: null }, data: { farmId } }),
      prisma.vaccination.updateMany({ where: { farmId: null }, data: { farmId } }),
      prisma.medication.updateMany({ where: { farmId: null }, data: { farmId } }),
      prisma.vetVisit.updateMany({ where: { farmId: null }, data: { farmId } }),
      prisma.deworming.updateMany({ where: { farmId: null }, data: { farmId } }),
      prisma.breedingEvent.updateMany({ where: { farmId: null }, data: { farmId } }),
      prisma.expense.updateMany({ where: { farmId: null }, data: { farmId } }),
      prisma.sale.updateMany({ where: { farmId: null }, data: { farmId } }),
    ]);

  console.log("\nMigration complete:");
  console.log(`  Goats:           ${goats.count}`);
  console.log(`  Vaccinations:    ${vaccinations.count}`);
  console.log(`  Medications:     ${medications.count}`);
  console.log(`  Vet visits:      ${vetVisits.count}`);
  console.log(`  Dewormings:      ${dewormings.count}`);
  console.log(`  Breeding events: ${breedingEvents.count}`);
  console.log(`  Expenses:        ${expenses.count}`);
  console.log(`  Sales:           ${sales.count}`);
  console.log(`\nAll records now belong to farm "${existingMembership?.farm.name ?? "My Farm"}" (${farmId})`);
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
