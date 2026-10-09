# Fase 4 - Smoke headless y UAT

Fecha: 2026-09-20. Servidor: `TOPOLOGIA_FIXTURE=1 npm run dev` en **puerto 3002** (el 3000 lo ocupa otra app, FocoPomodoro). Navegador: gstack `browse` (sin GPU: WebGL por software, ~4-7 fps; no se miden fps, PERF-01).

## Gates

| gate | resultado |
|------|-----------|
| `npm test` | OK 107/107 |
| `npx tsc --noEmit` | OK exit 0 |
| `npm run lint` | OK exit 0 (solo warnings preexistentes en `src/engine/threeObjects/*`) |
| `npm run build` | OK |

## Smoke

| punto | resultado | evidencia |
|-------|-----------|-----------|
| 1 `/` canvas, consola, loader, titulo | OK | 1 canvas, `.cargando cargando--fuera`, h1 "Sinápsis" visible, sin errores de consola (solo warnings de GL por software) |
| 2 click de nodo, URL y panel tras la camara | OK | `_emitir('nodeClick')` sobre obra-nudo: URL `/obra/nudo?red=_` a los 277 ms; `aria-busy=true` sin `panel--visible` de 603 a ~3250 ms; `panel--visible` y `busy=false` desde 3502 ms. Observacion: la primera muestra (277 ms) mostro un instante `panel--visible` con `busy=false` antes de pasar a busy (posible parpadeo previo, ver nota A) |
| 3 `/entidad/tropical-poncho` link duro | OK | 1 canvas; `.floatingMenu` con 6 botones: AUDIOVISUALES, CONCEPTO, EDITORIAL, LABORATORIOS, OBRAS, TECNOLOGÍA. El panel no muestra "Entrar" porque ya esta en la red del nodo (`red === enfocado`, `Overlay.tsx:86`) |
| 4 entrar a un area | OK | click en el boton AUDIOVISUALES del menu: URL `/entidad/audiovisuales`, `.lateralFloatingMenu` con "VOLVER / Corto uno / Obra sin descripción / Tropical Poncho". Se entro por el menu superior, no por el boton "Entrar a ..." del panel (ese boton solo aparece al enfocar una entidad desde otra red) |
| 5 `history.back()` | OK | de `/entidad/audiovisuales` vuelve a `/entidad/tropical-poncho`: panel oculto y `busy=true`, luego visible. En home: back desde `/obra/nudo` deja `/`, `_nodoEnfocado === null`, panel oculto |
| 6 recarga en link duro + back/forward | OK | recarga en `/obra/nudo` muestra la ficha; click en credito (Ana Ruiz), back, forward: `/entidad/ana-ruiz`, `/obra/nudo`, `/entidad/ana-ruiz` con `window.__marca=42` viva (sin recarga completa, Pitfall 2) |
| 7 Ver mas con detalle | OK | `/obra/nudo`: creditos, 4 imagenes `loading="lazy"`, iframe `https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ`, 2 enlaces con `rel="noopener noreferrer"`. Libro uno (sin detalle): solo creditos, 0 iframes |
| 8 stub y obra sin descripcion | OK | `obra-sin-descripcion` y `creadxr-invitadx` (stub): 0 botones en el panel |
| 9 rafaga | OK | 5 clicks + 4 pares back/forward seguidos; a los 6 s `aria-busy=false`, URL `/entidad/tropical-poncho` coincide con el panel "Tropical Poncho", 0 excepciones, 1 canvas |
| 10 `/entidad/no-existe` | OK | 1 canvas; panel "No encontramos ese nodo. Puede que el link haya cambiado. Volvé a la red y seguí explorando." con "Ir a la red" |
| 11 viewport 390x800 | OK tras fix | Primero GAP UI-09: `.panel--visible` quedaba con `translateY(16px)` (bottom 816 vs 800) porque la media query mobile pisaba `transform: none`. Corregido en `e77c289` (`overlay.css`); re-medido: bottom 800 = innerHeight, `#hamburger` con `display:flex` (aparece en `/entidad/tropical-poncho`; en `/obra/...` no hay areas, por lo tanto no hay menu ni hamburguesa) |
| 12 API caida y Reintentar | OK | Segundo dev sin fixture ni DB: `/api/topologia` 503, se ve el panel de error con boton "Reintentar". Al levantar el fixture en el mismo puerto y pulsar Reintentar el boton desaparece y no queda error. No se llego a leer el grafo repoblado (el navegador headless se reinicio), recuperacion confirmada solo por ausencia del error |

