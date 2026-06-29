import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";
import { errorResponse } from "@/lib/apiError";

// GET /api/animals/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id } = await params;

  try {
    const animal = await prisma.animal.findFirst({
      where: { id, farmId },
      include: {
        dam: { select: { id: true, name: true, tagId: true, photoUrl: true } },
        sire: { select: { id: true, name: true, tagId: true, photoUrl: true } },
        location: { select: { id: true, name: true } },
        herd: { select: { id: true, name: true, animalType: true } },
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
        breedingAsFemale: {
          include: {
            parentMale: { select: { id: true, name: true, tagId: true } },
            birthRecord: { include: { offspring: true } },
          },
          orderBy: { breedingDate: "desc" },
          take: 5,
        },
        breedingAsMale: {
          include: {
            parentFemale: { select: { id: true, name: true, tagId: true } },
            birthRecord: { include: { offspring: true } },
          },
          orderBy: { breedingDate: "desc" },
          take: 5,
        },
        expenses: { orderBy: { date: "desc" }, take: 5 },
        sale: true,
      },
    });

    if (!animal) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }

    return NextResponse.json(animal);
  } catch (error) {
    return errorResponse(error, "Failed to fetch animal");
  }
}

// PUT /api/animals/[id]
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

    const owned = await prisma.animal.findFirst({
      where: { id, farmId },
      include: { sale: { select: { id: true } } },
    });
    if (!owned) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }

    const existing = await prisma.animal.findFirst({
      where: { tagId, farmId, id: { not: id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An animal with this tag ID already exists" },
        { status: 409 }
      );
    }

    if (damId) {
      const dam = await prisma.animal.findFirst({ where: { id: damId, farmId } });
      if (!dam) return NextResponse.json({ error: "Dam not found" }, { status: 404 });
    }
    if (sireId) {
      const sire = await prisma.animal.findFirst({ where: { id: sireId, farmId } });
      if (!sire) return NextResponse.json({ error: "Sire not found" }, { status: 404 });
    }

    const newStatus = status || "ACTIVE";
    const animalData = {
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
      ...(herdId !== undefined ? { herdId: herdId || null } : {}),
      status: newStatus,
      notes: notes || null,
    };
    const include = {
      dam: { select: { id: true, name: true, tagId: true } },
      sire: { select: { id: true, name: true, tagId: true } },
      location: { select: { id: true, name: true } },
      herd: { select: { id: true, name: true, animalType: true } },
    };

    let animal;
    if (owned.status === "SOLD" && newStatus !== "SOLD") {
      animal = await prisma.$transaction(async (tx) => {
        await tx.sale.deleteMany({ where: { animalId: id } });
        return tx.animal.update({ where: { id }, data: animalData, include });
      });
    } else if (newStatus === "SOLD" && !owned.sale && saleDate && salePrice) {
      animal = await prisma.$transaction(async (tx) => {
        await tx.sale.create({
          data: {
            farmId,
            animalId: id,
            saleDate: new Date(saleDate),
            salePrice: parseFloat(salePrice),
            buyerName: buyerName || null,
            buyerContact: buyerContact || null,
            notes: saleNotes || null,
          },
        });
        return tx.animal.update({ where: { id }, data: animalData, include });
      });
    } else {
      animal = await prisma.animal.update({ where: { id }, data: animalData, include });
    }

    return NextResponse.json(animal);
  } catch (error) {
    return errorResponse(error, "Failed to update animal");
  }
}

// DELETE /api/animals/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id } = await params;

  try {
    const owned = await prisma.animal.findFirst({ where: { id, farmId } });
    if (!owned) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }

    await prisma.animal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete animal");
  }
}
