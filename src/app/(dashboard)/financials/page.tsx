"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import TextArea from "@/components/ui/TextArea";
import { SkeletonTable } from "@/components/ui/Skeleton";
import Skeleton from "@/components/ui/Skeleton";
import { useFarm } from "@/components/providers/FarmProvider";
import { sortByTagThenName } from "@/lib/sortAnimals";

interface AnimalOption { id: string; name: string; tagId: string; gender: string; status: string }

interface Summary {
  totalExpenses: number;
  totalSales: number;
  netIncome: number;
  vetCosts: number;
  byCategory: { category: string; total: number }[];
}

type Tab = "expenses" | "sales";

function formatCurrency(val: number) {
  return `$${val.toFixed(2)}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const categoryLabels: Record<string, string> = {
  FEED: "Feed",
  MEDICAL: "Medical",
  PURCHASE: "Purchase",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

const categoryColors: Record<string, "info" | "error" | "warning" | "success" | "default"> = {
  FEED: "info",
  MEDICAL: "error",
  PURCHASE: "warning",
  EQUIPMENT: "success",
  OTHER: "default",
};

export default function FinancialsPage() {
  const { activeConfig, activeHerd } = useFarm();
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [expenses, setExpenses] = useState<Record<string, unknown>[]>([]);
  const [sales, setSales] = useState<Record<string, unknown>[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [animals, setAnimals] = useState<AnimalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());

  const activeAnimals = useMemo(() => animals.filter((a) => a.status === "ACTIVE"), [animals]);

  const animalLabel = activeConfig?.singular ?? "Animal";

  useEffect(() => {
    const herdParam = activeHerd ? `?herdId=${activeHerd.id}` : "";
    fetch(`/api/animals${herdParam}`).then((r) => r.json()).then((data) => setAnimals(sortByTagThenName(data))).catch(console.error);
    fetch("/api/financials/summary").then((r) => r.json()).then(setSummary).catch(console.error);
  }, [activeHerd]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "expenses") {
        const params = categoryFilter ? `?category=${categoryFilter}` : "";
        const res = await fetch(`/api/financials/expenses${params}`);
        setExpenses(await res.json());
      } else {
        const res = await fetch("/api/financials/sales");
        setSales(await res.json());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeTab, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refreshAll = () => {
    fetchData();
    fetch("/api/financials/summary").then((r) => r.json()).then(setSummary).catch(console.error);
  };

  // Clear selection when tab changes or sales data refreshes
  useEffect(() => { setSelectedSaleIds(new Set()); }, [activeTab, sales]);

  const toggleSaleRow = (id: string) =>
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allSalesSelected = sales.length > 0 && selectedSaleIds.size === sales.length;
  const toggleAllSales = () =>
    setSelectedSaleIds(allSalesSelected ? new Set() : new Set(sales.map((s) => s.id as string)));

  const printSelected = () => {
    const selected = sales.filter((s) => selectedSaleIds.has(s.id as string));
    const rows = selected.map((s) => {
      const animal = s.animal as { name: string; tagId: string; dateOfBirth: string | null };
      const birthdate = animal.dateOfBirth ? formatDate(animal.dateOfBirth) : "—";
      const saleDate = formatDate(s.saleDate as string);
      const amount = formatCurrency(Number(s.salePrice));
      return `<tr>
        <td>${animal.tagId}</td>
        <td>${animal.name}</td>
        <td>${birthdate}</td>
        <td>${saleDate}</td>
        <td style="text-align:right">${amount}</td>
      </tr>`;
    }).join("");
    const total = selected.reduce((sum, s) => sum + Number(s.salePrice), 0);
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Sales Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #000; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .subtitle { color: #555; margin: 0 0 24px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; border-bottom: 2px solid #ccc; padding: 8px 12px; text-align: left; font-size: 13px; }
    td { border-bottom: 1px solid #eee; padding: 8px 12px; font-size: 13px; }
    tfoot td { font-weight: bold; border-top: 2px solid #ccc; border-bottom: none; padding-top: 10px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Sales Report</h1>
  <p class="subtitle">Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
  <table>
    <thead>
      <tr>
        <th>Tag ID</th>
        <th>Name</th>
        <th>Birthdate</th>
        <th>Sale Date</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="4">Total (${selected.length} animal${selected.length !== 1 ? "s" : ""})</td>
        <td style="text-align:right">${formatCurrency(total)}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/financials/expenses/${id}`, { method: "DELETE" });
    refreshAll();
  };

  const handleCancelSale = async (id: string, animalName: string) => {
    if (!confirm(`Cancel the sale of ${animalName} and mark them as active again?`)) return;
    await fetch(`/api/financials/sales/${id}`, { method: "DELETE" });
    refreshAll();
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Financials</h1>
          <p className="mt-1 text-sm text-text-light">Track expenses, sales, and financial reports</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "sales" && selectedSaleIds.size > 0 && (
            <Button variant="outline" onClick={printSelected}>
              🖨 Print {selectedSaleIds.size} Selected
            </Button>
          )}
          {activeTab === "sales" && (
            <Button variant="outline" onClick={() => setShowBulkModal(true)}>+ Bulk Sale</Button>
          )}
          <Button onClick={() => setShowAddModal(true)}>
            + Add {activeTab === "expenses" ? "Expense" : "Sale"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary ? (
          <>
            <SummaryCard label="Total Expenses" value={formatCurrency(summary.totalExpenses)} color="text-error" />
            <SummaryCard label="Total Sales" value={formatCurrency(summary.totalSales)} color="text-success" />
            <SummaryCard label="Net Income" value={formatCurrency(summary.netIncome)} color={summary.netIncome >= 0 ? "text-success" : "text-error"} />
            <SummaryCard label="Vet Costs" value={formatCurrency(summary.vetCosts)} color="text-warning" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        )}
      </div>

      {/* Category Breakdown */}
      {summary && summary.byCategory.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.byCategory.map((c) => (
                <div key={c.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={categoryColors[c.category] || "default"}>{categoryLabels[c.category] || c.category}</Badge>
                  </div>
                  <span className="font-medium text-text">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-lg bg-background p-1">
        <button onClick={() => setActiveTab("expenses")} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === "expenses" ? "bg-surface text-primary shadow-sm" : "text-text-light hover:text-text"}`}>
          Expenses
        </button>
        <button onClick={() => setActiveTab("sales")} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === "sales" ? "bg-surface text-primary shadow-sm" : "text-text-light hover:text-text"}`}>
          Sales
        </button>
      </div>

      {activeTab === "expenses" && (
        <div className="mt-4">
          <Select id="catFilter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))}
            placeholder="All categories" className="sm:w-48" />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading ? <SkeletonTable rows={5} /> : activeTab === "expenses" ? (
          expenses.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-text-light">No expenses found.</div>
          ) : expenses.map((e) => {
            const animal = e.animal as { name: string; tagId: string } | null;
            return (
              <div key={e.id as string} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={categoryColors[e.category as string] || "default"}>{categoryLabels[e.category as string] || (e.category as string)}</Badge>
                    <span className="font-medium text-text">{formatCurrency(Number(e.amount))}</span>
                    {animal && <span className="text-xs text-text-light">{animal.name} #{animal.tagId}</span>}
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-text-light">
                    <span>{formatDate(e.date as string)}</span>
                    {!!e.description && <span>{e.description as string}</span>}
                    {!!e.vendorName && <span>Vendor: {e.vendorName as string}</span>}
                  </div>
                </div>
                <button onClick={() => handleDeleteExpense(e.id as string)} className="ml-4 text-xs text-error hover:underline">Delete</button>
              </div>
            );
          })
        ) : (
          sales.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-text-light">No sales found.</div>
          ) : (
            <>
              {/* Select-all row */}
              <div className="flex items-center gap-3 px-4 py-2">
                <input
                  type="checkbox"
                  checked={allSalesSelected}
                  onChange={toggleAllSales}
                  className="accent-primary h-4 w-4"
                  title="Select all"
                />
                <span className="text-xs text-text-light">
                  {selectedSaleIds.size > 0 ? `${selectedSaleIds.size} selected` : "Select all"}
                </span>
              </div>
              {sales.map((s) => {
                const animal = s.animal as { name: string; tagId: string };
                const isSelected = selectedSaleIds.has(s.id as string);
                return (
                  <div
                    key={s.id as string}
                    onClick={() => toggleSaleRow(s.id as string)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${isSelected ? "border-primary/50 bg-primary/5" : "border-border bg-surface hover:bg-background"}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSaleRow(s.id as string)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-primary h-4 w-4 shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">{animal.name} #{animal.tagId}</span>
                        <span className="font-medium text-success">{formatCurrency(Number(s.salePrice))}</span>
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-text-light">
                        <span>{formatDate(s.saleDate as string)}</span>
                        {!!s.buyerName && <span>Buyer: {s.buyerName as string}</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancelSale(s.id as string, animal.name); }}
                      className="ml-2 shrink-0 text-xs text-error hover:underline"
                    >
                      Cancel Sale
                    </button>
                  </div>
                );
              })}
            </>
          )
        )}
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)}
        title={activeTab === "expenses" ? "Add Expense" : "Record Sale"}
        className="max-w-lg max-h-[90vh] overflow-y-auto">
        {activeTab === "expenses" ? (
          <ExpenseForm animals={animals} animalLabel={animalLabel} onSuccess={() => { setShowAddModal(false); refreshAll(); }} onCancel={() => setShowAddModal(false)} />
        ) : (
          <SaleForm animals={activeAnimals} animalLabel={animalLabel} onSuccess={() => { setShowAddModal(false); refreshAll(); }} onCancel={() => setShowAddModal(false)} />
        )}
      </Modal>

      <Modal open={showBulkModal} onClose={() => setShowBulkModal(false)}
        title="Bulk Record Sales"
        className="max-w-xl max-h-[90vh] overflow-y-auto">
        <BulkSaleForm animals={activeAnimals} animalLabel={animalLabel} animalsLabel={activeConfig?.plural ?? "animals"} onSuccess={() => { setShowBulkModal(false); refreshAll(); }} onCancel={() => setShowBulkModal(false)} />
      </Modal>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-text-light">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

