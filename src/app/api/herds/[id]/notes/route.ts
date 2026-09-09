import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";
import { errorResponse } from "@/lib/apiError";

// GET /api/herds/[id]/notes — list notes for a herd
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id: herdId } = await params;

  try {
    const herd = await prisma.herd.findFirst({ where: { id: herdId, farmId } });
    if (!herd) {
      return NextResponse.json({ error: "Herd not found" }, { status: 404 });
    }

    const notes = await prisma.herdNote.findMany({
      where: { herdId },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(notes);
  } catch (error) {
    return errorResponse(error, "Failed to fetch herd notes");
  }
}

// POST /api/herds/[id]/notes — add a note to a herd
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id: herdId } = await params;

  try {
    const herd = await prisma.herd.findFirst({ where: { id: herdId, farmId } });
    if (!herd) {
      return NextResponse.json({ error: "Herd not found" }, { status: 404 });
    }

    const { date, note } = await request.json();
    if (!date || !note?.trim()) {
      return NextResponse.json({ error: "Date and note are required" }, { status: 400 });
    }

    const created = await prisma.herdNote.create({
      data: { farmId, herdId, date: new Date(date), note: note.trim() },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create herd note");
  }
}
