"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useRef, useState } from "react";
import { useFarm } from "@/components/providers/FarmProvider";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
  },
  {
    href: "/herd",
    label: "Herd",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    href: "/breeding",
    label: "Breeding",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    href: "/health",
    label: "Health",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/financials",
    label: "Financials",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
  },
  {
    href: "/export",
    label: "Import / Export",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function FarmAvatar({ name, imageUrl, size = 20 }: { name: string; imageUrl: string | null; size?: number }) {
  if (imageUrl) {
    return <Image src={imageUrl} alt={name} width={size} height={size} className="rounded-md object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span className="flex items-center justify-center rounded-md bg-primary/10 text-primary font-semibold flex-shrink-0 text-xs" style={{ width: size, height: size }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeFarm, farms, switchFarm } = useFarm();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
        <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        <span className="text-lg font-bold text-primary">Goat Tracker</span>
      </div>

      {/* Farm switcher */}
      <div className="relative px-3 py-3 border-b border-border">
        <button
          ref={triggerRef}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-background hover:bg-border transition-colors"
        >
          {activeFarm && <FarmAvatar name={activeFarm.name} imageUrl={activeFarm.imageUrl} size={20} />}
          <span className="truncate">{activeFarm?.name ?? "No farm selected"}</span>
          <svg
            className={"h-4 w-4 flex-shrink-0 transition-transform" + (open ? " rotate-180" : "")}
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
            <div className="absolute left-3 right-3 top-full mt-1 z-20 rounded-lg border border-border bg-surface shadow-lg py-1">
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
                  <FarmAvatar name={farm.name} imageUrl={farm.imageUrl} size={20} />
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                    (active
                      ? "bg-primary/10 text-primary"
                      : "text-text-light hover:bg-background hover:text-text")
                  }
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="border-t border-border p-3 space-y-1">
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-light hover:bg-background hover:text-text transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
