---
quick_id: 261117-nav1
type: quick
status: complete
plan_head_before: 0dc5be925a97bdc7925f0c7a475f1ee957f38e5f
plan_head_after: 070b6f05b91d9d8822b45ecc035ee2236dca0d45
commits: 5   # medido: git rev-list --count plan_head_before..plan_head_after (el commit docs de este SUMMARY va aparte)
actuals:
  tasks: 7
  commits: 5
key-files:
  modified:
    - src/app/Overlay.tsx
    - src/app/Ficha.tsx
    - src/app/Menus.tsx
    - src/app/BranchedMenu.jsx
    - src/app/BranchedMenu.css
    - src/app/Shell.tsx
    - src/app/CanvasSinapsis.tsx
    - src/styles/overlay.css
    - .planning/phases/04.1-expandir-nodo-y-secciones-derivadas/04.1-CONTEXT.md
    - .planning/PROJECT.md
---

# Quick 261117-nav1: Expandir inline, raíz sin panel, botones y lista lateral

## Decisión que afecta el futuro (D-50) — primero

**Expandir ya no abre una capa: despliega el contenido hacia abajo en el mismo panel, y la raíz de la red no tiene panel.** Reemplaza D-27/D-34 en lo que decían de la capa `.expandido` (D-38, D-39, D-42 siguen valiendo para el contenido). Registrada en `04.1-CONTEXT.md` (D-50) y en la tabla Key Decisions de `PROJECT.md`.

- **Qué se decidió.** `Ficha.tsx` es ahora solo el contenido (entradas, bloques configurables, créditos/portfolio con Próximos/Pasados); `Overlay` lo monta en `.desplegable` bajo los botones. Altura animada con `grid-template-rows: 0fr -> 1fr` (solo CSS); cerrado = `visibility: hidden` + `inert`. El estado sigue siendo de UI atado a la clave de la URL (D-34). Con el foco en la raíz (`enfocado === red`) no se muestra el panel; un chevron en el título fijo abre la misma expansión, y existe solo si `botonesDe` le daría Expandir a la raíz (una única regla).
- **Por qué.** Pedido del dueño: otra capa con el nombre repetido cortaba el recorrido y el negro sólido mostraba un corte al final del scroll.
- **Alternativas descartadas.** Mantener la capa y aclarar el fondo; animar `height` midiendo con JS; un panel distinto para la raíz (dos lugares para la misma regla); conservar el menú de secciones con scroll-spy de la cabecera.
- **Riesgos concretos (mientras no se resuelvan):**
  1. Mobile: el cajón crece hasta 78dvh sobre la escena y el puente **no relee el rect**. La cámara queda quieta (medido), pero si algo vuelve a pedir el área segura con el cajón abierto, el encuadre cambia.
  2. Una OBRA/EVENTO raíz sigue enfocada en el motor y **reserva el área segura del panel** aunque el panel no se muestre: queda un hueco a la izquierda (se ve en `despues-desktop-obra-lista.png`). Salida: tratar OBRA/EVENTO raíz como `entrado` en `CanvasSinapsis`.
  3. Se perdieron el menú de secciones y el scroll-spy de la ficha (columna única).
  4. El detalle (`/api/nodo/[id]`) se pide la primera vez que se expande ese nodo: hay un instante sin bloques.
- ADR en Notion pendiente (junto con D-27/D-34).

## Qué cambió, por punto

