"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/format";
import type { SimulationAnalytics } from "@/types/analytics";

interface ShareCardProps {
  analytics: SimulationAnalytics;
  scenarioName: string;
  bestDayDate: string;
  worstDayDate: string;
}

export function ShareCard({
  analytics,
  scenarioName,
  bestDayDate,
  worstDayDate,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#13131a",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `mrmoneybags-${scenarioName.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  };

  const isGain = analytics.totalReturnPct >= 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Card to export */}
      <div
        ref={cardRef}
        className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted text-xs font-mono uppercase tracking-wider mb-1">
              Mr. Money Bags
</p>
            <p className="text-primary font-semibold text-sm">{scenarioName}</p>
          </div>
          <span className={`text-2xl font-bold font-mono ${isGain ? "text-gain" : "text-loss"}`}>
            {isGain ? "+" : ""}{analytics.totalReturnPct.toFixed(1)}%
          </span>
        </div>

        {/* Values */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-secondary text-xs">Started with</span>
            <span className="text-primary font-mono text-sm">{formatCurrency(analytics.startingValue)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-secondary text-xs">Ended with</span>
            <span className={`font-mono font-bold text-sm ${isGain ? "text-gain" : "text-loss"}`}>
              {formatCurrency(analytics.finalValue)}
            </span>
          </div>
        </div>

        {/* Best / Worst */}
        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
          <div>
            <p className="text-muted text-xs mb-0.5">Best day</p>
            <p className="text-gain font-mono text-sm font-semibold">
              +{analytics.bestDayReturn.toFixed(1)}%
            </p>
            <p className="text-muted text-xs">{formatDate(bestDayDate, true)}</p>
          </div>
          <div>
            <p className="text-muted text-xs mb-0.5">Worst day</p>
            <p className="text-loss font-mono text-sm font-semibold">
              {analytics.worstDayReturn.toFixed(1)}%
            </p>
            <p className="text-muted text-xs">{formatDate(worstDayDate, true)}</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-muted text-xs text-center border-t border-border pt-2 italic">
          Fake money. Real regret.
        </p>
      </div>

      <Button
        variant="secondary"
        onClick={() => void handleShare()}
        disabled={exporting}
        className="w-full"
      >
        {exporting ? "Exporting..." : "Share Results →"}
      </Button>
    </div>
  );
}
