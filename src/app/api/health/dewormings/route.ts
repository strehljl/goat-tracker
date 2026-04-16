import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const animalId = new URL(request.url).searchParams.get("animalId");

  try {
    const dewormings = await prisma.deworming.findMany({
      where: animalId ? { farmId, animalId } : { farmId },
      include: { animal: { select: { id: true, name: true, tagId: true } } },
      orderBy: { dateGiven: "desc" },
    });
    return NextResponse.json(dewormings);
  } catch (error) {
    console.error("Error fetching dewormings:", error);
    return NextResponse.json({ error: "Failed to fetch dewormings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  try {
    const { animalId, productName, dateGiven, nextDueDate, notes } = await request.json();

    if (!animalId || !productName || !dateGiven) {
      return NextResponse.json({ error: "Animal, product, and date are required" }, { status: 400 });
    }

    const animal = await prisma.animal.findFirst({ where: { id: animalId, farmId } });
    if (!animal) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }

    const deworming = await prisma.deworming.create({
      data: {
        farmId,
        animalId,
        productName,
        dateGiven: new Date(dateGiven),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        notes: notes || null,
      },
      include: { animal: { select: { id: true, name: true, tagId: true } } },
    });
    return NextResponse.json(deworming, { status: 201 });
  } catch (error) {
    console.error("Error creating deworming:", error);
    return NextResponse.json({ error: "Failed to create deworming" }, { status: 500 });
  }
}
