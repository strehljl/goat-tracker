import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type FarmAuth = { farmId: string; userId: string };

/**
 * Resolves the active farm for the current request.
 * Returns { farmId, userId } on success, or a NextResponse error on failure.
 *
 * Usage in route handlers:
 *   const auth = await requireFarm();
 *   if (auth instanceof NextResponse) return auth;
 *   const { farmId } = auth;
 */
export async function requireFarm(): Promise<FarmAuth | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const farmId = session.user.activeFarmId;
  if (!farmId) {
    return NextResponse.json({ error: "No active farm" }, { status: 403 });
  }

  const membership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { farmId, userId: session.user.id };
}
