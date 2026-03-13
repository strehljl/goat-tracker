import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

// GET /api/farms/current/locations — list locations for the active farm
export async function GET() {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const locations = await prisma.farmLocation.findMany({
    where: { farmId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return NextResponse.json(locations);
}
