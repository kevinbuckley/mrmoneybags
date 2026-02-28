// Layer 0: types — no imports from src/

export type RuleSubject =
  | "position_change_pct"
  | "portfolio_change_pct"
  | "portfolio_value"
  | "position_weight_pct"
  | "cash_balance"
  | "market_change_pct"
  | "days_elapsed";

export type RuleOperator = "gt" | "lt" | "gte" | "lte";

export type RuleActionType =
  | "buy"
  | "sell_pct"
  | "sell_all"
  | "rebalance"
  | "move_to_cash";

export interface RuleCondition {
  subject: RuleSubject;
  operator: RuleOperator;
  value: number;
  ticker?: string; // required for position_change_pct, position_weight_pct
}

export interface RuleAction {
  type: RuleActionType;
  ticker?: string; // required for buy, sell_pct, sell_all
  amount?: number; // dollar amount for buy
  pct?: number; // 0-100 for sell_pct, move_to_cash
}

export interface Rule {
  id: string;
  label: string;
  enabled: boolean;
  conditions: RuleCondition[]; // max 3, all must be true (AND)
  action: RuleAction;
  firedCount: number;
  lastFiredDate?: string;
  cooldownTicks: number; // default 5
}