Notas:
- A. Muestra a 277 ms con panel visible antes de `busy`: no reproducida en la rafaga ni en los back; revisar en UAT punto 2 (UI-10).
- El servidor de `browse` se reinicia solo cada ~10-15 s de sesion; los checks se hicieron en llamadas cortas.

## Greps de aceptacion de planes previos

| grep | resultado |
|------|-----------|
| `aria-label` en `src/app` | 5 |
| hex inline en style | OK: unico `style={{}}` es el contenedor del canvas; los colores pasan por `HEX` en `Menus.tsx` |
| `loading="lazy"` | OK (2, imagenes verificadas en runtime) |
| `youtube-nocookie` | OK (1, iframe verificado en runtime) |
| `BASE_ASSETS` | OK, definido en `Ficha.tsx:9` y usado para las claves de `thumb` |
| `dangerouslySetInnerHTML` | OK, 0 |
| imports de `engine/three` en `src/app` y `src/lib` | OK: solo `import()` dinamico en `CanvasSinapsis.tsx` (puente) |

## UAT del dueño

Fecha: 2026-10-07. Escritorio contra `localhost:3002` y celular Android (Chrome) contra `10.0.0.39:3002`, con la base real (193 nodos, 300 vínculos), no el fixture. Resultado transcrito del dueño; cada falla es un gap contra su requisito (ver `04-UAT-GAPS.md`), no se corrige dentro de este plan.

| punto | resultado | nota |
|-------|-----------|------|
| 1 home | OK | |
| 2 secuencia al tocar un nodo | FALLA (celu) | Al pulsar Volver en el celular hace un pequeño salto a la neurona del centro y luego vuelve. Gap G-01 (UI-10) |
| 3 degradado | OK | |
| 4 otro nodo con el panel abierto | OK con ajuste | Hoy cambia el contenido y recién después oculta/anima/reaparece; el dueño aprueba el comportamiento pero el orden debe ser: primero ocultar, después cambiar la información. Gap G-02 (UI-10) |
| 5 Entrar a entidad y área | FALLA | Gap G-03 (D-18, UI-03): el área no muestra su info antes de entrar, la animación es zoom out (debe ser zoom in), Tropical queda flotando inconexo |
| 6 ficha, scroll y crédito | scroll OK, crédito FALLA | Gap G-04 (UI-02, UI-04): al tocar un crédito queda la pantalla en negro |
| 7 link compartido | OK con reparos | Gap G-05 (UI-03): dentro de la red de una entidad, tocar otra entidad cambia la red; aparecen nodos sin relación con la entidad |
| 8 celular | FALLA parcial | Arrastre y zoom OK. Tocar la entidad Tropical dejó la pantalla en blanco con ícono de roto; 4 errores de Next, entre ellos `THREE.WebGLRenderer: A WebGL context could not be created. Reason: Web page caused context loss and was blocked`. Gap G-06 (PERF-01, UI-08). Además "Sinápsis" queda cortada por el borde izquierdo y el título de la entidad la tapa. Gap G-07 (UI-09) |
| 9 teclado | OK | |
| 10 consola | OK (escritorio) | En el celular: los 4 errores del punto 8 |

Fluidez en celular (PERF-01): sin medición de fps; la red 3D con fondo (4000 estrellas + montaña de ~195k segmentos) provocó pérdida de contexto WebGL al navegar a Tropical.

## Re-smoke tras el cierre de gaps (04-08..04-10)

Fecha: 2026-10-07. Gates sobre el árbol de trabajo tras la auditoría ponytail de 04-11: `npm test` 136/136, `npx tsc --noEmit` 0, `npm run lint` 0 errores (solo warnings previos de `src/engine/threeObjects/*`), `next build` OK (copia aislada con `node_modules` enlazado, para no pisar el `.next` del dev server del dueño). `git diff --stat -- package.json` vacío.

