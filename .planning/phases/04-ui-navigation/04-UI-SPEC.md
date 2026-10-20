---
phase: 4
slug: ui-navigation
status: approved
reviewed_at: 2026-09-20
shadcn_initialized: false
preset: none
created: 2026-09-20
---

# Fase 4 — Contrato de diseño UI

> Contrato visual y de interacción. Fuente: 04-CONTEXT.md (decisiones D-xx, bloqueadas), CSS de la web original (`collectiveConscience`) y `src/styles/`. Lo marcado **(default, reajustable)** lo eligió la investigadora sin consulta; lo demás viene de CONTEXT o de tokens medidos en el CSS existente.

---

## Design System

| Propiedad | Valor |
|-----------|-------|
| Tool | none (sin shadcn; no se instala librería de componentes) |
| Preset | no aplica |
| Component library | none: Tailwind (ya en el repo) + CSS custom properties |
| Icon library | none. Hamburguesa y cerrar son texto/CSS; íconos de enlaces externos reusan `/icons/*.png` (`.ico .ig .fb .spotify .web .wpp .youtube`, 32x32) |
| Font | Briller (títulos, menú, botones) y Gotham (cuerpo), ya cargadas desde `/fonts` vía `src/styles/fonts.css`. Fallback `sans-serif` |

Reglas de reuso:
- Se reusan tal cual las clases de `src/styles/index.css`: `.bn`, `.bnfocus`, `.floatingMenu`, `.lateralFloatingMenu`, `.floatingTitle`, `#hamburger`, `.ico`. No se reescriben; se extienden solo lo necesario.
- `.floatingInfo` (tarjeta flotante con glow) **no se usa** para el panel: contradice UI-09 (panel a la izquierda ocupando 62% con degradado, no tarjeta). Se define `.panel` nuevo (abajo).
- Tailwind se usa para layout y utilidades dentro de los componentes nuevos; los tokens de color/tipografía van como CSS custom properties en `:root` (los `--ColorPalette-*` ya existen en `style.css`).
- Corrección necesaria: `globals.css` hoy pone `--background:#ffffff` en modo claro. La app es siempre oscura: fijar `--background: #0a0a0a; --foreground:#ffffff` sin `prefers-color-scheme`, y quitar `text-center` del `<body>` (el panel es alineado a la izquierda, D-00a). `<html lang>` pasa a `"es"`.

---

## Layout y capas

| Capa | z-index | Contenido |
|------|---------|-----------|
| Canvas 3D | 0 | Permanente, `position: fixed; inset: 0`, montado en `layout.tsx` sobre el router (UI-08). Nunca se desmonta |
| Panel (`.panel`) | 30 | Overlay de la ruta. Aparece después de que la cámara llega (D-17) |
| Menú superior `.floatingMenu` | 40 | Ya definido en la web original |
| Título `.floatingTitle` | 60 | `pointer-events: none` |
| Menú lateral `.lateralFloatingMenu` | 100 | |
| Hamburguesa `#hamburger` | 120 | Solo mobile |
| Ficha expandida `.expandido` | 150 | (enmendado en 4.1, ver D-34) Por encima de todo el overlay y del canvas; el overlay base queda `inert` debajo. Carga inicial `.cargando`: 200 |

- Los overlays son `pointer-events: none` en su contenedor y `auto` solo en los elementos interactivos, para que el canvas reciba drag/zoom/click en las zonas libres.
- **Área segura:** el contenedor del panel es el que mide el puente (`getAreaSegura`). Escritorio: rect libre = derecha, a partir del 62% del ancho. Mobile: rect libre = franja superior sobre la banda inferior. Cuando el panel crece con el scroll, el área segura cambia cuadro a cuadro y el degradado se oscurece (ver Panel).
- **Punto focal:** en la home, la red más el título. En modo foco, el nodo enfocado dentro del área segura, junto al Heading del panel.

---

## Spacing Scale

Múltiplos de 4. El CSS original usa 8/10/12/18/24/32 sueltos; en el código nuevo se normaliza a esta escala.

| Token | Valor | Uso |
|-------|-------|-----|
| xs | 4px | Gap del menú lateral entre ítems, separación ícono-texto |
| sm | 8px | Gap de sub-botones en móvil, padding de ítem lateral |
| md | 16px | Padding base del panel en mobile, gap entre botones (el original usa 12px; se pasa a 16) |
| lg | 24px | Padding lateral del panel en escritorio; margen del menú lateral al borde (original: 24px) |
| xl | 32px | Separación entre bloques del panel (créditos / texto / galería) |
| 2xl | 48px | Padding superior del panel bajo el menú en escritorio |
| 3xl | 64px | Espacio inferior final del scroll de la ficha |

Excepciones:
- Touch target mínimo 44px de alto en botones y ítems de menú en mobile (aplica `padding` mayor, no cambia la escala).
- `.bn` conserva su `padding: 0.9em 1.6em` original (relativo a la fuente, no a la escala).
- Los porcentajes del original (`top: 2%`, `13%`) se mantienen en los contenedores `.floatingTitle`/`.floatingMenu` ya existentes.
- Medidas no espaciales (no son tokens de spacing): bordes de 1px y 2px, `minmax(160px, 1fr)` en la grilla de la galería, medida de texto `65ch`.

---

## Typography

Exactamente 4 tamaños (**14, 18, 26, 36px**) y 2 pesos (400, 500).

