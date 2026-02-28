"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/format";
import type { TradeOrder } from "@/types/portfolio";

interface TradePanelProps {
  open: boolean;
  onClose: () => void;
  defaultTicker: string | null;
}

type ActionType = "buy" | "sell_pct" | "sell_all" | "move_to_cash";

const ACTION_LABELS: Record<ActionType, string> = {
  buy: "Buy",
  sell_pct: "Sell %",
  sell_all: "Sell All",
  move_to_cash: "Move All to Cash",
};

export function TradePanel({ open, onClose, defaultTicker }: TradePanelProps) {
  const state = useSimulationStore((s) => s.state);
  const submitTrade = useSimulationStore((s) => s.submitTrade);

  const [action, setAction] = useState<ActionType>("buy");
  const [ticker, setTicker] = useState(defaultTicker ?? "");
  const [amount, setAmount] = useState("");
  const [sellPct, setSellPct] = useState("100");

  const portfolio = state?.portfolio;
  const positions = portfolio?.positions ?? [];
  const tickers = positions.map((p) => p.ticker);

  const selectedPos = positions.find((p) => p.ticker === ticker);
  const cashBalance = portfolio?.cashBalance ?? 0;

  const handleSubmit = () => {
    if (!ticker && action !== "move_to_cash") return;

    const order: TradeOrder = {
      ticker: ticker || "",
      action,
      source: "manual",
      ...(action === "buy" && amount ? { amount: parseFloat(amount) } : {}),
      ...(action === "sell_pct" ? { quantity: parseFloat(sellPct) || 100 } : {}),
    };

    submitTrade(order);
    onClose();
    setAmount("");
    setSellPct("100");
  };

  const isMoveAll = action === "move_to_cash";
  const needsTicker = !isMoveAll;
  const canSubmit =
    isMoveAll ||
    (ticker && (action !== "buy" || !!amount));

  return (
    <Sheet open={open} onClose={onClose} title="Manual Trade">
      <div className="flex flex-col gap-4 pb-6">
        {/* Action selector */}
        <div>
          <p className="text-xs text-secondary font-medium mb-2">Action</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(ACTION_LABELS) as ActionType[]).map((a) => (
              <button
                key={a}
                onClick={() => setAction(a)}
                className={`rounded-xl border py-2 text-xs font-medium transition-colors ${
                  action === a
                    ? "border-accent text-accent bg-accent/10"
                    : "border-border text-secondary hover:border-secondary"
                }`}
              >
                {ACTION_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        {/* Ticker */}
        {needsTicker && (
          <div>
            <p className="text-xs text-secondary font-medium mb-2">Instrument</p>
            {tickers.length > 0 ? (
              <select
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-primary text-sm font-mono focus:outline-none focus:border-accent"
              >
                <option value="">Select ticker...</option>
                {/* For buy, any valid ticker; for sell, only held positions */}
                {action === "buy" ? (
                  tickers.map((t) => <option key={t} value={t}>{t}</option>)
                ) : (
                  tickers.map((t) => <option key={t} value={t}>{t}</option>)
                )}
              </select>
            ) : (
              <Input
                placeholder="e.g. SPY"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
              />
            )}
            {selectedPos && (
              <p className="text-muted text-xs mt-1 font-mono">
                Held: {formatCurrency(selectedPos.currentValue)} ({selectedPos.quantity.toFixed(4)} units)
              </p>
            )}
          </div>
        )}

        {/* Buy amount */}
        {action === "buy" && (
          <div>
            <p className="text-xs text-secondary font-medium mb-2">
              Dollar amount{" "}
              <span className="text-muted">
                (cash: {formatCurrency(cashBalance)})
              </span>
            </p>
            <Input
              type="number"
              prefix="$"
              placeholder="Amount to invest"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={1}
            />
            <div className="flex gap-2 mt-2">
              {[25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setAmount(String(Math.floor((cashBalance * pct) / 100)))}
                  className="flex-1 text-xs text-secondary border border-border rounded-lg py-1 hover:border-secondary transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sell pct */}
        {action === "sell_pct" && (
          <div>
            <p className="text-xs text-secondary font-medium mb-2">Percentage to sell</p>
            <Input
              type="number"
              placeholder="Percentage (0-100)"
              value={sellPct}
              onChange={(e) => setSellPct(e.target.value)}
              min={1}
              max={100}
            />
            <div className="flex gap-2 mt-2">
              {[25, 50, 100].map((p) => (
                <button
                  key={p}
                  onClick={() => setSellPct(String(p))}
                  className="flex-1 text-xs text-secondary border border-border rounded-lg py-1 hover:border-secondary transition-colors"
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        )}

        {isMoveAll && (
          <p className="text-secondary text-sm text-center py-2">
            Liquidate all positions and move everything to cash.
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full"
        >
          Confirm Trade
        </Button>
      </div>
    </Sheet>
  );
}
