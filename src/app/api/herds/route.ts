import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";
import { AnimalType } from "@prisma/client";

const VALID_ANIMAL_TYPES = new Set<string>(["GOAT", "SHEEP", "CATTLE", "PIG", "ALPACA", "OTHER"]);

// GET /api/herds?farmId=xxx — list herds for a farm (must be a member)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const farmId = new URL(request.url).searchParams.get("farmId");
  if (!farmId) {
    return NextResponse.json({ error: "farmId is required" }, { status: 400 });
  }

  const membership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const herds = await prisma.herd.findMany({
    where: { farmId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(herds);
}

// POST /api/herds — create a new herd in the active farm
export async function POST(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const session = await getServerSession(authOptions);
  const membership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId, userId: session!.user!.id! } },
  });
  if (!membership?.isOwner) {
    return NextResponse.json({ error: "Only farm owners can create herds" }, { status: 403 });
  }

  const body = await request.json();
  const { name, animalType, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Herd name is required" }, { status: 400 });
  }
  if (!animalType || !VALID_ANIMAL_TYPES.has(animalType)) {
    return NextResponse.json({ error: "A valid animal type is required" }, { status: 400 });
  }

  try {
    const herd = await prisma.herd.create({
      data: {
        farmId,
        name: name.trim(),
        animalType: animalType as AnimalType,
        description: description?.trim() || null,
      },
    });
    return NextResponse.json(herd, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "A herd with this name already exists on this farm" },
        { status: 409 }
      );
    }
    console.error("Error creating herd:", error);
    return NextResponse.json({ error: "Failed to create herd" }, { status: 500 });
  }
}
