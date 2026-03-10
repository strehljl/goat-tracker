import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const goatId = new URL(request.url).searchParams.get("goatId");

  try {
    const vetVisits = await prisma.vetVisit.findMany({
      where: goatId ? { farmId, goatId } : { farmId },
      include: { goat: { select: { id: true, name: true, tagId: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(vetVisits);
  } catch (error) {
    console.error("Error fetching vet visits:", error);
    return NextResponse.json({ error: "Failed to fetch vet visits" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  try {
    const { goatId, date, reason, diagnosis, treatment, cost, vetName, notes } = await request.json();

    if (!goatId || !date || !reason) {
      return NextResponse.json({ error: "Goat, date, and reason are required" }, { status: 400 });
    }

    const goat = await prisma.goat.findFirst({ where: { id: goatId, farmId } });
    if (!goat) {
      return NextResponse.json({ error: "Goat not found" }, { status: 404 });
    }

    const vetVisit = await prisma.vetVisit.create({
      data: {
        farmId,
        goatId,
        date: new Date(date),
        reason,
        diagnosis: diagnosis || null,
        treatment: treatment || null,
        cost: cost ? parseFloat(cost) : null,
        vetName: vetName || null,
        notes: notes || null,
      },
      include: { goat: { select: { id: true, name: true, tagId: true } } },
    });
    return NextResponse.json(vetVisit, { status: 201 });
  } catch (error) {
    console.error("Error creating vet visit:", error);
    return NextResponse.json({ error: "Failed to create vet visit" }, { status: 500 });
  }
}
