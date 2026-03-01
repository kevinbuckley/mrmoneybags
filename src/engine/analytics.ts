// Layer 3: engine — compute simulation analytics
// NO React, NO Zustand imports allowed

import type { SimulationAnalytics } from "@/types/analytics";
import type { PortfolioSnapshot } from "@/types/portfolio";
import {
  annualizedVolatility,
  sharpeRatio,
  maxDrawdown,
  beta,
  dailyReturn,
} from "@/lib/math";

export function computeAnalytics(
  history: PortfolioSnapshot[],
  benchmarkHistory: PortfolioSnapshot[],
  riskFreeRate: number
): SimulationAnalytics {
  if (history.length < 2) {
    return emptyAnalytics(history[0]?.totalValue ?? 0);
  }

  const dailyReturns = history
    .slice(1)
    .map((snap, i) => dailyReturn(history[i].totalValue, snap.totalValue));

  const benchmarkReturns = benchmarkHistory
    .slice(1)
    .map((snap, i) => dailyReturn(benchmarkHistory[i].totalValue, snap.totalValue));

  const first = history[0];
  const last = history[history.length - 1];

  // Best/worst day
  let bestDay = { return: -Infinity, date: "" };
  let worstDay = { return: Infinity, date: "" };
  history.slice(1).forEach((snap, i) => {
    const r = dailyReturn(history[i].totalValue, snap.totalValue);
    if (r > bestDay.return) bestDay = { return: r, date: snap.date };
    if (r < worstDay.return) worstDay = { return: r, date: snap.date };
  });

  const totalReturnPct = first.totalValue > 0
    ? (last.totalValue - first.totalValue) / first.totalValue
    : 0;

  return {
    finalValue: last.totalValue,
    startingValue: first.totalValue,
    totalReturnPct,
    sharpeRatio: sharpeRatio(dailyReturns, riskFreeRate),
    maxDrawdownPct: maxDrawdown(history) * 100, // convert decimal → percentage points (e.g. -31.2)
    annualizedVolatility: annualizedVolatility(dailyReturns),
    beta: beta(dailyReturns, benchmarkReturns),
    bestDayReturn: bestDay.return * 100,  // convert to percentage points (e.g. +5.2)
    bestDayDate: bestDay.date,
    worstDayReturn: worstDay.return * 100, // convert to percentage points (e.g. -7.8)
    worstDayDate: worstDay.date,
    totalManualTrades: 0, // TODO: count from trade log
    totalRulesFired: 0, // filled in by useAnalytics from state.rulesLog
    hodlReturnPct: 0, // computed in useAnalytics (needs priceData)
    grade: "F",       // computed in useAnalytics after hodl + sharpe known
  };
}

function emptyAnalytics(value: number): SimulationAnalytics {
  return {
    finalValue: value,
    startingValue: value,
    totalReturnPct: 0,
    sharpeRatio: 0,
    maxDrawdownPct: 0,
    annualizedVolatility: 0,
    beta: 1,
    bestDayReturn: 0,
    bestDayDate: "",
    worstDayReturn: 0,
    worstDayDate: "",
    totalManualTrades: 0,
    totalRulesFired: 0,
    hodlReturnPct: 0,
    grade: "F",
  };
}
