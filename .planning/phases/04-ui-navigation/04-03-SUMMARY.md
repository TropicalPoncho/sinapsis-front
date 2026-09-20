---
phase: 04-ui-navigation
plan: 03
subsystem: ui
tags: [pure-functions, home, menus, botones]
requires:
  - phase: 04-01
    provides: Adyacencia/Subgrafo
provides:
  - fraccionHome, semillaDeVisita, LIMITE_HOME
  - agrupadoresDe, entidadDeMenu, padreDe, nodosDeLaRed, creditosDe
  - botonesDe, Accion, Boton
affects: [04-05, 04-06]
tech-stack:
  added: []
  patterns: [funciones puras sobre Adyacencia, PRNG mulberry32 sembrado]
key-files:
  created:
    - src/lib/red/home.ts
    - src/lib/red/home.test.ts
    - src/lib/red/menus.ts
    - src/lib/red/menus.test.ts
    - src/lib/red/botones.ts
    - src/lib/red/botones.test.ts
key-decisions:
  - "Home: snowball sembrado alternando tipo, limite 40"
  - "Botones: switch por nodeType; destino nunca lo arma este modulo"
requirements-completed: [UI-01, UI-02, UI-04, UI-06]
duration: 15min
completed: 2026-09-20
---

# Phase 4 Plan 03: home, menus y botones Summary

Funciones puras que derivan de la Adyacencia la fraccion sembrada de la home, los menus/creditos y los botones por tipo de nodo; el overlay solo renderiza.

## Tasks
1. home.ts (6 tests) - e227639
2. menus.ts (8 tests) - 70c868c
3. botones.ts (6 tests) - 84ee034

`npm test` 107/107 y `tsc --noEmit` limpios.

## Deviations from Plan
None - plan executed as written (dos expectativas de test propias corregidas: conteo de candidatos y orden de roles).

## Known Stubs
None.

## Self-Check: PASSED
