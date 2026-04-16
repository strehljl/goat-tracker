import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function GET() {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  try {
    const sales = await prisma.sale.findMany({
      where: { farmId },
      include: { animal: { select: { id: true, name: true, tagId: true } } },
      orderBy: { saleDate: "desc" },
    });
    return NextResponse.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  try {
    const { animalId, saleDate, salePrice, buyerName, buyerContact, notes } = await request.json();

    if (!animalId || !saleDate || !salePrice) {
      return NextResponse.json({ error: "Animal, date, and price are required" }, { status: 400 });
    }

    // Verify animal belongs to this farm
    const animal = await prisma.animal.findFirst({ where: { id: animalId, farmId } });
    if (!animal) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }

    // Create sale and update animal status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          farmId,
          animalId,
          saleDate: new Date(saleDate),
          salePrice: parseFloat(salePrice),
          buyerName: buyerName || null,
          buyerContact: buyerContact || null,
          notes: notes || null,
        },
        include: { animal: { select: { id: true, name: true, tagId: true } } },
      });

      await tx.animal.update({
        where: { id: animalId },
        data: { status: "SOLD" },
      });

      return sale;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
  }
}
