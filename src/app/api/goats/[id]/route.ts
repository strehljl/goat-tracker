import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

// GET /api/goats/[id] - Get single goat with all relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id } = await params;

  try {
    const goat = await prisma.goat.findFirst({
      where: { id, farmId },
      include: {
        dam: { select: { id: true, name: true, tagId: true, photoUrl: true } },
        sire: { select: { id: true, name: true, tagId: true, photoUrl: true } },
        location: { select: { id: true, name: true } },
        damOffspring: {
          select: { id: true, name: true, tagId: true, gender: true, dateOfBirth: true, status: true, photoUrl: true },
          orderBy: { dateOfBirth: "desc" },
          take: 20,
        },
        sireOffspring: {
          select: { id: true, name: true, tagId: true, gender: true, dateOfBirth: true, status: true, photoUrl: true },
          orderBy: { dateOfBirth: "desc" },
          take: 20,
        },
        vaccinations: { orderBy: { dateGiven: "desc" }, take: 5 },
        medications: { orderBy: { startDate: "desc" }, take: 5 },
        vetVisits: { orderBy: { date: "desc" }, take: 5 },
        dewormings: { orderBy: { dateGiven: "desc" }, take: 5 },
        healthNotes: { orderBy: { date: "desc" }, take: 5 },
        breedingAsDoe: {
          include: {
            buck: { select: { id: true, name: true, tagId: true } },
            kiddingRecord: { include: { kids: true } },
          },
          orderBy: { breedingDate: "desc" },
          take: 5,
        },
        breedingAsBuck: {
          include: {
            doe: { select: { id: true, name: true, tagId: true } },
            kiddingRecord: { include: { kids: true } },
          },
          orderBy: { breedingDate: "desc" },
          take: 5,
        },
        expenses: { orderBy: { date: "desc" }, take: 5 },
        sale: true,
      },
    });

    if (!goat) {
      return NextResponse.json({ error: "Goat not found" }, { status: 404 });
    }

    return NextResponse.json(goat);
  } catch (error) {
    console.error("Error fetching goat:", error);
    return NextResponse.json(
      { error: "Failed to fetch goat" },
      { status: 500 }
    );
  }
}

// PUT /api/goats/[id] - Update a goat
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      name,
      tagId,
      breed,
      dateOfBirth,
      gender,
      colorMarkings,
      photoUrl,
      purchaseDate,
      purchasePrice,
      damId,
      sireId,
      locationId: bodyLocationId,
      status,
      notes,
    } = body;

    if (!name || !tagId || !gender) {
      return NextResponse.json(
        { error: "Name, tag ID, and gender are required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const owned = await prisma.goat.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Goat not found" }, { status: 404 });
    }

    // Check for duplicate tagId (excluding current goat, within same farm)
    const existing = await prisma.goat.findFirst({
      where: { tagId, farmId, id: { not: id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A goat with this tag ID already exists" },
        { status: 409 }
      );
    }

    // Verify dam and sire belong to the same farm
    if (damId) {
      const dam = await prisma.goat.findFirst({ where: { id: damId, farmId } });
      if (!dam) {
        return NextResponse.json({ error: "Dam not found" }, { status: 404 });
      }
    }
    if (sireId) {
      const sire = await prisma.goat.findFirst({ where: { id: sireId, farmId } });
      if (!sire) {
        return NextResponse.json({ error: "Sire not found" }, { status: 404 });
      }
    }

    const goat = await prisma.goat.update({
      where: { id },
      data: {
        name,
        tagId,
        breed: breed || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        colorMarkings: colorMarkings || null,
        photoUrl: photoUrl || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        damId: damId || null,
        sireId: sireId || null,
        locationId: bodyLocationId || null,
        status: status || "ACTIVE",
        notes: notes || null,
      },
      include: {
        dam: { select: { id: true, name: true, tagId: true } },
        sire: { select: { id: true, name: true, tagId: true } },
        location: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(goat);
  } catch (error) {
    console.error("Error updating goat:", error);
    return NextResponse.json(
      { error: "Failed to update goat" },
      { status: 500 }
    );
  }
}

// DELETE /api/goats/[id] - Delete a goat
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id } = await params;

  try {
    const owned = await prisma.goat.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Goat not found" }, { status: 404 });
    }

    await prisma.goat.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting goat:", error);
    return NextResponse.json(
      { error: "Failed to delete goat" },
      { status: 500 }
    );
  }
}