| Rol | Tamaño | Peso | Line height | Fuente / origen |
|-----|--------|------|-------------|-----------------|
| Cuerpo (descripción, texto largo, créditos) | 14px | 400 | 1.5 | Gotham; se unifica con Label (el original usaba 15px) |
| Label (botones `.bn`, roles de crédito, `.node-label` uppercase) | 14px | 500 | 1.2 | Briller; `.bn` original 14px/500 |
| Ítem activo del lateral (`.lateralFloatingMenu .bn.bnfocus`) | 18px (escritorio, enmendado: 26px, ver Notas) | 500 | 1.2 | Briller; original 18px |
| Heading (nombre del nodo en el panel, `.subtitle`) | 26px | 400 | 1.2 | Briller; `.subtitle` original 26px |
| Display (`.floatingTitle`, título de la home, `.bnfocus` del menú superior) | 36px escritorio / 26px mobile | 400 | 1.2 | Briller |

Notas:
- Ningún otro tamaño en CSS, tokens ni ejemplos.
- Solo se declaran los pesos 400 y 500 (los que usa el original); no se introduce semibold. El énfasis se logra con tamaño y color, no con peso.
- Excepción heredada: `.bnfocus` del menú superior usa 36px (Display) y el del lateral 18px; `.node-label` pasa a 14px uppercase.
- (enmendado tras el UAT 2, ver D-24/D-25) En escritorio, el ítem activo del menú superior pasa de 36 a **26px** (peso 400, mayúsculas, color del dato) y los ítems de la lista lateral van en **26px**, peso 400, mayúsculas, como en la captura de diseño del dueño. No suma tamaños nuevos: 26px ya está en la escala (Heading). El título de la entidad (`.tituloRed`) va en mayúsculas con `clamp(22px, 2.3vw, 32px)` en una línea con elipsis: es el tamaño del título de red existente, ajustado al ancho (04-12, Deviation 1; fuera de la escala de 4, queda marcado para el dueño).
- Texto alineado a la izquierda en todo el panel. **Sin `text-align: justify`** (el original lo usa; se descarta por UI-09).
- Subtipo del nodo: rol Label, `text-transform: uppercase`, `letter-spacing: 0.5px`, color en 70% de opacidad del blanco.

---

## Color

Fondo casi negro, texto blanco (constraint). Split 60/30/10:

| Rol | Valor | Uso |
|-----|-------|-----|
| Dominante (60%) | `#0a0a0a` (`--background`) | Fondo de body y del canvas. `--ColorPalette-Negro #111111` existe pero no se usa como fondo |
| Secundario (30%) | `rgba(0,0,0,0.6)` a `rgba(0,0,0,0.75)` + `rgb(46,46,46)` | Degradado del panel, fondo del menú lateral (`linear-gradient(180deg, rgba(0,0,0,.75), rgba(0,0,0,.6))`), relleno de `.bn` (`rgb(46,46,46)`), borde `1px solid rgba(255,255,255,0.08)` |
| Acento (10%) | `#FF0080` (fucsia del original en `button::after` y glow) | Ver lista |
| Destructivo | ninguno | La fase no tiene acciones destructivas |
| Texto | `#FFFFFF`, secundario `rgba(255,255,255,0.7)` | Cuerpo y metadatos |

Acento reservado exclusivamente para:
1. Anillo de `:focus-visible` de todo elemento interactivo (2px `#FF0080`, offset 2px).
2. Borde animado del botón en `:hover` (`button::after` original).
3. Botón del nivel padre "iluminado" en el menú cuando hay un nodo enfocado (D-11).
4. Barra fina de carga inicial (ver Estados).

Colores por área (`--ColorPalette-Turquesa #8AE2C8`, `Cian #578CCB`, `Violeta #9900FF`, `Fuccia #FF0074`, `Amarillo #FFBC00`) tiñen **solo** el texto de `.bnfocus` del ítem activo del menú, como en el original. Quedan fuera del 10% de acento y solo aplican mientras un agrupador esté activo. Mapeo por id de agrupador hardcodeado en el original (`#nosotres`, `#obras`...): **no se porta**; el color sale del dato (`viz_params`/color del nodo) y, si falta, cae a blanco.

### Degradado del panel (UI-09)
- Escritorio: `.panel { width: 62vw; left: 0; top: 0; height: 100%; background: linear-gradient(to right, rgba(0,0,0,var(--panel-alpha)) 0%, rgba(0,0,0,var(--panel-alpha)) 70%, rgba(0,0,0,0) 100%); }`.
- Mobile: `bottom: 0; width: 100%; background: linear-gradient(to top, ...)` con el mismo criterio.
- `--panel-alpha` va de `0.55` (resumen, panel corto) a `0.9` (ficha extendida scrolleada). Se actualiza desde el mismo dato del área segura (por cuadro, sin transición CSS propia) para que el degradado se oscurezca al crecer el panel. Default (reajustable).
- Sin `backdrop-filter` en el panel (cuesta GPU y el techo del proyecto es la GPU, PERF-01). `backdrop-filter: blur` solo se permite en el menú lateral (heredado del original).

---

## Componentes y comportamiento

### 1. Home (`/`)
- Sin panel. Título de la red en `.floatingTitle` (Display), centrado arriba, texto: **"Sinápsis"** con bajada opcional en Cuerpo: "Red social para creadxrs y obra colectiva".
- El título se oculta con `.title-hidden` (opacity 0, 0.6s) al enfocar un nodo, como el original.
- No hay menú de agrupadores en la home; el título flota solo. Ponytail: filtros y "cómo ver" son D-07, diferidos; el diseño deja libre el centro superior para agregarlos.
- Muestra una fracción de la red (D-06). Ningún control extra en la home.

