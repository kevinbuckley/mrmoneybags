"use client";

import Link from "next/link";

export default function ResultsPage() {
  return (
    <main className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      {/* Hero */}
      <div className="text-center mb-8">
        <p className="text-xs text-secondary mb-1">2008 Financial Crisis</p>
        <p className="text-5xl font-bold font-mono text-gain mb-1">$14,230</p>
        <p className="text-lg font-mono text-gain">+$4,230 (+42.3%)</p>
        <p className="text-xs text-secondary mt-3 italic">&ldquo;Impressive. In a real crash, you&apos;d have panic-sold at the bottom.&rdquo;</p>
      </div>

      {/* Analytics placeholder */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: "Sharpe Ratio", value: "—" },
          { label: "Max Drawdown", value: "—" },
          { label: "Volatility", value: "—" },
          { label: "Beta vs S&P", value: "—" },
        ].map((item) => (
          <div key={item.label} className="bg-surface border border-border rounded-xl p-3">
            <p className="text-xs text-secondary mb-1">{item.label}</p>
            <p className="text-lg font-bold font-mono text-primary">{item.value}</p>
          </div>
        ))}
      </div>

      <p className="text-secondary text-sm text-center mb-8">Full results — coming in Phase 3</p>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Link href="/setup" className="bg-accent text-white font-semibold rounded-xl px-6 py-3 text-sm text-center min-h-[44px] flex items-center justify-center">
          Try Again →
        </Link>
        <Link href="/leaderboard" className="bg-elevated text-primary font-medium rounded-xl px-6 py-3 text-sm border border-border text-center min-h-[44px] flex items-center justify-center">
          View Leaderboard
        </Link>
      </div>
    </main>
  );
}
