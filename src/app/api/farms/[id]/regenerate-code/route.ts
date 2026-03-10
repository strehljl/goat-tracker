import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

// POST /api/farms/[id]/regenerate-code — generate a new join code (owner only)
export async function POST(
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

  const farm = await prisma.farm.update({
    where: { id },
    data: { joinCode: randomUUID() },
  });

  return NextResponse.json({ joinCode: farm.joinCode });
}
