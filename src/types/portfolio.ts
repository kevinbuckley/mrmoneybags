// Layer 0: types — no imports from src/

import type { InstrumentType, OptionConfig, LeveragedConfig, DispersionConfig } from "./instrument";

export interface Position {
  id: string;
  ticker: string;
  name: string;
  type: InstrumentType;
  quantity: number; // shares / contracts / units
  entryPrice: number; // price per unit at time of purchase
  entryDate: string; // YYYY-MM-DD
  currentPrice: number;
  currentValue: number;
  // For complex instruments
  optionConfig?: OptionConfig;
  leveragedConfig?: LeveragedConfig;
  dispersionConfig?: DispersionConfig;
}

export interface Portfolio {
  positions: Position[];
  cashBalance: number; // in dollars
  totalValue: number; // cash + all position values
  startingValue: number; // value at simulation start
}

export interface PositionSnapshot {
  ticker: string;
  value: number;
  quantity: number;
  closePrice: number;
  dayReturn: number; // % vs previous tick
  projected: boolean;
}

export interface PortfolioSnapshot {
  date: string;
  totalValue: number;
  cashBalance: number;
  positions: PositionSnapshot[];
  dayReturn: number; // % vs previous tick
  cumulativeReturn: number; // % vs starting value
  projected: boolean;
}

export interface TradeOrder {
  ticker: string;
  action:
    | "buy"
    | "sell_pct"
    | "sell_all"
    | "rebalance"
    | "move_to_cash"
    /** Write a cash-secured put; creates short option position, credits premium to cash */
    | "sell_put"
    /** Buy back an open short option at its current market value */
    | "close_option";
  amount?: number;    // dollar amount (for buy)
  quantity?: number;  // units (for sell); also 0-100 pct for sell_pct
  targetPct?: number; // 0-1 (for rebalance)
  source: "manual" | "rule";
  ruleId?: string;
  // Options-specific fields (sell_put / close_option)
  strike?: number;        // strike price
  expiryDate?: string;    // YYYY-MM-DD expiry
  numContracts?: number;  // number of 100-share contracts (default 1)
  premium?: number;       // total $ premium pre-computed by the UI
}

// Initial portfolio setup from the wizard
export interface PortfolioAllocation {
  ticker: string;
  pct: number; // 0-100
}
