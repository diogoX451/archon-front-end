import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type TourId = "nav" | "workflow-builder";

type TourRecord = {
  completed: boolean;
  completedAt?: string;
  skipped?: boolean;
};

type TourStore = Partial<Record<TourId, TourRecord>>;

const STORAGE_KEY = "archon:tours";

function readStore(): TourStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TourStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: TourStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage unavailable — silently ignore
  }
}

type TourContextValue = {
  activeTour: TourId | null;
  startTour: (id: TourId) => void;
  endTour: (opts?: { skipped?: boolean }) => void;
  resetTour: (id: TourId) => void;
  isCompleted: (id: TourId) => boolean;
  isSkipped: (id: TourId) => boolean;
  isDone: (id: TourId) => boolean;
};

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [activeTour, setActiveTour] = useState<TourId | null>(null);
  const [store, setStore] = useState<TourStore>(readStore);

  const persist = useCallback((next: TourStore) => {
    writeStore(next);
    setStore(next);
  }, []);

  const startTour = useCallback(
    (id: TourId) => {
      if (store[id]?.completed || store[id]?.skipped) return;
      setActiveTour(id);
    },
    [store]
  );

  const endTour = useCallback(
    (opts?: { skipped?: boolean }) => {
      if (!activeTour) return;
      const next: TourStore = {
        ...store,
        [activeTour]: {
          completed: !opts?.skipped,
          skipped: opts?.skipped ?? false,
          completedAt: new Date().toISOString(),
        },
      };
      persist(next);
      setActiveTour(null);
    },
    [activeTour, store, persist]
  );

  const resetTour = useCallback(
    (id: TourId) => {
      const next = { ...store };
      delete next[id];
      persist(next);
    },
    [store, persist]
  );

  const isCompleted = useCallback((id: TourId) => store[id]?.completed === true, [store]);
  const isSkipped = useCallback((id: TourId) => store[id]?.skipped === true, [store]);
  const isDone = useCallback(
    (id: TourId) => store[id]?.completed === true || store[id]?.skipped === true,
    [store]
  );

  return (
    <TourContext.Provider
      value={{ activeTour, startTour, endTour, resetTour, isCompleted, isSkipped, isDone }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside TourProvider");
  return ctx;
}
