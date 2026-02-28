// Tests for short put engine functions

import { describe, it, expect } from "vitest";
import type { Portfolio } from "@/types/portfolio";
import { applyTrade } from "@/engine/portfolio";
import { recomputeOptionValue, processShortPutExpiry } from "@/engine/options";
import type { PriceDataMap } from "@/types/instrument";
import type { Position } from "@/types/portfolio";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePriceSeries(closes: number[], startDate = "2020-01-02"): import("@/types/instrument").PriceSeries {
  return closes.map((close, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      open: close,
      high: close,
      low: close,
      close,
      volume: 1000,
    };
  });
}

function makeEmptyPortfolio(cash = 50000): Portfolio {
  return {
    positions: [],
    cashBalance: cash,
    totalValue: cash,
    startingValue: cash,
  };
}

function makeShortPutPosition(
  underlying: string,
  strike: number,
  expiryDate: string,
  premiumPerContract: number,
  numContracts = 1
): Position {
  const premium = premiumPerContract * numContracts;
  return {
    id: `${underlying}-${strike}p-${expiryDate}-test`,
    ticker: `${underlying}-${strike}p-${expiryDate}-test`,
    name: `${underlying} $${strike} Put (short) exp ${expiryDate}`,
    type: "option",
    quantity: numContracts,
    entryPrice: premiumPerContract,
    entryDate: "2020-01-02",
    currentPrice: premiumPerContract,
    currentValue: -premium, // liability = -premium at open
    optionConfig: {
      underlying,
      strategy: "short_put",
      type: "put",
      strike,
      expiryDate,
      numContracts,
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("applyShortPut (via applyTrade sell_put)", () => {
  it("credits premium to cash; creates position; totalValue unchanged on day 0", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 300 + i); // SPY rising
    const priceData: PriceDataMap = new Map([["SPY", makePriceSeries(closes)]]);
    const portfolio = makeEmptyPortfolio(50000);

    // Sell 1 contract of SPY $290 put for $850 total premium
    const result = applyTrade(portfolio, {
      ticker: "SPY",
      action: "sell_put",
      strike: 290,
      expiryDate: "2020-02-28",
      numContracts: 1,
      premium: 850,
      source: "manual",
    }, priceData, "2020-01-02");

    // Cash should increase by premium
    expect(result.cashBalance).toBeCloseTo(50850, 1);
    // One option position added
    expect(result.positions).toHaveLength(1);
    const pos = result.positions[0]!;
    expect(pos.type).toBe("option");
    expect(pos.optionConfig?.strategy).toBe("short_put");
    expect(pos.optionConfig?.strike).toBe(290);
    // Position currentValue is negative (liability)
    expect(pos.currentValue).toBeCloseTo(-850, 1);
    // Total value is unchanged (cash +850, liability -850)
    expect(result.totalValue).toBeCloseTo(50000, 1);
  });
});

describe("processShortPutExpiry — OTM (stock above strike)", () => {
  it("removes position, leaves cash unchanged when stock > strike", () => {
    const portfolio = makeEmptyPortfolio(50850); // includes premium already received
    const pos = makeShortPutPosition("SPY", 290, "2020-02-28", 850, 1);
    const portfolioWithPut: Portfolio = {
      ...portfolio,
      positions: [pos],
      totalValue: 50850 + pos.currentValue, // 50850 - 850 = 50000
    };

    // Stock at $310 > strike $290 → put expires OTM
    const { portfolio: settled, wasAssigned } = processShortPutExpiry(portfolioWithPut, pos, 310);

    expect(wasAssigned).toBe(false);
    expect(settled.positions).toHaveLength(0);
    // Cash unchanged — premium was already in cash
    expect(settled.cashBalance).toBeCloseTo(50850, 1);
    // Total value = cash (no more liability)
    expect(settled.totalValue).toBeCloseTo(50850, 1);
  });
});

describe("processShortPutExpiry — ITM (stock below strike)", () => {
  it("deducts intrinsic value from cash when stock < strike", () => {
    const portfolio = makeEmptyPortfolio(50850);
    const pos = makeShortPutPosition("SPY", 290, "2020-02-28", 850, 1);
    const portfolioWithPut: Portfolio = {
      ...portfolio,
      positions: [pos],
      totalValue: 50850 + pos.currentValue,
    };

    // Stock at $260 < strike $290 → put expires ITM
    // Assignment loss = (290 - 260) × 100 × 1 = $3,000
    const { portfolio: settled, wasAssigned } = processShortPutExpiry(portfolioWithPut, pos, 260);

    expect(wasAssigned).toBe(true);
    expect(settled.positions).toHaveLength(0);
    // Cash = 50850 - 3000 = 47850
    expect(settled.cashBalance).toBeCloseTo(47850, 1);
    // Total value = 47850 (all cash, no positions)
    expect(settled.totalValue).toBeCloseTo(47850, 1);
  });

  it("handles 2 contracts correctly (2× assignment loss)", () => {
    const portfolio = makeEmptyPortfolio(51700); // +1700 premium (2 contracts × $850)
    const pos = makeShortPutPosition("SPY", 290, "2020-02-28", 850, 2);
    const portfolioWithPut: Portfolio = {
      ...portfolio,
      positions: [pos],
      totalValue: 51700 + pos.currentValue, // 51700 - 1700 = 50000
    };

    // Stock at $260 — assignment loss = (290 - 260) × 100 × 2 = $6,000
    const { portfolio: settled, wasAssigned } = processShortPutExpiry(portfolioWithPut, pos, 260);

    expect(wasAssigned).toBe(true);
    expect(settled.cashBalance).toBeCloseTo(51700 - 6000, 1); // 45700
  });
});

describe("recomputeOptionValue — short_put returns negative liability", () => {
  it("returns negative value for short put (liability increases as stock falls)", () => {
    // 30 data points: stock falls from $300 to $270 (below strike $290)
    const closes = Array.from({ length: 30 }, (_, i) => 300 - i);
    const underlyingSeries = makePriceSeries(closes);
    const pos = makeShortPutPosition("SPY", 290, "2020-03-15", 300, 1);

    // At index 25, stock is at $275 (below strike $290) — put is ITM
    const value = recomputeOptionValue(pos, underlyingSeries, 25, 0.005);

    // Value should be negative (it's a liability)
    expect(value).toBeLessThan(0);
    // And its absolute value should be > the premium ($300) since it's ITM
    expect(Math.abs(value)).toBeGreaterThan(300);
  });

  it("returns near-zero for OTM short put close to expiry", () => {
    // Stock well above strike, near expiry → put value ≈ 0
    const closes = Array.from({ length: 30 }, () => 350); // constant at $350
    const underlyingSeries = makePriceSeries(closes);
    // Strike $290, expiry is same date as last tick (T ≈ 0)
    const expiryDate = underlyingSeries[29]!.date;
    const pos = makeShortPutPosition("SPY", 290, expiryDate, 100, 1);

    const value = recomputeOptionValue(pos, underlyingSeries, 28, 0.005);

    // OTM near expiry → put ≈ 0, so short put liability ≈ 0
    expect(Math.abs(value)).toBeLessThan(50);
  });
});
