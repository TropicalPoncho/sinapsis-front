# PERF-01 — Techo de nodos del motor a 30fps

> **Qué es este documento.** El número medido, no una optimización: PERF-01 pide saber cuántos
> nodos sostiene el motor a 30fps en un dispositivo de gama media, y cuántos draw calls cuesta
> cada nodo. Instancing y LOD (`.planning/PROJECT.md`, Out of Scope) quedan diferidos hasta tener
> este número — acá se decide si hace falta empezar ese trabajo o no.

**El número: TBD** (lo completa la Task 3 de `03-06-PLAN.md` con los datos del checkpoint humano).

## Corridas

| nodos | fps limpio | fps con overlay (62%) | draw calls | draw calls/nodo |
|-------|-----------|------------------------|------------|------------------|
| — | — | — | — | — |
| — | — | — | — | — |
| — | — | — | — | — |
| — | — | — | — | — |

## Método

- **Fixture:** `subgrafoSintetico(n)` (`src/engine/fixtures/subgrafoSintetico.js`) — `n` nodos
  repartidos deterministamente entre las 14 formas registradas, 20% con thumb real
  (`public/obras/`), `n * 1.5` vínculos encadenados para que el grafo quede conexo.
- **Rig:** el puente (`src/app/CanvasSinapsis.tsx`) lee `?nodos=N`, `?overlay=1` y `?perf=1` de
  la URL — sin componentes nuevos, es el aparato de medición, no el panel real (ése es UI-09,
  Fase 4).
- **FPS:** promedio móvil de ~1s sobre `performance.now()`, acumulado en `_tick` de
  `SinapsisEngine`, leído por `_perf().fps`.
- **Draw calls:** `renderer.info.render.calls` de three.js, expuesto por `_perf()` junto con
  `triangulos`, `geometrias` y `texturas` — mismo patrón que `startRendererInfoDebug()` de
  `collectiveConscience/mundo.js`.
- **Gama media:** CPU throttling 4x del panel Performance de Chrome DevTools, más al menos una
  corrida en un dispositivo real si hay uno a mano (ver "Qué NO mide" abajo).
- **Hardware / navegador:** TBD.
- **Ventana de asentamiento:** 20s antes de anotar el último log de `?perf=1`, para que la
  simulación de fuerzas termine de estabilizarse.

## Qué NO mide

TBD — a completar con el resultado de la corrida (Chrome no tiene throttle de GPU confiable;
el número CPU-throttled es un piso, el de dispositivo real es el que manda).

## Qué se hace con esto

TBD — si el número justifica empezar instancing/LOD ahora o no, y cuál sería el primer paso.