### 2. Menú superior `.floatingMenu`
> (enmendado tras el UAT, ver 04-UAT-GAPS.md y D-09) Tocar un área la **enfoca** (panel del área con "Entrar a {área}"); el botón del panel la carga. El dueño decidió que el menú **queda visible** con el área activa (punto abierto 7, UAT 2); es el gap G-10.
>
> (enmendado tras el UAT 2, ver D-24/D-25) Los ítems son las áreas de la **entidad de contexto**: la red si es una ENTIDAD, o la entidad dueña si la red es un área (AGRUPACION destino de un COMPONE saliente de la entidad). El menú está visible al previsualizar un área y adentro de ella. El activo es el área en la que se está o la que se previsualiza: **26px**, peso 400, color del dato (`vizParams.color`, blanco si falta) y `aria-current="true"` (no se comunica solo por color); los ítems van en **mayúsculas en escritorio**. Desde adentro de un área, tocar otra área la previsualiza en la red de la dueña (`/entidad/<área>?red=<dueña>`, reemplazo); tocar el área actual no hace nada. **Mobile:** adentro de un área el menú queda oculto (la hamburguesa abre solo el lateral); al previsualizar un área la hamburguesa aparece y el menú vuelve a ser el de la entidad.

> (enmendado en 4.1, ver 04.1-CONTEXT.md D-36) En una red **sin áreas reales** el menú lista las **secciones derivadas de los roles** de la red (D-32), con el mismo componente (`MenuSuperior`) y los mismos estilos: activa = la sección abierta, con el color del nodo dueño y `aria-current="true"`. Con áreas reales, el menú es el de las áreas, sin cambios; en la home, no hay menú. En escritorio es **una sola línea que scrollea en horizontal** sin barra visible (Tempistica I tiene 14 secciones) y no pisa el título. El menú ya no arranca en `46vw` ni envuelve: la fila queda desde `38vw` hasta el borde derecho, a la altura del nombre de la entidad (en mayúsculas, una sola fila).

- Escritorio: fila a la derecha del título (arranca en `46vw`, envuelve en dos filas si no entra), `gap 2px`, ítems = agrupadores de la entidad de contexto (D-09), renderizados desde la topología (UI-06). Ítem = `.bn`; el activo pasa a `.bnfocus` (26px, color del área; antes 36px).
- Mobile (<=800px): `#hamburger` arriba a la izquierda (48px, blanco, `aria-label="Abrir menú"`, `aria-expanded`). Despliega el menú hacia abajo (`.menu-open`, `top: 10%`, transición 0.5s). Con nodo enfocado muestra solo el botón activo; el del nivel padre queda iluminado con acento (D-11).
- Sube a `top: 2%` cuando el título se oculta (transición 0.6s, del original).

### 3. Menú lateral `.lateralFloatingMenu` (D-10)
> (enmendado tras el UAT, ver 04-UAT-GAPS.md y D-22/D-23) La lista es lo **visible** de la red, incluidos los nodos sumados al recorrer (créditos, "Sumar sus obras"): es la alternativa navegable del canvas. Las áreas no se listan (van en el menú superior). VOLVER conserva lo sumado.

> (enmendado tras el UAT 2, ver D-24/D-25) **VOLVER sube un nivel**: con otro nodo enfocado vuelve al panorama del área (conserva lo sumado); en el panorama sube a la red de la entidad dueña con el área enfocada (reemplazo, la cámara sale de la neurona, D-18; lo sumado se borra por el cambio de red, D-22). VOLVER va **arriba** de la lista y siempre dentro del viewport. En escritorio los ítems van en **26px**, peso 400, mayúsculas, blanco al 90 %, sin el riel vertical de BranchedMenu (como en la captura de diseño), y la lista scrollea dentro del viewport (`overflow-y: auto`, ancho 340px). `navegar` ya no apila una entrada con la URL actual.

> (enmendado en 4.1, ver 04.1-CONTEXT.md D-37) El mismo menú lista también los **nodos de una sección abierta**: tocar una sección del menú superior abre a la izquierda la lista de sus nodos (los mismos estilos de BranchedMenu, sin restyle; en "Otros" cada ítem lleva " — rol"). La escena no cambia al abrirla; tocar un nodo de la lista lo enfoca (aditivo, D-22/D-23). **VOLVER cierra la sección** (y, si el foco era otro nodo, vuelve a enfocar la raíz de la red) en vez de subir de red. La sección es estado de UI atado a la red: no va en la URL, Atrás no la cierra y se descarta al cambiar de red. En mobile abrir una sección abre el cajón con su lista; con una sección abierta la hamburguesa abre solo la lista.

- Aparece al entrar a una sub-red. Lista de nodos de la sub-red (mismo dato que el grafo) + botón **VOLVER** arriba de la lista.
- Escritorio: fijo a la izquierda, `left 24px`, centrado vertical, `min-width 200px`, `border-radius 12px`. Convive con el panel (el panel se corre: `padding-left` del panel = ancho del lateral + 24px cuando ambos están visibles). Default (reajustable).
- Mobile: drawer full-height desde la izquierda (`translateX(-110%)` oculto), `min-width 240px`, cerrar con `.close-lateral` (32x32, `aria-label="Cerrar lista"`).
- Ítem activo = `.bnfocus` (18px). Ítems son `<button>`; la lista es `<nav aria-label="Nodos de la red">`.

### 4. Panel de foco `.panel` (D-01, D-12, D-15)
> (enmendado tras el UAT, ver 04-UAT-GAPS.md y D-03) Al enfocar otro nodo el orden es: **el panel sale** con el contenido viejo (0.3 s) → **cambia el contenido** ya oculto → **se mueve la cámara** → **el panel entra** (0.6 s). Reemplaza el cross-fade de contenido de abajo. Excepción: si solo cambia lo sumado ("Sumar sus obras") el panel no se oculta ni se mueve la cámara.

