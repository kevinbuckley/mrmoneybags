// Tests for pure math utilities in src/lib/math.ts

import { describe, it, expect } from "vitest";
import {
  dailyReturn,
  cumulativeReturn,
  annualizedVolatility,
  sharpeRatio,
  maxDrawdown,
  beta,
} from "@/lib/math";
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

// ── dailyReturn ───────────────────────────────────────────────────────────────

describe("dailyReturn", () => {
  it("computes positive return correctly", () => {
    expect(dailyReturn(100, 105)).toBeCloseTo(0.05, 8);
  });

  it("computes negative return correctly", () => {
    expect(dailyReturn(100, 90)).toBeCloseTo(-0.10, 8);
  });

  it("returns 0 when prev is 0 (avoid division by zero)", () => {
    expect(dailyReturn(0, 100)).toBe(0);
  });

  it("returns 0 for flat day", () => {
    expect(dailyReturn(200, 200)).toBe(0);
  });
});

// ── cumulativeReturn ──────────────────────────────────────────────────────────

describe("cumulativeReturn", () => {
  it("computes 50% gain", () => {
    expect(cumulativeReturn(1000, 1500)).toBeCloseTo(0.5, 8);
  });

  it("computes loss", () => {
    expect(cumulativeReturn(1000, 800)).toBeCloseTo(-0.2, 8);
  });

  it("returns 0 when start is 0", () => {
    expect(cumulativeReturn(0, 100)).toBe(0);
  });
});

// ── annualizedVolatility ──────────────────────────────────────────────────────

describe("annualizedVolatility", () => {
  it("returns 0 for fewer than 2 data points", () => {
    expect(annualizedVolatility([])).toBe(0);
    expect(annualizedVolatility([0.01])).toBe(0);
  });

  it("returns 0 for constant returns (no variance)", () => {
    const flat = Array(30).fill(0.001);
    expect(annualizedVolatility(flat)).toBeCloseTo(0, 5);
  });

  it("produces higher volatility for more volatile series", () => {
    const calm = Array(30).fill(0).map((_, i) => (i % 2 === 0 ? 0.001 : -0.001));
    const wild = Array(30).fill(0).map((_, i) => (i % 2 === 0 ? 0.05 : -0.05));
    expect(annualizedVolatility(wild)).toBeGreaterThan(annualizedVolatility(calm));
  });

  it("annualizes correctly: daily σ=1% → annual ≈ 15.87%", () => {
    // All returns are exactly 1% — std dev is 0. Use alternating for known variance.
    // For daily σ = 0.01, annualized = 0.01 * sqrt(252) ≈ 0.1587
    const returns = Array(252).fill(0).map((_, i) => (i % 2 === 0 ? 0.01 : -0.01));
    const vol = annualizedVolatility(returns);
    expect(vol).toBeCloseTo(0.01 * Math.sqrt(252), 2);
  });
});

// ── sharpeRatio ───────────────────────────────────────────────────────────────

describe("sharpeRatio", () => {
  it("returns 0 when volatility is 0", () => {
    const flat = Array(30).fill(0.001);
    expect(sharpeRatio(flat, 0.02)).toBe(0);
  });

  it("returns positive sharpe for returns with a positive average above risk-free", () => {
    // Alternating +1% / +0.5% → mean ~0.75% daily (~189% annualized), well above 2% risk-free
    const returns = Array(252).fill(0).map((_, i) => (i % 2 === 0 ? 0.01 : 0.005));
    const s = sharpeRatio(returns, 0.02);
    expect(s).toBeGreaterThan(0);
  });

  it("returns negative sharpe for returns with a negative average", () => {
    // Alternating -0.5% / -1% → mean -0.75% daily, well below 2% risk-free
    const returns = Array(252).fill(0).map((_, i) => (i % 2 === 0 ? -0.005 : -0.01));
    const s = sharpeRatio(returns, 0.02);
    expect(s).toBeLessThan(0);
  });
});

// ── maxDrawdown ───────────────────────────────────────────────────────────────

describe("maxDrawdown", () => {
  it("returns 0 for steadily rising portfolio", () => {
    const snaps = [100, 110, 120, 130, 140].map((v, i) =>
      makeSnapshot(`2020-01-0${i + 1}`, v)
    );
    expect(maxDrawdown(snaps)).toBe(0);
  });

  it("computes correct drawdown for a crash and recovery", () => {
    // Peak 200, trough 100 → drawdown = -50%
    const snaps = [100, 150, 200, 150, 100, 200].map((v, i) =>
      makeSnapshot(`2020-01-0${i + 1}`, v)
    );
    expect(maxDrawdown(snaps)).toBeCloseTo(-0.5, 5);
  });

  it("returns negative value for any drawdown", () => {
    const snaps = [100, 90, 95].map((v, i) =>
      makeSnapshot(`2020-01-0${i + 1}`, v)
    );
    expect(maxDrawdown(snaps)).toBeLessThan(0);
  });

  it("handles a single snapshot (no drawdown possible)", () => {
    const snaps = [makeSnapshot("2020-01-01", 1000)];
    expect(maxDrawdown(snaps)).toBe(0);
  });
});

// ── beta ──────────────────────────────────────────────────────────────────────

describe("beta", () => {
  it("returns 1 when portfolio and benchmark move identically", () => {
    const returns = [0.01, -0.02, 0.03, -0.01, 0.02];
    expect(beta(returns, returns)).toBeCloseTo(1, 5);
  });

  it("returns 1 when fewer than 2 data points", () => {
    expect(beta([], [])).toBe(1);
    expect(beta([0.01], [0.01])).toBe(1);
  });

  it("returns 2 for a portfolio that moves 2× the benchmark", () => {
    const benchmark = [0.01, -0.02, 0.03, -0.01, 0.02];
    const portfolio2x = benchmark.map((r) => r * 2);
    expect(beta(portfolio2x, benchmark)).toBeCloseTo(2, 5);
  });

  it("returns negative beta for inverse relationship", () => {
    const benchmark = [0.01, -0.02, 0.03, -0.01, 0.02];
    const inverse = benchmark.map((r) => -r);
    expect(beta(inverse, benchmark)).toBeCloseTo(-1, 5);
  });

  it("returns 1 when benchmark has zero variance", () => {
    const flat = [0, 0, 0, 0, 0];
    const portfolio = [0.01, -0.01, 0.02, -0.02, 0.01];
    expect(beta(portfolio, flat)).toBe(1);
  });
});
