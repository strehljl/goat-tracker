import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";
import { errorResponse } from "@/lib/apiError";

// POST /api/breeding/[id]/birth — record a birth event for a breeding event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id: breedingEventId } = await params;

  try {
    const { birthDate, complications, notes, offspring } = await request.json();

    if (!birthDate) {
      return NextResponse.json({ error: "Birth date is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const parentEvent = await tx.breedingEvent.findFirst({
        where: { id: breedingEventId, farmId },
        select: { parentFemaleId: true, parentMaleId: true },
      });

      if (!parentEvent) {
        throw new Error("Breeding event not found");
      }

      const birthRecord = await tx.birthRecord.create({
        data: {
          breedingEventId,
          birthDate: new Date(birthDate),
          complications: complications || null,
          notes: notes || null,
        },
      });

      if (offspring && Array.isArray(offspring)) {
        for (const o of offspring) {
          let animalId: string | null = null;

          if (o.registerAsAnimal && o.name && o.tagId) {
            // Get the herd from the female parent so offspring inherits it
            const femaleParent = await tx.animal.findUnique({
              where: { id: parentEvent.parentFemaleId },
              select: { herdId: true },
            });

            const animal = await tx.animal.create({
              data: {
                farmId,
                herdId: femaleParent?.herdId ?? null,
                name: o.name,
                tagId: o.tagId,
                gender: o.gender,
                dateOfBirth: new Date(birthDate),
                damId: parentEvent.parentFemaleId || null,
                sireId: parentEvent.parentMaleId || null,
                status: "ACTIVE",
              },
            });
            animalId = animal.id;
          }

          await tx.offspring.create({
            data: {
              birthRecordId: birthRecord.id,
              gender: o.gender,
              birthWeight: o.birthWeight ? parseFloat(o.birthWeight) : null,
              status: o.status || "ALIVE",
              animalId,
            },
          });
        }
      }

      await tx.breedingEvent.update({
        where: { id: breedingEventId },
        data: { status: "DELIVERED" },
      });

      return birthRecord;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Breeding event not found") {
      return NextResponse.json({ error: "Breeding event not found" }, { status: 404 });
    }
    return errorResponse(error, "Failed to record birth");
  }
}

// PUT /api/breeding/[id]/birth — edit an existing birth record and its offspring
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id: breedingEventId } = await params;

  try {
    const { birthDate, complications, notes, offspring } = await request.json();

    if (!birthDate) {
      return NextResponse.json({ error: "Birth date is required" }, { status: 400 });
    }

    const event = await prisma.breedingEvent.findFirst({
      where: { id: breedingEventId, farmId },
      include: { birthRecord: { include: { offspring: true } } },
    });

    if (!event || !event.birthRecord) {
      return NextResponse.json({ error: "Birth record not found" }, { status: 404 });
    }

    const existingOffspringIds = new Set(event.birthRecord.offspring.map((o) => o.id));

    const result = await prisma.$transaction(async (tx) => {
      const updatedRecord = await tx.birthRecord.update({
        where: { id: event.birthRecord!.id },
        data: {
          birthDate: new Date(birthDate),
          complications: complications || null,
          notes: notes || null,
        },
      });

      if (Array.isArray(offspring)) {
        for (const o of offspring) {
          if (!o.id || !existingOffspringIds.has(o.id)) continue;

          const updated = await tx.offspring.update({
            where: { id: o.id },
            data: {
              birthWeight: o.birthWeight ? parseFloat(o.birthWeight) : null,
              status: o.status || "ALIVE",
              gender: o.gender,
            },
          });

          if (updated.animalId) {
            await tx.animal.update({
              where: { id: updated.animalId },
              data: { gender: o.gender },
            });
          }
        }
      }

      return updatedRecord;
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Failed to update birth record");
  }
}
