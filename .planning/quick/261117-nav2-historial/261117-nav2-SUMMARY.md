---
quick_id: 261117-nav2
type: quick
status: complete
plan_head_before: d23130cf6ca10e207d720b5f628d8226d56f7d4a
plan_head_after: 7c33353c97c1297d9f0063210a5342300e2fd558
commits: 3   # medido: git rev-list --count plan_head_before..plan_head_after (el commit docs de este SUMMARY va aparte)
actuals:
  tasks: 5
  commits: 3
key-files:
  created:
    - src/lib/red/historial.ts
    - src/lib/red/historial.test.ts
    - src/app/Historial.tsx
  modified:
    - src/app/Shell.tsx
    - src/app/Overlay.tsx
    - src/app/Menus.tsx
    - src/styles/overlay.css
    - CLAUDE.md
    - .planning/PROJECT.md
    - .planning/phases/04.1-expandir-nodo-y-secciones-derivadas/04.1-CONTEXT.md
---

# Quick 261117-nav2: Historial desplegable (chevron atrás)

## Decisión que afecta el futuro (D-51) — primero

**El historial es una excepción acotada a "la Vista vive en la URL", y no es un stack propio: solo muestra la pila que el navegador ya guarda.** Registrada como D-51 en `04.1-CONTEXT.md`, en la tabla Key Decisions de `PROJECT.md` y como enmienda aditiva del invariante en `CLAUDE.md` (junto a la de D-22).

- **Qué se decidió.** Un chevron `‹` a la izquierda del título abre una lista desplegable (scroll propio, sin barra) de lo visitado, de lo más reciente a lo más viejo, con la etiqueta "Red › Foco" derivada de los datos de la Vista (`etiquetaDe`; "Sinápsis" para la home). Elegir un paso hace `history.go(delta)` y cierra: la misma salida que el botón Atrás (popstate -> `alPop` -> coreografía Vista/cámara/overlay), así que **no se apilan entradas nuevas**. El módulo `src/lib/red/historial.ts` (puro, sin React ni THREE) solo convierte la pila de URLs en pasos hacia atrás: salta lo desconocido y lo que no es ruta de la app, la URL actual y las repetidas (queda la más cercana), tope `TOPE_HISTORIAL` = 20 (descarta lo más viejo).
- **Navigation API vs. lista en memoria — decidido con evidencia: Navigation API cuando existe, lista en memoria como respaldo.** Medido en Chromium contra el `pushState` parcheado de Next (`herramientas/probe-navigation-api.mjs` y `capturas/verificacion.jsonl`):
  - `navigation.entries()` refleja cada `navegar()` con su URL (3 `pushState` -> 4 entradas); `history.go(-2)` y `traverseTo` disparan el popstate de siempre y la URL/escena siguen.
  - **Sobrevive a la recarga**: `["Obras","Tropical Poncho › Obras","Tropical Poncho"]` antes y después de `reload()`, desktop y mobile (`9 recarga`).
  - Con `navigation` forzado a `undefined` (`addInitScript`, lo que ven Safari y Firefox anteriores) el respaldo da los mismos 3 pasos y la misma navegación (`10b`, `10c`), pero **la lista se pierde al recargar** (`10d`: sin control hasta que se vuelva a navegar).
  - Por qué la API cuando está: no mantiene ningún estado propio y es exacta; el respaldo cuesta ~10 líneas (`urlsRef` indexada por el `idx` que `navegar()` ya guarda en `history.state`) y mantiene el control donde la API no existe. Una sola función pura (`pasosAtras`) sirve a las dos fuentes.
