---
phase: 04-ui-navigation
plan: 08
subsystem: ui
tags: [puente, panel, camara, area-segura, mobile, gap-closure]
status: complete
requires: [04-05, 04-06, 04-07]
provides: [onMostrar, claveEstado, sembrarJuntoAVecinos, guardia-de-coordenadas-finitas, marca-mobile]
affects: [04-09, 04-10, 04-11]
key-files:
  created: []
  modified:
    - src/app/Shell.tsx
    - src/app/CanvasSinapsis.tsx
    - src/app/Overlay.tsx
    - src/lib/red/url.ts
    - src/styles/overlay.css
    - src/engine/SinapsisEngine.js
    - src/engine/graph/transiciones.js
    - src/engine/graph/transiciones.test.js
key-decisions:
  - "El panel sigue un estado propio `mostrado` que va por detrás de la URL: oculta, cambia el contenido, mueve la cámara, muestra (UAT punto 4, reemplaza el cross-fade de UI-SPEC §4)"
  - "El área segura se recuerda en el motor mientras hay foco y se sigue aplicando mientras la mezcla baja; el puente ya no decide cuándo aplicarla (se borra el ref booleano de foco)"
  - "El motor no enfoca un nodo hasta que tenga x/y/z finitas (tope 2 s, console.warn y sin throw)"
requirements-completed: [UI-10, UI-09, UI-04, UI-08]
actuals:
  tokens: 6858
  tasks: 3
  commits: 5
plan_head_before: 6c454d2551ec78037b309d1e03e2b6d58bc091a2
plan_head_after: 9c223dbd101dfd30d2d17c97c0a0cab358c8a673
duration: 62min
completed: 2026-10-08
---

# Phase 4 Plan 08: Orden del panel, Volver sin salto, crédito sin pantalla negra y marca mobile Summary

El panel oculta con el contenido viejo, cambia la información ya oculto y reaparece tras la cámara (`mostrado` + `onMostrar` en la cola del puente); el motor recuerda el área segura para soltarla gradual al desenfocar y no enfoca nodos sin coordenadas finitas; "Sinápsis" pasa a marca chica abajo en mobile.

## Decisiones técnicas (arriba de todo)

1. **Cambio de decisión declarado (G-02, UAT punto 4).** UI-SPEC §4 decía "cross-fade del contenido (0.3 s), se mantiene el contenedor". El dueño pidió otro orden: primero ocultar, después cambiar la información, después mostrar tras la cámara. Se implementó con un estado `mostrado` en Shell que el puente actualiza (`onMostrar`) entre la salida del panel y `setVista`. Alternativa descartada: cross-fade con clave por nodo (no cubre el rect del panel en mobile). Riesgo mientras 04-11 no actualice el UI-SPEC: el documento contradice el comportamiento.
2. **El área segura la decide el motor, no el puente.** Se borró `hayFocoRef`; `getAreaSegura` devuelve siempre el rect del panel y el motor lo aplica solo con `_nodoEnfocado`. Mientras la mezcla baja se aplica el área recordada (`_areaFoco`). Riesgo residual: en mobile el rect del panel cambia 16 px por el `translateY` de su estado oculto, así que el offset baja ~8 px en el primer cuadro de la salida (antes caía a 0 de golpe).
3. **Guardia de coordenadas en el lugar compartido** (`setVista`), no en el desvío del puente. El desvío a la red propia del enfocado lo reemplaza 04-10.

## Tasks

