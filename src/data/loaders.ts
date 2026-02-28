// Layer 2: data — price data loaders

import type { PriceSeries, PriceDataMap } from "@/types/instrument";

// Module-level cache to avoid re-fetching
const _cache = new Map<string, PriceSeries>();

class DataLoadError extends Error {
  constructor(ticker: string, scenario: string, cause?: unknown) {
    super(`Failed to load price data for ${ticker} in scenario ${scenario}`);
    this.name = "DataLoadError";
    if (cause instanceof Error) this.cause = cause;
  }
}

/** Load price series for a single instrument in a scenario */
export async function loadPriceSeries(
  ticker: string,
  scenario: string
): Promise<PriceSeries> {
  const key = `${scenario}/${ticker}`;
  if (_cache.has(key)) return _cache.get(key)!;

  try {
    const res = await fetch(`/data/${scenario}/${ticker}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { series: PriceSeries };
    _cache.set(key, data.series);
    return data.series;
  } catch (err) {
    throw new DataLoadError(ticker, scenario, err);
  }
}

/** Load price series for multiple instruments in parallel */
export async function loadPriceDataMap(
  tickers: string[],
  scenario: string
): Promise<PriceDataMap> {
  const results = await Promise.allSettled(
    tickers.map((t) => loadPriceSeries(t, scenario).then((s) => [t, s] as [string, PriceSeries]))
  );
  const map = new Map<string, PriceSeries>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      const [ticker, series] = result.value;
      map.set(ticker, series);
    }
    // Failed loads are silently skipped — caller handles missing data
  }
  return map;
}
