---
phase: 04-ui-navigation
plan: 09
subsystem: ui
tags: [motor, camara, menu, vista, entrada, gap-closure]
status: complete
requires: [04-08]
provides: [menu-que-enfoca, llegada-zoom-in, salida-de-la-neurona, vista-de-area-sin-duena, entidad-entra-con-reemplazo]
affects: [04-10, 04-11]
key-files:
  created: []
  modified:
    - src/app/Overlay.tsx
    - src/engine/SinapsisEngine.js
    - src/engine/graph/animationManager.js
    - src/engine/graph/constants.js
    - src/lib/red/url.ts
    - src/lib/red/url.test.ts
    - src/lib/red/menus.ts
    - src/lib/red/navegacion.ts
    - src/lib/red/navegacion.test.ts
    - src/lib/red/fixtures/topologia.json
key-decisions:
  - "El ítem del menú superior enfoca el área (como cualquier nodo); el botón Entrar del panel la carga (cambia D-09 / UI-SPEC §2)"
  - "ENTIDAD entra con reemplazo, igual que AGRUPACION (cambia D-16): el filtrado solo puede alejar la cámara del enfocado"
  - "La Vista de una AGRUPACION recorre solo vínculos salientes: el COMPONE que entra al área viene de su dueña y la traía flotando sin vínculos"
requirements-completed: [UI-03, UI-10]
actuals:
  tokens: 4200
  tasks: 3
  commits: 5
plan_head_before: a11fd504d2a53e897ee2a9a699d91f1b968a6f44
plan_head_after: 6e66e63568485fba5f15e12c6a10e2f1b9fb9234
duration: 70min
completed: 2026-10-08
---

# Phase 4 Plan 09: El área se previsualiza, Entrar es zoom in a la neurona y Volver sale de ella Summary

El menú superior enfoca el área (panel con "Entrar a {área}"); entrar a un área o entidad es reemplazo con vuelo a la neurona, negro y llegada con zoom in desde `ENTRADA_FACTOR` veces el encuadre; Volver arranca dentro de la neurona y la cámara sale hasta el encuadre de foco; la Vista de un área ya no trae a su dueña.

## Decisiones técnicas (arriba de todo)

1. **Cambio de D-09 / plan 04-06 / UI-SPEC §2 (menú).** El ítem del menú superior cargaba la sub-red del área (reemplazo). Ahora **enfoca** (`irA(id, false)`: misma URL que un click en la red, `/entidad/<área>?red=<entidad>`, aditivo) y Entrar, en el panel, la carga. Es el patrón de dos pasos de D-01 aplicado al menú (decisión 2 del UAT). Riesgo mientras 04-11 no actualice CONTEXT y UI-SPEC: ambos documentos contradicen el comportamiento. Efecto colateral conocido: al enfocar un área el menú superior desaparece (`entrado` exige `red === enfocado`); es el comportamiento que ya tenía enfocar cualquier nodo dentro de una entidad, no se tocó.
2. **Cambio de D-16.** "ENTIDAD = filtrado, ÁREA = reemplazo" pasa a "ENTIDAD y AGRUPACION = reemplazo" (`transicionEntrada`). Motivo: la decisión 2 del UAT pide zoom in a la neurona y luego zoom in a la red interna; con filtrado los nodos se quedan en su lugar y la cámara solo puede alejarse del enfocado (`backToBasicsView`), o sea zoom out por construcción. **Alternativa descartada:** mantener filtrado y encuadrar la red filtrada con `zoomToFit` animado (sigue siendo alejarse). **Costo:** al entrar a una entidad se pierde la continuidad de posiciones (la red interna se reasienta). **Reversible** en una línea (`navegacion.ts`) más su test; D-20 (el default vive solo en código) no cambia. El UAT de 04-11 le pide confirmación explícita al dueño.
3. **Vista de AGRUPACION: `direccion: 'sale'`.** Causa leída del código y confirmada con el test en rojo: el BFS caminaba COMPONE en ambos sentidos, así que el COMPONE `tp -> area` sumaba a Tropical a profundidad 1; `incluirRaiz: false` saca al área de `nodos`, Tropical quedaba con su único vínculo apuntando a un nodo ausente y el adaptador (`adaptador.js:41-52`) lo descartaba: flotaba sin conexión. Con `sale` (contenedor -> miembros) solo entran los miembros; el orden PRECEDE entre ellos se sigue dibujando porque `resolverVista` une pares ya visibles.
4. **Riesgo abierto: áreas sin miembros.** Con la dueña fuera, un área sin miembros queda con 0 nodos. En la base real hoy lo están 5 de 6 (solo Obras tiene 16 miembros; Audiovisuales, Editorial, Laboratorios, Tecnología y Nosotres: 0). Eso destapó un cuelgue del motor (ver Deviations 1). El panel de un área vacía muestra el nombre del área con solo "Volver" (la rama `nodo` del panel va antes que `subredVacia`), no el texto "Todavía no hay nada acá": pendiente para 04-10/04-11, no bloquea.

