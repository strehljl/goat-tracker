import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/farms/[id]/members/[userId] — remove a member (owner only, can't remove self if owner)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: farmId, userId } = await params;

  const requesterMembership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId, userId: session.user.id } },
  });

  // Only owners can remove members; non-owners can only remove themselves (leave)
  if (!requesterMembership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isRemovingSelf = userId === session.user.id;

  if (!isRemovingSelf && !requesterMembership.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Owners cannot remove themselves (would leave farm ownerless)
  if (isRemovingSelf && requesterMembership.isOwner) {
    return NextResponse.json(
      { error: "Owners cannot leave their farm. Delete the farm instead." },
      { status: 400 }
    );
  }

  await prisma.farmMembership.delete({
    where: { farmId_userId: { farmId, userId } },
  });

  return NextResponse.json({ success: true });
}
