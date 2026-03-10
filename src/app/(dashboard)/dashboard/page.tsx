"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";

interface DashboardData {
  stats: {
    totalGoats: number;
    doesCount: number;
    bucksCount: number;
    pregnantDoes: number;
    kidsBornThisYear: number;
  };
  alerts: { type: string; message: string; date?: string }[];
  recentGoats: {
    id: string;
    name: string;
    tagId: string;
    gender: string;
    breed: string | null;
    createdAt: string;
  }[];
  upcomingBreedings: {
    id: string;
    doe: { name: string; tagId: string };
    buck: { name: string; tagId: string };
    breedingDate: string;
    expectedDueDate: string | null;
    status: string;
  }[];
}

const statCards = [
  { key: "totalGoats" as const, label: "Total Goats", icon: "🐐", color: "bg-primary", href: "/herd" },
  { key: "doesCount" as const, label: "Does", icon: "♀", color: "bg-secondary", href: "/herd?gender=DOE" },
  { key: "bucksCount" as const, label: "Bucks", icon: "♂", color: "bg-accent", href: "/herd?gender=BUCK" },
  { key: "pregnantDoes" as const, label: "Pregnant", icon: "🤰", color: "bg-warning", href: "/breeding" },
  { key: "kidsBornThisYear" as const, label: "Kids This Year", icon: "🍼", color: "bg-success", href: "/herd?bornThisYear=true" },
];

const alertTypeColors: Record<string, "warning" | "info" | "error"> = {
  vaccination: "warning",
  deworming: "info",
  kidding: "error",
};

const alertTypeLabels: Record<string, string> = {
  vaccination: "Vaccination",
  deworming: "Deworming",
  kidding: "Kidding",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

        {/* Recent Goats */}
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
            {data.recentGoats.length === 0 ? (
              <p className="text-sm text-text-light">
                No goats registered yet.{" "}
                <Link href="/herd" className="text-primary hover:underline">
                  Add your first goat
                </Link>
              </p>
            ) : (
              <ul className="space-y-3">
                {data.recentGoats.map((goat) => (
                  <li
                    key={goat.id}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                  >
                    <div>
                      <span className="font-medium text-text">
                        {goat.name}
                      </span>
                      <span className="ml-2 text-sm text-text-light">
                        #{goat.tagId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {goat.breed && (
                        <span className="text-xs text-text-light">
                          {goat.breed}
                        </span>
                      )}
                      <Badge
                        variant={goat.gender === "DOE" ? "success" : "info"}
                      >
                        {goat.gender}
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
                        {event.doe.name}
                      </span>
                      <span className="mx-1 text-text-light">x</span>
                      <span className="font-medium text-text">
                        {event.buck.name}
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
