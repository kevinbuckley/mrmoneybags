// Layer 0: types — no imports from src/

export interface SimulationAnalytics {
  finalValue: number;
  startingValue: number;
  totalReturnPct: number;
  sharpeRatio: number;
  maxDrawdownPct: number; // negative number, e.g. -31.2
  annualizedVolatility: number; // e.g. 0.243 = 24.3%
  beta: number; // vs S&P 500
  bestDayReturn: number; // % gain
  bestDayDate: string;
  worstDayReturn: number; // % loss (negative)
  worstDayDate: string;
  totalManualTrades: number;
  totalRulesFired: number;
}
