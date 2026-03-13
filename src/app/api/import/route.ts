import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";
import { Gender, GoatStatus } from "@prisma/client";

interface GoatImportRow {
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
  goats: GoatImportRow[];
}

const VALID_GENDERS = new Set(["DOE", "BUCK", "WETHER"]);
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

  const { goats } = body;
  if (!Array.isArray(goats) || goats.length === 0) {
    return NextResponse.json({ error: "No goats provided" }, { status: 400 });
  }
  if (goats.length > 1000) {
    return NextResponse.json({ error: "Cannot import more than 1000 goats at once" }, { status: 400 });
  }

  // Server-side re-validation
  const validationErrors: string[] = [];
  for (let i = 0; i < goats.length; i++) {
    const g = goats[i];
    const label = `Row ${i + 1} (${g.tagId ?? "no tag"})`;
    if (!g.name?.trim()) validationErrors.push(`${label}: name is required`);
    if (!g.tagId?.trim()) validationErrors.push(`${label}: tagId is required`);
    if (!VALID_GENDERS.has(g.gender?.toUpperCase?.())) {
      validationErrors.push(`${label}: invalid gender "${g.gender}"`);
    }
    if (g.status && !VALID_STATUSES.has(g.status?.toUpperCase?.())) {
      validationErrors.push(`${label}: invalid status "${g.status}"`);
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
    for (const g of goats) {
      if (g.location?.trim()) locationNames.add(g.location.trim());
    }
    if (locationNames.size > 0) {
      const existingLocations = await prisma.farmLocation.findMany({
        where: { farmId, name: { in: Array.from(locationNames) } },
        select: { id: true, name: true },
      });
      for (const loc of existingLocations) {
        locationNameToId.set(loc.name, loc.id);
      }
      // Create any new location names not already in DB
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
    for (const g of goats) {
      if (g.damTagId?.trim()) referencedTagIds.add(g.damTagId.trim());
      if (g.sireTagId?.trim()) referencedTagIds.add(g.sireTagId.trim());
    }

    // Fetch pre-existing parents from DB (scoped to this farm)
    const existingParents = await prisma.goat.findMany({
      where: { farmId, tagId: { in: Array.from(referencedTagIds) } },
      select: { id: true, tagId: true },
    });

    // Build tagId -> dbId map seeded with existing parents
    const tagIdToDbId = new Map<string, string>();
    for (const p of existingParents) {
      tagIdToDbId.set(p.tagId, p.id);
    }

    // Pass 1: Insert all goats without dam/sire links
    let imported = 0;
    const insertErrors: string[] = [];

    for (const g of goats) {
      try {
        const locationId = g.location?.trim()
          ? (locationNameToId.get(g.location.trim()) ?? null)
          : null;

        const created = await prisma.goat.create({
          data: {
            farmId,
            name: g.name.trim(),
            tagId: g.tagId.trim(),
            gender: g.gender.toUpperCase() as Gender,
            breed: g.breed?.trim() || null,
            dateOfBirth: g.dateOfBirth ? new Date(g.dateOfBirth) : null,
            colorMarkings: g.colorMarkings?.trim() || null,
            purchaseDate: g.purchaseDate ? new Date(g.purchaseDate) : null,
            purchasePrice: g.purchasePrice != null ? g.purchasePrice : null,
            locationId,
            status: (g.status?.toUpperCase() as GoatStatus) ?? GoatStatus.ACTIVE,
            notes: g.notes?.trim() || null,
          },
          select: { id: true, tagId: true },
        });
        tagIdToDbId.set(created.tagId, created.id);
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        insertErrors.push(`Failed to insert "${g.tagId}": ${msg}`);
      }
    }

    // Pass 2: Update lineage links
    for (const g of goats) {
      const damTagId = g.damTagId?.trim();
      const sireTagId = g.sireTagId?.trim();
      if (!damTagId && !sireTagId) continue;

      const goatDbId = tagIdToDbId.get(g.tagId.trim());
      if (!goatDbId) continue; // failed to insert in pass 1

      const updateData: { damId?: string; sireId?: string } = {};

      if (damTagId) {
        const damId = tagIdToDbId.get(damTagId);
        if (damId) {
          updateData.damId = damId;
        } else {
          insertErrors.push(
            `Could not resolve damTagId "${damTagId}" for goat "${g.tagId}" -- parent not found`
          );
        }
      }

      if (sireTagId) {
        const sireId = tagIdToDbId.get(sireTagId);
        if (sireId) {
          updateData.sireId = sireId;
        } else {
          insertErrors.push(
            `Could not resolve sireTagId "${sireTagId}" for goat "${g.tagId}" -- parent not found`
          );
        }
      }

      if (Object.keys(updateData).length > 0) {
        try {
          await prisma.goat.update({
            where: { id: goatDbId },
            data: updateData,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown error";
          insertErrors.push(`Failed to link lineage for "${g.tagId}": ${msg}`);
        }
      }
    }

    return NextResponse.json({ imported, errors: insertErrors });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
