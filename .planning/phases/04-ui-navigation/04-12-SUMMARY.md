---
phase: 04-ui-navigation
plan: 12
subsystem: ui
tags: [gap-closure, vista, resolverVista, overlay, volver, historial, css]
status: complete
requires: [04-08, 04-09, 04-10, 04-11]
provides: [D-24, D-25, vinculosEntreAgrupaciones, vistaDe-con-areas, aLaDuena, guardia-navegar]
affects: [04-13]
key-files:
  created: []
  modified:
    - src/lib/red/menus.ts
    - src/lib/red/menus.test.ts
    - src/app/Overlay.tsx
    - src/app/Shell.tsx
    - src/app/Menus.tsx
    - src/types/vista.ts
    - src/lib/vista/resolverVista.ts
    - src/lib/vista/resolverVista.test.ts
    - src/lib/red/url.ts
    - src/lib/red/url.test.ts
    - src/lib/red/fixtures/topologia.json
    - src/styles/overlay.css
key-decisions:
  - "D-24: una entidad con áreas entra como la raíz y sus áreas, unidas por vínculos virtuales derivados de sus miembros (campo opcional Vista.vinculosEntreAgrupaciones)"
  - "D-25: adentro de un área el contexto es la entidad dueña; VOLVER sube un nivel; navegar ignora la URL actual"
  - "G-09 confirmado: H1 (VOLVER del panorama empujaba la URL actual) y H2 (VOLVER bajo el pliegue); H3 por diseño; H4 descartada"
requirements-completed: [UI-03, UI-06, UI-09, UI-10]
actuals:
  tokens: 5600
  tasks: 3
  commits: 3
plan_head_before: 112bd7c4486b9ee32a9c0b2987dbf322f89016f1
plan_head_after: 2c7081038fd3e379f59e8326f4ef438170faef29
duration: 1 sesión
completed: 2026-10-08
---

# Phase 4 Plan 12: G-08, G-09 y G-10 Summary

La entrada a una entidad con áreas ahora es la raíz y sus áreas unidas por vínculos virtuales derivados (D-24); VOLVER del lateral siempre sube un nivel y `navegar` ya no apila la URL actual (G-09); y adentro de un área, en escritorio, queda la entidad arriba a la izquierda con el menú marcando el área activa y el lateral grande y liviano, como en la captura del dueño (G-10, D-25). **La Fase 4 sigue abierta:** falta el UAT del dueño (04-13) y G-06 (celular).

## Decisiones técnicas (arriba de todo)

Ninguna es una puerta de una sola vía: son una rama en `vistaDe`, un campo opcional de la Vista y funciones de Overlay. No hay migraciones, datos nuevos ni gramática de URL nueva (sigue habiendo 5 `q.get(` y 5 `q.set(`). El dueño las confirma o ajusta en el UAT de 04-13.

### D-24: vista de entrada de una ENTIDAD con áreas (G-08)

- **Qué.** Si la entidad COMPONE al menos una AGRUPACION y la URL no trae `prof`, su Vista de entrada es la raíz + esas agrupaciones: `profundidad: 1`, `direccion: 'sale'`, `filtroNodeTypes: ['AGRUPACION']`, `filtroVinculos: ['COMPONE','PRECEDE']`, `incluirRaiz: e.raiz ?? true`, `limite: LIMITE_VISTA` (40, sin cambios). Se le suma `vinculosEntreAgrupaciones`, un campo opcional nuevo de la Vista que `resolverVista` convierte en vínculos virtuales entre áreas (`src/lib/vista/resolverVista.ts`, función privada al lado de `puentesDe`; `src/lib/red/url.ts`, `vistaDe`).
- **Regla de derivación.** Miembro de A = destino de un COMPONE que sale de A (un nivel, cualquier `nodeType`). Une A y B un vínculo real, de cualquier tipo y sentido, entre un miembro de A y uno de B, o un miembro que está en las dos. Solo entre agrupaciones visibles, un virtual por par (`entre:{x}|{y}`, `x < y`), `virtual: true`, `tipoVinculo: 'COLABORO_EN'` (se dibuja punteado como los puentes), rol "Comparten {m}" o "Vinculadas por {m1} y {m2}" (60 caracteres). Un par ya unido por un vínculo real dibujado no recibe el virtual: si se cura un COMPONE o PRECEDE entre áreas, ese reemplaza al derivado. Nunca se persiste; `?puentes=0` lo apaga junto con los puentes.
- **Fallback.** Entidad sin áreas, o con `?prof=N` explícito: la Vista general de siempre (profundidad 2, ENTIDAD + AGRUPACION, puentes). Menú y vista de entrada salen de la misma función: `agrupadoresDe(ady, id).length > 0`.
- **"Áreas de una entidad"** = AGRUPACION destino de un COMPONE que SALE de la entidad (`agrupadoresDe` ya no mira los dos sentidos; una persona miembro de un área no la tiene como propia).
- **Alternativas descartadas.**
  - (a) Contar colaboradorxs compartidxs: no es lo que pidió el dueño y une áreas por cualquier crédito.
  - (b) Calcular los vínculos en `subgrafoDe`: saca de la Vista parte de la vista de entrada y no correría en el servidor.
  - (c) Derivarlos para toda Vista con dos o más áreas, sin campo nuevo: cambia en silencio otras redes y el contrato de `resolverVista` de la Fase 2.
  - (d) Persistirlos: contradice "virtuales" y deja un dato derivado como fuente de verdad.
  - Fallback descartado: raíz + vecinos directos (quedaría la raíz casi sola) y raíz sola (vista vacía y dispararía "Todavía no hay nada acá").
