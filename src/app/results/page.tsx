"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSimulationStore } from "@/store/simulationStore";
import { usePortfolioStore } from "@/store/portfolioStore";
import { useRulesStore } from "@/store/rulesStore";
import { useLeaderboardStore } from "@/store/leaderboardStore";
import { PortfolioChart } from "@/components/charts/PortfolioChart";
import { AnalyticsGrid } from "@/components/results/AnalyticsGrid";
import { CounterfactualPanel } from "@/components/results/CounterfactualPanel";
import { CorrelationHeatmap } from "@/components/results/CorrelationHeatmap";
import { ShareCard } from "@/components/results/ShareCard";
import { GifReplayButton } from "@/components/results/GifReplayButton";
import { Spinner } from "@/components/ui/Spinner";
import { loadPriceDataMap } from "@/data/loaders";
import { formatCurrency, formatDate } from "@/lib/format";

// ─── Investor personality ──────────────────────────────────────────────────────
const CRYPTO_TICKERS = new Set(["BTC", "ETH", "DOGE", "SOL"]);
const LEVERAGED_TICKERS = new Set(["TQQQ", "SQQQ", "UPRO"]);
const SAFE_TICKERS = new Set(["TLT", "GLD"]);
const MEME_TICKERS = new Set(["GME", "DOGE"]);

function computePersonality(
  allocations: { ticker: string; pct: number }[],
  manualTrades: number,
  rulesFired: number,
  returnPct: number,
): { type: string; emoji: string; description: string } {
  const pctOf = (set: Set<string>) =>
    allocations.filter((a) => set.has(a.ticker)).reduce((s, a) => s + a.pct, 0);
  const cryptoPct = pctOf(CRYPTO_TICKERS);
  const leveragedPct = pctOf(LEVERAGED_TICKERS);
  const safePct = pctOf(SAFE_TICKERS);
  const memePct = pctOf(MEME_TICKERS);
  const totalTrades = manualTrades + rulesFired;

  if (leveragedPct >= 40)
    return { type: "YOLO Trader", emoji: "🎰", description: "Leverage? In this economy? Respect." };
  if (memePct >= 30)
    return { type: "Meme Merchant", emoji: "🐸", description: "To the moon. Or straight into the ground." };
  if (cryptoPct >= 50)
    return { type: "Crypto Degen", emoji: "🌕", description: "Number go up. Number also go down. Mostly down." };
  if (manualTrades === 0 && rulesFired === 0)
    return { type: "HODL Devotee", emoji: "🗿", description: "Buy. Hold. Suffer in silence. Occasionally win." };
  if (safePct >= 50)
    return { type: "Safe Haven Seeker", emoji: "🏔️", description: "Bonds and gold. You've been burned before." };
  if (manualTrades >= 8)
    return { type: "Overactive Trader", emoji: "🦅", description: "Market timing never works. You'll try anyway." };
  if (rulesFired >= 5 && manualTrades <= 1)
    return { type: "Quant", emoji: "🤖", description: "Let the algos cook. Cold, calculated, occasionally wrong." };
  if (returnPct >= 0.5)
    return { type: "Market Wizard", emoji: "🔮", description: "How did you do that. Please explain slowly." };
  if (returnPct <= -0.4)
    return { type: "Bag Holder", emoji: "💼", description: "You held through all of that. Respect, we think." };
  if (totalTrades >= 3 && returnPct > 0)
    return { type: "Active Manager", emoji: "📊", description: "Busy hands, positive outcome. Beginner's luck counts." };
  return { type: "Balanced Investor", emoji: "⚖️", description: "Diversified, disciplined, boring. Statistically correct." };
}

const GRADE_COLOR: Record<string, string> = {
  "A+": "text-gain",
  "A":  "text-gain",
  "B+": "text-gain",
  "B":  "text-accent",
  "C":  "text-secondary",
  "D":  "text-loss",
  "F":  "text-loss",
};

