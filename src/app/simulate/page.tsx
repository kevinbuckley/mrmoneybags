"use client";

import Link from "next/link";

export default function SimulatePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-xs text-secondary">Portfolio Value</p>
          <p className="text-2xl font-bold font-mono text-primary">$10,000</p>
          <p className="text-xs text-secondary font-mono">+$0 (0.0%) today</p>
        </div>
        <Link href="/results" className="text-xs text-accent">Skip to Results →</Link>
      </div>

      {/* Chart placeholder */}
      <div className="flex-1 flex items-center justify-center bg-base">
        <p className="text-secondary text-sm">Simulation chart — coming in Phase 3</p>
      </div>

      {/* Chyron */}
      <div className="h-8 bg-surface border-t border-border flex items-center overflow-hidden">
        <div className="text-xs text-secondary font-mono px-4 whitespace-nowrap">
          BREAKING: Local investor down bad, blames market • Portfolio diversification: for people who want to lose money slowly •
        </div>
      </div>

      {/* Playback controls */}
      <div className="h-14 bg-surface border-t border-border flex items-center justify-center gap-6 px-4 pb-safe">
        <button className="text-secondary text-xl min-w-[44px] min-h-[44px] flex items-center justify-center">⏮</button>
        <button className="text-primary text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center">▶</button>
        <button className="text-secondary text-xl min-w-[44px] min-h-[44px] flex items-center justify-center">⏭</button>
        <div className="flex gap-1 ml-2">
          {["1x", "5x", "10x"].map((s) => (
            <button key={s} className="text-xs text-secondary px-2 py-1 rounded border border-border min-h-[32px]">{s}</button>
          ))}
        </div>
      </div>
    </main>
  );
}
