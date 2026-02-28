"use client";

// Layer 6: component — animated GIF replay download button

import { useState } from "react";
import { generateReplayGif } from "@/lib/gifReplay";
import type { PortfolioSnapshot } from "@/types/portfolio";
import type { Scenario } from "@/types/scenario";

interface GifReplayButtonProps {
  history: PortfolioSnapshot[];
  scenario: Scenario;
}

type Status = "idle" | "generating" | "done" | "error";

const LABELS: Record<Status, string> = {
  idle: "🎬 Download Replay GIF",
  generating: "Generating…",
  done: "✓ GIF Downloaded!",
  error: "Failed — try again",
};

export function GifReplayButton({ history, scenario }: GifReplayButtonProps) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleClick() {
    if (status === "generating") return;
    setStatus("generating");
    try {
      const blob = await generateReplayGif(history, scenario);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `moneybags-${scenario.slug}-replay.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      console.error("GIF generation failed:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === "generating"}
      className="bg-elevated text-secondary font-medium rounded-xl px-6 py-3 text-sm border border-border min-h-[44px] flex items-center justify-center gap-1.5 hover:border-secondary transition-colors disabled:opacity-60"
    >
      {status === "generating" && (
        <span className="inline-block w-3.5 h-3.5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
      )}
      {LABELS[status]}
    </button>
  );
}