## Tasks

1. **Task 1 (tracer)** `e46c030`: Overlay (`MenuSuperior onElegir` enfoca), constants (`ENTRADA_FACTOR: 2.5`, `ENTRADA_DURACION: 1200`, comentario `ponytail:`), animationManager (`fadeInCanvasFromBlack`: sin foco destino = `zoomToFit(0,10)` instantáneo bajo el negro, cámara a `ENTRADA_FACTOR` veces sobre la recta origen-encuadre y tween a `ENTRADA_DURACION` mientras se retira el negro; resuelve cuando termina lo más largo de los dos; se borra la rama `zoomOut` legada y el campo `lastDimensionNode`), SinapsisEngine (reemplazo suelta `_nodoEnfocado`, `_ultimoFoco` y `_mezclaArea = 0` bajo el negro si no hay foco nuevo).
2. **Task 2 (TDD)** RED `ef8e294` (3 tests nuevos en `url.test.ts`, fallan), GREEN `3fcb21b` (`vistaDe` AGRUPACION `'sale'`, `nodosDeLaRed` sin el tercer parámetro, Overlay `nodosDeLaRed(sub, redId)`, fixture con PRECEDE).
3. **Task 3 (TDD)** RED `dcffa76` (ENTIDAD con reemplazo + `inversa.reemplazo`), GREEN `6e66e63` (`transicionEntrada`, y la llegada con foco: el motor extrae `enfocar` y se lo pasa a `fadeInCanvasFromBlack`, que pone la cámara a 6 unidades de la neurona sobre el eje origen-nodo, bajo el negro, y lanza `enfocarNodo` en paralelo con el fundido; `setVista` espera a los dos).

## Evidencia (Playwright headless con GPU sobre el dev server 3002, datos reales de la base, no la fixture; muestreo por rAF)

**Causa del zoom out (confirmada en el código).** Al entrar desde el menú no había nodo enfocado (estar "entrado" no tiene foco), así que la salida de reemplazo caía en la rama sin nodo de `fadeOutCanvasToBlack`, que se aleja a `longDistance * 2`. Con el menú enfocando, Entrar sale con foco y la salida vuela hacia la neurona (rama existente).

**Menú enfoca.** `/entidad/tropical-poncho` -> click en AUDIOVISUALES: URL `/entidad/audiovisuales?red=tropical-poncho`, panel visible, `aria-busy=false`, botones `["Entrar a Audiovisuales","Volver"]`. Igual con OBRAS.

**ENTRAR, distancia cámara-origen (t ms : dist / opacidad del negro), primera medición (Audiovisuales, tras el Task 1):**

```
vuelo a la neurona: 356 357 374 385 (negro 0 -> 1)
llegada:  8114:143/n1  8226:127/n.63  8326:115/n.35  8443:102/n.03  8560:91  8677:82  8793:74  8894:69  9010:64  9127:61  9243:60 (estable)
```

