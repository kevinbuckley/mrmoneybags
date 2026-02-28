"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSimulationStore } from "@/store/simulationStore";
import { usePortfolioStore } from "@/store/portfolioStore";
import { useRulesStore } from "@/store/rulesStore";
import { useLeaderboardStore } from "@/store/leaderboardStore";
import { PortfolioChart } from "@/components/charts/PortfolioChart";
import { AnalyticsGrid } from "@/components/results/AnalyticsGrid";
import { ShareCard } from "@/components/results/ShareCard";
import { formatCurrency } from "@/lib/format";

export default function ResultsPage() {
  const router = useRouter();
  const analytics = useAnalytics();
  const state = useSimulationStore((s) => s.state);
  const resetSim = useSimulationStore((s) => s.reset);
  const resetPortfolio = usePortfolioStore((s) => s.reset);
  const resetRules = useRulesStore((s) => s.reset);
  const addEntry = useLeaderboardStore((s) => s.addEntry);
  const addedRef = useRef(false);

  // Add to leaderboard once when analytics become available
  useEffect(() => {
    if (!analytics || !state || addedRef.current) return;
    addedRef.current = true;
    addEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      scenarioSlug: state.config.scenario.slug,
      scenarioName: state.config.scenario.name,
      startingCapital: analytics.startingValue,
      finalValue: analytics.finalValue,
      returnPct: analytics.totalReturnPct,
      instruments: state.config.allocations.map((a) => a.ticker),
      simulatedAt: new Date().toISOString(),
    });
  }, [analytics, state, addEntry]);

  // Guard: no state → redirect to setup
  useEffect(() => {
    if (state === null) router.push("/setup");
  }, [state, router]);

  const handlePlayAgain = () => {
    resetSim();
    resetPortfolio();
    resetRules();
    router.push("/setup");
  };

  if (!state) return null;

  const history = state.history;
  const events = state.config.scenario.events;
  const scenarioName = state.config.scenario.name;
  const finalValue = state.portfolio.totalValue;
  const startingValue = state.portfolio.startingValue;
  const totalReturn = startingValue > 0
    ? ((finalValue - startingValue) / startingValue) * 100
    : 0;
  const isGain = totalReturn >= 0;

  return (
    <main className="min-h-screen px-4 py-6 max-w-lg mx-auto pb-12">
      {/* Back nav */}
      <Link href="/" className="text-secondary text-sm hover:text-primary transition-colors">
        ← Home
      </Link>

      {/* Hero */}
      <div className="text-center my-8">
        <p className="text-xs text-secondary font-mono mb-1">{scenarioName}</p>
        <p className={`text-5xl font-bold font-mono mb-1 ${isGain ? "text-gain" : "text-loss"}`}>
          {formatCurrency(finalValue)}
        </p>
        <p className={`text-lg font-mono ${isGain ? "text-gain" : "text-loss"}`}>
          {isGain ? "+" : ""}{formatCurrency(finalValue - startingValue)}{" "}
          ({isGain ? "+" : ""}{totalReturn.toFixed(1)}%)
        </p>
        {analytics && (
          <p className="text-xs text-secondary mt-3 italic">
            {analytics.totalRulesFired > 0
              ? `${analytics.totalRulesFired} rules fired. ${analytics.totalManualTrades} manual trades.`
              : analytics.totalManualTrades > 0
              ? `${analytics.totalManualTrades} manual trades made.`
              : "No rules. No trades. Pure vibes."}
          </p>
        )}
      </div>

      {/* Full history chart */}
      <div className="mb-6">
        <PortfolioChart history={history} events={events} height={200} />
      </div>

      {/* Analytics grid */}
      {analytics ? (
        <div className="mb-6">
          <AnalyticsGrid analytics={analytics} />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-elevated border border-border rounded-xl p-4">
              <p className="text-muted text-xs mb-1">Best Day</p>
              <p className="text-gain font-mono font-bold text-lg">
                +{analytics.bestDayReturn.toFixed(1)}%
              </p>
              <p className="text-muted text-xs">{analytics.bestDayDate}</p>
            </div>
            <div className="bg-elevated border border-border rounded-xl p-4">
              <p className="text-muted text-xs mb-1">Worst Day</p>
              <p className="text-loss font-mono font-bold text-lg">
                {analytics.worstDayReturn.toFixed(1)}%
              </p>
              <p className="text-muted text-xs">{analytics.worstDayDate}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-elevated border border-border rounded-xl p-4 mb-6 text-center">
          <p className="text-secondary text-sm">
            Analytics require a completed simulation with sufficient history.
          </p>
        </div>
      )}

      {/* Share card */}
      {analytics && (
        <div className="mb-6">
          <ShareCard
            analytics={analytics}
            scenarioName={scenarioName}
            bestDayDate={analytics.bestDayDate}
            worstDayDate={analytics.worstDayDate}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handlePlayAgain}
          className="bg-accent text-white font-semibold rounded-xl px-6 py-3 text-sm min-h-[44px] flex items-center justify-center hover:bg-accent/90 transition-colors"
        >
          Play Again →
        </button>
        <Link
          href="/leaderboard"
          className="bg-elevated text-primary font-medium rounded-xl px-6 py-3 text-sm border border-border min-h-[44px] flex items-center justify-center hover:border-secondary transition-colors"
        >
          View Leaderboard
        </Link>
      </div>
    </main>
  );
}