Método: el 3002 es el dev server del dueño con la base real, así que se levantó `TOPOLOGIA_FIXTURE=1 next dev -p 3003` desde la copia aislada. El servidor de `/browse` no sostuvo la página WebGL en 04-08 ni en 04-09, así que se usó el mismo Chromium de gstack por script Playwright (en el scratchpad, sin instalar nada), con muestreo por `requestAnimationFrame` (~5 fps con GL por software; no se miden fps). Las navegaciones se disparan con `_emitir('nodeClick')` sobre el nodo del grafo, clicks reales en los botones del panel y del menú, y `goBack`/`goForward`. Slugs de la fixture: `obras` (área, 5 obras), `nudo`, `ana-ruiz`, `beto-sosa`, `concepto`, `editorial`; `obra-libro` (Libro uno) es el único fuera de OBRAS con vínculo a Ana.

| gap | punto | resultado | evidencia |
|-----|-------|-----------|-----------|
| G-02 (UI-10) | 1280x800, `/obra/nudo?red=obras`, enfocar `obra-espora` con el panel abierto | OK | 249 muestras. Secuencia: `vis=false nom=Nudo` (t=0, ya saliendo con el nombre viejo) → `vis=false nom=Espora` (t=322 ms, cambia ya oculto) → `vis=true nom=Espora` (t=3363 ms, tras la cámara). 0 cuadros con el panel visible y el nombre nuevo antes de ocultarse. La nota A no se reproduce (primer cuadro ya `vis=false`) |
| G-02 (UI-10) | 390x800, mismo recorrido | OK | 246 muestras, misma secuencia: oculto con `Nudo`, `Espora` a los 320 ms, visible a los 3353 ms; 0 cuadros con panel visible y nombre nuevo |
| G-01 (UI-10) | 1280x800, home → `creadxr-ana` → Volver (a `/`), `camera.view.offsetX` | OK | 253 muestras. |offsetX| 384,8 → 376,6 (efecto del `translateX` del panel saliendo) → 0,0, baja sin saltos (0 subidas > 9 px). La cámara se mueve en el cuadro 25 y el primer offset 0 llega en el 202: no cae a 0 antes del tween. URL final `/` |
| G-01 (UI-10) | 390x800, mismo recorrido, `camera.view.offsetY` | OK | 255 muestras. |offsetY| 154,6 → 0,0 monótono (0 subidas > 9 px); cámara se mueve en el cuadro 26, primer offset 0 en el 198 |
| G-03 (D-18, UI-03) | `/entidad/tropical-poncho` → click OBRAS del menú | OK | URL `/entidad/obras?red=tropical-poncho`, `panel--visible`, `aria-busy=false`, botones `["Entrar a OBRAS","Volver"]`. 11 nodos de Tropical intactos |
| G-03 (D-18, UI-03) | Entrar a OBRAS (distancia cámara-origen por rAF) | OK | URL `/entidad/obras`, 5 nodos (`obra-cepa,distopia,espora,nudo,wip`), ningún `tp`. Vuelo a la neurona …98,1 → 94,6 → 91,3 → 88,3 → 85,8; negro; llegada 684,9 (= 2,5 × 274, `ENTRADA_FACTOR`) → 650,3 → 609,6 → 505,6 → 401,3 → 299,9 → 274,0, decreciente sin una sola subida (0 violaciones, tolerancia 2 %) |
| G-03 (D-18, UI-03) | Atrás desde la red de OBRAS | OK | `/entidad/obras?red=tropical-poncho`, panel del área visible con "Entrar a OBRAS", la escena es exactamente la de Tropical (11 ids iguales). Distancia cámara-neurona creciente: 5,9 → 20,6 → 40,2 → 60,3 → 80,4 → 100,0 → 102,9 (0 violaciones salvo el salto del corte a negro) |
| G-04 (UI-02, UI-04) | `/entidad/obras` → Nudo → Ver más → crédito "Ana Ruiz" | OK | URL `/entidad/ana-ruiz?red=obras` (el único push trae solo `red`), cámara `[50; -0,1; 90,1]` finita, 6 nodos = 5 de OBRAS + 1, panel "Ana Ruiz" visible con `["Entrar a Ana Ruiz","Sumar sus obras","Volver"]`, 1 canvas |
| D-22 persistencia (UI-05) | Atrás y Adelante dentro de la red | OK | Atrás: `/obra/nudo?red=obras`, panel "Nudo", 6 nodos, `creadxr-ana` conservada. Adelante: `/entidad/ana-ruiz?red=obras`, 6 nodos |
| D-22 "Sumar sus obras" (UI-05) | Con Ana enfocada, click en "Sumar sus obras" | OK | 133 muestras con `panel--visible` siempre `true` (nunca ocultó), URL idéntica en todas, 0 pushes nuevos, 7 nodos (`obra-libro` agregada), el botón desaparece (queda `["Entrar a Ana Ruiz","Volver"]`) |
| D-22 VOLVER lateral (UI-05) | VOLVER del menú lateral de OBRAS | OK | `/entidad/obras`, 7 nodos, `creadxr-ana` y `obra-libro` conservadas |
| D-22 borrado al cambiar de red (UI-05) | Ana + Libro sumadas → Entrar a Ana → Atrás | OK | Entrar: `/entidad/ana-ruiz`, red propia de 7 nodos (`tp`, áreas, creadxrs; ningún id de OBRAS). Atrás: `/entidad/ana-ruiz?red=obras`, 6 nodos = 5 de OBRAS + Ana (Ana vuelve por ser el foco), sin `obra-libro` |
| D-22 recarga (UI-05) | `/obra/nudo?red=obras` con Ana + Libro sumadas, recarga | OK | Antes: 7 nodos. Después de recargar: 5 nodos, solo OBRAS (para conservar `?perf=1` en la recarga se agregó con `history.replaceState`) |
| D-22 el link abre el ancla (UI-05) | Pestaña nueva en `/entidad/ana-ruiz?red=obras` | OK | 6 nodos = OBRAS + Ana, sin `obra-libro`, panel "Ana Ruiz" |
| G-05 (UI-03) | `/entidad/tropical-poncho` → enfocar `creadxr-beto` (visible) | OK | URL `/entidad/beto-sosa?red=tropical-poncho`, 11 → 11 nodos y los mismos ids (la red no cambia, solo el foco) |
| G-05 (UI-03) | Entrar a Beto Sosa y Atrás | OK | Entrar: `/entidad/beto-sosa`, 6 nodos. Atrás: 11 nodos, exactamente los ids de Tropical (0 sobrantes, 0 faltantes) |
| Estado vacío (UI-03) | `/entidad/concepto` (0 miembros) y `/entidad/editorial` (1 miembro) | OK | `concepto`: panel visible "Todavía no hay nada acá", 0 nodos. `editorial`: 1 nodo, panel retirado (estás adentro, lista lateral), sin el texto de vacío |
| G-07 (UI-09) | 390x800, `/` y `/entidad/tropical-poncho` | OK | h1 de la home `left 16`, `top 763`, `right 113`; `.marca` `left 16 top 763`, `.tituloRed` `left 72 top 20 right 337 bottom 50`: no se intersectan; con un nodo enfocado y el panel visible la marca tiene `marca--oculta` (`opacity 0`) |
| G-06 y UI-08 (no regresión) | Todos los recorridos de arriba, desktop y 390x800 | OK | Un solo `<canvas>` en cada medición; consola sin errores ni excepciones de página (`errs: []` en todas las corridas completas); `imageThreeObject.js`, `background.js` y `threeObjects/*` sin cambios desde `74639be` (`git diff --stat` vacío). La pérdida de contexto del celular (G-06) no se puede reproducir headless: va al UAT |
| Ráfaga (UI-10) | `/entidad/tropical-poncho`: 5 clicks seguidos y 4 pares atrás/adelante, a 60 ms | OK | A los 6 s: `aria-busy="false"`, URL `/entidad/editorial?red=tropical-poncho` = panel "EDITORIAL", 11 nodos = los 11 de la misma URL cargada de cero (0 sobrantes, 0 faltantes, ninguno de los pasos descartados), 1 canvas, 0 excepciones. Todos los nodos tocados ya estaban en la red de Tropical, así que la ráfaga no ejercita lo sumado: lo cubre el re-smoke de D-22 y los tests |
| PERF-01 | Tope de la escena con lo sumado | OK (por test) | La fixture no llega al tope (redes de 5 a 11 nodos). Lo cubre `url.test.ts`, "subgrafoDe: tope — nunca más de LIMITE_VISTA + LIMITE_SUMA y el foco no sale" (136 tests en verde): 40 + 12 = 52 nodos = 52 draw calls. Los fps con ese techo en el celular no se miden headless (GL por software): van al UAT, punto 10 |

