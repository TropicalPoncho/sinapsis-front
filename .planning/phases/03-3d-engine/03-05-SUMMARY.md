---
phase: 03-3d-engine
plan: 05
subsystem: engine
tags: [three, camera, safe-area, framing, orbit, nodeFocus]

requires:
  - phase: 03-3d-engine (plan 01)
    provides: "encuadre.js: offsetDeAreaSegura, distanciaParaEncuadrar, elegirLadoOrbit, posicionCamaraParaFoco — geometría pura consumida acá"
  - phase: 03-3d-engine (plan 04)
    provides: "SinapsisEngine.setVista con las tres transiciones completas"
provides:
  - "src/engine/graph/cameraController.js: applySafeArea, clearSafeArea, enfocarNodo — aimAtNode y su izq/der eliminados"
  - "src/engine/SinapsisEngine.js: área segura leída cuadro a cuadro en _tick, setVista resuelve nodoEnfocado (id) y espera enfocarNodo antes de resolver su promesa, evento nodeFocus con el punto proyectado"
  - "src/app/CanvasSinapsis.tsx: getAreaSegura de desarrollo por breakpoint, log de nodeFocus"
affects: [04-ui-next (consume nodeFocus y getAreaSegura real del panel)]

tech-stack:
  added: []
  patterns:
    - "El área segura entra por opción del constructor (pull, leída en _tick) en vez de un setter — la superficie pública sigue siendo constructor/setVista/on/destruir"
    - "El foco se resuelve por id contra graphData().nodes ya aplicado, nunca contra el Subgrafo crudo — así nunca enfoca un nodo que la transición no trajo"

key-files:
  created: []
  modified:
    - src/engine/graph/cameraController.js
    - src/engine/SinapsisEngine.js
    - src/app/CanvasSinapsis.tsx

key-decisions:
  - "nodoEnfocado en las opciones de setVista es un id (no un nodo); se resuelve contra graphData().nodes después de aplicar la transición, no antes — así respeta MOTR-06 (la transición no mira nodoEnfocado) y sólo enfoca si el nodo sobrevivió al recambio"
  - "_emitirFocoSiSeMovio() se reusa tanto desde _tick (movimiento continuo de cámara/scroll) como desde setVista tras enfocarNodo (invalidando _ultimoFoco a null para forzar el primer emit) — evita duplicar la lógica de graph2ScreenCoords + comparación de 1px"

patterns-established:
  - "cameraController: la traslación de frustum (applySafeArea) y el encuadre por shape (enfocarNodo) son dos responsabilidades separadas — applySafeArea no sabe de nodos, enfocarNodo no sabe de setViewOffset"

requirements-completed: [MOTR-08, MOTR-10, MOTR-11, MOTR-12]

duration: 30min
completed: 2026-08-15
---

# Phase 03 Plan 05: Encuadre real — área segura, orbit y nodeFocus Summary

**`cameraController` gana `applySafeArea`/`clearSafeArea`/`enfocarNodo` sobre `encuadre.js`; `SinapsisEngine` re-aplica el área segura cuadro a cuadro, secuencia el foco después de cada transición (MOTR-09) y emite `nodeFocus` con el punto proyectado — `aimAtNode` y su `izq`/`der` ya no existen.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-08-15
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `cameraController.applySafeArea(areaSegura, W, H)` traslada el frustum vía `setViewOffset`, siempre con el tamaño actual del canvas (MOTR-08); `clearSafeArea()` lo saca
- `enfocarNodo(nodo, nodos, areaSegura, duracion)` decide la distancia por `nodo.esImagen` (nunca `nodeType`), elige el ángulo de órbita con `elegirLadoOrbit` (centroide del grafo) y devuelve una promesa que resuelve cuando el tween de cámara termina — `lookAt` es el nodo exacto, el descentrado lo hace el offset de frustum
- `aimAtNode()` y el wrapper `getSide()` de `cameraController.js` fueron eliminados; `getSide` sigue disponible desde `utils.js` para quien la necesite
- `SinapsisEngine._tick` lee `opciones.getAreaSegura?.() ?? this._areaSegura` en cada frame y re-aplica `applySafeArea` — pull en vez de 60 llamadas/s empujadas desde React, sin agregar método público
- `setVista` resuelve `nodoEnfocado` (un id) contra `graphData().nodes` **después** de aplicar la transición elegida, llama `enfocarNodo` y sólo entonces resuelve su propia promesa (MOTR-09: Vista → cámara → overlay, secuenciado); si el id no está en el Subgrafo recién aplicado, no enfoca y no emite, sin throw
- `_emitirFocoSiSeMovio()` emite `nodeFocus: { nodeId, screen }` con `graph2ScreenCoords` cuando el punto se movió más de 1px, reusada desde `_tick` (movimiento continuo) y desde `setVista` (primer emit tras encuadrar)
- `CanvasSinapsis.tsx` pasa un `getAreaSegura` de desarrollo por breakpoint (62% izquierdo en escritorio, 60% inferior en mobile) y loguea `nodeFocus`, sin construir UI nueva
- `npx tsc --noEmit`, `npm run build` y `npm test` en 0 (62 tests, sin regresiones)

## Task Commits

1. **Task 1: cameraController — applySafeArea, clearSafeArea, enfocarNodo** - `a8977f0` (feat)
2. **Task 2: área segura continua, foco y el evento nodeFocus** - `cfe7c0d` (feat)

## Files Created/Modified

