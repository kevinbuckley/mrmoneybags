// Layer 2: data — static scenario definitions

import type { Scenario } from "@/types/scenario";

export const SCENARIOS: Scenario[] = [
  {
    slug: "2008-crisis",
    name: "2008 Financial Crisis",
    startDate: "2008-01-02",
    endDate: "2009-03-31",
    description: "The collapse of the US housing market triggered a global financial crisis.",
    snarkDescription: "Banks go boom. Everyone suffers.",
    color: "red",
    difficulty: "Brutal",
    riskFreeRate: 0.02,
    events: [
      { date: "2008-03-14", label: "Bear Stearns", description: "Bear Stearns collapses, rescued by JP Morgan." },
      { date: "2008-09-15", label: "Lehman Bankrupt", description: "Lehman Brothers files for bankruptcy." },
      { date: "2008-09-29", label: "TARP Rejected", description: "House rejects $700B bailout package; Dow drops 778 points." },
      { date: "2008-10-03", label: "TARP Signed", description: "Emergency Economic Stabilization Act signed into law." },
      { date: "2009-03-09", label: "Market Bottom", description: "S&P 500 hits cycle low of 676." },
    ],
  },
  {
    slug: "dotcom-bubble",
    name: "Dot-com Bubble",
    startDate: "2000-01-03",
    endDate: "2002-10-09",
    description: "The tech bubble burst as internet companies collapsed.",
    snarkDescription: "Tech goes to the moon, then the floor.",
    color: "red",
    difficulty: "Hard",
    riskFreeRate: 0.055,
    events: [
      { date: "2000-03-10", label: "NASDAQ Peak", description: "NASDAQ hits all-time high of 5,048." },
      { date: "2001-09-11", label: "9/11 Attacks", description: "Markets close for 4 days; reopen sharply lower." },
    ],
  },
  {
    slug: "black-monday",
    name: "Black Monday (1987)",
    startDate: "1987-10-01",
    endDate: "1987-10-31",
    description: "The Dow fell 22.6% in a single day — the largest single-day crash in history.",
    snarkDescription: "One very bad Monday.",
    color: "red",
    difficulty: "Hard",
    riskFreeRate: 0.06,
    events: [
      { date: "1987-10-19", label: "Black Monday", description: "Dow Jones drops 22.6% in a single session." },
    ],
  },
  {
    slug: "covid-crash",
    name: "COVID Crash + Recovery",
    startDate: "2020-01-02",
    endDate: "2020-12-31",
    description: "Markets crashed 34% in 33 days, then staged a historic recovery.",
    snarkDescription: "The world ends. Then doesn't.",
    color: "yellow",
    difficulty: "Hard",
    riskFreeRate: 0.005,
    events: [
      { date: "2020-02-19", label: "Market Peak", description: "S&P 500 hits pre-crash all-time high." },
      { date: "2020-03-23", label: "Market Bottom", description: "S&P 500 bottoms at -34% from peak." },
      { date: "2020-03-27", label: "CARES Act", description: "$2.2 trillion stimulus package signed." },
      { date: "2020-11-09", label: "Vaccine News", description: "Pfizer announces 90%+ effective vaccine." },
    ],
  },
  {
    slug: "2021-bull-run",
    name: "2020–2021 Bull Run",
    startDate: "2020-04-01",
    endDate: "2021-11-30",
    description: "The fastest bull market recovery in history, fueled by stimulus and meme stocks.",
    snarkDescription: "Number only go up. For a while.",
    color: "green",
    difficulty: "Easy",
    riskFreeRate: 0.0025,
    events: [
      { date: "2021-01-27", label: "GME Squeeze", description: "GameStop short squeeze peaks; WSB goes mainstream." },
      { date: "2021-11-08", label: "S&P ATH", description: "S&P 500 hits all-time high above 4,700." },
    ],
  },
  {
    slug: "2022-crypto-winter",
    name: "2022 Crypto Winter",
    startDate: "2022-01-03",
    endDate: "2022-12-31",
    description: "Crypto markets lost $2 trillion in value. LUNA went to zero. FTX collapsed.",
    snarkDescription: "LUNA goes to actual zero.",
    color: "red",
    difficulty: "Brutal",
    riskFreeRate: 0.03,
    events: [
      { date: "2022-05-12", label: "LUNA Collapse", description: "TerraUSD and LUNA collapse to near zero." },
      { date: "2022-11-11", label: "FTX Bankrupt", description: "FTX files for bankruptcy; Sam Bankman-Fried arrested." },
    ],
  },
];

export function getScenario(slug: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.slug === slug);
}
