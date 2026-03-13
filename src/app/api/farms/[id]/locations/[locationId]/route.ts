import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/farms/[id]/locations/[locationId] — delete a location
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: farmId, locationId } = await params;

  const membership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const location = await prisma.farmLocation.findFirst({
    where: { id: locationId, farmId },
  });
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  await prisma.farmLocation.delete({ where: { id: locationId } });

  return NextResponse.json({ success: true });
}
