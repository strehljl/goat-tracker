"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import TextArea from "@/components/ui/TextArea";
import Skeleton from "@/components/ui/Skeleton";
import { useFarm } from "@/components/providers/FarmProvider";

interface HerdNote {
  id: string;
  date: string;
  note: string;
}

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
  const [herdNotes, setHerdNotes] = useState<HerdNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editNote, setEditNote] = useState<HerdNote | null>(null);

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

  const fetchHerdNotes = useCallback(async () => {
    if (!activeHerd?.id) { setHerdNotes([]); return; }
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/herds/${activeHerd.id}/notes`);
      setHerdNotes(res.ok ? await res.json() : []);
    } catch (error) {
      console.error("Failed to fetch herd notes:", error);
    } finally {
      setNotesLoading(false);
    }
  }, [activeHerd?.id]);

  useEffect(() => { fetchHerdNotes(); }, [fetchHerdNotes]);

  const handleSaveNote = async (formData: { date: string; note: string }) => {
    if (!activeHerd?.id) return;
    const url = editNote
      ? `/api/herds/${activeHerd.id}/notes/${editNote.id}`
      : `/api/herds/${activeHerd.id}/notes`;
    const res = await fetch(url, {
      method: editNote ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    setShowNoteModal(false);
    setEditNote(null);
    fetchHerdNotes();
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!activeHerd?.id) return;
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/herds/${activeHerd.id}/notes/${noteId}`, { method: "DELETE" });
    fetchHerdNotes();
  };

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

        {/* Herd Notes */}
        {activeHerd && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Herd Notes</CardTitle>
              <Button size="sm" onClick={() => { setEditNote(null); setShowNoteModal(true); }}>
                + Add Note
              </Button>
            </CardHeader>
            <CardContent>
              {notesLoading ? (
                <Skeleton className="h-16 rounded-lg" />
              ) : herdNotes.length === 0 ? (
                <p className="text-sm text-text-light">
                  No notes yet. Use this for general observations about the herd — pasture rotations, weather, predator activity, and so on.
                </p>
              ) : (
                <ul className="space-y-3">
                  {herdNotes.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-start justify-between gap-3 rounded-lg bg-background px-3 py-2"
                    >
                      <div>
                        <p className="text-xs text-text-light">{formatDate(n.date)}</p>
                        <p className="mt-0.5 text-sm text-text whitespace-pre-wrap">{n.note}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditNote(n); setShowNoteModal(true); }}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteNote(n.id)}>
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Modal
        open={showNoteModal}
        onClose={() => { setShowNoteModal(false); setEditNote(null); }}
        title={editNote ? "Edit Herd Note" : "Add Herd Note"}
        className="max-w-lg"
      >
        <NoteForm
          initialData={editNote ?? undefined}
          onSubmit={handleSaveNote}
          onCancel={() => { setShowNoteModal(false); setEditNote(null); }}
        />
      </Modal>
    </div>
  );
}

function NoteForm({ initialData, onSubmit, onCancel }: {
  initialData?: { date: string; note: string };
  onSubmit: (data: { date: string; note: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(initialData?.date ? initialData.date.split("T")[0] : new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState(initialData?.note ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await onSubmit({ date, note });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      <Input id="note-date" label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      <TextArea id="note-text" label="Note *" value={note} onChange={(e) => setNote(e.target.value)} rows={4} required />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}
