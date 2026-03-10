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
    const owned = await prisma.vetVisit.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Vet visit not found" }, { status: 404 });
    }

    const { goatId, date, reason, diagnosis, treatment, cost, vetName, notes } = await request.json();

    const goat = await prisma.goat.findFirst({ where: { id: goatId, farmId } });
    if (!goat) {
      return NextResponse.json({ error: "Goat not found" }, { status: 404 });
    }

    const vetVisit = await prisma.vetVisit.update({
      where: { id },
      data: {
        goatId,
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
    console.error("Error updating vet visit:", error);
    return NextResponse.json({ error: "Failed to update vet visit" }, { status: 500 });
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
    console.error("Error deleting vet visit:", error);
    return NextResponse.json({ error: "Failed to delete vet visit" }, { status: 500 });
  }
}
