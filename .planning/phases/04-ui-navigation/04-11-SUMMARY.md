---
phase: 04-ui-navigation
plan: 11
subsystem: ui
tags: [auditoria, ponytail, docs, re-smoke, uat, gap-closure]
status: complete
requires: [04-08, 04-09, 04-10]
provides: [D-23, enmiendas-D-03-D-09-D-16, re-smoke-de-gaps, uat-del-dueno-2, gaps-G-08-G-10]
affects: [04-12]
key-files:
  created: []
  modified:
    - src/app/Shell.tsx
    - src/engine/graph/transiciones.js
    - .planning/phases/04-ui-navigation/04-CONTEXT.md
    - .planning/phases/04-ui-navigation/04-UI-SPEC.md
    - .planning/phases/04-ui-navigation/04-SMOKE.md
    - .planning/phases/04-ui-navigation/04-UAT-GAPS.md
key-decisions:
  - "D-16 CONFIRMADA por el dueño: entrar a una entidad y entrar a un área son zoom in (reemplazo)"
  - "3b: el menú superior queda visible al previsualizar un área, con el área activa (cambio pendiente: G-10)"
  - "D-23 escrita: dentro de una red enfocar nunca la cambia; la red propia solo con Entrar"
requirements-completed: []
actuals:
  tokens: 45000
  tasks: 3
  commits: 5
plan_head_before: 54613c854a83b52f2ebdc11a923e4c98cfaeb5b3
plan_head_after: 59466cf0fdbce4c25ea75993c4b9c4602cf0762d
duration: 2 sesiones (autónomo + UAT del dueño)
completed: 2026-10-08
---

# Phase 4 Plan 11: Auditoría ponytail, documentos al día, re-smoke y UAT del dueño Summary

Cierre del ciclo de gaps de la Fase 4: la auditoría de 04-08..04-10 sacó dos sobrantes, CONTEXT y UI-SPEC dicen lo que el código hace (D-23 nueva, D-03/D-09/D-16 enmendadas), el re-smoke headless dio 21 filas OK y el dueño aceptó el resultado con ajustes, que quedan como tres gaps nuevos (G-08, G-09, G-10) para un plan 04-12. **La Fase 4 sigue abierta.**

## Respuestas del dueño y decisiones (arriba de todo)

1. **Enmienda de D-16: CONFIRMADA.** Entrar a una entidad y entrar a un área son zoom in ("vas ingresando"). El dueño agrega que el movimiento aditivo/filtrado puede ser el **lateral** entre entidad y obra (de un evento ver sus artistas ocultando el resto; de un artista sumar sus últimas obras), a diseñar más adelante. No cambia la decisión. Queda el ADR pendiente (ver abajo).
2. **Pregunta 3b (menú superior al previsualizar un área): que quede visible**, con el área activa, según la captura de diseño. Registrado en D-09 y en UI-SPEC (punto abierto 7). El código todavía lo oculta: es G-10.
3. **Reglas de D-22 (punto 6): sin respuesta explícita.** El dueño no objetó ninguna, pero tampoco las validó una por una. Riesgo vigente: UI-05 vale para la Vista ancla, no para lo sumado. Surgió una discusión de diseño más grande ("dos formas de scrollear", abajo) que toca este mismo estado.
4. **Tema abierto (no es un gap): dos formas de moverse.** "Ingresar" (a una entidad, un área o una obra: zoom in, reemplazo) frente a "ir scrolleando por la red" (movimiento lateral, aditivo/filtrado, estilo feed con nodos precargados que aparecen y se van). El dueño: "Vayamos por esto por ahora": se prioriza la vista de entrada de la entidad y la maqueta de entrada a un área. "Tenemos que pensar bien todo esto." Registrado en `04-UAT-GAPS.md`, "Temas abiertos".
5. **Pendiente para el dueño, no lo hace este plan:** registrar como ADRs en Notion (skill `gestion-notion-rama`, Documentos de Proyecto, tipo "Desarrollo técnico"):
   - **D-22**, la excepción al invariante "la Vista vive en la URL".
   - La **enmienda de D-16** (ENTIDAD entra con reemplazo), ahora confirmada.

Respuesta textual del dueño y resultado punto por punto: `04-SMOKE.md`, "UAT del dueño 2". Contestó en bloque ("esta ok"); lo que no nombró figura como "sin respuesta explícita" (puntos 1, 2, 5, 6, 7, 10, 11 y 12) y no se infirió. Explícitos: 4 (D-16, confirmada), 8 (área vacía, OK) y 9 ("Sinápsis", OK). El punto 3 salió OK con ajustes.