- **Alternativas descartadas.** Una lista propia que haga `navegar(url)` por cada paso (apila entradas y desalinea la pila del navegador de lo mostrado: Atrás del navegador y el historial dirían cosas distintas); `sessionStorage` (duplica lo que el navegador ya guarda); restaurar Vistas o cachear topología (rompe el invariante); mostrar también lo de adelante (lo cubre el botón Adelante del navegador).
- **Riesgos concretos (mientras no se resuelvan):**
  1. Sin Navigation API la lista vive en memoria: una recarga la vacía, y los pasos anteriores a la recarga no aparecen.
  2. Un paso cuyo nodo ya no existe en los datos no se ofrece (no hay etiqueta).
  3. El título se corre 40px a la derecha cuando aparece el chevron (transición `left` de .3s): un salto leve en el primer paso.
  4. Dos pasos que difieren solo en un parámetro que no cambia la etiqueta (p. ej. `?prof`) se ven iguales hasta elegir uno.
  5. La sección abierta del lateral no vive en la URL: el historial no la cierra ni la restaura.
- **Salida:** persistirlo por usuario cuando haya cuentas (se discute antes del código). ADR en Notion pendiente (junto con D-50).

## Qué cambió

| # | Punto del plan | Cambio | Commit |
|---|----------------|--------|--------|
| 1 | Módulo puro | `src/lib/red/historial.ts`: `pasosAtras`, `registrar` (respaldo; navegar descarta lo de adelante), `etiquetaDe`, `TOPE_HISTORIAL`. 9 tests: orden, tope 20, adelante no cuenta, URL actual y repetidas fuera, consecutivas, huecos y rutas ajenas, truncar al navegar, etiquetas (red = foco, "Red › Foco", sin red, slug inexistente). | 1672054 |
| 2 | Chevron + lista | `Historial.tsx`: botón `‹` (22px, 36px desktop / 44px mobile) y `<ul role="menu">` siempre montada. Apertura con `clip-path` de arriba hacia abajo + opacidad (.3s), cerrada = invisible e `inert`; `prefers-reduced-motion` sin transición (medido `0s`). Sin historial no se renderiza. | 851447f |
| 3 | Cerrar y teclado | Abre y enfoca el primer ítem; flechas arriba/abajo (circulan), Home/End, Tab cierra; Esc cierra solo esto (listener en captura sobre `window`: el Esc de Overlay no pliega ni cierra el panel) y devuelve el foco al botón; clic/tap afuera cierra; el mismo chevron alterna. `aria-expanded`, `aria-controls`, `aria-haspopup="menu"`. | 851447f |
| 4 | Etiquetas | De los datos de la Vista (`nombreDe(slug)` sobre `ady`/`idx`); nada hardcodeado por nodo. | 1672054, 851447f |
| 5 | Reemplaza Volver | El lateral ya no tiene Volver (`volverAlArea` borrada). Queda **"cerrar sección"** solo con una sección abierta: la sección no vive en la URL, así que el historial no la puede cerrar. | 851447f |
| 6 | Sin duplicados | `pasosAtras` salta la URL actual y deja la repetida más cercana; `navegar()` ya ignoraba la URL idéntica a la actual. | 1672054 |
| — | Docs | D-51 en `04.1-CONTEXT.md`, fila en `PROJECT.md`, enmienda en `CLAUDE.md` y en la fila "La Vista es la URL". | 7c33353 |

## Dos chevrones que conviven (decisión de diseño)

El título ya tiene el chevron de D-50 (`⌄`, **a la derecha** del nombre, abre la expansión de la raíz y gira al abrir). El del historial es **otro control**: `‹` (`ArrowLeft01`), **a la izquierda** del nombre y **no gira** al abrir (si rotara a `⌄` se confundiría con el otro; abierto se marca con un círculo de fondo). Quedan separados por el nombre, distinto ícono y distinta posición; `aria-label` "Historial" y "Desplegar/Plegar <nombre>". Capturas con los dos a la vez: `desktop-historial-con-raiz-abierta.png`, `mobile-historial-con-raiz-abierta.png`; Esc con ambos abiertos cierra solo el historial (`11`, ambos viewports).

