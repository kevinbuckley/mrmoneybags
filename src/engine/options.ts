// Layer 3: engine — options lifecycle management
// NO React, NO Zustand imports allowed

import type { Position } from "@/types/portfolio";
import type { PriceSeries } from "@/types/instrument";
import { blackScholes, historicalVolatility } from "@/lib/blackScholes";

/** Recompute fair value for an options position */
export function recomputeOptionValue(
  position: Position,
  underlyingSeries: PriceSeries,
  currentDateIndex: number,
  riskFreeRate: number
): number {
  const config = position.optionConfig;
  if (!config) return position.currentValue;

  const currentPrice = underlyingSeries[currentDateIndex]?.close ?? 0;
  if (currentPrice === 0) return 0;

  const currentDate = underlyingSeries[currentDateIndex]?.date ?? "";
  const expiryDate = config.expiryDate;
  const daysToExpiry = Math.max(
    0,
    (new Date(expiryDate).getTime() - new Date(currentDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const T = daysToExpiry / 365;

  const closes = underlyingSeries
    .slice(0, currentDateIndex + 1)
    .map((p) => p.close);
  const sigma = historicalVolatility(closes);

  const result = blackScholes({
    S: currentPrice,
    K: config.strike,
    T,
    r: riskFreeRate,
    sigma,
    type: config.type,
  });

  return result.price * 100 * config.numContracts;
}

/** Check if an option expires on the current date */
export function isExpiring(position: Position, currentDate: string): boolean {
  return position.optionConfig?.expiryDate === currentDate;
}

/** Compute intrinsic value at expiry */
export function expiryIntrinsicValue(
  position: Position,
  underlyingPrice: number
): number {
  const config = position.optionConfig;
  if (!config) return 0;
  const intrinsicPerShare =
    config.type === "call"
      ? Math.max(underlyingPrice - config.strike, 0)
      : Math.max(config.strike - underlyingPrice, 0);
  return intrinsicPerShare * 100 * config.numContracts;
}
