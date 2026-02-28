"use client";

import { useSimulationStore } from "@/store/simulationStore";
import type { PlaybackSpeed } from "@/types/simulation";

const SPEEDS: PlaybackSpeed[] = [1, 5, 10];

export function PlaybackControls() {
  const isPlaying = useSimulationStore((s) => s.isPlaying);
  const speed = useSimulationStore((s) => s.speed);
  const state = useSimulationStore((s) => s.state);
  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);
  const tick = useSimulationStore((s) => s.tick);
  const setSpeed = useSimulationStore((s) => s.setSpeed);

  const currentDate = state?.history[state.history.length - 1]?.date;
  const dayCount = state?.currentDateIndex ?? 0;
  const isComplete = state?.isComplete ?? false;

  const togglePlay = () => {
    if (isPlaying) pause();
    else play();
  };

  return (
    <div className="bg-surface border-t border-border px-4 py-3 pb-safe flex flex-col gap-2">
      {/* Date + progress */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-secondary font-mono">
          {isComplete ? "Simulation complete" : currentDate ?? "Not started"}
        </p>
        <p className="text-xs text-muted font-mono">Day {dayCount}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            disabled={isComplete || !state}
            className="w-12 h-12 flex items-center justify-center text-2xl text-primary disabled:opacity-40 hover:text-accent transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          {/* Step */}
          <button
            onClick={() => { pause(); tick(); }}
            disabled={isComplete || !state}
            className="w-10 h-10 flex items-center justify-center text-xl text-secondary disabled:opacity-40 hover:text-primary transition-colors"
            aria-label="Step one day"
          >
            ⏭
          </button>
        </div>

        {/* Speed selector */}
        <div className="flex gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors min-h-[32px] ${
                speed === s
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-secondary hover:border-secondary"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
