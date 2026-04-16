"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { type AnimalConfig, type AnimalType, getAnimalConfig } from "@/lib/animalConfig";

export type Farm = {
  id: string;
  name: string;
  imageUrl: string | null;
  joinCode: string;
  isOwner: boolean;
};

export type Herd = {
  id: string;
  farmId: string;
  name: string;
  animalType: AnimalType;
  description: string | null;
};

type FarmContextType = {
  activeFarm: Farm | null;
  farms: Farm[];
  switchFarm: (farmId: string) => Promise<void>;
  isLoading: boolean;
  refreshFarms: () => Promise<void>;
  // Herd management
  herds: Herd[];
  activeHerd: Herd | null;
  switchHerd: (herdId: string | null) => void;
  refreshHerds: () => Promise<void>;
  activeConfig: AnimalConfig;
};

const FarmContext = createContext<FarmContextType>({
  activeFarm: null,
  farms: [],
  switchFarm: async () => {},
  isLoading: true,
  refreshFarms: async () => {},
  herds: [],
  activeHerd: null,
  switchHerd: () => {},
  refreshHerds: async () => {},
  activeConfig: getAnimalConfig("GOAT"),
});

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update } = useSession();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [herds, setHerds] = useState<Herd[]>([]);
  const [activeHerdId, setActiveHerdId] = useState<string | null>(null);

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

  const fetchHerds = useCallback(async (farmId: string) => {
    try {
      const res = await fetch(`/api/herds?farmId=${farmId}`);
      if (res.ok) {
        const data: Herd[] = await res.json();
        setHerds(data);
        // Auto-select first herd if none selected or current selection is from a different farm
        setActiveHerdId((prev) => {
          const stillValid = data.some((h) => h.id === prev);
          return stillValid ? prev : (data[0]?.id ?? null);
        });
      }
    } catch {
      setHerds([]);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchFarms();
    } else if (session === null) {
      setFarms([]);
      setHerds([]);
      setIsLoading(false);
    }
  }, [session?.user?.id, fetchFarms]);

  const activeFarm =
    farms.find((f) => f.id === session?.user?.activeFarmId) ?? null;

  // Fetch herds whenever the active farm changes
  useEffect(() => {
    if (activeFarm?.id) {
      fetchHerds(activeFarm.id);
    } else {
      setHerds([]);
      setActiveHerdId(null);
    }
  }, [activeFarm?.id, fetchHerds]);

  const activeHerd = herds.find((h) => h.id === activeHerdId) ?? herds[0] ?? null;
  const activeConfig = getAnimalConfig(activeHerd?.animalType);

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

  const switchHerd = useCallback((herdId: string | null) => {
    setActiveHerdId(herdId);
  }, []);

  return (
    <FarmContext.Provider
      value={{
        activeFarm,
        farms,
        switchFarm,
        isLoading,
        refreshFarms: fetchFarms,
        herds,
        activeHerd,
        switchHerd,
        refreshHerds: activeFarm ? () => fetchHerds(activeFarm.id) : async () => {},
        activeConfig,
      }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  return useContext(FarmContext);
}
