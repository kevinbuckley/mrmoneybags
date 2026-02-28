// Layer 1: lib — formatting utilities

/** Format a dollar amount: $1,234.56 or $1.2M or $14.2k */
export function formatCurrency(
  value: number,
  compact: boolean = false
): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000)
      return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format a percentage: +12.3% or -4.5% */
export function formatPct(value: number, includeSign: boolean = true): string {
  const formatted = Math.abs(value * 100).toFixed(1) + "%";
  if (!includeSign) return formatted;
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

/** Format a date string YYYY-MM-DD to display format */
export function formatDate(date: string, short: boolean = false): string {
  const d = new Date(date + "T00:00:00");
  if (short) {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a ticker symbol */
export function formatTicker(ticker: string): string {
  return ticker.toUpperCase();
}