Sin filas GAP. Observaciones que no cambian el resultado: la llegada del zoom in se midió con la red chica de la fixture; con la red real de OBRAS (16 nodos, encuadre ~451) 04-09 vio que un bloqueo del hilo al cargar puede comerse el tween, eso se confirma en la GPU del dueño (UAT punto 3).

## UAT del dueño 2

Fecha: 2026-10-08. Escritorio `localhost:3002` y celular Android `10.0.0.39:3002`, con la base real (193 nodos, 300 vínculos). Respuesta del dueño, textual:

> esta ok. En tropical quiero que figuren solo las areas, todas conectadas entre si. Podemos pensar relaciones entre areas. Para tener una vista mas limpia. Y que esté, en este caso si, el nodo raiz. O sea la entidad. Fíjate que el volver ahí no me estaba andando en obras. Por otro lado, al entrar en obras por ej., debería mostrar el "obras" como active (en desktop) mantener el tropical poncho en el mismo lugar arriba a la izq. Te dejo capturas de diseños para esto. Eso hace que al ingresar en obras, se ve el menu lateral de obras. Podemos pensar que sucede cuando se sigue moviendo a lugares. Pero veo que hay dos formas de scrollear.. onda, se puede ingresar a una entidad o a una obra, pero se puede ir scrolleando por la red. Vayamos por esto por ahora. Area vacia dice todavia no hay nada aca, esta ok. Sinapsis ok. Sigamos

