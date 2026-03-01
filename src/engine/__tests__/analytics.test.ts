// Tests for src/engine/analytics.ts — computeAnalytics

import { describe, it, expect } from "vitest";
import { computeAnalytics } from "@/engine/analytics";
import type { PortfolioSnapshot } from "@/types/portfolio";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSnapshot(date: string, totalValue: number): PortfolioSnapshot {
  return {
    date,
    totalValue,
    cashBalance: 0,
    positions: [],
    dayReturn: 0,
    cumulativeReturn: 0,
    projected: false,
  };
}

function makeDailyHistory(values: number[], startDate = "2020-01-01"): PortfolioSnapshot[] {
  return values.map((v, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return makeSnapshot(d.toISOString().slice(0, 10), v);
  });
}

// ── computeAnalytics — basic structure ────────────────────────────────────────

describe("computeAnalytics — basic structure", () => {
  it("returns emptyAnalytics for fewer than 2 history entries", () => {
    const result = computeAnalytics([], [], 0.02);
    expect(result.finalValue).toBe(0);
    expect(result.totalReturnPct).toBe(0);
    expect(result.sharpeRatio).toBe(0);

    const single = computeAnalytics([makeSnapshot("2020-01-01", 10000)], [], 0.02);
    expect(single.finalValue).toBe(10000);
    expect(single.totalReturnPct).toBe(0);
  });

  it("computes correct total return pct", () => {
    // 10000 → 15000 = +50% return
    const history = makeDailyHistory([10000, 11000, 12000, 13000, 14000, 15000]);
    const result = computeAnalytics(history, history, 0.02);
    expect(result.totalReturnPct).toBeCloseTo(0.5, 5);
  });

  it("returns correct finalValue and startingValue", () => {
    const history = makeDailyHistory([10000, 8000, 9000]);
    const result = computeAnalytics(history, history, 0.02);
    expect(result.startingValue).toBe(10000);
    expect(result.finalValue).toBe(9000);
  });
});

// ── maxDrawdownPct ─────────────────────────────────────────────────────────────

describe("computeAnalytics — maxDrawdownPct is percentage points", () => {
  it("returns negative percentage for a drawdown scenario", () => {
    // Peak 200, trough 100 = -50% drawdown
    const history = makeDailyHistory([100, 150, 200, 150, 100]);
    const result = computeAnalytics(history, history, 0.02);
    // maxDrawdownPct should be around -50 (percentage points)
    expect(result.maxDrawdownPct).toBeCloseTo(-50, 1);
    expect(result.maxDrawdownPct).toBeLessThan(0);
  });

  it("returns 0 for steadily rising portfolio", () => {
    const history = makeDailyHistory([100, 110, 120, 130, 140]);
    const result = computeAnalytics(history, history, 0.02);
    expect(result.maxDrawdownPct).toBeCloseTo(0, 5);
  });
});

// ── bestDay / worstDay ─────────────────────────────────────────────────────────

describe("computeAnalytics — bestDayReturn and worstDayReturn are percentage points", () => {
  it("bestDayReturn is positive percentage points", () => {
    // Day with +10% gain
    const history = makeDailyHistory([100, 100, 110, 108]);
    const result = computeAnalytics(history, history, 0.02);
    expect(result.bestDayReturn).toBeCloseTo(10, 1); // +10% expressed as 10.0
    expect(result.bestDayReturn).toBeGreaterThan(0);
  });

  it("worstDayReturn is negative percentage points", () => {
    // Day with -10% loss
    const history = makeDailyHistory([100, 90, 95, 100]);
    const result = computeAnalytics(history, history, 0.02);
    expect(result.worstDayReturn).toBeCloseTo(-10, 1); // -10% expressed as -10.0
    expect(result.worstDayReturn).toBeLessThan(0);
  });

  it("bestDayDate and worstDayDate are populated", () => {
    const history = makeDailyHistory([100, 90, 115, 110]);
    const result = computeAnalytics(history, history, 0.02);
    expect(result.bestDayDate).toBeTruthy();
    expect(result.worstDayDate).toBeTruthy();
  });
});

// ── annualizedVolatility ──────────────────────────────────────────────────────

describe("computeAnalytics — annualizedVolatility", () => {
  it("returns a non-negative decimal (e.g. 0.24 = 24%)", () => {
    const history = makeDailyHistory([100, 102, 98, 105, 95, 110, 90, 115]);
    const result = computeAnalytics(history, history, 0.02);
    expect(result.annualizedVolatility).toBeGreaterThanOrEqual(0);
    // Stored as decimal not percentage: 0.0 to ~1.0 for normal portfolios
    expect(result.annualizedVolatility).toBeLessThan(10);
  });
});

// ── beta ──────────────────────────────────────────────────────────────────────

describe("computeAnalytics — beta vs benchmark", () => {
  it("returns beta of ~1 when portfolio mirrors benchmark", () => {
    const values = [100, 102, 98, 104, 96, 108];
    const history = makeDailyHistory(values);
    // Same series for both portfolio and benchmark
    const result = computeAnalytics(history, history, 0.02);
    expect(result.beta).toBeCloseTo(1, 3);
  });

  it("returns 1 when benchmark history is empty or too short", () => {
    const history = makeDailyHistory([100, 110, 105, 115]);
    const result = computeAnalytics(history, [], 0.02);
    expect(result.beta).toBe(1);
  });
});

// ── initialised fields ────────────────────────────────────────────────────────

describe("computeAnalytics — placeholder fields", () => {
  it("grade is initialised to F (computed in useAnalytics)", () => {
    const history = makeDailyHistory([10000, 20000]); // +100% gain
    const result = computeAnalytics(history, history, 0.02);
    // grade defaults to "F" at this layer — useAnalytics overwrites it
    expect(result.grade).toBe("F");
  });

  it("hodlReturnPct is 0 (computed in useAnalytics with priceData)", () => {
    const history = makeDailyHistory([10000, 12000]);
    const result = computeAnalytics(history, history, 0.02);
    expect(result.hodlReturnPct).toBe(0);
  });

  it("totalManualTrades is 0 (not tracked at engine layer yet)", () => {
    const history = makeDailyHistory([10000, 11000]);
    const result = computeAnalytics(history, history, 0.02);
    expect(result.totalManualTrades).toBe(0);
  });
});
