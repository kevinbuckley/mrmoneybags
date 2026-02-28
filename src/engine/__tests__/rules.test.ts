// Tests for src/engine/rules.ts
// All 7 condition subjects, cooldown, disabled rules, and the 5 built-in strategy templates.

import { describe, it, expect } from "vitest";
import { evaluateRules } from "../rules";
import type { SimulationState, RuleFireEvent } from "@/types/simulation";
import type { Portfolio, PortfolioSnapshot, Position } from "@/types/portfolio";
import type { PriceDataMap } from "@/types/instrument";
import type { Rule, RuleCondition } from "@/types/rules";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePosition(ticker: string, qty: number, price: number): Position {
  return {
    id: ticker,
    ticker,
    name: ticker,
    type: "stock",
    quantity: qty,
    entryPrice: price,
    entryDate: "2020-01-01",
    currentPrice: price,
    currentValue: qty * price,
  };
}

function makePortfolio(cash: number, positions: Position[] = []): Portfolio {
  const posTotal = positions.reduce((s, p) => s + p.currentValue, 0);
  return {
    positions,
    cashBalance: cash,
    totalValue: cash + posTotal,
    startingValue: cash + posTotal,
  };
}

function makeSnapshot(
  totalValue: number,
  positions: Array<{ ticker: string; value: number }> = [],
  date = "2020-01-01"
): PortfolioSnapshot {
  return {
    date,
    totalValue,
    cashBalance: 0,
    positions: positions.map((p) => ({
      ticker: p.ticker,
      value: p.value,
      quantity: 1,
      closePrice: p.value,
      dayReturn: 0,
      projected: false,
    })),
    dayReturn: 0,
    cumulativeReturn: 0,
    projected: false,
  };
}

/** Multi-date price series. dates and prices must be same length. */
function makePriceSeries(ticker: string, dates: string[], closePrices: number[]): PriceDataMap {
  const map: PriceDataMap = new Map();
  map.set(ticker, dates.map((date, i) => ({
    date,
    open: closePrices[i],
    high: closePrices[i] * 1.02,
    low: closePrices[i] * 0.98,
    close: closePrices[i],
    volume: 1_000_000,
  })));
  return map;
}

function makeState(
  portfolio: Portfolio,
  currentDateIndex = 1,
  history: PortfolioSnapshot[] = []
): SimulationState {
  return {
    config: {
      startingCapital: portfolio.startingValue,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scenario: {} as any,
      allocations: [],
      rules: [],
      mode: "movie",
      granularity: "daily",
    },
    currentDateIndex,
    portfolio,
    history,
    rulesLog: [] as RuleFireEvent[],
    narratorQueue: [],
    pendingTrades: [],
    isComplete: false,
  };
}

function makeRule(overrides: Partial<Rule> & { conditions: RuleCondition[]; action: Rule["action"] }): Rule {
  return {
    id: "r1",
    label: "Test Rule",
    enabled: true,
    firedCount: 0,
    cooldownTicks: 0,
    ...overrides,
  };
}

function cond(
  subject: RuleCondition["subject"],
  operator: RuleCondition["operator"],
  value: number,
  ticker?: string
): RuleCondition {
  return { subject, operator, value, ...(ticker ? { ticker } : {}) };
}

// ── Disabled rules ────────────────────────────────────────────────────────────

