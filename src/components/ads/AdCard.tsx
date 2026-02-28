"use client";

import { useEffect } from "react";

const PUB_ID = "ca-pub-2954508563135581";
const SLOT_ID = "REPLACE_WITH_SLOT_ID"; // paste results-card slot ID here

interface AdCardProps {
  className?: string;
}

export function AdCard({ className = "" }: AdCardProps) {
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // ad blocked or not loaded
    }
  }, []);

  if (process.env.NODE_ENV === "development") {
    return (
      <div className={`w-full min-h-[100px] border border-dashed border-border rounded-xl flex items-center justify-center ${className}`}>
        <span className="text-xs text-muted">Ad card</span>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <p className="text-xs text-muted text-center mb-1">Advertisement</p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={PUB_ID}
        data-ad-slot={SLOT_ID}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