| # | Punto | Cambio | Commit |
|---|-------|--------|--------|
| 1 | Expandir inline | Ver D-50. Botón Expandir alterna con **Plegar** (`aria-expanded`/`aria-controls`, ícono UnfoldLess); Esc pliega; el panel scrollea por dentro; mobile: el cajón sube a 78dvh (`max-height` animado). Escena quieta y URL intacta (medido). Se conservan bloques, créditos, portfolio, entradas y Próximos/Pasados. | 61accba |
| 2 | Fondo no sólido | Velo `rgba(10,10,10,.3)` + `blur(5px)` (sin blur en mobile) con máscara que lo desvanece arriba, abajo (104px) y a los lados (a la derecha en 120px, para que no haya un borde recto donde termina el desenfoque); padding final de 120px. La opacidad del fondo del panel con el scroll ya no pasa de .62 (antes .9). Mobile: el borde superior del cajón también se desvanece (máscara 28px). | 61accba |
| 3 | Raíz sin panel | `visible` exige `!raiz \|\| expandido`; chevron en `.tituloRed` (gira al abrir, `aria-expanded`, deshabilitado mientras la cámara se mueve). Abierta, la raíz muestra tipo, bajada y contenido (el `h2` queda visualmente oculto); la X de la raíz pliega en vez de navegar. | 61accba |
| 4 | Entrar | Contorno fino: borde `rgba(255,0,128,.8)`, tinte `.1`, texto blanco, flecha `#FF0080` que se corre 3px al hover. Expandir sigue con borde blanco y sin relleno. Ver variantes abajo. | 6c46683 |
| 5 | Título mobile | `.tituloRed` pasa a wrapper (`<header>`) con el `h1`: franja de 60px arriba, una línea con elipsis, `z-index` 35 (menú de áreas 40, cajón 100), `left: 64px` si hay hamburguesa; el menú de áreas abre en `top: 68px`. Tipografía `clamp(18px, 5.2vw, 24px)` (a 28px "Tropical Poncho" se truncaba a "Tropical Pon..."). Tipo de `tituloRef` pasó a `HTMLElement` (Shell, Canvas, Overlay). | 73b4e66 |
| 6 | Lista lateral | `itemsDe` pasa el rol aparte (`rol`), sin " — " pegado. BranchedMenu: la hoja acepta `sub`, dibujado en segunda línea (11px, 42% de opacidad, una línea con elipsis); activo en negrita con el sub más claro; el marcador del riel toma el alto de la fila. Sin scrollbar, estilo BranchedMenu. Tercer cambio propio al componente, anotado en su cabecera. | 380d97f |
| 7 | Volver → X | `panel__cerrar`: icono Cancel01 de @hugeicons, `aria-label="Cerrar"`, arriba a la derecha de la columna del panel, `sticky` (sigue a la vista al scrollear), 44px en mobile. Estado vacío incluido. **Volver de la lista lateral: queda al final de la lista**, ahora como fila tenue en minúscula con chevron `‹`, alineada al riel (`.lateral__volver`); lo reemplaza 261117-nav2. | 61accba, 380d97f |

Además: la marca "Sinápsis" de abajo se oculta con la expansión abierta (se superponía al texto), y `Ficha` muestra el rol como segunda línea también en créditos/portfolio.

## Variantes del botón Entrar (skill `impeccable`)

Probadas inyectando CSS sobre el panel real (desktop 2x y mobile): `capturas/variante-{desktop,mobile}-*.png`.

- **A. Contorno fino con el acento, tinte .07, flecha rosa — ELEGIDA** (con tinte .1 y borde .8 por legibilidad sobre la malla clara). Conserva el acento de marca, se separa de Expandir por color y por el tinte, no grita.
- **B. Fondo traslúcido rosa `.24` + blur — descartada.** Mancha granate opaca; sigue siendo un botón "lleno", solo más oscuro, y el blur es decorativo.
- **C. Fondo neutro gris `.12`, acento solo en la flecha — descartada.** Es la más sutil, pero Entrar y Expandir quedan hermanos grises y se pierde la jerarquía; el acento de una flecha de 16px casi no se lee.
- **Actual (lleno `#FF0080`) — reemplazada** por ser demasiado chillona (pedido del dueño).

## Evidencia

Desde un `next dev -p 3003` aislado: copia de `src/` en el scratchpad (`node_modules` y `public` por junction, `TOPOLOGIA_FIXTURE=1`, fixture de los CSV con `herramientas/build-fixture.mts`). 1280x800 y 390x844 táctil, Chromium headless. Capturas en `capturas/` (`antes-*` del HEAD previo, `despues-*` finales, `variante-*`); datos crudos en `capturas/verificacion.jsonl` y `despues-resultados.jsonl`; scripts `herramientas/capturar.mjs`, `verificar.mjs`, `variantes-entrar.mjs`.

`verificar.mjs` (DOM + posición de la cámara, `window.__sinapsis.camera.position`), desktop y mobile:

- **Expandir inline** (`/entidad/rama-cerratto?red=tropical-poncho`): botón pasa a "Plegar" (`aria-expanded=true`), grupos Participaciones/Obras/Organizaciones; **cámara idéntica antes y después** (`camaraQuieta: true`) y URL igual. Desktop: rect del panel sin cambio de ancho (right 770 antes y después). Mobile: el panel pasa de top 556/288px a top 186/658px y la cámara no se mueve. Esc pliega (`inert: true`, `visibility: hidden`, alto 0, URL igual). La X cierra el panel y navega a `/` (sin historial previo).
- **Raíz sin panel** (`/entidad/tropical-poncho?red=tropical-poncho`): `panel--visible` ausente y `visibility: hidden` al entrar; chevron presente (`aria-expanded=false`). Al tocarlo el panel aparece con la expansión (`panel__nombre--oculto`, 1 bloque "Quiénes somos"), cámara igual, URL igual. La X pliega y vuelve a ocultar el panel sin navegar. Igual para una obra raíz (`/obra/soma?red=soma`): sin panel y con chevron.
- **Fondo sin corte**: `despues-desktop-expandido-fondo.png` y `despues-mobile-expandido-fondo.png` (scroll hasta el final): el texto se desvanece, se ve la malla de la escena detrás y no hay borde duro abajo, a la derecha ni arriba del cajón. Antes de ajustar, el borde del blur era recto en x=690 (desktop) y cortaba el nodo en el borde superior del cajón (mobile): se corrigió con el fundido lateral largo y la máscara del cajón.
- **Mobile título/menú**: `despues-mobile-menu-mobile.png` (menú de áreas abierto debajo de la franja, nada tapado) vs `antes-mobile-menu-mobile.png` (título de dos líneas encima del menú).
- **Lista lateral**: `despues-desktop-seccion-rol.png` / `despues-mobile-seccion-rol.png` vs `antes-*` (Participaciones de Rama: "Alterego" arriba, "Producción · DJ" abajo).
- Sin `pageerror` en ninguna corrida.

