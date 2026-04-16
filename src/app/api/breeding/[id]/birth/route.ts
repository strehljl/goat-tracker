import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

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
    console.error("Error recording birth:", error);
    if (error instanceof Error && error.message === "Breeding event not found") {
      return NextResponse.json({ error: "Breeding event not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to record birth" }, { status: 500 });
  }
}
