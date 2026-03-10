import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const goatId = new URL(request.url).searchParams.get("goatId");

  try {
    const vaccinations = await prisma.vaccination.findMany({
      where: goatId ? { farmId, goatId } : { farmId },
      include: { goat: { select: { id: true, name: true, tagId: true } } },
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
    const { goatId, name, dateGiven, nextDueDate, notes } = await request.json();

    if (!goatId || !name || !dateGiven) {
      return NextResponse.json({ error: "Goat, name, and date are required" }, { status: 400 });
    }

    const goat = await prisma.goat.findFirst({ where: { id: goatId, farmId } });
    if (!goat) {
      return NextResponse.json({ error: "Goat not found" }, { status: 404 });
    }

    const vaccination = await prisma.vaccination.create({
      data: {
        farmId,
        goatId,
        name,
        dateGiven: new Date(dateGiven),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        notes: notes || null,
      },
      include: { goat: { select: { id: true, name: true, tagId: true } } },
    });
    return NextResponse.json(vaccination, { status: 201 });
  } catch (error) {
    console.error("Error creating vaccination:", error);
    return NextResponse.json({ error: "Failed to create vaccination" }, { status: 500 });
  }
}
