"use client";

import { useLeaderboardStore } from "@/store/leaderboardStore";

interface Props {
  scenarioSlug: string;
}

export function PersonalBestBadge({ scenarioSlug }: Props) {
  const best = useLeaderboardStore((s) => s.scenarioPersonalBests[scenarioSlug]);

  if (!best) return null;

  const pct = best.returnPct * 100;
  const isGain = pct >= 0;

  return (
    <span
      className={`text-xs font-mono font-semibold ${
        isGain ? "text-gain" : "text-loss"
      }`}
    >
      Best: {isGain ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}
