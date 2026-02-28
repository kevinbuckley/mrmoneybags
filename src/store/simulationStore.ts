"use client";

import { create } from "zustand";
import type { SimulationState, SimulationConfig, PlaybackMode, PlaybackSpeed, TimeGranularity } from "@/types/simulation";
import type { TradeOrder } from "@/types/portfolio";
import type { PriceDataMap } from "@/types/instrument";
import { advanceTick } from "@/engine/simulator";
import { createPortfolio } from "@/engine/portfolio";

interface SimulationStore {
  state: SimulationState | null;
  priceData: PriceDataMap | null;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  mode: PlaybackMode;
  granularity: TimeGranularity;
  // Actions
  initSimulation: (config: SimulationConfig, priceData: PriceDataMap) => void;
  tick: () => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setMode: (mode: PlaybackMode) => void;
  setGranularity: (g: TimeGranularity) => void;
  submitTrade: (order: TradeOrder) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  state: null,
  priceData: null,
  isPlaying: false,
  speed: 1,
  mode: "movie",
  granularity: "daily",

  initSimulation: (config, priceData) => {
    const portfolio = createPortfolio(config.startingCapital);
    const state: SimulationState = {
      config,
      currentDateIndex: 0,
      portfolio,
      history: [],
      rulesLog: [],
      narratorQueue: [],
      pendingTrades: [],
      isComplete: false,
    };
    set({ state, priceData, isPlaying: false });
  },

  tick: () => {
    const { state, priceData } = get();
    if (!state || !priceData || state.isComplete) return;
    const newState = advanceTick(state, priceData, state.pendingTrades);
    set({ state: newState });
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setSpeed: (speed) => set({ speed }),
  setMode: (mode) => set({ mode }),
  setGranularity: (granularity) => set({ granularity }),

  submitTrade: (order) =>
    set((s) => ({
      state: s.state
        ? { ...s.state, pendingTrades: [...s.state.pendingTrades, order] }
        : null,
    })),

  reset: () => set({ state: null, priceData: null, isPlaying: false }),
}));
