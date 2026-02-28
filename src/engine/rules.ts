// Layer 3: engine — rule evaluation
// NO React, NO Zustand imports allowed
// See docs/design-docs/rules-engine.md

import type { Rule, RuleCondition } from "@/types/rules";
import type { SimulationState } from "@/types/simulation";
import type { TradeOrder } from "@/types/portfolio";
import type { PriceDataMap } from "@/types/instrument";

export interface RuleEvaluationResult {
  firedRules: Rule[];
  tradeOrders: TradeOrder[];
}

/** Evaluate all enabled rules against current state */
export function evaluateRules(
  state: SimulationState,
  priceData: PriceDataMap,
  rules: Rule[]
): RuleEvaluationResult {
  // TODO: implement full rule evaluation
  const firedRules: Rule[] = [];
  const tradeOrders: TradeOrder[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (isOnCooldown(rule, state.currentDateIndex)) continue;
    if (allConditionsMet(rule.conditions, state, priceData)) {
      firedRules.push(rule);
      // TODO: convert rule.action to TradeOrder
    }
  }

  return { firedRules, tradeOrders };
}

function isOnCooldown(_rule: Rule, _currentIndex: number): boolean {
  // TODO: track last fired index and compare against cooldownTicks
  return false;
}

function allConditionsMet(
  conditions: RuleCondition[],
  _state: SimulationState,
  _priceData: PriceDataMap
): boolean {
  // TODO: evaluate each condition against current state
  return conditions.length === 0;
}
