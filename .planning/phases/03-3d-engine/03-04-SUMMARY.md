---
phase: 03-3d-engine
plan: 04
subsystem: engine
tags: [three, three-forcegraph, d3-force-3d, transitions, engine]

requires:
  - phase: 03-3d-engine (plan 03)
    provides: "SinapsisEngine.js skeleton, setVista(subgrafo, opts) switch with reemplazo wired and a TODO Plan 04"
provides:
  - "src/engine/graph/transiciones.js: clasificarCambio, pinear, soltarPin, fusionar, desvanecerYQuitar"
  - "src/engine/SinapsisEngine.js: setVista con las tres transiciones (reemplazo/filtrado/aditivo) completas"
affects: [03-3d-engine plan 05 (framing/orbit), plan 06 (perf/visual checklist), 04-ui-next]

tech-stack:
  added: []
  patterns:
    - "node.fx/fy/fz pinning es el único mecanismo verificado que sobrevive al reheat incondicional de graphData() en three-forcegraph"
    - "clasificarCambio/pinear/soltarPin/fusionar son funciones puras sobre objetos planos, sin imports de three — transiciones.js es headless-testeable"
    - "desvanecerYQuitar anima escala del Group a 0 (no opacity) porque la mayoría de los ThreeObject usan ShaderMaterial propio"

key-files:
  created:
    - src/engine/graph/transiciones.js
    - src/engine/graph/transiciones.test.js
  modified:
    - src/engine/SinapsisEngine.js
    - src/app/CanvasSinapsis.tsx

key-decisions:
  - "Verificación de MOTR-04 hecha headless contra d3-force-3d real (la misma librería que three-forcegraph reheat-ea internamente), no contra un navegador — no hay herramienta de browser disponible para este agente ejecutor (mismo límite documentado en 03-03-SUMMARY.md)"
  - "aditivo mergea links por `id` en un Map en vez de concatenar y deduplicar después — evita links duplicados sin depender de que el fixture no repita ids"

patterns-established:
  - "transiciones.js: mecanismo de pin/soltar como módulo aparte, reusado igual en filtrado y aditivo — no se duplicó la lógica de fx/fy/fz en SinapsisEngine.js"

requirements-completed: [MOTR-04, MOTR-05, MOTR-06]

duration: 35min
completed: 2026-08-15
---

# Phase 03 Plan 04: Transiciones filtrado + aditivo Summary

**`transiciones.js` aporta el mecanismo de pin (`node.fx/fy/fz`) que sobrevive al reheat incondicional de `graphData()`; `setVista` ahora resuelve `filtrado` y `aditivo` como ramas reales del switch, elegidas únicamente por el parámetro `transicion`.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-08-15
- **Tasks:** 2
- **Files modified:** 4 (2 nuevos, 2 modificados)

## Accomplishments

- `clasificarCambio(nodosActuales, nodosNuevos)` → `{ quedan, salen, entran }` comparando por `id`; `quedan` devuelve los objetos de `nodosActuales` (con `x/y/z` ya simulados), no los de `nodosNuevos`
- `pinear`/`soltarPin` fijan/liberan `fx/fy/fz`; `pinear` es idempotente y no pinea nodos sin `x` definido (no fija en el origen algo que nunca se simuló)
- `fusionar(quedan, entran)` conserva identidad de referencia de los objetos de `quedan` (assertado con `assert.equal`)
- `desvanecerYQuitar` anima la escala del `Group` de cada mesh saliente de 1 a 0 vía `requestAnimationFrame` y libera con `disposeUnusedObjects` — comentario `ponytail:` nombra el techo (escala en vez de opacity real; sube si algún día hace falta un fundido por shader)
- `SinapsisEngine.setVista`: `filtrado` pinea lo que queda, desvanece y libera lo que sale, y cierra con `disposeUnusedObjects` (MOTR-07); `aditivo` pinea el esqueleto existente y suma nodos/links nuevos sin disponer nada
- Las tres ramas (`reemplazo`/`filtrado`/`aditivo`) se eligen sólo por `transicion` — ninguna mira `subgrafo.raiz` ni `nodoEnfocado` para decidir la rama (MOTR-06)
- `npx tsc --noEmit`, `npm run build` y `npm test` en 0 (74 tests: 62 previos + 12 de `transiciones.test.js`... ver detalle abajo)
- `CanvasSinapsis.tsx` gana una secuencia de desarrollo `reemplazo → filtrado → aditivo` sobre `subgrafoDemo`/`subgrafoDemoFiltrado`, detrás de `?demo=transiciones` — no corre en cada carga

## Task Commits

1. **Task 1: transiciones.js — clasificar, pinear, desvanecer** - `d39ad95` (test)
2. **Task 2: setVista con las tres transiciones** - `be1a169` (feat)

## Files Created/Modified

