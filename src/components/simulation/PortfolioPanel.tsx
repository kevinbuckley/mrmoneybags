"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { TradePanel } from "./TradePanel";
import { formatCurrency } from "@/lib/format";

export function PortfolioPanel() {
  const state = useSimulationStore((s) => s.state);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeTicker, setTradeTicker] = useState<string | null>(null);

  const portfolio = state?.portfolio;
  const history = state?.history ?? [];
  const startingValue = portfolio?.startingValue ?? 0;
  const totalValue = portfolio?.totalValue ?? startingValue;
  const prevDayValue = history[history.length - 2]?.totalValue ?? startingValue;
  const dayChange = totalValue - prevDayValue;
  const dayChangePct = prevDayValue > 0 ? (dayChange / prevDayValue) * 100 : 0;
  const totalReturn = startingValue > 0 ? ((totalValue - startingValue) / startingValue) * 100 : 0;

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
            <p className="text-2xl font-bold font-mono text-primary">
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
          </div>
          <button
            onClick={() => openTrade(null)}
            className="text-xs text-accent border border-accent/30 rounded-lg px-3 py-1.5 hover:bg-accent/10 transition-colors"
          >
            Trade
          </button>
        </div>

        {/* Positions */}
        {portfolio && portfolio.positions.length > 0 && (
          <div className="flex flex-col gap-1">
            {portfolio.positions.map((pos) => {
              const weight =
                totalValue > 0 ? (pos.currentValue / totalValue) * 100 : 0;
              const entryValue = pos.quantity * pos.entryPrice;
              const posReturn =
                entryValue > 0
                  ? ((pos.currentValue - entryValue) / entryValue) * 100
                  : 0;
              return (
                <div
                  key={pos.id}
                  className="flex items-center gap-2 py-1"
                >
                  <button
                    onClick={() => openTrade(pos.ticker)}
                    className="text-accent font-mono font-bold text-xs w-12 shrink-0 text-left hover:text-accent/70 transition-colors"
                  >
                    {pos.ticker}
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
                <span className="text-muted font-mono text-xs w-12 shrink-0">CASH</span>
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
      </div>

      <TradePanel
        open={tradeOpen}
        onClose={() => setTradeOpen(false)}
        defaultTicker={tradeTicker}
      />
    </>
  );
}
