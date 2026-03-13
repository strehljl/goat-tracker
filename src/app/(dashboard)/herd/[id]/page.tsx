"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import GoatForm, { type GoatFormData } from "@/components/forms/GoatForm";
import Skeleton from "@/components/ui/Skeleton";

interface GoatDetail {
  id: string;
  name: string;
  tagId: string;
  breed: string | null;
  dateOfBirth: string | null;
  gender: string;
  colorMarkings: string | null;
  photoUrl: string | null;
  purchaseDate: string | null;
  purchasePrice: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  location: { id: string; name: string } | null;
  dam: { id: string; name: string; tagId: string; photoUrl: string | null } | null;
  sire: { id: string; name: string; tagId: string; photoUrl: string | null } | null;
  damOffspring: { id: string; name: string; tagId: string; gender: string; dateOfBirth: string | null; status: string; photoUrl: string | null }[];
  sireOffspring: { id: string; name: string; tagId: string; gender: string; dateOfBirth: string | null; status: string; photoUrl: string | null }[];
  vaccinations: { id: string; name: string; dateGiven: string; nextDueDate: string | null }[];
  medications: { id: string; name: string; dosage: string | null; startDate: string; endDate: string | null }[];
  vetVisits: { id: string; date: string; reason: string; cost: string | null }[];
  dewormings: { id: string; productName: string; dateGiven: string; nextDueDate: string | null }[];
  healthNotes: { id: string; date: string; note: string }[];
  expenses: { id: string; category: string; amount: string; date: string; description: string | null }[];
  sale: { saleDate: string; salePrice: string; buyerName: string | null } | null;
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

function formatCurrency(val: string | null) {
  if (!val) return "—";
  return `$${parseFloat(val).toFixed(2)}`;
}

export default function GoatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [goat, setGoat] = useState<GoatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchGoat = async () => {
    try {
      const res = await fetch(`/api/goats/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setGoat(data);
    } catch {
      setGoat(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = async (data: GoatFormData) => {
    const res = await fetch(`/api/goats/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    setShowEditModal(false);
    fetchGoat();
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this goat? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/goats/${id}`, { method: "DELETE" });
      router.push("/herd");
    } catch {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!goat) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text">Goat Not Found</h1>
        <p className="mt-2 text-text-light">This goat doesn&apos;t exist or has been deleted.</p>
        <Link href="/herd" className="mt-4 inline-block text-primary hover:underline">
          Back to Herd
        </Link>
      </div>
    );
  }

  const offspringMap = new Map([...goat.damOffspring, ...goat.sireOffspring].map((k) => [k.id, k]));
  const offspring = Array.from(offspringMap.values());

  const editInitialData = {
    name: goat.name,
    tagId: goat.tagId,
    breed: goat.breed || "",
    dateOfBirth: goat.dateOfBirth ? goat.dateOfBirth.split("T")[0] : "",
    gender: goat.gender,
    colorMarkings: goat.colorMarkings || "",
    photoUrl: goat.photoUrl || "",
    purchaseDate: goat.purchaseDate ? goat.purchaseDate.split("T")[0] : "",
    purchasePrice: goat.purchasePrice || "",
    damId: goat.dam?.id || "",
    sireId: goat.sire?.id || "",
    locationId: goat.location?.id || "",
    status: goat.status,
    notes: goat.notes || "",
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {goat.photoUrl ? (
            <Image
              src={goat.photoUrl}
              alt={goat.name}
              width={80}
              height={80}
              className="h-20 w-20 rounded-xl object-cover border border-border"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
              {goat.name[0]}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text">{goat.name}</h1>
              <Badge variant={statusColors[goat.status] || "default"}>
                {goat.status}
              </Badge>
            </div>
            <p className="text-sm text-text-light">Tag: #{goat.tagId}</p>
            {goat.breed && <p className="text-sm text-text-light">{goat.breed}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/herd">
            <Button variant="outline" size="sm">Back</Button>
          </Link>
          <Button size="sm" onClick={() => setShowEditModal(true)}>Edit</Button>
          <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <DetailRow label="Gender" value={goat.gender} />
              <DetailRow label="Location" value={goat.location?.name || "—"} />
              <DetailRow label="Date of Birth" value={formatDate(goat.dateOfBirth)} />
              <DetailRow label="Color/Markings" value={goat.colorMarkings || "—"} />
              <DetailRow label="Purchase Date" value={formatDate(goat.purchaseDate)} />
              <DetailRow label="Purchase Price" value={formatCurrency(goat.purchasePrice)} />
              <DetailRow label="Added" value={formatDate(goat.createdAt)} />
              {goat.notes && <DetailRow label="Notes" value={goat.notes} />}
            </dl>
          </CardContent>
        </Card>

        {/* Lineage Card */}
        <Card>
          <CardHeader>
            <CardTitle>Lineage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase text-text-light">Dam (Mother)</p>
                {goat.dam ? (
                  <Link href={`/herd/${goat.dam.id}`} className="text-primary hover:underline">
                    {goat.dam.name} (#{goat.dam.tagId})
                  </Link>
                ) : (
                  <p className="text-sm text-text-light">Unknown</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-text-light">Sire (Father)</p>
                {goat.sire ? (
                  <Link href={`/herd/${goat.sire.id}`} className="text-primary hover:underline">
                    {goat.sire.name} (#{goat.sire.tagId})
                  </Link>
                ) : (
                  <p className="text-sm text-text-light">Unknown</p>
                )}
              </div>
              {offspring.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase text-text-light mb-2">Offspring</p>
                  <ul className="space-y-1">
                    {offspring.map((kid) => (
                      <li key={kid.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                        <Link href={`/herd/${kid.id}`} className="text-sm text-primary hover:underline">
                          {kid.name} (#{kid.tagId})
                        </Link>
                        <div className="flex items-center gap-2">
                          <Badge variant={kid.gender === "DOE" ? "success" : "info"}>
                            {kid.gender}
                          </Badge>
                          <Badge variant={statusColors[kid.status] || "default"}>
                            {kid.status}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Health Records</CardTitle>
            <Link href="/health" className="text-sm text-primary hover:text-primary-dark">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {goat.vaccinations.length === 0 && goat.dewormings.length === 0 && goat.vetVisits.length === 0 ? (
              <p className="text-sm text-text-light">No health records yet.</p>
            ) : (
              <ul className="space-y-2">
                {goat.vaccinations.map((v) => (
                  <li key={v.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                    <div>
                      <Badge variant="info" className="mr-2">Vaccine</Badge>
                      <span className="text-sm text-text">{v.name}</span>
                    </div>
                    <span className="text-xs text-text-light">{formatDate(v.dateGiven)}</span>
                  </li>
                ))}
                {goat.dewormings.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                    <div>
                      <Badge variant="warning" className="mr-2">Dewormer</Badge>
                      <span className="text-sm text-text">{d.productName}</span>
                    </div>
                    <span className="text-xs text-text-light">{formatDate(d.dateGiven)}</span>
                  </li>
                ))}
                {goat.vetVisits.map((v) => (
                  <li key={v.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                    <div>
                      <Badge variant="error" className="mr-2">Vet</Badge>
                      <span className="text-sm text-text">{v.reason}</span>
                    </div>
                    <span className="text-xs text-text-light">{formatDate(v.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Sale Info (if sold) */}
        {goat.sale && (
          <Card>
            <CardHeader>
              <CardTitle>Sale Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <DetailRow label="Sale Date" value={formatDate(goat.sale.saleDate)} />
                <DetailRow label="Sale Price" value={formatCurrency(goat.sale.salePrice)} />
                <DetailRow label="Buyer" value={goat.sale.buyerName || "—"} />
              </dl>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Family Tree */}
      {(goat.dam || goat.sire || offspring.length > 0) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Family Tree</CardTitle>
          </CardHeader>
          <CardContent>
            <FamilyTree goat={goat} offspring={offspring} />
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit ${goat.name}`}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <GoatForm
          initialData={editInitialData}
          onSubmit={handleUpdate}
          onCancel={() => setShowEditModal(false)}
          submitLabel="Save Changes"
        />
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sm text-text-light">{label}</dt>
      <dd className="text-sm font-medium text-text">{value}</dd>
    </div>
  );
}

// === Family Tree ===

interface TreeNode {
  id: string;
  name: string;
  tagId: string;
  gender?: string;
  status?: string;
  photoUrl?: string | null;
  isCurrent?: boolean;
}

function TreeCard({ node }: { node: TreeNode }) {
  const content = (
    <div
      className={`rounded-xl border px-3 py-2 text-center text-sm transition-shadow ${
        node.isCurrent
          ? "border-primary bg-primary text-white shadow-md"
          : "border-border bg-surface text-text hover:shadow-sm hover:border-primary/40"
      }`}
    >
      {node.photoUrl ? (
        <Image
          src={node.photoUrl}
          alt={node.name}
          width={48}
          height={48}
          className="mx-auto mb-1.5 h-12 w-12 rounded-full object-cover border-2 border-white/30"
        />
      ) : (
        <div className={`mx-auto mb-1.5 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
          node.isCurrent ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
        }`}>
          {node.name[0]}
        </div>
      )}
      <p className="font-semibold leading-tight truncate max-w-[120px]">{node.name}</p>
      <p className={`text-xs mt-0.5 truncate max-w-[120px] ${node.isCurrent ? "text-white/70" : "text-text-light"}`}>
        #{node.tagId}
      </p>
      {node.gender && !node.isCurrent && (
        <p className={`text-xs mt-0.5 ${node.gender === "DOE" ? "text-primary" : "text-accent"}`}>
          {node.gender}
        </p>
      )}
    </div>
  );

  if (node.isCurrent) return content;
  return <Link href={`/herd/${node.id}`}>{content}</Link>;
}

function FamilyTree({
  goat,
  offspring,
}: {
  goat: GoatDetail;
  offspring: { id: string; name: string; tagId: string; gender: string; dateOfBirth: string | null; status: string; photoUrl: string | null }[];
}) {
  const hasParents = goat.dam || goat.sire;
  const hasOffspring = offspring.length > 0;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[320px] flex flex-col items-center gap-0">

        {/* Parents row */}
        {hasParents && (
          <>
            <div className="flex w-full justify-center gap-6">
              <div className="flex flex-col items-center gap-1 w-36">
                <span className="text-xs font-medium uppercase text-text-light tracking-wide">Dam</span>
                {goat.dam ? (
                  <TreeCard node={goat.dam} />
                ) : (
                  <div className="rounded-xl border border-dashed border-border px-3 py-2 text-center w-full">
                    <p className="text-xs text-text-light">Unknown</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-1 w-36">
                <span className="text-xs font-medium uppercase text-text-light tracking-wide">Sire</span>
                {goat.sire ? (
                  <TreeCard node={goat.sire} />
                ) : (
                  <div className="rounded-xl border border-dashed border-border px-3 py-2 text-center w-full">
                    <p className="text-xs text-text-light">Unknown</p>
                  </div>
                )}
              </div>
            </div>
            {/* Connector: left/right verticals meet horizontal bar, center vertical continues down */}
            <div className="relative w-full" style={{ height: "2.5rem" }}>
              <div className="absolute w-px bg-border" style={{ left: "calc(50% - 84px)", top: 0, height: "50%" }} />
              <div className="absolute w-px bg-border" style={{ right: "calc(50% - 84px)", top: 0, height: "50%" }} />
              <div className="absolute border-t border-border" style={{ left: "calc(50% - 84px)", right: "calc(50% - 84px)", top: "50%" }} />
              <div className="absolute w-px bg-border" style={{ left: "calc(50% - 0.5px)", top: "50%", bottom: 0 }} />
            </div>
          </>
        )}

        {/* Current goat */}
        <div className="flex flex-col items-center gap-1">
          {hasParents && <div className="w-px bg-border h-2" />}
          <TreeCard node={{ ...goat, isCurrent: true }} />
        </div>

        {/* Connector down to offspring */}
        {hasOffspring && (
          <>
            <div className="w-px bg-border h-6" />
            <div className="flex w-full justify-center">
              {offspring.length > 1 && (
                <div
                  className="border-t border-border"
                  style={{
                    width: `${Math.min(offspring.length, 5) * 160}px`,
                    maxWidth: "90%",
                  }}
                />
              )}
            </div>
            {/* Offspring row */}
            <div className="flex flex-wrap justify-center gap-4 mt-0">
              {offspring.map((kid) => (
                <div key={kid.id} className="flex flex-col items-center gap-1">
                  <div className="w-px bg-border h-4" />
                  <TreeCard node={kid} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-light text-center">
              {offspring.length} offspring
            </p>
          </>
        )}
      </div>
    </div>
  );
}
