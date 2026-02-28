// Layer 3: engine — portfolio mutation functions
// NO React, NO Zustand imports allowed

import type { Portfolio, Position, TradeOrder } from "@/types/portfolio";
import type { PriceDataMap } from "@/types/instrument";
import { getInstrument } from "@/data/instruments";

// ── Price lookup helpers ──────────────────────────────────────────────────────

/** Get price for a ticker on a specific date string, nearest prior if exact date missing. */
function getPriceOnDate(
  priceData: PriceDataMap,
  ticker: string,
  date: string,
  field: "open" | "close"
): number {
  const series = priceData.get(ticker);
  if (!series || series.length === 0) return 0;
  let best = series[0];
  for (const p of series) {
    if (p.date <= date) best = p;
    else break;
  }
  return field === "open" ? best.open : best.close;
}

/** Get price at a numeric index, clamped to series bounds. */
function getPriceAtIndex(
  priceData: PriceDataMap,
  ticker: string,
  index: number,
  field: "open" | "close"
): number {
  const series = priceData.get(ticker);
  if (!series || series.length === 0) return 0;
  const clamped = Math.min(Math.max(index, 0), series.length - 1);
  const p = series[clamped];
  return field === "open" ? p.open : p.close;
}

// ── Trade handlers ────────────────────────────────────────────────────────────

function applyBuy(
  portfolio: Portfolio,
  order: TradeOrder,
  price: number,
  date: string
): Portfolio {
  if (price <= 0) return portfolio;
  const dollarAmount = Math.min(order.amount ?? 0, portfolio.cashBalance);
  if (dollarAmount <= 0) return portfolio;

  const quantity = dollarAmount / price;
  const cost = quantity * price;
  const inst = getInstrument(order.ticker);
  const existing = portfolio.positions.find((p) => p.ticker === order.ticker);

  let positions: Position[];
  if (existing) {
    const totalQty = existing.quantity + quantity;
    const avgEntry = (existing.entryPrice * existing.quantity + cost) / totalQty;
    positions = portfolio.positions.map((p) =>
      p.ticker === order.ticker
        ? { ...p, quantity: totalQty, entryPrice: avgEntry, currentPrice: price, currentValue: totalQty * price }
        : p
    );
  } else {
    const newPos: Position = {
      id: `${order.ticker}-${date}`,
      ticker: order.ticker,
      name: inst?.name ?? order.ticker,
      type: inst?.type ?? "stock",
      quantity,
      entryPrice: price,
      entryDate: date,
      currentPrice: price,
      currentValue: quantity * price,
    };
    positions = [...portfolio.positions, newPos];
  }

  const newCash = portfolio.cashBalance - cost;
  const totalPositionValue = positions.reduce((s, p) => s + p.currentValue, 0);
  return { ...portfolio, positions, cashBalance: newCash, totalValue: newCash + totalPositionValue };
}

function applySellPct(
  portfolio: Portfolio,
  order: TradeOrder,
  price: number
): Portfolio {
  const pos = portfolio.positions.find((p) => p.ticker === order.ticker);
  if (!pos || price <= 0) return portfolio;

  // quantity field carries 0–100 pct for sell_pct orders
  const pct = Math.min(Math.max(order.quantity ?? 100, 0), 100);
  const qtyToSell = pos.quantity * (pct / 100);
  const proceeds = qtyToSell * price;
  const remainingQty = pos.quantity - qtyToSell;

  const positions =
    remainingQty < 0.0001
      ? portfolio.positions.filter((p) => p.ticker !== order.ticker)
      : portfolio.positions.map((p) =>
          p.ticker === order.ticker
            ? { ...p, quantity: remainingQty, currentPrice: price, currentValue: remainingQty * price }
            : p
        );

  const newCash = portfolio.cashBalance + proceeds;
  const totalPositionValue = positions.reduce((s, p) => s + p.currentValue, 0);
  return { ...portfolio, positions, cashBalance: newCash, totalValue: newCash + totalPositionValue };
}

function applySellAll(
  portfolio: Portfolio,
  ticker: string,
  price: number
): Portfolio {
  const pos = portfolio.positions.find((p) => p.ticker === ticker);
  if (!pos) return portfolio;

  const effectivePrice = price > 0 ? price : pos.currentPrice;
  const proceeds = pos.quantity * effectivePrice;
  const positions = portfolio.positions.filter((p) => p.ticker !== ticker);
  const newCash = portfolio.cashBalance + proceeds;
  const totalPositionValue = positions.reduce((s, p) => s + p.currentValue, 0);
  return { ...portfolio, positions, cashBalance: newCash, totalValue: newCash + totalPositionValue };
}

function applyRebalance(
  portfolio: Portfolio,
  order: TradeOrder,
  price: number,
  date: string
): Portfolio {
  if (price <= 0 || order.targetPct === undefined) return portfolio;
  const targetValue = portfolio.totalValue * order.targetPct;
  const pos = portfolio.positions.find((p) => p.ticker === order.ticker);
  const currentValue = pos ? pos.currentValue : 0;
  const diff = targetValue - currentValue;

  if (Math.abs(diff) < 1) return portfolio;

  if (diff > 0) {
    return applyBuy(portfolio, { ...order, action: "buy", amount: diff }, price, date);
  } else {
    const pctToSell = Math.min((-diff / currentValue) * 100, 100);
    return applySellPct(portfolio, { ...order, action: "sell_pct", quantity: pctToSell }, price);
  }
}

