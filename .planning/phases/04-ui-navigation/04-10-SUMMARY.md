---
phase: 04-ui-navigation
plan: 10
subsystem: ui
tags: [shell, puente, vista, red-acumulada, creditos, gap-closure]
status: complete
requires: [04-08, 04-09]
provides: [red-acumulada-en-memoria, credito-suma-sin-reemplazar, sumar-sus-obras, estado-vacio-de-area, excepcion-D-22]
affects: [04-11]
key-files:
  created: []
  modified:
    - CLAUDE.md
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
    - .planning/phases/04-ui-navigation/04-CONTEXT.md
    - src/lib/red/url.ts
    - src/lib/red/url.test.ts
    - src/app/Shell.tsx
    - src/app/CanvasSinapsis.tsx
    - src/app/Overlay.tsx
    - src/lib/red/botones.ts
    - src/lib/red/botones.test.ts
    - src/lib/red/menus.ts
    - src/lib/red/menus.test.ts
key-decisions:
  - "D-22: lo sumado al recorrer vive en memoria del Shell atado a la red; la URL lleva solo el ancla; P1 = 40 + 12, FIFO por recencia, el foco nunca sale"
  - "Enfocar dentro de una red nunca la cambia (criterio G-05): si el nodo no esta, se suma como un credito; su red propia solo con Entrar"
  - "El puente deja de calcular la Vista: la calcula el Shell una sola vez (subgrafoDe) y el puente solo corrige el pedido imposible (aditivo que quitaria nodos -> filtrado)"
requirements-completed: [UI-02, UI-03, UI-04, UI-05, PERF-01]
actuals:
  tokens: 8000
  tasks: 3
  commits: 6
plan_head_before: de3d6af4b281f10f34bde7ad775ec829270c2a1f
plan_head_after: 4097de5e38301802d42a2fbfc865d9507f398f6c
duration: 60min
completed: 2026-10-08
---

# Phase 4 Plan 10: Tocar un credito suma a la red en vez de reemplazarla, con lo sumado en memoria Summary

Un credito de la ficha agrega al colaborador con sus vinculos reales a la red visible (sin desviar a su red propia ni quedar en negro), Atras y VOLVER lo conservan, "Sumar sus obras" agrega las obras de una entidad sin tocar la URL ni el panel, y un area sin miembros muestra "Todavia no hay nada aca". Lo sumado vive en memoria del Shell (D-22); la URL sigue siendo solo el ancla.

## Decisiones tecnicas (arriba de todo)

1. **D-22: la red acumulada vive en memoria; la URL lleva el ancla (decision del dueno, 2026-10-07).**
   - **Que:** los nodos que se suman al recorrer (credito, "Sumar sus obras") viven en el estado `sumados` del Shell, atados a la red actual (`{ red, ids }`). La URL queda igual: `estadoDesdeUrl` sigue leyendo 5 parametros (`q.get(` x5) y `urlDe` escribiendo 5 (`q.set(` x5), `navegar` sigue siendo la unica escritura de historial. Tope P1: base `LIMITE_VISTA = 40` mas hasta `LIMITE_SUMA = 12`, descarte FIFO por recencia (`sumarIds`), el foco va siempre ultimo y nunca sale por el tope. Techo de escena: 52 nodos = 52 draw calls.
   - **Por que:** el dueno quiere mas adelante recorrer la red como un scroll tipo Instagram por obras (algunas precargadas; aparecen y se van otras). Lo acumulado es estado de sesion efimero y cambiante, no una Vista; la URL sirve para ir a un lugar puntual y no debe complicarse "salvo muy buena razon".
   - **Alternativas descartadas:** (a2) `?suma=slug.slug` + reescribir la entrada de origen (fijaba un formato de una sola via en links e historiales y reescribia pasos ya dados); (a1) `?suma=` solo empujando entradas (Atras sacaba al colaborador); (b) `history.state` (no se comparte, no permite tocar entradas anteriores, Next comparte ese objeto).
   - **Reglas implementadas:** persiste con Atras/Adelante dentro de la misma red y con VOLVER del lateral; se borra al cambiar de red (Entrar, Atras/Adelante a otra red, home) y al recargar; Atras a una red anterior no la restaura (solo vuelve el foco, que esta en la URL); el link abre el ancla (si el foco no es parte de la red, se suma); "Sumar sus obras" no es paso de historial.
   - **Riesgo mientras no se revise:** UI-05 vale para la Vista ancla, no para lo sumado: lo visible puede tener hasta 12 nodos mas que lo que reproduce el link, y Atras no deshace "Sumar sus obras". Si el feed futuro necesitara historial de lo sumado, se reabre el invariante y se discute antes del codigo. Reversible: no queda en links ni historiales. La excepcion quedo escrita en CLAUDE.md, PROJECT.md, REQUIREMENTS.md (UI-05) y 04-CONTEXT.md (D-22; D-00c marcada como enmendada) antes de tocar codigo (commit `cf8c7f2`). ADR en Notion: pendiente, lo lista 04-11.
