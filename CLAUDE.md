# Mr. Money Bags — Claude Code Instructions

## Commit Rules

- **NEVER add `Co-Authored-By` lines** to any commit message. Commits belong to the project owner only.
- Run `pnpm test` (tsc + eslint) before every commit. Do not commit if tests fail.
- Commit and push between each major step.

## Architecture Rules

Enforce strict layer dependency order — **NO exceptions**:

```
types → lib → data → engine → store → hooks → components → app
```

- Engine files (`src/engine/`) must NOT import React, React hooks, or Zustand
- Types files (`src/types/`) must NOT import from any other src layer
- ESLint enforces this mechanically — do not disable rules

## Project Context

See `AGENTS.md` for the full table of contents.
See `docs/exec-plans/active/` for the current phase plan.

## Tech Stack

- **Next.js 16** (App Router, TypeScript strict)
- **Tailwind v4** (CSS-based config via `@theme inline` in `globals.css` — NOT `tailwind.config.ts`)
- **Zustand v5** for client state
- **Recharts** for charts
- **pnpm** as package manager
- `pnpm test` = `tsc --noEmit && eslint src --max-warnings=0`
