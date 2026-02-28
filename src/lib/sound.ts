// Layer 1: lib — Web Audio API sound effects (browser-only, no imports needed)

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    try {
      _ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return _ctx;
}

function beep(
  freq: number,
  duration: number,
  volume = 0.08,
  type: OscillatorType = "sine",
  delayMs = 0
): void {
  const ac = getCtx();
  if (!ac) return;
  const startTime = ac.currentTime + delayMs / 1000;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export type SoundEvent = "trade" | "gain_day" | "loss_day" | "complete";

/**
 * Play a sound effect for a simulation event.
 * Safe to call during SSR — returns immediately without error.
 */
export function playSound(event: SoundEvent): void {
  switch (event) {
    case "trade":
      // Subtle click: single high-pitched short blip
      beep(1046, 0.06, 0.06, "sine");
      break;

    case "gain_day":
      // Rising minor third — C5 → E5
      beep(523, 0.12, 0.05, "sine", 0);
      beep(659, 0.12, 0.05, "sine", 70);
      break;

    case "loss_day":
      // Descending minor third — G4 → E4
      beep(392, 0.14, 0.05, "triangle", 0);
      beep(330, 0.18, 0.05, "triangle", 90);
      break;

    case "complete":
      // Short upward arpeggio — C5, E5, G5
      beep(523, 0.12, 0.1, "sine", 0);
      beep(659, 0.12, 0.1, "sine", 110);
      beep(784, 0.22, 0.1, "sine", 220);
      break;
  }
}
