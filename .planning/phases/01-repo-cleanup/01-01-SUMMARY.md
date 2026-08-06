---
phase: 01-repo-cleanup
plan: 01
subsystem: infra
tags: [nextjs, react, three, typescript, tailwind, dependencies]

# Dependency graph
requires: []
provides:
  - Clean repo with no trace of the react-force-graph-3d integration attempt
  - Buildable Next shell (layout.tsx, page.tsx placeholder)
  - tsconfig.json settled with @/types/* alias and strapi/ excluded, for plans 02/03/04
  - Current dependency versions (next 15.5.22, react 19.2.8, three 0.185.1, typescript 5.9.3, tailwindcss 3.4.19)
affects: [01-02, 01-03, 01-04, phase-02, phase-03, phase-04]

# Tech tracking
tech-stack:
  added: [three-custom-shader-material@6.4.0]
  patterns: []

key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - tsconfig.json
    - src/app/layout.tsx
    - src/app/page.tsx

key-decisions:
  - "Upgraded three to ^0.185.1 (current) rather than pinning to 0.147 — smaller, more honest diff per research; three-custom-shader-material peer dep (>=0.159) would otherwise conflict"
  - "tsconfig.json settled once in this plan (added @/types/* alias, excluded strapi/, dropped stale network.js include) so plans 02/03/04 never touch it"
  - "page.tsx replaced with a placeholder only — no canvas/provider/engine import; Phase 4 owns real UI"

patterns-established: []

requirements-completed: [REPO-01, REPO-02]

# Metrics
duration: 12min
completed: 2026-08-06
---

# Phase 01 Plan 01: Delete React Attempt, Restore Buildable Shell, Bump Dependencies Summary

**Deleted the abandoned react-force-graph-3d integration, restored a Next 15 shell that compiles clean, and bumped next/react/three/typescript/tailwind to current versions with three-custom-shader-material added.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-06T18:30:00Z
- **Completed:** 2026-08-06T18:42:37Z
- **Tasks:** 3
- **Files modified:** 27 deleted, 5 modified

## Accomplishments
- Removed `src/app/components/`, `src/app/context/`, `src/app/lib/`, `src/app/utils/`, `src/mundo.js`, and the `react-force-graph-3d` dependency — `3d-force-graph` retained
- `src/app/layout.tsx` and `src/app/page.tsx` stripped of dead imports/JSX; `page.tsx` is now a minimal placeholder route
- `tsconfig.json` settled once: dropped stale `src/app/components/network.js` include, added `@/types/*` alias, excluded `strapi/`
- All target dependencies bumped to current versions per research (next 15.5.22, react/react-dom 19.2.8, three 0.185.1, typescript 5.9.3, tailwindcss 3.4.19, eslint-config-next 15.5.22); `three-custom-shader-material@6.4.0` added as new dep
- `npm run build` and `npx tsc --noEmit` both exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete the react-force-graph-3d attempt** - `f8df108` (chore)
2. **Task 2: Restore a buildable Next shell and settle tsconfig.json** - `142ca00` (fix)
3. **Task 3: Bring dependencies current and prove the build** - `3110680` (chore)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `package.json` - removed react-force-graph-3d; bumped next/react/react-dom/three/three-spritetext/3d-force-graph/typescript/tailwindcss/eslint-config-next; added three-custom-shader-material
- `package-lock.json` - regenerated to match
- `tsconfig.json` - dropped stale include, added `@/types/*` path, excluded `strapi`
- `src/app/layout.tsx` - dead imports/JSX removed, kept metadata/font/globals.css/body classes
- `src/app/page.tsx` - replaced with placeholder `<h1>` route

## Decisions Made
- `three` bumped to current (`^0.185.1`) instead of pinned to 0.147, per research's finding that the fallout is one line (`THREE.ColorManagement.enabled = false`, to be set in plan 02/03 when the engine lands) rather than a rewrite, and that pinning would conflict with `three-custom-shader-material`'s `>=0.159` peer dependency.
- `typescript` stayed on `^5.9.3` (not 7.x) — TS7 lacks the stable programmatic API `typescript-eslint`/`eslint-config-next` need.
- `tailwindcss` stayed on `^3.4.19` (not 4.x) — v4 is a different config model, out of scope for this phase.
- `npm install` resolved `three` to the exact latest patch `0.185.1` (requested `^0.185.0`) — both satisfy the plan's "starts with `^0.185`" acceptance criterion; no action needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Note: `npm run build` printed a workspace-root inference warning (multiple lockfiles detected — a `package-lock.json` also exists one directory up in `sinapsis/`). This is pre-existing, outside this plan's file scope, and does not affect build exit code (0) — left as-is, out of scope for REPO-01/REPO-02.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `npm run build` and `npx tsc --noEmit` both exit 0 — the phase gate other Phase 1 plans (02, 03, 04) verify against is now green.
- `tsconfig.json` is settled (including the `@/types/*` alias plan 03/04 need) so no later Phase 1 plan needs to touch it.
- No blockers. The workspace-root lockfile warning noted above is cosmetic and does not block any downstream plan.

---
*Phase: 01-repo-cleanup*
*Completed: 2026-08-06*

## Self-Check: PASSED

All created files and commit hashes verified present.