> (enmendado en 4.1, ver 04.1-CONTEXT.md D-35) **Panel fluido en escritorio:** el contenido (`.panel__contenido`) ocupa el ancho libre entre el borde izquierdo (o el lateral) y la neurona: `width: min(100%, var(--columna-texto))` con `margin-inline-start: var(--panel-margen)`. `.overlay` define `--columna-texto: 660px` (UI-11, la misma de la ficha) y `--panel-margen: 0` (alineado a la izquierda por defecto; con `auto` se alinea contra la neurona). El lateral conserva su ancho (260px) y el panel cede el ancho que le queda. Reemplaza los 420px alineados a la derecha. Nombre 34px, subtipo 16px y descripción 18px en escritorio; el diseño final de tamaños es de Figma.

> (enmendado en 4.1, 04.1-05/06, ver 04.1-CONTEXT.md D-44) **Preview de un EVENTO futuro** (fecha de hoy en adelante contra la fecha local del visitante, decidido en el cliente): debajo del subtipo, `.panel__cuando` con la fecha con día y el horario ("sábado, 31 de octubre · 22–04hs"; 18px, 22px en escritorio) y, si el evento tiene espacio, `.panel__lugar`, un `<button>` con el nombre del espacio que lo enfoca con aditivo (misma red, D-22/D-23). El espacio es el primer nodo de la sección `lugar` de `roles.json`. El horario viaja en la topología (`NodoGrafo.horario`); el preview sigue sin pedir nada al servidor. Un evento pasado, una obra y una entidad no cambian. Entradas no va en el preview (pregunta abierta del UAT).

Contenido, en este orden, alineado a la izquierda, columna con padding `48px 24px 24px` (escritorio) / `16px` (mobile):
1. Nombre (Heading 26px).
2. Subtipo (Label uppercase, 70% blanco).
3. Descripción breve (Cuerpo). Dato ya viajando en topología; no se pide nada al servidor.
4. Fila de botones (`.infoButtons` original: flex, gap 16px; mobile columna, gap 8px, ancho 100%).

Comportamiento:
- Aparece solo cuando la promesa de `setVista` resuelve (cámara llegó): fade de `opacity` 0 → 1 en 0.6s (transición original) más `translateX(-16px → 0)` (mobile: `translateY(16px → 0)`). Nunca antes (D-17).
- Al enfocar otro nodo (D-03) el panel **no cambia de lado**: cross-fade del contenido (0.3s), se mantiene el contenedor.
- Al volver (D-18), el panel sale primero (opacity 0, 0.3s) y recién ahí arranca la animación inversa de cámara.
- Foco de teclado: al aparecer, el foco pasa al heading del panel (`tabindex="-1"`); `Esc` equivale a Volver.
- `role="region"` con `aria-labelledby` = id del heading; `aria-live="polite"` en el contenedor para anunciar el cambio de nodo.

### 5. Tipos de botón (D-02)
> (enmendado tras el UAT, ver 04-UAT-GAPS.md, D-16 y D-22) Se suma la acción `sumar` y `entrar` carga con reemplazo también para ENTIDAD (la tabla de abajo dice "ENTIDAD = filtrado": ya no).

> (enmendado en 4.1, ver 04.1-CONTEXT.md D-33 y D-36) **Los botones salen de los datos, no del `nodeType`.** `expandir` aparece en una OBRA o EVENTO que no es stub y tiene al menos una sección; la etiqueta es **"Expandir"** y no cambia al abrir (la ficha tiene su propio Volver; "Ver más / Ver menos" y el panel que crece ya no existen). `entrar` aparece si el nodo compone algo (un COMPONE que sale de él) o tiene secciones, **para los cuatro `nodeType`**, siempre con reemplazo (zoom in); una OBRA o un EVENTO entra a `/obra/<slug>`, con su panel y el foco puesto. Un área sin miembros no ofrece Entrar. Orden: Expandir, Entrar a {nombre}, Sumar sus obras. `hijos` ya no existe en el contrato (nadie lo leía).

Un "tipo de botón" es un dato `{ etiqueta, accion, destino? }`. La lista de acciones es abierta; el contrato de esta fase define tres:

| Acción | Nodo por defecto | Etiqueta por defecto | Efecto |
|--------|------------------|----------------------|--------|
| `expandir` | OBRA | **Ver más** | Extiende el panel hacia abajo con scroll (ficha extendida). Al abrir cambia a **Ver menos** |
| `entrar` | ENTIDAD, AGRUPACION | **Entrar a {nombre}** (o **Entrar** si no hay destino) | Carga la sub-red con la transición por defecto: reemplazo para ENTIDAD y AGRUPACION (enmendado, D-16; antes ENTIDAD = filtrado). Confirmado por el dueño (UAT 2) |
| `sumar` | ENTIDAD con obras o eventos fuera de la escena | **Sumar sus obras** | Agrega a la red visible las obras y eventos de la entidad (D-22). No navega, no cambia la URL, no es paso de historial y no oculta el panel. No se ofrece estando "entrado" ni cuando no queda nada por sumar |
| `enlace` | cualquiera con URL | etiqueta del dato (ej. "Sitio web") | Abre en pestaña nueva, `rel="noopener noreferrer"`, ícono `.ico` cuando el destino es conocido |

