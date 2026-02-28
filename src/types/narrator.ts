// Layer 0: types — no imports from src/

export type NarratorChannel = "chyron" | "popup";
export type NarratorSeverity = "info" | "warning" | "critical";

export type NarratorTrigger =
  | "position_up_10"
  | "position_down_10"
  | "position_up_25"
  | "position_down_25"
  | "portfolio_new_high"
  | "portfolio_new_low"
  | "rule_fired"
  | "manual_trade"
  | "option_expired_worthless"
  | "option_exercised"
  | "margin_call"
  | "scenario_event"
  | "simulation_start"
  | "simulation_complete"
  | "ambient";

export interface NarratorContext {
  ticker?: string;
  changePct?: number;
  portfolioValue?: number;
  portfolioChangePct?: number;
  ruleName?: string;
  scenario?: string;
  eventLabel?: string;
}

export interface NarratorEvent {
  id: string;
  channel: NarratorChannel;
  message: string;
  trigger: NarratorTrigger;
  severity: NarratorSeverity;
  timestamp: string; // YYYY-MM-DD simulation date
}
