import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const goatId = new URL(request.url).searchParams.get("goatId");

  try {
    const medications = await prisma.medication.findMany({
      where: goatId ? { farmId, goatId } : { farmId },
      include: { goat: { select: { id: true, name: true, tagId: true } } },
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(medications);
  } catch (error) {
    console.error("Error fetching medications:", error);
    return NextResponse.json({ error: "Failed to fetch medications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  try {
    const { goatId, name, dosage, startDate, endDate, notes } = await request.json();

    if (!goatId || !name || !startDate) {
      return NextResponse.json({ error: "Goat, name, and start date are required" }, { status: 400 });
    }

    const goat = await prisma.goat.findFirst({ where: { id: goatId, farmId } });
    if (!goat) {
      return NextResponse.json({ error: "Goat not found" }, { status: 404 });
    }

    const medication = await prisma.medication.create({
      data: {
        farmId,
        goatId,
        name,
        dosage: dosage || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
      },
      include: { goat: { select: { id: true, name: true, tagId: true } } },
    });
    return NextResponse.json(medication, { status: 201 });
  } catch (error) {
    console.error("Error creating medication:", error);
    return NextResponse.json({ error: "Failed to create medication" }, { status: 500 });
  }
}
