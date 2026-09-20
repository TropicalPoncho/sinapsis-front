---
phase: 04-ui-navigation
plan: 04
subsystem: ui
tags: [nextjs, react, three, navigation, history]
requires: ["04-01", "04-02", "04-03"]
provides:
  - Shell persistente en layout.tsx (canvas + overlay)
  - CanvasSinapsis como unico puente motor/React con cola de un carril
  - Contrato OverlayProps/Fase fijado (Overlay es un esqueleto)
affects: [04-05, 04-07]
key-files:
  created: [src/app/Shell.tsx, src/app/Overlay.tsx, "src/app/entidad/[slug]/page.tsx", "src/app/obra/[slug]/page.tsx"]
  modified: [src/app/layout.tsx, src/app/page.tsx, src/app/CanvasSinapsis.tsx]
key-decisions:
  - "Navegacion interna con history.pushState propio (idx/t en history.state), nunca router.push"
  - "Promesa motorListo recreada por montaje para que StrictMode no deje la cola esperando un motor destruido"
requirements-completed: [UI-01, UI-02, UI-05, UI-08, UI-10]
duration: 20min
completed: 2026-09-20
---

# Phase 4 Plan 04: Puente y Shell Summary

Canvas unico montado en layout por encima del router, con navegacion por pushState y cola "el ultimo gana" que secuencia Vista, camara y fase `listo`.

## Tasks
1. Layout, paginas nulas, Shell y Overlay esqueleto - dcdcd7e
2. CanvasSinapsis reescrito (ciclo de vida StrictMode-safe, cola, area segura desde panelRef) - 928f876

## Deviations from Plan

**1. [Rule 1 - Bug] motorListo por montaje**
- **Issue:** con una promesa unica, tras el remontaje de StrictMode la cola esperaria el primer motor (destruido).
- **Fix:** se recrea la promesa al inicio del effect de ciclo de vida.
- **Files:** src/app/CanvasSinapsis.tsx

Por lo demas, plan ejecutado tal cual. `tsc`, `lint` (solo warnings previos del motor), `build` y `npm test` (107) en verde. El smoke de navegador es del plan 07.

## Known Stubs
- `src/app/Overlay.tsx`: panel vacio por diseno; lo llena el plan 05.

## Self-Check: PASSED
