"use client";

import { useLeaderboardStore } from "@/store/leaderboardStore";

export function StreakBadge() {
  const streak = useLeaderboardStore((s) => s.streak);
  const bestStreak = useLeaderboardStore((s) => s.bestStreak);

  if (streak < 2) return null;

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/30 rounded-full px-4 py-1.5">
        <span className="text-base">🔥</span>
        <span className="text-xs font-semibold text-accent">
          {streak} day streak
        </span>
        {bestStreak > streak && (
          <span className="text-xs text-muted">· best {bestStreak}</span>
        )}
      </div>
    </div>
  );
}
