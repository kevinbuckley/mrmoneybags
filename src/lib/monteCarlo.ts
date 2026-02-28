// Layer 1: lib — Monte Carlo future price projection
// See docs/design-docs/data-layer.md for spec

import type { PricePoint, PriceSeries } from "@/types/instrument";

/**
 * Generate a projected price series using a random walk
 * parameterized by historical volatility and drift.
 */
export function generateProjection(
  lastHistoricalPoint: PricePoint,
  numDays: number,
  annualizedVolatility: number,
  annualizedDrift: number = 0,
  seed?: number
): PriceSeries {
  const dailyVol = annualizedVolatility / Math.sqrt(252);
  const dailyDrift = annualizedDrift / 252;

  // Simple seeded PRNG (LCG)
  let rngState = seed ?? Date.now();
  function rand(): number {
    rngState = (rngState * 1664525 + 1013904223) & 0xffffffff;
    return (rngState >>> 0) / 0xffffffff;
  }

  // Box-Muller transform for normal random
  function randn(): number {
    const u1 = Math.max(rand(), 1e-10);
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  const series: PriceSeries = [];
  let prevClose = lastHistoricalPoint.close;

  // Generate future dates (skip weekends, simplified)
  const startDate = new Date(lastHistoricalPoint.date + "T00:00:00");
  startDate.setDate(startDate.getDate() + 1);

  for (let i = 0; i < numDays; i++) {
    // Advance date, skip weekends
    while (startDate.getDay() === 0 || startDate.getDay() === 6) {
      startDate.setDate(startDate.getDate() + 1);
    }

    const dailyReturn = Math.exp(dailyDrift + dailyVol * randn());
    const close = prevClose * dailyReturn;
    const open = prevClose * (1 + randn() * dailyVol * 0.3);
    const high = Math.max(open, close) * (1 + Math.abs(randn()) * dailyVol * 0.2);
    const low = Math.min(open, close) * (1 - Math.abs(randn()) * dailyVol * 0.2);

    series.push({
      date: startDate.toISOString().split("T")[0],
      open: Math.max(open, 0.01),
      high: Math.max(high, 0.01),
      low: Math.max(low, 0.01),
      close: Math.max(close, 0.01),
      volume: Math.floor(1_000_000 + randn() * 500_000),
      projected: true,
    });

    prevClose = close;
    startDate.setDate(startDate.getDate() + 1);
  }

  return series;
}
