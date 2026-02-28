"use client";

import { create } from "zustand";
import type { Rule } from "@/types/rules";

interface RulesStore {
  rules: Rule[];
  addRule: (rule: Rule) => void;
  updateRule: (id: string, updates: Partial<Rule>) => void;
  removeRule: (id: string) => void;
  toggleRule: (id: string) => void;
  reset: () => void;
}

export const useRulesStore = create<RulesStore>((set) => ({
  rules: [],

  addRule: (rule) =>
    set((s) => {
      if (s.rules.length >= 10) return s; // max 10 rules
      return { rules: [...s.rules, rule] };
    }),

  updateRule: (id, updates) =>
    set((s) => ({
      rules: s.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),

  removeRule: (id) =>
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

  toggleRule: (id) =>
    set((s) => ({
      rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    })),

  reset: () => set({ rules: [] }),
}));
