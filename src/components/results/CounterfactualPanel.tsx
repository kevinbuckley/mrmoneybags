"use client";

import { formatCurrency } from "@/lib/format";

interface CounterfactualRow {
  label: string;
  returnPct: number;
  finalValue: number;
  highlight?: boolean;
}

interface CounterfactualPanelProps {
  startingCapital: number;
  yourReturnPct: number;
  hodlReturnPct: number;
  /** SPY-only return for the scenario period; null if data unavailable */
  spyReturnPct: number | null;
}

export function CounterfactualPanel({
  startingCapital,
  yourReturnPct,
  hodlReturnPct,
  spyReturnPct,
}: CounterfactualPanelProps) {
  const rows: CounterfactualRow[] = [
    {
      label: "Your strategy",
      returnPct: yourReturnPct,
      finalValue: startingCapital * (1 + yourReturnPct),
      highlight: true,
    },
    {
      label: "Buy & hold (same picks)",
      returnPct: hodlReturnPct,
      finalValue: startingCapital * (1 + hodlReturnPct),
    },
  ];

  if (spyReturnPct !== null) {
    rows.push({
      label: "100% into SPY",
      returnPct: spyReturnPct,
      finalValue: startingCapital * (1 + spyReturnPct),
    });
  }

  rows.push({
    label: "Hold cash",
    returnPct: 0,
    finalValue: startingCapital,
  });

  // Sort descending by return for ranking
  const sorted = [...rows].sort((a, b) => b.returnPct - a.returnPct);
  const yourRank = sorted.findIndex((r) => r.highlight) + 1;

  return (
    <div className="bg-elevated border border-border rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-secondary uppercase tracking-widest">
          What If?
        </p>
        <span className="text-xs text-muted font-mono">
          #{yourRank} of {rows.length} strategies
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const pct = row.returnPct * 100;
          const isGain = pct >= 0;
          const maxAbsPct = Math.max(...rows.map((r) => Math.abs(r.returnPct)));
          const barWidth = maxAbsPct > 0 ? Math.abs(row.returnPct) / maxAbsPct : 0;

          return (
            <div
              key={row.label}
              className={`flex items-center gap-3 py-1.5 ${row.highlight ? "opacity-100" : "opacity-70"}`}
            >
              {/* Label */}
              <p className={`text-xs w-36 shrink-0 ${row.highlight ? "text-primary font-semibold" : "text-secondary"}`}>
                {row.label}
              </p>

              {/* Bar */}
              <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isGain ? "bg-gain" : "bg-loss"}`}
                  style={{ width: `${barWidth * 100}%` }}
                />
              </div>

              {/* Values */}
              <div className="text-right shrink-0">
                <span className={`text-xs font-mono font-semibold ${isGain ? "text-gain" : "text-loss"}`}>
                  {isGain ? "+" : ""}{pct.toFixed(1)}%
                </span>
                <span className="text-muted text-xs font-mono ml-1.5">
                  {formatCurrency(row.finalValue, true)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