## Gates

| gate | resultado |
|------|-----------|
| `npm test` | 248/248 (sin cambios: ningún test fijaba la ficha ni los botones; `botonesDe` no se tocó) |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0, solo los warnings previos (`src/engine/threeObjects/*` y `<img>` en `Ficha.tsx`) |
| `impeccable detect` | 1 aviso (`transition: max-height` en el cajón mobile), anotado con `ponytail:` en el CSS |
| Invariantes | motor sin React, un canvas, URL = ancla, 4 `nodeType`, sin cambios al modelo de datos; fixes G-06 no tocados |

No se corrió `next build`. Neon y el 3000 del dueño no se tocaron; no se leyó ningún `.env*`. El 3003 quedó cerrado. No se agregaron tests: toda la lógica nueva vive en `Overlay.tsx`/CSS (la regla de qué expande sigue en `botonesDe`, ya cubierta).

## Decisiones de criterio propio (para que el dueño las revise)

1. **X siempre visible**, también cuando no hay historial: antes "Volver" se ocultaba sin historial; ahora la X lleva a `/` (`volver()` ya lo hacía). En la raíz abierta, la X solo pliega.
2. **Chevron solo si el foco está en la raíz.** Con otro nodo enfocado en esa red desaparece (el panel de ese nodo tiene su propio Expandir); para expandir la raíz hay que soltar el foco.
3. **Se perdió el menú de secciones / scroll-spy** de la ficha: no hay cabecera fija en un panel de 660px; el contenido va en una columna (bloques, luego créditos/portfolio). Las entradas de un evento futuro quedan arriba del contenido.
4. **La fecha de una obra/evento pasado** (D-48) aparece junto al tipo (`FESTIVAL · 2026`) solo con la expansión abierta, para no cambiar el panel cerrado.
5. **Un solo control para plegar**: el botón Expandir se vuelve Plegar (más Esc y la X de la raíz). No agregué un "Plegar" al final del contenido; con un portfolio largo hay que volver arriba (o Esc).
6. **Volver de la lista lateral**: se queda al final de la lista pero como fila tenue en minúscula con chevron, no como botón; lo reemplaza nav2.
7. **Tamaños**: título mobile 18-24px (más chico que el "grande" anterior para que entre en una línea con el chevron), panel mobile expandido a 78dvh, tope del fondo del panel .62.
8. **Sin blur en mobile** para el velo (evita el corte en el borde del cajón); desktop usa blur de 5px.
9. **`aria-live="off"`** en la expansión para que el lector de pantalla no lea todo al abrir.
10. **Rol** en créditos/portfolio también como segunda línea (no solo en la lista lateral), por consistencia con el punto 6.

## Deviations from Plan

**1. [Rule 1 - Bug] `tsc` falló al convertir el título a `<div>`** (`RefObject<HTMLElement>` no asignable a `HTMLDivElement`); se cambió el wrapper a `<header>` y se amendó el commit 73b4e66 (propio, sin push) antes de seguir.

**2. [Alcance] Commits.** Cinco en vez de uno por punto: 1, 2, 3 y 7 comparten Overlay/Ficha/overlay.css y no se podían separar sin `add -p`. 4, 5, 6 y la documentación van aparte.

## Known Stubs

Ninguno.

## Threat Flags

Ninguno: sin endpoints, auth ni esquema nuevos; el `fetch` de `/api/nodo/[id]` es el existente.

## Pendiente para el dueño

- Revisar las decisiones de criterio de arriba, en especial 2, 3 y 5.
- Hueco a la izquierda en una obra/evento raíz (riesgo 2 de D-50): decidir si se trata como "entrado" en el puente.
- 261117-nav2 (historial) reemplaza el Volver de la lista lateral.

## Self-Check: PASSED

- Commits `6c46683`, `380d97f`, `73b4e66`, `61accba`, `070b6f0` presentes; `commits: 5` medido contra `plan_head_before` `0dc5be9`.
- `capturas/` con `antes-*`, `despues-*` y `variante-*`; `herramientas/` con los tres scripts y `build-fixture.mts`.
- 3003 sin listeners; `node_modules` y `public` del repo intactos.
