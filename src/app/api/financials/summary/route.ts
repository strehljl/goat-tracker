import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function GET() {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  try {
    const [expenses, sales, vetCosts] = await Promise.all([
      prisma.expense.aggregate({ where: { farmId }, _sum: { amount: true } }),
      prisma.sale.aggregate({ where: { farmId }, _sum: { salePrice: true } }),
      prisma.vetVisit.aggregate({ where: { farmId }, _sum: { cost: true } }),
    ]);

    // Expenses by category
    const byCategory = await prisma.expense.groupBy({
      by: ["category"],
      where: { farmId },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    });

    const totalExpenses = Number(expenses._sum.amount || 0) + Number(vetCosts._sum.cost || 0);
    const totalSales = Number(sales._sum.salePrice || 0);

    return NextResponse.json({
      totalExpenses,
      totalSales,
      netIncome: totalSales - totalExpenses,
      vetCosts: Number(vetCosts._sum.cost || 0),
      byCategory: byCategory.map((c) => ({
        category: c.category,
        total: Number(c._sum.amount || 0),
      })),
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