La captura de diseño adjunta muestra el nombre de la entidad fijo arriba a la izquierda ("NOMBRE ENTIDAD"), el menú superior con el área actual resaltada (OBRAS activa, en turquesa) junto a las demás, y a la izquierda la lista lateral de obras, con la red a la derecha. Sobre la enmienda de D-16 el dueño agregó (resumido por el coordinador, no textual): en general es zoom in, entrar a una entidad y entrar a un área es así ("vas ingresando"); el movimiento aditivo/filtrado puede ser el lateral entre entidad y obra (de un evento ver sus artistas, ocultando el resto; de un artista sumar sus últimas obras), a diseñar más adelante: "Tenemos que pensar bien todo esto".

Resultado por punto. El dueño contestó en bloque ("esta ok"), no punto por punto; lo que no nombró queda "sin respuesta explícita" y no se infiere.

| punto | resultado | nota |
|-------|-----------|------|
| 1 (G-02) panel antes de cambiar el contenido | sin respuesta explícita | cubierto por el re-smoke; el "esta ok" general no lo nombra |
| 2 (G-01) Volver sin salto | sin respuesta explícita | cubierto por el re-smoke. Aparte, el dueño reporta que "el volver" no andaba en Obras: G-09 |
| 3 (G-03) entrar/salir de un área | OK con ajustes | "al entrar en obras por ej., debería mostrar el 'obras' como active (en desktop) mantener el tropical poncho en el mismo lugar arriba a la izq." y ver el lateral de obras: G-10. En Tropical quiere solo las áreas conectadas entre sí más la entidad raíz: G-08. Sobre si el zoom in llegaba cortado en una red grande: sin respuesta explícita |
| 3b menú superior mientras se previsualiza un área | respondido: que quede visible | surge de la captura de diseño (menú superior visible con el área activa). Va a D-09 y a UI-SPEC, punto abierto 7 |
| 4 enmienda de D-16 (ENTIDAD con reemplazo, zoom in) | CONFIRMADA | entrar a una entidad y entrar a un área son zoom in. El movimiento lateral aditivo/filtrado queda como tema abierto de diseño |
| 5 (G-04) créditos, "Sumar sus obras" | sin respuesta explícita | cubierto por el re-smoke |
| 6 reglas de D-22 | sin respuesta explícita | el dueño no objetó ninguna; la discusión de "dos formas de scrollear" queda como tema abierto (ver 04-UAT-GAPS.md) |
| 7 (G-05) enfocar otra entidad dentro de una red | sin respuesta explícita | cubierto por el re-smoke |
| 8 áreas vacías | OK | "Area vacia dice todavia no hay nada aca, esta ok" |
| 9 (G-07) "Sinápsis" abajo | OK | "Sinapsis ok" |
| 10 (G-06, PERF-01) celu: sin pantalla blanca, fluidez con ~12 sumados | sin respuesta explícita | sin fps ni sensación reportados; PERF-01 queda sin medir en celular |
| 11 duraciones | sin respuesta explícita | las perillas no se tocan |
| 12 consola | sin respuesta explícita | cubierto por el re-smoke (escritorio headless, sin errores) |

