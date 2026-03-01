import Link from "next/link";
import type { Metadata } from "next";
import { SCENARIOS } from "@/data/scenarios";
import { StreakBadge } from "@/components/landing/StreakBadge";
import { PersonalBestBadge } from "@/components/landing/PersonalBestBadge";

export const metadata: Metadata = {
  title: "Mr. Moneybags — Invest Fake Money",
  description:
    "Simulate the 2008 crisis, dot-com bubble, Black Monday, and more with real historical data. Rules, auto-trading, and zero real money on the line.",
  openGraph: {
    title: "Mr. Moneybags — Invest Fake Money",
    description:
      "Simulate famous market crashes and bull runs with real data. Pick a scenario, build a portfolio, set trading rules, and see what happens.",
  },
};

const SCENARIO_COLOR: Record<string, string> = {
  red: "border-loss/40 bg-loss/5",
  green: "border-gain/40 bg-gain/5",
  yellow: "border-yellow-500/40 bg-yellow-500/5",
};

const SCENARIO_BADGE: Record<string, string> = {
  red: "text-loss bg-loss/10",
  green: "text-gain bg-gain/10",
  yellow: "text-yellow-400 bg-yellow-500/10",
};

const SCENARIO_EMOJI: Record<string, string> = {
  "2008-crisis": "🔴",
  "dotcom-bubble": "🔴",
  "black-monday": "🔴",
  "covid-crash": "🟡",
  "2021-bull-run": "🟢",
  "2022-crypto-winter": "🔴",
  "2023-ai-boom": "🟢",
  "dotcom-recovery": "🟢",
  "2022-rate-hike": "🔴",
  "the-future": "🔮",
  "tutorial": "🎓",
};

const DIFFICULTY_BADGE: Record<string, string> = {
  Easy: "text-gain bg-gain/10",
  Hard: "text-yellow-400 bg-yellow-500/10",
  Brutal: "text-loss bg-loss/10",
};

export default function LandingPage() {
  const dailyIdx = Math.floor(Date.now() / 86400000) % SCENARIOS.length;
  const dailySlug = SCENARIOS[dailyIdx].slug;

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-4 pt-20 pb-10 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6 tracking-tight">
          Mr. Money<span className="text-accent">bags</span>
        </h1>
        <p className="text-xl md:text-2xl font-bold text-primary mb-4 max-w-lg">
          Hey Mr. Moneybags, I heard you have some money to invest and think you can beat the market.
        </p>
        <p className="text-secondary text-base max-w-md mb-2">
          Simulate famous market crashes and bull runs with real historical data.
          Rules, options, shorts. Try it here so you don&apos;t lose all your real money.
        </p>
        <p className="text-muted text-xs font-mono mb-8">
          7 scenarios · 22 instruments · 100% fake money
        </p>
        {/* Client component — shows streak badge if earned */}
        <StreakBadge />
        <Link
          href="/setup"
          className="bg-accent text-white font-semibold rounded-xl px-10 py-4 text-base active:opacity-80 inline-flex items-center gap-2 hover:bg-accent/90 transition-colors"
        >
          Start Simulating →
        </Link>
      </div>

      {/* Daily Challenge */}
      <div className="px-4 pb-8 max-w-3xl mx-auto w-full">
        <p className="text-muted text-xs font-mono text-center mb-4 uppercase tracking-widest">
          🎯 Today&apos;s Challenge
        </p>
        {(() => {
          const daily = SCENARIOS[dailyIdx];
          return (
            <Link
              href={`/setup?s=${daily.slug}`}
              className="block rounded-2xl border border-accent/50 bg-accent/5 ring-1 ring-accent/30 p-6 transition-all hover:bg-accent/10 hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-2xl">{SCENARIO_EMOJI[daily.slug] ?? "⚪"}</span>
                    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${SCENARIO_BADGE[daily.color]}`}>
                      {daily.startDate.slice(0, 4)}–{daily.endDate.slice(0, 4)}
                    </span>
                    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_BADGE[daily.difficulty]}`}>
                      {daily.difficulty}
                    </span>
                  </div>
                  <h2 className="text-primary font-bold text-xl mb-1">{daily.name}</h2>
                  <p className="text-secondary text-sm italic mb-4">{daily.snarkDescription}</p>
                  <span className="inline-flex items-center gap-1.5 bg-accent text-white font-semibold rounded-lg px-4 py-2 text-sm">
                    Play Today&apos;s Challenge →
                  </span>
                </div>
                <PersonalBestBadge scenarioSlug={daily.slug} />
              </div>
            </Link>
          );
        })()}
      </div>

      {/* Scenario Cards */}
      <div className="px-4 pb-16 max-w-3xl mx-auto w-full">
        <p className="text-muted text-xs font-mono text-center mb-6 uppercase tracking-widest">
          All Scenarios
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SCENARIOS.map((scenario) => (
            <Link
              key={scenario.slug}
              href={`/setup?s=${scenario.slug}`}
              className={`rounded-xl border p-4 transition-all hover:scale-[1.01] active:scale-[0.99] ${SCENARIO_COLOR[scenario.color]} ${scenario.slug === dailySlug ? "ring-1 ring-accent/40" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-base">{SCENARIO_EMOJI[scenario.slug] ?? "⚪"}</span>
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${SCENARIO_BADGE[scenario.color]}`}
                >
                  {scenario.startDate.slice(0, 4)}–{scenario.endDate.slice(0, 4)}
                </span>
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_BADGE[scenario.difficulty]}`}>
                  {scenario.difficulty}
                </span>
                {scenario.slug === dailySlug && (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full text-accent bg-accent/10">
                    🎯 Daily
                  </span>
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-primary font-semibold text-sm mb-0.5">{scenario.name}</h3>
                  <p className="text-secondary text-xs italic">{scenario.snarkDescription}</p>
                </div>
                <PersonalBestBadge scenarioSlug={scenario.slug} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto px-4 py-6 text-center text-xs text-muted border-t border-border">
        <p>Mr. Moneybags is for entertainment and educational purposes only. Not financial advice. Not even close.</p>
        <div className="flex gap-4 justify-center mt-2">
          <Link href="/how-to-play" className="text-secondary hover:text-primary transition-colors">How to Play</Link>
          <Link href="/leaderboard" className="text-secondary hover:text-primary transition-colors">Leaderboard</Link>
        </div>
      </footer>
    </main>
  );
}
