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
