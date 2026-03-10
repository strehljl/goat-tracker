import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/farms — list all farms the current user belongs to
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.farmMembership.findMany({
    where: { userId: session.user.id },
    include: { farm: { select: { id: true, name: true, imageUrl: true, joinCode: true } } },
    orderBy: { createdAt: "asc" },
  });

  const farms = memberships.map((m) => ({
    id: m.farm.id,
    name: m.farm.name,
    imageUrl: m.farm.imageUrl,
    joinCode: m.farm.joinCode,
    isOwner: m.isOwner,
  }));

  return NextResponse.json(farms);
}

// POST /api/farms — create a new farm and add creator as owner
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Farm name is required" }, { status: 400 });
  }

  const farm = await prisma.farm.create({
    data: {
      name: name.trim(),
      members: {
        create: {
          userId: session.user.id,
          isOwner: true,
        },
      },
    },
  });

  return NextResponse.json({
    id: farm.id,
    name: farm.name,
    joinCode: farm.joinCode,
    isOwner: true,
  });
}
