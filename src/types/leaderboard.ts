// Layer 0: types — no imports from src/

export interface LeaderboardEntry {
  id: string;
  scenarioSlug: string;
  scenarioName: string;
  startingCapital: number;
  finalValue: number;
  returnPct: number;
  instruments: string[]; // tickers used
  simulatedAt: string; // ISO date string
}
