// Layer 3: engine — rule evaluation
// NO React, NO Zustand imports allowed
// See docs/design-docs/rules-engine.md

import type { Rule, RuleCondition, RuleOperator } from "@/types/rules";
import type { SimulationState } from "@/types/simulation";
import type { TradeOrder } from "@/types/portfolio";
import type { PriceDataMap, PriceSeries } from "@/types/instrument";

export interface RuleEvaluationResult {
  firedRules: Rule[];
  tradeOrders: TradeOrder[];
  updatedRules: Rule[]; // rules with firedCount / lastFiredDate updated
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFirstSeries(priceData: PriceDataMap): PriceSeries | undefined {
  return priceData.values().next().value as PriceSeries | undefined;
}

/** Find the series index for a given date string. */
function dateToIndex(priceData: PriceDataMap, date: string): number {
  const series = getFirstSeries(priceData);
  if (!series) return -1;
  return series.findIndex((p) => p.date === date);
}

function compare(value: number, operator: RuleOperator, threshold: number): boolean {
  switch (operator) {
    case "gt":  return value > threshold;
    case "lt":  return value < threshold;
    case "gte": return value >= threshold;
    case "lte": return value <= threshold;
  }
}

// ── Condition evaluation ──────────────────────────────────────────────────────

function getConditionValue(
  condition: RuleCondition,
  state: SimulationState,
  priceData: PriceDataMap
): number | null {
  const { portfolio, history, currentDateIndex } = state;
  const prevSnapshot = history[history.length - 1];

  switch (condition.subject) {
    case "portfolio_value":
      return portfolio.totalValue;

    case "cash_balance":
      return portfolio.cashBalance;

    case "days_elapsed":
      return currentDateIndex;

    case "portfolio_change_pct": {
      if (!prevSnapshot || prevSnapshot.totalValue === 0) return 0;
      return ((portfolio.totalValue - prevSnapshot.totalValue) / prevSnapshot.totalValue) * 100;
    }

    case "position_change_pct": {
      if (!condition.ticker) return null;
      const pos = portfolio.positions.find((p) => p.ticker === condition.ticker);
      if (!pos) return null;
      const prevPos = prevSnapshot?.positions.find((p) => p.ticker === condition.ticker);
      if (!prevPos || prevPos.value === 0) return 0;
      return ((pos.currentValue - prevPos.value) / prevPos.value) * 100;
    }

    case "position_weight_pct": {
      if (!condition.ticker) return null;
      const pos = portfolio.positions.find((p) => p.ticker === condition.ticker);
      if (!pos || portfolio.totalValue === 0) return 0;
      return (pos.currentValue / portfolio.totalValue) * 100;
    }

    case "market_change_pct": {
      // Use SPY as benchmark; fall back to first available series
      const series = priceData.get("SPY") ?? getFirstSeries(priceData);
      if (!series || currentDateIndex <= 0) return 0;
      const currIdx = Math.min(currentDateIndex, series.length - 1);
      const prevIdx = Math.min(currentDateIndex - 1, series.length - 1);
      const curr = series[currIdx]?.close;
      const prev = series[prevIdx]?.close;
      if (!curr || !prev || prev === 0) return 0;
      return ((curr - prev) / prev) * 100;
    }

    case "trailing_stop_pct": {
      // % drop of ticker from its peak close price since simulation start (positive = fallen)
      if (!condition.ticker) return null;
      const series = priceData.get(condition.ticker);
      if (!series) return null;
      const currIdx = Math.min(currentDateIndex, series.length - 1);
      const currentClose = series[currIdx]?.close;
      if (!currentClose) return null;
      let peak = 0;
      for (let i = 0; i <= currIdx; i++) {
        const c = series[i]?.close ?? 0;
        if (c > peak) peak = c;
      }
      if (peak === 0) return 0;
      return ((peak - currentClose) / peak) * 100;
    }

    case "position_return_pct": {
      // Cumulative % return of a position since entry (positive = profit)
      if (!condition.ticker) return null;
      const pos = portfolio.positions.find((p) => p.ticker === condition.ticker);
      if (!pos || pos.entryPrice === 0) return null;
      return ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
    }
  }
}

function allConditionsMet(
  conditions: RuleCondition[],
  state: SimulationState,
  priceData: PriceDataMap
): boolean {
  if (conditions.length === 0) return false;
  return conditions.every((c) => {
    const val = getConditionValue(c, state, priceData);
    if (val === null) return false;
    return compare(val, c.operator, c.value);
  });
}

// ── Cooldown check ────────────────────────────────────────────────────────────

function isOnCooldown(
  rule: Rule,
  state: SimulationState,
  priceData: PriceDataMap
): boolean {
  if (!rule.lastFiredDate) return false;
  const lastFiredIdx = dateToIndex(priceData, rule.lastFiredDate);
  if (lastFiredIdx < 0) return false;
  return state.currentDateIndex - lastFiredIdx < rule.cooldownTicks;
}

// ── Action → TradeOrder ───────────────────────────────────────────────────────

function ruleToTradeOrder(rule: Rule): TradeOrder | null {
  const { type, ticker, amount, pct } = rule.action;
  if ((type === "buy" || type === "sell_pct" || type === "sell_all") && !ticker) {
    return null;
  }
  return {
    ticker: ticker ?? "",
    action: type,
    amount: type === "buy" ? amount : undefined,
    // sell_pct uses quantity to carry the percentage (0–100)
    quantity: type === "sell_pct" ? (pct ?? 100) : undefined,
    // rebalance uses targetPct (0–1)
    targetPct: type === "rebalance" ? (pct !== undefined ? pct / 100 : undefined) : undefined,
    source: "rule",
    ruleId: rule.id,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Evaluate all enabled rules against current state. Returns fired rules, trade orders, and updated rule metadata. */
export function evaluateRules(
  state: SimulationState,
  priceData: PriceDataMap,
  rules: Rule[]
): RuleEvaluationResult {
  const firedRules: Rule[] = [];
  const tradeOrders: TradeOrder[] = [];
  const firstSeries = getFirstSeries(priceData);
  const currentDate =
    firstSeries?.[Math.min(state.currentDateIndex, (firstSeries?.length ?? 1) - 1)]?.date ?? "";

  const updatedRules = rules.map((rule) => {
    if (!rule.enabled) return rule;
    if (isOnCooldown(rule, state, priceData)) return rule;
    if (!allConditionsMet(rule.conditions, state, priceData)) return rule;

    firedRules.push(rule);
    const order = ruleToTradeOrder(rule);
    if (order) tradeOrders.push(order);

    return { ...rule, firedCount: rule.firedCount + 1, lastFiredDate: currentDate };
  });

  return { firedRules, tradeOrders, updatedRules };
}
