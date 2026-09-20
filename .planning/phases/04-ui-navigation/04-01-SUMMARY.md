---
phase: 04-ui-navigation
plan: 01
subsystem: engine-data
tags: [engine, fixtures, api, validation]
requires:
  - phase: 03-engine
    provides: setVista con nodoEnfocado
provides:
  - setVista con nodoEnfocado null desenfoca
  - cargarAdyacencia reintenta tras un rechazo
  - fixture de topología (31 nodos) tras TOPOLOGIA_FIXTURE=1
  - validarDetalle y GET /api/nodo/[id]
affects: [04-02, 04-03, 04-04, 04-05, 04-06]
tech-stack:
  added: []
  patterns: ["undefined no toca el foco, null desenfoca", "fixture solo por env explícita"]
key-files:
  created:
    - src/lib/vista/topologia.test.ts
    - src/lib/red/fixtures/topologia.json
    - src/lib/red/fixtures/detalles.json
    - src/lib/red/fixtures.test.ts
    - src/lib/red/detalle.ts
    - src/lib/red/detalle.test.ts
    - src/app/api/nodo/[id]/route.ts
  modified:
    - src/engine/SinapsisEngine.js
    - src/lib/vista/topologia.ts
    - src/app/api/topologia/route.ts
key-decisions:
  - "Desenfoque con backToBasicsView + espera manual de la duración (no devuelve promesa); en reemplazo no se anima"
  - "Import relativo a detalle en la route: el alias @ solo cubre @/types/*"
requirements-completed: [UI-04, UI-10]
duration: 20min
completed: 2026-09-20
---

# Phase 4 Plan 1: Huecos de motor y datos Summary

El motor puede desenfocar (`nodoEnfocado: null`), `cargarAdyacencia` no cachea rechazos, hay una fixture de 31 nodos con Tropical Poncho unido a 6 áreas, y `/api/nodo/[id]` devuelve solo detalle validado.

## Tasks

| Task | Commit |
|------|--------|
| 1 motor desenfoca + retry topología | 4853226 |
| 2 fixture + TOPOLOGIA_FIXTURE | 846fb95 |
| 3 validarDetalle + /api/nodo/[id] | 5a7bc6b |

## Deviations from Plan

**1. [Rule 3 - Blocking] Import de `@/lib/red/detalle` no resuelve** (tsconfig solo tiene `@/types/*`). Se usó ruta relativa.
**2. [Rule 3 - Blocking] `next build` fallaba por `no-explicit-any` en `fixtures.test.ts`.** Se tipó con `N`/`V`. Incluido en el commit de Task 3.

Fixture: se agregaron 3 creadxrs (gabi, hugo, ines) para llegar a 31 nodos.

## Known Stubs

None.

## Self-Check: PASSED
