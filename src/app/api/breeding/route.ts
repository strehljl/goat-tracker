import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const herdId = searchParams.get("herdId");

  try {
    const where: Record<string, unknown> = { farmId };
    if (status) where.status = status as "PENDING" | "CONFIRMED" | "FAILED" | "DELIVERED";

    // If herdId provided, scope to animals in that herd
    if (herdId) {
      where.OR = [
        { parentFemale: { herdId } },
        { parentMale: { herdId } },
      ];
    }

    const events = await prisma.breedingEvent.findMany({
      where,
      include: {
        parentFemale: { select: { id: true, name: true, tagId: true } },
        parentMale: { select: { id: true, name: true, tagId: true } },
        birthRecord: {
          include: {
            offspring: {
              include: { animal: { select: { id: true, name: true, tagId: true } } },
            },
          },
        },
      },
      orderBy: { breedingDate: "desc" },
    });
    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching breeding events:", error);
    return NextResponse.json({ error: "Failed to fetch breeding events" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  try {
    const { parentFemaleId, parentMaleId, breedingDate, expectedDueDate, notes } =
      await request.json();

    if (!parentFemaleId || !parentMaleId || !breedingDate) {
      return NextResponse.json(
        { error: "Female parent, male parent, and breeding date are required" },
        { status: 400 }
      );
    }

    const [female, male] = await Promise.all([
      prisma.animal.findFirst({ where: { id: parentFemaleId, farmId } }),
      prisma.animal.findFirst({ where: { id: parentMaleId, farmId } }),
    ]);
    if (!female || !male) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }

    const event = await prisma.breedingEvent.create({
      data: {
        farmId,
        parentFemaleId,
        parentMaleId,
        breedingDate: new Date(breedingDate),
        expectedDueDate: expectedDueDate ? new Date(expectedDueDate) : null,
        notes: notes || null,
      },
      include: {
        parentFemale: { select: { id: true, name: true, tagId: true } },
        parentMale: { select: { id: true, name: true, tagId: true } },
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating breeding event:", error);
    return NextResponse.json({ error: "Failed to create breeding event" }, { status: 500 });
  }
}
