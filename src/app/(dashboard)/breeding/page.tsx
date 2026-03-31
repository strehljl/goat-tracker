"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import TextArea from "@/components/ui/TextArea";
import { SkeletonTable } from "@/components/ui/Skeleton";

interface GoatOption { id: string; name: string; tagId: string; gender: string }

interface BreedingEvent {
  id: string;
  doe: { id: string; name: string; tagId: string };
  buck: { id: string; name: string; tagId: string };
  breedingDate: string;
  expectedDueDate: string | null;
  status: string;
  notes: string | null;
  kiddingRecord: {
    id: string;
    kiddingDate: string;
    complications: string | null;
    kids: { id: string; gender: string; birthWeight: string | null; status: string; goat: { name: string; tagId: string } | null }[];
  } | null;
}

const statusColors: Record<string, "warning" | "success" | "error" | "info"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  FAILED: "error",
  DELIVERED: "success",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function BreedingPage() {
  const [events, setEvents] = useState<BreedingEvent[]>([]);
  const [goats, setGoats] = useState<GoatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMassModal, setShowMassModal] = useState(false);
  const [kiddingEvent, setKiddingEvent] = useState<BreedingEvent | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch("/api/goats?status=ACTIVE").then((r) => r.json()).then(setGoats).catch(console.error);
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : "";
    try {
      const res = await fetch(`/api/breeding${params}`);
      setEvents(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleAdd = async (data: Record<string, string>) => {
    const res = await fetch("/api/breeding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json()).error);
    setShowAddModal(false);
    fetchEvents();
  };

  const handleStatusChange = async (id: string, status: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;
    try {
      const res = await fetch(`/api/breeding/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doeId: event.doe.id, buckId: event.buck.id,
          breedingDate: event.breedingDate, expectedDueDate: event.expectedDueDate,
          status, notes: event.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      fetchEvents();
    } catch (e) {
      console.error("Status update failed:", e);
      alert("Failed to update breeding status. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this breeding event?")) return;
    try {
      const res = await fetch(`/api/breeding/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchEvents();
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete breeding event. Please try again.");
    }
  };

  const does = useMemo(() => goats.filter((g) => g.gender === "DOE"), [goats]);
  const bucks = useMemo(() => goats.filter((g) => g.gender === "BUCK"), [goats]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Breeding</h1>
          <p className="mt-1 text-sm text-text-light">Track breeding events and kidding records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowMassModal(true)}>+ Mass Breeding</Button>
          <Button onClick={() => setShowAddModal(true)}>+ Add Breeding</Button>
        </div>
      </div>

      <div className="mt-4">
        <Select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "PENDING", label: "Pending" },
            { value: "CONFIRMED", label: "Confirmed" },
            { value: "DELIVERED", label: "Delivered" },
            { value: "FAILED", label: "Failed" },
          ]}
          placeholder="All statuses" className="sm:w-48"
        />
      </div>

      <div className="mt-4 space-y-4">
        {loading ? (
          <SkeletonTable rows={5} />
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-text-light">
            No breeding events found.
          </div>
        ) : events.map((event) => (
          <div key={event.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text">{event.doe.name}</span>
                  <span className="text-text-light">x</span>
                  <span className="font-medium text-text">{event.buck.name}</span>
                  <Badge variant={statusColors[event.status] || "default"}>{event.status}</Badge>
                </div>
                <div className="mt-1 flex gap-4 text-xs text-text-light">
                  <span>Bred: {formatDate(event.breedingDate)}</span>
                  {event.expectedDueDate && <span>Due: {formatDate(event.expectedDueDate)}</span>}
                </div>
                {event.notes && <p className="mt-1 text-xs text-text-light">{event.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                {event.status === "PENDING" && (
                  <Button size="sm" variant="secondary" onClick={() => handleStatusChange(event.id, "CONFIRMED")}>Confirm</Button>
                )}
                {(event.status === "PENDING" || event.status === "CONFIRMED") && (
                  <>
                    <Button size="sm" onClick={() => setKiddingEvent(event)}>Record Kidding</Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(event.id, "FAILED")}>Failed</Button>
                  </>
                )}
                <Button size="sm" variant="danger" onClick={() => handleDelete(event.id)}>Delete</Button>
              </div>
            </div>

            {event.kiddingRecord && (
              <div className="mt-3 rounded-lg bg-background p-3">
                <p className="text-sm font-medium text-text">
                  Kidding: {formatDate(event.kiddingRecord.kiddingDate)}
                  {event.kiddingRecord.complications && (
                    <span className="ml-2 text-xs text-error">Complications: {event.kiddingRecord.complications}</span>
                  )}
                </p>
                {event.kiddingRecord.kids.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {event.kiddingRecord.kids.map((kid) => (
                      <li key={kid.id} className="flex items-center gap-2 text-sm">
                        <Badge variant={kid.gender === "DOE" ? "success" : "info"}>{kid.gender}</Badge>
                        {kid.goat && <span className="text-text">{kid.goat.name} (#{kid.goat.tagId})</span>}
                        {kid.birthWeight && <span className="text-xs text-text-light">{kid.birthWeight} lbs</span>}
                        <Badge variant={kid.status === "ALIVE" ? "success" : "error"}>{kid.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={showMassModal} onClose={() => setShowMassModal(false)} title="Mass Breeding Event" className="max-w-lg">
        <MassBreedingForm does={does} bucks={bucks} onSuccess={() => { setShowMassModal(false); fetchEvents(); }} onCancel={() => setShowMassModal(false)} />
      </Modal>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Breeding Event" className="max-w-lg">
        <BreedingForm does={does} bucks={bucks} onSubmit={handleAdd} onCancel={() => setShowAddModal(false)} />
      </Modal>

      <Modal open={!!kiddingEvent} onClose={() => setKiddingEvent(null)} title={`Record Kidding - ${kiddingEvent?.doe.name}`} className="max-w-lg max-h-[90vh] overflow-y-auto">
        {kiddingEvent && (
          <KiddingForm breedingEventId={kiddingEvent.id} onSuccess={() => { setKiddingEvent(null); fetchEvents(); }} onCancel={() => setKiddingEvent(null)} />
        )}
      </Modal>
    </div>
  );
}

function BreedingForm({ does, bucks, onSubmit, onCancel }: {
  does: GoatOption[]; bucks: GoatOption[];
  onSubmit: (data: Record<string, string>) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState({ doeId: "", buckId: "", breedingDate: "", expectedDueDate: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try { await onSubmit(form); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      <Select id="b-doe" label="Doe *" value={form.doeId} onChange={(e) => setForm({ ...form, doeId: e.target.value })}
        options={does.map((d) => ({ value: d.id, label: `${d.name} (#${d.tagId})` }))} placeholder="Select doe" />
      <Select id="b-buck" label="Buck *" value={form.buckId} onChange={(e) => setForm({ ...form, buckId: e.target.value })}
        options={bucks.map((b) => ({ value: b.id, label: `${b.name} (#${b.tagId})` }))} placeholder="Select buck" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="b-date" label="Breeding Date *" type="date" value={form.breedingDate} onChange={(e) => {
          const breedingDate = e.target.value;
          let expectedDueDate = form.expectedDueDate;
          if (breedingDate) {
            const due = new Date(breedingDate + "T00:00:00");
            due.setMonth(due.getMonth() + 5);
            expectedDueDate = due.toISOString().split("T")[0];
          }
          setForm({ ...form, breedingDate, expectedDueDate });
        }} required />
        <Input id="b-due" label="Expected Due Date" type="date" value={form.expectedDueDate} onChange={(e) => setForm({ ...form, expectedDueDate: e.target.value })} />
      </div>
      <TextArea id="b-notes" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

// === Doe Checkbox List ===

function DoeCheckboxList({ does, selected, onChange }: {
  does: GoatOption[]; selected: string[]; onChange: (ids: string[]) => void;
}) {
  const allSelected = selected.length === does.length && does.length > 0;
  const toggleAll = () => onChange(allSelected ? [] : does.map((d) => d.id));
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-text">Does * <span className="text-text-light">({selected.length} selected)</span></label>
        <button type="button" onClick={toggleAll} className="text-xs font-medium text-primary hover:underline">
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-surface p-2 space-y-1">
        {does.length === 0 ? (
          <p className="px-2 py-1 text-sm text-text-light">No active does found.</p>
        ) : does.map((d) => (
          <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-background">
            <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)} className="accent-primary" />
            <span className="text-sm text-text">{d.name}</span>
            <span className="text-xs text-text-light">#{d.tagId}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// === Mass Breeding Form ===

function MassBreedingForm({ does, bucks, onSuccess, onCancel }: {
  does: GoatOption[]; bucks: GoatOption[]; onSuccess: () => void; onCancel: () => void;
}) {
  const [selectedDoeIds, setSelectedDoeIds] = useState<string[]>([]);
  const [form, setForm] = useState({ buckId: "", breedingDate: "", expectedDueDate: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDateChange = (breedingDate: string) => {
    let expectedDueDate = form.expectedDueDate;
    if (breedingDate) {
      const due = new Date(breedingDate + "T00:00:00");
      due.setMonth(due.getMonth() + 5);
      expectedDueDate = due.toISOString().split("T")[0];
    }
    setForm({ ...form, breedingDate, expectedDueDate });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDoeIds.length === 0) { setError("Select at least one doe."); return; }
    if (!form.buckId) { setError("A buck is required."); return; }
    if (!form.breedingDate) { setError("Breeding date is required."); return; }
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled(
        selectedDoeIds.map((doeId) =>
          fetch("/api/breeding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, doeId }),
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) throw new Error(`${failed} event(s) failed to save.`);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      <Select id="mb-buck" label="Buck *" value={form.buckId} onChange={(e) => setForm({ ...form, buckId: e.target.value })}
        options={bucks.map((b) => ({ value: b.id, label: `${b.name} (#${b.tagId})` }))} placeholder="Select buck" />
      <DoeCheckboxList does={does} selected={selectedDoeIds} onChange={setSelectedDoeIds} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="mb-date" label="Breeding Date *" type="date" value={form.breedingDate} onChange={(e) => handleDateChange(e.target.value)} required />
        <Input id="mb-due" label="Expected Due Date" type="date" value={form.expectedDueDate} onChange={(e) => setForm({ ...form, expectedDueDate: e.target.value })} />
      </div>
      <TextArea id="mb-notes" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>
          Create {selectedDoeIds.length > 0 ? `(${selectedDoeIds.length} events)` : ""}
        </Button>
      </div>
    </form>
  );
}

interface KidEntry { gender: string; birthWeight: string; status: string; registerAsGoat: boolean; name: string; tagId: string }

function KiddingForm({ breedingEventId, onSuccess, onCancel }: {
  breedingEventId: string; onSuccess: () => void; onCancel: () => void;
}) {
  const [kiddingDate, setKiddingDate] = useState("");
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");
  const [kids, setKids] = useState<KidEntry[]>([{ gender: "DOE", birthWeight: "", status: "ALIVE", registerAsGoat: true, name: "", tagId: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addKid = () => setKids([...kids, { gender: "DOE", birthWeight: "", status: "ALIVE", registerAsGoat: true, name: "", tagId: "" }]);
  const removeKid = (i: number) => setKids(kids.filter((_, idx) => idx !== i));
  const updateKid = (i: number, field: keyof KidEntry, value: string | boolean) => {
    const updated = [...kids];
    (updated[i] as unknown as Record<string, string | boolean>)[field] = value;
    setKids(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/breeding/${breedingEventId}/kidding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kiddingDate, complications, notes, kids }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      <Input id="k-date" label="Kidding Date *" type="date" value={kiddingDate} onChange={(e) => setKiddingDate(e.target.value)} required />
      <TextArea id="k-comp" label="Complications" value={complications} onChange={(e) => setComplications(e.target.value)} rows={2} />
      <TextArea id="k-notes" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-text">Kids</label>
          <Button type="button" size="sm" variant="outline" onClick={addKid}>+ Add Kid</Button>
        </div>
        {kids.map((kid, i) => (
          <div key={i} className="mb-3 rounded-lg border border-border bg-background p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text">Kid #{i + 1}</span>
              {kids.length > 1 && (
                <button type="button" onClick={() => removeKid(i)} className="text-xs text-error hover:underline">Remove</button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select id={`kid-${i}-gender`} label="Gender" value={kid.gender} onChange={(e) => updateKid(i, "gender", e.target.value)}
                options={[{ value: "DOE", label: "Doe" }, { value: "BUCK", label: "Buck" }]} />
              <Input id={`kid-${i}-weight`} label="Birth Weight (lbs)" type="number" step="0.01" value={kid.birthWeight} onChange={(e) => updateKid(i, "birthWeight", e.target.value)} />
              <Select id={`kid-${i}-status`} label="Status" value={kid.status} onChange={(e) => updateKid(i, "status", e.target.value)}
                options={[{ value: "ALIVE", label: "Alive" }, { value: "STILLBORN", label: "Stillborn" }]} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id={`kid-${i}-reg`} checked={kid.registerAsGoat}
                onChange={(e) => updateKid(i, "registerAsGoat", e.target.checked)} className="rounded border-border" />
              <label htmlFor={`kid-${i}-reg`} className="text-sm text-text">Register as goat in herd</label>
            </div>
            {kid.registerAsGoat && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input id={`kid-${i}-name`} label="Name" value={kid.name} onChange={(e) => updateKid(i, "name", e.target.value)} placeholder="Kid name" />
                <Input id={`kid-${i}-tag`} label="Tag ID" value={kid.tagId} onChange={(e) => updateKid(i, "tagId", e.target.value)} placeholder="e.g. GT-010" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Record Kidding</Button>
      </div>
    </form>
  );
}
