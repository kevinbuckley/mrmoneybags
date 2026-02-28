"use client";

// AdCard — inline card-sized ad slot for results screen

interface AdCardProps {
  slot?: string;
  className?: string;
}

export function AdCard({ slot = "PLACEHOLDER", className = "" }: AdCardProps) {
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    return (
      <div className={`w-full min-h-[100px] border border-dashed border-border rounded-xl flex items-center justify-center ${className}`}>
        <span className="text-xs text-muted">Ad card ({slot})</span>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-[100px] ${className}`}>
      <p className="text-xs text-muted text-center mb-1">Advertisement</p>
    </div>
  );
}
