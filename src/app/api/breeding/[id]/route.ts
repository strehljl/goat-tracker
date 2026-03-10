import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id } = await params;
  try {
    const owned = await prisma.breedingEvent.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Breeding event not found" }, { status: 404 });
    }

    const { doeId, buckId, breedingDate, expectedDueDate, status, notes } = await request.json();

    const [doe, buck] = await Promise.all([
      prisma.goat.findFirst({ where: { id: doeId, farmId } }),
      prisma.goat.findFirst({ where: { id: buckId, farmId } }),
    ]);
    if (!doe || !buck) {
      return NextResponse.json({ error: "Goat not found" }, { status: 404 });
    }

    const event = await prisma.breedingEvent.update({
      where: { id },
      data: {
        doeId,
        buckId,
        breedingDate: new Date(breedingDate),
        expectedDueDate: expectedDueDate ? new Date(expectedDueDate) : null,
        status: status || undefined,
        notes: notes || null,
      },
    });
    return NextResponse.json(event);
  } catch (error) {
    console.error("Error updating breeding event:", error);
    return NextResponse.json({ error: "Failed to update breeding event" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id } = await params;
  try {
    const owned = await prisma.breedingEvent.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Breeding event not found" }, { status: 404 });
    }

    await prisma.breedingEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting breeding event:", error);
    return NextResponse.json({ error: "Failed to delete breeding event" }, { status: 500 });
  }
}
