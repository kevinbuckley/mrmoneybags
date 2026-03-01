"use client";

// Layer 6: component — UI for writing (selling) cash-secured puts

import { useState, useMemo } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format";
import { blackScholes, historicalVolatility } from "@/lib/blackScholes";
import { INSTRUMENTS } from "@/data/instruments";
import { playSound } from "@/lib/sound";

interface SellPutPanelProps {
  open: boolean;
  onClose: () => void;
}

// How many trading bars ahead each expiry option represents
const EXPIRY_OFFSETS = [
  { label: "~2 wk", bars: 10 },
  { label: "~1 mo", bars: 21 },
  { label: "~2 mo", bars: 42 },
] as const;

const STRIKE_OFFSETS = [
  { label: "ATM", pct: 0 },
  { label: "−5% OTM", pct: -0.05 },
  { label: "−10% OTM", pct: -0.10 },
] as const;

export function SellPutPanel({ open, onClose }: SellPutPanelProps) {
  const state = useSimulationStore((s) => s.state);
  const priceData = useSimulationStore((s) => s.priceData);
  const submitTrade = useSimulationStore((s) => s.submitTrade);

  const scenario = state?.config.scenario;
  const currentDateIndex = state?.currentDateIndex ?? 0;
  const cashBalance = state?.portfolio.cashBalance ?? 0;
  const reservedCash = state?.portfolio.reservedCash ?? 0;
  const freeCash = Math.max(0, cashBalance - reservedCash);
  const riskFreeRate = scenario?.riskFreeRate ?? 0.02;

  // Available tickers for the current scenario
  const scenarioSlug = scenario?.dataSlug ?? scenario?.slug ?? "";
  const availableTickers = useMemo(
    () => INSTRUMENTS.filter((i) => i.availableScenarios.includes(scenarioSlug) && i.type !== "option"),
    [scenarioSlug]
  );

  const [ticker, setTicker] = useState<string>(() => availableTickers[0]?.ticker ?? "SPY");
  const [strikeIdx, setStrikeIdx] = useState(0);   // index into STRIKE_OFFSETS
  const [expiryIdx, setExpiryIdx] = useState(1);   // index into EXPIRY_OFFSETS (default ~1 mo)
  const [contracts, setContracts] = useState(1);

  // Current underlying price
  const underlyingSeries = priceData?.get(ticker);
  const currentClose = underlyingSeries?.[Math.min(currentDateIndex, (underlyingSeries?.length ?? 1) - 1)]?.close ?? 0;

  // Resolve expiry date from price series bars
  const expiryDate = useMemo(() => {
    if (!underlyingSeries) return "";
    const targetIdx = Math.min(
      currentDateIndex + EXPIRY_OFFSETS[expiryIdx]!.bars,
      underlyingSeries.length - 1
    );
    return underlyingSeries[targetIdx]?.date ?? "";
  }, [underlyingSeries, currentDateIndex, expiryIdx]);

  // Compute strike from offset
  const strike = useMemo(() => {
    if (currentClose <= 0) return 0;
    const raw = currentClose * (1 + STRIKE_OFFSETS[strikeIdx]!.pct);
    // Round to nearest $1
    return Math.round(raw);
  }, [currentClose, strikeIdx]);

  // Days to expiry
  const dte = useMemo(() => {
    if (!expiryDate) return 0;
    const today = underlyingSeries?.[currentDateIndex]?.date ?? "";
    return Math.max(
      0,
      Math.round(
        (new Date(expiryDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
      )
    );
  }, [expiryDate, underlyingSeries, currentDateIndex]);

  // Historical vol for BS pricing
  const sigma = useMemo(() => {
    if (!underlyingSeries) return 0.3;
    const closes = underlyingSeries.slice(0, currentDateIndex + 1).map((p) => p.close);
    return historicalVolatility(closes);
  }, [underlyingSeries, currentDateIndex]);

  // Black-Scholes put price per share
  const bsResult = useMemo(() => {
    if (currentClose <= 0 || strike <= 0 || dte <= 0) return null;
    return blackScholes({
      S: currentClose,
      K: strike,
      T: dte / 365,
      r: riskFreeRate,
      sigma,
      type: "put",
    });
  }, [currentClose, strike, dte, riskFreeRate, sigma]);

  // Total premium for the order
  const premiumPerContract = (bsResult?.price ?? 0) * 100; // 100 shares per contract
  const totalPremium = premiumPerContract * contracts;

  // Collateral requirement: cash-secured = strike × 100 × contracts
  // Compare against free cash only (cashBalance - already reserved collateral)
  const collateral = strike * 100 * contracts;
  const hasSufficientCash = freeCash >= collateral;

  // Risk metrics
  const breakEven = strike - (bsResult?.price ?? 0);
  const lossAt20PctDown = Math.max(strike * 0.8 < strike ? (strike - strike * 0.8) * 100 * contracts - totalPremium : 0, 0);

  function handleSubmit() {
    if (!bsResult || totalPremium <= 0 || !expiryDate) return;
    submitTrade({
      ticker,
      action: "sell_put",
      strike,
      expiryDate,
      numContracts: contracts,
      premium: totalPremium,
      source: "manual",
    });
    playSound("trade");
    onClose();
  }

  if (!state) return null;

  return (
    <Sheet open={open} onClose={onClose} title="Sell Put">
      <div className="flex flex-col gap-4 pb-4">

        {/* Underlying ticker */}
        <div>
          <p className="text-xs text-secondary mb-1.5">Underlying</p>
          <div className="flex flex-wrap gap-1.5">
            {availableTickers.slice(0, 8).map((inst) => (
              <button
                key={inst.ticker}
                onClick={() => setTicker(inst.ticker)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  ticker === inst.ticker
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-elevated border-border text-secondary hover:border-secondary"
                }`}
              >
                {inst.ticker}
              </button>
            ))}
          </div>
          {currentClose > 0 && (
            <p className="text-xs text-muted mt-1 font-mono">
              Current price: <span className="text-primary">{formatCurrency(currentClose)}</span>
              {" · "}IV: <span className="text-primary">{(sigma * 100).toFixed(0)}%</span>
            </p>
          )}
        </div>

        {/* Strike */}
        <div>
          <p className="text-xs text-secondary mb-1.5">Strike Price</p>
          <div className="flex gap-2">
            {STRIKE_OFFSETS.map((s, i) => (
              <button
                key={s.label}
                onClick={() => setStrikeIdx(i)}
                className={`flex-1 py-2 rounded-lg text-xs font-mono border transition-colors ${
                  strikeIdx === i
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-elevated border-border text-secondary hover:border-secondary"
                }`}
              >
                <div className="font-bold">{s.label}</div>
                {currentClose > 0 && (
                  <div className="text-muted mt-0.5">${Math.round(currentClose * (1 + s.pct))}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Expiry */}
        <div>
          <p className="text-xs text-secondary mb-1.5">Expiry</p>
          <div className="flex gap-2">
            {EXPIRY_OFFSETS.map((e, i) => (
              <button
                key={e.label}
                onClick={() => setExpiryIdx(i)}
                className={`flex-1 py-2 rounded-lg text-xs font-mono border transition-colors ${
                  expiryIdx === i
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-elevated border-border text-secondary hover:border-secondary"
                }`}
              >
                <div className="font-bold">{e.label}</div>
                <div className="text-muted mt-0.5">{dte > 0 && expiryIdx === i ? `${dte} DTE` : `~${e.bars}d`}</div>
              </button>
            ))}
          </div>
          {expiryDate && (
            <p className="text-xs text-muted mt-1 font-mono">Expires: {expiryDate}</p>
          )}
        </div>

        {/* Contracts */}
        <div>
          <p className="text-xs text-secondary mb-1.5">Contracts (100 shares each)</p>
          <div className="flex gap-2">
            {[1, 2, 5].map((n) => (
              <button
                key={n}
                onClick={() => setContracts(n)}
                className={`flex-1 py-2 rounded-lg text-xs font-mono border transition-colors ${
                  contracts === n
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-elevated border-border text-secondary hover:border-secondary"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Premium preview */}
        {bsResult && (
          <div className="bg-elevated border border-border rounded-xl p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-secondary">Premium received</span>
              <span className="text-gain font-mono font-bold text-lg">
                +{formatCurrency(totalPremium)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
              <span className="text-muted">Max profit</span>
              <span className="text-gain">+{formatCurrency(totalPremium)}</span>
              <span className="text-muted">Break-even</span>
              <span className="text-primary">{formatCurrency(breakEven)}</span>
              <span className="text-muted">Loss at −20%</span>
              <span className="text-loss">−{formatCurrency(lossAt20PctDown)}</span>
              <span className="text-muted">Delta</span>
              <span className="text-secondary">{bsResult.delta.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Collateral warning */}
        {!hasSufficientCash && (
          <div className="bg-loss/10 border border-loss/30 rounded-xl px-3 py-2 text-xs text-loss">
            ⚠ Insufficient cash. Need {formatCurrency(collateral)} collateral, have {formatCurrency(freeCash)} free.
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!bsResult || totalPremium <= 0 || !hasSufficientCash}
          className="w-full"
        >
          Sell Put · Collect {formatCurrency(totalPremium)}
        </Button>

        <p className="text-xs text-muted text-center">
          If expired ITM: pay intrinsic value at expiry (cash-settled)
        </p>
      </div>
    </Sheet>
  );
}
