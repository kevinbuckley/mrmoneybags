// Layer 3: engine — portfolio mutation functions
// NO React, NO Zustand imports allowed

import type { Portfolio, Position, TradeOrder } from "@/types/portfolio";
import type { PriceDataMap } from "@/types/instrument";

/** Apply a trade order to a portfolio, return new portfolio */
export function applyTrade(
  portfolio: Portfolio,
  _order: TradeOrder,
  _priceData: PriceDataMap,
  _date: string
): Portfolio {
  // TODO: implement buy/sell/rebalance/move_to_cash logic
  return portfolio;
}

/** Recompute all position values and portfolio total from current prices */
export function recomputeValues(
  portfolio: Portfolio,
  _priceData: PriceDataMap,
  _dateIndex: number
): Portfolio {
  // TODO: update currentPrice and currentValue for each position
  const totalPositionValue = portfolio.positions.reduce(
    (sum, p) => sum + p.currentValue,
    0
  );
  return {
    ...portfolio,
    totalValue: portfolio.cashBalance + totalPositionValue,
  };
}

/** Create an empty portfolio from starting capital */
export function createPortfolio(startingCapital: number): Portfolio {
  return {
    positions: [],
    cashBalance: startingCapital,
    totalValue: startingCapital,
    startingValue: startingCapital,
  };
}

/** Get a position by ticker, or undefined */
export function getPosition(
  portfolio: Portfolio,
  ticker: string
): Position | undefined {
  return portfolio.positions.find((p) => p.ticker === ticker);
}
