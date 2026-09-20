---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 04-01-PLAN.md
last_updated: "2026-09-20T21:28:58.298Z"
last_activity: 2026-09-20
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 22
  completed_plans: 15
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-06)

**Core value:** Que la red se pueda mirar desde cualquier punto de vista sin cambiar el modelo de datos.
**Current focus:** Phase 04 — ui-navigation

## Current Position

Phase: 04 (ui-navigation) — EXECUTING
Plan: 2 of 7
Status: Ready to execute
Last activity: 2026-09-20

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 12 | 3 tasks | 32 files |
| Phase 01 P03 | 6 | 1 tasks | 1 files |
| Phase 02 P01 | 15 | 3 tasks | 7 files |
| Phase 02 P03 | 20 | 2 tasks | 4 files |
| Phase 02 P02 | ~50 | 3 tasks | 3 files |
| Phase 02 P04 | 12min | 2 tasks | 2 files |
| Phase 03 P01 | 15min | 2 tasks | 3 files |
| Phase 03 P02 | 25min | 2 tasks | 6 files |
| Phase 03 P03 | 20min | 2 tasks | 4 files |
| Phase 03 P04 | 35min | 2 tasks | 4 files |
| Phase 03 P05 | 30min | 2 tasks | 3 files |
| Phase 03 P06 | (sesión larga de depuración) | 3 tasks | ~40 files |
| Phase 04 P01 | 20min | 3 tasks | 10 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Phase 2 (Data & Vista Backend) and Phase 3 (3D Engine) both depend only on Phase 1 and can be planned/executed in parallel — the engine develops against fixture Vistas, not the live endpoint.
- Roadmap: PERF-01 lands in Phase 3 as a measured, documented number — not an optimization pass.
- Roadmap: UI-07 is isolated in its own final phase (5) because it depends on real migrated data (DATA-06, Phase 2) and is the milestone's proof point.
- [Phase 01]: three bumped to current (^0.185.1) instead of pinned to 0.147 — smaller diff, avoids three-custom-shader-material peer conflict
- [Phase 01]: tsconfig.json settled once in plan 01 (@/types/* alias, strapi/ excluded) so plans 02/03/04 never touch it
- [Phase 01]: Vista contract (src/types/vista.ts) locked verbatim from CONTEXT.md: twelve types, zero runtime values, shared by Phase 2 and Phase 3
- [Phase 02]: Lowered viz_params string-length CHECK cap from 64 to 32 chars — the plan's own GLSL-rejection test fragment (48 chars) passed the 64-char version; 32 still fits every legitimate VizParams string
- [Phase 02]: CSV curation pipeline hand-rolls RFC 4180 parsing (no dependency) - format has one writer, one reader
- [Phase 02]: resolverVista's third param `yaCargados` resolves VIST-03 with the same BFS as a rooted Vista (depth 1 + incluirRaiz:false over that set) — no special-case code path
- [Phase 02]: Fixed off-by-one relative path to collectiveConscience dump in plans 02-03/02-05 before execution (`../collectiveConscience` -> `../../collectiveConscience`, verified against actual repo layout)
- [Phase 03]: encuadre.js: geometría pura sin imports para MOTR-08/10/11, consumida por cameraController
- [Phase 03]: [Phase 03 P02]: esImagen derived purely from vizParams.shape === 'Image', never nodeType — keeps the Image special-case data-driven
- [Phase 03]: [Phase 03 P03] cameraController.resize(): outerWidth/outerHeight -> innerWidth/innerHeight (Pitfall 1); filtrado/aditivo caen en reemplazo con TODO Plan 04 para no bloquear MOTR-06
- [Phase 03]: [Phase 03 P04] filtrado/aditivo verificados headless contra d3-force-3d real (misma pieza que three-forcegraph reheat-ea) por ausencia de herramienta de browser en el ejecutor
- [Phase 03]: [Phase 03 P05] nodoEnfocado en setVista viaja como id, resuelto contra graphData().nodes tras la transición, nunca antes (respeta MOTR-06 y sólo enfoca lo que sobrevivió al recambio)
- [Phase 03]: [Phase 03 P05] area segura entra por opcion del constructor, leida cada frame en _tick (pull) en vez de un setter; getSide/aimAtNode eliminados de cameraController
- [Phase 04]: [04-01] setVista: nodoEnfocado undefined no toca el foco, null desenfoca

### Pending Todos

None yet.

### Blockers/Concerns

- **Phase 2 paused at 02-05 Task 2 (CSV curation checkpoint).** The owner considers the migration
  source dump (`../../collectiveConscience/config/dumps/neurons_prod_23-10-05.json`, 251 rows / 80
  named) stale. He wants to base the migration on a more recent export first and merge this CSV's
  data in afterward.

  - The "newer" dump he initially pointed to, `neurons_prod_20250708.json` (35 rows), is **not**
    a fresher version of the same data — it's structurally different (`name`/`img`/`type`/`order`/
    `html`, no `neuronType`/`info.bio`) and looks like the current site's menu/section structure
    (`Nosotres`, `Obras`, `Audiovisuales`, `Editorial`, `Tecnología`, `Laboratorios`...), not an
    artist/work/event network dump. It cannot be swapped in for `neurons_prod_23-10-05.json`
    without its own mapping.

  - That menu structure raised a real schema question: whether `NodeType` (locked in
    `src/types/vista.ts` since Phase 1) needs a new value for organizational groupings ("Área") —
    `SERIE` is defined for grouping obras via `COMPONE`, not departments of a productora. Also
    raised: multi-owner vínculos (already supported — two `PRODUJO` rows from different nodes to
    the same target need no schema change) and whether `ARTISTA` already covers duos/collectives
    (naming question, not necessarily a schema gap).

  - No prior planning doc addresses this — confirmed by grepping `.planning/` for "Área",
    "colectivo", "dúo", "banda", "productora" before pausing.

  - Owner is continuing this discussion in a separate (older) conversation, not via `/gsd:discuss-phase`.
  - **Resume path:** once the owner settles on a data source and whether `NodeType` gains a new
    value, either continue `/gsd:execute-phase 02` (Task 2 checkpoint of plan 02-05) as-is, or
    re-plan 02-05 (and possibly amend the migration `001_esquema_inicial.sql`) if `NodeType` changes.
    Do not resume Task 2 by guessing — the checkpoint explicitly requires the owner's answer.

## Session Continuity

Last session: 2026-09-20T21:28:58.294Z
Stopped at: Completed 04-01-PLAN.md
Resume file: None

Note: 02-02's executor agent hit the account's monthly spend limit right after finishing Task 3's
implementation but before committing/summarizing. The orchestrator verified the completed work
against the plan's acceptance criteria directly (all passed) and committed/summarized it manually
— no re-implementation happened. See 02-02-SUMMARY.md "Deviations" for detail.
