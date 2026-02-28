// Layer 3: engine — Monte Carlo future price projection
// NO React, NO Zustand imports allowed

import type { PriceDataMap, PriceSeries } from "@/types/instrument";
import { generateProjection } from "@/lib/monteCarlo";
import { historicalVolatility } from "@/lib/blackScholes";

/**
 * Extend all series in a PriceDataMap with projected data.
 * Called once at simulation start when scenario extends beyond historical data.
 */
export function extendWithProjections(
  priceData: PriceDataMap,
  numProjectionDays: number
): PriceDataMap {
  const extended = new Map<string, PriceSeries>();

  for (const [ticker, series] of priceData.entries()) {
    if (series.length === 0) {
      extended.set(ticker, series);
      continue;
    }
    const closes = series.map((p) => p.close);
    const vol = historicalVolatility(closes, Math.min(60, series.length - 1));
    const lastPoint = series[series.length - 1];
    const projected = generateProjection(lastPoint, numProjectionDays, vol);
    extended.set(ticker, [...series, ...projected]);
  }

  return extended;
}
