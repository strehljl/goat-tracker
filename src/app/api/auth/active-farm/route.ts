import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { farmId } = body;

  if (!farmId) {
    return NextResponse.json({ error: "farmId is required" }, { status: 400 });
  }

  // Verify the user is actually a member of the requested farm
  const membership = await prisma.farmMembership.findUnique({
    where: {
      farmId_userId: { farmId, userId: session.user.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
