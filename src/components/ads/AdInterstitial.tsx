"use client";

import { useEffect, useState } from "react";

const PUB_ID = "ca-pub-2954508563135581";
const SLOT_ID = "4359398745";
const COUNTDOWN_SEC = 5;

interface AdInterstitialProps {
  onDismiss: () => void;
}

export function AdInterstitial({ onDismiss }: AdInterstitialProps) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SEC);
  const isDev = process.env.NODE_ENV === "development";

  // Push the ad unit once on mount
  useEffect(() => {
    if (isDev) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // ad blocked or not loaded
    }
  }, [isDev]);

  // Countdown timer
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const canSkip = seconds <= 0;

  return (
    <div className="fixed inset-0 z-50 bg-base flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs text-muted">Advertisement</span>
        <button
          onClick={canSkip ? onDismiss : undefined}
          disabled={!canSkip}
          className={`text-sm font-semibold px-3 py-1 rounded-lg transition-colors ${
            canSkip
              ? "bg-accent text-white"
              : "bg-surface text-muted cursor-not-allowed"
          }`}
        >
          {canSkip ? "Start Simulation →" : `Skip in ${seconds}s`}
        </button>
      </div>

      {/* Ad */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {isDev ? (
          <div className="w-full max-w-md h-64 border border-dashed border-border rounded-xl flex items-center justify-center">
            <span className="text-xs text-muted">Full-page ad ({SLOT_ID})</span>
          </div>
        ) : (
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", maxWidth: 480, minHeight: 280 }}
            data-ad-client={PUB_ID}
            data-ad-slot={SLOT_ID}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        )}
      </div>
    </div>
  );
}
