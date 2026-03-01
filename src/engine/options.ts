// Layer 3: engine — options lifecycle management
// NO React, NO Zustand imports allowed

import type { Portfolio, Position } from "@/types/portfolio";
import type { PriceSeries } from "@/types/instrument";
import { blackScholes, historicalVolatility } from "@/lib/blackScholes";

/**
 * Recompute fair value for an options position.
 * Returns positive value for long positions, negative for short_put (liability).
 */
export function recomputeOptionValue(
  position: Position,
  underlyingSeries: PriceSeries,
  currentDateIndex: number,
  riskFreeRate: number
): number {
  const config = position.optionConfig;
  if (!config) return position.currentValue;

  const isShort = config.strategy === "short_put" || config.strategy === "covered_call";

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

  // Short put: negative = liability (increases in magnitude as stock falls)
  const sign = isShort ? -1 : 1;
  return sign * result.price * 100 * config.numContracts;
}

/** Check if an option expires on the current date */
export function isExpiring(position: Position, currentDate: string): boolean {
  return position.optionConfig?.expiryDate === currentDate;
}

/** Compute intrinsic value at expiry (for long positions) */
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

/**
 * Process expiry of a short put (cash-settled, no share assignment).
 *
 * OTM (stockPrice >= strike):
 *   Position is removed; cash is unchanged (premium was received at open).
 *
 * ITM (stockPrice < strike):
 *   Player pays intrinsic value: cash -= (strike - stockPrice) × 100 × numContracts
 *   Position is removed.
 *
 * Returns { portfolio: updated Portfolio, wasAssigned: boolean }
 */
export function processShortPutExpiry(
  portfolio: Portfolio,
  pos: Position,
  underlyingPrice: number
): { portfolio: Portfolio; wasAssigned: boolean } {
  const config = pos.optionConfig;
  if (!config) return { portfolio, wasAssigned: false };

  const positions = portfolio.positions.filter((p) => p.id !== pos.id);
  const isITM = underlyingPrice < config.strike;

  if (!isITM) {
    // OTM — expires worthless, position removed, cash stays
    const totalPositionValue = positions.reduce((s, p) => s + p.currentValue, 0);
    return {
      portfolio: {
        ...portfolio,
        positions,
        totalValue: portfolio.cashBalance + totalPositionValue,
      },
      wasAssigned: false,
    };
  }

  // ITM — cash-settled assignment loss
  const intrinsicPerShare = config.strike - underlyingPrice;
  const assignmentLoss = intrinsicPerShare * 100 * config.numContracts;
  const newCash = Math.max(portfolio.cashBalance - assignmentLoss, 0); // can't go below 0
  const totalPositionValue = positions.reduce((s, p) => s + p.currentValue, 0);
  return {
    portfolio: {
      ...portfolio,
      positions,
      cashBalance: newCash,
      totalValue: newCash + totalPositionValue,
    },
    wasAssigned: true,
  };
}

/**
 * Process expiry of a covered call (cash-settled).
 *
 * OTM (stockPrice <= strike): position removed, full premium profit kept.
 * ITM (stockPrice > strike): cash debited by (stockPrice − strike) × 100 × numContracts,
 *   simulating the call being exercised against you (your upside is capped at strike).
 *
 * Returns { portfolio: updated Portfolio, wasAssigned: boolean }
 */
export function processShortCallExpiry(
  portfolio: Portfolio,
  pos: Position,
  underlyingPrice: number
): { portfolio: Portfolio; wasAssigned: boolean } {
  const config = pos.optionConfig;
  if (!config) return { portfolio, wasAssigned: false };

  const positions = portfolio.positions.filter((p) => p.id !== pos.id);
  const isITM = underlyingPrice > config.strike; // call ITM when stock > strike

  if (!isITM) {
    const totalPositionValue = positions.reduce((s, p) => s + p.currentValue, 0);
    return {
      portfolio: { ...portfolio, positions, totalValue: portfolio.cashBalance + totalPositionValue },
      wasAssigned: false,
    };
  }

  // ITM — upside capped: pay the intrinsic value
  const intrinsicPerShare = underlyingPrice - config.strike;
  const assignmentLoss = intrinsicPerShare * 100 * config.numContracts;
  const newCash = Math.max(portfolio.cashBalance - assignmentLoss, 0);
  const totalPositionValue = positions.reduce((s, p) => s + p.currentValue, 0);
  return {
    portfolio: {
      ...portfolio,
      positions,
      cashBalance: newCash,
      totalValue: newCash + totalPositionValue,
    },
    wasAssigned: true,
  };
}