Gaps nuevos del UAT: G-08, G-09 y G-10 (ver `04-UAT-GAPS.md`). No se corrigen en este plan.

## Re-smoke tras 04-12 (G-08..G-10)

Fecha: 2026-10-08. Gates tras la auditoría ponytail de 04-13 (sobre el árbol con el commit `b0c67af`): `npm test` 145/145, `npx tsc --noEmit` 0, `npm run lint` 0 errores (solo warnings previos de `config` sin usar en `src/engine/threeObjects/*`), `next build` OK (copia aislada con `node_modules` enlazado, para no pisar el `.next` del dev server del dueño). `git diff --stat -- package.json` vacío.

Método: el 3002 es el dev server del dueño con la base real (192 nodos, 300 vínculos); solo se lee, no se levantó ni se cerró (mismo PID antes y después). La fixture se sirvió con `TOPOLOGIA_FIXTURE=1 next dev -p 3003` desde la copia aislada, sincronizada con HEAD, y se cerró al terminar (sin listeners en 3003). Medición con Playwright y el Chromium de gstack (scripts en el scratchpad, sin commitear), `?perf=1`, muestreo por `requestAnimationFrame` (~5 fps; no se miden fps). Recorridos ya medidos en 04-12 que no cambiaron (captura de maqueta, G-09 en 1536x730) no se repiten; esta corrida sí vuelve a medir con el código de HEAD, incluida la limpieza de la auditoría.