- Estilo: `.bn` (relleno `rgb(46,46,46)`, `border-radius 32px`, glow arcoíris en hover, 14px/500). Primario y secundarios comparten estilo; el primario va primero. No hay variante "destructivo".
- **Volver** en el panel es un `.bn` que aparece cuando hay historial dentro de la app (el botón atrás del navegador hace lo mismo, UI-05).
- Estados: hover (glow), `:focus-visible` (anillo acento), `:active` (borde 5px original), `disabled` (opacity 0.4, sin glow), `aria-busy="true"` mientras la promesa de `setVista` está pendiente.

### 6. Ficha extendida de OBRA (D-13)
> (enmendado en 4.1, ver 04.1-CONTEXT.md D-27, D-32, D-33 y D-34) La ficha es hoy la **capa expandida de la variante A**, no un panel que crece (el texto de abajo describe el contrato original; vale lo siguiente, que lo reemplaza):
> - **Capa:** `position: fixed; inset: 0; z-index: 150` (por encima del overlay y debajo del loader de 200), `role="dialog"`, `aria-modal="true"`, `aria-labelledby` al nombre. Estado de UI: no toca la URL ni el historial; la cámara queda quieta porque el panel sigue maquetado debajo (`visibility: hidden`, sin `transform`) y el puente lee el mismo rect. Cualquier cambio de URL la cierra.
> - **Cabecera fija** (`position: sticky`, 100px escritorio / 64px mobile): nombre del nodo, menú de **secciones** derivadas de los roles (D-32; scroll-spy con `aria-current` y el color del nodo dueño; en mobile se desliza en horizontal) y **Volver** a la derecha.
> - **Portada** (mín. 55vh): tipo y fecha larga (`subtipo · 21 de enero de 2023`) y la bajada (`descripcionBreve`, 26px). Debajo, el **bloque** de contenido con el borde superior fundido (degradado de transparente a `#0a0a0a`), que sube con el scroll sobre la escena.
> - **Columna de 620-680px** (`--columna-texto: 660px`, `--panel-margen`, la misma que el panel): texto largo (`white-space: pre-line`, nunca HTML), **secciones** (título con el color del dato; cada nombre es un `<a>` a la ruta del nodo que entra a esa sección, D-37; " — rol" en Otros), galería, enlaces y video, en este orden. Bloques sin dato se omiten. El padding inferior deja subir la última sección hasta la cabecera.
> - **Teclado:** Esc en dos niveles (con la ficha abierta la cierra; si no, hace Volver); Tab no sale de la capa; al cerrar, el foco vuelve al nombre del panel.
> - **Reemplaza los "Créditos"** de la lista de abajo: los créditos son las secciones.

> (enmendado en 4.1, 04.1-05/06, ver 04.1-CONTEXT.md D-38, D-39, D-42 y D-44) **La ficha por bloques, que reemplaza lo anterior donde difiere:**
> - **Cabecera:** nombre, el menú de **bloques** de contenido (no de secciones por rol) y Volver. El menú aparece **solo con dos o más bloques**; con uno o ninguno queda el nombre y Volver. Scroll-spy y `aria-current` sobre los bloques.
> - **Bloques (columna izquierda, 620-680px):** lista ordenada que el servidor resuelve contra `src/lib/red/bloques.json` (por `nodeType` o `nodeType:subtipo`) o contra `metadata.ficha.bloques` del nodo. Cuatro tipos: texto (`white-space: pre-line`, nunca HTML), galería, video (`youtube-nocookie`, `title="{nombre} de {label}"`) y enlaces. Cada bloque lleva su nombre como `h3`. Sin datos, no hay bloque ni título vacío; un nodo sin bloques deja la columna izquierda vacía bajo la portada (pregunta abierta del UAT).
> - **Créditos (columna derecha):** `<aside>` "Créditos" con las mismas secciones por rol de `seccionesDe`, un grupo por sección con el color del dato; `position: sticky; top: 120px`, ancho `clamp(240px, 26vw, 340px)`, scroll propio sin barra visible, `gap` de 64px con los bloques. Cada nombre entra a esa sección (D-37). Sin secciones, la columna no se dibuja. Entre 801 y unos 1100px la columna de bloques baja de 620px (598px a 1024) para dejarle lugar.
> - **Portada de un evento futuro:** tipo (solo el subtipo), `.expandido__cuando` (fecha con día y horario, 34px; 24px en mobile), el espacio como `<a>` que entra a la sección "Espacio" con el nodo enfocado (24px; 18px en mobile), la bajada y el bloque **Entradas** (`h3`, el texto y, si hay url, un enlace externo `.accion` con `target="_blank"` y `rel="noopener noreferrer"`, etiqueta del dato o "Conseguir entradas"). Un evento pasado muestra "subtipo · fecha larga" y no muestra Entradas. Sinápsis no vende ni cobra: el llamado es texto y un enlace a quien vende.
> - **Animación al abrir (D-42):** ver Transiciones.

Se abre con `expandir`; el panel crece hacia abajo y el contenido interno hace scroll (`overflow-y: auto`, `max-height: 100dvh` escritorio / `70dvh` mobile, `overscroll-behavior: contain`). Bloques separados por 32px, en este orden:
1. **Créditos:** lista `nombre — rol`. Cada nombre es un `<button>` (o link a `/entidad/[slug]`) que enfoca el nodo (D-03, UI-04). Rol en Label, 70% blanco.
2. **Texto descriptivo largo** (Cuerpo, medida máxima `65ch`).
3. **Galería de imágenes:** grilla `grid-template-columns: repeat(auto-fill, minmax(160px,1fr))`, gap 8px, `loading="lazy"`, `alt` obligatorio desde el dato (si no hay, `alt=""` decorativo). Las claves `thumb` son relativas: la URL se arma con la constante de base (invariante de CLAUDE.md), nunca guardada completa. Sin lightbox en esta fase (default, reajustable).
4. **Enlaces externos:** botones tipo `enlace`.
5. **Video (opcional):** `<iframe>` de YouTube solo si el dato trae el id. `src="https://www.youtube-nocookie.com/embed/{id}"`, `aspect-ratio: 16/9`, `width: 100%`, `title="Video de {nombre}"`, `loading="lazy"`, `allowfullscreen`. Si no hay id, no hay bloque (ni título vacío).