1. **Task 1 (tracer)** `ae0e723`: Shell (`mostrado`), CanvasSinapsis (`onMostrar`, `claveEstado`, sin `hayFocoRef`, pausa de salida 300 ms / 200 ms con reduced-motion), Overlay (panel desde `mostrado`, `visible` exige `claveEstado(mostrado) === claveEstado(estado)`), url.ts (`claveEstado`), overlay.css (salida 300 ms, entrada 600 ms).
2. **Task 2 (TDD)** RED `ac671ab` (test de `sembrarJuntoAVecinos`, falla por export ausente), GREEN `ef45bb0` (`sembrarJuntoAVecinos`, área recordada en `_tick`, `_nodoConCoordenadas` con sondeo de 50 ms y tope 2 s, siembra en aditivo y espera de `NODE_FADE_DURATION` si hubo entrantes).
3. **Task 3** `9c223db`: marca "Sinápsis" abajo a la izquierda en mobile (h1 de la home y `.marca`), `marca--oculta` con el panel visible, `.tituloRed` con elipsis. `index.css` sin tocar.

## Evidencia (Playwright headless con GPU sobre el dev server 3002, datos reales; muestreo por rAF, ~5 fps)

**Task 1, paso 0 (diagnóstico).** Hipótesis H1 confirmada; H2 no hizo falta. Volver en 390x800, ANTES:

```
t=3211  oy=110.1 cam=97,98,33  vis=true  nom=Julieta Agriano url=/entidad/julieta-agriano
t=3294  oy=0.0   cam=97,98,33  vis=false nom=undefined         url=/      <- offset a 0 de golpe, cámara quieta
t=3924  oy=0.0   cam=77,78,98                                              <- recién ahí arranca el tween
```

El offset cae a 0 en un cuadro (el ref de foco ya era false) y el contenido del panel se vacía en el mismo render (el rect mobile colapsa), 600 ms antes de que la cámara se mueva. Además, "otro nodo" ANTES: el nombre cambiaba en el mismo cuadro que la URL (`t=136 url=wip nom=J4 4NT` → `t=180 nom=WIP`), y la nota A del smoke se reprodujo: el panel quedó `vis=true busy=false` con la URL nueva antes de `moviendo` (hizo que mi `listo()` resolviera antes de tiempo).

**G-02 DESPUÉS (otro nodo con el panel abierto, 390x800):**

```
t=129  vis=false busy=false nom=Ep.Di url=/entidad/momf    <- sale con el contenido viejo
t=147  vis=false busy=true  nom=Ep.Di
t=460  vis=false busy=true  nom=Momf                       <- cambia ya oculto (>300 ms)
t=666  cam=156,-26,19  ...  t=3389 cam=124,-59,207        <- recién ahí se mueve la cámara
t=3499 vis=true  busy=false nom=Momf                       <- reaparece al llegar
```

**G-01 DESPUÉS (Volver).** 390x800: `oy` 110.1 → 102.7 (efecto del `translateY` del panel oculto) → baja sin saltos y casi monótono (101.7, 98.9, 93.6, 86.2, … 4.3, 0.7, 0.0) en ~3.1 s junto con la cámara (`cam` 138,102,7 → 0,0,350). 1280x800: `ox` -384.8 constante durante la pausa y luego -339, -309, -271 … -2.4, 0.0, monótono. Hallazgo extra durante esta medición: el botón Volver desaparecía con la URL (`puedeVolver` seguía a `estado`) y achicaba 52 px el panel mobile mientras salía (`oy` 110 → 84 antes de mover la cámara); se corrigió haciendo que siga a `mostrado` (`0ee351e`).

**G-04 (pantalla negra).** Ruta real: `/obra/tempistica-i?red=obras` (Vista de 17 nodos), Ver más, crédito "Agus Mansilla" (no está en la Vista → desvío a su red, aditivo, 17 → 56 nodos). ANTES (motor de `HEAD` anterior, restaurado solo para medir): `cam=["NaN",-85,"NaN"]` a +1,5 s y `["NaN","NaN","NaN"]` desde +3 s, estable. DESPUÉS: `cam=[88,-85,197]` → `[-276,155,76]` → `[-396,233,36]`, finitas, la red visible, un solo canvas. Hipótesis del plan (NaN por nodo recién entrado sin x/y/z) confirmada. Un crédito que ya estaba en la Vista (Flor desde Nudo) nunca fallaba.

