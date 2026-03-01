// Layer 2: data — master instrument list

import type { Instrument } from "@/types/instrument";

export const INSTRUMENTS: Instrument[] = [
  // ETFs
  { ticker: "SPY", name: "SPDR S&P 500 ETF", type: "etf", availableScenarios: ["2008-crisis", "dotcom-bubble", "dotcom-recovery", "covid-crash", "2021-bull-run", "2022-crypto-winter", "2023-ai-boom", "the-future"], description: "Tracks the S&P 500 index", tags: ["index", "large-cap", "us"] },
  { ticker: "QQQ", name: "Invesco QQQ Trust", type: "etf", availableScenarios: ["2008-crisis", "dotcom-bubble", "dotcom-recovery", "covid-crash", "2021-bull-run", "2022-crypto-winter", "2023-ai-boom", "the-future"], description: "Tracks the NASDAQ-100", tags: ["index", "tech", "us"] },
  { ticker: "VTI", name: "Vanguard Total Stock Market ETF", type: "etf", availableScenarios: ["2008-crisis", "covid-crash", "2021-bull-run", "2022-crypto-winter"], description: "Total US stock market", tags: ["index", "us"] },
  { ticker: "IWM", name: "iShares Russell 2000 ETF", type: "etf", availableScenarios: ["2008-crisis", "covid-crash", "2021-bull-run", "2022-crypto-winter"], description: "Small-cap US stocks", tags: ["index", "small-cap", "us"] },
  { ticker: "GLD", name: "SPDR Gold Shares", type: "etf", availableScenarios: ["2008-crisis", "covid-crash", "2021-bull-run", "2022-crypto-winter", "the-future"], description: "Gold bullion ETF (launched 2004)", tags: ["commodity", "safe-haven"] },
  { ticker: "TLT", name: "iShares 20+ Year Treasury Bond ETF", type: "etf", availableScenarios: ["2008-crisis", "covid-crash", "2021-bull-run", "2022-crypto-winter", "the-future"], description: "Long-term US Treasuries", tags: ["bond", "safe-haven"] },
  { ticker: "TQQQ", name: "ProShares UltraPro QQQ", type: "leveraged", availableScenarios: ["covid-crash", "2021-bull-run", "2022-crypto-winter"], description: "3x leveraged NASDAQ-100", tags: ["leveraged", "tech"] },
  { ticker: "SQQQ", name: "ProShares UltraPro Short QQQ", type: "leveraged", availableScenarios: ["covid-crash", "2021-bull-run", "2022-crypto-winter"], description: "3x inverse NASDAQ-100", tags: ["leveraged", "inverse", "tech"] },
  // Stocks
  { ticker: "AAPL", name: "Apple Inc.", type: "stock", availableScenarios: ["2008-crisis", "dotcom-bubble", "dotcom-recovery", "covid-crash", "2021-bull-run", "2022-crypto-winter", "2023-ai-boom", "the-future"], description: "Consumer electronics and software", tags: ["tech", "large-cap"] },
  { ticker: "MSFT", name: "Microsoft Corporation", type: "stock", availableScenarios: ["2008-crisis", "dotcom-bubble", "dotcom-recovery", "covid-crash", "2021-bull-run", "2022-crypto-winter", "2023-ai-boom", "the-future"], description: "Software and cloud computing", tags: ["tech", "large-cap"] },
  { ticker: "AMZN", name: "Amazon.com Inc.", type: "stock", availableScenarios: ["2008-crisis", "dotcom-bubble", "dotcom-recovery", "covid-crash", "2021-bull-run", "2022-crypto-winter", "2023-ai-boom", "the-future"], description: "E-commerce and cloud services", tags: ["tech", "large-cap"] },
  { ticker: "TSLA", name: "Tesla Inc.", type: "stock", availableScenarios: ["covid-crash", "2021-bull-run", "2022-crypto-winter", "2023-ai-boom", "the-future"], description: "Electric vehicles and energy", tags: ["ev", "large-cap", "volatile"] },
  { ticker: "NVDA", name: "NVIDIA Corporation", type: "stock", availableScenarios: ["covid-crash", "2021-bull-run", "2022-crypto-winter", "2023-ai-boom", "the-future"], description: "GPUs and AI chips", tags: ["tech", "semiconductor", "ai"] },
  { ticker: "META", name: "Meta Platforms Inc.", type: "stock", availableScenarios: ["2023-ai-boom", "the-future"], description: "Social media and VR/AR; 'Year of Efficiency' turnaround", tags: ["tech", "large-cap", "ai"] },
  { ticker: "GME", name: "GameStop Corp.", type: "stock", availableScenarios: ["2021-bull-run"], description: "Video game retailer turned meme stock", tags: ["meme", "volatile"] },
  { ticker: "NFLX", name: "Netflix Inc.", type: "stock", availableScenarios: ["2008-crisis", "dotcom-recovery", "covid-crash", "2021-bull-run", "2022-crypto-winter", "2023-ai-boom"], description: "Streaming entertainment", tags: ["tech", "large-cap"] },
  { ticker: "JPM", name: "JPMorgan Chase & Co.", type: "stock", availableScenarios: ["2008-crisis", "covid-crash", "2021-bull-run", "2022-crypto-winter"], description: "Largest US bank", tags: ["financials", "large-cap"] },
  { ticker: "GS", name: "Goldman Sachs Group Inc.", type: "stock", availableScenarios: ["2008-crisis", "covid-crash", "2021-bull-run", "2022-crypto-winter"], description: "Investment banking", tags: ["financials", "large-cap"] },
  { ticker: "IBM", name: "International Business Machines", type: "stock", availableScenarios: ["black-monday"], description: "Blue-chip tech giant", tags: ["tech", "large-cap"] },
  // Crypto
  { ticker: "BTC", name: "Bitcoin", type: "crypto", availableScenarios: ["covid-crash", "2021-bull-run", "2022-crypto-winter", "the-future"], description: "The original cryptocurrency", tags: ["crypto", "volatile"] },
  { ticker: "ETH", name: "Ethereum", type: "crypto", availableScenarios: ["covid-crash", "2021-bull-run", "2022-crypto-winter", "the-future"], description: "Smart contract platform", tags: ["crypto", "volatile"] },
  { ticker: "DOGE", name: "Dogecoin", type: "crypto", availableScenarios: ["2021-bull-run", "2022-crypto-winter"], description: "The meme coin that became real", tags: ["crypto", "meme", "volatile"] },
  { ticker: "SOL", name: "Solana", type: "crypto", availableScenarios: ["2021-bull-run", "2022-crypto-winter"], description: "High-speed blockchain", tags: ["crypto", "volatile"] },
];

export function searchInstruments(query: string, scenario?: string): Instrument[] {
  const q = query.toLowerCase();
  return INSTRUMENTS.filter((inst) => {
    const matchesQuery =
      inst.ticker.toLowerCase().includes(q) ||
      inst.name.toLowerCase().includes(q) ||
      inst.tags.some((t) => t.toLowerCase().includes(q));
    const matchesScenario = !scenario || inst.availableScenarios.includes(scenario);
    return matchesQuery && matchesScenario;
  });
}

export function getInstrument(ticker: string): Instrument | undefined {
  return INSTRUMENTS.find((i) => i.ticker === ticker);
}
