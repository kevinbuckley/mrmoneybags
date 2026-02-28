// Layer 3: engine — core simulation tick function
// NO React, NO Zustand imports allowed
// See docs/design-docs/simulation-engine.md

import type { SimulationState } from "@/types/simulation";
import type { PriceDataMap, PriceSeries } from "@/types/instrument";
import type { TradeOrder, PortfolioSnapshot, PositionSnapshot } from "@/types/portfolio";
import type { NarratorEvent } from "@/types/narrator";

import { applyTrade, recomputeValues } from "./portfolio";
import { evaluateRules } from "./rules";
import { recomputeOptionValue, isExpiring, expiryIntrinsicValue } from "./options";
import { generateNarratorEvent } from "@/lib/narrator";

// ── Date helpers ──────────────────────────────────────────────────────────────

function getPrimarySeries(priceData: PriceDataMap): PriceSeries | null {
  let longest: PriceSeries | null = null;
  for (const series of priceData.values()) {
    if (!longest || series.length > longest.length) longest = series;
  }
  return longest;
}

function getDateAtIndex(priceData: PriceDataMap, index: number): string | null {
  const series = getPrimarySeries(priceData);
  return series?.[index]?.date ?? null;
}

function getSeriesLength(priceData: PriceDataMap): number {
  return getPrimarySeries(priceData)?.length ?? 0;
}

// ── Snapshot builder ──────────────────────────────────────────────────────────

function buildSnapshot(
  state: SimulationState,
  date: string,
  prevSnapshot: PortfolioSnapshot | null
): PortfolioSnapshot {
  const { portfolio } = state;
  const prevTotal = prevSnapshot?.totalValue ?? portfolio.startingValue;
  const dayReturn = prevTotal > 0 ? (portfolio.totalValue - prevTotal) / prevTotal : 0;
  const cumulativeReturn = portfolio.startingValue > 0
    ? (portfolio.totalValue - portfolio.startingValue) / portfolio.startingValue
    : 0;

  const positions: PositionSnapshot[] = portfolio.positions.map((pos) => {
    const prevPos = prevSnapshot?.positions.find((p) => p.ticker === pos.ticker);
    const prevValue = prevPos?.value ?? pos.entryPrice * pos.quantity;
    const posReturn = prevValue > 0 ? (pos.currentValue - prevValue) / prevValue : 0;
    return {
      ticker: pos.ticker,
      value: pos.currentValue,
      quantity: pos.quantity,
      closePrice: pos.currentPrice,
      dayReturn: posReturn,
      projected: false,
    };
  });

  return {
    date,
    totalValue: portfolio.totalValue,
    cashBalance: portfolio.cashBalance,
    positions,
    dayReturn,
    cumulativeReturn,
    projected: false,
  };
}

// ── Narrator events ───────────────────────────────────────────────────────────

function makeEvent(
  trigger: Parameters<typeof generateNarratorEvent>[0],
  ctx: Parameters<typeof generateNarratorEvent>[1],
  date: string
): NarratorEvent {
  // Override timestamp with simulation date instead of real-world time
  return { ...generateNarratorEvent(trigger, ctx), timestamp: date };
}