## Gaps nuevos (abiertos, contra requisito; los cierra 04-12)

| id | requisito | qué |
|----|-----------|-----|
| G-08 | UI-03 | La vista de entrada de una ENTIDAD (Tropical) debe mostrar solo sus áreas más el nodo raíz (incluido esta vez), con las áreas conectadas entre sí. Los vínculos entre áreas son virtuales y derivados (si un nodo de un área se vincula con uno de otra, se genera un vínculo virtual entre las áreas; no se persisten). Hoy solo Obras tiene miembros, así que los derivados salen vacíos hasta que se curen más |
| G-09 | UI-10, D-18 | "Volver" no andaba dentro del área Obras (VOLVER del lateral y/o Volver del panel). Sin diagnosticar. El re-smoke con la fixture lo recorrió bien, así que la hipótesis a verificar son los datos reales o el recorrido del dueño |
| G-10 | UI-06, UI-09 | Al entrar a un área, el menú superior debe mostrarla activa y el nombre de la entidad ("Tropical Poncho") debe quedar fijo arriba a la izquierda (hoy el título pasa a ser el área); entrar muestra el lateral con las obras del área, según la captura de diseño del dueño |

**Estado de G-01..G-07** (`04-UAT-GAPS.md`):
- G-07: cerrado por el dueño.
- G-01, G-02, G-04 y G-05: cerrados por re-smoke, sin confirmación explícita del dueño.
- G-03: cerrado por re-smoke y aceptado con ajustes (G-08, G-10).
- **G-06: abierto.** El re-smoke headless no puede reproducir la pérdida de contexto del celular y el dueño no reportó el resultado (puntos 10 y 12). PERF-01 en celular sigue sin medir.

**Hueco de datos (curaduría 02-05, no código):** 5 de las 6 áreas reales no tienen miembros. La curaduría en curso, que aplica el orquestador fuera de este plan, descarta Editorial y suma "Nosotrxs" (área conceptual base, hoy rotulada "Nosotres", con COMPONE desde Tropical). Si Nosotrxs está siempre presente en todo perfil de entidad o proyecto queda **abierto, sin decidir**.

## Auditoría ponytail (Task 1)

Skill `ponytail:ponytail-review` aplicado sobre `git diff 74639be..HEAD -- src/` (18 archivos, +552/-139).

**Aplicados** (`1a2e6b8`, sin cambio de comportamiento, gates en verde):
- `src/engine/graph/transiciones.js` (`sembrarJuntoAVecinos`) — se borra el default `radio = 40`. El único caller (`SinapsisEngine.js`) lo pasa siempre y los tests pasan 50. Ahora el parámetro es obligatorio.
- `src/app/Shell.tsx:13` — se borra el `;` suelto del import. Era el único del archivo.

**Dejados, con su porqué:**
- Estado de lo sumado (D-22): una sola escritura explícita (`sumar`) más el ajuste durante el render, sin effect. Overlay y puente reciben `escena`; no hay segunda copia de lo visible.
- Puente: no calcula la Vista (`resolverVista|fraccionHome|vistaDe` da 0 en `CanvasSinapsis.tsx`). La guardia aditivo→filtrado y el camino "solo suma" se deciden al desencolar. No queda código del desvío a la red propia.
- `subgrafoDe` es pura y sin helper de un solo uso. `sumarIds` tiene 2 callers (url.ts y Shell). `LIMITE_VISTA` y `LIMITE_SUMA` se exportan porque los usan los tests.
- `animationManager`: la rama legada `zoomOut` y `lastDimensionNode` ya no existen.
- `transicionEntrada`: se queda. Hoy devuelve `reemplazo` para todos los tipos con Entrar, pero es el punto reversible de D-16 y el que D-20 reserva para el override por entidad de M2.
- `irA(id, red:boolean)`: el flag `true` tiene un solo caller (`volverAlArea`). Se deja porque comparte con el otro camino el cierre de menús, e inlinearlo no ahorra líneas.
- `entrado` se calcula en Overlay y en `CanvasSinapsis`. Ya estaba así antes del cierre de gaps. Extraer un helper agregaría un tercer archivo para dos usos; candidato si aparece un tercer lugar.
- Todas las simplificaciones tienen su `ponytail:` con techo y salida: `LIMITE_SUMA` (url.ts:20), un conjunto por red (Shell:37), sumados sin puentes (url.ts:109), guardia de transición (CanvasSinapsis:147), siembra de entrantes (transiciones.js y SinapsisEngine), perillas `ENTRADA_FACTOR`/`ENTRADA_DURACION` (constants.js:39), 6 unidades de distancia (animationManager:121) y sondeo de `_nodoConCoordenadas` (50 ms, tope 2 s).
- Invariantes: `grep "^import .*(three|engine/)"` sobre Overlay, Shell, `lib/red` y `lib/vista` da vacío. El único acceso al motor son los dos `import()` dinámicos de `CanvasSinapsis`.

