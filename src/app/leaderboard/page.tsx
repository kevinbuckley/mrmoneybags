"use client";

import { useState } from "react";
import Link from "next/link";
import { useLeaderboardStore } from "@/store/leaderboardStore";
import { formatCurrency } from "@/lib/format";

const RETURN_COLOR = (pct: number) =>
  pct >= 0 ? "text-gain" : "text-loss";

const SCENARIO_SLUG_COLORS: Record<string, string> = {
  "2008-crisis": "text-loss bg-loss/10",
  "dotcom-bubble": "text-loss bg-loss/10",
  "black-monday": "text-loss bg-loss/10",
  "covid-crash": "text-yellow-400 bg-yellow-500/10",
  "2021-bull-run": "text-gain bg-gain/10",
  "2022-crypto-winter": "text-loss bg-loss/10",
};

export default function LeaderboardPage() {
  const entries = useLeaderboardStore((s) => s.entries);
  const clearEntries = useLeaderboardStore((s) => s.clearEntries);
  const [activeScenario, setActiveScenario] = useState<string>("all");

  // Unique scenarios that have at least one entry, in insertion order
  const scenarioSlugs = Array.from(
    new Map(entries.map((e) => [e.scenarioSlug, e.scenarioName])).entries()
  );

  const filtered = activeScenario === "all"
    ? entries
    : entries.filter((e) => e.scenarioSlug === activeScenario);

  const sorted = [...filtered].sort((a, b) => b.returnPct - a.returnPct);

  return (
    <main className="min-h-screen px-4 py-6 max-w-lg mx-auto pb-12">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-secondary text-sm hover:text-primary transition-colors">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-primary">Leaderboard</h1>
        {entries.length > 0 && (
          <button
            onClick={clearEntries}
            className="text-muted text-xs hover:text-loss transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Scenario filter tabs */}
      {entries.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          <button
            onClick={() => setActiveScenario("all")}
            className={`shrink-0 text-xs font-mono font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              activeScenario === "all"
                ? "bg-accent/10 text-accent border-accent/30"
                : "bg-elevated text-secondary border-border hover:border-secondary"
            }`}
          >
            All ({entries.length})
          </button>
          {scenarioSlugs.map(([slug, name]) => {
            const count = entries.filter((e) => e.scenarioSlug === slug).length;
            return (
              <button
                key={slug}
                onClick={() => setActiveScenario(slug)}
                className={`shrink-0 text-xs font-mono font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  activeScenario === slug
                    ? "bg-accent/10 text-accent border-accent/30"
                    : `${SCENARIO_SLUG_COLORS[slug] ?? "text-secondary bg-border"} border-transparent hover:opacity-80`
                }`}
              >
                {name.split(" ").slice(0, 2).join(" ")} ({count})
              </button>
            );
          })}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
          <p className="text-4xl">💸</p>
          <p className="text-secondary text-sm max-w-xs">
            No simulations yet. Your fake fortune won&apos;t lose itself.
          </p>
          <Link
            href="/setup"
            className="bg-accent text-white font-semibold rounded-xl px-6 py-3 text-sm hover:bg-accent/90 transition-colors"
          >
            Start Simulating →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((entry, i) => (
            <div
              key={entry.id}
              className="bg-elevated border border-border rounded-xl px-4 py-3 flex items-center gap-3"
            >
              {/* Rank */}
              <div className="w-8 shrink-0 text-center">
                {i === 0 ? (
                  <span className="text-lg">🥇</span>
                ) : i === 1 ? (
                  <span className="text-lg">🥈</span>
                ) : i === 2 ? (
                  <span className="text-lg">🥉</span>
                ) : (
                  <span className="text-secondary text-sm font-mono">#{i + 1}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
                      SCENARIO_SLUG_COLORS[entry.scenarioSlug] ?? "text-secondary bg-border"
                    }`}
                  >
                    {entry.scenarioSlug.split("-").slice(0, 2).join("-")}
                  </span>
                  <span className="text-muted text-xs truncate">
                    {entry.instruments.slice(0, 3).join(", ")}
                    {entry.instruments.length > 3 ? ` +${entry.instruments.length - 3}` : ""}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-primary font-mono text-sm font-semibold">
                    {formatCurrency(entry.finalValue)}
                  </span>
                  <span className="text-muted text-xs font-mono">
                    from {formatCurrency(entry.startingCapital, true)}
                  </span>
                </div>
              </div>

              {/* Return */}
              <div className="text-right shrink-0">
                <p className={`font-mono font-bold text-lg ${RETURN_COLOR(entry.returnPct)}`}>
                  {entry.returnPct >= 0 ? "+" : ""}{entry.returnPct.toFixed(1)}%
                </p>
                <p className="text-muted text-xs">
                  {new Date(entry.simulatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="mt-6 text-center">
          <Link
            href="/setup"
            className="text-accent text-sm hover:underline"
          >
            Try to beat your high score →
          </Link>
        </div>
      )}
    </main>
  );
}
