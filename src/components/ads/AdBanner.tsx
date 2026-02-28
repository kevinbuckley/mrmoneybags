"use client";

// AdBanner — renders a Google AdSense banner slot
// Falls back gracefully if no ad loads (no empty white boxes)
// TODO: Replace placeholder slot IDs with real ones before launch (see TD-006)

interface AdBannerProps {
  slot?: string;
  className?: string;
}

export function AdBanner({ slot = "PLACEHOLDER", className = "" }: AdBannerProps) {
  // In development / no AdSense, render a minimal labeled placeholder
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    return (
      <div className={`w-full min-h-[60px] border border-dashed border-border rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-xs text-muted">Ad slot ({slot})</span>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-[60px] ${className}`}>
      <p className="text-xs text-muted text-center mb-1">Advertisement</p>
      {/* AdSense ins tag goes here — populated after launch */}
    </div>
  );
}
