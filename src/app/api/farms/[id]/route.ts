import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/farms/[id] — get farm details + member list (members only)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const membership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId: id, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const farm = await prisma.farm.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!farm) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: farm.id,
    name: farm.name,
    imageUrl: farm.imageUrl,
    joinCode: farm.joinCode,
    isOwner: membership.isOwner,
    members: farm.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      isOwner: m.isOwner,
    })),
  });
}

// PATCH /api/farms/[id] — update farm name (owner only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const membership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId: id, userId: session.user.id } },
  });
  if (!membership?.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Farm name is required" }, { status: 400 });
  }

  const farm = await prisma.farm.update({
    where: { id },
    data: { name: name.trim() },
  });

  return NextResponse.json({ id: farm.id, name: farm.name });
}

// DELETE /api/farms/[id] — delete farm (owner only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const membership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId: id, userId: session.user.id } },
  });
  if (!membership?.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.farm.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
