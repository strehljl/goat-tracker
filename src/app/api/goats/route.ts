import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

// GET /api/goats - List all goats with optional filters
export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const gender = searchParams.get("gender") || "";
  const locationId = searchParams.get("locationId") || "";
  const bornThisYear = searchParams.get("bornThisYear") === "true";

  const where: Record<string, unknown> = { farmId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { tagId: { contains: search, mode: "insensitive" } },
      { breed: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (gender) {
    where.gender = gender;
  }

  if (locationId) {
    where.locationId = locationId;
  }

  if (bornThisYear) {
    const start = new Date(new Date().getFullYear(), 0, 1);
    const end = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
    where.dateOfBirth = { gte: start, lte: end };
  }

  try {
    const goats = await prisma.goat.findMany({
      where,
      include: {
        dam: { select: { id: true, name: true, tagId: true } },
        sire: { select: { id: true, name: true, tagId: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(goats);
  } catch (error) {
    console.error("Error fetching goats:", error);
    return NextResponse.json(
      { error: "Failed to fetch goats" },
      { status: 500 }
    );
  }
}

// POST /api/goats - Create a new goat
export async function POST(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

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

    const existing = await prisma.goat.findFirst({ where: { tagId, farmId } });
    if (existing) {
      return NextResponse.json(
        { error: "A goat with this tag ID already exists" },
        { status: 409 }
      );
    }

    const goat = await prisma.goat.create({
      data: {
        farmId,
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

    return NextResponse.json(goat, { status: 201 });
  } catch (error) {
    console.error("Error creating goat:", error);
    return NextResponse.json(
      { error: "Failed to create goat" },
      { status: 500 }
    );
  }
}
