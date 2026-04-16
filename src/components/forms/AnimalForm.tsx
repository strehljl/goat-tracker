"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import TextArea from "@/components/ui/TextArea";
import { AnimalConfig } from "@/lib/animalConfig";

interface AnimalOption {
  id: string;
  name: string;
  tagId: string;
  gender: string;
}

interface LocationOption {
  id: string;
  name: string;
}

export interface AnimalFormData {
  name: string;
  tagId: string;
  breed: string;
  dateOfBirth: string;
  gender: string;
  colorMarkings: string;
  photoUrl: string;
  purchaseDate: string;
  purchasePrice: string;
  damId: string;
  sireId: string;
  locationId: string;
  status: string;
  notes: string;
}

interface AnimalFormProps {
  config: AnimalConfig;
  herdId?: string;
  initialData?: Partial<AnimalFormData>;
  onSubmit: (data: AnimalFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "SOLD", label: "Sold" },
  { value: "DECEASED", label: "Deceased" },
];

const emptyForm: AnimalFormData = {
  name: "",
  tagId: "",
  breed: "",
  dateOfBirth: "",
  gender: "",
  colorMarkings: "",
  photoUrl: "",
  purchaseDate: "",
  purchasePrice: "",
  damId: "",
  sireId: "",
  locationId: "",
  status: "ACTIVE",
  notes: "",
};

export default function AnimalForm({
  config,
  herdId,
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: AnimalFormProps) {
  const [form, setForm] = useState<AnimalFormData>({ ...emptyForm, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [females, setFemales] = useState<AnimalOption[]>([]);
  const [males, setMales] = useState<AnimalOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);

  const genderOptions = [
    { value: "FEMALE", label: config.genderLabels.FEMALE },
    { value: "MALE", label: config.genderLabels.MALE },
    { value: "NEUTERED_MALE", label: config.genderLabels.NEUTERED_MALE },
  ];

  useEffect(() => {
    const herdParam = herdId ? `&herdId=${herdId}` : "";
    Promise.all([
      fetch(`/api/animals?gender=FEMALE${herdParam}`).then((r) => r.json()),
      fetch(`/api/animals?gender=MALE${herdParam}`).then((r) => r.json()),
      fetch("/api/farms/current/locations").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([f, m, locs]: [AnimalOption[], AnimalOption[], LocationOption[]]) => {
        setFemales(f);
        setMales(m);
        setLocationOptions(Array.isArray(locs) ? locs : []);
      })
      .catch(console.error);
  }, [herdId]);

  const set = (field: keyof AnimalFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.tagId.trim()) errs.tagId = "Tag ID is required";
    if (!form.gender) errs.gender = "Gender is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/animals/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        set("photoUrl", data.url);
        setErrors((prev) => { const next = { ...prev }; delete next.photo; return next; });
      } else {
        setErrors((prev) => ({ ...prev, photo: data.error }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, photo: "Upload failed" }));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit(form);
    } catch {
      setErrors({ form: `Failed to save ${config.singular}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form && (
        <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {errors.form}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="name"
          label="Name *"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
          placeholder={`e.g. Daisy`}
        />
        <Input
          id="tagId"
          label="Tag ID *"
          value={form.tagId}
          onChange={(e) => set("tagId", e.target.value)}
          error={errors.tagId}
          placeholder={config.tagIdPlaceholder}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="gender"
          label="Gender *"
          value={form.gender}
          onChange={(e) => set("gender", e.target.value)}
          options={genderOptions}
          placeholder="Select gender"
          error={errors.gender}
        />
        <Input
          id="breed"
          label="Breed"
          value={form.breed}
          onChange={(e) => set("breed", e.target.value)}
          placeholder={config.breedPlaceholder}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="dateOfBirth"
          label="Date of Birth"
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => set("dateOfBirth", e.target.value)}
        />
        <Input
          id="colorMarkings"
          label="Color/Markings"
          value={form.colorMarkings}
          onChange={(e) => set("colorMarkings", e.target.value)}
          placeholder="e.g. Brown with white spots"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="purchaseDate"
          label="Purchase Date"
          type="date"
          value={form.purchaseDate}
          onChange={(e) => set("purchaseDate", e.target.value)}
        />
        <Input
          id="purchasePrice"
          label="Purchase Price ($)"
          type="number"
          step="0.01"
          min="0"
          value={form.purchasePrice}
          onChange={(e) => set("purchasePrice", e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="damId"
          label={`${config.breedingTerms.femaleRole} (Mother)`}
          value={form.damId}
          onChange={(e) => set("damId", e.target.value)}
          options={females.map((f) => ({ value: f.id, label: `${f.name} (${f.tagId})` }))}
          placeholder={`Select ${config.breedingTerms.femaleRole.toLowerCase()}`}
        />
        <Select
          id="sireId"
          label={`${config.breedingTerms.maleRole} (Father)`}
          value={form.sireId}
          onChange={(e) => set("sireId", e.target.value)}
          options={males.map((m) => ({ value: m.id, label: `${m.name} (${m.tagId})` }))}
          placeholder={`Select ${config.breedingTerms.maleRole.toLowerCase()}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="locationId"
          label="Location"
          value={form.locationId}
          onChange={(e) => set("locationId", e.target.value)}
          options={locationOptions.map((l) => ({ value: l.id, label: l.name }))}
          placeholder="No location"
        />
        <Select
          id="status"
          label="Status"
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
          options={statusOptions}
        />
      </div>

      {/* Photo upload */}
      <div>
        <label className="mb-1 block text-sm font-medium text-text">Photo</label>
        <div className="flex items-center gap-4">
          {form.photoUrl && (
            <img
              src={form.photoUrl}
              alt={`${config.singularCapitalized} photo`}
              className="h-20 w-20 rounded-lg object-cover border border-border"
            />
          )}
          <div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhoto}
              className="text-sm text-text-light file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-white file:cursor-pointer hover:file:bg-primary-dark"
              disabled={uploading}
            />
            {uploading && (
              <p className="mt-1 text-xs text-text-light">Uploading...</p>
            )}
            {errors.photo && (
              <p className="mt-1 text-xs text-error">{errors.photo}</p>
            )}
          </div>
        </div>
      </div>

      <TextArea
        id="notes"
        label="Notes"
        value={form.notes}
        onChange={(e) => set("notes", e.target.value)}
        placeholder="Any additional notes..."
        rows={3}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
