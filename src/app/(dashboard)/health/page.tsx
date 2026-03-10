"use client";

import { useEffect, useState, useCallback } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import TextArea from "@/components/ui/TextArea";
import { SkeletonTable } from "@/components/ui/Skeleton";

interface GoatOption {
  id: string;
  name: string;
  tagId: string;
  gender: string;
}

type Tab = "vaccinations" | "medications" | "vet-visits" | "dewormings";

const tabs: { key: Tab; label: string }[] = [
  { key: "vaccinations", label: "Vaccinations" },
  { key: "medications", label: "Medications" },
  { key: "vet-visits", label: "Vet Visits" },
  { key: "dewormings", label: "Dewormings" },
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(val: string | null) {
  if (!val) return "—";
  return `$${parseFloat(val).toFixed(2)}`;
}

export default function HealthPage() {
  const [activeTab, setActiveTab] = useState<Tab>("vaccinations");
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [goats, setGoats] = useState<GoatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [goatFilter, setGoatFilter] = useState("");

  useEffect(() => {
    fetch("/api/goats?status=ACTIVE")
      .then((res) => res.json())
      .then(setGoats)
      .catch(console.error);
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = goatFilter ? `?goatId=${goatFilter}` : "";
    try {
      const res = await fetch(`/api/health/${activeTab}${params}`);
      const data = await res.json();
      setRecords(data);
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, goatFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    try {
      const res = await fetch(`/api/health/${activeTab}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchRecords();
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Failed to delete record. Please try again.");
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Health Records</h1>
          <p className="mt-1 text-sm text-text-light">
            Track vaccinations, medications, vet visits, and deworming
          </p>
        </div>
        <div className="flex gap-2">
          {(activeTab === "vaccinations" || activeTab === "dewormings") && (
            <Button variant="outline" onClick={() => setShowBulkModal(true)}>+ Bulk Record</Button>
          )}
          <Button onClick={() => setShowAddModal(true)}>+ Add Record</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 overflow-x-auto rounded-lg bg-background p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-surface text-primary shadow-sm"
                : "text-text-light hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="mt-4">
        <select
          id="goatFilter"
          value={goatFilter}
          onChange={(e) => setGoatFilter(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 sm:w-64"
        >
          <option value="">All goats</option>
          {goats.map((g) => (
            <option key={g.id} value={g.id}>{g.name} (#{g.tagId})</option>
          ))}
        </select>
      </div>

      {/* Records */}
      <div className="mt-4">
        {loading ? (
          <SkeletonTable rows={6} />
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-text-light">
            No {activeTab.replace("-", " ")} records found.
          </div>
        ) : (
          <div className="space-y-3">
            {activeTab === "vaccinations" && records.map((r) => (
              <VaccinationCard key={r.id as string} record={r} onDelete={handleDelete} />
            ))}
            {activeTab === "medications" && records.map((r) => (
              <MedicationCard key={r.id as string} record={r} onDelete={handleDelete} />
            ))}
            {activeTab === "vet-visits" && records.map((r) => (
              <VetVisitCard key={r.id as string} record={r} onDelete={handleDelete} />
            ))}
            {activeTab === "dewormings" && records.map((r) => (
              <DewormingCard key={r.id as string} record={r} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add ${tabs.find((t) => t.key === activeTab)?.label.slice(0, -1) || "Record"}`}
        className="max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {activeTab === "vaccinations" && (
          <VaccinationForm goats={goats} onSuccess={() => { setShowAddModal(false); fetchRecords(); }} onCancel={() => setShowAddModal(false)} />
        )}
        {activeTab === "medications" && (
          <MedicationForm goats={goats} onSuccess={() => { setShowAddModal(false); fetchRecords(); }} onCancel={() => setShowAddModal(false)} />
        )}
        {activeTab === "vet-visits" && (
          <VetVisitForm goats={goats} onSuccess={() => { setShowAddModal(false); fetchRecords(); }} onCancel={() => setShowAddModal(false)} />
        )}
        {activeTab === "dewormings" && (
          <DewormingForm goats={goats} onSuccess={() => { setShowAddModal(false); fetchRecords(); }} onCancel={() => setShowAddModal(false)} />
        )}
      </Modal>

      {/* Bulk Modal */}
      <Modal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title={`Bulk Add ${tabs.find((t) => t.key === activeTab)?.label || "Records"}`}
        className="max-w-xl max-h-[90vh] overflow-y-auto"
      >
        {activeTab === "vaccinations" && (
          <BulkVaccinationForm goats={goats} onSuccess={() => { setShowBulkModal(false); fetchRecords(); }} onCancel={() => setShowBulkModal(false)} />
        )}
        {activeTab === "dewormings" && (
          <BulkDewormingForm goats={goats} onSuccess={() => { setShowBulkModal(false); fetchRecords(); }} onCancel={() => setShowBulkModal(false)} />
        )}
      </Modal>
    </div>
  );
}

// === Record Cards ===

function VaccinationCard({ record: r, onDelete }: { record: Record<string, unknown>; onDelete: (id: string) => void }) {
  const goat = r.goat as { name: string; tagId: string };
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text">{r.name as string}</span>
          <Badge variant="info">{goat.name} #{goat.tagId}</Badge>
        </div>
        <div className="mt-1 flex gap-4 text-xs text-text-light">
          <span>Given: {formatDate(r.dateGiven as string)}</span>
          {!!r.nextDueDate && <span>Next due: {formatDate(r.nextDueDate as string)}</span>}
        </div>
        {!!r.notes && <p className="mt-1 text-xs text-text-light">{r.notes as string}</p>}
      </div>
      <button onClick={() => onDelete(r.id as string)} className="ml-4 text-xs text-error hover:underline">Delete</button>
    </div>
  );
}

function MedicationCard({ record: r, onDelete }: { record: Record<string, unknown>; onDelete: (id: string) => void }) {
  const goat = r.goat as { name: string; tagId: string };
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text">{r.name as string}</span>
          {!!r.dosage && <span className="text-xs text-text-light">({r.dosage as string})</span>}
          <Badge variant="warning">{goat.name} #{goat.tagId}</Badge>
        </div>
        <div className="mt-1 flex gap-4 text-xs text-text-light">
          <span>Start: {formatDate(r.startDate as string)}</span>
          {!!r.endDate && <span>End: {formatDate(r.endDate as string)}</span>}
        </div>
        {!!r.notes && <p className="mt-1 text-xs text-text-light">{r.notes as string}</p>}
      </div>
      <button onClick={() => onDelete(r.id as string)} className="ml-4 text-xs text-error hover:underline">Delete</button>
    </div>
  );
}