2. **Hueco de datos, no de codigo (areas reales sin miembros).** En la base real 5 de las 6 areas de Tropical no tienen miembros cargados (solo "Obras", 16). Medido otra vez en este plan: `/entidad/audiovisuales` y `/entidad/editorial` cargan 0 nodos. Entrar ahi da una escena vacia: es curaduria pendiente (02-05, en pausa). Lo que arregla este plan es que ese caso muestre el estado vacio del UI-SPEC en vez del nombre del area con Volver. Lo verifica el UAT de 04-11.
3. **Criterio G-05 (D-23 la escribe 04-11).** Dentro de la red de X, enfocar Y nunca cambia la red: si Y esta visible solo cambia el foco; si no esta, se suma con sus vinculos reales a lo presente. La causa de los "nodos sin relacion" era el desvio del puente a la red propia del enfocado (`CanvasSinapsis.tsx:131-134`, 17 -> 56 nodos en 04-08): se borro.
4. **Limite conocido de lo sumado (`ponytail:` en `subgrafoDe`).** Un sumado sin vinculo real a lo visible queda suelto; no hay puentes virtuales para sumados ni se recalculan los de la base cuando se suma el nodo que puenteaban. Salida: llamar `puentesDe` con los vecinos no visibles de los sumados si el UAT los ve sueltos.

## Tasks

1. **Task 1 (docs)** `cf8c7f2`: D-22 en CLAUDE.md (el invariante se amplia en la misma vineta, la frase original queda), PROJECT.md (enmienda en Key Decisions), REQUIREMENTS.md (UI-05) y 04-CONTEXT.md (D-00c enmendada + subseccion "Decisiones tras el UAT (2026-10-07)" con D-22). Ningun archivo de `src/`.
2. **Task 2 (tracer, TDD)** RED `7dc79c4` (10 tests nuevos en `url.test.ts`), GREEN `8ca3d95` (`LIMITE_SUMA`, `sumarIds`, `subgrafoDe` puras) y `f1998f5` (Shell, puente, Overlay): Shell guarda `sumados`, calcula `escena` con un solo `useMemo(subgrafoDe)` y ajusta el estado durante el render (sin effect) para persistir el foco sumado; `limiteDe` se mudo del puente al Shell. El puente recibe `escena`, deduplica por `claveEstado` + ids sumados, y al desencolar (a) convierte `aditivo` en `filtrado` si algo de la escena ya no viene en el Subgrafo y (b) si la `claveEstado` es la del ultimo enviado (solo cambio lo sumado) manda `aditivo` con `nodoEnfocado` undefined, sin pasar a `moviendo`, sin ocultar el panel y sin `onMostrar`. Overlay usa `escena.sub` y borra su memo propio.
3. **Task 3 (TDD)** RED `ce63e76`, GREEN `4097de5`: `obrasDe` (obras/eventos vecinos en ambos sentidos, `porFecha`), accion `sumar` ("Sumar sus obras", solo ENTIDAD, solo con obras fuera de escena y no cuando se esta "entrado"), `ejecutar` caso `sumar` = `sumar(porSumar)` (no navega), y estado vacio: `vacia` = entrado + `coincide` + ningun nodo distinto de la red misma; reemplaza el umbral `<= 1` y su rama va antes de la rama `nodo`.

