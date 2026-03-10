import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const status = new URL(request.url).searchParams.get("status");

  try {
    const events = await prisma.breedingEvent.findMany({
      where: status
        ? { farmId, status: status as "PENDING" | "CONFIRMED" | "FAILED" | "DELIVERED" }
        : { farmId },
      include: {
        doe: { select: { id: true, name: true, tagId: true } },
        buck: { select: { id: true, name: true, tagId: true } },
        kiddingRecord: {
          include: { kids: { include: { goat: { select: { id: true, name: true, tagId: true } } } } },
        },
      },
      orderBy: { breedingDate: "desc" },
    });
    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching breeding events:", error);
    return NextResponse.json({ error: "Failed to fetch breeding events" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  try {
    const { doeId, buckId, breedingDate, expectedDueDate, notes } = await request.json();

    if (!doeId || !buckId || !breedingDate) {
      return NextResponse.json({ error: "Doe, buck, and breeding date are required" }, { status: 400 });
    }

    const [doe, buck] = await Promise.all([
      prisma.goat.findFirst({ where: { id: doeId, farmId } }),
      prisma.goat.findFirst({ where: { id: buckId, farmId } }),
    ]);
    if (!doe || !buck) {
      return NextResponse.json({ error: "Goat not found" }, { status: 404 });
    }

    const event = await prisma.breedingEvent.create({
      data: {
        farmId,
        doeId,
        buckId,
        breedingDate: new Date(breedingDate),
        expectedDueDate: expectedDueDate ? new Date(expectedDueDate) : null,
        notes: notes || null,
      },
      include: {
        doe: { select: { id: true, name: true, tagId: true } },
        buck: { select: { id: true, name: true, tagId: true } },
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating breeding event:", error);
    return NextResponse.json({ error: "Failed to create breeding event" }, { status: 500 });
  }
}
