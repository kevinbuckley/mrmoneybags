"use client";

import Link from "next/link";

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      <Link href="/" className="text-secondary text-sm mb-6 inline-block">← Back</Link>
      <h1 className="text-2xl font-bold text-primary mb-6">Leaderboard</h1>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center text-center py-16">
        <p className="text-2xl mb-3">💸</p>
        <p className="text-secondary text-sm max-w-xs">
          No simulations yet. What are you waiting for? Your fake fortune won&apos;t lose itself.
        </p>
        <Link
          href="/setup"
          className="bg-accent text-white font-semibold rounded-xl px-6 py-3 text-sm mt-6 inline-block"
        >
          Start Simulating →
        </Link>
      </div>
    </main>
  );
}
