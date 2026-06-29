import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";
import { errorResponse } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { searchParams } = new URL(request.url);
  const animalId = searchParams.get("animalId");
  const category = searchParams.get("category");

  const where: Record<string, unknown> = { farmId };
  if (animalId) where.animalId = animalId;
  if (category) where.category = category;

  try {
    const expenses = await prisma.expense.findMany({
      where,
      include: { animal: { select: { id: true, name: true, tagId: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    return errorResponse(error, "Failed to fetch expenses");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  try {
    const { animalId, category, amount, date, description, vendorName } = await request.json();

    if (!category || !amount || !date) {
      return NextResponse.json({ error: "Category, amount, and date are required" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        farmId,
        animalId: animalId || null,
        category,
        amount: parseFloat(amount),
        date: new Date(date),
        description: description || null,
        vendorName: vendorName || null,
      },
      include: { animal: { select: { id: true, name: true, tagId: true } } },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create expense");
  }
}
