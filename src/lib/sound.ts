// Sound disabled — no-op stub kept so call-sites compile without changes
export type SoundEvent = "trade" | "gain_day" | "loss_day" | "complete";

export function playSound(_event: SoundEvent): void {
  // intentionally silent
}
