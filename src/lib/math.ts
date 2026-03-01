// Layer 1: lib — pure math utilities, no UI, no state
// TODO: implement all functions

import type { PortfolioSnapshot } from "@/types/portfolio";

/** Daily % return between two values */
export function dailyReturn(prev: number, curr: number): number {
  if (prev === 0) return 0;
  return (curr - prev) / prev;
}

/** Cumulative % return */
export function cumulativeReturn(start: number, current: number): number {
  if (start === 0) return 0;
  return (current - start) / start;
}

/** Annualized volatility from array of daily returns */
export function annualizedVolatility(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) /
    (dailyReturns.length - 1);
  return Math.sqrt(variance * 252);
}

/** Sharpe ratio (annualized, assuming risk-free rate rf) */
export function sharpeRatio(
  dailyReturns: number[],
  riskFreeRate: number = 0.02
): number {
  const vol = annualizedVolatility(dailyReturns);
  // Guard against near-zero volatility (flat series, floating-point noise)
  if (vol < 1e-9) return 0;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const annualizedReturn = mean * 252;
  return (annualizedReturn - riskFreeRate) / vol;
}

/** Maximum drawdown from portfolio history (returns negative %) */
export function maxDrawdown(snapshots: PortfolioSnapshot[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const snap of snapshots) {
    if (snap.totalValue > peak) peak = snap.totalValue;
    const dd = (snap.totalValue - peak) / peak;
    if (dd < maxDd) maxDd = dd;
  }
  return maxDd;
}

/** Beta vs benchmark (array of benchmark daily returns) */
export function beta(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (n < 2) return 1;
  const pR = portfolioReturns.slice(0, n);
  const bR = benchmarkReturns.slice(0, n);
  const meanP = pR.reduce((a, b) => a + b, 0) / n;
  const meanB = bR.reduce((a, b) => a + b, 0) / n;
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    cov += (pR[i] - meanP) * (bR[i] - meanB);
    varB += (bR[i] - meanB) ** 2;
  }
  if (varB === 0) return 1;
  return cov / varB;
}