Bloques sin dato **se omiten** (sin título "Galería" vacío).

### 7. Nodo stub / sin descripción (D-15)
Panel mínimo: solo el nombre (Heading) y el subtipo. **Sin** descripción, **sin** botón `expandir`, **sin** aviso de "perfil pendiente". Si el nodo es ENTIDAD/AGRUPACION con sub-red, el botón `entrar` sigue apareciendo.

### 8. ENTIDAD (`/entidad/[slug]`, UI-03, D-14)
Mismo panel de foco. Las obras producidas no se listan en el panel: aparecen en la red al entrar y en el menú lateral. La página acepta `?prof=N` (D-04, D-08) y no contiene código específico de Tropical Poncho.

(enmendado tras el UAT 2, ver D-24/D-25) **Vista de entrada (D-24):** una entidad que COMPONE al menos un área entra como la raíz más sus áreas (nada más), unidas por vínculos virtuales punteados derivados de sus miembros (miembro de una con vínculo real a miembro de otra, o miembro compartido; un vínculo curado entre áreas reemplaza al derivado). **Fallback:** una entidad sin áreas (una persona), o con `?prof=N` explícito, entra a la Vista general (profundidad 2, entidades y áreas relacionadas, con puentes); `?prof=2` en Tropical sirve de acceso a lxs colaboradorxs. Las obras aparecen al entrar al área que las compone (corrige el drift de D-14 existente desde 04-02). Con la base de hoy la entrada de Tropical no muestra vínculos entre áreas (solo Obras tiene miembros): es hueco de curaduría, no de código.

(enmendado en 4.1, 04.1-05/06, ver 04.1-CONTEXT.md D-45) **El fallback de arriba cambió.** Una entidad sin áreas (persona, espacio, productora, banda) **con al menos un vecino OBRA o EVENTO** y sin `?prof` entra con la raíz y sus propios eventos y obras a un salto, por cualquier vínculo, con los vínculos reales entre ellos (los `PRECEDE` de sus series) y **sin otras personas** ni puentes: Keuken Aonikenk 5 nodos, Espacio Ave Fenix 5, Rama Cerratto 10, Club Weyba 3 (sobre los CSV). Sin eventos ni obras, o con `?prof=N`, queda la Vista general de antes (profundidad 2, entidades y áreas, con puentes; `?puentes=1` prende los puentes también en la nueva). A las personas se llega entrando a un evento o una obra, desde los créditos de la ficha, o con `?prof=2`. Una entidad con áreas, un área, una obra y un evento no cambian (D-24, D-25, D-36). Con más de 40 eventos u obras corta el peso de `resolverVista` y no la fecha (hoy el máximo es 9).

---

## Transiciones y estados de carga

Orden estricto de cada navegación (UI-10): **(1)** cambia la ruta/URL → **(2)** `setVista` + cámara → **(3)** aparece el panel al resolver la promesa.

> (enmendado tras el UAT, ver 04-UAT-GAPS.md) Con el panel visible, entre (1) y (2) el panel sale con su contenido viejo y cambia ya oculto (ver §4). Además:
> - **Entrar** (ENTIDAD o área): vuelo de la cámara a la neurona (`FADE_DURATION`, 300 ms) → negro → llegada con zoom in desde `ENTRADA_FACTOR` (2,5) veces la distancia de encuadre hasta el encuadre, en `ENTRADA_DURACION` (1200 ms), mientras el negro se retira. Perillas del motor (`constants.js`), no configuración de producto.
> - **Volver** (D-18): la inversa; la cámara arranca dentro de la neurona y sale hasta el encuadre de foco.
> - **Un crédito** suma al colaborador a la red visible con `aditivo`, con sus vínculos reales (D-22/D-23); la cámara llega a un nodo con coordenadas finitas (nunca a NaN).

| Momento | Estado UI |
|---------|-----------|
| Inicio de app (hoy negro un rato) | Fondo `#0a0a0a`, wordmark "Sinápsis" centrado en Display con `opacity` pulsando 0.4 ↔ 1 (1.5s) y barra de 2px de acento abajo. Se retira con fade 0.6s cuando el motor reporta el primer cuadro con nodos. Default (reajustable) |
| Cámara en movimiento | Panel anterior ya oculto; botones deshabilitados; se mantiene el cursor normal mientras carga; la barra de progreso es el único indicador de carga |
| Cámara llegó | Panel fade-in (0.6s) |
| Volver / atrás del navegador | Panel sale (0.3s), luego animación inversa (D-18) |
| Nodo no encontrado (slug inválido) | Se muestra la red completa/home y un aviso en el panel: ver Copywriting |
| Error de topología (endpoint caído) | Panel mínimo con mensaje y botón `Reintentar`; el canvas queda como esté |

