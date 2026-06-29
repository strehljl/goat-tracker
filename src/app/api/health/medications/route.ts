import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";
import { errorResponse } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const animalId = new URL(request.url).searchParams.get("animalId");

  try {
    const medications = await prisma.medication.findMany({
      where: animalId ? { farmId, animalId } : { farmId },
      include: { animal: { select: { id: true, name: true, tagId: true } } },
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(medications);
  } catch (error) {
    return errorResponse(error, "Failed to fetch medications");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  try {
    const { animalId, name, dosage, startDate, endDate, notes } = await request.json();

    if (!animalId || !name || !startDate) {
      return NextResponse.json({ error: "Animal, name, and start date are required" }, { status: 400 });
    }

    const animal = await prisma.animal.findFirst({ where: { id: animalId, farmId } });
    if (!animal) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }

    const medication = await prisma.medication.create({
      data: {
        farmId,
        animalId,
        name,
        dosage: dosage || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
      },
      include: { animal: { select: { id: true, name: true, tagId: true } } },
    });
    return NextResponse.json(medication, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create medication");
  }
}