Layout: el chevron es un control fijo propio (no vive dentro del `<header>` del título, que no existe en la home). Con historial, `.overlay--historial` corre el título 40px (desktop: 24 -> 64px; mobile: 16 -> 56px, o 64 -> 104px si hay hamburguesa, el chevron queda entre las dos). Sin historial el título queda donde estaba.

## Evidencia

Desde un `next dev -p 3003` aislado (copia de `src/` en el scratchpad con `node_modules` y `public` por junction, `TOPOLOGIA_FIXTURE=1`, fixture de los CSV con `build-fixture.mts` de nav1). 1280x800 y 390x844 táctil, Chromium headless. `herramientas/verificar.mjs` genera todo; datos crudos en `capturas/verificacion.jsonl` (0 `pageerror`). Recorrido: deep link a Tropical Poncho -> área Obras (preview) -> Entrar -> un nodo (Alterego).

- **Capturas (desktop y mobile):** `*-sin-historial` (deep link: sin control, título en 24 / 64px), `*-con-historial-cerrado`, `*-historial-abriendo` (a los 90ms, apertura animada) y `*-historial-abierto`, `*-tras-elegir-el-mas-viejo`, `*-historial-con-raiz-abierta`, `*-sin-navigation-api`, `*-lateral-seccion` y `*-area-lista` (lateral sin Volver).
- **Animación medida cuadro a cuadro** (`muestrasClip`: `clip-path` y opacidad de la lista, muestreados con `requestAnimationFrame` desde antes del clic): mobile `inset(0 0 100%)`/0 a 1ms -> 13% recortado/.80 a 168ms -> 0%/1 a 335ms; desktop 19% recortado/.71 a 228ms -> abierto/1 a 539ms (el muestreo de desktop arrancó antes del clic). Dura ~.3s.
- **Lista:** `["Obras","Tropical Poncho › Obras","Tropical Poncho"]` desde `/obra/alterego?red=obras`: la URL actual no figura. El primer ítem es el "un paso atrás".
- **Teclado:** al abrir el foco va al primer ítem; ↓ -> segundo; ↑ -> primero; End -> último; Esc cierra, URL intacta y foco de vuelta en el botón (`4`, `5`); tap/clic afuera cierra (`6`).
- **Elegir el más viejo** (retrocede 3 de una): URL = la del deep link, **el número de entradas no cambia** (4 antes y después: no se apila), la lista queda vacía y el control desaparece, el título vuelve a 24px (`7`). Adelante x3 del navegador restituye la URL y la lista completa (`8`).
- **Coreografía:** la cámara llega al mismo punto con el chevron que con el botón Atrás del navegador (`[0,0,350]` en ambos; medido aparte con `history.back()` vs. chevron en `herramientas/camara-atras-vs-chevron.mjs`, misma curva). Observación previa a este quick y no tocada: volver a una raíz por Atrás encuadra a z=350, una carga directa a z=272.8.
- **Respaldo sin Navigation API** (`navigation` forzado a `undefined`): mismos 3 pasos; elegir el segundo navega a `/entidad/obras?red=tropical-poncho` y la lista queda `["Tropical Poncho"]`; recarga: sin control (`10`, `10b`-`10d`).
- **Lateral:** `13` con una sección abierta solo "cerrar sección" (y cierra: lateral 0, URL igual); `14` lista de un área sin ningún "volver" en el texto del lateral.
- **Esc en dos niveles:** con la raíz expandida y el historial abierto, Esc cierra solo el historial; la raíz sigue `aria-expanded=true` (`11`).

## Gates

| gate | resultado |
|------|-----------|
| `npm test` | 257/257 (248 + 9 nuevos de `historial.test.ts`) |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0, solo los warnings previos (`threeObjects/*`, `<img>` de `Ficha.tsx`); ninguno en los archivos nuevos o tocados |
| Invariantes | motor sin React y React sin THREE; un canvas; la URL es la única fuente de la Vista (la excepción está documentada, D-51); 4 `nodeType`; sin cambios al modelo de datos; `thumb`/`viz_params`/vínculos intactos |