## Evidencia (Playwright headless con GPU sobre el dev server 3002, datos reales de la base, no la fixture)

El dev server de 3002 es el del dueno y usa la base real; no se levanto otro. El recorrido de la fixture (Ana Ruiz / `obra-libro`, `/entidad/editorial` con un solo miembro) no se pudo correr de punta a punta; se corrio el analogo con la base real y la logica de la fixture queda cubierta por los tests de `url.test.ts`.

**G-04 (04-08 midio 17 -> 56 nodos con este credito).** `/obra/tempistica-i?red=obras` (16 nodos de OBRAS) -> "Ver mas" -> credito "Agus Mansilla":

```
inicio  cam [72,-78,172]  nodos 16  /obra/tempistica-i?red=obras&perf=1  panel visible
+1.5s   cam [42,-58,151]  nodos 17  /entidad/agus-mansilla?red=obras     (panel saliendo, busy)
+4.5s   cam [-50,0,90]    nodos 17  panel visible, aria-busy=false
atras   +4.5s cam [72,-78,172]  nodos 17  /obra/tempistica-i?red=obras&perf=1
pushes  ["/entidad/agus-mansilla?red=obras"]
```

16 -> 17 (+1, no +39), camara siempre finita, un solo `canvas`, Atras conserva al colaborador (17), el unico push solo trae `red`.

**Sumar sus obras, VOLVER, Entrar y Atras** (`/obra/soma-beta?red=obras` -> credito "PROYECTOCOSO", que tiene 3 obras fuera de OBRAS; muestreo por rAF de `panel--visible`):

```
credito  nodos 17  /entidad/proyectocoso?red=obras  botones [Entrar a PROYECTOCOSO, Sumar sus obras, Volver]
sumar    nodos 20  misma URL  248 muestras rAF: panel nunca oculto = true  URL igual = true  nuevos = 3  botones [Entrar..., Volver]
volver   nodos 20  /entidad/obras  conserva los sumados = true
entrar   nodos 27  /entidad/proyectocoso (red propia)  ids de OBRAS en escena = 0
atras    nodos 17  /entidad/proyectocoso?red=obras  = OBRAS (16) + PROYECTOCOSO  sumadas de antes restauradas = false
pushes   ["/entidad/proyectocoso?red=obras","/entidad/obras","/entidad/proyectocoso?red=obras","/entidad/proyectocoso"]
```

Ningun push trae parametros fuera de `red` (el `?perf=1` de la carga inicial no se arrastra). "Sumar sus obras" no empuja entrada y desaparece del panel cuando ya no queda nada por sumar.

**Area vacia (base real).** `/entidad/audiovisuales` y `/entidad/editorial`: 0 nodos, panel visible con "Todavia no hay nada aca". El caso de una area con un solo miembro (`vacia` es falso porque hay un nodo distinto de la red) se cubre por construccion (`every(n.id === redId)`); no se pudo ver headless porque en la base real solo Obras tiene miembros.

## Verification

