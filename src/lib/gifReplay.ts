// Layer 2: lib — generates an animated GIF replay of a simulation run

import type { PortfolioSnapshot } from "@/types/portfolio";
import type { Scenario } from "@/types/scenario";

const W = 480;
const H = 270;
const MAX_FRAMES = 48;
const FRAME_DELAY = 80;   // ms per frame (~12 fps)
const HOLD_DELAY = 2500;  // ms to hold the final frame

/** Returns evenly-spaced indices into history, always including the last */
function sampleIndices(length: number): number[] {
  if (length <= MAX_FRAMES) return Array.from({ length }, (_, i) => i);
  const indices = new Set<number>();
  for (let i = 0; i < MAX_FRAMES - 1; i++) {
    indices.add(Math.round((i / (MAX_FRAMES - 1)) * (length - 1)));
  }
  indices.add(length - 1);
  return [...indices].sort((a, b) => a - b);
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  history: PortfolioSnapshot[],
  upToIndex: number,
  scenario: Scenario,
  startValue: number,
  yMin: number,
  yMax: number,
): void {
  const snap = history[upToIndex];
  if (!snap) return;

  // --- Background ---
  ctx.fillStyle = "#0d0d14";
  ctx.fillRect(0, 0, W, H);

  // Chart area geometry
  const padL = 14, padR = 14, padT = 80, padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const toX = (i: number) =>
    padL + (i / Math.max(history.length - 1, 1)) * chartW;
  const toY = (v: number) =>
    padT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  // --- Starting value reference line (dashed) ---
  ctx.strokeStyle = "#2a2a44";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padL, toY(startValue));
  ctx.lineTo(W - padR, toY(startValue));
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Portfolio line ---
  if (upToIndex >= 1) {
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(history[0]!.totalValue));
    for (let i = 1; i <= upToIndex; i++) {
      ctx.lineTo(toX(i), toY(history[i]!.totalValue));
    }
    ctx.strokeStyle = "#7c6aff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Current dot
    ctx.fillStyle = "#7c6aff";
    ctx.beginPath();
    ctx.arc(toX(upToIndex), toY(snap.totalValue), 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Header background strip ---
  ctx.fillStyle = "#12121f";
  ctx.fillRect(0, 0, W, padT - 6);

  // Scenario label
  ctx.fillStyle = "#555577";
  ctx.font = "bold 10px monospace";
  ctx.fillText(scenario.name.toUpperCase(), padL, 18);

  // Date
  ctx.fillStyle = "#555577";
  ctx.font = "10px monospace";
  ctx.fillText(snap.date, W - padR - ctx.measureText(snap.date).width, 18);

  // Final value (large)
  const returnPct = ((snap.totalValue - startValue) / startValue) * 100;
  const isGain = returnPct >= 0;
  const valueStr = "$" + snap.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const pctStr = (isGain ? "+" : "") + returnPct.toFixed(2) + "%";

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px monospace";
  ctx.fillText(valueStr, padL, 58);

  const vw = ctx.measureText(valueStr).width;
  ctx.fillStyle = isGain ? "#4ade80" : "#f87171";
  ctx.font = "bold 13px monospace";
  ctx.fillText(pctStr, padL + vw + 8, 58);

  // --- Footer watermark ---
  ctx.fillStyle = "#2a2a44";
  ctx.font = "9px monospace";
  const wm = "MrMoneyBags.app";
  ctx.fillText(wm, W - padR - ctx.measureText(wm).width, H - 7);
}

/**
 * Generates an animated GIF replay of the simulation.
 * Dynamically imports gifenc to keep it out of the initial bundle.
 */
export async function generateReplayGif(
  history: PortfolioSnapshot[],
  scenario: Scenario,
): Promise<Blob> {
  if (history.length < 2) {
    throw new Error("Not enough history to generate a replay GIF.");
  }

  // Dynamic import: tree-shaken from SSR bundle
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");

  const startValue = history[0]!.totalValue;
  const values = history.map((s) => s.totalValue);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = (rawMax - rawMin) * 0.12 || startValue * 0.05;
  const yMin = Math.min(rawMin - pad, startValue * 0.94);
  const yMax = Math.max(rawMax + pad, startValue * 1.06);

  const indices = sampleIndices(history.length);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const gif = GIFEncoder();

  for (let fi = 0; fi < indices.length; fi++) {
    const histIdx = indices[fi]!;
    drawFrame(ctx, history, histIdx, scenario, startValue, yMin, yMax);

    const imageData = ctx.getImageData(0, 0, W, H);
    const palette = quantize(imageData.data, 256);
    const index = applyPalette(imageData.data, palette);
    const isLast = fi === indices.length - 1;

    gif.writeFrame(index, W, H, {
      palette,
      delay: isLast ? HOLD_DELAY : FRAME_DELAY,
      repeat: 0, // loop forever
    });
  }

  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}