function VetVisitCard({ record: r, onDelete }: { record: Record<string, unknown>; onDelete: (id: string) => void }) {
  const goat = r.goat as { name: string; tagId: string };
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text">{r.reason as string}</span>
          <Badge variant="error">{goat.name} #{goat.tagId}</Badge>
          {!!r.cost && <span className="text-xs font-medium text-accent">{formatCurrency(r.cost as string)}</span>}
        </div>
        <div className="mt-1 flex gap-4 text-xs text-text-light">
          <span>Date: {formatDate(r.date as string)}</span>
          {!!r.vetName && <span>Vet: {r.vetName as string}</span>}
        </div>
        {!!r.diagnosis && <p className="mt-1 text-xs text-text-light">Diagnosis: {r.diagnosis as string}</p>}
        {!!r.treatment && <p className="text-xs text-text-light">Treatment: {r.treatment as string}</p>}
      </div>
      <button onClick={() => onDelete(r.id as string)} className="ml-4 text-xs text-error hover:underline">Delete</button>
    </div>
  );
}

function DewormingCard({ record: r, onDelete }: { record: Record<string, unknown>; onDelete: (id: string) => void }) {
  const goat = r.goat as { name: string; tagId: string };
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text">{r.productName as string}</span>
          <Badge variant="success">{goat.name} #{goat.tagId}</Badge>
        </div>
        <div className="mt-1 flex gap-4 text-xs text-text-light">
          <span>Given: {formatDate(r.dateGiven as string)}</span>
          {!!r.nextDueDate && <span>Next due: {formatDate(r.nextDueDate as string)}</span>}
        </div>
        {!!r.notes && <p className="mt-1 text-xs text-text-light">{r.notes as string}</p>}
      </div>
      <button onClick={() => onDelete(r.id as string)} className="ml-4 text-xs text-error hover:underline">Delete</button>
    </div>
  );
}

// === Forms ===

interface FormProps {
  goats: GoatOption[];
  onSuccess: () => void;
  onCancel: () => void;
}

