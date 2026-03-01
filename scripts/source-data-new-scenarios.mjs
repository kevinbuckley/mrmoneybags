#!/usr/bin/env node
/**
 * scripts/source-data-new-scenarios.mjs
 * One-off fetch for 2023-ai-boom and dotcom-recovery scenarios.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'data');

const SCENARIOS = {
  '2023-ai-boom':     { startDate: '2023-01-01', endDate: '2024-12-31' },
  'dotcom-recovery':  { startDate: '2002-10-01', endDate: '2007-10-01' },
};

const INSTRUMENTS = [
  // 2023-ai-boom instruments
  { ticker: 'SPY',  yahoo: 'SPY',  name: 'SPDR S&P 500 ETF',         type: 'etf',   scenarios: ['2023-ai-boom'] },
  { ticker: 'QQQ',  yahoo: 'QQQ',  name: 'Invesco QQQ Trust',         type: 'etf',   scenarios: ['2023-ai-boom'] },
  { ticker: 'AAPL', yahoo: 'AAPL', name: 'Apple Inc.',                type: 'stock', scenarios: ['2023-ai-boom'] },
  { ticker: 'MSFT', yahoo: 'MSFT', name: 'Microsoft Corporation',     type: 'stock', scenarios: ['2023-ai-boom'] },
  { ticker: 'NVDA', yahoo: 'NVDA', name: 'NVIDIA Corporation',        type: 'stock', scenarios: ['2023-ai-boom'] },
  { ticker: 'AMZN', yahoo: 'AMZN', name: 'Amazon.com Inc.',           type: 'stock', scenarios: ['2023-ai-boom'] },
  { ticker: 'META', yahoo: 'META', name: 'Meta Platforms Inc.',       type: 'stock', scenarios: ['2023-ai-boom'] },
  { ticker: 'TSLA', yahoo: 'TSLA', name: 'Tesla Inc.',                type: 'stock', scenarios: ['2023-ai-boom'] },
  { ticker: 'NFLX', yahoo: 'NFLX', name: 'Netflix Inc.',              type: 'stock', scenarios: ['2023-ai-boom'] },
  // dotcom-recovery instruments
  { ticker: 'SPY',  yahoo: 'SPY',  name: 'SPDR S&P 500 ETF',         type: 'etf',   scenarios: ['dotcom-recovery'] },
  { ticker: 'QQQ',  yahoo: 'QQQ',  name: 'Invesco QQQ Trust',         type: 'etf',   scenarios: ['dotcom-recovery'] },
  { ticker: 'AAPL', yahoo: 'AAPL', name: 'Apple Inc.',                type: 'stock', scenarios: ['dotcom-recovery'] },
  { ticker: 'AMZN', yahoo: 'AMZN', name: 'Amazon.com Inc.',           type: 'stock', scenarios: ['dotcom-recovery'] },
  { ticker: 'MSFT', yahoo: 'MSFT', name: 'Microsoft Corporation',     type: 'stock', scenarios: ['dotcom-recovery'] },
  { ticker: 'NFLX', yahoo: 'NFLX', name: 'Netflix Inc.',              type: 'stock', scenarios: ['dotcom-recovery'] },
];

function r4(n) { return Math.round(n * 10000) / 10000; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function toDateString(d) {
  const iso = d instanceof Date ? d.toISOString() : String(d);
  return iso.split('T')[0];
}

async function fetchAndWrite(inst, scenarioSlug) {
  const scenario = SCENARIOS[scenarioSlug];
  const outDir = join(OUT_DIR, scenarioSlug);
  const outFile = join(outDir, `${inst.ticker}.json`);
  const label = `${inst.ticker.padEnd(8)} / ${scenarioSlug}`;

  process.stdout.write(`  ${label} ... `);

  let rows;
  try {
    rows = await yahooFinance.historical(
      inst.yahoo,
      { period1: scenario.startDate, period2: scenario.endDate, interval: '1d' },
      { validateResult: false }
    );
  } catch (err) {
    console.log(`ERROR: ${err.message.split('\n')[0]}`);
    return { status: 'error', file: outFile };
  }

  if (!rows || rows.length === 0) {
    console.log('SKIP (no data returned)');
    return { status: 'skipped', file: outFile };
  }

  const series = rows
    .filter(row => row.close != null && isFinite(row.close))
    .map(row => ({
      date:   toDateString(row.date),
      open:   r4(row.open   ?? row.close),
      high:   r4(row.high   ?? row.close),
      low:    r4(row.low    ?? row.close),
      close:  r4(row.adjClose ?? row.close),
      volume: Math.round(row.volume ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (series.length === 0) {
    console.log('SKIP (all rows invalid)');
    return { status: 'skipped', file: outFile };
  }

  mkdirSync(outDir, { recursive: true });

  const payload = {
    ticker:    inst.ticker,
    name:      inst.name,
    type:      inst.type,
    scenario:  scenarioSlug,
    startDate: series[0].date,
    endDate:   series[series.length - 1].date,
    currency:  'USD',
    series,
  };

  writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(`OK (${series.length} trading days)`);
  return { status: 'ok', file: outFile, days: series.length };
}

async function main() {
  console.log('MoneyBags — New Scenarios Data Fetch');
  console.log('======================================');
  console.log(`Output: ${OUT_DIR}\n`);

  const results = [];
  for (const inst of INSTRUMENTS) {
    for (const scenarioSlug of inst.scenarios) {
      const result = await fetchAndWrite(inst, scenarioSlug);
      results.push({ ticker: inst.ticker, scenario: scenarioSlug, ...result });
      await delay(350);
    }
  }

  console.log('\n======================================');
  const ok      = results.filter(r => r.status === 'ok');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors  = results.filter(r => r.status === 'error');
  console.log(`OK: ${ok.length}  Skipped: ${skipped.length}  Errors: ${errors.length}`);
  console.log('\nSuccessfully created files:');
  ok.forEach(r => console.log(`  ${r.file}  (${r.days} days)`));
  if (skipped.length) { console.log('\nSkipped:'); skipped.forEach(r => console.log(`  ${r.ticker} / ${r.scenario}`)); }
  if (errors.length)  { console.log('\nErrors:');  errors.forEach(r => console.log(`  ${r.ticker} / ${r.scenario}`)); }
  console.log('\nDone!');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
