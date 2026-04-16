import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const animalId = new URL(request.url).searchParams.get("animalId");

  try {
    const vetVisits = await prisma.vetVisit.findMany({
      where: animalId ? { farmId, animalId } : { farmId },
      include: { animal: { select: { id: true, name: true, tagId: true } } },
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
    const { animalId, date, reason, diagnosis, treatment, cost, vetName, notes } = await request.json();

    if (!animalId || !date || !reason) {
      return NextResponse.json({ error: "Animal, date, and reason are required" }, { status: 400 });
    }

    const animal = await prisma.animal.findFirst({ where: { id: animalId, farmId } });
    if (!animal) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }

    const vetVisit = await prisma.vetVisit.create({
      data: {
        farmId,
        animalId,
        date: new Date(date),
        reason,
        diagnosis: diagnosis || null,
        treatment: treatment || null,
        cost: cost ? parseFloat(cost) : null,
        vetName: vetName || null,
        notes: notes || null,
      },
      include: { animal: { select: { id: true, name: true, tagId: true } } },
    });
    return NextResponse.json(vetVisit, { status: 201 });
  } catch (error) {
    console.error("Error creating vet visit:", error);
    return NextResponse.json({ error: "Failed to create vet visit" }, { status: 500 });
  }
}
