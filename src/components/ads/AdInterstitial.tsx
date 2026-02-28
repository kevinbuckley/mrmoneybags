"use client";

import { Button } from "@/components/ui/Button";

// AdInterstitial — shown between simulation sessions (not mid-simulation)

interface AdInterstitialProps {
  onContinue: () => void;
}

export function AdInterstitial({ onContinue }: AdInterstitialProps) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-base/95 backdrop-blur-sm px-4">
      <p className="text-xs text-muted mb-4">Advertisement</p>

      {isDev ? (
        <div className="w-full max-w-sm min-h-[200px] border border-dashed border-border rounded-xl flex items-center justify-center mb-6">
          <span className="text-xs text-muted">Interstitial ad (PLACEHOLDER)</span>
        </div>
      ) : (
        <div className="w-full max-w-sm min-h-[200px] mb-6">
          {/* AdSense interstitial goes here */}
        </div>
      )}

      <Button onClick={onContinue} variant="secondary" size="md">
        Continue →
      </Button>
    </div>
  );
}