**D-22 contrastada con el código:** todas las reglas coinciden con `Shell.tsx` y `url.ts`. Matices que se agregaron al texto:
- La home cuenta como una red (`red = null`), así que dentro de la home también se acumula.
- El foco nunca sale por el tope porque `subgrafoDe` lo vuelve a poner último en cada cálculo.

**Documentos:**
- `04-CONTEXT.md`: D-23 nueva y enmiendas fechadas de D-03, D-09 y D-16 (más una nota en D-20). Greps: `D-23` 2, `D-22` 4, `enmendad` 4.
- `04-UI-SPEC.md`: enmendadas §2, §3, §4, §5 (fila `sumar`), Transiciones, Mobile, Copywriting y Puntos abiertos. `enmendad` 10, `Sumar sus obras` 4.

## Re-smoke headless (Task 2)

Gates: `npm test` 136/136, `tsc` 0, `lint` 0 errores, `next build` OK en copia aislada con `node_modules` enlazado. `git diff -- package.json` vacío.

`04-SMOKE.md` tiene "Re-smoke tras el cierre de gaps" con 21 filas, todas OK, ninguna GAP. Evidencia clave:
- G-02 y G-01 en 1280x800 y 390x800: 0 cuadros con panel visible y nombre nuevo antes de ocultarse; el offset baja monótono a 0 y la cámara se mueve antes del primer 0.
- G-03: llegada a 684,9 (= 2,5 × 274) decreciente a 274; Atrás desde 5,9 creciente a 102,9.
- D-22: persistencia, "Sumar sus obras" con el panel siempre visible, URL idéntica y 0 pushes, VOLVER conserva lo sumado, Entrar + Atrás deja OBRAS + Ana sin Libro, recarga deja 5 nodos y el link abre el ancla.
- G-05, estado vacío, G-07, ráfaga y no regresión de G-06 (un solo canvas, consola sin errores, archivos de G-06 sin cambios).
- PERF-01 por test (`url.test.ts`, "subgrafoDe: tope"). Los fps en celular no se miden headless.

Método: el 3002 es el servidor del dueño con la base real y no se tocó. Se levantó `TOPOLOGIA_FIXTURE=1 next dev -p 3003` desde la copia aislada y se midió con Playwright (Chromium de gstack, el servidor de `/browse` no sostiene la página WebGL), con muestreo por rAF a ~5 fps. El servidor del 3003 se cerró al terminar.

## Deviations from Plan

**1. [Método] Playwright en lugar de `/browse` y servidor de fixture en la copia aislada.** Mismo criterio que 04-08 y 04-09. Sin cambio de alcance.

**2. [Método] `?perf=1` agregado con `history.replaceState` antes de recargar.** Las navegaciones internas no arrastran el parámetro y sin él no existe `window.__sinapsis`.

**3. [Alcance] G-06 queda abierto.** El plan pedía un estado por gap; sin la respuesta del dueño sobre el celular no hay evidencia para cerrarlo.

**Total deviations:** 3 (todas de método o alcance). **Impact:** sin cambio de alcance.

## Known Stubs

Ninguno.

## Issues / Deferred

- G-08, G-09 y G-10 abiertos: plan de cierre 04-12.
- G-06 abierto hasta tener el resultado del celular.
- Las reglas de D-22 (punto 6) siguen sin validar explícitamente con el uso.
- ADRs de D-22 y de la enmienda de D-16 en Notion: pendientes del dueño.
- `commits: 5` es el conteo medido contra `plan_head_before`; incluye `0cc4241` (curaduría: Editorial descartada y Nosotrxs), que aplicó el orquestador fuera de este plan. Los commits del plan son 4: `1a2e6b8`, `dc3370f`, `e97fe54` y `59466cf`.

## Threat Flags

Ninguno. Este plan no instala paquetes. T-04-07 (`next dev -H 0.0.0.0`, aceptado) se ejerció: el servidor del dueño escucha en `0.0.0.0:3002` y lo cierra el dueño al terminar.

## Self-Check: PASSED

Commits `1a2e6b8`, `dc3370f`, `e97fe54` y `59466cf` presentes. Archivos modificados presentes. Acceptance criteria de las Tasks 1 y 2 re-corridos arriba. Los de la Task 3 se cumplen salvo el punto 10, que tiene su razón escrita (el dueño no reportó fluidez en el celular).