**G-07 (390x800).** `/`: h1 `left=16`, `font-size 14px`, abajo (`top=763`). `/entidad/tropical-poncho`: `.marca` `left=16 top=763`, `.tituloRed` `left=72 top=20 right=337`, sin intersección. `/obra/nudo` con el panel visible: `.marca` `opacity 0`. Título de 62 caracteres: `right=374` (≤ 390), elipsis.

## Verification

- `npm test` 120 pass (115 + 5 casos nuevos de `sembrarJuntoAVecinos`), `npx tsc --noEmit` OK, `npm run lint` rc 0 (solo warnings previos), `next build` OK. El build se corrió en una copia aislada con `node_modules` enlazado para no pisar el `.next` del dev server de 3002 del dueño (mismo código, mismo comando `next build`).
- Criterios de aceptación Task 1: `hayFocoRef` 0; `onMostrar` 5 (Canvas) y 1 (Shell); `mostrado` 7 en Overlay; `claveEstado` 1 en url.ts y ≥1 en Canvas y Overlay; sin imports de three/engine en Overlay ni Shell.
- Task 2: transiciones.test.js pasa (13 tests); `export function sembrarJuntoAVecinos` 1; en el motor 2 usos; `isFinite` 1; `git diff 74639be -- background.js threeObjects` vacío (G-06 intacto); sin imports de react/next en el motor.
- Task 3: `marca--oculta` en Overlay.tsx y overlay.css; `text-overflow: ellipsis` 1; `index.css` sin cambios.
- Un solo `<canvas>` en todos los recorridos medidos.

## Deviations from Plan

**1. [Rule 1 - Bug] `puedeVolver` seguía a la URL y achicaba el panel mobile mientras salía**
- **Found during:** Task 2, muestreo "después" de Volver en 390x800 (`oy` caía 110 → 84 antes de mover la cámara).
- **Fix:** el efecto de `puedeVolver` depende de `mostrado` y no de `estado`.
- **Files modified:** src/app/Overlay.tsx
- **Commit:** `0ee351e`

**2. [Rule 1 - Bug] `marca--oculta` acotada a mobile**
- **Issue:** el plan la definía sin media query; en escritorio la marca está abajo a la derecha y el panel a la izquierda, ocultarla ahí solo quitaría la marca sin motivo.
- **Fix:** la regla vive dentro de `@media (max-width: 800px)`.
- **Commit:** `9c223db`

**3. Medición con Playwright (gstack node_modules) en lugar de `/browse`.** El servidor de `browse` murió entre llamadas con la página WebGL abierta (reinicios y "failed to start within 15s"), así que no sostenía el muestreo por rAF. Se usó el mismo Chromium de gstack por script, en el scratchpad, sin instalar nada. El dev server fue el del dueño (3002, datos reales, no la fixture); los nombres de nodo del plan (Nudo, Ana Ruiz) se reemplazaron por equivalentes reales.

**Total deviations:** 3 (2 auto-fixed Rule 1, 1 de método de medición). **Impact:** sin cambio de alcance.

## Known Stubs

Ninguno.

## Deferred / observaciones

- Cuando el contenido del panel mobile cambia mientras está oculto (otro nodo con descripción de otro largo), el offset se reajusta una vez (8 px en la medición); inherente al orden pedido (el rect se mide con el contenido nuevo antes de encuadrar). No bloquea.
- El desvío a la red propia del enfocado sigue en el puente; lo reemplaza 04-10.
- La siembra de entrantes está verificada por test puro y por la medición del crédito (camino finito); no se midió visualmente la distancia al vecino.

## Threat Flags

Ninguno (sin superficie nueva). T-04-01 y T-04-02 mitigados como se planeó.

## Self-Check: PASSED

Commits `ae0e723`, `ac671ab`, `ef45bb0`, `0ee351e`, `9c223db` presentes; archivos modificados presentes; acceptance_criteria de las 3 tareas re-corridos arriba.
