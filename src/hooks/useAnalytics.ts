"use client";

import { useMemo } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { computeAnalytics } from "@/engine/analytics";
import type { SimulationAnalytics } from "@/types/analytics";

function computeGrade(returnPct: number, sharpe: number): string {
  const score = returnPct + sharpe * 0.1;
  if (score >= 0.40) return "A+";
  if (score >= 0.25) return "A";
  if (score >= 0.15) return "B+";
  if (score >= 0.05) return "B";
  if (score >= -0.05) return "C";
  if (score >= -0.20) return "D";
  return "F";
}

export function useAnalytics(): SimulationAnalytics | null {
  const state = useSimulationStore((s) => s.state);
  const priceData = useSimulationStore((s) => s.priceData);

  return useMemo(() => {
    if (!state || !state.isComplete || state.history.length < 2) return null;

    const spySeries = priceData?.get("SPY");
    const benchmarkHistory = spySeries
      ? state.history.map((snap, i) => ({
          ...snap,
          totalValue: spySeries[i]?.close ?? snap.totalValue,
        }))
      : state.history;

    const base = computeAnalytics(
      state.history,
      benchmarkHistory,
      state.config.scenario.riskFreeRate
    );

    // HODL: buy-and-hold the initial allocation with no trades/rules
    const capital = state.config.startingCapital;
    let hodlValue = 0;
    let hasPriceData = false;
    for (const alloc of state.config.allocations) {
      const series = priceData?.get(alloc.ticker);
      if (!series || series.length < 2) continue;
      const initialPrice = series[0].close;
      const finalPrice = series[series.length - 1].close;
      if (initialPrice > 0) {
        hodlValue += (alloc.pct / 100) * capital * (finalPrice / initialPrice);
        hasPriceData = true;
      }
    }
    // Cash portion (if allocations don't sum to 100)
    const allocatedPct = state.config.allocations.reduce((sum, a) => sum + a.pct, 0);
    hodlValue += ((100 - allocatedPct) / 100) * capital;

    const hodlReturnPct = hasPriceData && capital > 0
      ? (hodlValue - capital) / capital
      : base.totalReturnPct;

    const grade = computeGrade(base.totalReturnPct, base.sharpeRatio);
    const totalRulesFired = state.rulesLog.length;

    return { ...base, hodlReturnPct, grade, totalRulesFired };
  }, [state, priceData]);
}