Decreciente: zoom in desde `2.5 x 60 = 150` hasta el encuadre (60). Con OBRAS (encuadre 451) el vuelo a la neurona va 230 -> 183 y, tras ~1.1 s de bloqueo del hilo principal al cargar la red (el muestreo se corta), el primer cuadro ya muestra 453-451: el tween corrió bajo el negro durante ese bloqueo. Hallazgo: si la carga de la red nueva bloquea el hilo justo al empezar el tween, el zoom in no se ve. En esta máquina de medición pasa con la red grande; el dueño lo confirma en su GPU en el UAT de 04-11. Si se ve cortado, la perilla es `ENTRADA_DURACION` o arrancar el tween después de un primer render de la red nueva. La primera carga de la app pasa por la misma función y también llega con zoom in (para el UAT).

**VOLVER (OBRAS), distancia cámara-neurona (t ms : dist / negro).** `history.back()` desde `/entidad/obras`:

```
13759:null/n.4  14222:null/n1 (sin foco aún, cámara en la salida)
15051:14/n.86  15213:24/n.17  15373:33/n0  15528:41  15704:50  15869:58  16027:65  16184:71  16349:77  16516:82  16685:87  16839:91  16992:94  17170:97  17340:100  17514:102  17674:103 (estable)
```

Crece monótona (14 -> 103): sale de la neurona. Termina en `/entidad/obras?red=tropical-poncho`, panel de Obras visible, `aria-busy=false`. Mismo resultado con Audiovisuales (área vacía): 10 -> 103. La distancia de foco final, 103, es la de `enfocarNodo`.

**Sin nodos sueltos, contra la base real** (script de una sola vez fuera del repo, mismo chequeo que el test): 172 redes de ENTIDAD/AGRUPACION, 165 con 2+ nodos, 0 sueltos. Sin ids ni caminos que reportar.

## Verification

- `npm test`: 123 pass (120 + 3 de `url.test.ts`; `navegacion.test.ts` amplía casos del test existente). `npx tsc --noEmit` OK. `npm run lint` sin errores (solo warnings previos). `next build` OK en copia aislada con `node_modules` enlazado, para no pisar el `.next` del dev server de 3002 (mismo código, mismo comando).
- Task 1: `grep -c "ENTRADA_FACTOR\|ENTRADA_DURACION"`: constants 4, animationManager 3. Sin imports de react/next en el motor. **El criterio `grep -c "onElegir={(id) => irA(id, false)}" Overlay.tsx` da 2, no 1:** la línea del `MenuLateral` ya tenía esa misma expresión; el del menú superior es uno de los dos.
- Task 2: `node --test --experimental-strip-types src/lib/red/url.test.ts` 12 pass (3 nuevos); `'sale'` 1 en url.ts; `excluir` 0 en menus.ts; `nodosDeLaRed(sub, redId)` 1 en Overlay.tsx.
- Task 3: `navegacion.test.ts` pasa con los casos del `<behavior>`; `ENTIDAD` 3 en navegacion.ts; `lastDimensionNode` 0.
- G-06 (`imageThreeObject.js`, `background.js`) no se tocó.

## Deviations from Plan

**1. [Rule 1 - Bug] Una red vacía dejaba el motor 30 s en negro**
- **Found during:** Task 3, medición de ENTRAR sobre Audiovisuales de la base real.
- **Issue:** `fadeInCanvasFromBlack` exigía `nodos.length > 0` para dar la red por lista y reintentaba hasta el tope de 30 s con el negro puesto. Antes del Task 2 un área nunca estaba vacía (traía a Tropical); con la dueña fuera, las áreas sin miembros sí. Consecuencia directa de este plan.
- **Fix:** si el grafo está vacío, la cámara vuelve a la vista básica (venía pegada a la neurona de salida) y solo se retira el negro. El tope de 30 s queda para el caso real de espera (T-04-03).
- **Files modified:** src/engine/graph/animationManager.js
- **Commit:** `6e66e63`