- **Riesgo hasta que se cure más.**
  1. Con los datos de hoy la entrada de Tropical es una estrella de 5 áreas sin vínculos entre ellas.
  2. Hay dos formas de entrar a una entidad según el dato: una creadxr que suma un área pasa a la vista limpia.
  3. Lxs colaboradorxs de Tropical dejan de verse al entrar; se llega entrando a un área, por créditos o con `?prof=2`.
  - Reversible: no queda nada en datos ni en links.

### D-25: adentro de un área, el contexto es la entidad dueña; VOLVER sube un nivel (G-09, G-10)

- **Qué.** La entidad de contexto es la red si es una ENTIDAD, o `padreDe(ady, redId, 'ENTIDAD')` (la ENTIDAD que la COMPONE; con dos dueñas, la primera por nombre) si la red es una AGRUPACION. Con ella:
  - (a) Título (escritorio): la dueña, también adentro del área.
  - (b) Menú superior: las áreas de la dueña, visible al previsualizar y adentro de un área. Activo = el área en la que se está o la que se previsualiza (color del dato, `aria-current="true"`).
  - (c) Desde adentro de un área, otra área del menú se previsualiza en la red de la dueña (`/entidad/<área>?red=<dueña>`, reemplazo); tocar el área actual no hace nada.
  - (d) VOLVER del lateral: con otro nodo enfocado, vuelve al panorama del área (conserva lo sumado, D-22); en el panorama sube a la red de la dueña con el área enfocada, con reemplazo, así la cámara sale de la neurona (D-18); sin dueña usa `volver()`.
  - (e) `navegar` no empuja una entrada si la URL es la actual (`src/app/Shell.tsx`, una sola guardia).
- **Alternativas descartadas.** VOLVER = `history.back()` (no es la inversa exacta con un link duro); VOLVER a la red de la dueña sin foco (llega con zoom in, no es la inversa); menú desde adentro = entrar directo al área (saltea la previsualización de D-09); menú desde adentro = sumar el área a la del área (deja una neurona suelta, es lo que hacía D-23).
- **Mobile, sin rediseño.** Adentro de un área el título sigue siendo el área, el menú superior queda oculto ahí y la hamburguesa abre solo el lateral. Lo único nuevo: la hamburguesa aparece al previsualizar un área (3b).
- **Riesgo.** D-23 dice "dentro de una red, enfocar otro nodo nunca la cambia": el menú superior desde adentro de un área es una excepción explícita. VOLVER desde el panorama cambia de red y borra lo sumado. El color del activo sale del dato (Obras en la base es `#FFBC00`; medido `rgb(255, 188, 0)`).
- **Límite conocido (`ponytail:` en `padreDe`).** Con dos dueñas gana la primera por nombre; salida: elegir por la red de la que se vino si aparece el caso.

### Causa confirmada de G-09 (paso 0, antes de editar, base real en :3002)

Recorrido: `/entidad/tropical-poncho` → OBRAS del menú → "Entrar a Obras" → VOLVER del lateral, en 1280x800, 1366x657 y 1536x730.

