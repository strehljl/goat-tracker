import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalType } from "@prisma/client";

const VALID_ANIMAL_TYPES = new Set<string>(["GOAT", "SHEEP", "CATTLE", "PIG", "ALPACA", "OTHER"]);

async function requireHerdOwner(herdId: string, userId: string) {
  const herd = await prisma.herd.findUnique({ where: { id: herdId } });
  if (!herd) return null;
  const membership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId: herd.farmId, userId } },
  });
  if (!membership?.isOwner) return null;
  return herd;
}

// PATCH /api/herds/[id] — update herd name, type, or description (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const herd = await requireHerdOwner(id, session.user.id);
  if (!herd) {
    return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
  }

  const body = await request.json();
  const { name, animalType, description } = body;

  const updateData: { name?: string; animalType?: AnimalType; description?: string | null } = {};
  if (name?.trim()) updateData.name = name.trim();
  if (animalType) {
    if (!VALID_ANIMAL_TYPES.has(animalType)) {
      return NextResponse.json({ error: "Invalid animal type" }, { status: 400 });
    }
    updateData.animalType = animalType as AnimalType;
  }
  if (description !== undefined) updateData.description = description?.trim() || null;

  try {
    const updated = await prisma.herd.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
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
    console.error("Error updating herd:", error);
    return NextResponse.json({ error: "Failed to update herd" }, { status: 500 });
  }
}

// DELETE /api/herds/[id] — delete a herd (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const herd = await requireHerdOwner(id, session.user.id);
  if (!herd) {
    return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
  }

  await prisma.herd.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
