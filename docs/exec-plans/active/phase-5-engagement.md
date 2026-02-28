# Phase 5 Exec Plan — Engagement & Delight

## Features
Implementing 17 features across 4 commits:

| # | Feature | Commit |
|---|---|---|
| 1 | Confetti on big wins (>20% return) | 5A |
| 2 | Letter grade on results (A+→F) | 5A |
| 3 | Shame mode results screen (<-40%) | 5A |
| 11 | HODL comparison stat | 5A |
| 23 | Personal bests (vs your own history) | 5A |
| 25 | "Beat the market" banner | 5A |
| 29 | One-tap copy results text | 5A |
| 4 | Position emoji badges (🔥📈📉💀) | 5B |
| 5 | Milestone narrator popups (+10%, -20%, -50%) | 5B |
| 6 | Animated portfolio counter | 5B |
| 22 | Streak counter (consecutive profitable runs) | 5B |
| 7 | Daily Challenge mode | 5C |
| 8 | Replay same setup button | 5C |
| 18 | Fun loading state (rotating one-liners) | 5C |
| 19 | Scenario difficulty badge (Easy/Hard/Brutal) | 5C |
| 20 | Setup progress bar | 5C |
| 30 | Leaderboard scenario filter tabs | 5D |

---

## Architecture Notes

- **Layer order**: `types → lib → data → engine → store → hooks → components → app`
- `canvas-confetti` needs to be installed (`pnpm add canvas-confetti` + `pnpm add -D @types/canvas-confetti`)
- HODL return computed in `useAnalytics` hook (has priceData + allocations) — NOT in engine layer
- Streak + personal best extend `leaderboardStore` (already persisted via zustand/persist)
- Daily challenge: pure date-seed function in `src/lib/dailyChallenge.ts` (no external API)
- Milestone popups: tracked via a ref set in `useSimulation` hook — fire narrator once per threshold

---

## Step 5A — Results Page Overhaul
**Commit 1 of 4**

### New type fields (`src/types/analytics.ts`)
Add to `SimulationAnalytics`:
```ts
hodlReturnPct: number;   // what buy-and-hold would have returned
grade: string;           // "A+" | "A" | "B+" | "B" | "C" | "D" | "F"
```

### New store fields (`src/store/leaderboardStore.ts`)
Add to `LeaderboardStore`:
```ts
personalBest: { returnPct: number; date: string } | null;
updatePersonalBest: (returnPct: number) => void;
```

### `src/hooks/useAnalytics.ts`
- Compute `hodlReturnPct`: for each `state.config.allocations` entry, look up first/last price in `priceData`, compute weighted return with no trades
- Compute `grade` from return + Sharpe: A+ (≥40% return), A (≥25%), B+ (≥15%), B (≥5%), C (≥-5%), D (≥-20%), F (<-20%)
- Pass both into the returned `SimulationAnalytics`

### `src/engine/analytics.ts`
- Add `hodlReturnPct` and `grade` to `emptyAnalytics` (both 0 / "F")

### `src/app/results/page.tsx`
- **Shame mode**: if `totalReturnPct < -0.4`, render alternate hero with red tint, skull emoji, special message ("You did this to yourself.")
- **Letter grade**: large grade badge next to hero return figure
- **HODL stat**: inline below return — "HODL would have returned +X%"
- **"Beat the market" banner**: if `totalReturnPct > hodlReturnPct`, show green accent banner "You beat buy-and-hold 🎯"
- **Personal best**: pull from `leaderboardStore.personalBest`; show "Your best: +X%" if set; update it after each run
- **One-tap copy**: "Copy Results" button → builds plain text → `navigator.clipboard.writeText()`
- **Confetti**: `import confetti from "canvas-confetti"` in a `useEffect` — fires when `totalReturnPct > 0.20`

### Copy text format
```
I turned $10,000 into $47,230 (+372%) during the 2008 Financial Crisis.
Grade: A+ | Beat buy-and-hold by 44%
moneybags.app
```

---

## Step 5B — Simulate Page Enhancements
**Commit 2 of 4**

### `src/components/simulation/PortfolioPanel.tsx`
- **Position emoji badges**: inline emoji after ticker based on `posReturn`:
  - 🔥 ≥ +20%, 📈 ≥ 0%, 📉 < 0%, 💀 ≤ -30%
- **Animated counter**: wrap total value `<p>` in a span with `transition-all duration-300`; use a `useEffect` that triggers a CSS class on value change for a brief flash (gain = green flash, loss = red flash)

### `src/store/leaderboardStore.ts`
Add to store:
```ts
streak: number;          // current consecutive profitable runs
bestStreak: number;
updateStreak: (isProfit: boolean) => void;
```

### `src/hooks/useSimulation.ts`
- **Milestone narrator popups**: track a `firedMilestones` ref (`Set<string>`)
  - On each tick, check portfolio return vs thresholds: +10%, +25%, +50%, -20%, -50%
  - If threshold crossed and not yet fired, call `addPopup()` with a milestone message
  - Thresholds fired: stored in ref so they only fire once per simulation