| Hipótesis | Veredicto | Evidencia (antes de tocar código) |
|-----------|-----------|-----------------------------------|
| H1: en el panorama `volverAlArea` empuja la URL actual | **CONFIRMADA** | VOLVER en `/entidad/obras`: la URL sigue `/entidad/obras`, `history.length` 4 → 5 (+1), escena igual (16 nodos). El primer Atrás tampoco cambia nada (URL `/entidad/obras`, `history.length` 5) y el segundo recién llega a `/entidad/obras?red=tropical-poncho`. Un click repetido sobre el nodo ya enfocado en el canvas también sumaba +1. Se repitió con link duro a `/entidad/obras` (+1, sin cambio de URL). |
| H2: VOLVER debajo de la lista, bajo el pliegue | **CONFIRMADA** | Rect de VOLVER `bottom: 803` con `innerHeight` 800, 657 y 730. El lateral scrolleaba (`scrollHeight` 703 vs `clientHeight` 700 / 557 / 630): en 1366x657 quedaba 146 px fuera de la pantalla. |
| H3: Volver del panel ausente tras link duro o recarga | **CONFIRMADA, por diseño (UI-SPEC §5)** | `/obra/tempistica-i?red=obras` con link duro: botones del panel `["Ver más"]`, sin "Volver" (`history.state.sinapsis.idx` = 0). No se cambia. |
| H4: algo propio de los datos reales (16 miembros, PRECEDE) o de lo sumado | **DESCARTADA** | Con un nodo enfocado (`/obra/tempistica-i?red=obras` y click en un nodo del canvas) VOLVER del lateral funciona con la base real: URL `/entidad/obras`, +1 en el historial, 16 nodos conservados. Escape con una obra enfocada también anda. |

Causa raíz: H1 (más H2 como segundo síntoma). Se corrigió donde pasan todos los callers: `volverAlArea` (único caller de `irA(…, true)`) y la guardia en `navegar` (todas las navegaciones pasan por ahí: canvas, menú, lateral, créditos, Entrar, la marca e "Ir a la red").

### Dato de curaduría: hoy 0 vínculos virtuales con la base real

Medido con la base real (:3002, 192 nodos): `/entidad/tropical-poncho` entra con **6 nodos, 5 vínculos y 0 virtuales** (antes: 40 nodos y 74 vínculos, 54 virtuales). Solo Obras tiene miembros (16, todos eventos). Los vínculos entre áreas aparecen a medida que la curaduría cargue miembros en una segunda área (p. ej. gente en Nosotrxs que colaboró en obras de Obras). Con la fixture sí se ven: `v37` (Libro uno INSPIRO Espora) une EDITORIAL y OBRAS.

### Enmiendas que tiene que escribir 04-13

- **D-08**: realizada para toda entidad con áreas (la "red de primer nivel"); `?prof` sigue siendo el parámetro de niveles.
- **D-09**: menú de la entidad de contexto, visible al previsualizar y adentro de un área, con activo; menú desde adentro de un área (c); áreas por COMPONE saliente.
- **D-10**: VOLVER sube un nivel (d) y va arriba de la lista.
- **D-14**: las obras de una entidad no aparecen al entrar (drift desde 04-02); con D-24 aparecen al entrar al área que las compone.
- **D-22**: matiz. VOLVER desde el panorama cambia de red, así que lo sumado se borra.
- **D-23**: excepción del menú superior desde adentro de un área.
- **Contrato de `vistaDe` para ENTIDAD** (04-02 y el comentario de `url.ts`, ya reescrito en este plan): vale solo para entidades sin áreas o con `?prof`.
- **UI-SPEC**: §2, §3, §8, Tipografía (activo del menú y lateral en 26 px), Mobile (título adentro de un área) y Puntos abiertos 7. Agregar la desviación de título/menú de abajo (Deviation 1).

## Recorrido e2e con valores medidos

Método: base real en :3002 (servidor del dueño, HMR, no se tocó); fixture con `TOPOLOGIA_FIXTURE=1 next dev -p 3003` desde la copia aislada (cerrado al terminar, sin listeners en 3003); Playwright con el Chromium de gstack. `next build` OK en la copia aislada con `node_modules` enlazado.

**Task 1 (G-09), base real, 1280x800 y 1366x657 (idénticos):**