- `src/engine/graph/cameraController.js` - `aimAtNode`/`getSide` (wrapper) eliminados; `applySafeArea`, `clearSafeArea`, `enfocarNodo` agregados, consumiendo `encuadre.js`
- `src/engine/SinapsisEngine.js` - `_tick` aplica el área segura cada frame; `setVista` resuelve `nodoEnfocado` y espera `enfocarNodo`; `_emitirFocoSiSeMovio` emite `nodeFocus`
- `src/app/CanvasSinapsis.tsx` - `getAreaSegura` de desarrollo, suscripción de log a `nodeFocus`, `?foco=<id>` para probar el encuadre manualmente

## Decisions Made

- `nodoEnfocado` viaja como id en las opciones de `setVista`, no como objeto nodo — se resuelve recién contra `graphData().nodes` tras la transición, así nunca intenta encuadrar un nodo que `filtrado` acaba de sacar de escena
- `_emitirFocoSiSeMovio` reusada en dos puntos de entrada (loop continuo y post-encuadre) en vez de duplicar la comparación de 1px — un solo lugar decide cuándo vale la pena emitir

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `TS2698: Spread types may only be created from object types` preexistente en `CanvasSinapsis.tsx`**
- **Found during:** Task 2 — `npx tsc --noEmit` fallaba antes de tocar el archivo (confirmado con `git stash` contra el estado previo al plan)
- **Issue:** `...antes.get(n.id)` no narrowea `Map.get()` (`V | undefined`) aunque el `.filter(n => antes.has(n.id))` previo garantiza que existe
- **Fix:** `...antes.get(n.id)!` — el filtro previo ya garantiza el valor, la aserción es correcta y local
- **Files modified:** src/app/CanvasSinapsis.tsx (archivo que este mismo task ya modifica)
- **Verification:** `npx tsc --noEmit` y `npm run build` en 0
- **Committed in:** `cfe7c0d` (Task 2 commit)

**2. [Rule 1 - Bug] Comentario de `enfocarNodo` citaba literalmente `aimAtNode`, rompiendo el propio acceptance criteria del plan**
- **Found during:** Task 1 — `grep -rc "aimAtNode" src/engine/` esperaba 0 en `cameraController.js`
- **Issue:** El comentario explicando por qué `lookAt` es el nodo exacto mencionaba la palabra `aimAtNode` en prosa
- **Fix:** Reescrito para decir "el encuadre viejo" en vez de nombrar la función eliminada — mismo patrón de deviation que 03-01/03-03
- **Files modified:** src/engine/graph/cameraController.js
- **Verification:** `grep -c "aimAtNode" src/engine/graph/cameraController.js` → 0
- **Committed in:** `a8977f0` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (ambos Rule 1 - bug: un error de tipos preexistente en un archivo que el plan ya tocaba, y un ajuste de fraseo de comentario para cumplir el propio acceptance criteria)
**Impact on plan:** Sin impacto en alcance ni API pública.

## Issues Encountered

None más allá de las dos deviations documentadas arriba.

## Verificación manual (MOTR-08/10/11/12)

**No hay herramienta de browser disponible para este agente ejecutor** — mismo límite ya documentado en 03-03-SUMMARY.md y 03-04-SUMMARY.md. Lo que sí se automatizó:

- `npm run dev` levanta sin errores; `GET /` y `GET /?demo=transiciones` responden 200
- El HTML server-rendered y el log del servidor no muestran errores de compilación ni de runtime del lado del servidor
- El código de `enfocarNodo`/`applySafeArea`/`_emitirFocoSiSeMovio` está cubierto indirectamente por los 21 tests headless de `encuadre.js` (Plan 01) sobre la geometría que consume — no hay test nuevo en este plan porque `cameraController.js`/`SinapsisEngine.js` requieren `THREE`/WebGL real, fuera del alcance de `node --test` headless

**Pendiente real (no de este plan), declarado y no falseado:**
- (a) Confirmar visualmente que un nodo no-`Image` enfocado cae en el 38% derecho del viewport, estable al redimensionar — no ejecutado
- (b) Confirmar que un nodo `Image` (`obras/nudo.png`) entra entero en esa misma franja — no ejecutado
- (c) Comparar el punto de `nodeFocus` (ya logueado en `CanvasSinapsis.tsx`) contra la posición real en pantalla — no ejecutado, delta en píxeles no medido
- (d) Confirmar que hover/click siguen agarrando el nodo correcto con el offset de `setViewOffset` activo — no ejecutado

Los cuatro quedan para el Plan 06, que ya hereda la misma deuda de checklist visual desde 03-03/03-04. El código de verificación manual (`getAreaSegura` de desarrollo, `?foco=<id>`, log de `nodeFocus`) queda en `CanvasSinapsis.tsx` listo para correrlos apenas haya navegador disponible.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- La Fase 4 puede reemplazar el `getAreaSegura` de desarrollo por el rect real del panel (`getBoundingClientRect` en cada frame de scroll) sin tocar el motor — la opción del constructor ya existe
- La Fase 4 puede suscribirse a `nodeFocus` para posicionar overlays UI sobre el nodo enfocado
- El Plan 06 hereda la checklist visual completa de MOTR-08/10/11/12 (a-d arriba) más la de Planes 03/04, y la medición PERF-01
- Sin blockers de código; el blocker real es la ausencia de herramienta de browser para este ejecutor, ya conocido

---
*Phase: 03-3d-engine*
*Completed: 2026-08-15*

## Self-Check: PASSED

- FOUND: src/engine/graph/cameraController.js
- FOUND: src/engine/SinapsisEngine.js
- FOUND: src/app/CanvasSinapsis.tsx
- FOUND commit: a8977f0
- FOUND commit: cfe7c0d
