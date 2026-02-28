// Tests for src/engine/portfolio.ts
// Each trade action type: buy, sell_pct, sell_all, rebalance, move_to_cash

import { describe, it, expect } from "vitest";
import { applyTrade, recomputeValues, createPortfolio } from "../portfolio";
import type { Portfolio, Position, TradeOrder } from "@/types/portfolio";
import type { PriceDataMap } from "@/types/instrument";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePosition(
  ticker: string,
  qty: number,
  price: number,
  entryPrice = price
): Position {
  return {
    id: ticker,
    ticker,
    name: ticker,
    type: "stock",
    quantity: qty,
    entryPrice,
    entryDate: "2020-01-01",
    currentPrice: price,
    currentValue: qty * price,
  };
}

function makePortfolio(
  cash: number,
  positions: Position[] = []
): Portfolio {
  const posTotal = positions.reduce((s, p) => s + p.currentValue, 0);
  return {
    positions,
    cashBalance: cash,
    totalValue: cash + posTotal,
    startingValue: cash + posTotal,
  };
}

/** Price data with a single data point on a given date */
function makePrices(
  ...entries: Array<{ ticker: string; open: number; close: number; date?: string }>
): PriceDataMap {
  const map: PriceDataMap = new Map();
  for (const e of entries) {
    const date = e.date ?? "2020-01-02";
    map.set(e.ticker, [
      { date, open: e.open, high: e.open * 1.02, low: e.open * 0.98, close: e.close, volume: 1_000_000 },
    ]);
  }
  return map;
}

function order(overrides: Partial<TradeOrder> & { action: TradeOrder["action"]; ticker: string }): TradeOrder {
  return { source: "rule", ...overrides };
}

const DATE = "2020-01-02";

// ── createPortfolio ───────────────────────────────────────────────────────────

describe("createPortfolio", () => {
  it("initialises cash = starting capital", () => {
    const p = createPortfolio(10_000);
    expect(p.cashBalance).toBe(10_000);
    expect(p.totalValue).toBe(10_000);
    expect(p.startingValue).toBe(10_000);
    expect(p.positions).toHaveLength(0);
  });
});

// ── buy ───────────────────────────────────────────────────────────────────────

describe("buy", () => {
  it("creates a new position at open price", () => {
    const portfolio = makePortfolio(10_000);
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 102 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "buy", amount: 1_000 }), prices, DATE);

    expect(result.positions).toHaveLength(1);
    const pos = result.positions[0];
    expect(pos.ticker).toBe("AAPL");
    expect(pos.quantity).toBeCloseTo(10); // $1000 / $100
    expect(pos.entryPrice).toBe(100);
    expect(pos.currentValue).toBeCloseTo(1_000);
  });

  it("deducts cost from cash", () => {
    const portfolio = makePortfolio(10_000);
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 102 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "buy", amount: 2_500 }), prices, DATE);

    expect(result.cashBalance).toBeCloseTo(7_500);
  });

  it("caps purchase at available cash — never goes negative", () => {
    const portfolio = makePortfolio(500);
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 102 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "buy", amount: 2_000 }), prices, DATE);

    expect(result.cashBalance).toBeGreaterThanOrEqual(0);
    expect(result.positions[0].currentValue).toBeCloseTo(500);
  });

  it("does nothing when cash is zero", () => {
    const portfolio = makePortfolio(0);
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 102 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "buy", amount: 1_000 }), prices, DATE);

    expect(result.positions).toHaveLength(0);
    expect(result.cashBalance).toBe(0);
  });

  it("does nothing when price data is missing (price = 0)", () => {
    const portfolio = makePortfolio(10_000);
    const prices: PriceDataMap = new Map(); // no data for AAPL
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "buy", amount: 1_000 }), prices, DATE);

    expect(result.positions).toHaveLength(0);
    expect(result.cashBalance).toBe(10_000);
  });

  it("averages entry price when adding to an existing position", () => {
    const existing = makePosition("AAPL", 10, 100); // 10 shares @ $100
    const portfolio = makePortfolio(5_000, [existing]);
    const prices = makePrices({ ticker: "AAPL", open: 200, close: 202 }); // price doubled
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "buy", amount: 2_000 }), prices, DATE);

    const pos = result.positions.find((p) => p.ticker === "AAPL")!;
    expect(pos.quantity).toBeCloseTo(20); // 10 existing + 10 new
    // avg entry: (10*100 + 10*200) / 20 = 150
    expect(pos.entryPrice).toBeCloseTo(150);
  });

  it("preserves total value (cash + positions)", () => {
    const portfolio = makePortfolio(10_000);
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 100 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "buy", amount: 3_000 }), prices, DATE);

    expect(result.totalValue).toBeCloseTo(10_000);
  });
});

