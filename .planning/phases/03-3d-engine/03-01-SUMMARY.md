---
phase: 03-3d-engine
plan: 01
subsystem: engine
tags: [three, camera, geometry, node-test]

requires: []
provides:
  - "src/engine/graph/encuadre.js: offsetDeAreaSegura, centroAreaSegura, distanciaParaEncuadrar, centroide, ladoDestino, posicionCamaraParaFoco, elegirLadoOrbit — geometría pura de MOTR-08/10/11"
  - "npm test descubre todos los *.test.* bajo src/, no un archivo hardcodeado"
affects: [03-3d-engine plans that build cameraController.applySafeArea/chooseOrbitAngle]

tech-stack:
  added: []
  patterns:
    - "Archivos .js sin imports para matemática pura testeable headless con node --test, consumidos luego por el código con estado (cameraController)"

key-files:
  created:
    - src/engine/graph/encuadre.js
    - src/engine/graph/encuadre.test.js
  modified:
    - package.json

key-decisions:
  - "assert.ok con tolerancia 1e-9 en vez de assert.equal para el offset desktop (-446.4): 1166.4 no tiene representación binaria exacta, assert.equal fallaba por 4e-14"
  - "Comentarios reescritos para no contener literalmente 'camera'/'THREE'/'setViewOffset' (acceptance criteria del plan pedía grep -c 0), preservando el sentido: 'controlador de cámara del motor'"

patterns-established:
  - "encuadre.js: cero imports, solo objetos planos {x,y,z}, sigue la convención de utils.js"

requirements-completed: [MOTR-08, MOTR-10, MOTR-11]

duration: 15min
completed: 2026-08-15
---

# Phase 03 Plan 01: Geometría de encuadre pura Summary

**`src/engine/graph/encuadre.js` — offset de frustum, distancia de encuadre y elección de ángulo de órbita, sin THREE ni canvas, con 21 tests nuevos (39 en total con los 18 de resolverVista).**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-08-15T21:48:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `offsetDeAreaSegura`/`centroAreaSegura` resuelven MOTR-08 (traslación de frustum contra el área segura), verificados contra los tres casos literales del plan (escritorio, mobile, vacío)
- `distanciaParaEncuadrar` resuelve MOTR-10 (nodo `Image` entra entero), con sus propiedades (duplicar radio duplica distancia, lado limitante = min)
- `elegirLadoOrbit` resuelve MOTR-11 (cámara orbita para no tapar aristas con el panel), con los cinco casos degenerados del plan testeados en verde: aislado, un vecino, empate exacto, centroide detrás, y el caso mobile (objetivo vertical siempre empata)
- `npm test` ahora descubre cualquier `*.test.*` bajo `src/` — ningún plan futuro vuelve a tocar `package.json` para sumar un test

## Task Commits

1. **Task 1: Offset de área segura y distancia de encuadre, puros y testeados** - `9210b28` (feat)
2. **Task 2: Ángulo de órbita por centroide, con sus casos degenerados** - `5ee5c7f` (feat)

## Files Created/Modified
- `src/engine/graph/encuadre.js` - Geometría pura MOTR-08/10/11, sin imports
- `src/engine/graph/encuadre.test.js` - 21 tests con `node:test`/`node:assert/strict`
- `package.json` - `test` script ampliado a `src/**/*.test.*`

## Decisions Made
- Tolerancia de punto flotante en vez de igualdad exacta para el offset desktop (`-446.4`), porque `1166.4` no representa exactamente en binario y `assert.equal` fallaba por un error de `4e-14`
- Reescritura de comentarios para que no contengan literalmente las palabras que el acceptance criteria del plan grepea a 0 (`camera`, `THREE`, `setViewOffset`), manteniendo el sentido de "esto lo aplica el controlador de cámara del motor"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tolerancia de punto flotante en el test del offset desktop**
- **Found during:** Task 1
- **Issue:** El plan pedía `assert.equal(o.x, -446.4)`; el resultado real es `-446.40000000000003` por representación binaria de `1166.4`
- **Fix:** Cambiado a `assert.ok(Math.abs(o.x - -446.4) < 1e-9)`
- **Files modified:** src/engine/graph/encuadre.test.js
- **Verification:** `npm test` en verde
- **Committed in:** 9210b28 (Task 1 commit)

**2. [Rule 1 - Bug] Comentarios del archivo no cumplían su propio acceptance criteria**
- **Found during:** Task 1
- **Issue:** El código de referencia del plan (copiado literalmente en la acción) incluye comentarios con las palabras `camera`/`setViewOffset`, pero el acceptance criteria del mismo plan exige `grep -c "setViewOffset\|THREE\|camera" encuadre.js` = 0 — contradicción interna del plan
- **Fix:** Reescritos los dos comentarios afectados para preservar el significado sin usar esas palabras literales
- **Files modified:** src/engine/graph/encuadre.js
- **Verification:** grep confirma 0 matches, npm test sigue en verde
- **Committed in:** 9210b28 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (ambos Rule 1 - bug, correcciones menores de test/comentario)
**Impact on plan:** Sin impacto en el alcance ni la API pública; ambos son ajustes de precisión numérica y de fraseo de comentarios.

## Issues Encountered
None más allá de las dos deviations documentadas arriba.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `encuadre.js` está listo para que `cameraController` lo consuma en un plan posterior de esta misma fase (`applySafeArea`, `chooseOrbitAngle`)
- `npm test` corre 39 tests (18 de `resolverVista` + 21 de `encuadre`) en verde, `npx tsc --noEmit` en 0
- Ningún blocker

---
*Phase: 03-3d-engine*
*Completed: 2026-08-15*

## Self-Check: PASSED

- FOUND: src/engine/graph/encuadre.js
- FOUND: src/engine/graph/encuadre.test.js
- FOUND: .planning/phases/03-3d-engine/03-01-SUMMARY.md
- FOUND commit: 9210b28
- FOUND commit: 5ee5c7f
