---
phase: 01-repo-cleanup
plan: 02
subsystem: engine
tags: [three.js, engine, port, registry]

# Dependency graph
requires:
  - phase: 01-repo-cleanup (plan 01-01)
    provides: three@0.185.1, three-custom-shader-material, three-spritetext installed; green build gate
provides:
  - src/engine/ — 28 files of vanilla 3D engine source, no React, every relative import resolving
  - Explicit type registry (registerTypes.js) replacing Vite's import.meta.glob
  - Pre-r152 color behaviour pinned via THREE.ColorManagement.enabled = false
affects: [03-3d-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Explicit side-effect barrel for class registration instead of bundler-specific module globbing"
    - "Bundler-agnostic port: no import.meta.glob (Vite) and no require.context (webpack) anywhere in engine source"

key-files:
  created:
    - src/engine/threeObjects/registerTypes.js
    - src/engine/threeObjects/ThreeObject.js
    - src/engine/threeObjects/ThreeObjectManager.js
    - src/engine/graph/constants.js
    - src/engine/graph/background.js
    - src/engine/shaders/noise.js
    - src/engine/Utils.js
  modified:
    - src/engine/threeObjects/ThreeObjectManager.js
    - src/engine/threeObjects/threeGlobal.js

key-decisions:
  - "Explicit barrel over require.context: Turbopack implements neither, but require.context would work in `next build` and silently fail in `next dev --turbopack` — worse than the glob it replaces"
  - "LikeFireThreeObject left unregistered, matching collectiveConscience: it declares `type` as an instance field, not `static type`, and its value would collide with PerlinThreeObject's 'Perlin'"
  - "ColorManagement pinned in threeGlobal.js rather than a bootstrap: ThreeObject.js (base class of every type) imports it, guaranteeing it loads before any material is constructed"

patterns-established:
  - "Engine is vanilla JS and imports no React — verified by grep for 'use client' and react imports across src/engine/"
  - "No dimensionId anywhere in engine source (CLAUDE.md invariant)"

requirements-completed: [REPO-03]

# Metrics
duration: interrupted-then-completed-inline
completed: 2026-08-06
---

# Phase 01 Plan 02: Engine Port Summary

**3D engine source landed under `src/engine/` (28 files), Vite-only auto-registry replaced by an explicit 15-type barrel, and pre-r152 three.js color behaviour pinned so the copied shaders are not silently re-tuned**

## Accomplishments
- 28 files under `src/engine/`: 20 in `threeObjects/`, 5 in `graph/`, plus `shaders/noise.js` and `Utils.js`
- `graph/mundo.js`, `graph/dataLoader.js`, `graph/graphManager.js` deliberately NOT copied — they carry the `dimensionId` model this project replaces
- `ThreeObjectManager.js` trimmed to 215 lines; the `import.meta.glob` block (lines 216-229) is gone
- `registerTypes.js` created: 16 imports, registers exactly the 15 classes declaring `static type`
- `threeGlobal.js` pins `THREE.ColorManagement.enabled = false` with a `ponytail:` comment naming the ceiling and the review trigger
- Every relative import under `src/engine/` resolves to an existing file (traced programmatically, 0 missing)
- No React import, no `"use client"`, no `dimensionId` anywhere under `src/engine/`
- `npm run build` exits 0

## Task Commits

1. **Task 1: Copy the engine source into src/engine/** - `9c624ac` (feat)
2. **Task 2: Explicit barrel + color management pin** - `c88c574` (feat)

## Files Created/Modified
- `src/engine/threeObjects/` (20 files) - Whole-directory copy per the locked CONTEXT.md decision
- `src/engine/graph/` (5 files) - cameraController, animationManager, constants, background, utils
- `src/engine/shaders/noise.js` - `noiseFS`, imported by 5 threeObjects files
- `src/engine/Utils.js` - `Utils.generateHeight`, called twice by `graph/background.js`. Live code, distinct from `graph/utils.js`
- `src/engine/threeObjects/registerTypes.js` - Explicit registration of the 15 typed subclasses
- `src/engine/threeObjects/ThreeObjectManager.js` - Glob block removed, class body untouched
- `src/engine/threeObjects/threeGlobal.js` - ColorManagement pin appended

## Decisions Made
- Explicit barrel chosen over `require.context` — see key-decisions above
- `LikeFireThreeObject` and `dynamic-import.js` copied but unregistered/unimported, matching source-repo behaviour. This was a parity port, not a bug-fix pass

## Deviations from Plan

**Total deviations:** 0. All three Task 2 edits match the plan's locked content exactly.

## Issues Encountered

**Execution was interrupted.** The gsd-executor agent running this plan was terminated
mid-Task-2 by an API monthly spend limit, after Task 1 had been committed (`9c624ac`) and
Task 2's three file edits had been written to disk but not committed. The orchestrator
verified all Task 2 acceptance criteria against the on-disk state, confirmed them correct,
ran the build gate, and committed the work inline as `c88c574`. No work was redone or lost.

**Resolved a deferred item from plan 01-03.** That plan logged a `npm run build` failure at
`ThreeObjectManager.js:221` (`@next/next/no-assign-module-variable`) in
`deferred-items.md`. That error was inside the `import.meta.glob` block, which Task 2 deletes —
it is resolved by this plan's completion, not by a separate fix. `npm run build` now exits 0.

**Remaining warnings are intentional.** `npm run build` emits `no-unused-vars` warnings across
`src/engine/`. The plan explicitly forbids fixing pre-existing bugs in copied files ("Copy
verbatim... do not fix the known pre-existing bugs"). Warnings do not fail the build.

**Source repo state.** `collectiveConscience` shows uncommitted modifications to `index.html`,
`index.js`, `styles/index.css`, and `graph/{mundo,dataLoader,graphManager}.js`. None of these
are files this plan copied, and `cp` only reads — these are pre-existing local changes in that
repo, not damage from this port. No file this plan read appears modified.

## Next Phase Readiness
Phase 3 can build `SinapsisEngine` on top of `src/engine/`. Carried forward per the plan's notes:
`noiseThreeObject.js` references `MeshPhysicalNodeMaterial` without importing it (dormant);
`dynamic-import.js` is broken and unimported in both repos; `LikeFireThreeObject` needs a
non-colliding `static type` if Phase 3 wants it; `ColorManagement.enabled = false` is applied
but visually unverified — Phase 3 confirms it against the live site the first time nodes render.

---
*Phase: 01-repo-cleanup*
*Completed: 2026-08-06*

## Self-Check: PASSED

- FOUND: src/engine/threeObjects/registerTypes.js
- FOUND: src/engine/Utils.js
- FOUND: 9c624ac
- FOUND: c88c574
