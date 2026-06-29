import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";
import { errorResponse } from "@/lib/apiError";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id } = await params;
  try {
    const owned = await prisma.vetVisit.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Vet visit not found" }, { status: 404 });
    }

    const { animalId, date, reason, diagnosis, treatment, cost, vetName, notes } = await request.json();

    const animal = await prisma.animal.findFirst({ where: { id: animalId, farmId } });
    if (!animal) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }

    const vetVisit = await prisma.vetVisit.update({
      where: { id },
      data: {
        animalId,
        date: new Date(date),
        reason,
        diagnosis: diagnosis || null,
        treatment: treatment || null,
        cost: cost ? parseFloat(cost) : null,
        vetName: vetName || null,
        notes: notes || null,
      },
    });
    return NextResponse.json(vetVisit);
  } catch (error) {
    return errorResponse(error, "Failed to update vet visit");
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
    const owned = await prisma.vetVisit.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Vet visit not found" }, { status: 404 });
    }

    await prisma.vetVisit.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete vet visit");
  }
}
