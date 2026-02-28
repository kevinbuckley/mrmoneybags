"use client";

import type { PriceDataMap } from "@/types/instrument";

interface CorrelationHeatmapProps {
  tickers: string[];
  priceData: PriceDataMap;
}

/** Compute Pearson correlation coefficient between two arrays of equal length */
function pearson(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length < 2) return 0;
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i]! - meanA;
    const db = b[i]! - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

/** Convert daily close prices to daily returns */
function toReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1]!;
    const curr = closes[i]!;
    returns.push(prev > 0 ? (curr - prev) / prev : 0);
  }
  return returns;
}

/** Map correlation -1..1 to a Tailwind-style hex color */
function corrColor(r: number): string {
  // Negative → red, zero → neutral grey, positive → green
  const clamped = Math.max(-1, Math.min(1, r));
  if (clamped >= 0) {
    // 0 → #4b5563 (neutral), 1 → #22c55e (gain)
    const t = clamped;
    const rC = Math.round(75 + (34 - 75) * t);
    const gC = Math.round(85 + (197 - 85) * t);
    const bC = Math.round(99 + (94 - 99) * t);
    return `rgb(${rC},${gC},${bC})`;
  } else {
    // 0 → #4b5563 (neutral), -1 → #ef4444 (loss)
    const t = -clamped;
    const rC = Math.round(75 + (239 - 75) * t);
    const gC = Math.round(85 + (68 - 85) * t);
    const bC = Math.round(99 + (68 - 99) * t);
    return `rgb(${rC},${gC},${bC})`;
  }
}

export function CorrelationHeatmap({ tickers, priceData }: CorrelationHeatmapProps) {
  // Only show for 2+ instruments (excluding SPY which is benchmark only)
  const userTickers = tickers.filter((t) => priceData.has(t));
  if (userTickers.length < 2) return null;

  // Build returns series per ticker
  const returnsByTicker: Map<string, number[]> = new Map();
  for (const t of userTickers) {
    const series = priceData.get(t);
    if (!series || series.length < 2) continue;
    returnsByTicker.set(t, toReturns(series.map((p) => p.close)));
  }

  const activeTickers = [...returnsByTicker.keys()];
  if (activeTickers.length < 2) return null;

  // Build NxN correlation matrix
  const matrix: number[][] = activeTickers.map((ta) =>
    activeTickers.map((tb) => {
      if (ta === tb) return 1;
      return pearson(returnsByTicker.get(ta)!, returnsByTicker.get(tb)!);
    })
  );

  const cellSize = Math.min(52, Math.floor(280 / activeTickers.length));

  return (
    <div className="bg-elevated border border-border rounded-xl p-4 mb-6">
      <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3">
        Asset Correlation
      </p>
      <p className="text-xs text-muted mb-3">
        How much your picks move together. High correlation = less diversification.
      </p>

      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: 3 }}>
          <thead>
            <tr>
              {/* empty corner */}
              <th className="w-10" />
              {activeTickers.map((t) => (
                <th
                  key={t}
                  className="text-muted text-xs font-mono font-medium pb-1"
                  style={{ width: cellSize, minWidth: cellSize }}
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeTickers.map((ta, i) => (
              <tr key={ta}>
                <td className="text-muted text-xs font-mono font-medium pr-2 text-right whitespace-nowrap">
                  {ta}
                </td>
                {activeTickers.map((_, j) => {
                  const r = matrix[i]![j]!;
                  const isDiag = i === j;
                  return (
                    <td
                      key={j}
                      title={`${activeTickers[i]} vs ${activeTickers[j]}: ${r.toFixed(2)}`}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        background: corrColor(r),
                        borderRadius: 4,
                        opacity: isDiag ? 0.5 : 1,
                      }}
                      className="text-center"
                    >
                      <span
                        className="text-xs font-mono font-bold"
                        style={{ color: Math.abs(r) > 0.5 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)" }}
                      >
                        {r.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-muted text-xs font-mono">−1</span>
        <div
          className="h-1.5 flex-1 rounded-full"
          style={{ background: "linear-gradient(to right, rgb(239,68,68), rgb(75,85,99), rgb(34,197,94))" }}
        />
        <span className="text-muted text-xs font-mono">+1</span>
      </div>
    </div>
  );
}