| gap | punto | resultado | evidencia |
|-----|-------|-----------|-----------|
| G-08 (UI-03) | fixture `/entidad/tropical-poncho` | OK | 7 nodos: exactamente `tp` y las 6 áreas; 7 vínculos = 6 COMPONE + 1 virtual `area-editorial\|area-obras` (v37). Ningún creadxr. Raíz incluida |
| G-08 (UI-03) | fixture `?puentes=0` | OK | 7 nodos, 6 vínculos, 0 virtuales: el flag apaga los derivados junto con los puentes |
| G-08 (UI-03) | base real `/entidad/tropical-poncho` | OK (hueco de curaduría) | 6 nodos (Tropical + 5 áreas), 5 vínculos, 0 virtuales. Solo Obras tiene miembros; los vínculos entre áreas aparecen cuando la curaduría cargue miembros en una segunda área. Raíz incluida |
| G-08 (UI-03) | fallback `ana-ruiz` (fixture) | OK | `/entidad/ana-ruiz`: 7 nodos, 11 vínculos, tipos ENTIDAD y AGRUPACION, con la raíz Ana Ruiz: la red general de siempre |
| G-08 (UI-03) | fallback `rama-cerratto` (real) | OK | 40 nodos, 61 vínculos, con la raíz Rama Cerratto (los mismos 40 de antes del cambio) |
| G-08 (UI-03, D-08) | `?prof=2` en Tropical | OK | Real: 40 nodos, 74 vínculos, con creadxrs. Fixture: 11 nodos, 15 vínculos, con `creadxr-ana` |
| G-09 (UI-10, D-18) | VOLVER en el panorama de Obras (real, 1280x800 y 1366x657) | OK | URL `/entidad/obras` → `/entidad/obras?red=tropical-poncho`; `history.length` 4 → 5 (+1, en ambos viewports); panel "Obras" con "Entrar a Obras"; escena = red de Tropical (6 nodos). Fixture 1366x657: mismo resultado (7 nodos) |
| G-09 (UI-10, D-18) | cámara sale de la neurona | OK | Distancia a la neurona de Obras 5, 28, 51, 69, 84, 94, 100, 103 (1280x800) y 5, 26, 49, 67, 83, 93, 100, 103 (1366x657): monótona creciente hasta el reposo. Fixture: 11, 35, 55, 72, 86, 95, 101, 103 |
| G-09 (UI-10) | Atrás tras VOLVER | OK | Un solo toque: de `/entidad/obras?red=tropical-poncho` a `/entidad/obras`; un segundo toque a la previsualización. `history.length` no cambia al ir hacia atrás |
| G-09 (UI-10) | VOLVER con una obra enfocada | OK | `/obra/tempistica-i?red=obras` (link duro) → VOLVER: `/entidad/obras`, +1 en el historial, 16 nodos (los de antes). Con la fixture, igual (5 nodos) |
| G-09 (UI-10) | sin entradas duplicadas | OK | Re-click del nodo ya enfocado: `history.length` +0 (real y fixture, ambos viewports). Click del área activa en el menú estando adentro de Obras: URL y `history.length` sin cambio (+0). VOLVER tras link duro a `/entidad/obras`: +1 |
| G-09 (UI-10) | VOLVER dentro del viewport | OK | Rect de VOLVER `top 108, bottom 153` con `innerHeight` 800 y 657; el lateral scrollea (`overflow-y: auto`, `scrollHeight` 1122 vs `clientHeight` 700 / 557); VOLVER va antes de la lista |
| G-10 (UI-06, UI-09) | escritorio 1280x800, previsualizar y adentro de Obras (real) | OK | Título visible "Tropical Poncho", `text-transform: uppercase`, también adentro; menú visible con Obras activa: `font-size: 26px`, `aria-current="true"`, color `rgb(255, 188, 0)` (el del dato); lateral con 16 ítems en 26 px y VOLVER arriba |
| G-10 (UI-06, UI-09) | escritorio 1366x657 (real) | OK | Idéntico a 1280x800 (título, menú, activo 26 px, 16 ítems en 26 px, VOLVER `top 108, bottom 153`) |
| G-10 (UI-06, D-25) | desde adentro de Obras, click en AUDIOVISUALES | OK | `/entidad/audiovisuales?red=tropical-poncho`, escena de Tropical (6 nodos), panel "Audiovisuales" con "Entrar a Audiovisuales", activo Audiovisuales (26 px, `aria-current`, `rgb(138, 226, 200)`), título sigue "Tropical Poncho". En ambos viewports |
| G-10 (UI-09) | mobile 390x800 (real) | OK | Al previsualizar un área: `#hamburger` visible. Adentro de Obras: título visible "Obras", sin transform; `.floatingMenu` `display: none` también con la hamburguesa abierta; lateral con VOLVER arriba (`top 80, bottom 123`) |
| G-03 (D-18, UI-03), no regresión | Entrar a Obras y Atrás (fixture y real) | OK | Entrar: vuelo a la neurona (191 → 111 en la fixture, 94 → 111 en la real), negro, llegada con zoom in decreciente (fixture 652 → 274, 2,5 × el encuadre; real 503 → 451, ver nota). Atrás: salida desde la neurona, distancia 13, 14, 24 ... 103 monótona (fixture) y 7, 16, 25 ... 103 (real) |
| D-22 (UI-05), no regresión | fixture: crédito en Obras, VOLVER con foco, VOLVER del panorama | OK | Crédito Ana Ruiz desde Nudo: 5 → 6 nodos (`creadxr-ana`). VOLVER con foco: `/entidad/obras`, 6 nodos, Ana conservada. VOLVER desde el panorama: `/entidad/obras?red=tropical-poncho`, 7 nodos, sin Ana (cambio de red, la borra). Entrar otra vez: 5 nodos, sin Ana |
| G-07 (UI-09), no regresión | 390x800, `/`, red y panel visible (real) | OK | h1 de la home y `.marca` `left 16, top 763`; `.tituloRed` `left 72, top 20`: no se intersectan; con el panel visible la marca tiene `opacity 0`; título largo `right 374` (< 390) |
| UI-08 y G-06 (no regresión) | todos los recorridos | OK | Un solo `<canvas>` en cada medición; `ERRS []` (sin errores de consola ni excepciones de página) en todas las corridas; `imageThreeObject.js`, `background.js` y `data/` sin cambios |

Notas:
- La llegada de Entrar con la red real de Obras (16 nodos, encuadre ~451) muestra solo el tramo final del zoom in (503 → 451) porque un bloqueo del hilo al cargar se come el tween (observado ya en 04-09 y 04-11): se confirma en la GPU del dueño, punto 3 del UAT 3. No es regresión de 04-12.
- La marca "Sinápsis" de escritorio (abajo a la derecha, rect `1145-1256 x 752-776` a 1280x800) queda parcialmente tapada por el botón del panel de debug (`.debugPanel__abrir`, rect `1169-1268 x 756-788`): se superponen. El panel de debug es solo de desarrollo (`DebugPanel.tsx`, "no forma parte del diseño final"). No se corrige en este plan; va al UAT del dueño para saber si le molesta.

Sin filas GAP.
