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

interface GoatOption { id: string; name: string; tagId: string; gender: string; status: string }

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
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [expenses, setExpenses] = useState<Record<string, unknown>[]>([]);
  const [sales, setSales] = useState<Record<string, unknown>[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [goats, setGoats] = useState<GoatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");

  const activeGoats = useMemo(() => goats.filter((g) => g.status === "ACTIVE"), [goats]);

  useEffect(() => {
    fetch("/api/goats").then((r) => r.json()).then(setGoats).catch(console.error);
    fetch("/api/financials/summary").then((r) => r.json()).then(setSummary).catch(console.error);
  }, []);

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

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/financials/expenses/${id}`, { method: "DELETE" });
    refreshAll();
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Financials</h1>
          <p className="mt-1 text-sm text-text-light">Track expenses, sales, and financial reports</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          + Add {activeTab === "expenses" ? "Expense" : "Sale"}
        </Button>
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
            const goat = e.goat as { name: string; tagId: string } | null;
            return (
              <div key={e.id as string} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={categoryColors[e.category as string] || "default"}>{categoryLabels[e.category as string] || (e.category as string)}</Badge>
                    <span className="font-medium text-text">{formatCurrency(Number(e.amount))}</span>
                    {goat && <span className="text-xs text-text-light">{goat.name} #{goat.tagId}</span>}
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
          ) : sales.map((s) => {
            const goat = s.goat as { name: string; tagId: string };
            return (
              <div key={s.id as string} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">{goat.name} #{goat.tagId}</span>
                    <span className="font-medium text-success">{formatCurrency(Number(s.salePrice))}</span>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-text-light">
                    <span>{formatDate(s.saleDate as string)}</span>
                    {!!s.buyerName && <span>Buyer: {s.buyerName as string}</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)}
        title={activeTab === "expenses" ? "Add Expense" : "Record Sale"}
        className="max-w-lg max-h-[90vh] overflow-y-auto">
        {activeTab === "expenses" ? (
          <ExpenseForm goats={goats} onSuccess={() => { setShowAddModal(false); refreshAll(); }} onCancel={() => setShowAddModal(false)} />
        ) : (
          <SaleForm goats={activeGoats} onSuccess={() => { setShowAddModal(false); refreshAll(); }} onCancel={() => setShowAddModal(false)} />
        )}
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

interface FormProps { goats: GoatOption[]; onSuccess: () => void; onCancel: () => void }

function ExpenseForm({ goats, onSuccess, onCancel }: FormProps) {
  const [form, setForm] = useState({ goatId: "", category: "FEED", amount: "", date: "", description: "", vendorName: "" });
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
      <Select id="exp-goat" label="Goat (optional)" value={form.goatId} onChange={(e) => setForm({ ...form, goatId: e.target.value })}
        options={goats.map((g) => ({ value: g.id, label: `${g.name} (#${g.tagId})` }))} placeholder="Herd-wide expense" />
      <Input id="exp-vendor" label="Vendor" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="e.g. Tractor Supply" />
      <TextArea id="exp-desc" label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

function SaleForm({ goats, onSuccess, onCancel }: FormProps) {
  const [form, setForm] = useState({ goatId: "", saleDate: "", salePrice: "", buyerName: "", buyerContact: "", notes: "" });
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
      <Select id="sale-goat" label="Goat *" value={form.goatId} onChange={(e) => setForm({ ...form, goatId: e.target.value })}
        options={goats.map((g) => ({ value: g.id, label: `${g.name} (#${g.tagId})` }))} placeholder="Select goat" />
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
