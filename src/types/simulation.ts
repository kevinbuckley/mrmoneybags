// Layer 0: types — no imports from src/

import type { Portfolio, PortfolioSnapshot, TradeOrder } from "./portfolio";
import type { Scenario } from "./scenario";
import type { PortfolioAllocation } from "./portfolio";
import type { Rule } from "./rules";

export type PlaybackMode = "movie" | "step";
export type TimeGranularity = "daily" | "weekly" | "monthly";
export type PlaybackSpeed = 1 | 5 | 10;

export interface SimulationConfig {
  startingCapital: number;
  scenario: Scenario;
  allocations: PortfolioAllocation[];
  rules: Rule[];
  mode: PlaybackMode;
  granularity: TimeGranularity;
}

export interface SimulationState {
  config: SimulationConfig;
  currentDateIndex: number; // index into the date series
  portfolio: Portfolio;
  history: PortfolioSnapshot[]; // one per past tick
  rulesLog: RuleFireEvent[];
  narratorQueue: import("./narrator").NarratorEvent[];
  pendingTrades: TradeOrder[];
  isComplete: boolean;
}

export interface RuleFireEvent {
  ruleId: string;
  ruleName: string;
  date: string;
  triggerDescription: string;
  actionDescription: string;
}
