"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LeaderboardEntry } from "@/types/leaderboard";

interface PersonalBest {
  returnPct: number;
  date: string;
}

interface LeaderboardStore {
  entries: LeaderboardEntry[];
  personalBest: PersonalBest | null;
  streak: number;
  bestStreak: number;
  addEntry: (entry: LeaderboardEntry) => void;
  updatePersonalBest: (returnPct: number) => void;
  updateStreak: (isProfit: boolean) => void;
  clearEntries: () => void;
}

export const useLeaderboardStore = create<LeaderboardStore>()(
  persist(
    (set) => ({
      entries: [],
      personalBest: null,
      streak: 0,
      bestStreak: 0,

      addEntry: (entry) =>
        set((s) => {
          const updated = [entry, ...s.entries].slice(0, 50);
          return { entries: updated };
        }),

      updatePersonalBest: (returnPct) =>
        set((s) => {
          if (s.personalBest === null || returnPct > s.personalBest.returnPct) {
            return { personalBest: { returnPct, date: new Date().toISOString().slice(0, 10) } };
          }
          return {};
        }),

      updateStreak: (isProfit) =>
        set((s) => {
          const newStreak = isProfit ? s.streak + 1 : 0;
          return {
            streak: newStreak,
            bestStreak: Math.max(s.bestStreak, newStreak),
          };
        }),

      clearEntries: () => set({ entries: [], personalBest: null, streak: 0, bestStreak: 0 }),
    }),
    {
      name: "mrmoneybags-leaderboard",
      onRehydrateStorage: () => (state, error) => {
        if (error) console.warn("Leaderboard storage corrupted, resetting.", error);
      },
    }
  )
);
