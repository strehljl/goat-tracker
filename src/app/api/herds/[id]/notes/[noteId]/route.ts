import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";
import { errorResponse } from "@/lib/apiError";

// PUT /api/herds/[id]/notes/[noteId] — edit a herd note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id: herdId, noteId } = await params;

  try {
    const owned = await prisma.herdNote.findFirst({ where: { id: noteId, herdId, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const { date, note } = await request.json();
    if (!date || !note?.trim()) {
      return NextResponse.json({ error: "Date and note are required" }, { status: 400 });
    }

    const updated = await prisma.herdNote.update({
      where: { id: noteId },
      data: { date: new Date(date), note: note.trim() },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error, "Failed to update herd note");
  }
}

// DELETE /api/herds/[id]/notes/[noteId] — delete a herd note
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id: herdId, noteId } = await params;

  try {
    const owned = await prisma.herdNote.findFirst({ where: { id: noteId, herdId, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await prisma.herdNote.delete({ where: { id: noteId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete herd note");
  }
}
