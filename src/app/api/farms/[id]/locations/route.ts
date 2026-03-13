import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/farms/[id]/locations — list locations for a farm
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: farmId } = await params;

  const membership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const locations = await prisma.farmLocation.findMany({
    where: { farmId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(locations);
}

// POST /api/farms/[id]/locations — create a location
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: farmId } = await params;

  const membership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Location name is required" }, { status: 400 });
  }

  try {
    const location = await prisma.farmLocation.create({
      data: { farmId, name },
    });
    return NextResponse.json(location, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A location with that name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
