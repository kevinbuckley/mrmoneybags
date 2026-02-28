// Layer 3: engine — core simulation tick function
// NO React, NO Zustand imports allowed
// See docs/design-docs/simulation-engine.md

import type { SimulationState } from "@/types/simulation";
import type { PriceDataMap } from "@/types/instrument";
import type { TradeOrder } from "@/types/portfolio";

/**
 * Advance the simulation by one tick.
 * Pure function: same inputs → same outputs (for historical data).
 */
export function advanceTick(
  state: SimulationState,
  priceData: PriceDataMap,
  _pendingTrades?: TradeOrder[]
): SimulationState {
  // TODO: implement full tick logic
  // 1. Apply pending trades at open price
  // 2. Evaluate rules → collect triggered actions
  // 3. Apply triggered actions
  // 4. Mark expired options
  // 5. Compute new position values using close prices
  // 6. Generate narrator events
  // 7. Record PortfolioSnapshot
  // 8. Advance currentDateIndex
  // 9. Set isComplete if at end

  const nextIndex = state.currentDateIndex + 1;
  const isComplete = nextIndex >= getSeriesLength(priceData);

  return {
    ...state,
    currentDateIndex: nextIndex,
    isComplete,
    pendingTrades: [],
  };
}

function getSeriesLength(priceData: PriceDataMap): number {
  for (const series of priceData.values()) {
    return series.length;
  }
  return 0;
}

export function getCurrentDate(
  state: SimulationState,
  priceData: PriceDataMap
): string | null {
  for (const series of priceData.values()) {
    const point = series[state.currentDateIndex];
    return point?.date ?? null;
  }
  return null;
}
