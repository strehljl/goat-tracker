import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFarm } from "@/lib/farmAuth";

export async function GET(request: NextRequest) {
  const auth = await requireFarm();
  if (auth instanceof NextResponse) return auth;
  const { farmId } = auth;

  const herdId = new URL(request.url).searchParams.get("herdId") || undefined;
  const animalWhere = { farmId, ...(herdId ? { herdId } : {}) };
  const breedingWhere = { farmId, ...(herdId ? { parentFemale: { herdId } } : {}) };

  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      totalAnimals,
      femaleCount,
      maleCount,
      pendingBreedings,
      offspringThisYear,
      upcomingVaccinations,
      upcomingDewormings,
      pendingBreedingsList,
      recentAnimals,
    ] = await Promise.all([
      prisma.animal.count({ where: { ...animalWhere, status: "ACTIVE" } }),
      prisma.animal.count({ where: { ...animalWhere, status: "ACTIVE", gender: "FEMALE" } }),
      prisma.animal.count({ where: { ...animalWhere, status: "ACTIVE", gender: "MALE" } }),
      prisma.breedingEvent.count({
        where: { ...breedingWhere, status: { in: ["PENDING", "CONFIRMED"] } },
      }),
      prisma.animal.count({
        where: {
          ...animalWhere,
          dateOfBirth: {
            gte: yearStart,
            lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
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
          animal: { status: "ACTIVE", ...(herdId ? { herdId } : {}) },
        },
        include: { animal: { select: { name: true, tagId: true } } },
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
          animal: { status: "ACTIVE", ...(herdId ? { herdId } : {}) },
        },
        include: { animal: { select: { name: true, tagId: true } } },
        orderBy: { nextDueDate: "asc" },
        take: 10,
      }),
      prisma.breedingEvent.findMany({
        where: { ...breedingWhere, status: { in: ["PENDING", "CONFIRMED"] } },
        include: {
          parentFemale: { select: { name: true, tagId: true } },
          parentMale: { select: { name: true, tagId: true } },
        },
        orderBy: { expectedDueDate: "asc" },
        take: 10,
      }),
      prisma.animal.findMany({
        where: { ...animalWhere, status: "ACTIVE" },
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
        message: `${vax.animal.name} (${vax.animal.tagId}) - ${vax.name} due`,
        date: vax.nextDueDate?.toISOString() || undefined,
      });
    }

    for (const dew of upcomingDewormings) {
      alerts.push({
        type: "deworming",
        message: `${dew.animal.name} (${dew.animal.tagId}) - Deworming due`,
        date: dew.nextDueDate?.toISOString() || undefined,
      });
    }

    for (const event of pendingBreedingsList) {
      if (event.expectedDueDate) {
        const daysUntilDue = Math.ceil(
          (event.expectedDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDue <= 14 && daysUntilDue >= 0) {
          alerts.push({
            type: "birth",
            message: `${event.parentFemale.name} (${event.parentFemale.tagId}) - Due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`,
            date: event.expectedDueDate.toISOString(),
          });
        }
      }
    }

    return NextResponse.json({
      stats: { totalAnimals, femaleCount, maleCount, pendingBreedings, offspringThisYear },
      alerts,
      recentAnimals,
      upcomingBreedings: pendingBreedingsList,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
