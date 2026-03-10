"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import SearchInput from "@/components/forms/SearchInput";
import GoatForm, { type GoatFormData } from "@/components/forms/GoatForm";
import Table from "@/components/ui/Table";
import { SkeletonTable } from "@/components/ui/Skeleton";

interface Goat {
  id: string;
  name: string;
  tagId: string;
  breed: string | null;
  dateOfBirth: string | null;
  gender: string;
  status: string;
  photoUrl: string | null;
  dam: { id: string; name: string; tagId: string } | null;
  sire: { id: string; name: string; tagId: string } | null;
}

const statusColors: Record<string, "success" | "warning" | "error"> = {
  ACTIVE: "success",
  SOLD: "warning",
  DECEASED: "error",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HerdPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [goats, setGoats] = useState<Goat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "");
  const [genderFilter, setGenderFilter] = useState(searchParams.get("gender") ?? "");
  const [bornThisYear, setBornThisYear] = useState(searchParams.get("bornThisYear") === "true");
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchGoats = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (genderFilter) params.set("gender", genderFilter);
    if (bornThisYear) params.set("bornThisYear", "true");

    try {
      const res = await fetch(`/api/goats?${params}`);
      const data = await res.json();
      setGoats(data);
    } catch (error) {
      console.error("Failed to fetch goats:", error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, genderFilter, bornThisYear]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchGoats, 300);
    return () => clearTimeout(timer);
  }, [fetchGoats]);

  const handleCreate = async (data: GoatFormData) => {
    const res = await fetch("/api/goats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }

    setShowAddModal(false);
    fetchGoats();
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (goat: Goat) => (
        <div className="flex items-center gap-3">
          {goat.photoUrl ? (
            <Image
              src={goat.photoUrl}
              alt={goat.name}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {goat.name[0]}
            </div>
          )}
          <div>
            <span className="font-medium text-text">{goat.name}</span>
            <span className="ml-2 text-xs text-text-light">#{goat.tagId}</span>
          </div>
        </div>
      ),
    },
    {
      key: "breed",
      header: "Breed",
      render: (goat: Goat) => goat.breed || "—",
    },
    {
      key: "gender",
      header: "Gender",
      render: (goat: Goat) => (
        <Badge variant={goat.gender === "DOE" ? "success" : "info"}>
          {goat.gender}
        </Badge>
      ),
    },
    {
      key: "dateOfBirth",
      header: "DOB",
      render: (goat: Goat) => formatDate(goat.dateOfBirth),
      className: "hidden sm:table-cell",
    },
    {
      key: "status",
      header: "Status",
      render: (goat: Goat) => (
        <Badge variant={statusColors[goat.status] || "default"}>
          {goat.status}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Herd</h1>
          <p className="mt-1 text-sm text-text-light">
            {goats.length} goat{goats.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>+ Add Goat</Button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, tag, or breed..."
          className="w-full sm:w-64"
        />
        <Select
          id="statusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "SOLD", label: "Sold" },
            { value: "DECEASED", label: "Deceased" },
          ]}
          placeholder="All statuses"
          className="w-40"
        />
        <Select
          id="genderFilter"
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          options={[
            { value: "DOE", label: "Does" },
            { value: "BUCK", label: "Bucks" },
            { value: "WETHER", label: "Wethers" },
          ]}
          placeholder="All genders"
          className="w-40"
        />
        {bornThisYear && (
          <button
            onClick={() => setBornThisYear(false)}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
          >
            🍼 Born This Year <span className="ml-1 text-xs">✕</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="mt-4">
        {loading ? (
          <SkeletonTable rows={8} />
        ) : (
          <Table
            columns={columns}
            data={goats}
            keyField="id"
            onRowClick={(goat) => router.push(`/herd/${goat.id}`)}
            emptyMessage="No goats found. Add your first goat to get started!"
          />
        )}
      </div>

      {/* Add Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Goat"
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <GoatForm
          onSubmit={handleCreate}
          onCancel={() => setShowAddModal(false)}
          submitLabel="Add Goat"
        />
      </Modal>
    </div>
  );
}
