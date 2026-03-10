"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import MobileHeader from "./MobileHeader";
import { useFarm } from "@/components/providers/FarmProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const { farms, isLoading: farmsLoading } = useFarm();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && !farmsLoading && farms.length === 0) {
      router.push("/farms");
    }
  }, [status, farmsLoading, farms, router]);

  if (status === "loading" || (status === "authenticated" && farmsLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status === "unauthenticated" || farms.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileHeader />
      <main className="pb-20 lg:pb-0 lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 lg:p-6">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
