"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useFarm } from "@/components/providers/FarmProvider";

export default function FarmsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { farms, isLoading, refreshFarms, switchFarm } = useFarm();

  const [tab, setTab] = useState<"create" | "join">("create");
  const [farmName, setFarmName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // If user already has farms, send them to dashboard
  useEffect(() => {
    if (!isLoading && farms.length > 0) {
      router.push("/dashboard");
    }
  }, [isLoading, farms, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!farmName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: farmName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create farm"); return; }
      await switchFarm(data.id);
      await refreshFarms();
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    // Extract code if user pasted a full URL
    const match = code.match(/\/join\/([^/?#]+)/);
    const resolvedCode = match ? match[1] : code;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/join/" + resolvedCode, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to join farm"); return; }
      await switchFarm(data.id);
      await refreshFarms();
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        <span className="text-xl font-bold text-primary">Herd Tracker</span>
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text">Welcome{session?.user?.name ? ", " + session.user.name : ""}!</h1>
          <p className="mt-1 text-sm text-text-light">Create a farm or join an existing one to get started.</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-border bg-background p-1 mb-6">
          <button
            onClick={() => { setTab("create"); setError(""); }}
            className={"flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
              (tab === "create" ? "bg-surface text-text shadow-sm" : "text-text-light hover:text-text")}
          >
            Create Farm
          </button>
          <button
            onClick={() => { setTab("join"); setError(""); }}
            className={"flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
              (tab === "join" ? "bg-surface text-text shadow-sm" : "text-text-light hover:text-text")}
          >
            Join Farm
          </button>
        </div>

        {/* Create */}
        {tab === "create" && (
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="Farm name"
              autoFocus
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <button
              type="submit"
              disabled={busy || !farmName.trim()}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {busy ? "Creating…" : "Create Farm"}
            </button>
          </form>
        )}

        {/* Join */}
        {tab === "join" && (
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Invite link or join code"
              autoFocus
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <button
              type="submit"
              disabled={busy || !joinCode.trim()}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {busy ? "Joining…" : "Join Farm"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
