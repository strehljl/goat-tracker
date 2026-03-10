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
      include: { goat: { select: { id: true, name: true, tagId: true } } },
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
    const { goatId, saleDate, salePrice, buyerName, buyerContact, notes } = await request.json();

    if (!goatId || !saleDate || !salePrice) {
      return NextResponse.json({ error: "Goat, date, and price are required" }, { status: 400 });
    }

    // Verify goat belongs to this farm
    const goat = await prisma.goat.findFirst({ where: { id: goatId, farmId } });
    if (!goat) {
      return NextResponse.json({ error: "Goat not found" }, { status: 404 });
    }

    // Create sale and update goat status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          farmId,
          goatId,
          saleDate: new Date(saleDate),
          salePrice: parseFloat(salePrice),
          buyerName: buyerName || null,
          buyerContact: buyerContact || null,
          notes: notes || null,
        },
        include: { goat: { select: { id: true, name: true, tagId: true } } },
      });

      await tx.goat.update({
        where: { id: goatId },
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