No se corrió `next build`. Neon y el 3000 del dueño no se tocaron; no se leyó ningún `.env*`. El 3003 aislado se cierra al terminar; `node_modules` y `public` del repo intactos.

## Decisiones de criterio propio (para que el dueño las revise)

1. **`history.go(delta)` en vez de `navegar(url)` al elegir un paso.** El plan decía `navegar()`; pero así la pila del navegador y la lista no se desalinean y no se apilan entradas. La coreografía es la del Atrás (misma `alPop`), no un `navegar` nuevo. Consecuencia: lo de adelante sigue en el botón Adelante, y el historial muestra solo lo de atrás.
2. **El chevron va a la izquierda del título** (convención de "atrás"), no a la derecha como en la referencia de Figma. A la derecha ya está el chevron de D-50; juntos se confunden. Cambia fácil: es CSS (`.historial` y el `left` del título).
3. **Sin historial no se muestra** (en vez de deshabilitado): evita un control apagado al lado del título de la home. Costo: el salto de 40px del título en el primer paso (riesgo 3).
4. **No rota al abrir** (para no parecerse a `⌄`); el estado abierto se marca con un círculo.
5. **Lateral:** borré el Volver y dejé "cerrar sección" solo cuando hay una sección abierta; las alternativas eran dejar "un paso atrás" (duplica el historial) o dejar la sección sin forma de cerrarse. También se perdió el "subir un nivel" del Volver viejo (`volverAlArea`: del panorama del área subía a la red de la dueña con el área enfocada): hoy se hace con la X del panel, el menú de áreas o el historial.
6. **Etiqueta "Red › Foco"** con `›`; truncada con elipsis si pasa de 380px. Cuando red = foco o no hay red: solo el nombre; home: "Sinápsis".
7. **Solo rutas de la app cuentan** (`/`, `/entidad/*`, `/obra/*`): una entrada del mismo origen que no lo sea (p. ej. `/api/...`) no aparece.
8. **Fondo de la lista** `rgba(10,10,10,.92)` con borde fino: a .78 se transparentaba la lista lateral de atrás y se leía mal (corregido tras la primera captura).
9. **Tope 20** como en el plan, sin configuración.
10. **Mobile:** botón de 44px y filas de 44px; el chevron queda entre la hamburguesa y el título (`left: 60px` si hay hamburguesa).

## Deviations from Plan

**1. [Criterio, ver decisión 1] `history.go` en lugar de `navegar()`** para elegir un paso. La regla "la coreografía no se rompe" se cumple por el camino del popstate; evidencia arriba.

**2. [Alcance] Commits.** Tres: módulo+tests, UI, documentación (más el de este SUMMARY y las capturas, aparte).

## Known Stubs

Ninguno.

## Threat Flags

Ninguno: sin endpoints, auth ni esquema nuevos. `navigation.entries()` y `history.state` son entrada del navegador del propio visitante: las URLs se filtran por ruta de la app y las etiquetas salen de los datos (el texto va como nodo de React, no como HTML).

## Pendiente para el dueño

- Revisar las decisiones de criterio, en especial 1, 2 y 5.
- Probar en un dispositivo real sin Navigation API (Safari/Firefox anteriores): el respaldo se midió forzando `navigation = undefined` en Chromium, no en esos motores.
- ADR de D-51 (y D-50) en Notion.

## Self-Check: PASSED

- Commits `1672054`, `851447f`, `7c33353` presentes; `commits: 3` medido contra `plan_head_before` `d23130c`.
- `src/lib/red/historial.ts`, `historial.test.ts` y `src/app/Historial.tsx` existen; `capturas/` con 18 capturas + `verificacion.jsonl`; `herramientas/verificar.mjs`.
