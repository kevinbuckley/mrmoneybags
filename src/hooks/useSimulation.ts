"use client";

import { useEffect, useRef } from "react";
import { useSimulationStore } from "@/store/simulationStore";

const SPEED_INTERVALS: Record<number, number> = {
  1: 500,
  5: 100,
  10: 50,
};

/**
 * Manages simulation playback loop.
 * Drives the tick interval in movie mode.
 */
export function useSimulation() {
  const isPlaying = useSimulationStore((s) => s.isPlaying);
  const speed = useSimulationStore((s) => s.speed);
  const mode = useSimulationStore((s) => s.mode);
  const tick = useSimulationStore((s) => s.tick);
  const pause = useSimulationStore((s) => s.pause);
  const isComplete = useSimulationStore((s) => s.state?.isComplete ?? false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mode !== "movie" || !isPlaying) return;

    const ms = SPEED_INTERVALS[speed] ?? 500;
    intervalRef.current = setInterval(tick, ms);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, speed, mode]); // tick is a stable Zustand action; completion handled by auto-pause effect below

  // Auto-pause when simulation completes
  useEffect(() => {
    if (isComplete && isPlaying) {
      pause();
    }
  }, [isComplete, isPlaying, pause]);

  return useSimulationStore();
}
