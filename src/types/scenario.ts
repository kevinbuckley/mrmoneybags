// Layer 0: types — no imports from src/

export interface ScenarioEvent {
  date: string; // YYYY-MM-DD
  label: string; // short name, shown on chart
  description: string; // one-sentence description for tooltip
}

export interface Scenario {
  slug: string; // URL-safe, e.g. "2008-crisis"
  name: string; // display name
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description: string;
  snarkDescription: string; // snarky one-liner for UI cards
  color: "red" | "green" | "yellow";
  difficulty: "Easy" | "Hard" | "Brutal"; // subjective survivability rating
  riskFreeRate: number; // annualized decimal, e.g. 0.02
  events: ScenarioEvent[];
}
