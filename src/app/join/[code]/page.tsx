"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useFarm } from "@/components/providers/FarmProvider";

type FarmInfo = { id: string; name: string; alreadyMember: boolean };

export default function JoinPage() {
  const params = useParams();
  const code = params.code as string;
  const router = useRouter();
  const { data: session, status } = useSession();
  const { refreshFarms, switchFarm } = useFarm();

  const [farmInfo, setFarmInfo] = useState<FarmInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/join/" + code);
    }
  }, [status, code, router]);

  // Fetch farm info once authenticated
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/join/" + code)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.error || "Invalid invite link");
        } else {
          setFarmInfo(data);
        }
      })
      .catch(() => setLoadError("Failed to load farm info"));
  }, [status, code]);

  async function handleJoin() {
    setJoining(true);
    setJoinError("");
    try {
      const res = await fetch("/api/join/" + code, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || "Failed to join farm");
        return;
      }
      await refreshFarms();
      await switchFarm(data.id);
      router.push("/dashboard");
    } finally {
      setJoining(false);
    }
  }

  // Loading state
  if (status === "loading" || (status === "authenticated" && !farmInfo && !loadError)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Invalid code
  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-2xl mb-2">&#x26A0;&#xFE0F;</p>
          <h1 className="text-lg font-semibold text-text mb-1">Invalid Invite Link</h1>
          <p className="text-sm text-text-light mb-6">{loadError}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!farmInfo) return null;

  // Already a member
  if (farmInfo.alreadyMember) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-text mb-1">Already a Member</h1>
          <p className="text-sm text-text-light mb-6">
            You&apos;re already a member of <strong>{farmInfo.name}</strong>.
          </p>
          <button
            onClick={() => { switchFarm(farmInfo.id).then(() => router.push("/dashboard")); }}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Go to {farmInfo.name}
          </button>
        </div>
      </div>
    );
  }

  // Join prompt
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <svg className="h-6 w-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-light mb-1">You&apos;ve been invited to join</p>
        <h1 className="text-2xl font-bold text-text mb-6">{farmInfo.name}</h1>
        {joinError && <p className="mb-4 text-sm text-error">{joinError}</p>}
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors mb-3"
        >
          {joining ? "Joining…" : "Join Farm"}
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-light hover:bg-background transition-colors"
        >
          Cancel
        </button>
        {session?.user?.name && (
          <p className="mt-4 text-xs text-text-light">
            Joining as <strong>{session.user.name}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
