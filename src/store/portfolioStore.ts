"use client";

import { create } from "zustand";
import type { Scenario } from "@/types/scenario";
import type { PortfolioAllocation } from "@/types/portfolio";

interface PortfolioStore {
  startingCapital: number;
  scenario: Scenario | null;
  allocations: PortfolioAllocation[];
  // Actions
  setStartingCapital: (amount: number) => void;
  setScenario: (scenario: Scenario) => void;
  setAllocations: (allocations: PortfolioAllocation[]) => void;
  addAllocation: (ticker: string) => void;
  removeAllocation: (ticker: string) => void;
  updateAllocationPct: (ticker: string, pct: number) => void;
  reset: () => void;
}

export const usePortfolioStore = create<PortfolioStore>((set) => ({
  startingCapital: 10000,
  scenario: null,
  allocations: [],

  setStartingCapital: (amount) => set({ startingCapital: Math.max(1000, Math.min(amount, 1_000_000_000)) }),
  setScenario: (scenario) => set({ scenario }),
  setAllocations: (allocations) => set({ allocations }),

  addAllocation: (ticker) =>
    set((s) => {
      if (s.allocations.find((a) => a.ticker === ticker)) return s;
      // Distribute evenly
      const newAllocations = [...s.allocations, { ticker, pct: 0 }];
      const evenPct = 100 / newAllocations.length;
      return { allocations: newAllocations.map((a) => ({ ...a, pct: evenPct })) };
    }),

  removeAllocation: (ticker) =>
    set((s) => {
      const filtered = s.allocations.filter((a) => a.ticker !== ticker);
      if (filtered.length === 0) return { allocations: [] };
      const evenPct = 100 / filtered.length;
      return { allocations: filtered.map((a) => ({ ...a, pct: evenPct })) };
    }),

  updateAllocationPct: (ticker, pct) =>
    set((s) => ({
      allocations: s.allocations.map((a) => (a.ticker === ticker ? { ...a, pct } : a)),
    })),

  reset: () => set({ startingCapital: 10000, scenario: null, allocations: [] }),
}));
