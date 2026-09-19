---
phase: 03-3d-engine
plan: 06
subsystem: engine
tags: [perf, three, force-graph, measurement, verification]

requires:
  - phase: 03-3d-engine (plan 05)
    provides: "encuadre real, área segura continua y nodeFocus"
provides:
  - "docs/PERF-01.md: el número de PERF-01 (~100 nodos a 30fps con CPU 4x; 12fps a 6x), draw calls por nodo (~2,7), carga y liberación de recursos"
  - "SinapsisEngine._perf(): fps, draw calls, memoria de GPU y censo de escena; marcas performance.mark de carga"
  - "Rig de medición por query params (?nodos ?topologia ?enlaces ?forma ?overlay ?perf ?demo ?dist ?grado ?charge ?escala ?foco)"
  - "El motor renderiza y se comporta correctamente en un navegador real (primera vez)"
affects: [04-ui-next, PERF-01 follow-ups]

key-decisions:
  - "Links custom: el THREE.Line lo escribe setPosition desde linkPositionUpdate en el tick de la librería (sin loop de animación propio)"
  - "Layout: defaults de la librería (sin overrides de charge ni cooldown) más distancia por link según grado de los extremos; linkDistance 140 provisorio, se reajusta con datos reales"
  - "Liberación de recursos después del procesamiento diferido de graphData(), no antes (fuga de texturas)"
  - "animationType 'Hover' como en la web original"
  - "Click en un nodo = foco vía el puente (setVista aditivo con nodoEnfocado), hasta que la Fase 4 lo cambie por navegación de ruta"

requirements-completed: [PERF-01]

completed: 2026-09-19
---

# Phase 03 Plan 06: Medición PERF-01 y verificación visual Summary

**El motor se vio por primera vez en un navegador real durante este checkpoint y reveló una cadena de bugs que los tests headless no podían ver; se corrigieron, se midió el techo (~100 nodos a 30fps con CPU 4x, 12fps a 6x) y se escribió `docs/PERF-01.md`.**

## Resultado de PERF-01

Ver `docs/PERF-01.md`. Resumen: ~100 nodos a 30fps con CPU throttling 4x (41fps); 200 nodos dan 21fps; a 6x, 12fps con 100 nodos. ~2,7 draw calls por nodo. **Falta la corrida en un dispositivo real de gama media** (gap declarado).

## Bugs encontrados al renderizar por primera vez (root causes)

- **Crash al importar** (`dummyK[prop] is not a function`): `three-forcegraph` 1.42.13 → 1.43.4
- **Grafo diminuto y corrido a la derecha:** `applySafeArea` se aplicaba siempre; ahora solo con nodo enfocado
- **Crash al hacer click:** bug abierto de three.js #32116 con OrbitControls; guard con `Vector2` memoizado
- **Warnings de `BufferGeometry` y links mal conectados:** el objeto custom del link se pisaba; ahora `setPosition` escribe la geometría desde el tick de la librería
- **Nodo Noise invisible:** cargaba un HDR remoto que nunca resolvía; ahora esfera síncrona
- **Layout colapsado:** `chargeStrength` positivo; ahora defaults de la librería
- **Shader de Perlin no compilaba** y su tiempo no avanzaba
- **Fuga de texturas** (800 → 12 nodos dejaba 257): texturas de uniforms de instancia sin liberar y liberación previa al procesamiento de `graphData()`
- **Warnings de WebGL** (`SimpleText` con `textHeight` indefinido)
- **Zoom tardío que pisaba el foco:** se quitó `zoomToFit` al parar el motor; `warmupTicks(300)`
- **Nodos ralos difíciles de agarrar:** `agregarHitbox()` en la clase base

## Checklist visual (puntos 7 a 16)

| # | Resultado |
|---|-----------|
| 7 reemplazo | OK tras quitar el zoom tardío |
| 8 filtrado | OK: 0 nodos que seguían se movieron; salen con escala en 800 ms |
| 9 aditivo | OK: 0 nodos movidos; entran con escala en 800 ms |
| 10 liberación | OK tras las dos correcciones: texturas 458 → 10, geometrías 1364 → 24 |
| 11 Image enfocada | OK (también en mobile) |
| 12 no-Image enfocada | OK |
| 13 aristas hacia el lado libre | **Parcial:** `serie-uno` bien, `espora` sale hacia la cámara — techo declarado del método por centroide (MOTR-11), no un bug nuevo |
| 14 resize con foco | OK, el encuadre se ajusta |
| 15 hover y click | Hover OK; click ahora enfoca (puente); nodos ralos con hitbox |
| 16 consola | OK tras corregir los warnings de WebGL |

## Gaps abiertos

- **PERF-01 en dispositivo real de gama media:** sin medir. El número es una cota con CPU throttling.
- **MOTR-11:** las aristas del nodo enfocado no siempre salen hacia el lado libre (`espora`).
- **Carga de redes grandes:** 800 nodos tardan de 16 s a 145 s; `warmupTicks` síncrono más creación de nodos. Candidatos: carga progresiva (tandas con `aditivo`) o esfera simple con diseño diferido.
- **Layout apretado en redes densas:** `linkDistance` 140 provisorio; reajustar con datos reales (perillas por URL).
- **Fade de nodos con opacidad** (hoy escala): pendiente de diseño en la Fase 4.
- **Ondas de los links:** no se animan tras asentarse la física; animarlas solo para los vínculos del nodo bajo el mouse.
- **Legacy:** `MarbleThreeObject` usa texturas de imgur; ceiling de 2 texturas por nodo.