> (enmendado en 4.1, 04.1-05/06, ver 04.1-CONTEXT.md D-42) **Expandir se anima solo con CSS y sin tocar la cámara ni el rect del panel:** la portada y el cuerpo suben desde abajo (`subir`, 700 ms, `cubic-bezier(.22, 1, .36, 1)`), la capa `.expandido` pinta un velo hasta `rgba(10,10,10,.5)` (`velo`, 700 ms), la cabecera se funde (400 ms), y cada línea de la portada, cada bloque y cada grupo de créditos entra con fundido y 16px de desplazamiento (`aparecer`, 500 ms) escalonado por `--i` con tope de 8 pasos (250 ms + 70 ms por paso). El overlay base se funde con una animación `salir` (300 ms; keyframe final `opacity: 0; visibility: hidden`) y no con transiciones, para no pisar las suyas. `.expandido` no lleva `transform` (es el contenedor de scroll y su `sticky` tiene que seguir). El cierre es inmediato (D-34). Diferidos: revelado por scroll y animación de cierre.

- `prefers-reduced-motion: reduce`: se desactivan glow del `.bn`, pulso de carga y los `translate` del panel; solo queda fade de 0.2s. Las animaciones de cámara del motor siguen (son el producto) pero el motor puede recibir `duracion` reducida. Default (reajustable). (enmendado en 4.1, 04.1-05/06) En la ficha, con reduced motion no hay `subir` ni `aparecer` (sin desplazamientos ni escalonado); el velo y el fundido de la cabecera quedan en 0,2 s y el overlay base queda oculto al instante.

---

## Mobile (<=800px)

- (enmendado en 4.1, ver 04.1-CONTEXT.md D-35) **Título grande arriba:** adentro de una red, `.tituloRed` va debajo de la hamburguesa (`top: 64px`), a todo el ancho (`left/right: 16px`), `clamp(28px, 9vw, 44px)` y hasta **dos líneas**; es el nombre de la red. El puente suma su borde inferior al **área segura** (`top`, vía `tituloRef`): el nodo enfocado queda entre el título y la banda del panel (unos 435 a 490px libres en 360x740 a 390x800). **La ficha en mobile:** cabecera de 64px con el nombre en una línea con elipsis y el menú de secciones deslizable, columna = viewport menos 32px, sin desborde horizontal. En mobile abrir una sección abre el cajón con su lista; con una sección abierta la hamburguesa abre solo esa lista.
- (enmendado en 4.1, 04.1-05/06, ver 04.1-CONTEXT.md D-39 y D-44) **La ficha en mobile** tiene una sola columna: primero los bloques y después los créditos, sin `sticky` y a todo el ancho; el menú de bloques (solo con dos o más) se desliza en horizontal. El preview de un evento futuro suma **cuándo y dónde** en la banda inferior (fecha con día y horario 18px y el espacio como botón, 18px); en la portada de la ficha, la fecha 24px y el espacio 18px.
- Panel = banda inferior, ancho 100%, altura del resumen `auto` con tope `45dvh` (original: `max-height 45vh`); ficha extendida sube hasta `70dvh`. Default (reajustable).
- El canvas conserva gestos (arrastre, pellizco). El panel captura solo su propio scroll (`touch-action: pan-y`).
- Botones en columna, ancho 100%, mínimo 44px de alto.
- Título en `.floatingTitle` 26px; hamburguesa 48px arriba a la izquierda.
- (enmendado tras el UAT 2, ver D-24/D-25) Adentro de un área el título **sigue siendo el área** (en escritorio es la entidad dueña): en mobile el menú superior vive en la hamburguesa y el nombre del área es la única orientación en pantalla. Sin rediseño: lo único nuevo es que la hamburguesa aparece al previsualizar un área.
- (enmendado tras el UAT, ver 04-UAT-GAPS.md, G-07) "Sinápsis" es una marca chica (14px) **abajo a la izquierda**, entera (`left: 16px`), tanto el h1 de la home como `.marca` dentro de una red, hasta que exista logo. Se oculta (`marca--oculta`) mientras el panel está visible porque la banda inferior ocupa ese lugar. `.tituloRed` se trunca con elipsis y no pasa de `100vw - 88px`.

---

## Accesibilidad (mínimo requerido)

- Todos los interactivos son `<button>` o `<a>` reales; nada de `div` clickeables. Orden de tab: hamburguesa/menú → panel → lateral.
- Anillo `:focus-visible` visible (acento). No se elimina `outline` sin reemplazo (el `.bn` original hace `outline: none`: se corrige).
- Contraste: texto blanco sobre `rgba(0,0,0,>=0.55)` sobre canvas; el peor caso es sobre nodos claros, por eso el piso de alfa del panel es 0.55.
- `aria-live="polite"` al cambiar de nodo; `aria-label` en hamburguesa y cerrar; `lang="es"`.
- El canvas es decorativo para lectores de pantalla (`aria-hidden="true"`); la alternativa navegable es el menú lateral (lista de nodos).
- (enmendado en 4.1, ver 04.1-CONTEXT.md D-34) **Ficha expandida:** `role="dialog"` con `aria-modal="true"` y `aria-labelledby` al nombre; mientras está abierta el overlay base queda `inert` (atributo nativo) y la capa atrapa Tab y Shift+Tab; Esc la cierra (Esc en dos niveles: si no hay ficha, hace Volver) y el foco vuelve al nombre del panel (`#panel-nombre`). Las secciones del menú de la ficha y del menú superior marcan la activa con `aria-current`, no solo con color; el `<nav>` de la ficha lleva `aria-label="Secciones de {nombre}"`. `scroll-behavior: smooth` se desactiva con `prefers-reduced-motion`.
- (enmendado en 4.1, 04.1-05/06, ver 04.1-CONTEXT.md D-38, D-39, D-42 y D-44) **Ficha por bloques:** jerarquía de títulos `h2` (nombre del nodo) > `h3` (cada bloque, "Créditos" y "Entradas") > `h4` (cada grupo de créditos); los créditos son un `<aside aria-label="Créditos de {nombre}">` y cada bloque una `<section aria-labelledby>`; el `<nav>` de bloques (solo con dos o más) conserva `aria-label="Secciones de {nombre}"` y marca el activo con `aria-current`. El enlace de Entradas abre en pestaña nueva con `rel="noopener noreferrer"`. Con `prefers-reduced-motion` no hay desplazamientos de entrada y el overlay base queda oculto sin animar.

