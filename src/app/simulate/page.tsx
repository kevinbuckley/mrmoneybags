"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSimulation } from "@/hooks/useSimulation";
import { useSimulationStore } from "@/store/simulationStore";
import { useLeaderboardStore } from "@/store/leaderboardStore";
import { PortfolioChart } from "@/components/charts/PortfolioChart";
import { NarratorPopup } from "@/components/narrator/NarratorPopup";
import { PlaybackControls } from "@/components/simulation/PlaybackControls";
import { PortfolioPanel } from "@/components/simulation/PortfolioPanel";
import { AdInterstitial } from "@/components/ads/AdInterstitial";
import { SellPutPanel } from "@/components/simulation/SellPutPanel";
import { playSound } from "@/lib/sound";

export default function SimulatePage() {
  const router = useRouter();
  useSimulation(); // drives the playback interval

  const state = useSimulationStore((s) => s.state);
  const priceData = useSimulationStore((s) => s.priceData);
  const play = useSimulationStore((s) => s.play);
  const lastRunHistories = useLeaderboardStore((s) => s.lastRunHistories);
  const hasAutoStarted = useRef(false);
  const [adDismissed, setAdDismissed] = useState(false);
  const [sellPutOpen, setSellPutOpen] = useState(false);

  // Auto-start only after ad is dismissed
  useEffect(() => {
    if (state && adDismissed && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      play();
    }
  }, [state, adDismissed, play]);

  // Redirect to results 1.5s after simulation completes
  useEffect(() => {
    if (state?.isComplete) {
      const t = setTimeout(() => router.push("/results"), 1500);
      return () => clearTimeout(t);
    }
  }, [state?.isComplete, router]);

  // Guard: redirect to setup if no state (direct navigation or page refresh)
  useEffect(() => {
    if (state === null) {
      router.push("/setup");
    }
  }, [state, router]);

  // Sound: play on significant day moves (>±2%)
  const histLen = state?.history.length ?? 0;
  const lastHistory = state?.history;
  useEffect(() => {
    if (histLen === 0 || !lastHistory) return;
    const snap = lastHistory[histLen - 1];
    if (!snap) return;
    if (snap.dayReturn > 0.02) playSound("gain_day");
    else if (snap.dayReturn < -0.02) playSound("loss_day");
  }, [histLen, lastHistory]);

  // Sound: play completion fanfare
  useEffect(() => {
    if (state?.isComplete) playSound("complete");
  }, [state?.isComplete]);

  const history = state?.history ?? [];
  const events = state?.config.scenario.events ?? [];
  const scenarioSlug = state?.config.scenario.slug;

  // Ghost line: previous run history for same scenario
  const ghostData = scenarioSlug ? lastRunHistories[scenarioSlug] : undefined;

  // Benchmark: SPY normalised to same starting value as portfolio
  const benchmarkData = useMemo(() => {
    if (!state || !priceData) return undefined;
    const spySeries = priceData.get("SPY");
    if (!spySeries || spySeries.length === 0) return undefined;
    const spyStart = spySeries[0]?.close;
    const startValue = state.portfolio.startingValue || state.portfolio.totalValue;
    if (!spyStart || !startValue) return undefined;
    const spyMap = new Map(spySeries.map((p) => [p.date, p.close]));
    return history.map((snap) => {
      const spyClose = spyMap.get(snap.date) ?? spyStart;
      return { date: snap.date, value: (spyClose / spyStart) * startValue };
    });
  }, [state, priceData, history]);

  return (
    <main className="h-dvh flex flex-col overflow-hidden">
      {/* Full-page ad shown before simulation starts */}
      {!adDismissed && <AdInterstitial onDismiss={() => setAdDismissed(true)} />}

      {/* Portfolio header */}
      <PortfolioPanel />

      {/* Chart */}
      <div className="flex-1 min-h-0 flex flex-col justify-center px-2 py-2">
        <PortfolioChart
          history={history}
          events={events}
          height={220}
          benchmarkData={benchmarkData}
          ghostData={ghostData}
        />
      </div>

      {/* Completion banner */}
      {state?.isComplete && (
        <div className="bg-accent/10 border-t border-accent/30 px-4 py-2 text-center">
          <p className="text-accent text-sm font-semibold">
            Simulation complete — heading to results...
          </p>
        </div>
      )}

      {/* Sell Put button (only while simulation is running) */}
      {!state?.isComplete && (
        <div className="px-4 pb-1 flex justify-end">
          <button
            onClick={() => setSellPutOpen(true)}
            className="text-xs text-secondary border border-border rounded-lg px-3 py-1.5 hover:border-secondary hover:text-primary transition-colors"
          >
            📉 Sell Put
          </button>
        </div>
      )}

      {/* Playback controls */}
      <PlaybackControls />

      {/* Sell Put Panel */}
      <SellPutPanel open={sellPutOpen} onClose={() => setSellPutOpen(false)} />

      {/* Narrator popups (fixed top-right, non-blocking) */}
      <NarratorPopup />
    </main>
  );
}
