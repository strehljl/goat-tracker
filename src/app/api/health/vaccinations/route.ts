import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const animalId = new URL(request.url).searchParams.get("animalId");

  try {
    const vaccinations = await prisma.vaccination.findMany({
      where: animalId ? { farmId, animalId } : { farmId },
      include: { animal: { select: { id: true, name: true, tagId: true } } },
      orderBy: { dateGiven: "desc" },
    });
    return NextResponse.json(vaccinations);
  } catch (error) {
    console.error("Error fetching vaccinations:", error);
    return NextResponse.json({ error: "Failed to fetch vaccinations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  try {
    const { animalId, name, dateGiven, nextDueDate, notes } = await request.json();

    if (!animalId || !name || !dateGiven) {
      return NextResponse.json({ error: "Animal, name, and date are required" }, { status: 400 });
    }

    const animal = await prisma.animal.findFirst({ where: { id: animalId, farmId } });
    if (!animal) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }

    const vaccination = await prisma.vaccination.create({
      data: {
        farmId,
        animalId,
        name,
        dateGiven: new Date(dateGiven),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        notes: notes || null,
      },
      include: { animal: { select: { id: true, name: true, tagId: true } } },
    });
    return NextResponse.json(vaccination, { status: 201 });
  } catch (error) {
    console.error("Error creating vaccination:", error);
    return NextResponse.json({ error: "Failed to create vaccination" }, { status: 500 });
  }
}
