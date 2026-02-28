"use client";

import { useEffect, useState } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { generateAmbientEvent } from "@/lib/narrator";
import type { NarratorEvent } from "@/types/narrator";

const AMBIENT_INTERVAL_MS = 8000;

/**
 * Provides narrator state: active popups and chyron queue.
 */
export function useNarrator() {
  const state = useSimulationStore((s) => s.state);
  const [chyronMessages, setChyronMessages] = useState<string[]>([]);
  const [activePopups, setActivePopups] = useState<NarratorEvent[]>([]);

  // Seed initial ambient messages
  useEffect(() => {
    const initial = Array.from({ length: 10 }, () => generateAmbientEvent().message);
    setChyronMessages(initial);
  }, []);

  // Rotate ambient messages
  useEffect(() => {
    const interval = setInterval(() => {
      const evt = generateAmbientEvent();
      setChyronMessages((prev) => [...prev.slice(-19), evt.message]);
    }, AMBIENT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Handle narrator events from simulation state
  useEffect(() => {
    if (!state?.narratorQueue.length) return;
    const newEvents = state.narratorQueue;
    const popups = newEvents.filter((e) => e.channel === "popup");
    const chyronItems = newEvents.filter((e) => e.channel === "chyron").map((e) => e.message);

    if (popups.length) {
      setActivePopups((prev) => [...prev, ...popups].slice(-3));
    }
    if (chyronItems.length) {
      setChyronMessages((prev) => [...prev, ...chyronItems]);
    }
  }, [state?.narratorQueue]);

  const dismissPopup = (id: string) => {
    setActivePopups((prev) => prev.filter((p) => p.id !== id));
  };

  return { chyronMessages, activePopups, dismissPopup };
}