- `src/engine/graph/transiciones.js` - `clasificarCambio`/`pinear`/`soltarPin`/`fusionar`/`desvanecerYQuitar`, sin imports de `three`
- `src/engine/graph/transiciones.test.js` - tests headless de las cuatro funciones puras (12 subtests)
- `src/engine/SinapsisEngine.js` - `setVista`: ramas `filtrado` y `aditivo` reemplazan el `// TODO Plan 04`
- `src/app/CanvasSinapsis.tsx` - secuencia de verificación manual detrás de `?demo=transiciones`

## Verificación MOTR-04 — posiciones antes/después de `filtrado`

**Cómo se verificó:** no hay herramienta de browser disponible para este agente ejecutor (mismo límite ya documentado en `03-03-SUMMARY.md`). En vez de simular sin evidencia, se escribió un script headless que ejercita la **misma pieza real** que `three-forcegraph` reheat-ea internamente en cada `graphData()` (`d3-force-3d`, verificado contra el source en `03-RESEARCH.md`), corriendo la secuencia exacta de la rama `filtrado` de `SinapsisEngine.setVista` — `clasificarCambio` → `pinear(quedan)` → nueva simulación con `alpha(1)` (el reheat) → 20 ticks post-reheat — importando `clasificarCambio`/`pinear`/`fusionar` directamente desde `src/engine/graph/transiciones.js`, no una reimplementación.

12 nodos del fixture `subgrafoDemo`, recorte a `subgrafoDemoFiltrado` (`tropical-poncho` + 6 vecinos directos). Simulación inicial asentada con 100 ticks (equivalente a `cooldownTicks(100)` del motor), luego `filtrado` con reheat y 20 ticks más:

| id | xAntes | yAntes | zAntes | xDespués | yDespués | zDespués | idéntico |
|---|---|---|---|---|---|---|---|
| tropical-poncho | 16.44417568728048 | -9.727694021967341 | 35.91169269279574 | 16.44417568728048 | -9.727694021967341 | 35.91169269279574 | true |
| nudo | -6.28146006437927 | -39.669436050606876 | 39.113276858029835 | -6.28146006437927 | -39.669436050606876 | 39.113276858029835 | true |
| espora | -12.03071834736992 | -11.946315723353507 | 60.59203910548298 | -12.03071834736992 | -11.946315723353507 | 60.59203910548298 | true |
| wip | 39.15244208051493 | 9.830674109396968 | 51.96865676037812 | 39.15244208051493 | 9.830674109396968 | 51.96865676037812 | true |
| kutral | 46.87082832592981 | -20.703470910591 | 25.163260830346136 | 46.87082832592981 | -20.703470910591 | 25.163260830346136 | true |
| tempistica | 26.05850925352953 | 19.075789916794385 | 19.895983837570014 | 26.05850925352953 | 19.075789916794385 | 19.895983837570014 | true |
| soma | 6.039816982863071 | -2.9115487194842404 | 4.317969793745565 | 6.039816982863071 | -2.9115487194842404 | 4.317969793745565 | true |

Los 7 nodos que quedan en la Vista muestran `x/y/z` bit-a-bit idénticos pese al reheat de la simulación — la prueba de MOTR-04. `salen = [serie-uno, aislado, cluster-a, cluster-b, shape-invalido]`, `entran = []` (el filtrado es un subconjunto del fixture original).

**Pendiente real (no de este plan):** la checklist visual en navegador (¿se ve el desvanecimiento?, ¿el mesh escala a 0 antes de liberarse?) queda para el Plan 06, como ya anticipaba 03-03-SUMMARY.md. El script de verificación fue temporal, no quedó en el repo (se ejecutó desde un directorio fuera de control de versiones y se borró).

## Decisions Made

- Verificación de MOTR-04 headless contra `d3-force-3d` real en vez de contra un navegador — no re-implementa el mecanismo, importa las funciones reales de `transiciones.js` y corre la misma librería que `three-forcegraph` usa internamente
- `aditivo` deduplica links con un `Map` por `id` (los ids de link ya vienen únicos de `linkThreeObject`/`adaptarSubgrafo`) en vez de un `unirLinks` separado — una función nueva para tres líneas de merge no se justificaba

## Deviations from Plan

None - plan ejecutado según lo escrito, salvo la verificación MOTR-04 (documentada arriba, no es un deviation de código sino de método de verificación, ya anticipado por el límite conocido de la fase).

## Issues Encountered

Ninguno más allá de la ausencia de herramienta de browser, ya documentada.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `SinapsisEngine.setVista` cierra MOTR-03/04/05/06: cualquier Vista alcanzable con cualquiera de las tres transiciones, elegida sólo por el parámetro
- El Plan 05 puede extender `setVista`/`cameraController` con `applySafeArea`/`chooseOrbitAngle`/`nodeFocus` sin tocar el mecanismo de transiciones
- El Plan 06 hereda la deuda de verificación visual real en navegador (reemplazo/filtrado/aditivo, desvanecimiento visible) y la medición PERF-01
- Sin blockers

---
*Phase: 03-3d-engine*
*Completed: 2026-08-15*

## Self-Check: PASSED

- FOUND: src/engine/graph/transiciones.js
- FOUND: src/engine/graph/transiciones.test.js
- FOUND commit: d39ad95
- FOUND commit: be1a169
