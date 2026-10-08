---
gsd_state_version: "1.0"
milestone: v1.0
current_phase: 04
current_phase_name: UI & Navigation
status: executing
stopped_at: Completed 04-10-PLAN.md
last_updated: "2026-10-08T01:13:59.664Z"
last_activity: 2026-10-07
last_activity_desc: Phase 04 execution started
state_head: 48e92f8864daba4ea096f52d21bcd018dcfd0b79
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 26
  completed_plans: 25
milestone_name: milestone
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-06)

**Core value:** Que la red se pueda mirar desde cualquier punto de vista sin cambiar el modelo de datos.
**Current focus:** Phase 04 — UI & Navigation

## Current Position

Phase: 04 (UI & Navigation) — EXECUTING
Plan: 4 of 11
Status: Ready to execute
Last activity: 2026-10-07 — Phase 04 execution started

Phase 02 (data-vista-backend) closed 2026-10-01 — see 02-05-SUMMARY.md.

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
| Phase 04 P02 | 10min | 2 tasks | 6 files |
| Phase 04 P03 | 15min | 3 tasks | 6 files |
| Phase 04 P04 | 20min | 2 tasks | 7 files |
| Phase 04 P05 | 15min | 2 tasks | 3 files |
| Phase 04 P06 | 12min | 2 tasks | 4 files |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 04 P08 | 62 min | 3 tasks | 8 files |
| Phase 04 P09 | 70min | 3 tasks | 10 files |
| Phase 04 P10 | 60min | 3 tasks | 13 files |

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
- [Phase 04]: 04-08: el panel sigue un estado 'mostrado' que va por detras de la URL (ocultar, cambiar contenido, mover camara, mostrar); reemplaza el cross-fade de UI-SPEC 4
- [Phase 04]: 04-08: el area segura la decide el motor (recuerda el area mientras hay foco, la aplica mientras la mezcla baja); se borra el ref booleano de foco del puente
- [Phase 04]: 04-08: el motor no enfoca un nodo hasta tener x/y/z finitas (tope 2 s, warn sin throw); evita camara en NaN (G-04)
- [Phase 04]: 04-09: el menú superior enfoca el área y Entrar la carga (cambia D-09/UI-SPEC §2)
- [Phase 04]: 04-09: ENTIDAD entra con reemplazo, igual que AGRUPACION (cambia D-16; reversible en transicionEntrada)
- [Phase 04]: 04-09: la Vista de AGRUPACION recorre solo vínculos salientes; la dueña del área ya no entra
- [Phase 04]: 04-10 D-22: lo sumado al recorrer vive en memoria del Shell atado a la red; la URL lleva solo el ancla; tope 40 + 12 FIFO, el foco nunca sale
- [Phase 04]: 04-10: enfocar dentro de una red nunca la cambia (G-05); el puente ya no calcula la Vista, la calcula el Shell (subgrafoDe)

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

Last session: 2026-10-08T01:13:59.306Z
Stopped at: Completed 04-10-PLAN.md
Resume file: None

Note: 02-02's executor agent hit the account's monthly spend limit right after finishing Task 3's
implementation but before committing/summarizing. The orchestrator verified the completed work
against the plan's acceptance criteria directly (all passed) and committed/summarized it manually
— no re-implementation happened. See 02-02-SUMMARY.md "Deviations" for detail.
