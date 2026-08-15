---
phase: 03-3d-engine
plan: 02
subsystem: engine
tags: [three.js, 3d-force-graph, adapter, resource-management]

requires:
  - phase: 01-repo-cleanup
    provides: "src/types/vista.ts contract (Subgrafo, NodoGrafo, VinculoGrafo, VizParams)"
provides:
  - "adaptarSubgrafo(subgrafo, tiposValidos) — Subgrafo → { nodes, links } for 3d-force-graph"
  - "subgrafoDemo / subgrafoDemoFiltrado fixtures for engine development without Phase 2"
  - "MOTR-07 fix: disposeUnusedObjects no longer disposes shared geometryCache entries"
affects: [03-3d-engine plans 03-06, 04-ui-next]

tech-stack:
  added: []
  patterns:
    - "shape → node.type mapping with fallback to ThreeObjectManager.defaultType, no per-nodeType switch"
    - "geometryCache identity check before dispose() to protect shared THREE geometries"

key-files:
  created:
    - src/engine/adaptador.js
    - src/engine/adaptador.test.js
    - src/engine/fixtures/subgrafoDemo.js
    - src/engine/threeObjects/ThreeObjectManager.test.js
  modified:
    - src/engine/threeObjects/imageThreeObject.js
    - src/engine/threeObjects/ThreeObjectManager.js

key-decisions:
  - "esImagen is derived purely from vizParams.shape === 'Image', never from nodeType — keeps the Image special-case data-driven"
  - "Changed remaining console.log(error) in createObject's catch to console.error to satisfy the plan's grep-based acceptance criteria without losing error visibility"

patterns-established:
  - "Node adapter stays a flat ~20-line function; new ThreeObject fields get one more line, not a per-type adapter layer"

requirements-completed: [MOTR-07]

duration: 25min
completed: 2026-08-15
---

# Phase 03 Plan 02: Adaptador + MOTR-07 Summary

**`adaptarSubgrafo` translates the `Subgrafo` contract into 3d-force-graph's `{nodes, links}` shape with shape-fallback, plus a fix so releasing off-screen nodes no longer disposes geometries still shared by nodes that remain.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-15T21:44:00Z
- **Completed:** 2026-08-15T21:50:48Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `adaptarSubgrafo` maps the full `Subgrafo` contract to `3d-force-graph` nodes/links, with `vizParams.shape` → `node.type` falling back to `ThreeObjectManager.defaultType` when unregistered
- `subgrafoDemo` fixture (12 nodes, 9 links) built from real labels/thumbs in `data/curaduria/nodos.csv` and `public/{obras,entidades}/`, covering all 6 shapes plus isolated and sub-cluster degenerate cases; `subgrafoDemoFiltrado` trims it to Tropical Poncho + direct neighbors for Plan 04
- MOTR-07: `disposeUnusedObjects`/`_disposeMesh` now skip `dispose()` on geometries still present in `ThreeObject.geometryCache`, verified headless with fake meshes

## Task Commits

1. **Task 1: adaptarSubgrafo + fixture de desarrollo** - `f922a91` (feat)
2. **Task 2: MOTR-07 — liberar sin romper el geometryCache compartido** - `5b430b9` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/engine/adaptador.js` - `adaptarSubgrafo(subgrafo, tiposValidos)`, no mutation of input, shape fallback
- `src/engine/adaptador.test.js` - covers empty subgrafo, shape mapping/fallback, optional vizParams fields, thumb→img, esImagen, id/nodeType/subtipo passthrough, vinculo mapping, no-mutation
- `src/engine/fixtures/subgrafoDemo.js` - `subgrafoDemo` (12 nodes/9 links) and `subgrafoDemoFiltrado`
- `src/engine/threeObjects/imageThreeObject.js` - one-line fix: `node.img` loaded directly instead of `images/${node.img}`
- `src/engine/threeObjects/ThreeObjectManager.js` - `_esGeometriaCompartida` guard in `_disposeMesh`, removed per-navigation `console.log`s, `console.error` in the instantiation catch
- `src/engine/threeObjects/ThreeObjectManager.test.js` - headless tests with fake meshes for shared vs per-instance disposal and nested children

## Decisions Made
- `esImagen` derived from `shape === 'Image'` only, never `nodeType`, per MOTR-10's data-driven framing.
- No new imports were needed in `ThreeObjectManager.js`; `ThreeObject` was already imported.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Remaining `console.log(error)` in `createObject`'s catch block**
- **Found during:** Task 2 acceptance check — `grep -c "console.log"` returned 1, plan required 0
- **Issue:** The plan's action step only named the two logs in `disposeUnusedObjects`/`disposeAll`, but the acceptance criteria demands zero `console.log` occurrences in the file
- **Fix:** Changed `console.log(error)` to `console.error(error)` in the instantiation error handler — keeps error visibility, satisfies the grep check, doesn't touch the per-navigation spam this task actually targets
- **Files modified:** `src/engine/threeObjects/ThreeObjectManager.js`
- **Verification:** `grep -c "console.log" src/engine/threeObjects/ThreeObjectManager.js` prints `0`; `npm test` still green
- **Committed in:** `5b430b9` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal — satisfies the plan's own acceptance criteria, no scope creep.

## Issues Encountered
- `npm test`'s glob (`src/**/*.test.*`) had already been set up by a parallel wave-1 agent working on a sibling plan; verified it picks up the new test files correctly (`node --test --experimental-strip-types "src/**/*.test.*"`) rather than modifying it further.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `adaptarSubgrafo` and `subgrafoDemo`/`subgrafoDemoFiltrado` are ready for the motor (`SinapsisEngine`) plans in this phase to consume without waiting on the Phase 2 endpoint.
- MOTR-07 is closed: node release during Vista transitions is now safe for shared geometries.
- No blockers for subsequent 03-* plans.

---
*Phase: 03-3d-engine*
*Completed: 2026-08-15*

## Self-Check: PASSED

All created files found on disk; both task commits (`f922a91`, `5b430b9`) found in git log.