| Caso | Resultado |
|------|-----------|
| Panorama de Obras → VOLVER | URL `/entidad/obras?red=tropical-poncho`; `history.length` +1; panel "Obras" con "Entrar a Obras"; escena = red de Tropical (6 nodos) |
| Cámara | Distancia a la neurona de Obras 11, 36, 57, 74, 87, 97, 102, 103, 103... (1280x800) y 15, 38, 59, 76, 88, 97, 102, 103... (1366x657): monótona creciente hasta el reposo. Sale de la neurona. |
| Atrás | Un solo toque: vuelve a `/entidad/obras` |
| Link duro `/entidad/obras` → VOLVER | URL `/entidad/obras?red=tropical-poncho`, +1 |
| `/obra/tempistica-i?red=obras` → VOLVER | `/entidad/obras`, +1, 16 nodos (lo sumado se conserva) |
| Click repetido en el nodo ya enfocado | `history.length` +0 (antes +1) |
| VOLVER dentro del viewport | rect `top: 108, bottom: 153` en todos los viewports (antes `bottom: 803`) |
| Un solo `canvas`, consola | 1 canvas, 0 errores |

Fixture (1366x657, `obras`): mismo recorrido y mismos valores (URL, +1, cámara 8 → 103 monótona, `tras Atras` en un toque, click repetido +0, 0 errores).

**Task 2 (G-08):**

| Ruta | Base real (:3002) | Fixture (:3003) |
|------|-------------------|-----------------|
| `/entidad/tropical-poncho` | 6 nodos, 5 vínculos, 0 virtuales | 7 nodos (`tp` + 6 áreas), 7 vínculos (6 COMPONE + 1 virtual `area-editorial\|area-obras`) |
| `/entidad/rama-cerratto` | 40 nodos (los mismos que antes), 61 vínculos, con la raíz | 16 nodos, red general |
| `/entidad/tropical-poncho?prof=2` | 40 nodos, 74 vínculos (red general con creadxrs) | 11 nodos, 15 vínculos, con `creadxr-ana` |
| `?puentes=0` | 6 nodos, 5 vínculos, 0 virtuales | 7 nodos, 6 vínculos, 0 virtuales |
| OBRAS + "Entrar a Obras" | 16 nodos | 5 nodos |

Captura con el trazo punteado de EDITORIAL–OBRAS: `C:/Users/ramac/AppData/Local/Temp/claude/C--Users-ramac-source-TropicalPoncho-sinapsis-sinapsis-front/cd1d2412-dfa0-4d87-b8ec-08feef9ed943/scratchpad/g08-fixture.png`. Consola sin errores y un solo canvas en todos los casos.

**Task 3 (G-10), base real:**

| Caso | 1280x800 | 1366x657 |
|------|----------|----------|
| Título visible, previsualizando y adentro de Obras | "Tropical Poncho", `text-transform: uppercase` | igual |
| Menú | visible; activo Obras, `font-size: 26px`, `aria-current="true"`, color `rgb(255, 188, 0)` | igual |
| Lateral adentro de Obras | 16 ítems en 26 px; VOLVER arriba de la lista (`top 108, bottom 153`); `overflow-y: auto` (`scrollHeight` 1122 vs `clientHeight` 700) | igual (`clientHeight` 557) |
| Click en AUDIOVISUALES desde adentro | `/entidad/audiovisuales?red=tropical-poncho`, escena de Tropical (6 nodos), panel "Audiovisuales" con "Entrar a Audiovisuales", activo Audiovisuales | igual |
| Click en Obras estando adentro de Obras | URL y `history.length` sin cambio | igual |

Captura adentro de Obras a 1280x800 para comparar con la del dueño: `C:/Users/ramac/AppData/Local/Temp/claude/C--Users-ramac-source-TropicalPoncho-sinapsis-sinapsis-front/cd1d2412-dfa0-4d87-b8ec-08feef9ed943/scratchpad/g10-real-1280.png` (mobile: `g10-real-390.png`).

Mobile 390x800 (real y fixture): al previsualizar un área aparece `#hamburger`; adentro de Obras el span visible del título dice "Obras" (en la fixture "OBRAS"); `.floatingMenu` tiene `display: none` incluso con la hamburguesa abierta; el cajón lateral abre con VOLVER arriba. Un solo canvas y 0 errores.

