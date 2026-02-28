"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LeaderboardEntry } from "@/types/leaderboard";

interface LeaderboardStore {
  entries: LeaderboardEntry[];
  addEntry: (entry: LeaderboardEntry) => void;
  clearEntries: () => void;
}

export const useLeaderboardStore = create<LeaderboardStore>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: (entry) =>
        set((s) => {
          const updated = [entry, ...s.entries].slice(0, 50); // max 50 entries
          return { entries: updated };
        }),

      clearEntries: () => set({ entries: [] }),
    }),
    {
      name: "moneybags-leaderboard",
      // Safe parse: if corrupted localStorage, start fresh
      onRehydrateStorage: () => (state, error) => {
        if (error) console.warn("Leaderboard storage corrupted, resetting.", error);
      },
    }
  )
);