interface FormProps { animals: AnimalOption[]; animalLabel: string; onSuccess: () => void; onCancel: () => void }

function ExpenseForm({ animals, animalLabel, onSuccess, onCancel }: FormProps) {
  const [form, setForm] = useState({ animalId: "", category: "FEED", amount: "", date: "", description: "", vendorName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/financials/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
      onSuccess();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      <Select id="exp-cat" label="Category *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
        options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="exp-amount" label="Amount ($) *" type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <Input id="exp-date" label="Date *" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
      </div>
      <Select id="exp-animal" label={`${animalLabel} (optional)`} value={form.animalId} onChange={(e) => setForm({ ...form, animalId: e.target.value })}
        options={animals.map((a) => ({ value: a.id, label: `${a.name} (#${a.tagId})` }))} placeholder="Herd-wide expense" />
      <Input id="exp-vendor" label="Vendor" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="e.g. Tractor Supply" />
      <TextArea id="exp-desc" label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

function BulkSaleForm({ animals, animalLabel, animalsLabel, onSuccess, onCancel }: FormProps & { animalsLabel: string }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [common, setCommon] = useState({ saleDate: "", buyerName: "", buyerContact: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allSelected = selectedIds.length === animals.length && animals.length > 0;
  const toggleAll = () => {
    const next = allSelected ? [] : animals.map((a) => a.id);
    setSelectedIds(next);
  };
  const toggle = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  const selectedAnimals = animals.filter((a) => selectedIds.includes(a.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) { setError(`Select at least one ${animalLabel.toLowerCase()}.`); return; }
    if (!common.saleDate) { setError("Sale date is required."); return; }
    const missing = selectedAnimals.filter((a) => !prices[a.id] || parseFloat(prices[a.id]) <= 0);
    if (missing.length > 0) {
      setError(`Enter a sale price for: ${missing.map((a) => `${a.name} (#${a.tagId})`).join(", ")}`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled(
        selectedAnimals.map((a) =>
          fetch("/api/financials/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ animalId: a.id, salePrice: prices[a.id], ...common }),
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) throw new Error(`${failed} sale(s) failed to save.`);
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

      {/* Animal selector */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium text-text capitalize">
            {animalsLabel} * <span className="text-text-light">({selectedIds.length} selected)</span>
          </label>
          <button type="button" onClick={toggleAll} className="text-xs font-medium text-primary hover:underline">
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
        <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-surface p-2 space-y-1">
          {animals.length === 0 ? (
            <p className="px-2 py-1 text-sm text-text-light">No active {animalsLabel} found.</p>
          ) : animals.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-background">
              <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={() => toggle(a.id)} className="accent-primary" />
              <span className="text-sm text-text">#{a.tagId}</span>
              <span className="text-sm text-text-light">{a.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Per-animal price inputs */}
      {selectedAnimals.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-text">Sale Prices *</p>
          <div className="space-y-2">
            {selectedAnimals.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm text-text">
                  <span className="font-medium">#{a.tagId}</span>
                  <span className="ml-1 text-text-light">{a.name}</span>
                </span>
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-light">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={prices[a.id] ?? ""}
                    onChange={(e) => setPrices((p) => ({ ...p, [a.id]: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-surface py-2 pl-7 pr-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common fields */}
      <Input id="bulk-sale-date" label="Sale Date *" type="date" value={common.saleDate} onChange={(e) => setCommon({ ...common, saleDate: e.target.value })} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="bulk-sale-buyer" label="Buyer Name" value={common.buyerName} onChange={(e) => setCommon({ ...common, buyerName: e.target.value })} />
        <Input id="bulk-sale-contact" label="Buyer Contact" value={common.buyerContact} onChange={(e) => setCommon({ ...common, buyerContact: e.target.value })} />
      </div>
      <TextArea id="bulk-sale-notes" label="Notes" value={common.notes} onChange={(e) => setCommon({ ...common, notes: e.target.value })} rows={2} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>
          Record {selectedIds.length > 0 ? `${selectedIds.length} Sale${selectedIds.length !== 1 ? "s" : ""}` : "Sales"}
        </Button>
      </div>
    </form>
  );
}

function SaleForm({ animals, animalLabel, onSuccess, onCancel }: FormProps) {
  const [form, setForm] = useState({ animalId: "", saleDate: "", salePrice: "", buyerName: "", buyerContact: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/financials/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
      onSuccess();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      <Select id="sale-animal" label={`${animalLabel} *`} value={form.animalId} onChange={(e) => setForm({ ...form, animalId: e.target.value })}
        options={animals.map((a) => ({ value: a.id, label: `${a.name} (#${a.tagId})` }))} placeholder={`Select ${animalLabel.toLowerCase()}`} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="sale-price" label="Sale Price ($) *" type="number" step="0.01" min="0" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} required />
        <Input id="sale-date" label="Sale Date *" type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="sale-buyer" label="Buyer Name" value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} />
        <Input id="sale-contact" label="Buyer Contact" value={form.buyerContact} onChange={(e) => setForm({ ...form, buyerContact: e.target.value })} />
      </div>
      <TextArea id="sale-notes" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Record Sale</Button>
      </div>
    </form>
  );
}
