"use client";

import { usePortfolioStore } from "@/store/portfolioStore";
import { useRulesStore } from "@/store/rulesStore";

/** Convenience hook for portfolio setup */
export function usePortfolio() {
  return usePortfolioStore();
}

/** Convenience hook for rules */
export function useRules() {
  return useRulesStore();
}