describe("disabled rules", () => {
  it("never fires when enabled = false", () => {
    const portfolio = makePortfolio(5_000);
    const rule = makeRule({
      enabled: false,
      conditions: [cond("cash_balance", "gt", 1_000)],
      action: { type: "move_to_cash" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });
});

// ── Empty conditions ──────────────────────────────────────────────────────────

describe("empty conditions", () => {
  it("rule with no conditions never fires", () => {
    const portfolio = makePortfolio(10_000);
    const rule = makeRule({ conditions: [], action: { type: "move_to_cash" } });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });
});

// ── Condition: portfolio_value ────────────────────────────────────────────────

describe("condition: portfolio_value", () => {
  it("fires when portfolio value exceeds threshold", () => {
    const portfolio = makePortfolio(15_000);
    const rule = makeRule({
      conditions: [cond("portfolio_value", "gt", 10_000)],
      action: { type: "move_to_cash" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio), prices, [rule]);
    expect(firedRules).toHaveLength(1);
  });

  it("does not fire when portfolio value is below threshold", () => {
    const portfolio = makePortfolio(8_000);
    const rule = makeRule({
      conditions: [cond("portfolio_value", "gt", 10_000)],
      action: { type: "move_to_cash" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });
});

// ── Condition: cash_balance ───────────────────────────────────────────────────

describe("condition: cash_balance", () => {
  it("fires when cash exceeds threshold", () => {
    const portfolio = makePortfolio(5_000);
    const rule = makeRule({
      conditions: [cond("cash_balance", "gt", 3_000)],
      action: { type: "move_to_cash" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio), prices, [rule]);
    expect(firedRules).toHaveLength(1);
  });
});

// ── Condition: days_elapsed ───────────────────────────────────────────────────

describe("condition: days_elapsed", () => {
  it("fires when currentDateIndex >= threshold", () => {
    const portfolio = makePortfolio(10_000);
    const rule = makeRule({
      conditions: [cond("days_elapsed", "gte", 5)],
      action: { type: "move_to_cash" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio, 5), prices, [rule]);
    expect(firedRules).toHaveLength(1);
  });

  it("does not fire before threshold", () => {
    const portfolio = makePortfolio(10_000);
    const rule = makeRule({
      conditions: [cond("days_elapsed", "gte", 10)],
      action: { type: "move_to_cash" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio, 3), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });
});

// ── Condition: portfolio_change_pct ───────────────────────────────────────────

describe("condition: portfolio_change_pct", () => {
  it("fires when portfolio drops below threshold vs prev snapshot", () => {
    // Portfolio was $10k yesterday, now $9k = −10% change
    const portfolio = makePortfolio(9_000);
    const history = [makeSnapshot(10_000)];
    const rule = makeRule({
      conditions: [cond("portfolio_change_pct", "lte", -5)],
      action: { type: "move_to_cash" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio, 1, history), prices, [rule]);
    expect(firedRules).toHaveLength(1);
  });

  it("does not fire when drop is smaller than threshold", () => {
    // Portfolio was $10k, now $9.7k = −3%
    const portfolio = makePortfolio(9_700);
    const history = [makeSnapshot(10_000)];
    const rule = makeRule({
      conditions: [cond("portfolio_change_pct", "lte", -5)],
      action: { type: "move_to_cash" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio, 1, history), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });
});

// ── Condition: position_change_pct ────────────────────────────────────────────

describe("condition: position_change_pct", () => {
  it("fires when position gains above threshold", () => {
    // AAPL prev value $1000, now $1600 = +60%
    const portfolio = makePortfolio(0, [makePosition("AAPL", 16, 100)]);
    portfolio.positions[0].currentValue = 1_600;
    const history = [makeSnapshot(10_000, [{ ticker: "AAPL", value: 1_000 }])];
    const rule = makeRule({
      conditions: [cond("position_change_pct", "gte", 50, "AAPL")],
      action: { type: "sell_all", ticker: "AAPL" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio, 1, history), prices, [rule]);
    expect(firedRules).toHaveLength(1);
  });

  it("returns null (does not fire) when position doesn't exist", () => {
    const portfolio = makePortfolio(10_000); // no AAPL position
    const rule = makeRule({
      conditions: [cond("position_change_pct", "gte", 50, "AAPL")],
      action: { type: "sell_all", ticker: "AAPL" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });
});

// ── Condition: position_weight_pct ────────────────────────────────────────────

describe("condition: position_weight_pct", () => {
  it("fires when position weight exceeds threshold", () => {
    // AAPL $6k out of $10k total = 60%
    const portfolio = makePortfolio(4_000, [makePosition("AAPL", 60, 100)]);
    const rule = makeRule({
      conditions: [cond("position_weight_pct", "gte", 50, "AAPL")],
      action: { type: "sell_pct", ticker: "AAPL", pct: 25 },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio), prices, [rule]);
    expect(firedRules).toHaveLength(1);
  });

  it("does not fire when position is under-weight", () => {
    // AAPL $3k out of $10k = 30%
    const portfolio = makePortfolio(7_000, [makePosition("AAPL", 30, 100)]);
    const rule = makeRule({
      conditions: [cond("position_weight_pct", "gte", 50, "AAPL")],
      action: { type: "sell_pct", ticker: "AAPL", pct: 25 },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });
});

// ── Condition: market_change_pct ──────────────────────────────────────────────

describe("condition: market_change_pct", () => {
  it("fires when SPY drops more than threshold on current tick", () => {
    // SPY: $300 → $285 = −5%
    const portfolio = makePortfolio(10_000);
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 285]);
    const rule = makeRule({
      conditions: [cond("market_change_pct", "lte", -3)],
      action: { type: "buy", ticker: "GLD", amount: 2_000 },
    });
    const { firedRules } = evaluateRules(makeState(portfolio, 1), prices, [rule]);
    expect(firedRules).toHaveLength(1);
  });

  it("does not fire on a minor dip smaller than threshold", () => {
    // SPY: $300 → $298 = −0.67%
    const portfolio = makePortfolio(10_000);
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 298]);
    const rule = makeRule({
      conditions: [cond("market_change_pct", "lte", -3)],
      action: { type: "buy", ticker: "GLD", amount: 2_000 },
    });
    const { firedRules } = evaluateRules(makeState(portfolio, 1), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });

  it("uses first available series when SPY is missing", () => {
    // No SPY — falls back to QQQ: $400 → $380 = −5%
    const portfolio = makePortfolio(10_000);
    const prices = makePriceSeries("QQQ", ["2020-01-01", "2020-01-02"], [400, 380]);
    const rule = makeRule({
      conditions: [cond("market_change_pct", "lte", -3)],
      action: { type: "buy", ticker: "GLD", amount: 2_000 },
    });
    const { firedRules } = evaluateRules(makeState(portfolio, 1), prices, [rule]);
    expect(firedRules).toHaveLength(1);
  });
});

// ── Cooldown ──────────────────────────────────────────────────────────────────

describe("cooldown", () => {
  it("rule does not fire again within cooldown window", () => {
    const portfolio = makePortfolio(5_000);
    // Fired on Jan 2 (index 1). Cooldown = 3 ticks. At index 3, still on cooldown.
    const rule = makeRule({
      conditions: [cond("cash_balance", "gt", 1_000)],
      action: { type: "move_to_cash" },
      cooldownTicks: 3,
      lastFiredDate: "2020-01-02",
    });
    const prices = makePriceSeries("SPY",
      ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-06"],
      [300, 300, 300, 300]
    );
    // current index = 3, lastFired index = 1, diff = 2 < cooldown 3 → blocked
    const { firedRules } = evaluateRules(makeState(portfolio, 3), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });

  it("rule fires after cooldown expires", () => {
    const portfolio = makePortfolio(5_000);
    // Fired on Jan 2 (index 1). Cooldown = 3 ticks. At index 5, cooldown has passed.
    const rule = makeRule({
      conditions: [cond("cash_balance", "gt", 1_000)],
      action: { type: "move_to_cash" },
      cooldownTicks: 3,
      lastFiredDate: "2020-01-02",
    });
    const prices = makePriceSeries("SPY",
      ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-06", "2020-01-07", "2020-01-08"],
      [300, 300, 300, 300, 300, 300]
    );
    // current index = 5, lastFired index = 1, diff = 4 >= cooldown 3 → fires
    const { firedRules } = evaluateRules(makeState(portfolio, 5), prices, [rule]);
    expect(firedRules).toHaveLength(1);
  });

  it("updates firedCount and lastFiredDate when rule fires", () => {
    const portfolio = makePortfolio(5_000);
    const rule = makeRule({
      conditions: [cond("cash_balance", "gt", 1_000)],
      action: { type: "move_to_cash" },
      firedCount: 2,
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { updatedRules } = evaluateRules(makeState(portfolio, 1), prices, [rule]);
    expect(updatedRules[0].firedCount).toBe(3);
    expect(updatedRules[0].lastFiredDate).toBe("2020-01-02");
  });
});

// ── AND logic ─────────────────────────────────────────────────────────────────

describe("multiple conditions (AND logic)", () => {
  it("fires only when all conditions are met", () => {
    const portfolio = makePortfolio(5_000);
    const rule = makeRule({
      conditions: [
        cond("cash_balance", "gt", 3_000), // true: 5000 > 3000
        cond("days_elapsed", "gte", 10),   // false: index 1 < 10
      ],
      action: { type: "move_to_cash" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio, 1), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });

  it("fires when all conditions are satisfied", () => {
    const portfolio = makePortfolio(5_000);
    const rule = makeRule({
      conditions: [
        cond("cash_balance", "gt", 3_000),  // true
        cond("days_elapsed", "gte", 10),    // true: index 12 >= 10
      ],
      action: { type: "move_to_cash" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio, 12), prices, [rule]);
    expect(firedRules).toHaveLength(1);
  });
});

// ── Strategy 1: Daily loss limit ──────────────────────────────────────────────
// Template: portfolio drops X% in a day → move everything to cash

describe("strategy: daily loss limit (move_to_cash)", () => {
  it("fires move_to_cash when portfolio drops 5% in a day", () => {
    const portfolio = makePortfolio(9_400); // from $10k → $9.4k = −6%
    const history = [makeSnapshot(10_000)];
    const rule = makeRule({
      label: "Daily loss limit",
      conditions: [cond("portfolio_change_pct", "lte", -5)],
      action: { type: "move_to_cash" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules, tradeOrders } = evaluateRules(makeState(portfolio, 1, history), prices, [rule]);

    expect(firedRules).toHaveLength(1);
    expect(firedRules[0].label).toBe("Daily loss limit");
    expect(tradeOrders[0].action).toBe("move_to_cash");
  });

  it("does not fire when loss is smaller than threshold", () => {
    const portfolio = makePortfolio(9_700); // −3%
    const history = [makeSnapshot(10_000)];
    const rule = makeRule({
      conditions: [cond("portfolio_change_pct", "lte", -5)],
      action: { type: "move_to_cash" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio, 1, history), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });
});

// ── Strategy 2: Take profit ───────────────────────────────────────────────────
// Template: position up X% → sell_all

describe("strategy: take profit (sell_all when position up)", () => {
  it("fires sell_all when position has gained more than threshold", () => {
    // AAPL: prev snapshot $1000, current $1600 = +60%
    const portfolio = makePortfolio(0, [makePosition("AAPL", 16, 100)]);
    portfolio.positions[0].currentValue = 1_600;
    const history = [makeSnapshot(10_000, [{ ticker: "AAPL", value: 1_000 }])];
    const rule = makeRule({
      label: "Take profit AAPL",
      conditions: [cond("position_change_pct", "gte", 50, "AAPL")],
      action: { type: "sell_all", ticker: "AAPL" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules, tradeOrders } = evaluateRules(makeState(portfolio, 1, history), prices, [rule]);

    expect(firedRules).toHaveLength(1);
    expect(tradeOrders[0]).toMatchObject({ action: "sell_all", ticker: "AAPL" });
  });

  it("does not fire when gain is below threshold", () => {
    const portfolio = makePortfolio(0, [makePosition("AAPL", 12, 100)]);
    portfolio.positions[0].currentValue = 1_200; // +20%
    const history = [makeSnapshot(10_000, [{ ticker: "AAPL", value: 1_000 }])];
    const rule = makeRule({
      conditions: [cond("position_change_pct", "gte", 50, "AAPL")],
      action: { type: "sell_all", ticker: "AAPL" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio, 1, history), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });
});

// ── Strategy 3: Cut losses ────────────────────────────────────────────────────
// Template: position down X% → sell_all

describe("strategy: cut losses (sell_all when position down)", () => {
  it("fires sell_all when position has dropped past threshold", () => {
    // AAPL: prev snapshot $1000, current $750 = −25%
    const portfolio = makePortfolio(0, [makePosition("AAPL", 10, 75)]);
    portfolio.positions[0].currentValue = 750;
    const history = [makeSnapshot(10_000, [{ ticker: "AAPL", value: 1_000 }])];
    const rule = makeRule({
      label: "Cut losses AAPL",
      conditions: [cond("position_change_pct", "lte", -20, "AAPL")],
      action: { type: "sell_all", ticker: "AAPL" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules, tradeOrders } = evaluateRules(makeState(portfolio, 1, history), prices, [rule]);

    expect(firedRules).toHaveLength(1);
    expect(tradeOrders[0]).toMatchObject({ action: "sell_all", ticker: "AAPL" });
  });

  it("does not fire when loss is smaller than threshold", () => {
    // −10% only
    const portfolio = makePortfolio(0, [makePosition("AAPL", 10, 90)]);
    portfolio.positions[0].currentValue = 900;
    const history = [makeSnapshot(10_000, [{ ticker: "AAPL", value: 1_000 }])];
    const rule = makeRule({
      conditions: [cond("position_change_pct", "lte", -20, "AAPL")],
      action: { type: "sell_all", ticker: "AAPL" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio, 1, history), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });

  it("never fires if the position is not held (condition returns null)", () => {
    // No AAPL in portfolio at all
    const portfolio = makePortfolio(10_000);
    const rule = makeRule({
      conditions: [cond("position_change_pct", "lte", -20, "AAPL")],
      action: { type: "sell_all", ticker: "AAPL" },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });
});

// ── Strategy 4: Trim oversized position ──────────────────────────────────────
// Template: position weight > X% → sell_pct Y%

describe("strategy: trim oversized position (sell_pct when weight high)", () => {
  it("fires sell_pct when position exceeds weight threshold", () => {
    // AAPL $6k out of $10k = 60%, threshold = 50%
    const portfolio = makePortfolio(4_000, [makePosition("AAPL", 60, 100)]);
    const rule = makeRule({
      label: "Trim AAPL",
      conditions: [cond("position_weight_pct", "gte", 50, "AAPL")],
      action: { type: "sell_pct", ticker: "AAPL", pct: 25 },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules, tradeOrders } = evaluateRules(makeState(portfolio), prices, [rule]);

    expect(firedRules).toHaveLength(1);
    expect(tradeOrders[0]).toMatchObject({ action: "sell_pct", ticker: "AAPL" });
    // quantity carries the percentage (25) for sell_pct
    expect(tradeOrders[0].quantity).toBe(25);
  });

  it("does not fire when position is within weight limit", () => {
    // AAPL $3k out of $10k = 30%
    const portfolio = makePortfolio(7_000, [makePosition("AAPL", 30, 100)]);
    const rule = makeRule({
      conditions: [cond("position_weight_pct", "gte", 50, "AAPL")],
      action: { type: "sell_pct", ticker: "AAPL", pct: 25 },
    });
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 300]);
    const { firedRules } = evaluateRules(makeState(portfolio), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });
});

// ── Strategy 5: Buy the dip ───────────────────────────────────────────────────
// Template: market drops X% in a day → buy ticker $Y

describe("strategy: buy the dip (buy when market drops)", () => {
  it("fires buy order when market drops past threshold", () => {
    // SPY: $300 → $285 = −5%
    const portfolio = makePortfolio(10_000);
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 285]);
    const rule = makeRule({
      label: "Buy GLD dip",
      conditions: [cond("market_change_pct", "lte", -3)],
      action: { type: "buy", ticker: "GLD", amount: 2_000 },
    });
    const { firedRules, tradeOrders } = evaluateRules(makeState(portfolio, 1), prices, [rule]);

    expect(firedRules).toHaveLength(1);
    expect(tradeOrders[0]).toMatchObject({ action: "buy", ticker: "GLD", amount: 2_000 });
  });

  it("does not fire on a green day", () => {
    // SPY: $300 → $312 = +4%
    const portfolio = makePortfolio(10_000);
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 312]);
    const rule = makeRule({
      conditions: [cond("market_change_pct", "lte", -3)],
      action: { type: "buy", ticker: "GLD", amount: 2_000 },
    });
    const { firedRules } = evaluateRules(makeState(portfolio, 1), prices, [rule]);
    expect(firedRules).toHaveLength(0);
  });

  it("produces no trade order when cash is exhausted (buy handled at portfolio layer)", () => {
    // Rule fires and produces the order — whether the buy can execute is portfolio.ts's job.
    // evaluateRules only decides whether the rule fires and emits the order.
    const portfolio = makePortfolio(0); // no cash
    const prices = makePriceSeries("SPY", ["2020-01-01", "2020-01-02"], [300, 285]);
    const rule = makeRule({
      conditions: [cond("market_change_pct", "lte", -3)],
      action: { type: "buy", ticker: "GLD", amount: 2_000 },
    });
    const { firedRules, tradeOrders } = evaluateRules(makeState(portfolio, 1), prices, [rule]);

    // Rule fires (condition is met regardless of cash)
    expect(firedRules).toHaveLength(1);
    // Trade order is emitted — applyBuy will cap it to $0
    expect(tradeOrders).toHaveLength(1);
  });
});
