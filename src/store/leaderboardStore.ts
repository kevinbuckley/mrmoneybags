"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LeaderboardEntry } from "@/types/leaderboard";
import type { PortfolioSnapshot } from "@/types/portfolio";

interface PersonalBest {
  returnPct: number;
  date: string;
}

interface LeaderboardStore {
  entries: LeaderboardEntry[];
  // Global personal best (all-time, all scenarios)
  personalBest: PersonalBest | null;
  // Per-scenario personal bests: slug → best
  scenarioPersonalBests: Record<string, PersonalBest>;
  // Streak (day-based: consecutive calendar days with at least one completed run)
  streak: number;
  bestStreak: number;
  lastPlayedDate: string | null; // YYYY-MM-DD
  // Last run history per scenario slug — used to render ghost line on next run
  lastRunHistories: Record<string, PortfolioSnapshot[]>;
  // Actions
  addEntry: (entry: LeaderboardEntry) => void;
  updatePersonalBest: (returnPct: number) => void;
  updateScenarioPersonalBest: (slug: string, returnPct: number) => void;
  /** Day-based: increments once per calendar day regardless of profit/loss */
  updateStreak: () => void;
  setLastRunHistory: (slug: string, history: PortfolioSnapshot[]) => void;
  clearEntries: () => void;
}

export const useLeaderboardStore = create<LeaderboardStore>()(
  persist(
    (set) => ({
      entries: [],
      personalBest: null,
      scenarioPersonalBests: {},
      streak: 0,
      bestStreak: 0,
      lastPlayedDate: null,
      lastRunHistories: {},

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

      updateScenarioPersonalBest: (slug, returnPct) =>
        set((s) => {
          const existing = s.scenarioPersonalBests[slug];
          if (!existing || returnPct > existing.returnPct) {
            return {
              scenarioPersonalBests: {
                ...s.scenarioPersonalBests,
                [slug]: { returnPct, date: new Date().toISOString().slice(0, 10) },
              },
            };
          }
          return {};
        }),

      updateStreak: () =>
        set((s) => {
          const today = new Date().toISOString().slice(0, 10);
          if (s.lastPlayedDate === today) return {}; // already played today
          const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
          const newStreak = s.lastPlayedDate === yesterday ? s.streak + 1 : 1;
          return {
            streak: newStreak,
            bestStreak: Math.max(s.bestStreak, newStreak),
            lastPlayedDate: today,
          };
        }),

      setLastRunHistory: (slug, history) =>
        set((s) => ({
          lastRunHistories: {
            ...s.lastRunHistories,
            // Thin to 500 snapshots max so localStorage stays manageable
            [slug]: history.length > 500
              ? history.filter((_, i) => i % Math.ceil(history.length / 500) === 0)
              : history,
          },
        })),

      clearEntries: () =>
        set({
          entries: [],
          personalBest: null,
          scenarioPersonalBests: {},
          streak: 0,
          bestStreak: 0,
          lastPlayedDate: null,
        }),
    }),
    {
      name: "mrmoneybags-leaderboard",
      onRehydrateStorage: () => (state, error) => {
        if (error) console.warn("Leaderboard storage corrupted, resetting.", error);
        if (state && !state.lastRunHistories) state.lastRunHistories = {};
        if (state && !state.scenarioPersonalBests) state.scenarioPersonalBests = {};
      },
    }
  )
);
