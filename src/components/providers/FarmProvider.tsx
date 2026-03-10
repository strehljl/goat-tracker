"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";

export type Farm = {
  id: string;
  name: string;
  imageUrl: string | null;
  joinCode: string;
  isOwner: boolean;
};

type FarmContextType = {
  activeFarm: Farm | null;
  farms: Farm[];
  switchFarm: (farmId: string) => Promise<void>;
  isLoading: boolean;
  refreshFarms: () => Promise<void>;
};

const FarmContext = createContext<FarmContextType>({
  activeFarm: null,
  farms: [],
  switchFarm: async () => {},
  isLoading: true,
  refreshFarms: async () => {},
});

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update } = useSession();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFarms = useCallback(async () => {
    try {
      const res = await fetch("/api/farms");
      if (res.ok) {
        const data = await res.json();
        setFarms(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchFarms();
    } else if (session === null) {
      // Explicitly signed out
      setFarms([]);
      setIsLoading(false);
    }
  }, [session?.user?.id, fetchFarms]);

  const activeFarm =
    farms.find((f) => f.id === session?.user?.activeFarmId) ?? null;

  const switchFarm = useCallback(
    async (farmId: string) => {
      const res = await fetch("/api/auth/active-farm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId }),
      });
      if (!res.ok) throw new Error("Failed to switch farm");
      await update({ activeFarmId: farmId });
    },
    [update]
  );

  return (
    <FarmContext.Provider
      value={{ activeFarm, farms, switchFarm, isLoading, refreshFarms: fetchFarms }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  return useContext(FarmContext);
}
