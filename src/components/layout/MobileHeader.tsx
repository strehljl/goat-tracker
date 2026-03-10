"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useFarm } from "@/components/providers/FarmProvider";

function FarmAvatar({ name, imageUrl, size = 16 }: { name: string; imageUrl: string | null; size?: number }) {
  if (imageUrl) {
    return <Image src={imageUrl} alt={name} width={size} height={size} className="rounded object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span className="flex items-center justify-center rounded bg-primary/10 text-primary font-semibold flex-shrink-0 text-xs" style={{ width: size, height: size }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function MobileHeader() {
  const router = useRouter();
  const { activeFarm, farms, switchFarm } = useFarm();
  const [open, setOpen] = useState(false);

  async function handleSwitch(farmId: string) {
    if (farmId === activeFarm?.id) {
      setOpen(false);
      return;
    }
    setOpen(false);
    await switchFarm(farmId);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
      <div className="flex items-center gap-2 flex-shrink-0">
        <svg className="h-6 w-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        <span className="text-base font-bold text-primary">Goat Tracker</span>
      </div>

      {/* Farm switcher */}
      <div className="relative flex-1 mx-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-xs font-medium bg-background hover:bg-border transition-colors"
        >
          {activeFarm && <FarmAvatar name={activeFarm.name} imageUrl={activeFarm.imageUrl} size={16} />}
          <span className="truncate">{activeFarm?.name ?? "No farm"}</span>
          <svg
            className={"h-3.5 w-3.5 flex-shrink-0 transition-transform" + (open ? " rotate-180" : "")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border border-border bg-surface shadow-lg py-1">
              {farms.map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => handleSwitch(farm.id)}
                  className={
                    "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-background transition-colors " +
                    (farm.id === activeFarm?.id ? "text-primary font-medium" : "text-text")
                  }
                >
                  <svg
                    className={"h-4 w-4 flex-shrink-0 " + (farm.id === activeFarm?.id ? "text-primary" : "text-transparent")}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <FarmAvatar name={farm.name} imageUrl={farm.imageUrl} size={16} />
                  <span className="truncate">{farm.name}</span>
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-light hover:bg-background transition-colors"
                >
                  Manage farms
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-lg p-2 text-text-light hover:bg-background flex-shrink-0"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </header>
  );
}
