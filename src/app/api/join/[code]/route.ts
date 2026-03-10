import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/join/[code] — look up a farm by join code (for the join page preview)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;

  const farm = await prisma.farm.findUnique({
    where: { joinCode: code },
    select: { id: true, name: true },
  });

  if (!farm) {
    return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
  }

  // Check if already a member
  const existing = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId: farm.id, userId: session.user.id } },
  });

  return NextResponse.json({ id: farm.id, name: farm.name, alreadyMember: !!existing });
}

// POST /api/join/[code] — join a farm by its join code
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;

  const farm = await prisma.farm.findUnique({
    where: { joinCode: code },
  });

  if (!farm) {
    return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
  }

  // Upsert — idempotent if already a member
  await prisma.farmMembership.upsert({
    where: { farmId_userId: { farmId: farm.id, userId: session.user.id } },
    create: { farmId: farm.id, userId: session.user.id, isOwner: false },
    update: {},
  });

  return NextResponse.json({ id: farm.id, name: farm.name });
}