---

## Copywriting Contract

| Elemento | Copy |
|----------|------|
| CTA principal (por defecto, ENTIDAD/AGRUPACION) | "Entrar a {nombre}" cuando hay destino; "Entrar" si no |
| CTA principal (OBRA) | Ver más / Ver menos (decisión: se mantiene, es corto y claro en contexto) |
| Volver | "Volver" (en el lateral: "VOLVER" en mayúsculas). Excepción deliberada heredada de la web original: no lleva destino |
| Enlace externo | etiqueta del dato; si falta: "Ir al sitio" |
| Cerrar lateral / hamburguesa | "Cerrar lista" / "Abrir menú" (aria-label) |
| Título home | Sinápsis |
| Bajada home | Red social para creadxrs y obra colectiva |
| Encabezado de bloque créditos | Créditos |
| Encabezado de galería / enlaces / video | Galería / Enlaces / Video (solo si hay dato) |
| Estado vacío: nodo stub | (sin copy: solo nombre y subtipo, D-15) |
| Estado vacío: sub-red sin nodos | Título: "Todavía no hay nada acá". Cuerpo: "Esta red no tiene nodos cargados. Volvé y explorá otro camino." + botón Volver. (enmendado tras el UAT, ver 04-UAT-GAPS.md) Aplica a las áreas sin miembros: adentro no queda ningún nodo distinto del área misma; hoy 5 de las 6 áreas reales de Tropical, hueco de datos de 02-05, no de código |
| Acción `sumar` | "Sumar sus obras" (enmendado tras el UAT, ver 04-UAT-GAPS.md) |
| Estado vacío: menú sin agrupadores | El menú superior no se renderiza (sin copy) |
| Error: nodo no encontrado | "No encontramos ese nodo. Puede que el link haya cambiado. Volvé a la red y seguí explorando." + botón "Ir a la red" |
| Error: topología | "No pudimos cargar la red. Revisá tu conexión e intentá de nuevo." + botón "Reintentar" |
| Error: video no carga | Ninguno propio; el iframe muestra su estado nativo |
| Acciones destructivas | Ninguna en esta fase |

(enmendado en 4.1, ver 04.1-CONTEXT.md D-32, D-33 y D-36) Copy nuevo: **"Expandir"** (reemplaza "Ver más / Ver menos"; no cambia al abrir), **"Volver"** en la cabecera de la ficha, **"Entrar a {nombre}"** para cualquier nodo con algo adentro, **"Otros"** como última sección (cada ítem lleva " — {rol}" con la grafía original). Las **etiquetas de sección salen del vocabulario** `src/lib/red/roles.json` (Producción, Meditación, Actividades, Performance, Bandas en vivo, DJ, VJ…), no del copy de la interfaz; el encabezado "Créditos" ya no existe (los créditos son las secciones). `aria-label` de la ficha: "Secciones de {nombre}".

(enmendado en 4.1, 04.1-05/06, ver 04.1-CONTEXT.md D-38, D-39, D-40 y D-44) **Copy de la ficha por bloques:** vuelve **"Créditos"** como título de la columna derecha (en lugar de las secciones en la cabecera); **"Entradas"** como título del bloque de un evento futuro y **"Conseguir entradas"** como etiqueta del enlace si el dato no trae otra. Los **nombres de bloque** salen de `src/lib/red/bloques.json` o del override del nodo (Curaduría, Sobre la obra, Sinopsis, Galería, Video, Enlaces), no del copy de la interfaz; las **etiquetas por contexto** salen de `roles.json` → `contextos` (por ejemplo "Eventos" para un espacio, "Conciertos" para una banda). Reemplaza la frase de arriba que decía que el encabezado "Créditos" ya no existe.

Tono: rioplatense, voseo ("Volvé", "Revisá", "Intentá"). Siempre "creadxr", nunca "artista".

---

## Registry Safety

| Registry | Bloques | Safety Gate |
|----------|---------|-------------|
| shadcn official | ninguno (shadcn no se usa) | no aplica |
| Terceros | ninguno | no aplica |

---

## Puntos abiertos (defaults elegidos, reajustables)

1. Menú superior en la home: vacío hasta que D-07 defina filtros.
2. Convivencia panel + lateral en escritorio (padding-left del panel).
3. `--panel-alpha` 0.55 a 0.9, alto del panel mobile 45dvh / 70dvh.
4. Pantalla de carga y reduced-motion.
5. Galería sin lightbox.
6. Color del `.bnfocus` sale del dato del nodo, no de ids hardcodeados.
7. (enmendado tras el UAT, ver 04-UAT-GAPS.md) Menú superior durante la previsualización de un área: **decidido (UAT 2, 2026-10-08, pregunta 3b): queda visible**, con el área activa como `.bnfocus` y el nombre de la entidad fijo arriba a la izquierda (captura de diseño del dueño). (enmendado tras el UAT 2, ver D-24/D-25) **Implementado en 04-12** (gap G-10); pendiente de confirmación del dueño en el UAT 3.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: FLAG (recomendaciones no bloqueantes)
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-09-20 (2 pasadas del verificador; 1 revisión de tipografía)
