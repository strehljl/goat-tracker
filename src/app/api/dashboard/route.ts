import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function GET() {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      totalGoats,
      doesCount,
      bucksCount,
      pregnantDoes,
      kidsBornThisYear,
      upcomingVaccinations,
      upcomingDewormings,
      pregnantDoesList,
      recentGoats,
    ] = await Promise.all([
      prisma.goat.count({ where: { farmId, status: "ACTIVE" } }),
      prisma.goat.count({ where: { farmId, status: "ACTIVE", gender: "DOE" } }),
      prisma.goat.count({ where: { farmId, status: "ACTIVE", gender: "BUCK" } }),
      prisma.breedingEvent.count({
        where: { farmId, status: { in: ["PENDING", "CONFIRMED"] } },
      }),
      prisma.kid.count({
        where: {
          kiddingRecord: {
            breedingEvent: { farmId },
            kiddingDate: { gte: yearStart },
          },
        },
      }),
      prisma.vaccination.findMany({
        where: {
          farmId,
          nextDueDate: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
          goat: { status: "ACTIVE" },
        },
        include: { goat: { select: { name: true, tagId: true } } },
        orderBy: { nextDueDate: "asc" },
        take: 10,
      }),
      prisma.deworming.findMany({
        where: {
          farmId,
          nextDueDate: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
          goat: { status: "ACTIVE" },
        },
        include: { goat: { select: { name: true, tagId: true } } },
        orderBy: { nextDueDate: "asc" },
        take: 10,
      }),
      prisma.breedingEvent.findMany({
        where: { farmId, status: { in: ["PENDING", "CONFIRMED"] } },
        include: {
          doe: { select: { name: true, tagId: true } },
          buck: { select: { name: true, tagId: true } },
        },
        orderBy: { expectedDueDate: "asc" },
        take: 10,
      }),
      prisma.goat.findMany({
        where: { farmId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          tagId: true,
          gender: true,
          breed: true,
          createdAt: true,
        },
      }),
    ]);

    const alerts: { type: string; message: string; date?: string }[] = [];

    for (const vax of upcomingVaccinations) {
      alerts.push({
        type: "vaccination",
        message: vax.goat.name + " (" + vax.goat.tagId + ") - " + vax.name + " due",
        date: vax.nextDueDate?.toISOString() || undefined,
      });
    }

    for (const dew of upcomingDewormings) {
      alerts.push({
        type: "deworming",
        message: dew.goat.name + " (" + dew.goat.tagId + ") - Deworming due",
        date: dew.nextDueDate?.toISOString() || undefined,
      });
    }

    for (const event of pregnantDoesList) {
      if (event.expectedDueDate) {
        const daysUntilDue = Math.ceil(
          (event.expectedDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDue <= 14 && daysUntilDue >= 0) {
          alerts.push({
            type: "kidding",
            message: event.doe.name + " (" + event.doe.tagId + ") - Due in " + daysUntilDue + " day" + (daysUntilDue !== 1 ? "s" : ""),
            date: event.expectedDueDate.toISOString(),
          });
        }
      }
    }

    return NextResponse.json({
      stats: { totalGoats, doesCount, bucksCount, pregnantDoes, kidsBornThisYear },
      alerts,
      recentGoats,
      upcomingBreedings: pregnantDoesList,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}