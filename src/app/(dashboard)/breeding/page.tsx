"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import TextArea from "@/components/ui/TextArea";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useFarm } from "@/components/providers/FarmProvider";
import { AnimalConfig } from "@/lib/animalConfig";

interface AnimalOption { id: string; name: string; tagId: string; gender: string }

interface BreedingEvent {
  id: string;
  parentFemale: { id: string; name: string; tagId: string };
  parentMale: { id: string; name: string; tagId: string };
  breedingDate: string;
  expectedDueDate: string | null;
  status: string;
  notes: string | null;
  birthRecord: {
    id: string;
    birthDate: string;
    complications: string | null;
    offspring: { id: string; gender: string; birthWeight: string | null; status: string; animal: { name: string; tagId: string } | null }[];
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
  const { activeConfig, activeHerd } = useFarm();
  const [events, setEvents] = useState<BreedingEvent[]>([]);
  const [animals, setAnimals] = useState<AnimalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMassModal, setShowMassModal] = useState(false);
  const [birthEvent, setBirthEvent] = useState<BreedingEvent | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const herdParam = activeHerd?.id ? `?herdId=${activeHerd.id}&status=ACTIVE` : "?status=ACTIVE";
    fetch(`/api/animals${herdParam}`).then((r) => r.json()).then(setAnimals).catch(console.error);
  }, [activeHerd?.id]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (activeHerd?.id) params.set("herdId", activeHerd.id);
    try {
      const res = await fetch(`/api/breeding?${params}`);
      setEvents(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter, activeHerd?.id]);

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
          parentFemaleId: event.parentFemale.id, parentMaleId: event.parentMale.id,
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

  const config = activeConfig;
  const females = useMemo(() => animals.filter((a) => a.gender === "FEMALE"), [animals]);
  const males = useMemo(() => animals.filter((a) => a.gender === "MALE"), [animals]);

  const femaleLabel = config?.breedingTerms.femaleRole ?? "Female";
  const maleLabel = config?.breedingTerms.maleRole ?? "Male";
  const birthNoun = config?.breedingTerms.birthEventNoun ?? "Birth";
  const offspringPlural = config?.breedingTerms.offspringPlural ?? "Offspring";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Breeding</h1>
          <p className="mt-1 text-sm text-text-light">
            Track breeding events and {birthNoun.toLowerCase()} records
          </p>
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
                  <span className="font-medium text-text">{event.parentFemale.name}</span>
                  <span className="text-text-light">x</span>
                  <span className="font-medium text-text">{event.parentMale.name}</span>
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
                    <Button size="sm" onClick={() => setBirthEvent(event)}>Record {birthNoun}</Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(event.id, "FAILED")}>Failed</Button>
                  </>
                )}
                <Button size="sm" variant="danger" onClick={() => handleDelete(event.id)}>Delete</Button>
              </div>
            </div>

            {event.birthRecord && (
              <div className="mt-3 rounded-lg bg-background p-3">
                <p className="text-sm font-medium text-text">
                  {birthNoun}: {formatDate(event.birthRecord.birthDate)}
                  {event.birthRecord.complications && (
                    <span className="ml-2 text-xs text-error">Complications: {event.birthRecord.complications}</span>
                  )}
                </p>
                {event.birthRecord.offspring.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {event.birthRecord.offspring.map((o) => (
                      <li key={o.id} className="flex items-center gap-2 text-sm">
                        <Badge variant={o.gender === "FEMALE" ? "success" : "info"}>
                          {config?.genderLabels[o.gender as "FEMALE" | "MALE" | "NEUTERED_MALE"] ?? o.gender}
                        </Badge>
                        {o.animal && <span className="text-text">{o.animal.name} (#{o.animal.tagId})</span>}
                        {o.birthWeight && <span className="text-xs text-text-light">{o.birthWeight} lbs</span>}
                        <Badge variant={o.status === "ALIVE" ? "success" : "error"}>{o.status}</Badge>
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
        <MassBreedingForm
          females={females} males={males} config={config}
          onSuccess={() => { setShowMassModal(false); fetchEvents(); }}
          onCancel={() => setShowMassModal(false)}
        />
      </Modal>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Breeding Event" className="max-w-lg">
        <BreedingForm females={females} males={males} config={config} onSubmit={handleAdd} onCancel={() => setShowAddModal(false)} />
      </Modal>

      <Modal
        open={!!birthEvent}
        onClose={() => setBirthEvent(null)}
        title={`Record ${birthNoun} — ${birthEvent?.parentFemale.name}`}
        className="max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {birthEvent && (
          <BirthForm
            breedingEventId={birthEvent.id} config={config}
            onSuccess={() => { setBirthEvent(null); fetchEvents(); }}
            onCancel={() => setBirthEvent(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function BreedingForm({ females, males, config, onSubmit, onCancel }: {
  females: AnimalOption[]; males: AnimalOption[]; config: AnimalConfig | null;
  onSubmit: (data: Record<string, string>) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState({ parentFemaleId: "", parentMaleId: "", breedingDate: "", expectedDueDate: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const femaleLabel = config?.breedingTerms.femaleRole ?? "Female";
  const maleLabel = config?.breedingTerms.maleRole ?? "Male";

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
      <Select id="b-female" label={`${femaleLabel} *`} value={form.parentFemaleId}
        onChange={(e) => setForm({ ...form, parentFemaleId: e.target.value })}
        options={females.map((f) => ({ value: f.id, label: `${f.name} (#${f.tagId})` }))}
        placeholder={`Select ${femaleLabel.toLowerCase()}`} />
      <Select id="b-male" label={`${maleLabel} *`} value={form.parentMaleId}
        onChange={(e) => setForm({ ...form, parentMaleId: e.target.value })}
        options={males.map((m) => ({ value: m.id, label: `${m.name} (#${m.tagId})` }))}
        placeholder={`Select ${maleLabel.toLowerCase()}`} />
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
        <Input id="b-due" label="Expected Due Date" type="date" value={form.expectedDueDate}
          onChange={(e) => setForm({ ...form, expectedDueDate: e.target.value })} />
      </div>
      <TextArea id="b-notes" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

// === Female Checkbox List ===

function FemaleCheckboxList({ females, label, selected, onChange }: {
  females: AnimalOption[]; label: string; selected: string[]; onChange: (ids: string[]) => void;
}) {
  const allSelected = selected.length === females.length && females.length > 0;
  const toggleAll = () => onChange(allSelected ? [] : females.map((f) => f.id));
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-text">
          {label} * <span className="text-text-light">({selected.length} selected)</span>
        </label>
        <button type="button" onClick={toggleAll} className="text-xs font-medium text-primary hover:underline">
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-surface p-2 space-y-1">
        {females.length === 0 ? (
          <p className="px-2 py-1 text-sm text-text-light">No active {label.toLowerCase()}s found.</p>
        ) : females.map((f) => (
          <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-background">
            <input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggle(f.id)} className="accent-primary" />
            <span className="text-sm text-text">{f.name}</span>
            <span className="text-xs text-text-light">#{f.tagId}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// === Mass Breeding Form ===

function MassBreedingForm({ females, males, config, onSuccess, onCancel }: {
  females: AnimalOption[]; males: AnimalOption[]; config: AnimalConfig | null;
  onSuccess: () => void; onCancel: () => void;
}) {
  const [selectedFemaleIds, setSelectedFemaleIds] = useState<string[]>([]);
  const [form, setForm] = useState({ parentMaleId: "", breedingDate: "", expectedDueDate: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const femaleLabel = config?.breedingTerms.femaleRole ?? "Female";
  const maleLabel = config?.breedingTerms.maleRole ?? "Male";

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
    if (selectedFemaleIds.length === 0) { setError(`Select at least one ${femaleLabel.toLowerCase()}.`); return; }
    if (!form.parentMaleId) { setError(`A ${maleLabel.toLowerCase()} is required.`); return; }
    if (!form.breedingDate) { setError("Breeding date is required."); return; }
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled(
        selectedFemaleIds.map((parentFemaleId) =>
          fetch("/api/breeding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, parentFemaleId }),
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
      <Select id="mb-male" label={`${maleLabel} *`} value={form.parentMaleId}
        onChange={(e) => setForm({ ...form, parentMaleId: e.target.value })}
        options={males.map((m) => ({ value: m.id, label: `${m.name} (#${m.tagId})` }))}
        placeholder={`Select ${maleLabel.toLowerCase()}`} />
      <FemaleCheckboxList females={females} label={femaleLabel} selected={selectedFemaleIds} onChange={setSelectedFemaleIds} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="mb-date" label="Breeding Date *" type="date" value={form.breedingDate}
          onChange={(e) => handleDateChange(e.target.value)} required />
        <Input id="mb-due" label="Expected Due Date" type="date" value={form.expectedDueDate}
          onChange={(e) => setForm({ ...form, expectedDueDate: e.target.value })} />
      </div>
      <TextArea id="mb-notes" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>
          Create {selectedFemaleIds.length > 0 ? `(${selectedFemaleIds.length} events)` : ""}
        </Button>
      </div>
    </form>
  );
}

interface OffspringEntry { gender: string; birthWeight: string; status: string; registerAsAnimal: boolean; name: string; tagId: string }

function BirthForm({ breedingEventId, config, onSuccess, onCancel }: {
  breedingEventId: string; config: AnimalConfig | null; onSuccess: () => void; onCancel: () => void;
}) {
  const [birthDate, setBirthDate] = useState("");
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");
  const [offspring, setOffspring] = useState<OffspringEntry[]>([
    { gender: "FEMALE", birthWeight: "", status: "ALIVE", registerAsAnimal: true, name: "", tagId: "" }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const birthNoun = config?.breedingTerms.birthEventNoun ?? "Birth";
  const offspringSingular = config?.breedingTerms.offspringSingular ?? "Offspring";
  const singularCapitalized = config?.singularCapitalized ?? "Animal";
  const tagIdPlaceholder = config?.tagIdPlaceholder ?? "e.g. AN-001";

  const addOffspring = () => setOffspring([...offspring, { gender: "FEMALE", birthWeight: "", status: "ALIVE", registerAsAnimal: true, name: "", tagId: "" }]);
  const removeOffspring = (i: number) => setOffspring(offspring.filter((_, idx) => idx !== i));
  const updateOffspring = (i: number, field: keyof OffspringEntry, value: string | boolean) => {
    const updated = [...offspring];
    (updated[i] as unknown as Record<string, string | boolean>)[field] = value;
    setOffspring(updated);
  };

  const genderOptions = config
    ? [
        { value: "FEMALE", label: config.genderLabels.FEMALE },
        { value: "MALE", label: config.genderLabels.MALE },
      ]
    : [
        { value: "FEMALE", label: "Female" },
        { value: "MALE", label: "Male" },
      ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/breeding/${breedingEventId}/birth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, complications, notes, offspring }),
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
      <Input id="b-date" label={`${birthNoun} Date *`} type="date" value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)} required />
      <TextArea id="b-comp" label="Complications" value={complications}
        onChange={(e) => setComplications(e.target.value)} rows={2} />
      <TextArea id="b-notes" label="Notes" value={notes}
        onChange={(e) => setNotes(e.target.value)} rows={2} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-text">{config?.breedingTerms.offspringPlural ?? "Offspring"}</label>
          <Button type="button" size="sm" variant="outline" onClick={addOffspring}>
            + Add {offspringSingular}
          </Button>
        </div>
        {offspring.map((o, i) => (
          <div key={i} className="mb-3 rounded-lg border border-border bg-background p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text">{offspringSingular} #{i + 1}</span>
              {offspring.length > 1 && (
                <button type="button" onClick={() => removeOffspring(i)} className="text-xs text-error hover:underline">Remove</button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select id={`o-${i}-gender`} label="Gender" value={o.gender}
                onChange={(e) => updateOffspring(i, "gender", e.target.value)}
                options={genderOptions} />
              <Input id={`o-${i}-weight`} label="Birth Weight (lbs)" type="number" step="0.01"
                value={o.birthWeight} onChange={(e) => updateOffspring(i, "birthWeight", e.target.value)} />
              <Select id={`o-${i}-status`} label="Status" value={o.status}
                onChange={(e) => updateOffspring(i, "status", e.target.value)}
                options={[{ value: "ALIVE", label: "Alive" }, { value: "STILLBORN", label: "Stillborn" }]} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id={`o-${i}-reg`} checked={o.registerAsAnimal}
                onChange={(e) => updateOffspring(i, "registerAsAnimal", e.target.checked)}
                className="rounded border-border" />
              <label htmlFor={`o-${i}-reg`} className="text-sm text-text">
                Register as {singularCapitalized.toLowerCase()} in herd
              </label>
            </div>
            {o.registerAsAnimal && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input id={`o-${i}-name`} label="Name" value={o.name}
                  onChange={(e) => updateOffspring(i, "name", e.target.value)}
                  placeholder={`${offspringSingular} name`} />
                <Input id={`o-${i}-tag`} label="Tag ID" value={o.tagId}
                  onChange={(e) => updateOffspring(i, "tagId", e.target.value)}
                  placeholder={tagIdPlaceholder} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Record {birthNoun}</Button>
      </div>
    </form>
  );
}
