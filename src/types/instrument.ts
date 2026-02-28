// Layer 0: types — no imports from src/

export type InstrumentType =
  | "stock"
  | "etf"
  | "crypto"
  | "bond"
  | "option"
  | "leveraged"
  | "short"
  | "dispersion";

export interface Instrument {
  ticker: string;
  name: string;
  type: InstrumentType;
  availableScenarios: string[];
  description: string;
  tags: string[];
}

export interface PricePoint {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  projected?: boolean;
}

export type PriceSeries = PricePoint[];

export type PriceDataMap = Map<string, PriceSeries>;

// Option-specific metadata
export type OptionType = "call" | "put";
export type OptionStrategy =
  | "long_call"
  | "long_put"
  | "covered_call"
  | "bull_call_spread"
  | "bear_put_spread"
  | "straddle"
  | "iron_condor"
  /** Writing (selling) a cash-secured put; premium received upfront */
  | "short_put";

export interface OptionConfig {
  underlying: string;
  strategy: OptionStrategy;
  type: OptionType;
  strike: number;
  expiryDate: string; // YYYY-MM-DD
  numContracts: number;
}

// Leveraged position metadata
export interface LeveragedConfig {
  underlying: string;
  multiplier: 2 | 3;
  direction: "long" | "short";
}

// Dispersion trade metadata
export interface DispersionConfig {
  index: string; // e.g. "SPY"
  components: string[]; // e.g. ["AAPL", "MSFT", "AMZN"]
  direction: "long" | "short"; // long = bet stocks diverge
  notional: number;
  benchmarkCorrelation: number; // computed at setup time
}