export default function ResultsPage() {
  const router = useRouter();
  const analytics = useAnalytics();
  const state = useSimulationStore((s) => s.state);
  const priceData = useSimulationStore((s) => s.priceData);
  const resetSim = useSimulationStore((s) => s.reset);
  const initSimulation = useSimulationStore((s) => s.initSimulation);
  const submitTrade = useSimulationStore((s) => s.submitTrade);
  const resetPortfolio = usePortfolioStore((s) => s.reset);
  const resetRules = useRulesStore((s) => s.reset);
  const addEntry = useLeaderboardStore((s) => s.addEntry);
  const updatePersonalBest = useLeaderboardStore((s) => s.updatePersonalBest);
  const updateScenarioPersonalBest = useLeaderboardStore((s) => s.updateScenarioPersonalBest);
  const updateStreak = useLeaderboardStore((s) => s.updateStreak);
  const setLastRunHistory = useLeaderboardStore((s) => s.setLastRunHistory);
  const lastRunHistories = useLeaderboardStore((s) => s.lastRunHistories);
  const personalBest = useLeaderboardStore((s) => s.personalBest);
  const streak = useLeaderboardStore((s) => s.streak);
  const addedRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [challengeCopied, setChallengeCopied] = useState(false);
  // History scrubber: null = show full history
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);

  // Ghost line: previous run for same scenario slug
  const ghostData = state ? lastRunHistories[state.config.scenario.slug] : undefined;

  // Benchmark: SPY series normalised to starting portfolio value (full history)
  const benchmarkDataFull = useMemo(() => {
    if (!state || !priceData) return undefined;
    const spySeries = priceData.get("SPY");
    if (!spySeries || spySeries.length === 0) return undefined;
    const spyStart = spySeries[0]?.close;
    const sv = state.portfolio.startingValue;
    if (!spyStart || !sv) return undefined;
    const spyMap = new Map(spySeries.map((p) => [p.date, p.close]));
    return state.history.map((snap) => {
      const spyClose = spyMap.get(snap.date) ?? spyStart;
      return { date: snap.date, value: (spyClose / spyStart) * sv };
    });
  }, [state, priceData]);

  // SPY return % for counterfactual panel
  const spyReturnPct = useMemo(() => {
    if (!priceData) return null;
    const spySeries = priceData.get("SPY");
    if (!spySeries || spySeries.length < 2) return null;
    const first = spySeries[0]?.close;
    const last = spySeries[spySeries.length - 1]?.close;
    if (!first || !last || first === 0) return null;
    return (last - first) / first;
  }, [priceData]);

  // Add to leaderboard, update streak + personal best — once per result
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

    updatePersonalBest(analytics.totalReturnPct);
    updateScenarioPersonalBest(state.config.scenario.slug, analytics.totalReturnPct);
    updateStreak();
    setLastRunHistory(state.config.scenario.slug, state.history);

    // Confetti for big wins
    if (analytics.totalReturnPct >= 0.2) {
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      });
    }
  }, [analytics, state, addEntry, updatePersonalBest, updateScenarioPersonalBest, updateStreak, setLastRunHistory]);

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

  const handleTweet = () => {
    if (!analytics || !state) return;
    const ret = analytics.totalReturnPct * 100;
    const sign = ret >= 0 ? "+" : "";
    const p = computePersonality(
      state.config.allocations,
      analytics.totalManualTrades,
      analytics.totalRulesFired,
      analytics.totalReturnPct,
    );
    const text = [
      `I turned ${formatCurrency(analytics.startingValue)} into ${formatCurrency(analytics.finalValue)} (${sign}${ret.toFixed(1)}%) during the ${state.config.scenario.name}.`,
      `Grade: ${analytics.grade} · ${p.emoji} ${p.type}`,
      `Think you can do better? moneybags.app`,
    ].join("\n\n");
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleCopyChallenge = () => {
    if (!state) return;
    const { scenario, allocations } = state.config;
    const a = allocations.map((al) => `${al.ticker}:${Math.round(al.pct)}`).join(",");
    const url = `${window.location.origin}/setup?s=${scenario.slug}&a=${a}`;
    navigator.clipboard.writeText(url).then(() => {
      setChallengeCopied(true);
      setTimeout(() => setChallengeCopied(false), 2500);
    });
  };

  const handleReplay = async () => {
    if (!state || replaying) return;
    setReplaying(true);
    addedRef.current = false; // allow re-recording result
    try {
      const { scenario, startingCapital, allocations, rules: rulesCfg, mode, granularity } = state.config;
      const tickers = allocations.map((a) => a.ticker);
      const priceData = await loadPriceDataMap(tickers, scenario.slug);
      initSimulation({ startingCapital, scenario, allocations, rules: rulesCfg, mode, granularity }, priceData);
      allocations.forEach((alloc) => {
        submitTrade({ ticker: alloc.ticker, action: "buy", amount: (alloc.pct / 100) * startingCapital, source: "manual" });
      });
      router.push("/simulate");
    } catch {
      setReplaying(false);
    }
  };

  const handleCopy = () => {
    if (!analytics || !state) return;
    const ret = analytics.totalReturnPct * 100;
    const sign = ret >= 0 ? "+" : "";
    const hodl = analytics.hodlReturnPct * 100;
    const beatHodl = ret > hodl;
    const text = [
      `I turned ${formatCurrency(analytics.startingValue)} into ${formatCurrency(analytics.finalValue)} (${sign}${ret.toFixed(1)}%) during the ${state.config.scenario.name}.`,
      `Grade: ${analytics.grade}${beatHodl ? ` | Beat buy-and-hold by ${(ret - hodl).toFixed(1)}%` : ""}`,
      "moneybags.app",
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
  const isShameMode = totalReturn <= -40;
  const beatHodl = analytics
    ? analytics.totalReturnPct > analytics.hodlReturnPct
    : false;

  // Scrubber: which slice of history to display
  const effectiveScrubIndex = scrubIndex ?? history.length;
  const displayedHistory = effectiveScrubIndex < history.length
    ? history.slice(0, effectiveScrubIndex)
    : history;
  const displayedBenchmark = benchmarkDataFull?.slice(0, displayedHistory.length);

  return (
    <main className="min-h-screen px-4 py-6 max-w-lg mx-auto pb-12">
      {/* Back nav */}
      <Link href="/" className="text-secondary text-sm hover:text-primary transition-colors">
        ← Home
      </Link>

      {/* Streak badge */}
      {streak >= 2 && (
        <div className="mt-3 inline-flex items-center gap-1.5 bg-accent/10 border border-accent/30 rounded-full px-3 py-1">
          <span className="text-sm">🔥</span>
          <span className="text-xs font-semibold text-accent">{streak} run streak</span>
        </div>
      )}

      {/* Hero */}
      <div className={`text-center my-8 ${isShameMode ? "opacity-90" : ""}`}>
        {isShameMode && (
          <p className="text-4xl mb-2">💀</p>
        )}
        <p className="text-xs text-secondary font-mono mb-1">{scenarioName}</p>

        {/* Grade + value on same row */}
        <div className="flex items-start justify-center gap-4">
          <p className={`text-5xl font-bold font-mono mb-1 ${isGain ? "text-gain" : "text-loss"}`}>
            {formatCurrency(finalValue)}
          </p>
          {analytics && (
            <span className={`text-3xl font-bold font-mono mt-0.5 ${GRADE_COLOR[analytics.grade] ?? "text-secondary"}`}>
              {analytics.grade}
            </span>
          )}
        </div>

        <p className={`text-lg font-mono ${isGain ? "text-gain" : "text-loss"}`}>
          {isGain ? "+" : ""}{formatCurrency(finalValue - startingValue)}{" "}
          ({isGain ? "+" : ""}{totalReturn.toFixed(1)}%)
        </p>

        {isShameMode && (
          <p className="text-loss text-sm font-semibold mt-2">You did this to yourself.</p>
        )}

        {analytics && (
          <p className="text-xs text-secondary mt-3 italic">
            {analytics.totalRulesFired > 0
              ? `${analytics.totalRulesFired} rules fired. ${analytics.totalManualTrades} manual trades.`
              : analytics.totalManualTrades > 0
              ? `${analytics.totalManualTrades} manual trades made.`
              : "No rules. No trades. Pure vibes."}
          </p>
        )}

        {/* Personal best */}
        {personalBest && (
          <p className="text-xs text-muted mt-1">
            Your best: {personalBest.returnPct >= 0 ? "+" : ""}{(personalBest.returnPct * 100).toFixed(1)}%
          </p>
        )}
      </div>

      {/* Beat the market banner */}
      {beatHodl && analytics && (
        <div className="bg-gain/10 border border-gain/30 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-gain text-sm font-semibold">You beat buy-and-hold 🎯</p>
            <p className="text-xs text-secondary mt-0.5">
              HODL would have returned {analytics.hodlReturnPct >= 0 ? "+" : ""}{(analytics.hodlReturnPct * 100).toFixed(1)}%
            </p>
          </div>
          <span className="text-gain font-mono font-bold text-sm">
            +{((analytics.totalReturnPct - analytics.hodlReturnPct) * 100).toFixed(1)}%
          </span>
        </div>
      )}

      {/* HODL comparison (when not beating it) */}
      {!beatHodl && analytics && (
        <div className="bg-elevated border border-border rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <p className="text-xs text-secondary">Buy-and-hold would have returned</p>
          <span className={`font-mono font-bold text-sm ${analytics.hodlReturnPct >= 0 ? "text-gain" : "text-loss"}`}>
            {analytics.hodlReturnPct >= 0 ? "+" : ""}{(analytics.hodlReturnPct * 100).toFixed(1)}%
          </span>
        </div>
      )}

      {/* Investor personality type */}
      {analytics && state && (() => {
        const p = computePersonality(
          state.config.allocations,
          analytics.totalManualTrades,
          analytics.totalRulesFired,
          analytics.totalReturnPct,
        );
        return (
          <div className="bg-elevated border border-border rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <span className="text-3xl">{p.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-primary font-semibold text-sm">{p.type}</p>
              <p className="text-secondary text-xs italic">{p.description}</p>
            </div>
            <button
              onClick={handleTweet}
              className="shrink-0 text-xs text-secondary border border-border rounded-lg px-3 py-1.5 hover:border-secondary hover:text-primary transition-colors"
            >
              𝕏 Share
            </button>
          </div>
        );
      })()}

      {/* Full history chart + scrubber */}
      <div className="mb-6">
        <PortfolioChart
          history={displayedHistory}
          events={events}
          height={200}
          benchmarkData={displayedBenchmark}
          ghostData={ghostData}
        />
        {history.length > 2 && (
          <div className="mt-2 px-1">
            <input
              type="range"
              min={1}
              max={history.length}
              value={effectiveScrubIndex}
              onChange={(e) => setScrubIndex(Number(e.target.value))}
              className="w-full accent-accent h-1 cursor-pointer"
            />
            <div className="flex justify-between text-muted text-xs font-mono mt-1">
              <span>{formatDate(history[0]?.date ?? "", true)}</span>
              <span className="text-secondary">
                {displayedHistory[displayedHistory.length - 1]?.date !== history[history.length - 1]?.date
                  ? formatDate(displayedHistory[displayedHistory.length - 1]?.date ?? "", true)
                  : ""}
              </span>
              <span>{formatDate(history[history.length - 1]?.date ?? "", true)}</span>
            </div>
          </div>
        )}
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

      {/* Counterfactual: what-if comparison */}
      {analytics && (
        <CounterfactualPanel
          startingCapital={startingValue}
          yourReturnPct={analytics.totalReturnPct}
          hodlReturnPct={analytics.hodlReturnPct}
          spyReturnPct={spyReturnPct}
        />
      )}

      {/* Correlation heatmap (multi-asset only) */}
      {priceData && state && (
        <CorrelationHeatmap
          tickers={state.config.allocations.map((a) => a.ticker)}
          priceData={priceData}
        />
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
        {/* Replay same setup */}
        <button
          onClick={handleReplay}
          disabled={replaying}
          className="bg-elevated text-accent font-semibold rounded-xl px-6 py-3 text-sm border border-accent/30 min-h-[44px] flex items-center justify-center gap-2 hover:bg-accent/10 transition-colors disabled:opacity-60"
        >
          {replaying ? <><Spinner size="sm" /> Re-running...</> : "↩ Replay Same Setup"}
        </button>
        {/* Copy results */}
        <button
          onClick={handleCopy}
          className="bg-elevated text-primary font-medium rounded-xl px-6 py-3 text-sm border border-border min-h-[44px] flex items-center justify-center hover:border-secondary transition-colors"
        >
          {copied ? "Copied! ✓" : "Copy Results"}
        </button>
        {/* Animated GIF replay */}
        <GifReplayButton history={history} scenario={state.config.scenario} />
        {/* Tweet results */}
        <button
          onClick={handleTweet}
          className="bg-elevated text-primary font-medium rounded-xl px-6 py-3 text-sm border border-border min-h-[44px] flex items-center justify-center gap-2 hover:border-secondary transition-colors"
        >
          𝕏 Post Results
        </button>
        {/* Challenge a friend */}
        <button
          onClick={handleCopyChallenge}
          className="bg-elevated text-secondary font-medium rounded-xl px-6 py-3 text-sm border border-border min-h-[44px] flex items-center justify-center gap-1.5 hover:border-secondary transition-colors"
        >
          {challengeCopied ? "Link copied! ✓" : "⚔️ Challenge a Friend"}
        </button>
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
