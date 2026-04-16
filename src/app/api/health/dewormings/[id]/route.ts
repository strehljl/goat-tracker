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
    const owned = await prisma.deworming.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Deworming not found" }, { status: 404 });
    }

    const { animalId, productName, dateGiven, nextDueDate, notes } = await request.json();

    const animal = await prisma.animal.findFirst({ where: { id: animalId, farmId } });
    if (!animal) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }

    const deworming = await prisma.deworming.update({
      where: { id },
      data: {
        animalId,
        productName,
        dateGiven: new Date(dateGiven),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        notes: notes || null,
      },
    });
    return NextResponse.json(deworming);
  } catch (error) {
    console.error("Error updating deworming:", error);
    return NextResponse.json({ error: "Failed to update deworming" }, { status: 500 });
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
    const owned = await prisma.deworming.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Deworming not found" }, { status: 404 });
    }

    await prisma.deworming.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting deworming:", error);
    return NextResponse.json({ error: "Failed to delete deworming" }, { status: 500 });
  }
}
