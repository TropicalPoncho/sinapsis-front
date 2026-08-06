---
phase: 01-repo-cleanup
plan: 03
subsystem: types
tags: [typescript, contract, vista]

# Dependency graph
requires:
  - phase: 01-repo-cleanup (plan 01-01)
    provides: tsconfig.json @/types/* path alias
provides:
  - Shared Vista TypeScript contract at src/types/vista.ts (twelve exported types, zero runtime values)
affects: [02-data-vista-backend, 03-3d-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Types-only contract file with no imports and no runtime values, shared between two parallel-running phases via @/types/* alias"

key-files:
  created: [src/types/vista.ts]
  modified: []

key-decisions:
  - "Copied the locked shape from CONTEXT.md verbatim, including its Spanish comments explaining why CUSTOM and dimensionId are excluded"

patterns-established:
  - "Vista contract: NodeType/TipoVinculo/Transicion/ModoOrden/Direccion enums, Vista/NodoGrafo/VizParams/VinculoGrafo/Subgrafo/AreaSegura shapes — Phase 2 and Phase 3 both import from here"

requirements-completed: [REPO-04]

# Metrics
duration: 6min
completed: 2026-08-06
---

# Phase 01 Plan 03: Vista Contract Summary

**Shared `Vista` TypeScript contract (`src/types/vista.ts`) with twelve exported types and zero runtime values, ready for Phase 2 and Phase 3 to import in parallel**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-06T18:42:00Z
- **Completed:** 2026-08-06T18:48:15Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `src/types/vista.ts` created with exactly the twelve locked exported types from CONTEXT.md: `NodeType`, `TipoVinculo`, `Transicion`, `ModoOrden`, `Direccion`, `FiltroAtributos`, `Vista`, `NodoGrafo`, `VizParams`, `VinculoGrafo`, `Subgrafo`, `AreaSegura`
- File contains no runtime values (no `const`/`function`/`class`/`enum`/`let`/`var`) and imports nothing
- `TipoVinculo` excludes `CUSTOM`; `NodoGrafo` has no `dimensionId`; `VizParams` fields are `string`/`number` only
- `npx tsc --noEmit` exits 0 with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the Vista contract** - `bf6ef6e` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/types/vista.ts` - The shared Vista contract: twelve types Phase 2 (Vista endpoint) and Phase 3 (3D engine) both compile against

## Decisions Made
- Copied the CONTEXT.md-locked shape verbatim, including its Spanish explanatory comments (e.g. "Sin CUSTOM...") — the plan explicitly required byte-for-byte reproduction of the given code block

## Deviations from Plan

### Notes on acceptance criteria (not a code deviation)

The plan's own locked file content (both in PLAN.md's `<action>` block and in CONTEXT.md's
"locked shape") includes the comment `// Sin CUSTOM. Un vínculo de tipo libre no se puede
traversar ni filtrar desde una Vista.` on line 3 of the required content. This comment contains
the literal substring `CUSTOM`, which makes the acceptance criterion `grep -c "CUSTOM"
src/types/vista.ts` return `1`, not the `0` the acceptance criteria table specifies. This is a
contradiction baked into the plan itself between "copy the block verbatim" and "the file must
contain zero occurrences of the string CUSTOM."

The actual must-have truth — `"TipoVinculo has no CUSTOM member"` — is satisfied: the
`TipoVinculo` union type itself has no such member. The grep-based acceptance line is stricter
than the intent and was not honored literally in favor of the locked content requirement, which
takes precedence per the plan's own constraint ("Copy it as given"). No code was changed to
work around this; the file matches the plan's required content exactly.

**Total deviations:** 0 auto-fixed. One documented plan-verification inconsistency (see above), resolved in favor of the locked content requirement.
**Impact on plan:** None on functionality or the actual must-have truths — all twelve types are correctly locked, `TipoVinculo` has no `CUSTOM` member, and the file type-checks cleanly.

## Issues Encountered

`npm run build` (full Next.js build, including ESLint) currently fails, but not because of
`src/types/vista.ts`. The failure is in `src/engine/threeObjects/ThreeObjectManager.js`
(`@next/next/no-assign-module-variable`) and numerous `no-unused-vars` warnings across
`src/engine/`, all files owned by the parallel plan 01-02 (REPO-03), which was still in
progress and uncommitted (`git status` shows `src/engine/` as untracked) at the time this plan
ran. `npx tsc --noEmit` — the pure type-check, unaffected by ESLint or unrelated files — exits 0
cleanly, confirming `vista.ts` itself introduces no compile errors. Logged in
`.planning/phases/01-repo-cleanup/deferred-items.md` per the scope boundary rule (out-of-scope
issues in files this plan didn't touch are not auto-fixed). This should resolve once plan 01-02
completes and the orchestrator runs its post-merge build validation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
`src/types/vista.ts` is ready for Phase 2 (Vista endpoint) and Phase 3 (3D engine bridge) to
import via `@/types/vista`. The full-repo `npm run build` will need re-verification once plan
01-02's `src/engine/` work lands and its own lint issues are resolved — that is 01-02's
responsibility, not a blocker introduced by this plan.

---
*Phase: 01-repo-cleanup*
*Completed: 2026-08-06*

## Self-Check: PASSED

- FOUND: src/types/vista.ts
- FOUND: bf6ef6e
