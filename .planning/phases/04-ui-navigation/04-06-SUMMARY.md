---
phase: 04-ui-navigation
plan: 06
subsystem: ui
tags: [menus, ficha, overlay, react]
requires: [04-01, 04-05]
provides: [MenuSuperior, MenuLateral, Ficha, panel--con-lateral]
affects: [04-07]
key-files:
  created: [src/app/Menus.tsx, src/app/Ficha.tsx]
  modified: [src/app/Overlay.tsx, src/styles/overlay.css]
key-decisions:
  - "Color del bnfocus solo si pasa /^#[0-9a-fA-F]{6}$/ (dato en el borde)"
  - "BASE_ASSETS = '/' como único punto de mudanza a R2"
requirements-completed: [UI-03, UI-04, UI-06]
duration: 12min
completed: 2026-09-20
---

# Phase 4 Plan 06: Menús y ficha Summary

Menú superior de agrupadores con hamburguesa, lateral con VOLVER y ficha de OBRA con detalle cargado bajo demanda, todo derivado de Adyacencia/Subgrafo y de `/api/nodo/[id]`.

## Tasks
1. Menus.tsx + montaje en Overlay + estilos (479aac1). Overlay ahora agrega `panel--con-lateral` cuando hay sub-red; la `subredVacia` reusa la misma memo `sub`.
2. Ficha.tsx + montaje en el panel extendido (b1f4c75). Fetch con AbortController y caché en Map; sin `dangerouslySetInnerHTML`.

## Deviations from Plan
Ninguna relevante. Los estilos de la ficha se commitearon junto con la tarea 1 (mismo archivo CSS).

## Verification
tsc, lint (solo warnings previos), npm test (107 pass) y build OK. Greps de aceptación: sin hardcodeo de áreas, `fetch(` solo en Ficha, 0 "artista". No se probó visualmente con la fixture en navegador.

## Known Stubs
Ninguno.

## Self-Check: PASSED