function VaccinationForm({ goats, onSuccess, onCancel }: FormProps) {
  const [form, setForm] = useState({ goatId: "", name: "", dateGiven: "", nextDueDate: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/health/vaccinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
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
      <Select id="vax-goat" label="Goat *" value={form.goatId} onChange={(e) => setForm({ ...form, goatId: e.target.value })} options={goats.map((g) => ({ value: g.id, label: `${g.name} (#${g.tagId})` }))} placeholder="Select goat" />
      <Input id="vax-name" label="Vaccine Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. CDT" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="vax-date" label="Date Given *" type="date" value={form.dateGiven} onChange={(e) => setForm({ ...form, dateGiven: e.target.value })} required />
        <Input id="vax-next" label="Next Due Date" type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
      </div>
      <TextArea id="vax-notes" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

function MedicationForm({ goats, onSuccess, onCancel }: FormProps) {
  const [form, setForm] = useState({ goatId: "", name: "", dosage: "", startDate: "", endDate: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/health/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
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
      <Select id="med-goat" label="Goat *" value={form.goatId} onChange={(e) => setForm({ ...form, goatId: e.target.value })} options={goats.map((g) => ({ value: g.id, label: `${g.name} (#${g.tagId})` }))} placeholder="Select goat" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="med-name" label="Medication Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Penicillin" required />
        <Input id="med-dosage" label="Dosage" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 5ml" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="med-start" label="Start Date *" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
        <Input id="med-end" label="End Date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
      </div>
      <TextArea id="med-notes" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

function VetVisitForm({ goats, onSuccess, onCancel }: FormProps) {
  const [form, setForm] = useState({ goatId: "", date: "", reason: "", diagnosis: "", treatment: "", cost: "", vetName: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/health/vet-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
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
      <Select id="vet-goat" label="Goat *" value={form.goatId} onChange={(e) => setForm({ ...form, goatId: e.target.value })} options={goats.map((g) => ({ value: g.id, label: `${g.name} (#${g.tagId})` }))} placeholder="Select goat" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="vet-date" label="Visit Date *" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        <Input id="vet-name" label="Vet Name" value={form.vetName} onChange={(e) => setForm({ ...form, vetName: e.target.value })} placeholder="Dr. Smith" />
      </div>
      <Input id="vet-reason" label="Reason *" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Annual checkup" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextArea id="vet-diagnosis" label="Diagnosis" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} rows={2} />
        <TextArea id="vet-treatment" label="Treatment" value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} rows={2} />
      </div>
      <Input id="vet-cost" label="Cost ($)" type="number" step="0.01" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0.00" />
      <TextArea id="vet-notes" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

function DewormingForm({ goats, onSuccess, onCancel }: FormProps) {
  const [form, setForm] = useState({ goatId: "", productName: "", dateGiven: "", nextDueDate: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/health/dewormings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
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
      <Select id="dew-goat" label="Goat *" value={form.goatId} onChange={(e) => setForm({ ...form, goatId: e.target.value })} options={goats.map((g) => ({ value: g.id, label: `${g.name} (#${g.tagId})` }))} placeholder="Select goat" />
      <Input id="dew-product" label="Product Name *" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="e.g. Ivermectin" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="dew-date" label="Date Given *" type="date" value={form.dateGiven} onChange={(e) => setForm({ ...form, dateGiven: e.target.value })} required />
        <Input id="dew-next" label="Next Due Date" type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
      </div>
      <TextArea id="dew-notes" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

// === Bulk Goat Selector ===

function GoatCheckboxList({ goats, selected, onChange }: {
  goats: GoatOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const allSelected = selected.length === goats.length;
  const toggleAll = () => onChange(allSelected ? [] : goats.map((g) => g.id));
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-text">Goats * <span className="text-text-light">({selected.length} selected)</span></label>
        <button type="button" onClick={toggleAll} className="text-xs font-medium text-primary hover:underline">
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-surface p-2 space-y-1">
        {goats.map((g) => (
          <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-background">
            <input
              type="checkbox"
              checked={selected.includes(g.id)}
              onChange={() => toggle(g.id)}
              className="accent-primary"
            />
            <span className="text-sm text-text">{g.name}</span>
            <span className="text-xs text-text-light">#{g.tagId}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// === Bulk Forms ===

function BulkVaccinationForm({ goats, onSuccess, onCancel }: FormProps) {
  const [selectedGoatIds, setSelectedGoatIds] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", dateGiven: "", nextDueDate: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGoatIds.length === 0) { setError("Select at least one goat."); return; }
    if (!form.name || !form.dateGiven) { setError("Vaccine name and date given are required."); return; }
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled(
        selectedGoatIds.map((goatId) =>
          fetch("/api/health/vaccinations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, goatId }),
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) throw new Error(`${failed} record(s) failed to save.`);
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
      <GoatCheckboxList goats={goats} selected={selectedGoatIds} onChange={setSelectedGoatIds} />
      <Input id="bulk-vax-name" label="Vaccine Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. CDT" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="bulk-vax-date" label="Date Given *" type="date" value={form.dateGiven} onChange={(e) => setForm({ ...form, dateGiven: e.target.value })} />
        <Input id="bulk-vax-next" label="Next Due Date" type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
      </div>
      <TextArea id="bulk-vax-notes" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>
          Save {selectedGoatIds.length > 0 ? `(${selectedGoatIds.length} goats)` : ""}
        </Button>
      </div>
    </form>
  );
}

function BulkDewormingForm({ goats, onSuccess, onCancel }: FormProps) {
  const [selectedGoatIds, setSelectedGoatIds] = useState<string[]>([]);
  const [form, setForm] = useState({ productName: "", dateGiven: "", nextDueDate: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGoatIds.length === 0) { setError("Select at least one goat."); return; }
    if (!form.productName || !form.dateGiven) { setError("Product name and date given are required."); return; }
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled(
        selectedGoatIds.map((goatId) =>
          fetch("/api/health/dewormings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, goatId }),
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) throw new Error(`${failed} record(s) failed to save.`);
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
      <GoatCheckboxList goats={goats} selected={selectedGoatIds} onChange={setSelectedGoatIds} />
      <Input id="bulk-dew-product" label="Product Name *" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="e.g. Ivermectin" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="bulk-dew-date" label="Date Given *" type="date" value={form.dateGiven} onChange={(e) => setForm({ ...form, dateGiven: e.target.value })} />
        <Input id="bulk-dew-next" label="Next Due Date" type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
      </div>
      <TextArea id="bulk-dew-notes" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>
          Save {selectedGoatIds.length > 0 ? `(${selectedGoatIds.length} goats)` : ""}
        </Button>
      </div>
    </form>
  );
}
