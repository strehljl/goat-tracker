import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";
import { errorResponse } from "@/lib/apiError";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { id } = await params;

  try {
    const sale = await prisma.sale.findFirst({ where: { id, farmId } });
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.sale.delete({ where: { id } });
      await tx.animal.update({
        where: { id: sale.animalId },
        data: { status: "ACTIVE" },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete sale");
  }
}