- `npm test`: 136 pass (123 + 13: 10 de `url.test.ts`, 2 de `botones.test.ts`, 1 de `menus.test.ts`). `npx tsc --noEmit` OK. `npm run lint`: 0 errores, solo warnings previos (se saco el `useMemo` que quedaba sin usar en Overlay). `next build` OK en copia aislada con `node_modules` enlazado (no pisa el `.next` del dev server).
- Task 1: `grep -c "D-22"`: CLAUDE.md 1, PROJECT.md 1, REQUIREMENTS.md 1, 04-CONTEXT.md 2; "La Vista vive en la URL" en CLAUDE.md 1; "enmendada por D-22" 1; "Decisiones tras el UAT" 1; `git diff --stat -- src/` vacio al cerrar el task.
- Task 2: `subgrafoDe`/`sumarIds` exportadas 1 y 1, `LIMITE_SUMA` 4 en url.ts; `q.get(` 5 / `q.set(` 5; `resolverVista|fraccionHome|vistaDe` en CanvasSinapsis 0; `subgrafoDe(` en Shell 1; `history.pushState|replaceState` en Shell 1; `filtrado` en CanvasSinapsis 3; `window|document` en url.ts 0 (sigue pura); `ponytail:` en url.ts 2 y en Shell 2.
- Task 3: `Sumar sus obras` en botones.ts 1; `export function obrasDe` 1; `'sumar'` en Overlay 2 y `sumar(` 1; `nodos.length <= 1` 0; `history.pushState|replaceState` en Overlay 0.
- G-06 (`imageThreeObject.js`, `background.js`) no se toco.

## Deviations from Plan

**1. [Rule 1 - plan inconsistente] La red de Tropical en la fixture tiene 11 nodos, no 12**
- **Found during:** Task 2, tests GREEN.
- **Issue:** el `<behavior>` decia "exactamente los 12 de la red de Tropical" y "13 nodos"; `tp` + 6 areas + Ana + Beto + Cami + centro-cultural son 11 (el propio `<interfaces>` los lista asi). 
- **Fix:** los tests comparan contra `redDe('tp').nodos` (11) y esperan `+1` con Fede (12), sin literales.
- **Commit:** `8ca3d95`

**2. [Rule 2 - correccion menor] "Sumar sus obras" tambien se oculta cuando se esta "entrado"**
- **Issue:** adentro de la red de una entidad el panel esta retirado pero su contenido seguia montado con "Sumar sus obras" (la red de una entidad no trae sus obras, asi que `porSumar` no era vacio). Era un boton oculto pero alcanzable.
- **Fix:** el filtro que ya quitaba `entrar` en ese caso ahora quita tambien `sumar`.
- **Commit:** `4097de5`

**3. [Alcance] `vacia` espera a `coincide`**
- Una variante del plan usaba la condicion de la URL directamente; con eso el texto vacio reemplazaba el contenido del panel mientras todavia salia con el contenido viejo (la misma trampa que tenia `subredVacia`). Se agrego `coincide` a la condicion.

**Total deviations:** 3 (1 Rule 1, 1 Rule 2, 1 de alcance). **Impact:** sin cambio de alcance.

## Known Stubs

Ninguno.

## Deferred / observaciones

- `/entidad/editorial` con un solo miembro y el recorrido de la fixture (Ana -> `obra-libro`) quedan para el UAT de 04-11 (o para un dev server con `TOPOLOGIA_FIXTURE=1` que no sea el del dueno).
- Al entrar en una entidad (reemplazo) la red de la entidad no incluye sus obras (el filtro de tipo las deja como nodos puente): "Sumar sus obras" estando "entrado" no se ofrece; el recorrido natural es enfocar la entidad desde una obra y sumar desde ahi.
- Pendiente de 04-11: D-23, enmiendas de D-03/D-09/D-16, UI-SPEC, re-smoke, UAT y el ADR de D-22 en Notion.

## Threat Flags

Ninguno (sin superficie nueva: la URL no gana parametros). T-04-04 mitigado: `sumarIds` recorta a 12 en cada escritura, `subgrafoDe` descarta ids que no estan en la topologia; test del tope. T-04-05 mitigado: la escritura de `sumados` en el render esta guardada por comparacion de contenido y `subgrafoDe` tiene punto fijo (test).

## Self-Check: PASSED

Commits `cf8c7f2`, `7dc79c4`, `8ca3d95`, `f1998f5`, `ce63e76`, `4097de5` presentes (`commits: 6` medido desde `plan_head_before`); archivos modificados presentes; acceptance_criteria de las 3 tareas re-corridos arriba.
