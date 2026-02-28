"use client";

import { useEffect, useRef, useState } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { TradePanel } from "./TradePanel";
import { formatCurrency } from "@/lib/format";
import type { TradeOrder } from "@/types/portfolio";

function positionEmoji(returnPct: number): string {
  if (returnPct >= 20) return "🔥";
  if (returnPct >= 0)  return "📈";
  if (returnPct > -30) return "📉";
  return "💀";
}

export function PortfolioPanel() {
  const state = useSimulationStore((s) => s.state);
  const submitTrade = useSimulationStore((s) => s.submitTrade);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeTicker, setTradeTicker] = useState<string | null>(null);
  const [flash, setFlash] = useState<"gain" | "loss" | null>(null);
  const prevValueRef = useRef<number | null>(null);

  const portfolio = state?.portfolio;
  const history = state?.history ?? [];
  const startingValue = portfolio?.startingValue ?? 0;
  const totalValue = portfolio?.totalValue ?? startingValue;
  const investedValue = portfolio
    ? portfolio.positions.reduce((s, p) => s + p.currentValue, 0)
    : 0;
  const investedPct = totalValue > 0 ? (investedValue / totalValue) * 100 : 0;
  const prevDayValue = history[history.length - 2]?.totalValue ?? startingValue;
  const dayChange = totalValue - prevDayValue;
  const dayChangePct = prevDayValue > 0 ? (dayChange / prevDayValue) * 100 : 0;
  const totalReturn = startingValue > 0 ? ((totalValue - startingValue) / startingValue) * 100 : 0;

  // Flash the portfolio value briefly on each tick
  useEffect(() => {
    if (prevValueRef.current === null) {
      prevValueRef.current = totalValue;
      return;
    }
    if (totalValue === prevValueRef.current) return;
    const direction = totalValue > prevValueRef.current ? "gain" : "loss";
    prevValueRef.current = totalValue;
    setFlash(direction);
    const t = setTimeout(() => setFlash(null), 350);
    return () => clearTimeout(t);
  }, [totalValue]);

  const openTrade = (ticker: string | null) => {
    setTradeTicker(ticker);
    setTradeOpen(true);
  };

  return (
    <>
      <div className="px-4 pt-4 pb-3 border-b border-border">
        {/* Main value */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-secondary mb-0.5">Portfolio Value</p>
            <p
              className={`text-2xl font-bold font-mono transition-colors duration-300 ${
                flash === "gain"
                  ? "text-gain"
                  : flash === "loss"
                  ? "text-loss"
                  : "text-primary"
              }`}
            >
              {formatCurrency(totalValue)}
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className={`text-xs font-mono ${dayChange >= 0 ? "text-gain" : "text-loss"}`}>
                {dayChange >= 0 ? "+" : ""}{formatCurrency(dayChange)} ({dayChangePct >= 0 ? "+" : ""}{dayChangePct.toFixed(2)}%) today
              </span>
              <span className={`text-xs font-mono ${totalReturn >= 0 ? "text-gain" : "text-loss"}`}>
                {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(1)}% total
              </span>
            </div>
            {/* Invested vs cash breakdown — prevents confusion between position value and portfolio total */}
            {portfolio && (portfolio.cashBalance > 0.01 || investedValue > 0) && (
              <div className="mt-1.5">
                <p className="text-xs text-muted font-mono">
                  Stocks{" "}
                  <span className="text-secondary">{formatCurrency(investedValue, true)}</span>
                  {portfolio.cashBalance > 0.01 && (
                    <>
                      {" · "}Cash{" "}
                      <span className="text-secondary">{formatCurrency(portfolio.cashBalance, true)}</span>
                    </>
                  )}
                </p>
                {/* Allocation bar: accent = invested, border = cash */}
                <div className="h-1 rounded-full bg-border mt-1 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(investedPct, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => openTrade(null)}
            className="text-xs text-accent border border-accent/30 rounded-lg px-3 py-1.5 hover:bg-accent/10 transition-colors"
          >
            Trade
          </button>
        </div>

        {/* Positions */}
        {portfolio && portfolio.positions.filter((p) => p.type !== "option").length > 0 && (
          <div className="flex flex-col gap-1">
            {portfolio.positions.filter((p) => p.type !== "option").map((pos) => {
              const weight = totalValue > 0 ? (pos.currentValue / totalValue) * 100 : 0;
              const entryValue = pos.quantity * pos.entryPrice;
              const posReturn =
                entryValue > 0
                  ? ((pos.currentValue - entryValue) / entryValue) * 100
                  : 0;
              return (
                <div key={pos.id} className="flex items-center gap-2 py-1">
                  <button
                    onClick={() => openTrade(pos.ticker)}
                    className="font-mono font-bold text-xs w-16 shrink-0 text-left hover:opacity-70 transition-opacity flex items-center gap-1 text-accent"
                  >
                    <span className="text-sm">{positionEmoji(posReturn)}</span>
                    <span>{pos.ticker}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-primary text-xs font-mono">
                        {formatCurrency(pos.currentValue)}
                      </span>
                      <span className={`text-xs font-mono ${posReturn >= 0 ? "text-gain" : "text-loss"}`}>
                        {posReturn >= 0 ? "+" : ""}{posReturn.toFixed(1)}%
                      </span>
                      <span className="text-muted text-xs font-mono">
                        {weight.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Cash row */}
            {portfolio.cashBalance > 0.01 && (
              <div className="flex items-center gap-2 py-1">
                <span className="text-muted font-mono text-xs w-16 shrink-0">💵 CASH</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary text-xs font-mono">
                      {formatCurrency(portfolio.cashBalance)}
                    </span>
                    <span className="text-muted text-xs font-mono">
                      {totalValue > 0
                        ? ((portfolio.cashBalance / totalValue) * 100).toFixed(0)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Short puts section */}
        {portfolio && portfolio.positions.some((p) => p.type === "option") && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted font-mono mb-1">Short Puts</p>
            {portfolio.positions.filter((p) => p.type === "option").map((pos) => {
              const config = pos.optionConfig;
              if (!config) return null;
              const premiumReceived = pos.entryPrice * pos.quantity;
              const pnl = premiumReceived + pos.currentValue; // currentValue is negative
              const isProfit = pnl >= 0;
              const today = state?.history[state.history.length - 1]?.date ?? "";
              const dte = today
                ? Math.max(0, Math.round(
                    (new Date(config.expiryDate).getTime() - new Date(today).getTime()) /
                    (1000 * 60 * 60 * 24)
                  ))
                : 0;
              return (
                <div key={pos.id} className="flex items-center gap-2 py-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-mono text-secondary truncate">
                        {config.underlying} ${config.strike}p · {dte} DTE
                      </span>
                      <span className={`text-xs font-mono font-bold shrink-0 ${isProfit ? "text-gain" : "text-loss"}`}>
                        {isProfit ? "+" : ""}{formatCurrency(pnl)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const order: TradeOrder = {
                        ticker: pos.id,
                        action: "close_option",
                        source: "manual",
                      };
                      submitTrade(order);
                    }}
                    className="text-xs text-loss border border-loss/30 rounded px-2 py-0.5 hover:bg-loss/10 transition-colors shrink-0"
                  >
                    Close
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TradePanel
        open={tradeOpen}
        onClose={() => setTradeOpen(false)}
        defaultTicker={tradeTicker}
      />
    </>
  );
}
