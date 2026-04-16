"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import SearchInput from "@/components/forms/SearchInput";
import AnimalForm, { type AnimalFormData } from "@/components/forms/AnimalForm";
import Table from "@/components/ui/Table";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useFarm } from "@/components/providers/FarmProvider";

interface Animal {
  id: string;
  name: string;
  tagId: string;
  breed: string | null;
  dateOfBirth: string | null;
  gender: string;
  status: string;
  photoUrl: string | null;
  location: { id: string; name: string } | null;
  sale: { saleDate: string } | null;
  dam: { id: string; name: string; tagId: string } | null;
  sire: { id: string; name: string; tagId: string } | null;
}

interface LocationOption {
  id: string;
  name: string;
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
    timeZone: "UTC",
  });
}

export default function HerdPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeConfig, activeHerd } = useFarm();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "");
  const [genderFilter, setGenderFilter] = useState(searchParams.get("gender") ?? "");
  const [locationFilter, setLocationFilter] = useState(searchParams.get("locationId") ?? "");
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [bornThisYear, setBornThisYear] = useState(searchParams.get("bornThisYear") === "true");
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortField, setSortField] = useState("tagId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchAnimals = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (genderFilter) params.set("gender", genderFilter);
    if (locationFilter) params.set("locationId", locationFilter);
    if (bornThisYear) params.set("bornThisYear", "true");
    if (activeHerd?.id) params.set("herdId", activeHerd.id);

    try {
      const res = await fetch(`/api/animals?${params}`);
      const data = await res.json();
      setAnimals(data);
    } catch (error) {
      console.error("Failed to fetch animals:", error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, genderFilter, locationFilter, bornThisYear, activeHerd?.id]);

  useEffect(() => {
    fetch("/api/farms/current/locations")
      .then((r) => r.ok ? r.json() : [])
      .then((locs: LocationOption[]) => setLocationOptions(Array.isArray(locs) ? locs : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchAnimals, 300);
    return () => clearTimeout(timer);
  }, [fetchAnimals]);

  const handleCreate = async (data: AnimalFormData) => {
    const res = await fetch("/api/animals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, herdId: activeHerd?.id ?? null }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }

    setShowAddModal(false);
    fetchAnimals();
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedAnimals = useMemo(() => {
    return [...animals].sort((a, b) => {
      let va: string | null = null;
      let vb: string | null = null;
      if (sortField === "name") { va = a.name; vb = b.name; }
      else if (sortField === "tagId") { va = a.tagId; vb = b.tagId; }
      else if (sortField === "breed") { va = a.breed; vb = b.breed; }
      else if (sortField === "gender") { va = a.gender; vb = b.gender; }
      else if (sortField === "dateOfBirth") { va = a.dateOfBirth; vb = b.dateOfBirth; }
      else if (sortField === "status") { va = a.status; vb = b.status; }
      else if (sortField === "location") { va = a.location?.name ?? null; vb = b.location?.name ?? null; }
      else if (sortField === "saleDate") { va = a.sale?.saleDate ?? null; vb = b.sale?.saleDate ?? null; }

      if (va == null && vb == null) return 0;
      if (va == null) return sortDir === "asc" ? 1 : -1;
      if (vb == null) return sortDir === "asc" ? -1 : 1;
      let cmp: number;
      if (sortField === "tagId" && /^\d+$/.test(va) && /^\d+$/.test(vb)) {
        cmp = Number(va) - Number(vb);
      } else {
        cmp = va.localeCompare(vb, undefined, { numeric: true, sensitivity: "base" });
      }
      if (cmp !== 0) return sortDir === "asc" ? cmp : -cmp;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [animals, sortField, sortDir]);

  const genderLabel = (gender: string) =>
    activeConfig?.genderLabels[gender as "FEMALE" | "MALE" | "NEUTERED_MALE"] ?? gender;

  const columns = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (animal: Animal) => (
        <div className="flex items-center gap-3">
          {animal.photoUrl ? (
            <Image
              src={animal.photoUrl}
              alt={animal.name}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {animal.name[0]}
            </div>
          )}
          <span className="font-medium text-text">{animal.name}</span>
        </div>
      ),
    },
    {
      key: "tagId",
      header: "Tag ID",
      sortable: true,
      render: (animal: Animal) => <span className="text-text-light">#{animal.tagId}</span>,
    },
    {
      key: "location",
      header: "Location",
      sortable: true,
      render: (animal: Animal) => animal.location?.name ?? "—",
      className: "hidden sm:table-cell",
    },
    {
      key: "breed",
      header: "Breed",
      sortable: true,
      render: (animal: Animal) => animal.breed || "—",
    },
    {
      key: "gender",
      header: "Gender",
      sortable: true,
      render: (animal: Animal) => (
        <Badge variant={animal.gender === "FEMALE" ? "success" : "info"}>
          {genderLabel(animal.gender)}
        </Badge>
      ),
    },
    {
      key: "dateOfBirth",
      header: "DOB",
      sortable: true,
      render: (animal: Animal) => formatDate(animal.dateOfBirth),
      className: "hidden sm:table-cell",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (animal: Animal) => (
        <Badge variant={statusColors[animal.status] || "default"}>
          {animal.status}
        </Badge>
      ),
    },
    ...(statusFilter === "SOLD"
      ? [
          {
            key: "saleDate",
            header: "Sold Date",
            sortable: true,
            render: (animal: Animal) => formatDate(animal.sale?.saleDate ?? null),
          },
        ]
      : []),
  ];

  const singularLabel = activeConfig?.singularCapitalized ?? "Animal";
  const pluralLabel = activeConfig?.pluralCapitalized ?? "Animals";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Herd</h1>
          <p className="mt-1 text-sm text-text-light">
            {animals.length} {animals.length !== 1 ? activeConfig?.plural ?? "animals" : activeConfig?.singular ?? "animal"} registered
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>+ Add {singularLabel}</Button>
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
          options={activeConfig
            ? [
                { value: "FEMALE", label: activeConfig.genderLabels.FEMALE + "s" },
                { value: "MALE", label: activeConfig.genderLabels.MALE + "s" },
                { value: "NEUTERED_MALE", label: activeConfig.genderLabels.NEUTERED_MALE + "s" },
              ]
            : [
                { value: "FEMALE", label: "Females" },
                { value: "MALE", label: "Males" },
                { value: "NEUTERED_MALE", label: "Neutered" },
              ]
          }
          placeholder="All genders"
          className="w-40"
        />
        {locationOptions.length > 0 && (
          <Select
            id="locationFilter"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            options={locationOptions.map((l) => ({ value: l.id, label: l.name }))}
            placeholder="All locations"
            className="w-40"
          />
        )}
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
            data={sortedAnimals}
            keyField="id"
            onRowClick={(animal) => router.push(`/herd/${animal.id}`)}
            emptyMessage={`No ${activeConfig?.plural ?? "animals"} found. Add your first ${activeConfig?.singular ?? "animal"} to get started!`}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
          />
        )}
      </div>

      {/* Add Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add New ${singularLabel}`}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {activeConfig && (
          <AnimalForm
            config={activeConfig}
            herdId={activeHerd?.id}
            onSubmit={handleCreate}
            onCancel={() => setShowAddModal(false)}
            submitLabel={`Add ${singularLabel}`}
          />
        )}
      </Modal>
    </div>
  );
}
