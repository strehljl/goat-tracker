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
    const owned = await prisma.vaccination.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Vaccination not found" }, { status: 404 });
    }

    const { animalId, name, dateGiven, nextDueDate, notes } = await request.json();

    const animal = await prisma.animal.findFirst({ where: { id: animalId, farmId } });
    if (!animal) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }

    const vaccination = await prisma.vaccination.update({
      where: { id },
      data: {
        animalId,
        name,
        dateGiven: new Date(dateGiven),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        notes: notes || null,
      },
    });
    return NextResponse.json(vaccination);
  } catch (error) {
    console.error("Error updating vaccination:", error);
    return NextResponse.json({ error: "Failed to update vaccination" }, { status: 500 });
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
    const owned = await prisma.vaccination.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Vaccination not found" }, { status: 404 });
    }

    await prisma.vaccination.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vaccination:", error);
    return NextResponse.json({ error: "Failed to delete vaccination" }, { status: 500 });
  }
}