Gates finales: `npm test` 145/145, `npx tsc --noEmit` 0, `npm run lint` 0 (solo warnings preexistentes de `config` sin usar en el motor), `next build` OK en copia aislada. Acceptance criteria de las tres tasks re-corridos: `grep -rc entidadDeMenu src/` sin ningún archivo > 0; `aria-current` 1; `menu--en-area` 1 en Menus.tsx y 1 en overlay.css; `text-transform: uppercase` pasó de 3 a 5; `git diff --stat` de `BranchedMenu.css/.jsx` vacío; sin imports de `three|engine/` en Overlay, Menus, `lib/red` y `lib/vista`; `'ENTIDAD')` 2 en Overlay; `location.pathname + location.search` 1 en Shell y `history.pushState` en una sola línea; VOLVER (línea 72) antes de `<BranchedMenu` (línea 74); `ponytail:` 2 en menus.ts y 2 en resolverVista.ts; `vinculosEntreAgrupaciones` en los tres archivos; `"v37"` 1; `LIMITE_VISTA = 40`; 10 líneas `q.get(`/`q.set(`; `SUELTOS_POR_HUB_SIN_PRODUCTORA` sin tocar.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] El título en mayúsculas pisaba el menú superior y el lateral**
- **Found during:** Task 3 (captura a 1280x800 con la base real).
- **Issue:** Briller es ancha: "TROPICAL PONCHO" en mayúsculas a 32 px mide unos 560 px y no entra en `max-width: 38vw` (486 px). Envolvía en dos líneas, tapaba parte de "AUDIOVISUALES" y llegaba a VOLVER. El menú de 5 ítems (con Obras activa a 26 px) mide unos 960 px y tampoco entra en una fila a la derecha del título.
- **Fix:** en escritorio el título pasa a `font-size: clamp(22px, 2.3vw, 32px)`, `max-width: 44vw`, una línea con elipsis; el menú arranca en `left: 46vw` y envuelve (`flex-wrap: wrap`) en vez de invadir el título. Esto se aparta del "conserva sus 32 px" del plan. A 1280x800 el menú queda en dos filas.
- **Files modified:** `src/styles/overlay.css`
- **Commit:** `2c70810`
- **Para el UAT del dueño:** es ajuste de maqueta, no de comportamiento. La captura del dueño usa una fuente condensada, por eso allí entra en una fila. Si se prefiere una sola fila, la salida es achicar los ítems o dejar el activo en 18 px; queda para 04-13.

**2. [Orden] `entidadDeMenu` se borra en la Task 3 y no en la 1**
- La Task 1 tocaba `menus.ts` y Overlay seguía importando `entidadDeMenu`. Se la dejó viva en la Task 1 (para que cada commit compile) y se borró, con su test, en la Task 3 donde ya no tiene callers. Sin cambio de alcance.

### Método

**3. Playwright con `?perf=1` y servidor de fixture en la copia aislada**, igual que 04-08..04-11. La corrida de fixture de la Task 1 se hizo con el código de la Task 3 ya sincronizado en la copia (la de la Task 2 se hizo antes de la Task 3); la base real se midió después de cada task con HMR.

**4. Mobile del lateral: cajón medido con la hamburguesa**, no con `scrollIntoView` (el plan lo pedía solo para escritorio).

**Total deviations:** 4 (1 de maqueta con evidencia, 3 de orden o método). **Impact:** sin cambio de alcance; la Deviation 1 va al UAT.

## Known Stubs

Ninguno.

## Issues / Deferred

- UAT del dueño y escritura de D-24/D-25 en CONTEXT y UI-SPEC: 04-13.
- Hasta que la curaduría cargue miembros en una segunda área, la entrada de Tropical muestra 5 áreas sin vínculos virtuales.
- Con 16 obras en Obras, títulos largos del lateral a 26 px envuelven en 2 o 3 líneas y la lista scrollea (`scrollHeight` 1122 en 1280x800); el ancho del lateral quedó en 340 px. Para el dueño.
- G-06 sigue abierto (celular, PERF-01 sin medir). No se tocó `imageThreeObject.js`, `background.js` ni `data/`.
- Temas abiertos ("ingresar" frente a "scrollear", "Nosotrxs siempre presente") no se construyeron ni se bloquearon.

## Threat Flags

Ninguno. T-04-08 (derivación acotada a las agrupaciones visibles, deduplicada por par) y T-04-09 (guardia de URL idéntica en `navegar`) se mitigaron como decía el plan. Este plan no instala paquetes.

## Self-Check: PASSED

Commits `d57247c`, `cb3a41c` y `2c70810` presentes (`git log`); `commits: 3` medido contra `plan_head_before` `112bd7c`. Archivos modificados presentes. Servidor de :3003 cerrado; el del dueño en :3002 sigue arriba (200).
