import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

// POST /api/breeding/[id]/kidding - Record kidding for a breeding event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id: breedingEventId } = await params;

  try {
    const { kiddingDate, complications, notes, kids } = await request.json();

    if (!kiddingDate) {
      return NextResponse.json({ error: "Kidding date is required" }, { status: 400 });
    }

    // Create kidding record with kids in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Verify breeding event belongs to this farm
      const parentEvent = await tx.breedingEvent.findFirst({
        where: { id: breedingEventId, farmId },
        select: { doeId: true, buckId: true },
      });

      if (!parentEvent) {
        throw new Error("Breeding event not found");
      }

      const kiddingRecord = await tx.kiddingRecord.create({
        data: {
          breedingEventId,
          kiddingDate: new Date(kiddingDate),
          complications: complications || null,
          notes: notes || null,
        },
      });

      // Create kid records and optionally register as goats
      if (kids && Array.isArray(kids)) {
        for (const kid of kids) {
          let goatId: string | null = null;

          // If kid should be registered as a goat
          if (kid.registerAsGoat && kid.name && kid.tagId) {
            const goat = await tx.goat.create({
              data: {
                farmId,
                name: kid.name,
                tagId: kid.tagId,
                gender: kid.gender,
                dateOfBirth: new Date(kiddingDate),
                damId: parentEvent.doeId || null,
                sireId: parentEvent.buckId || null,
                status: "ACTIVE",
              },
            });
            goatId = goat.id;
          }

          await tx.kid.create({
            data: {
              kiddingRecordId: kiddingRecord.id,
              gender: kid.gender,
              birthWeight: kid.birthWeight ? parseFloat(kid.birthWeight) : null,
              status: kid.status || "ALIVE",
              goatId,
            },
          });
        }
      }

      // Update breeding event status
      await tx.breedingEvent.update({
        where: { id: breedingEventId },
        data: { status: "DELIVERED" },
      });

      return kiddingRecord;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error recording kidding:", error);
    if (error instanceof Error && error.message === "Breeding event not found") {
      return NextResponse.json({ error: "Breeding event not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to record kidding" }, { status: 500 });
  }
}
