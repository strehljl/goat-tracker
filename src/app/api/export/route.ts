import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

// GET /api/export?type=inventory|health|financials&format=csv
export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "inventory";
  const format = searchParams.get("format") || "csv";

  if (format !== "csv") {
    return NextResponse.json({ error: "Only CSV format is currently supported" }, { status: 400 });
  }

  try {
    let csv = "";
    let filename = "";

    if (type === "inventory") {
      const goats = await prisma.goat.findMany({
        where: { farmId },
        include: {
          dam: { select: { name: true, tagId: true } },
          sire: { select: { name: true, tagId: true } },
        },
        orderBy: { name: "asc" },
      });

      csv = "Name,Tag ID,Breed,Date of Birth,Gender,Color/Markings,Status,Purchase Date,Purchase Price,Dam,Sire,Notes\n";
      for (const g of goats) {
        csv += [
          quote(g.name),
          quote(g.tagId),
          quote(g.breed || ""),
          g.dateOfBirth ? g.dateOfBirth.toISOString().split("T")[0] : "",
          g.gender,
          quote(g.colorMarkings || ""),
          g.status,
          g.purchaseDate ? g.purchaseDate.toISOString().split("T")[0] : "",
          g.purchasePrice ? Number(g.purchasePrice).toFixed(2) : "",
          g.dam ? `${g.dam.name} (${g.dam.tagId})` : "",
          g.sire ? `${g.sire.name} (${g.sire.tagId})` : "",
          quote(g.notes || ""),
        ].join(",") + "\n";
      }
      filename = "goat-inventory.csv";
    } else if (type === "health") {
      const [vaccinations, medications, vetVisits, dewormings] = await Promise.all([
        prisma.vaccination.findMany({ where: { farmId }, include: { goat: { select: { name: true, tagId: true } } }, orderBy: { dateGiven: "desc" } }),
        prisma.medication.findMany({ where: { farmId }, include: { goat: { select: { name: true, tagId: true } } }, orderBy: { startDate: "desc" } }),
        prisma.vetVisit.findMany({ where: { farmId }, include: { goat: { select: { name: true, tagId: true } } }, orderBy: { date: "desc" } }),
        prisma.deworming.findMany({ where: { farmId }, include: { goat: { select: { name: true, tagId: true } } }, orderBy: { dateGiven: "desc" } }),
      ]);

      csv = "Type,Goat,Tag ID,Name/Product,Date,Details,Cost,Notes\n";
      for (const v of vaccinations) {
        csv += `Vaccination,${quote(v.goat.name)},${v.goat.tagId},${quote(v.name)},${v.dateGiven.toISOString().split("T")[0]},Next: ${v.nextDueDate ? v.nextDueDate.toISOString().split("T")[0] : "N/A"},,${quote(v.notes || "")}\n`;
      }
      for (const m of medications) {
        csv += `Medication,${quote(m.goat.name)},${m.goat.tagId},${quote(m.name)},${m.startDate.toISOString().split("T")[0]},Dosage: ${m.dosage || "N/A"},,${quote(m.notes || "")}\n`;
      }
      for (const v of vetVisits) {
        csv += `Vet Visit,${quote(v.goat.name)},${v.goat.tagId},${quote(v.reason)},${v.date.toISOString().split("T")[0]},${quote(v.diagnosis || "")},${v.cost ? Number(v.cost).toFixed(2) : ""},${quote(v.notes || "")}\n`;
      }
      for (const d of dewormings) {
        csv += `Deworming,${quote(d.goat.name)},${d.goat.tagId},${quote(d.productName)},${d.dateGiven.toISOString().split("T")[0]},Next: ${d.nextDueDate ? d.nextDueDate.toISOString().split("T")[0] : "N/A"},,${quote(d.notes || "")}\n`;
      }
      filename = "health-records.csv";
    } else if (type === "financials") {
      const [expenses, sales] = await Promise.all([
        prisma.expense.findMany({ where: { farmId }, include: { goat: { select: { name: true, tagId: true } } }, orderBy: { date: "desc" } }),
        prisma.sale.findMany({ where: { farmId }, include: { goat: { select: { name: true, tagId: true } } }, orderBy: { saleDate: "desc" } }),
      ]);

      csv = "Type,Date,Amount,Category,Goat,Description,Vendor/Buyer\n";
      for (const e of expenses) {
        csv += `Expense,${e.date.toISOString().split("T")[0]},${Number(e.amount).toFixed(2)},${e.category},${e.goat ? `${e.goat.name} (${e.goat.tagId})` : "Herd-wide"},${quote(e.description || "")},${quote(e.vendorName || "")}\n`;
      }
      for (const s of sales) {
        csv += `Sale,${s.saleDate.toISOString().split("T")[0]},${Number(s.salePrice).toFixed(2)},SALE,${s.goat.name} (${s.goat.tagId}),,${quote(s.buyerName || "")}\n`;
      }
      filename = "financial-records.csv";
    } else {
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}

function quote(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