// ── sell_pct ──────────────────────────────────────────────────────────────────

describe("sell_pct", () => {
  it("sells a partial percentage of the position", () => {
    const portfolio = makePortfolio(0, [makePosition("AAPL", 100, 100)]);
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 100 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "sell_pct", quantity: 50 }), prices, DATE);

    const pos = result.positions.find((p) => p.ticker === "AAPL")!;
    expect(pos.quantity).toBeCloseTo(50);
    expect(result.cashBalance).toBeCloseTo(5_000);
  });

  it("removes position entirely when selling 100%", () => {
    const portfolio = makePortfolio(0, [makePosition("AAPL", 100, 100)]);
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 100 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "sell_pct", quantity: 100 }), prices, DATE);

    expect(result.positions).toHaveLength(0);
    expect(result.cashBalance).toBeCloseTo(10_000);
  });

  it("adds proceeds to cash", () => {
    const portfolio = makePortfolio(1_000, [makePosition("AAPL", 10, 200)]);
    const prices = makePrices({ ticker: "AAPL", open: 200, close: 200 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "sell_pct", quantity: 25 }), prices, DATE);

    // sold 25% of 10 shares = 2.5 shares @ $200 = $500 proceeds
    expect(result.cashBalance).toBeCloseTo(1_500);
  });

  it("does nothing for a non-existent position", () => {
    const portfolio = makePortfolio(5_000);
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 100 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "sell_pct", quantity: 50 }), prices, DATE);

    expect(result.cashBalance).toBe(5_000);
    expect(result.positions).toHaveLength(0);
  });

  it("preserves total value", () => {
    const portfolio = makePortfolio(2_000, [makePosition("AAPL", 20, 100)]);
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 100 });
    const before = portfolio.totalValue;
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "sell_pct", quantity: 40 }), prices, DATE);

    expect(result.totalValue).toBeCloseTo(before);
  });
});

// ── sell_all ──────────────────────────────────────────────────────────────────

describe("sell_all", () => {
  it("removes position and returns full proceeds as cash", () => {
    const portfolio = makePortfolio(0, [makePosition("AAPL", 50, 200)]);
    const prices = makePrices({ ticker: "AAPL", open: 200, close: 200 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "sell_all" }), prices, DATE);

    expect(result.positions).toHaveLength(0);
    expect(result.cashBalance).toBeCloseTo(10_000);
  });

  it("does nothing for a non-existent position", () => {
    const portfolio = makePortfolio(5_000);
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 100 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "sell_all" }), prices, DATE);

    expect(result.cashBalance).toBe(5_000);
  });

  it("falls back to currentPrice when open price is zero", () => {
    const pos = makePosition("AAPL", 10, 150); // currentPrice = 150
    const portfolio = makePortfolio(0, [pos]);
    const prices: PriceDataMap = new Map(); // no price data
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "sell_all" }), prices, DATE);

    expect(result.cashBalance).toBeCloseTo(1_500); // 10 * 150
    expect(result.positions).toHaveLength(0);
  });

  it("only removes the target ticker, leaves others intact", () => {
    const portfolio = makePortfolio(0, [
      makePosition("AAPL", 10, 100),
      makePosition("SPY", 5, 400),
    ]);
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 100 }, { ticker: "SPY", open: 400, close: 400 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "sell_all" }), prices, DATE);

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].ticker).toBe("SPY");
  });
});

// ── rebalance ─────────────────────────────────────────────────────────────────

