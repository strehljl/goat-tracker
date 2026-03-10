"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useFarm } from "@/components/providers/FarmProvider";

type Member = { id: string; name: string | null; email: string | null; isOwner: boolean };
type FarmDetail = { id: string; name: string; imageUrl: string | null; joinCode: string; isOwner: boolean; members: Member[] };

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { farms, refreshFarms, switchFarm } = useFarm();

  const [details, setDetails] = useState<Record<string, FarmDetail>>({});
  const [newFarmName, setNewFarmName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [editName, setEditName] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [uploadingImg, setUploadingImg] = useState<Record<string, boolean>>({});
  const imgInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadDetails = useCallback(async () => {
    await Promise.all(
      farms.map(async (farm) => {
        const res = await fetch("/api/farms/" + farm.id);
        if (res.ok) {
          const data = await res.json();
          setDetails((prev) => ({ ...prev, [farm.id]: data }));
        }
      })
    );
  }, [farms]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  async function createFarm(e: React.FormEvent) {
    e.preventDefault();
    if (!newFarmName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFarmName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create farm");
        return;
      }
      setNewFarmName("");
      await refreshFarms();
      await switchFarm(data.id);
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function renameFarm(farmId: string) {
    const name = editName[farmId]?.trim();
    if (!name) return;
    setSaving((p) => ({ ...p, [farmId]: true }));
    const res = await fetch("/api/farms/" + farmId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setDetails((p) => ({ ...p, [farmId]: { ...p[farmId], name } }));
      setEditName((p) => { const n = { ...p }; delete n[farmId]; return n; });
      await refreshFarms();
      router.refresh();
    }
    setSaving((p) => ({ ...p, [farmId]: false }));
  }

  async function regenerateCode(farmId: string) {
    const res = await fetch("/api/farms/" + farmId + "/regenerate-code", { method: "POST" });
    if (res.ok) {
      const { joinCode } = await res.json();
      setDetails((p) => ({ ...p, [farmId]: { ...p[farmId], joinCode } }));
    }
  }

  async function removeMember(farmId: string, userId: string) {
    const res = await fetch("/api/farms/" + farmId + "/members/" + userId, { method: "DELETE" });
    if (res.ok) {
      setDetails((p) => ({
        ...p,
        [farmId]: { ...p[farmId], members: p[farmId].members.filter((m) => m.id !== userId) },
      }));
    }
  }

  async function leaveFarm(farmId: string) {
    if (!currentUserId) return;
    const res = await fetch("/api/farms/" + farmId + "/members/" + currentUserId, { method: "DELETE" });
    if (res.ok) {
      await refreshFarms();
      router.refresh();
    }
  }

  async function deleteFarm(farmId: string) {
    if (!confirm("Delete this farm? All farm data will be permanently lost.")) return;
    const res = await fetch("/api/farms/" + farmId, { method: "DELETE" });
    if (res.ok) {
      await refreshFarms();
      router.refresh();
    }
  }

  async function uploadImage(farmId: string, file: File) {
    setUploadingImg((p) => ({ ...p, [farmId]: true }));
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/farms/" + farmId + "/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        setDetails((p) => ({ ...p, [farmId]: { ...p[farmId], imageUrl: data.url } }));
        await refreshFarms();
      }
    } finally {
      setUploadingImg((p) => ({ ...p, [farmId]: false }));
    }
  }

  function copyLink(joinCode: string, farmId: string) {
    navigator.clipboard.writeText(window.location.origin + "/join/" + joinCode);
    setCopied((p) => ({ ...p, [farmId]: true }));
    setTimeout(() => setCopied((p) => ({ ...p, [farmId]: false })), 2000);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="mt-1 text-sm text-text-light">Manage your farms.</p>
      </div>

      {/* Create farm */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-text mb-4">Create New Farm</h2>
        <form onSubmit={createFarm} className="flex gap-2">
          <input
            type="text"
            value={newFarmName}
            onChange={(e) => setNewFarmName(e.target.value)}
            placeholder="Farm name"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={creating || !newFarmName.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
        {createError && <p className="mt-2 text-sm text-error">{createError}</p>}
      </section>

      {/* Farm cards */}
      {farms.map((farm) => {
        const detail = details[farm.id];
        const isRenaming = farm.id in editName;

        return (
          <section key={farm.id} className="rounded-xl border border-border bg-surface p-6 space-y-5">
            {/* Farm image */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl overflow-hidden border border-border bg-background flex items-center justify-center flex-shrink-0">
                {detail?.imageUrl ? (
                  <Image src={detail.imageUrl} alt={farm.name} width={64} height={64} className="h-16 w-16 object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-text-light">{farm.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {farm.isOwner && (
                <div>
                  <input
                    ref={(el) => { imgInputRefs.current[farm.id] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(farm.id, f); e.target.value = ""; }}
                  />
                  <button
                    onClick={() => imgInputRefs.current[farm.id]?.click()}
                    disabled={uploadingImg[farm.id]}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-background transition-colors disabled:opacity-50"
                  >
                    {uploadingImg[farm.id] ? "Uploading…" : detail?.imageUrl ? "Change Image" : "Upload Image"}
                  </button>
                  <p className="mt-1 text-xs text-text-light">JPEG, PNG, or WebP · max 5MB</p>
                </div>
              )}
            </div>

            {/* Name + rename */}
            <div className="flex items-start justify-between gap-3">
              {isRenaming ? (
                <div className="flex flex-1 gap-2 flex-wrap">
                  <input
                    autoFocus
                    type="text"
                    value={editName[farm.id] ?? ""}
                    onChange={(e) => setEditName((p) => ({ ...p, [farm.id]: e.target.value }))}
                    className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    onClick={() => renameFarm(farm.id)}
                    disabled={saving[farm.id]}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {saving[farm.id] ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditName((p) => { const n = { ...p }; delete n[farm.id]; return n; })}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-light hover:bg-background transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-base font-semibold text-text">{farm.name}</h2>
                    <span className="text-xs text-text-light">{farm.isOwner ? "Owner" : "Member"}</span>
                  </div>
                  {farm.isOwner && (
                    <button
                      onClick={() => setEditName((p) => ({ ...p, [farm.id]: farm.name }))}
                      className="text-sm text-primary hover:underline flex-shrink-0"
                    >
                      Rename
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Invite link (owner only) */}
            {farm.isOwner && detail && (
              <div>
                <p className="text-sm font-medium text-text mb-1.5">Invite link</p>
                <div className="flex gap-2 flex-wrap">
                  <input
                    readOnly
                    value={(typeof window !== "undefined" ? window.location.origin : "") + "/join/" + detail.joinCode}
                    className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-light focus:outline-none"
                  />
                  <button
                    onClick={() => copyLink(detail.joinCode, farm.id)}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:bg-background transition-colors flex-shrink-0"
                  >
                    {copied[farm.id] ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => regenerateCode(farm.id)}
                    title="Revoke current link and generate a new one"
                    className="rounded-lg border border-border px-3 py-2 text-sm text-text-light hover:bg-background transition-colors flex-shrink-0"
                  >
                    New link
                  </button>
                </div>
              </div>
            )}

            {/* Members */}
            {detail && (
              <div>
                <p className="text-sm font-medium text-text mb-2">
                  Members ({detail.members.length})
                </p>
                <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {detail.members.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 bg-background"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {member.name ?? member.email}
                          {member.id === currentUserId && (
                            <span className="ml-1.5 text-xs font-normal text-text-light">(you)</span>
                          )}
                        </p>
                        {member.name && (
                          <p className="text-xs text-text-light truncate">{member.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {member.isOwner && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            Owner
                          </span>
                        )}
                        {farm.isOwner && !member.isOwner && (
                          <button
                            onClick={() => removeMember(farm.id, member.id)}
                            className="text-xs text-error hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Danger zone */}
            <div className="flex justify-end gap-3 pt-1 border-t border-border">
              {!farm.isOwner && (
                <button
                  onClick={() => leaveFarm(farm.id)}
                  className="text-sm text-error hover:underline"
                >
                  Leave Farm
                </button>
              )}
              {farm.isOwner && (
                <button
                  onClick={() => deleteFarm(farm.id)}
                  className="text-sm text-error hover:underline"
                >
                  Delete Farm
                </button>
              )}
            </div>
          </section>
        );
      })}

      {farms.length === 0 && (
        <p className="text-sm text-text-light">
          You don&apos;t belong to any farms yet. Create one above.
        </p>
      )}
    </div>
  );
}
