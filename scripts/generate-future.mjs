#!/usr/bin/env node
// scripts/generate-future.mjs
// Generates synthetic OHLCV price data for "The Future" scenario using seeded GBM + event shocks.

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/data/the-future");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ── Seeded deterministic RNG (LCG) ────────────────────────────────────────────
let seed = 20260302;
function rand() {
  seed = Math.imul(seed, 1664525) + 1013904223;
  // Use unsigned right shift to get a positive 32-bit integer
  return ((seed >>> 0) / 0xFFFFFFFF);
}
function randN() {
  // Box-Muller transform → standard normal
  const u1 = rand() || 1e-10;
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Trading date generation (skip Sat/Sun) ─────────────────────────────────────
function generateTradingDates(startStr, count) {
  const dates = [];
  const d = new Date(startStr + "T12:00:00Z");
  while (dates.length < count) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

// ── GBM parameters (approximate starting prices for Mar 2026) ─────────────────
const INSTRUMENTS = {
  SPY:  { start: 580,   mu: 0.10, sigma: 0.16 },
  QQQ:  { start: 490,   mu: 0.12, sigma: 0.20 },
  NVDA: { start: 125,   mu: 0.22, sigma: 0.48 },
  AAPL: { start: 240,   mu: 0.10, sigma: 0.24 },
  MSFT: { start: 415,   mu: 0.12, sigma: 0.22 },
  AMZN: { start: 225,   mu: 0.13, sigma: 0.24 },
  TSLA: { start: 280,   mu: 0.08, sigma: 0.58 },
  META: { start: 660,   mu: 0.14, sigma: 0.30 },
  BTC:  { start: 87000, mu: 0.28, sigma: 0.72 },
  ETH:  { start: 3100,  mu: 0.22, sigma: 0.78 },
  TLT:  { start: 87,    mu: -0.01, sigma: 0.10 },
  GLD:  { start: 295,   mu: 0.06, sigma: 0.13 },
};

// ── Events (day index → per-ticker price multiplier applied at close) ──────────
// Day index 0 = first trading day (2026-03-02)
const EVENTS = [
  {
    dayIndex: 12,
    label: "Fed Surprise Cut",
    description: "Fed cuts rates 50bps in an emergency session — first cut in two years.",
    tickers: { SPY: 1.025, QQQ: 1.030, TLT: 1.055, AAPL: 1.015, MSFT: 1.015, AMZN: 1.012 },
  },
  {
    dayIndex: 38,
    label: "AGI Breakthrough",
    description: "OpenAI announces AGI milestone; NVDA, MSFT soar on AI infrastructure demand.",
    tickers: { NVDA: 1.14, MSFT: 1.09, AAPL: 1.05, QQQ: 1.075, SPY: 1.035, META: 1.07, AMZN: 1.04 },
  },
  {
    dayIndex: 58,
    label: "Flash Crash",
    description: "Algorithmic cascade wipes 9% off major indices intraday; recovery partial.",
    tickers: { SPY: 0.910, QQQ: 0.890, NVDA: 0.870, BTC: 0.850, ETH: 0.830, AAPL: 0.920, MSFT: 0.910, TSLA: 0.875, META: 0.895, TLT: 1.030, GLD: 1.045 },
  },
  {
    dayIndex: 82,
    label: "Spot ETH ETF Approved",
    description: "SEC approves spot Ethereum ETFs; crypto inflows hit record $4B in one day.",
    tickers: { BTC: 1.18, ETH: 1.32, SPY: 1.010 },
  },
  {
    dayIndex: 105,
    label: "AI Regulation Act",
    description: "US-EU joint AI framework passes; compute export controls tighten.",
    tickers: { NVDA: 0.895, META: 0.905, AAPL: 0.955, MSFT: 0.945, QQQ: 0.955, SPY: 0.978 },
  },
  {
    dayIndex: 133,
    label: "Energy Shock",
    description: "Middle East pipeline disruption spikes oil 30%; broad market selloff.",
    tickers: { SPY: 0.945, QQQ: 0.935, GLD: 1.085, TLT: 1.020, BTC: 0.928, ETH: 0.908, TSLA: 0.910 },
  },
  {
    dayIndex: 158,
    label: "Quantum Computing Leap",
    description: "IBM demonstrates 10,000-qubit fault-tolerant chip; encryption stocks crater.",
    tickers: { MSFT: 1.095, AAPL: 1.060, QQQ: 1.040, SPY: 1.020, NVDA: 1.072 },
  },
  {
    dayIndex: 178,
    label: "Dollar Liquidity Crisis",
    description: "US Treasury auction fails; dollar index drops 4% — gold and BTC surge.",
    tickers: { GLD: 1.145, BTC: 1.165, ETH: 1.12, TLT: 0.935, SPY: 0.965, QQQ: 0.958 },
  },
  {
    dayIndex: 205,
    label: "Election Night Shock",
    description: "Surprise election result triggers 8% overnight swing; volatility index hits 60.",
    tickers: { SPY: 0.928, QQQ: 0.920, TSLA: 1.165, META: 0.882, TLT: 0.955, GLD: 1.065 },
  },
  {
    dayIndex: 223,
    label: "Year-End Rally",
    description: "Window dressing and low liquidity push markets to new highs into year-end.",
    tickers: { SPY: 1.032, QQQ: 1.038, NVDA: 1.055, AAPL: 1.022, MSFT: 1.022, META: 1.042 },
  },
  {
    dayIndex: 238,
    label: "Crypto Winter II",
    description: "Stablecoin issuer insolvency triggers cascade: BTC -28%, ETH -32% in 48 hours.",
    tickers: { BTC: 0.720, ETH: 0.680, SPY: 0.978, QQQ: 0.970, TSLA: 0.940 },
  },
  {
    dayIndex: 247,
    label: "Big Tech Earnings Blowout",
    description: "NVDA, AAPL, MSFT all beat by 40%+ — AI monetisation finally prints money.",
    tickers: { NVDA: 1.105, AAPL: 1.065, MSFT: 1.072, META: 1.082, QQQ: 1.052, SPY: 1.026 },
  },
];

// ── Generate ───────────────────────────────────────────────────────────────────
const TRADING_DAYS = 252;
const START_DATE = "2026-03-02";
const dates = generateTradingDates(START_DATE, TRADING_DAYS);
const dt = 1 / 252;

// Build shock map: dayIndex → tickers
const shockMap = new Map(EVENTS.map((e) => [e.dayIndex, e.tickers]));

for (const [ticker, params] of Object.entries(INSTRUMENTS)) {
  const { start, mu, sigma } = params;
  const data = [];
  let prevClose = start;

  for (let i = 0; i < TRADING_DAYS; i++) {
    const z = randN();
    const ret = (mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z;
    let close = prevClose * Math.exp(ret);

    // Apply event shock
    const shocks = shockMap.get(i);
    if (shocks?.[ticker]) close = close * shocks[ticker];

    // Clamp to reasonable minimum (crypto can fall a lot)
    close = Math.max(close, 0.01);

    // Intraday OHLCV derived from close
    const dayVol = sigma * Math.sqrt(dt);
    const open  = prevClose * Math.exp(randN() * dayVol * 0.4);
    const noise = Math.abs(randN()) * dayVol;
    const high  = Math.max(open, close) * (1 + noise * 0.6);
    const low   = Math.min(open, close) * (1 - noise * 0.6);
    const volume = Math.round(1e6 * (0.5 + Math.abs(randN()) * 1.5));

    data.push({
      date:   dates[i],
      open:   +open.toFixed(2),
      high:   +high.toFixed(2),
      low:    +low.toFixed(2),
      close:  +close.toFixed(2),
      volume,
    });

    prevClose = close;
  }

  writeFileSync(join(OUT_DIR, `${ticker}.json`), JSON.stringify(data, null, 2));
  const last = data[data.length - 1];
  const pct = ((last.close - start) / start * 100).toFixed(1);
  console.log(`  ✓ ${ticker.padEnd(5)} ${start.toFixed(2).padStart(8)} → ${last.close.toFixed(2).padStart(8)}  (${pct.padStart(7)}%)`);
}

// Print event dates for copy-paste into scenarios.ts
console.log("\n── Event dates ──────────────────────────────────────────────");
for (const e of EVENTS) {
  console.log(`  { date: "${dates[e.dayIndex]}", label: "${e.label}", description: "${e.description}" },`);
}
console.log(`\n✓ Start: ${dates[0]}  End: ${dates[dates.length - 1]}`);
console.log(`✓ ${Object.keys(INSTRUMENTS).length} files written to ${OUT_DIR}`);
