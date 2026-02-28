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
  const { isPlaying, speed, mode, tick, pause, state } = useSimulationStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mode !== "movie") return;

    if (isPlaying && state && !state.isComplete) {
      const ms = SPEED_INTERVALS[speed] ?? 500;
      intervalRef.current = setInterval(() => {
        tick();
      }, ms);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, speed, mode, tick, state]);

  // Auto-pause when simulation completes
  useEffect(() => {
    if (state?.isComplete && isPlaying) {
      pause();
    }
  }, [state?.isComplete, isPlaying, pause]);

  return useSimulationStore();
}
