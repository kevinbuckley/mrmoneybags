"use client";

import { useMemo } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { computeAnalytics } from "@/engine/analytics";
import type { SimulationAnalytics } from "@/types/analytics";

/**
 * Derives final analytics from completed simulation history.
 * Only meaningful after simulation is complete.
 */
export function useAnalytics(): SimulationAnalytics | null {
  const state = useSimulationStore((s) => s.state);
  const priceData = useSimulationStore((s) => s.priceData);

  return useMemo(() => {
    if (!state || !state.isComplete || state.history.length < 2) return null;
    // Use SPY as benchmark if available, otherwise use portfolio itself
    const spySeries = priceData?.get("SPY");
    const benchmarkHistory = spySeries
      ? state.history.map((snap, i) => ({
          ...snap,
          totalValue: spySeries[i]?.close ?? snap.totalValue,
        }))
      : state.history;

    return computeAnalytics(
      state.history,
      benchmarkHistory,
      state.config.scenario.riskFreeRate
    );
  }, [state, priceData]);
}
