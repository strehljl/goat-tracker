"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useFarm } from "@/components/providers/FarmProvider";

interface DashboardData {
  stats: {
    totalAnimals: number;
    femaleCount: number;
    maleCount: number;
    pendingBreedings: number;
    offspringThisYear: number;
  };
  alerts: { type: string; message: string; date?: string }[];
  recentAnimals: {
    id: string;
    name: string;
    tagId: string;
    gender: string;
    breed: string | null;
    createdAt: string;
  }[];
  upcomingBreedings: {
    id: string;
    parentFemale: { name: string; tagId: string };
    parentMale: { name: string; tagId: string };
    breedingDate: string;
    expectedDueDate: string | null;
    status: string;
  }[];
}

const alertTypeColors: Record<string, "warning" | "info" | "error"> = {
  vaccination: "warning",
  deworming: "info",
  birth: "error",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function DashboardPage() {
  const { activeConfig, activeHerd } = useFarm();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = activeHerd ? `/api/dashboard?herdId=${activeHerd.id}` : "/api/dashboard";
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeHerd?.id]);

  const statCards = activeConfig
    ? [
        { key: "totalAnimals" as const, label: activeConfig.dashboardLabels.totalLabel, icon: activeConfig.emoji, color: "bg-primary", href: "/herd" },
        { key: "femaleCount" as const, label: activeConfig.dashboardLabels.femaleLabel, icon: "♀", color: "bg-secondary", href: "/herd?gender=FEMALE" },
        { key: "maleCount" as const, label: activeConfig.dashboardLabels.maleLabel, icon: "♂", color: "bg-accent", href: "/herd?gender=MALE" },
        { key: "pendingBreedings" as const, label: "Pending Breedings", icon: "🤰", color: "bg-warning", href: "/breeding" },
        { key: "offspringThisYear" as const, label: activeConfig.dashboardLabels.offspringThisYearLabel, icon: "🍼", color: "bg-success", href: "/herd?bornThisYear=true" },
      ]
    : [];

  const alertTypeLabels: Record<string, string> = {
    vaccination: "Vaccination",
    deworming: "Deworming",
    birth: activeConfig?.breedingTerms.birthEventNoun ?? "Birth",
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="mt-1 text-sm text-text-light">Your herd at a glance</p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="mt-4 text-text-light">Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Dashboard</h1>
      <p className="mt-1 text-sm text-text-light">Your herd at a glance</p>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md hover:border-primary/40"
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.color} text-white text-sm`}
              >
                {card.icon}
              </span>
              <span className="text-xs font-medium text-text-light">
                {card.label}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-text">
              {data.stats[card.key]}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {data.alerts.length === 0 ? (
              <p className="text-sm text-text-light">
                No upcoming alerts. Your herd is on track!
              </p>
            ) : (
              <ul className="space-y-3">
                {data.alerts.map((alert, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-2 rounded-lg bg-background px-3 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <Badge variant={alertTypeColors[alert.type] || "info"}>
                        {alertTypeLabels[alert.type] || alert.type}
                      </Badge>
                      <span className="text-sm text-text">{alert.message}</span>
                    </div>
                    {alert.date && (
                      <span className="shrink-0 text-xs text-text-light">
                        {formatDate(alert.date)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recently Added */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recently Added</CardTitle>
            <Link
              href="/herd"
              className="text-sm font-medium text-primary hover:text-primary-dark"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentAnimals.length === 0 ? (
              <p className="text-sm text-text-light">
                No {activeConfig?.plural ?? "animals"} registered yet.{" "}
                <Link href="/herd" className="text-primary hover:underline">
                  Add your first {activeConfig?.singular ?? "animal"}
                </Link>
              </p>
            ) : (
              <ul className="space-y-3">
                {data.recentAnimals.map((animal) => (
                  <li
                    key={animal.id}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                  >
                    <div>
                      <span className="font-medium text-text">
                        {animal.name}
                      </span>
                      <span className="ml-2 text-sm text-text-light">
                        #{animal.tagId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {animal.breed && (
                        <span className="text-xs text-text-light">
                          {animal.breed}
                        </span>
                      )}
                      <Badge variant={animal.gender === "FEMALE" ? "success" : "info"}>
                        {activeConfig?.genderLabels[animal.gender as "FEMALE" | "MALE" | "NEUTERED_MALE"] ?? animal.gender}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Breedings */}
        {data.upcomingBreedings.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Active Breedings</CardTitle>
              <Link
                href="/breeding"
                className="text-sm font-medium text-primary hover:text-primary-dark"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.upcomingBreedings.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                  >
                    <div>
                      <span className="font-medium text-text">
                        {event.parentFemale.name}
                      </span>
                      <span className="mx-1 text-text-light">x</span>
                      <span className="font-medium text-text">
                        {event.parentMale.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.expectedDueDate && (
                        <span className="text-xs text-text-light">
                          Due {formatDate(event.expectedDueDate)}
                        </span>
                      )}
                      <Badge
                        variant={
                          event.status === "CONFIRMED" ? "success" : "warning"
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
