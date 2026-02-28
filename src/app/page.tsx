import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MoneyBags — Invest Fake Money",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4 tracking-tight">
          Money<span className="text-accent">Bags</span>
        </h1>
        <p className="text-xl md:text-2xl font-bold text-primary mb-2">
          Invest fake money. Make real mistakes.
        </p>
        <p className="text-secondary text-base max-w-md mb-8">
          Simulate famous market crashes and bull runs with real financial instruments.
          No real money required. Snark included.
        </p>
        <Link
          href="/setup"
          className="bg-accent text-white font-semibold rounded-xl px-8 py-4 text-base active:opacity-80 inline-block min-h-[52px] flex items-center"
        >
          Start Simulating →
        </Link>
      </div>
      <footer className="px-4 py-6 text-center text-xs text-muted border-t border-border">
        <p>MoneyBags is for entertainment and educational purposes only. Not financial advice. Not even close.</p>
        <div className="flex gap-4 justify-center mt-2">
          <Link href="/how-to-play" className="text-secondary hover:text-primary">How to Play</Link>
          <Link href="/leaderboard" className="text-secondary hover:text-primary">Leaderboard</Link>
        </div>
      </footer>
    </main>
  );
}
