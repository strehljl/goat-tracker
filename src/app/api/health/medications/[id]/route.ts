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
    const owned = await prisma.medication.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    const { goatId, name, dosage, startDate, endDate, notes } = await request.json();

    const goat = await prisma.goat.findFirst({ where: { id: goatId, farmId } });
    if (!goat) {
      return NextResponse.json({ error: "Goat not found" }, { status: 404 });
    }

    const medication = await prisma.medication.update({
      where: { id },
      data: {
        goatId,
        name,
        dosage: dosage || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
      },
    });
    return NextResponse.json(medication);
  } catch (error) {
    console.error("Error updating medication:", error);
    return NextResponse.json({ error: "Failed to update medication" }, { status: 500 });
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
    const owned = await prisma.medication.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    await prisma.medication.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting medication:", error);
    return NextResponse.json({ error: "Failed to delete medication" }, { status: 500 });
  }
}