function applyMoveToCash(
  portfolio: Portfolio,
  priceData: PriceDataMap,
  date: string
): Portfolio {
  let result = portfolio;
  for (const pos of [...portfolio.positions]) {
    // Don't force-close option positions on move_to_cash
    if (pos.type === "option") continue;
    const price = getPriceOnDate(priceData, pos.ticker, date, "open");
    result = applySellAll(result, pos.ticker, price > 0 ? price : pos.currentPrice);
  }
  return result;
}

/**
 * Write (sell) a cash-secured put.
 * - Premium is credited to cash immediately (order.premium must be pre-computed by UI)
 * - Creates a short option position with currentValue = -BSFairValue * contracts
 * - Net effect on totalValue = 0 on day 0 (premium in cash offsets liability)
 */
function applyShortPut(
  portfolio: Portfolio,
  order: TradeOrder,
  date: string
): Portfolio {
  const premium = order.premium ?? 0;
  const numContracts = order.numContracts ?? 1;
  const strike = order.strike ?? 0;
  const expiryDate = order.expiryDate ?? "";
  if (premium <= 0 || strike <= 0 || !expiryDate) return portfolio;

  // Starting currentValue = -premium (the liability exactly offsets the cash received)
  const positionId = `${order.ticker}-${strike}p-${expiryDate}-${date}`;
  const newPos: Position = {
    id: positionId,
    ticker: positionId, // synthetic ticker for display
    name: `${order.ticker} $${strike} Put (short) exp ${expiryDate}`,
    type: "option",
    quantity: numContracts,
    entryPrice: premium / numContracts, // premium per contract
    entryDate: date,
    currentPrice: premium / numContracts,
    currentValue: -premium, // starts as liability equal to premium received
    optionConfig: {
      underlying: order.ticker,
      strategy: "short_put",
      type: "put",
      strike,
      expiryDate,
      numContracts,
    },
  };

  const newCash = portfolio.cashBalance + premium;
  const positions = [...portfolio.positions, newPos];
  const totalPositionValue = positions.reduce((s, p) => s + p.currentValue, 0);
  return { ...portfolio, positions, cashBalance: newCash, totalValue: newCash + totalPositionValue };
}

/**
 * Close (buy back) an open short option position at its current market value.
 * Debits the cost-to-close from cash and removes the position.
 * order.ticker = position.id (the synthetic option position ID)
 */
function applyCloseOption(portfolio: Portfolio, order: TradeOrder): Portfolio {
  // Find by position id (stored as ticker on option positions)
  const pos = portfolio.positions.find(
    (p) => p.type === "option" && (p.id === order.ticker || p.ticker === order.ticker)
  );
  if (!pos) return portfolio;

  // Cost to close = absolute current value of the short position
  const costToClose = Math.abs(pos.currentValue);
  const newCash = portfolio.cashBalance - costToClose;
  const positions = portfolio.positions.filter((p) => p.id !== pos.id);
  const totalPositionValue = positions.reduce((s, p) => s + p.currentValue, 0);
  return { ...portfolio, positions, cashBalance: newCash, totalValue: newCash + totalPositionValue };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Apply a trade order to a portfolio, return new portfolio (pure function) */
export function applyTrade(
  portfolio: Portfolio,
  order: TradeOrder,
  priceData: PriceDataMap,
  date: string
): Portfolio {
  const price = getPriceOnDate(priceData, order.ticker, date, "open");

  switch (order.action) {
    case "buy":
      return applyBuy(portfolio, order, price, date);
    case "sell_pct":
      return applySellPct(portfolio, order, price);
    case "sell_all":
      return applySellAll(portfolio, order.ticker, price);
    case "rebalance":
      return applyRebalance(portfolio, order, price, date);
    case "move_to_cash":
      return applyMoveToCash(portfolio, priceData, date);
    case "sell_put":
      return applyShortPut(portfolio, order, date);
    case "close_option":
      return applyCloseOption(portfolio, order);
  }
}

/** Recompute all position values and portfolio total from close prices at dateIndex */
export function recomputeValues(
  portfolio: Portfolio,
  priceData: PriceDataMap,
  dateIndex: number
): Portfolio {
  const positions = portfolio.positions.map((pos) => {
    // Options are revalued by the options engine; skip here
    if (pos.type === "option") return pos;
    const price = getPriceAtIndex(priceData, pos.ticker, dateIndex, "close");
    if (price <= 0) return pos;
    return { ...pos, currentPrice: price, currentValue: pos.quantity * price };
  });

  const totalPositionValue = positions.reduce((s, p) => s + p.currentValue, 0);
  return { ...portfolio, positions, totalValue: portfolio.cashBalance + totalPositionValue };
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
