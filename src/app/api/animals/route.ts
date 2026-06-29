import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";
import { errorResponse } from "@/lib/apiError";

// GET /api/animals — list animals with optional filters
export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const gender = searchParams.get("gender") || "";
  const locationId = searchParams.get("locationId") || "";
  const herdId = searchParams.get("herdId") || "";
  const bornThisYear = searchParams.get("bornThisYear") === "true";

  const where: Record<string, unknown> = { farmId };

  if (herdId) {
    where.herdId = herdId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { tagId: { contains: search, mode: "insensitive" } },
      { breed: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status;
  if (gender) where.gender = gender;
  if (locationId) where.locationId = locationId;

  if (bornThisYear) {
    const start = new Date(new Date().getFullYear(), 0, 1);
    const end = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
    where.dateOfBirth = { gte: start, lte: end };
  }

  try {
    const animals = await prisma.animal.findMany({
      where,
      include: {
        dam: { select: { id: true, name: true, tagId: true } },
        sire: { select: { id: true, name: true, tagId: true } },
        location: { select: { id: true, name: true } },
        herd: { select: { id: true, name: true, animalType: true } },
        sale: { select: { saleDate: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(animals);
  } catch (error) {
    return errorResponse(error, "Failed to fetch animals");
  }
}

// POST /api/animals — create a new animal
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
      herdId,
      status,
      notes,
      saleDate,
      salePrice,
      buyerName,
      buyerContact,
      saleNotes,
    } = body;

    if (!name || !tagId || !gender) {
      return NextResponse.json(
        { error: "Name, tag ID, and gender are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.animal.findFirst({ where: { tagId, farmId } });
    if (existing) {
      return NextResponse.json(
        { error: "An animal with this tag ID already exists" },
        { status: 409 }
      );
    }

    const parsedPrice = purchasePrice ? parseFloat(purchasePrice) : null;

    const animal = await prisma.$transaction(async (tx) => {
      const created = await tx.animal.create({
        data: {
          farmId,
          herdId: herdId || null,
          name,
          tagId,
          breed: breed || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender,
          colorMarkings: colorMarkings || null,
          photoUrl: photoUrl || null,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
          purchasePrice: parsedPrice,
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
          herd: { select: { id: true, name: true, animalType: true } },
          sale: { select: { saleDate: true } },
        },
      });

      if (parsedPrice && parsedPrice > 0) {
        await tx.expense.create({
          data: {
            farmId,
            animalId: created.id,
            category: "PURCHASE",
            amount: parsedPrice,
            date: purchaseDate ? new Date(purchaseDate) : new Date(),
            description: `Purchase: ${name} (#${tagId})`,
          },
        });
      }

      if ((status || "ACTIVE") === "SOLD" && saleDate && salePrice) {
        await tx.sale.create({
          data: {
            farmId,
            animalId: created.id,
            saleDate: new Date(saleDate),
            salePrice: parseFloat(salePrice),
            buyerName: buyerName || null,
            buyerContact: buyerContact || null,
            notes: saleNotes || null,
          },
        });
      }

      return created;
    });

    return NextResponse.json(animal, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create animal");
  }
}