function gatherNarratorEvents(
  state: SimulationState,
  prevSnapshot: PortfolioSnapshot | null,
  firedRuleNames: string[],
  date: string,
  scenarioName: string
): NarratorEvent[] {
  const events: NarratorEvent[] = [];
  const { portfolio } = state;

  // Portfolio new high
  if (state.history.length > 0) {
    const portfolioHigh = Math.max(...state.history.map((s) => s.totalValue));
    if (portfolio.totalValue > portfolioHigh) {
      events.push(makeEvent("portfolio_new_high", { portfolioValue: portfolio.totalValue, scenario: scenarioName }, date));
    }
  }

  // Per-position change triggers
  if (prevSnapshot) {
    for (const pos of portfolio.positions) {
      const prevPos = prevSnapshot.positions.find((p) => p.ticker === pos.ticker);
      if (!prevPos || prevPos.value === 0) continue;
      const pct = (pos.currentValue - prevPos.value) / prevPos.value;
      const ctx = { ticker: pos.ticker, changePct: pct, scenario: scenarioName };

      if (pct <= -0.25) {
        events.push(makeEvent("position_down_25", ctx, date));
      } else if (pct <= -0.10) {
        events.push(makeEvent("position_down_10", ctx, date));
      } else if (pct >= 0.25) {
        events.push(makeEvent("position_up_25", ctx, date));
      } else if (pct >= 0.10) {
        events.push(makeEvent("position_up_10", ctx, date));
      }
    }
  }

  // Rule fired events
  for (const ruleName of firedRuleNames) {
    events.push(makeEvent("rule_fired", { ruleName, scenario: scenarioName }, date));
  }

  return events;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Advance the simulation by one tick (one trading day).
 * Pure function: same inputs → same outputs.
 *
 * Tick order:
 * 1. Get current date from primary series
 * 2. Apply pending trades at open prices
 * 3. Evaluate rules → gather triggered trade orders
 * 4. Apply rule trades at open prices
 * 5. Revalue options; settle expiring ones at intrinsic value
 * 6. Recompute equity/etf/crypto positions at close prices
 * 7. Build PortfolioSnapshot
 * 8. Generate narrator events
 * 9. Advance currentDateIndex; set isComplete
 */
export function advanceTick(
  state: SimulationState,
  priceData: PriceDataMap,
  pendingTrades?: TradeOrder[]
): SimulationState {
  const date = getDateAtIndex(priceData, state.currentDateIndex);
  if (!date) return { ...state, isComplete: true };

  const scenarioName = state.config.scenario.name;
  const riskFreeRate = state.config.scenario.riskFreeRate;
  const allTrades = [...(state.pendingTrades ?? []), ...(pendingTrades ?? [])];

  // 1. Apply pending trades at open
  let portfolio = state.portfolio;
  for (const order of allTrades) {
    portfolio = applyTrade(portfolio, order, priceData, date);
  }

  // 2. Evaluate rules (using portfolio-after-trades as current state)
  const { tradeOrders: ruleTrades, firedRules, updatedRules } = evaluateRules(
    { ...state, portfolio },
    priceData,
    state.config.rules
  );

  // 3. Apply rule trades at open
  for (const order of ruleTrades) {
    portfolio = applyTrade(portfolio, order, priceData, date);
  }

  // 4. Revalue and settle options
  portfolio = {
    ...portfolio,
    positions: portfolio.positions.map((pos) => {
      if (pos.type !== "option" || !pos.optionConfig) return pos;
      const underlyingSeries = priceData.get(pos.optionConfig.underlying);
      if (!underlyingSeries) return pos;

      if (isExpiring(pos, date)) {
        const underlyingClose = underlyingSeries[state.currentDateIndex]?.close ?? 0;
        const intrinsic = expiryIntrinsicValue(pos, underlyingClose);
        return { ...pos, currentPrice: pos.quantity > 0 ? intrinsic / pos.quantity : 0, currentValue: intrinsic };
      }

      const newValue = recomputeOptionValue(pos, underlyingSeries, state.currentDateIndex, riskFreeRate);
      return { ...pos, currentValue: newValue };
    }),
  };

  // 5. Recompute equity/etf/crypto at close
  portfolio = recomputeValues(portfolio, priceData, state.currentDateIndex);

  // 6. Build snapshot
  const prevSnapshot = state.history[state.history.length - 1] ?? null;
  const snapshot = buildSnapshot({ ...state, portfolio }, date, prevSnapshot);

  // 7. Narrator events
  const narratorEvents = gatherNarratorEvents(
    { ...state, portfolio },
    prevSnapshot,
    firedRules.map((r) => r.label),
    date,
    scenarioName
  );

  // 8. Rules log
  const newRulesLog = firedRules.map((r) => ({
    ruleId: r.id,
    ruleName: r.label,
    date,
    triggerDescription: r.conditions.map((c) => `${c.subject} ${c.operator} ${c.value}`).join(" AND "),
    actionDescription: `${r.action.type}${r.action.ticker ? " " + r.action.ticker : ""}`,
  }));

  // 9. Advance
  const nextIndex = state.currentDateIndex + 1;
  const isComplete = nextIndex >= getSeriesLength(priceData);

  return {
    ...state,
    currentDateIndex: nextIndex,
    portfolio,
    history: [...state.history, snapshot],
    rulesLog: [...state.rulesLog, ...newRulesLog],
    narratorQueue: [...state.narratorQueue, ...narratorEvents],
    pendingTrades: [],
    isComplete,
    config: { ...state.config, rules: updatedRules },
  };
}

export function getCurrentDate(
  state: SimulationState,
  priceData: PriceDataMap
): string | null {
  return getDateAtIndex(priceData, state.currentDateIndex);
}