describe("rebalance", () => {
  it("buys when position is below target weight", () => {
    // Portfolio: $10k total. AAPL at $2k (20%). Target: 40% = $4k. Should buy $2k more.
    const portfolio = makePortfolio(8_000, [makePosition("AAPL", 20, 100)]); // $2k AAPL, $8k cash
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 100 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "rebalance", targetPct: 0.4 }), prices, DATE);

    const pos = result.positions.find((p) => p.ticker === "AAPL")!;
    expect(pos.currentValue).toBeCloseTo(4_000, 0);
  });

  it("sells when position is above target weight", () => {
    // Portfolio: $10k total. AAPL at $8k (80%). Target: 30%. Should sell down.
    const portfolio = makePortfolio(2_000, [makePosition("AAPL", 80, 100)]); // $8k AAPL
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 100 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "rebalance", targetPct: 0.3 }), prices, DATE);

    const pos = result.positions.find((p) => p.ticker === "AAPL")!;
    expect(pos.currentValue).toBeCloseTo(3_000, 0);
  });

  it("no-ops when difference is less than $1", () => {
    const portfolio = makePortfolio(6_000, [makePosition("AAPL", 40, 100)]); // $4k AAPL = 40%
    const prices = makePrices({ ticker: "AAPL", open: 100, close: 100 });
    const result = applyTrade(portfolio, order({ ticker: "AAPL", action: "rebalance", targetPct: 0.4 }), prices, DATE);

    expect(result.cashBalance).toBeCloseTo(6_000, 0);
  });
});

// ── move_to_cash ──────────────────────────────────────────────────────────────

describe("move_to_cash", () => {
  it("liquidates all positions", () => {
    const portfolio = makePortfolio(1_000, [
      makePosition("AAPL", 10, 100),
      makePosition("SPY", 5, 400),
    ]);
    const prices = makePrices(
      { ticker: "AAPL", open: 100, close: 100 },
      { ticker: "SPY", open: 400, close: 400 }
    );
    const result = applyTrade(portfolio, order({ ticker: "", action: "move_to_cash" }), prices, DATE);

    expect(result.positions).toHaveLength(0);
    expect(result.cashBalance).toBeCloseTo(4_000); // 1000 cash + 1000 AAPL + 2000 SPY
  });

  it("resulting cash equals prior total value", () => {
    const portfolio = makePortfolio(500, [
      makePosition("AAPL", 20, 150),
      makePosition("NVDA", 3, 300),
    ]);
    const prices = makePrices(
      { ticker: "AAPL", open: 150, close: 150 },
      { ticker: "NVDA", open: 300, close: 300 }
    );
    const before = portfolio.totalValue;
    const result = applyTrade(portfolio, order({ ticker: "", action: "move_to_cash" }), prices, DATE);

    expect(result.cashBalance).toBeCloseTo(before);
  });
});

// ── recomputeValues ───────────────────────────────────────────────────────────

describe("recomputeValues", () => {
  it("updates position values from close prices at dateIndex", () => {
    const portfolio = makePortfolio(1_000, [makePosition("AAPL", 10, 100)]);
    const prices: PriceDataMap = new Map([
      ["AAPL", [
        { date: "2020-01-02", open: 100, high: 105, low: 95, close: 100, volume: 1_000_000 },
        { date: "2020-01-03", open: 110, high: 115, low: 108, close: 120, volume: 1_000_000 },
      ]],
    ]);

    const result = recomputeValues(portfolio, prices, 1); // index 1 = Jan 3
    const pos = result.positions[0];
    expect(pos.currentPrice).toBe(120);
    expect(pos.currentValue).toBe(1_200);
    expect(result.totalValue).toBe(2_200); // 1000 cash + 1200 position
  });

  it("skips options (type === 'option')", () => {
    const optPos: Position = {
      ...makePosition("AAPL_OPT", 1, 500),
      type: "option",
    };
    const portfolio = makePortfolio(0, [optPos]);
    const prices: PriceDataMap = new Map([
      ["AAPL_OPT", [{ date: "2020-01-02", open: 999, high: 999, low: 999, close: 999, volume: 0 }]],
    ]);

    const result = recomputeValues(portfolio, prices, 0);
    expect(result.positions[0].currentValue).toBe(500); // unchanged
  });
});