**2. [Rule 2 - datos de prueba] PRECEDE agregado a la fixture**
- **Issue:** la fixture no tenía ningún PRECEDE; con la dueña y el área fuera de `nodos`, las 5 obras de Obras y las 2 de Audiovisuales quedaban sin vínculo dibujable y el test de "sin nodos sueltos" (y el `done` del plan: "obras unidas por COMPONE/PRECEDE") no podía cumplirse. La base real sí los tiene (el área Obras: 17 PRECEDE).
- **Fix:** 5 vínculos `v32..v35` (nudo -> espora -> cepa -> wip -> distopia) y `v36` (corto -> sin-desc). `fixtures.test.ts` sigue verde. La fixture "igual en la curaduría" diverge de esa copia en estos 5.
- **Commit:** `3fcb21b`

**3. [Plan permitía excepciones explícitas] Redes de la fixture con sueltos por hub sin productora**
- **Issue:** 9 redes de creadxr de la fixture (`creadxr-banda-eco`, `-dani`, `-duo-neon`, `-eli`, `-hugo`, `-ines`, `-stub`, `soma-beta-1`, `soma-beta-2`) tienen nodos sin vínculo dibujable, incluida su propia raíz: sus colaboradores se conocen solo a través de un hub (p. ej. `obra-espora`, 4 vecinos, sin PRODUJO) y `puentesDe` no arma ese clique a propósito (D-puentes). La base real no tiene ninguno.
- **Fix:** el test fija la lista exacta por id con su causa; cualquier otra red con sueltos, o una de estas que deje de tenerlos, hace fallar el test. No se relajó la regla ni se tocó D-puentes.
- **Commit:** `3fcb21b`

**4. [Descripción del plan] La llegada con foco se escribió en el Task 1 dentro de `fadeInCanvasFromBlack`, el cableado del motor en el Task 3.** `fadeInCanvasFromBlack` trae ya los dos modos (el mismo método y el mismo borrado de la rama legada); el cableado `enfocar` en `setVista` entró en `6e66e63`. Sin impacto.

**Total deviations:** 4 (1 Rule 1, 1 Rule 2, 2 de método/alcance). **Impact:** sin cambio de alcance; la Deviation 1 evitó un cuelgue de 30 s en 5 de 6 áreas reales.

## Cambios de decisión para 04-11 (CONTEXT y UI-SPEC)

| Doc | Antes | Ahora |
|-----|-------|-------|
| D-09 / UI-SPEC §2 | ítem del menú superior = cargar la sub-red del área | ítem del menú = enfocar el área; Entrar la carga |
| D-16 | ENTIDAD = filtrado, ÁREA = reemplazo | ENTIDAD y ÁREA = reemplazo (OBRA/EVENTO sin Entrar, filtrado) |
| vistaDe AGRUPACION | COMPONE/PRECEDE en ambas direcciones | COMPONE/PRECEDE salientes; la dueña no entra |

## Known Stubs

Ninguno.

## Deferred / observaciones

- Panel de un área sin miembros: muestra el nombre del área con "Volver" en lugar de "Todavía no hay nada acá" (la rama `nodo` precede a `subredVacia` en Overlay). Para 04-10/04-11.
- Con el menú enfocando, al enfocar un área el menú superior desaparece hasta volver a "entrar" (comportamiento previo de `entrado`); si el dueño lo quiere visible mientras previsualiza, es una decisión de UI-SPEC.
- La salida (vuelo a la neurona) sigue en `FADE_DURATION` (300 ms), sin cambiarla ahora; si el UAT la pide más lenta es esa constante o una propia.
- El zoom in de la llegada puede perderse si la carga de la red bloquea el hilo al empezar el tween (ver Evidencia); a confirmar en GPU real.

## Threat Flags

Ninguno (sin superficie nueva). T-04-03 mitigado: la llegada reusa `listos()` con su tope de 30 s y suma un tween de duración fija; una red vacía ya no espera.

## Self-Check: PASSED

Commits `e46c030`, `ef8e294`, `3fcb21b`, `dcffa76`, `6e66e63` presentes (`commits: 5` medido desde `plan_head_before`); archivos modificados presentes; acceptance_criteria de las 3 tareas re-corridos arriba.
