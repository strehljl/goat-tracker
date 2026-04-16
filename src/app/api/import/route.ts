import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";
import { AnimalGender, AnimalStatus } from "@prisma/client";

interface AnimalImportRow {
  name: string;
  tagId: string;
  gender: string;
  breed?: string;
  dateOfBirth?: string;
  colorMarkings?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  damTagId?: string;
  sireTagId?: string;
  location?: string;
  status?: string;
  notes?: string;
}

interface ImportRequestBody {
  animals: AnimalImportRow[];
  herdId?: string;
}

const VALID_GENDERS = new Set(["FEMALE", "MALE", "NEUTERED_MALE"]);
const VALID_STATUSES = new Set(["ACTIVE", "SOLD", "DECEASED"]);

export async function POST(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  let body: ImportRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { animals, herdId } = body;
  if (!Array.isArray(animals) || animals.length === 0) {
    return NextResponse.json({ error: "No animals provided" }, { status: 400 });
  }
  if (animals.length > 1000) {
    return NextResponse.json({ error: "Cannot import more than 1000 animals at once" }, { status: 400 });
  }

  // Validate herdId if provided
  if (herdId) {
    const herd = await prisma.herd.findFirst({ where: { id: herdId, farmId } });
    if (!herd) {
      return NextResponse.json({ error: "Herd not found" }, { status: 404 });
    }
  }

  // Server-side re-validation
  const validationErrors: string[] = [];
  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    const label = `Row ${i + 1} (${a.tagId ?? "no tag"})`;
    if (!a.name?.trim()) validationErrors.push(`${label}: name is required`);
    if (!a.tagId?.trim()) validationErrors.push(`${label}: tagId is required`);
    if (!VALID_GENDERS.has(a.gender?.toUpperCase?.())) {
      validationErrors.push(`${label}: invalid gender "${a.gender}" (must be FEMALE, MALE, or NEUTERED_MALE)`);
    }
    if (a.status && !VALID_STATUSES.has(a.status?.toUpperCase?.())) {
      validationErrors.push(`${label}: invalid status "${a.status}"`);
    }
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", errors: validationErrors },
      { status: 400 }
    );
  }

  try {
    // Resolve location names -> locationIds (create new ones as needed)
    const locationNameToId = new Map<string, string>();
    const locationNames = new Set<string>();
    for (const a of animals) {
      if (a.location?.trim()) locationNames.add(a.location.trim());
    }
    if (locationNames.size > 0) {
      const existingLocations = await prisma.farmLocation.findMany({
        where: { farmId, name: { in: Array.from(locationNames) } },
        select: { id: true, name: true },
      });
      for (const loc of existingLocations) {
        locationNameToId.set(loc.name, loc.id);
      }
      for (const name of locationNames) {
        if (!locationNameToId.has(name)) {
          const created = await prisma.farmLocation.create({
            data: { farmId, name },
            select: { id: true, name: true },
          });
          locationNameToId.set(created.name, created.id);
        }
      }
    }

    // Collect all tagIds referenced as dam/sire
    const referencedTagIds = new Set<string>();
    for (const a of animals) {
      if (a.damTagId?.trim()) referencedTagIds.add(a.damTagId.trim());
      if (a.sireTagId?.trim()) referencedTagIds.add(a.sireTagId.trim());
    }

    // Fetch pre-existing parents from DB (scoped to this farm)
    const existingParents = await prisma.animal.findMany({
      where: { farmId, tagId: { in: Array.from(referencedTagIds) } },
      select: { id: true, tagId: true },
    });

    // Build tagId -> dbId map seeded with existing parents
    const tagIdToDbId = new Map<string, string>();
    for (const p of existingParents) {
      tagIdToDbId.set(p.tagId, p.id);
    }

    // Pass 1: Insert all animals without dam/sire links
    let imported = 0;
    const insertErrors: string[] = [];

    for (const a of animals) {
      try {
        const locationId = a.location?.trim()
          ? (locationNameToId.get(a.location.trim()) ?? null)
          : null;

        const created = await prisma.animal.create({
          data: {
            farmId,
            herdId: herdId || null,
            name: a.name.trim(),
            tagId: a.tagId.trim(),
            gender: a.gender.toUpperCase() as AnimalGender,
            breed: a.breed?.trim() || null,
            dateOfBirth: a.dateOfBirth ? new Date(a.dateOfBirth) : null,
            colorMarkings: a.colorMarkings?.trim() || null,
            purchaseDate: a.purchaseDate ? new Date(a.purchaseDate) : null,
            purchasePrice: a.purchasePrice != null ? a.purchasePrice : null,
            locationId,
            status: (a.status?.toUpperCase() as AnimalStatus) ?? AnimalStatus.ACTIVE,
            notes: a.notes?.trim() || null,
          },
          select: { id: true, tagId: true },
        });
        tagIdToDbId.set(created.tagId, created.id);
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        insertErrors.push(`Failed to insert "${a.tagId}": ${msg}`);
      }
    }

    // Pass 2: Update lineage links
    for (const a of animals) {
      const damTagId = a.damTagId?.trim();
      const sireTagId = a.sireTagId?.trim();
      if (!damTagId && !sireTagId) continue;

      const animalDbId = tagIdToDbId.get(a.tagId.trim());
      if (!animalDbId) continue; // failed to insert in pass 1

      const updateData: { damId?: string; sireId?: string } = {};

      if (damTagId) {
        const damId = tagIdToDbId.get(damTagId);
        if (damId) {
          updateData.damId = damId;
        } else {
          insertErrors.push(
            `Could not resolve damTagId "${damTagId}" for animal "${a.tagId}" -- parent not found`
          );
        }
      }

      if (sireTagId) {
        const sireId = tagIdToDbId.get(sireTagId);
        if (sireId) {
          updateData.sireId = sireId;
        } else {
          insertErrors.push(
            `Could not resolve sireTagId "${sireTagId}" for animal "${a.tagId}" -- parent not found`
          );
        }
      }

      if (Object.keys(updateData).length > 0) {
        try {
          await prisma.animal.update({
            where: { id: animalDbId },
            data: updateData,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown error";
          insertErrors.push(`Failed to link lineage for "${a.tagId}": ${msg}`);
        }
      }
    }

    return NextResponse.json({ imported, errors: insertErrors });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