### `src/lib/narrator.ts`
Add milestone message generators:
```ts
getMilestoneMessage(threshold: string): string
// "+10%" → "Up 10%. Don't get cocky."
// "-20%" → "Down 20%. This is fine. (It's not fine.)"
// "-50%" → "Half gone. The other half is scared."
// "+50%" → "You're actually doing it. Suspicious."
```

### `src/app/results/page.tsx`
- **Streak counter**: read `leaderboardStore.streak` + `bestStreak`; call `updateStreak(isProfit)` in the `addedRef` guard effect; show "🔥 X run streak" badge on results if streak ≥ 2

---

## Step 5C — Setup Wizard Polish
**Commit 3 of 4**

### `src/types/scenario.ts`
Add to `Scenario`:
```ts
difficulty: "Easy" | "Hard" | "Brutal";
```

### `src/data/scenarios.ts`
Add `difficulty` to each scenario:
- 2020 COVID: "Easy" (V-shaped recovery)
- 2010–2020 Bull Run: "Easy"
- 2008 Crisis: "Hard"
- Dot-com Bubble: "Hard"
- Black Monday: "Brutal"
- 1970s Stagflation: "Brutal"

### `src/lib/dailyChallenge.ts` (new file)
```ts
// Pure function — no imports from layers above lib
export function getDailyChallenge(dateStr: string): { scenarioIndex: number }
// Hash dateStr to deterministic scenario index
// Same date → same scenario for all users
```

### `src/app/setup/page.tsx`
- **Progress bar**: thin `<div>` at very top of page — `width: (step/5 * 100)%`, accent background, `transition-all duration-300`
- **Scenario difficulty badge**: show "Easy" / "Hard" / "Brutal" badge on each scenario card (green/yellow/red)
- **Fun loading state**: in the review step, while `loading` is true, cycle through rotating financial one-liners every 800ms:
  - "Sourcing historical trauma..."
  - "Pricing in catastrophe..."
  - "Running the numbers (they're bad)..."
  - "Consulting the invisible hand..."
  - "Calibrating your regrets..."
- **Replay same setup**: on results page, "Replay" button that reads `state.config` from simulationStore, calls `initPortfolio(state.config.allocations)`, `initRules(state.config.rules)`, `setCapital(state.config.capital)`, and routes to `/setup?step=5` (review step) — skipping steps 1–4

### `src/app/results/page.tsx`
- Add "Replay" button alongside "Play Again" (Play Again resets everything; Replay preserves config)

---

## Step 5D — Leaderboard Scenario Filter
**Commit 4 of 4**

### `src/app/leaderboard/page.tsx`
- Add `selectedScenario: string | "all"` state (default `"all"`)
- Derive unique scenario slugs from `entries`
- Render horizontal scrollable tab strip: "All" + one tab per scenario with entry count badge
- Filter `entries` by selected scenario before rendering rows
- Tab active style: accent underline; inactive: muted text

---

## Key Implementation Details

### HODL computation (in `useAnalytics`)
```ts
// For each allocation, find first + last price from priceData
const hodlValue = state.config.allocations.reduce((sum, alloc) => {
  const series = priceData?.get(alloc.ticker);
  if (!series || series.length < 2) return sum;
  const initialPrice = series[0].close;
  const finalPrice = series[series.length - 1].close;
  const initialValue = (alloc.pct / 100) * state.config.capital;
  return sum + initialValue * (finalPrice / initialPrice);
}, 0);
const hodlReturnPct = (hodlValue - state.config.capital) / state.config.capital;
```

### Grade formula
```ts
function computeGrade(returnPct: number, sharpe: number): string {
  const score = returnPct + sharpe * 0.1; // weight sharpe lightly
  if (score >= 0.40) return "A+";
  if (score >= 0.25) return "A";
  if (score >= 0.15) return "B+";
  if (score >= 0.05) return "B";
  if (score >= -0.05) return "C";
  if (score >= -0.20) return "D";
  return "F";
}
```

### Daily challenge hash
```ts
function hashDate(dateStr: string): number {
  return dateStr.split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0);
}
export function getDailyChallenge(dateStr: string) {
  const n = Math.abs(hashDate(dateStr));
  return { scenarioIndex: n % SCENARIOS.length };
}
```

### Milestone thresholds
Track in a `Set<string>` ref, keyed by threshold string:
```ts
const MILESTONES = ["+10", "+25", "+50", "-20", "-50"];
// Check on each tick:
const pct = (totalValue - startingValue) / startingValue * 100;
for (const m of MILESTONES) {
  const threshold = parseFloat(m);
  if (!firedMilestones.has(m) && (threshold > 0 ? pct >= threshold : pct <= threshold)) {
    firedMilestones.add(m);
    addPopup(getMilestoneMessage(m));
  }
}
```

---

## Verification

After each commit: `pnpm test` (tsc + eslint), then manual flow test.

Full regression flow:
- Landing → /setup → 5 steps (check progress bar, difficulty badges, loading one-liners)
- /simulate → milestone popups at thresholds, emoji badges on positions, animated counter
- /results → grade, HODL stat, shame mode (if loss), confetti (if >20%), copy button, streak, replay
- /leaderboard → scenario filter tabs
