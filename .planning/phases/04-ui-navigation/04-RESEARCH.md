# Fase 4: UI y navegación - Investigación

**Investigado:** 2026-09-20
**Dominio:** Next 15 App Router + puente React/motor 3D + navegación por URL coreografiada
**Confianza general:** MEDIA-ALTA (código del repo y `node_modules` leídos directamente; el comportamiento de `history.pushState` con el router de Next 15.5 está verificado en el source instalado y en los docs, pero falta la prueba empírica de atrás/adelante en el navegador — ver Pitfall 2)

<user_constraints>
## User Constraints (de CONTEXT.md)

### Locked Decisions

**Ya decidido en fases anteriores (se arrastra, no se reabre)**
- **D-00a:** Panel siempre del mismo lado: izquierda 62% en escritorio, banda inferior en mobile, degradado hacia el canvas (no corte duro), texto alineado a la izquierda (UI-09, 03-CONTEXT).
- **D-00b:** El canvas vive por encima del router y nunca se desmonta; el motor expone solo `setVista`/`on`; el foco entra por `nodoEnfocado`; el área segura llega continua desde el DOM.
- **D-00c:** La Vista vive en la URL; el historial es el stack de navegación (UI-05).
- **D-00d:** Cambio de ruta secuencia Vista → cámara → overlay (UI-10). Tipografía Briller/Gotham. Se dice "creadxr", no "artista".

**Click y navegación (dos pasos)**
- **D-01:** Un click en un nodo **enfoca** (paso 1): cambia la ruta, la cámara llega y aparece el panel con un resumen. **Entrar** (paso 2) es un botón del panel, no un segundo click.
- **D-02:** El botón del panel depende del **tipo** del nodo, y se estandariza como un "tipo de botón" = una acción, con posibilidad de sub-botones:
  - **OBRA:** el botón despliega más información — el panel se extiende hacia abajo y se puede scrollear (texto + imágenes).
  - **ENTIDAD / AGRUPACIÓN (área):** el botón carga la sub-red.
  - **Otros comportamientos:** enlaces externos (ir a otra web). La lista de acciones es abierta.
  En la web original era un "tipo de botón" que disparaba acciones distintas; se porta ese patrón como datos, no como código por nodo.
- **D-03:** Mientras hay un nodo enfocado, un click en otro nodo visible **enfoca ese nodo** (cambia foco y URL; atrás vuelve al anterior; el panel no cambia de lado) — UI-02.
- **D-04:** URLs por tipo: `/`, `/entidad/[slug]`, `/obra/[slug]`. Los parámetros de la Vista (profundidad, filtros) van en query (`?prof=2`).
- **D-05:** **Cada navegación es un paso de historial**; atrás deshace un paso con la animación inversa (reemplaza el snapshot de un solo slot del prototipo).

**Home**
- **D-06:** La home (`/`) **no es la red completa**: es una **fracción** de la red social, una mezcla de obras y entidades, con semilla distinta en cada visita, hasta un límite de nodos que se define por performance. Imagen de referencia: el home de Instagram, "empezás a ver obras y entidades". El límite es una constante configurable (PERF-01: ~100 nodos a 30fps con CPU 4x es la cota medida; a 6x no llega).
- **D-07:** Más adelante, filtros o una forma simple de elegir "cómo navegar / cómo ver". Se empieza simple; el diseño de la home no debe impedirlo.
- **D-08:** El dominio `tropicalponcho.art` accederá directo a la **entidad Tropical Poncho** y se verá como la web de Tropical: la red de nodos migrados de **primer nivel** (las áreas / agrupadores), no todo. Es UI-07 (Fase 5), pero la página ENTIDAD de esta fase no puede tener código específico de Tropical Poncho y debe aceptar una profundidad / niveles visibles como parámetro.

**Menú**
- **D-09:** El menú de arriba muestra los **agrupadores de la entidad en foco** (en tropicalponcho.art son las áreas: CONCEPTO, OBRAS, AUDIOVISUALES, EDITORIAL, TECNOLOGÍA, LABORATORIOS en la web original). Sale de la misma data que el grafo (UI-06).
- **D-10:** Al entrar a una sub-red aparece un **menú lateral**: lista de los nodos de esa sub-red y un VOLVER, de la misma data que el grafo.
- **D-11:** Mobile: **hamburguesa** que despliega hacia abajo (patrón de la web original); con un nodo enfocado muestra solo el botón activo, y el botón del nivel padre queda iluminado.

**Contenido de los paneles**
- **D-12:** Panel al enfocar: **nombre, subtipo, descripción breve y botones**. Solo datos que ya viajan en la topología; no pide nada al servidor.
- **D-13:** Ficha extendida de una OBRA lleva: **créditos** (creadxrs y su rol, cada uno clickeable para enfocar su nodo, sale de los vínculos — UI-04), **texto descriptivo largo**, **galería de imágenes**, **enlaces externos** y un **iframe de video de YouTube opcional** (solo si el dato lo trae).
- **D-14:** En una ENTIDAD, las obras producidas aparecen **solo en la red al entrar** (y en el menú lateral), no como lista dentro del panel.
- **D-15:** Un nodo stub o sin descripción muestra un **panel mínimo con el nombre**: sin descripción, sin botón de expandir, sin aviso de "perfil pendiente".

**Coreografía**
- **D-16:** Transición por defecto al **entrar**: **ENTIDAD = filtrado, ÁREA (AGRUPACION) = reemplazo**. Es configurable: el dueño de la entidad podrá elegir otra. En M1 (sin auth) el default vive en código y la elección por entidad es un campo del dato que el motor respeta; la interfaz de edición del dueño es M2.
- **D-17:** Secuencia estricta: la **cámara llega y recién ahí aparece el panel** (UI-10).
- **D-18:** **Volver = animación inversa** de la que se usó para entrar.

### Claude's Discretion
- Menú de arriba en la home social (contexto general, sin entidad en foco).
- Mobile fino: gestos, alto exacto del panel/banda inferior, comportamiento del scroll con el degradado.
- Pantalla de carga (hoy el inicio queda en negro un rato) y estados de error.
- De dónde salen los datos mientras 02-05 (curaduría real) esté en pausa: la UI se desarrolla contra el endpoint de topología y fixtures.
- Cómo se modela el registro de acciones de botón, y cómo se lee el override de transición.
- Estilos visuales concretos dentro de la tipografía y el degradado ya definidos.

### Deferred Ideas (OUT OF SCOPE)
- Filtros y selector de "cómo navegar / cómo ver" en la home — después de la versión simple.
- Controles de niveles visibles (áreas, obras, creadxrs conectados) y configuración por entidad o por usuario (por ejemplo ocultar áreas y mostrar directo las obras) — requiere cuentas: M2.
- Edición de la transición de entrada por el dueño de la entidad — M2 (auth).
- Carga progresiva de la red y esfera simple con diseño diferido (docs/PERF-01.md) — mejora de motor, posterior a esta fase.
- Fade de nodos con opacidad en vez de escala, y ángulo de enfoque más fino (MOTR-11) — gaps de la Fase 3.
- Dominio `tropicalponcho.art` apuntando a la entidad — Fase 5 (UI-07).
</user_constraints>

<phase_requirements>
## Requisitos de la fase

| ID | Descripción | Qué de esta investigación lo habilita |
|----|-------------|----------------------------------------|
| UI-01 | Red 3D global al entrar, navegable con mouse y gestos | Shell en `layout.tsx` + `fraccionHome` sembrada (D-06); el motor ya trae orbit/touch |
| UI-02 | Al tocar un nodo se ve su info y se sigue explorando por vínculos | `nodeClick` → `navegarA` (push) → panel; enfocar otro nodo = mismo Vista, solo cambia `nodoEnfocado` |
| UI-03 | Página ENTIDAD con su red y obras producidas | Ruta `/entidad/[slug]`, Vista `raiz=slug, prof=2` (parametrizable con `?prof=`), sin código de Tropical Poncho |
| UI-04 | Página OBRA con ficha y creadxrs que colaboraron | `creditosDe(ady, id)` desde vínculos; ficha extendida con `GET /api/nodo/[id]` (detalle) |
| UI-05 | Vista en la URL, atrás retrocede, link compartible | `estadoDesdeUrl` / `urlDesdeEstado` puras; `history.pushState` con `{sinapsis:{idx,t}}` |
| UI-06 | Menú desde la misma data que el grafo | `agrupadoresDe(ady, id)` y `nodosDeLaRed(subgrafo)` — mismas estructuras que consume el motor |
| UI-08 | Canvas montado una vez por encima del router | `Shell` client en `layout.tsx`; los layouts no se remontan al navegar |
| UI-09 | Panel 62% izquierda / banda inferior con degradado | `.panel` persistente + rect medido por `getAreaSegura` (pull) |
| UI-10 | Cambio de ruta secuencia Vista, cámara, overlay | Máquina de fases `moviendo → listo` atada a la promesa de `setVista`, con cola "el último gana" |
</phase_requirements>

## Restricciones del proyecto (de CLAUDE.md)

Tienen la misma autoridad que las decisiones bloqueadas.

- Next 15 + React 19 + TS + Tailwind: no se reabre. Postgres único; el DDL lo autoran las migraciones SQL de este repo.
- **El motor no importa React; React no importa THREE. Un único archivo de puente** (`src/app/CanvasSinapsis.tsx`). Cualquier otro import de `src/engine/` desde `src/app/` es un defecto.
- **El canvas es fondo permanente y nunca se desmonta**; una sola instancia del motor; las rutas son overlays. La "mini-red" de galería es este mismo canvas.
- **El puente es bidireccional** (área segura hacia el motor; posición del nodo enfocado hacia React). Ninguno adivina.
- **Navegar es coreografía**: Vista → cámara → overlay, esperable desde afuera.
- La transición es independiente de la consulta (`reemplazo`/`filtrado`/`aditivo` alcanzan cualquier Vista). **La Vista vive en la URL**: no se reintroduce stack propio ni snapshots.
- `dimensionId` no existe (la distancia se calcula en el traversal). `viz_params` solo escalares. `nodeType` cuatro valores. El Usuario no es un nodo. Pertenencia = arista. Permisos nunca en `vinculos`. `CUSTOM` no entra en `tipo_vinculo`.
- Se dice "creadxr", nunca "artista". `thumb` es clave relativa (la URL la arma una constante de base), nombres de archivo en minúscula.
- `collectiveConscience` se lee, no se toca.
- **Disciplina (ponytail):** mínimo código; nada de interfaces de una implementación ni config para valores que no cambian; marcar simplificaciones con `// ponytail:` que nombre techo y salida. Nunca simplificar validación en bordes de confianza, manejo de errores que evita pérdida de datos, seguridad, accesibilidad básica.
- GSD: los cambios de archivos van por un workflow GSD (no editar por fuera).

## Resumen

La fase es **cableado, no motor**: casi todo lo difícil (transiciones, foco, área segura, liberación de recursos) ya existe y está verificado (UAT 3D 8/8). Lo que falta es (a) un `Shell` cliente en `layout.tsx` que sea dueño del canvas y del overlay, (b) un conjunto chico de funciones puras que traducen URL ↔ Vista/foco y derivan menús, botones y la fracción de la home, y (c) tres huecos reales que la investigación encontró y que **CONTEXT no menciona**: el motor no puede "desenfocar", `setVista` no es reentrante, y el dato no tiene `slug` ni agrupadores conectados a Tropical Poncho.

La decisión de arquitectura central: **las rutas `/entidad/[slug]` y `/obra/[slug]` existen solo para que los links duros funcionen; sus `page.tsx` devuelven `null`**. Toda la UI (panel, menús) vive en un `Overlay` persistente dentro del layout y se deriva de `usePathname()` + `useSearchParams()`. La navegación interna usa `window.history.pushState` (integrado al router de Next: sincroniza `usePathname`/`useSearchParams` sin pedir RSC al servidor), no `router.push`. Así el orden Vista → cámara → overlay lo controla un solo lugar (el puente) y no compite con el ciclo de render de rutas de Next.

**Recomendación principal:** un `Shell` (`'use client'`) en `layout.tsx` que renderiza `CanvasSinapsis` (único puente) + `Overlay`; un módulo puro `src/lib/red/` con todo lo testeable con `node --test`; `pushState` con `{sinapsis:{idx,t}}` para saber dirección y transición de entrada; cola de un solo carril "el último gana" alrededor de `setVista`; y una Wave 0 que cierre los huecos de motor/datos antes de tocar UI.

## Standard Stack

### Core (ya instalado, versiones leídas de `node_modules`)
| Librería | Versión | Propósito | Por qué |
|----------|---------|-----------|---------|
| next | 15.5.22 | App Router, layouts persistentes, route handlers | Ya en el repo, no se reabre |
| react / react-dom | 19.2.8 | Overlay, estado de fase, `useSyncExternalStore` si hiciera falta | Ya en el repo |
| tailwindcss | 3.4.19 | Layout/utilidades del overlay | Ya en el repo; coexiste con CSS legado (ver Pitfall 8) |
| 3d-force-graph / three | 1.80 / 0.185 | Solo el motor | El puente es el único que los toca (indirectamente) |
| node:test | Node 22.14 | Tests de funciones puras | Ya es el runner (`npm test`) |

### Supporting
Ninguna dependencia nueva. **No agregar**: librería de estado (Zustand/Redux), de animación (framer-motion), de componentes (shadcn), `jsdom`/testing-library, ni PRNG (mulberry32 son 5 líneas). Confirmado contra la disciplina del repo y contra UI-SPEC ("sin librería de componentes").

### Alternativas consideradas
| En vez de | Podría usar | Tradeoff |
|-----------|-------------|----------|
| `history.pushState` | `router.push` / `<Link>` | Cada navegación a una ruta dinámica pide un payload RSC al servidor (los docs: las rutas dinámicas no se prefetchean); mete latencia y un punto de falla offline entre el click y la cámara. Las páginas no renderizan nada, así que el fetch no aporta nada |
| `history.state` propio para dirección | Navigation API | No es baseline en todos los navegadores; `history.state` alcanza |
| slug derivado del label | columna `slug` (migración 002) | Ver Pregunta abierta 1 |
| `transicionEntrada` dentro de `viz_params` | columna nueva | Ver Pregunta abierta 3 |

**Instalación:** ninguna.

## Patrones de arquitectura

### Estructura recomendada
```
src/
├── app/
│   ├── layout.tsx                  # server: <html lang="es">, <Suspense><Shell/></Suspense>, {children}
│   ├── Shell.tsx                   # 'use client': carga topología, estado de fase, Canvas + Overlay
│   ├── CanvasSinapsis.tsx          # ÚNICO puente (importa el motor). Ciclo de vida + cola + nav→motor
│   ├── Overlay.tsx                 # panel persistente, menús, lateral, loader (sin THREE)
│   ├── entidad/[slug]/page.tsx     # export default () => null
│   ├── obra/[slug]/page.tsx        # export default () => null
│   └── api/
│       ├── topologia/route.ts      # existe; + fallback de fixture por env
│       └── nodo/[id]/route.ts      # NUEVO: detalle (metadata proyectado y validado)
└── lib/red/                        # PURO (sin React, sin THREE, imports relativos con .ts)
    ├── url.ts        # estadoDesdeUrl / urlDesdeEstado / claveVista
    ├── slugs.ts      # indexarSlugs(topologia), rutaDe(nodo)
    ├── home.ts       # fraccionHome(ady, {semilla, limite})
    ├── menus.ts      # agrupadoresDe, nodosDeLaRed, creditosDe
    ├── botones.ts    # resolverBotones(nodo, ctx) — registro de acciones
    ├── navegacion.ts # inversa, transicionPara({direccion, ...})
    └── *.test.ts
```
Los `.test.ts` van junto al módulo (el glob es `src/**/*.test.*`).

### Patrón 1: Shell persistente en el layout (UI-08)
**Qué:** `layout.tsx` (server) renderiza un client component. Los layouts del App Router no se re-renderizan ni se remontan al navegar entre rutas hijas (docs Next: "a shared layout is not re-rendered during navigation"), así que el `useEffect` del puente corre una sola vez por carga de página.
**Cuidado:** `useSearchParams()` en una página prerenderizada (`/` lo es) exige un `<Suspense>` o `next build` falla con "Missing Suspense boundary with useSearchParams" (docs). El fallback del Suspense **es la pantalla de carga**: se ve en el HTML inicial, antes de que cargue JS (arregla parte del "negro inicial").
```tsx
// src/app/layout.tsx  (server)
import { Suspense } from 'react'
import Shell from './Shell'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <Suspense fallback={<div className="cargando" />}>{/* misma pantalla de carga que el estado 'cargando' */}
          <Shell />
        </Suspense>
        {children /* las páginas devuelven null; existen para los links duros */}
      </body>
    </html>
  )
}
```
No usar `next/dynamic({ ssr:false })` para el Shell: perdería el HTML de carga. El `import()` del motor va **dentro del effect** (como hoy), así que nunca se evalúa en el servidor.

### Patrón 2: URL ↔ estado (UI-05, D-04)
**Gramática (recomendada, discreción):**
- Path = nodo **enfocado**: `/` (ninguno), `/entidad/<slug>` (ENTIDAD y AGRUPACION), `/obra/<slug>` (OBRA y EVENTO). El segmento de tipo es cosmético: se resuelve por slug e ignora el tipo (no hay redirect; ponytail).
- `?red=<slug>` = raíz de la Vista. Ausente ⇒ la raíz es el propio enfocado (`/entidad/x` = "la red de x"). `?red=_` = la home. En `/` sin `red` también es la home.
- `?prof=N` = profundidad (D-04/D-08), default: ENTIDAD 2, AGRUPACION 1, OBRA 1. **Clamp 1–4** (la URL es un borde de confianza: `?prof=99` sobre un hub congelaría la carga).
- `?semilla=abc` opcional (reproducir/compartir una home; por defecto una semilla por visita en memoria).

Esto separa los dos gestos de D-01: **enfocar** (mismo `red`/`prof`/`semilla` ⇒ mismo Vista, cambia solo el path) y **entrar** (nuevo `red` ⇒ otra Vista, con transición D-16). Si `enfocado ∉ subgrafo` (slug inexistente o fuera de la red) el motor no enfoca y no avisa (`nodo` no encontrado ⇒ sin throw): el puente debe detectarlo *antes* y mostrar el error de "nodo no encontrado" de UI-SPEC.
```ts
// src/lib/red/url.ts (puro)
export interface EstadoRed { enfocado: string | null; red: string | null /* null=home */; prof: number; semilla?: string }
export const claveVista = (e: EstadoRed) => `${e.red ?? '_'}|${e.prof}|${e.semilla ?? ''}`
```
`claveVista` igual ⇒ solo cambió el foco.

### Patrón 3: Ruta → motor con cola de un solo carril (UI-10)
**Hechos verificados en `SinapsisEngine.js`:**
- `setVista` **no es reentrante**: comparte `_idsEntrando`, `_nodoEnfocado`, `graphData()` y no expone cancelación. Dos llamadas concurrentes se pisan.
- La promesa resuelve **después** de `enfocarNodo` (que espera `setTimeout(duracion)`, exacto). Es el "cámara llegó" de D-17. Si `nodoEnfocado` no existe en el subgrafo, resuelve sin mover la cámara.
- `nodoEnfocado` **nunca se limpia** (ver Hueco 1).

**Patrón:** el puente mantiene `enCurso: Promise` y `pendiente: Estado | null`. Una navegación nueva sobreescribe `pendiente` y, cuando termina `enCurso`, corre solo el último (las intermedias se descartan; la URL igual quedó bien porque es la fuente de verdad). También cubre StrictMode (el effect de navegación corre dos veces en dev): antes de encolar, comparar con `ultimoAplicado` (clave completa: `claveVista + enfocado`) y salir si es igual.
```tsx
// dentro de CanvasSinapsis.tsx
const aplicar = async (e: EstadoRed, how: { transicion: Transicion }) => {
  fase('moviendo')                                  // el overlay oculta el panel
  await pausaSalidaPanel()                          // ~300 ms si había panel visible (UI-SPEC)
  const sub = e.red === null ? fraccionHome(ady, ...) : resolverVista(ady, vistaDe(e), /*yaCargados*/ undefined)
  await engine.setVista(sub, { transicion: how.transicion, nodoEnfocado: e.enfocado })
  fase('listo')                                     // recién acá aparece el panel
}
function encolar(e, how) {
  if (clave(e) === ultimoAplicado) return
  pendiente = { e, how }
  enCurso = enCurso.then(async () => { const p = pendiente; pendiente = null; if (p) { ultimoAplicado = clave(p.e); await aplicar(p.e, p.how) } })
}
```
`fase('listo')` solo si `p` sigue siendo el último (comparar contra `ultimoAplicado`), para que un panel viejo no aparezca sobre un movimiento más nuevo.

### Patrón 4: Dirección y animación inversa (D-05, D-18)
`history.state` es libre para datos propios: el `pushState` parcheado de Next (15.5.22, `app-router.js`) copia `__NA` y el árbol interno **sobre el objeto que le pasás**, sin borrar tus claves. Guardar en cada entrada `{ sinapsis: { idx, t } }`: `idx` = posición monótona, `t` = transición usada para **entrar** a esta entrada.
- Push propio: `idx = actual+1`, `t = transicionDeEntrada(...)`.
- `popstate` (listener propio, corre sin interferir con el de Next): `nuevo.idx < actual.idx` ⇒ **atrás**: transición = `inversa[t de la entrada que se abandona]`; `nuevo.idx > actual.idx` ⇒ **adelante**: transición = `t de la entrada destino`. Sin `sinapsis` (carga dura, entrada foránea) ⇒ `reemplazo`.
- Guardar `direccion`/`t` en un ref que el effect de URL consume; el effect deriva todo lo demás de la URL.
```ts
// navegacion.ts (puro)
export const inversa = { reemplazo: 'reemplazo', filtrado: 'aditivo', aditivo: 'filtrado' } as const
```
- **Foco solo (misma Vista)**: no hay transición de Vista; atrás = mover el foco al nodo anterior, o **desenfocar** si la entrada previa no tenía foco (requiere Hueco 1).
- Al **entrar**: `t = nodo.vizParams.transicionEntrada ?? (nodeType==='AGRUPACION' ? 'reemplazo' : 'filtrado')` (D-16). Validar el valor contra el enum; desconocido ⇒ default.
- Inversa de `filtrado` = `aditivo` funciona porque `filtrado` pinea a los que quedan y `aditivo` pinea lo existente y solo crece lo que entra (las posiciones de los que salieron se pierden; vuelven a asentarse por física — aceptable, ponytail).

### Patrón 5: Panel + área segura sin re-render por cuadro (UI-09)
El motor **tira** (pull) `opciones.getAreaSegura()` en cada `_tick`; el puente devuelve un rect leído con `getBoundingClientRect()` de un ref. Sin estado React de por medio. Puntos verificados/decididos:
- El contenedor medido debe estar **siempre maquetado** (usar `opacity`/`visibility`/`pointer-events`, **nunca `display:none`**): la cámara tiene que encuadrar contra el rect **antes** de que aparezca el panel (D-17). Si no hay nodo enfocado la función devuelve ceros (el motor igual ignora el área sin `_nodoEnfocado`).
- Escritorio: `{ left: rect.right, top:0, right:0, bottom:0 }`. Mobile (`innerWidth < 800`, mismo corte que hoy): `{ bottom: innerHeight - rect.top }`. Reemplaza el `getAreaSegura` de desarrollo actual.
- `getBoundingClientRect` por cuadro solo fuerza layout si el DOM está sucio; aceptable (el motor ya lo llama a 60 Hz por contrato).
- **`--panel-alpha`**: en vez de que el puente lo actualice por cuadro (UI-SPEC), hacerlo con un `onScroll` pasivo del propio panel que hace `el.style.setProperty` — mismo efecto visual, sin acoplar el puente al DOM del panel ni re-renderizar. (Desvío menor y justificado del UI-SPEC.)
- **`nodeFocus`** (~60 eventos/s durante la animación, ya documentado): **no se consume en React en esta fase**. UI-SPEC no exige nada que dependa de la posición proyectada; suscribirse solo si un diseño lo pide, escribiendo `--foco-x/y` por ref y jamás `setState`. Dejar el `console.log` de dev fuera.

### Patrón 6: Menús desde la misma data (UI-06, D-09..D-11)
Todas las funciones reciben el índice `Adyacencia` (o el `Subgrafo` ya resuelto que ve el motor) y devuelven datos; el overlay solo renderiza.
- `agrupadoresDe(ady, entidadId)`: vecinos `AGRUPACION` unidos por `COMPONE` (en cualquier dirección), ordenados por `label`. **Ver Hueco 3: hoy el dato no tiene esas aristas.**
- Entidad "de menú": la raíz de la red si es ENTIDAD; si no, el enfocado si es ENTIDAD; si no, **sin menú** (home y OBRA sin red padre: UI-SPEC "no se renderiza"). Ítem activo = agrupador que es la raíz de la red; "nivel padre iluminado" (D-11) = el agrupador que compone el nodo enfocado.
- Lateral (D-10): `subgrafo.nodos` de la red actual (excluida la raíz), orden por `label`. VOLVER = `history.back()` si `idx > 0`, si no `pushState('/')`.
- `creditosDe(ady, obraId)`: vínculos donde el otro extremo es ENTIDAD, deduplicado por entidad, `{ id, nombre, rol: v.rol }`. Cada crédito es `<a href={rutaDe(nodo)}>` con `onClick` que hace `preventDefault` + push (cmd/ctrl-click abre pestaña), no un `div`.

### Patrón 7: Home = fracción sembrada (D-06)
`resolverVista` **no sirve** para esto: `modoOrden:'aleatorio'` cae a orden BFS y el propio código documenta que necesitaría una fuente de azar externa. Escribir `fraccionHome` pura y aparte (retorna un `Subgrafo`), con PRNG sembrado (mulberry32):
1. Candidatos = nodos `ENTIDAD` y `OBRA` (mezcla pedida en D-06). Excluir `EVENTO`/`AGRUPACION` de la selección.
2. Semillas iniciales: 2–3 nodos al azar. Luego **snowball**: elegir al azar un vecino de la frontera del conjunto (alternando tipo para sostener la mezcla obra/entidad) hasta `limite` o frontera vacía; si se vacía, sumar otro nodo semilla al azar (otra componente).
3. Vínculos = los inducidos entre los elegidos (mismo criterio que `resolverVista`).
4. `limite` default **40** (`LIMITE_HOME`, override `?limite=`). Justificación: PERF-01 mide ~100 nodos como cota a 4x; a 6x son 12 fps con 100; la **carga** (`warmupTicks(300)` síncrono) es el techo real (200 nodos ≈ 15 s a 4x). El corpus curado actual son ~107 nodos, así que 40 ya es una fracción visible.
5. Semilla por visita: `semilla = params.semilla ?? semillaDeVisita()` con `semillaDeVisita` una constante de módulo calculada **lazy en el cliente** (nunca durante el render de servidor: hidratación). Se mantiene entre volver a `/` en la misma visita para que atrás no cambie la fracción.
Test: dada una semilla, mismo resultado; nunca más de `limite`; mezcla de tipos; conectividad (componentes ≤ semillas iniciales + agregadas por frontera vacía).

### Patrón 8: Registro de acciones de botón (D-02)
Un dato, no código por nodo:
```ts
// botones.ts (puro)
export type Accion = 'expandir' | 'entrar' | 'enlace'
export interface Boton { etiqueta: string; accion: Accion; destino?: string; hijos?: Boton[] }
const POR_TIPO: Record<NodeType, (n: NodoGrafo, c: Ctx) => Boton[]> = {
  OBRA:       (n, c) => (c.tieneDetalle ? [{ etiqueta: 'Ver más', accion: 'expandir' }] : []),  // D-15: stub/sin detalle => sin botón
  EVENTO:     /* igual que OBRA */,
  ENTIDAD:    (n, c) => (c.grado > 0 ? [{ etiqueta: `Entrar a ${n.label}`, accion: 'entrar' }] : []),
  AGRUPACION: /* igual que ENTIDAD */,
}
// + enlaces externos del detalle => { accion: 'enlace', destino }
```
`ejecutar(boton, ctx)` es un `switch` de 3 ramas en el overlay (`expandir` = estado local de la ficha, `entrar` = `navegarA` con `t` de D-16, `enlace` = `<a target=_blank rel="noopener noreferrer">`). Los enlaces son `<a>`, no `<button>`. Una acción nueva = una rama y un tipo de la unión. Con `?` de `tieneDetalle`: ver Pregunta abierta 2 (el detalle se pide al abrir, así que "Ver más" se muestra para toda OBRA no-stub y la ficha maneja el vacío). `// ponytail:` sin override por subtipo; entra cuando algún subtipo lo necesite.

### Patrón 9: Detalle del nodo (D-13) — segunda ruta, no fixtures en el cliente
La topología excluye `metadata` **a propósito** (DATA-02). Mecanismo mínimo: `GET /api/nodo/[id]` que hace `SELECT metadata FROM nodos WHERE id=$1` y **proyecta y valida** solo estas claves (nunca devolver el blob legado entero: trae `mongoId`, `fuente`, `graphVal`…):
```ts
interface DetalleNodo { texto?: string; galeria?: { thumb: string; alt?: string }[]; enlaces?: { etiqueta: string; url: string }[]; youtube?: string }
```
Validar en el borde: `youtube` con regex de id (`^[\w-]{11}$`), `url` solo `https?:`, `thumb` clave relativa sin `..` ni esquema, tamaños máximos. Se pide **al abrir "Ver más"** (no al enfocar → D-12 se cumple: enfocar no toca el servidor) y se cachea en un `Map`.
**Hallazgo:** la `metadata` real que importa `scripts/migracion/dumps.ts` **no tiene estas claves** (tiene `bio`, `links`, `info`, `imgPath`, `sub`…, esquema legado distinto por fuente). Es decir, D-13 define un contrato de datos que la curaduría no produce todavía. Para esta fase: fixtures que cumplen `DetalleNodo` (la ruta las sirve cuando `TOPOLOGIA_FIXTURE=1`) y un mapeo legado→`DetalleNodo` **diferido a 02-05** (documentarlo como Pregunta abierta 2).

### Patrón 10: Pantalla de carga y errores
- Orden real del arranque: HTML con loader (Suspense fallback) → hidrata → **en paralelo** `Promise.all([import motor, cargarAdyacencia()])` → construir motor → `setVista` (bloquea el hilo con `warmupTicks(300)` + creación de nodos, ver PERF-01).
- **Pintar el loader antes del bloqueo:** esperar dos `requestAnimationFrame` antes de la primera `setVista`.
- Animar el loader **solo con `opacity`/`transform`** (`scaleX` para la barra): corren en el compositor y no se congelan cuando el hilo principal queda bloqueado por el warmup; una animación de `width`/`left` sí se congelaría.
- Se retira con el primer `vistaLista`. Error de topología → panel mínimo + `Reintentar` (`olvidarTopologia()` + recarga de estado); el canvas queda como esté. `cargarAdyacencia` ya limpia `pendiente` en HTTP error, así que reintentar funciona; **no limpia si `fetch` rechaza** (red caída): falta un `.catch` que resetee `pendiente` (ver Pitfall 9).

### Anti-patrones a evitar
- **Montar el canvas o el motor en una `page.tsx`**: rompe UI-08 (el ensayo previo en `task/Refactor-en-React` falló).
- **`router.push`/`<Link>` para navegar dentro de la red**: dispara RSC innecesario y desincroniza la coreografía.
- **`display:none` en el contenedor del panel**: el área segura mediría 0 justo cuando la cámara necesita el rect.
- **`setState` en `nodeFocus`** o en cualquier callback del motor de alta frecuencia.
- **Guardar la semilla de la home en `Math.random()` durante el render** (mismatch de hidratación).
- **Importar `THREE` o `src/engine/*` desde `Overlay`/`lib/red`**: defecto de arquitectura.
- **Estado de "profundidad/nivel" persistido por nodo**: `dimensionId` no existe.

## No lo escribas a mano

| Problema | No construir | Usar | Por qué |
|----------|--------------|------|---------|
| Resolver una Vista | otro BFS | `resolverVista` + `construirAdyacencia` (existentes) | Ya testeado (VIST-01); el home es la excepción justificada |
| Sincronizar URL | stack de navegación propio | `history.pushState` + `usePathname/useSearchParams` | Invariante: la Vista vive en la URL |
| Animaciones de cámara/nodos | tweens en React | motor (`setVista`) | El motor ya secuencia y devuelve promesa |
| Rect del panel | ResizeObserver + estado | `getBoundingClientRect()` en `getAreaSegura` | Pull ya diseñado (MOTR-08) |
| Cache/fetch del dump | SWR/React Query | `cargarAdyacencia()` (existente) | Una sola petición por carga (VIST-04) |
| Reproducibilidad de la home | Math.random directo | mulberry32 de 5 líneas | Testeable y estable entre atrás/adelante |
| Sanitizar HTML del detalle | parser propio | no renderizar HTML: solo texto plano (`white-space: pre-line`) | Evita XSS; el legado trae HTML |

**Idea clave:** el riesgo de esta fase no es la falta de librerías sino el acoplamiento entre tres relojes (ciclo de render de React/Next, promesa del motor, animaciones CSS). La solución es tener un solo lugar —el puente— que los secuencie.

## Huecos encontrados (no están en CONTEXT; requieren Wave 0)

**Hueco 1 — El motor no puede desenfocar (bloquea D-18 y volver a la home).**
`_nodoEnfocado` solo se asigna; `setVista` sin `nodoEnfocado` lo deja intacto. Consecuencias: (a) tras volver a un estado sin foco, `_tick` sigue aplicando el offset de área segura y `nodeFocus` sigue emitiéndose para un nodo posiblemente ya eliminado del grafo (`reemplazo` reconstruye `graphData`), y (b) la cámara no vuelve a una vista general. Cambio mínimo en `SinapsisEngine.js`: al final de `setVista`, si `nodoEnfocado` es `null`/`undefined` → `_nodoEnfocado = null; _ultimoFoco = null;` y, si había foco previo y la transición no fue `reemplazo`, llevar la cámara a la vista general (`cameraController.backToBasicsView()` ya existe; esperar su duración para que la promesa siga significando "la cámara llegó"). Cubrir con un test en `transiciones.test.js`/nuevo.

**Hueco 2 — `setVista` sin cancelación ni reentrancia.** Resuelto en el puente con la cola del Patrón 3; documentarlo como contrato ("no llamar concurrente"). No tocar el motor.

**Hueco 3 — No hay aristas entidad→agrupador en el dato.** En `data/curaduria/vinculos.csv` los 11 `COMPONE` van de **Obras** (área) a sus obras; las otras cinco áreas (Nosotres, Audiovisuales, Editorial, Tecnología, Laboratorios) no tienen ningún vínculo, y **ninguna área está unida a Tropical Poncho**. Sin esa arista, el menú D-09 no puede salir "de la misma data que el grafo" (y no debe hardcodearse por id). Recomendación: `agrupadoresDe` = `COMPONE` entre ENTIDAD y AGRUPACION (cualquier dirección); las fixtures de esta fase lo incluyen; **agregar a la curaduría 02-05 (pausada) las 6 filas `Tropical Poncho → área` `COMPONE`**. Anotarlo como tarea para el dueño, no como bloqueo de Fase 4.

**Hueco 4 — No existe `slug`.** Ni en la migración 001, ni en el import, ni en `NodoGrafo`: los ids son ObjectId hex de 24 caracteres. Las rutas `[slug]` (D-04) exigen resolverlo. Recomendación: `indexarSlugs(topologia)` puro: slug = `label` minúsculas, sin tildes, no alfanumérico → `-`; ordenar por `id` y a las colisiones agregar `-2`, `-3` (hay un caso real: "SOMA BETA"/"SOMA beta"). Determinista para el mismo dump. `// ponytail: slug derivado; renombrar un nodo cambia su URL. Salida: columna slug única en migración 002 poblada por el import.` (Pregunta abierta 1.)

**Hueco 5 — Alias de TypeScript.** `tsconfig.json` mapea `@/*` → `./src/app/*` y `@/types/*` → `./src/types/*`. `@/lib/...` apuntaría a `src/app/lib/` (no existe). Y `topologia.ts` importa `./adyacencia` sin extensión (no corre bajo `node --experimental-strip-types`). Regla para los módulos nuevos: imports **relativos con extensión `.ts`** y `import type` para los alias (igual que `resolverVista.ts`); desde `src/app/` usar `../lib/red/x.ts`. No tocar el alias.

## Pitfalls comunes

### Pitfall 1: StrictMode y el motor (doble montaje)
**Qué pasa:** React 19 en dev monta → limpia → monta el effect. El código actual tiene `vivo`, pero solo se chequea **una vez**, tras el primer `await import`; hay más `await` después (`constants.js`) y el `new SinapsisEngine` ocurre luego. Si la limpieza corre entre medio, el motor se crea **después** de limpiar y queda huérfano (rAF y `resize` vivos, canvas duplicado, contexto WebGL extra).
**Cómo evitarlo:** volver a chequear `vivo && ref.current` inmediatamente antes de `new SinapsisEngine`; guardar `engine` en un ref para que el cleanup lo destruya; usar los `unsub` que devuelve `engine.on(...)`. Effects separados: (1) ciclo de vida `[]`, (2) navegación `[estadoUrl, ady]` que espera `enginePromise`.
**Señal temprana:** en dev, más de un `<canvas>` dentro del contenedor, o `renderer.info` duplicado. Smoke: `document.querySelectorAll('canvas').length === 1`. Además verificar empíricamente que `graph._destructor()` de 3d-force-graph retira el canvas (el código de la librería pausa la animación y vacía `graphData`; la remoción del DOM no se verificó).

### Pitfall 2: pushState y los popstate de Next
**Qué pasa:** el `onPopState` de Next (15.5.22) ignora entradas sin `state` y **recarga la página** si `state.__NA` falta. Un `pushState(null, '', url)` es seguro porque el parche de Next inyecta `__NA` y el árbol; pero el árbol guardado es el de la página desde la que empujaste (p. ej. `/`), mientras la URL es otra. Como todas las páginas devuelven `null` y la UI se deriva de `usePathname()`, no molesta; pero **si alguien pone contenido en las `page.tsx`, atrás mostrará la página equivocada**.
**Cómo evitarlo:** páginas siempre `null`; nunca pasar un `state` con `__NA`/`_N`; smoke de atrás/adelante en `/browse`, incluyendo recargar en `/obra/x` y volver. **Confianza MEDIA** hasta esa prueba.

### Pitfall 3: `useSearchParams` sin Suspense
Rompe `next build` en páginas estáticas (docs). En dev no avisa (dev no suspende). Siempre `<Suspense>` alrededor del `Shell`; correr `npm run build` como gate.

### Pitfall 4: Carrera de navegaciones
Click rápido o atrás/adelante durante un `setVista`. Solución: cola "el último gana" (Patrón 3). Deshabilitar botones (`aria-busy`) ayuda pero **no cubre el botón del navegador**.

### Pitfall 5: Foco fuera del subgrafo
`/obra/x?red=y` donde `x ∉ Vista(y)`, o slug inválido: el motor no enfoca y `setVista` resuelve normal → el panel aparecería sin cámara. Chequear membresía en el puente y, si falta, o bien cargar `red = x` o mostrar "No encontramos ese nodo" (UI-SPEC).

### Pitfall 6: Panel visible antes de la cámara / cámara contra un rect vacío
Ver Patrón 5: contenedor siempre maquetado; el fade-in del panel se dispara **solo** con `fase==='listo'`. Con `prefers-reduced-motion` mantener el orden (solo cambia la duración del fade).

### Pitfall 7: Hidratación de una UI derivada de datos del cliente
El servidor renderiza `cargando`; el cliente, antes del fetch, también `cargando`. Nada que dependa de `Math.random()`, `window` o `localStorage` en el render. `useSearchParams` bajo Suspense evita el mismatch de query.

### Pitfall 8: Tailwind vs CSS legado
`globals.css` importa `fonts.css`, `style.css` e `index.css` **antes** de `@tailwind base`. El preflight de Tailwind (`button {…}`, `a {…}`, `h1 {…}` con especificidad de elemento) y el `a { color:#b700ff }` de `style.css` compiten con los reset legados; las clases `.bn`, `.floatingMenu` ganan por especificidad de clase, pero los elementos sin clase (`<a>`, `<h1>`, `<button>` del overlay) cambian de aspecto. Además `globals.css` deja `--background:#fff` en modo claro y `<body>` con `text-center` (UI-SPEC ya lo pide corregir). Regla: todo elemento del overlay lleva clase propia; no depender de estilos de elemento. **No** migrar a `next/font`: las fuentes (Gotham en varios pesos + Briller) ya cargan por `@font-face` desde `/public/fonts` y funcionan; migrarlas no aporta nada a esta fase. Opcional y barato: `<link rel="preload" as="font" crossorigin>` de los dos archivos del cuerpo/títulos para reducir el FOUT.

### Pitfall 9: `cargarAdyacencia` no se recupera de `fetch` rechazado
Si `fetch` rechaza (sin red) `pendiente` queda con la promesa rechazada para siempre: `Reintentar` no reintenta. Agregar `.catch(e => { pendiente = undefined; throw e })` en `topologia.ts`. Es un borde de manejo de errores (no se simplifica).

### Pitfall 10: Load time (pantalla negra)
`warmupTicks(300)` síncrono + creación de nodos bloquean el hilo; PERF-01: 12 nodos ≈ 1,7 s; 200 ≈ 15 s (4x). Mitigaciones de esta fase (no del motor): límite de home 40, `limite` en toda Vista (misma constante), loader compositor-only, dos rAF antes de `setVista`, cargar motor y topología en paralelo. La carga progresiva queda diferida (CONTEXT).

### Pitfall 11: Mobile
`100dvh`/`70dvh` en vez de `vh`; `touch-action: pan-y` solo en el panel; el canvas necesita recibir el gesto en las zonas libres (overlay `pointer-events:none`, hijos interactivos `auto`). En mobile el área segura cambia con la altura del panel: `getAreaSegura` se re-lee solo, pero el encuadre ya hecho no se recalcula por sí mismo (`applySafeArea` reajusta el offset cuadro a cuadro; verificar con scroll de la ficha).

## Ejemplos de código

### Effect de ciclo de vida seguro para StrictMode
```tsx
// Fuente: SinapsisEngine.js (contrato) + patrón de guardas; sustituye al effect actual
useEffect(() => {
  let vivo = true
  let engine: any // ponytail: motor es JS; d.ts a mano si la superficie crece
  const unsub: Array<() => void> = []
  ;(async () => {
    const [{ SinapsisEngine }] = await Promise.all([import('../engine/SinapsisEngine.js')])
    if (!vivo || !ref.current) return
    engine = new SinapsisEngine(ref.current, { getAreaSegura })   // sin awaits entre el chequeo y el new
    unsub.push(engine.on('nodeClick', (n: { id: string }) => navegarA(n.id)))
    unsub.push(engine.on('vistaLista', marcarPrimeraVista))
    resolverMotor(engine)                                          // el effect de navegación espera esto
  })()
  return () => { vivo = false; unsub.forEach(f => f()); engine?.destruir() }
}, [])
```

### Navegación propia con historial
```ts
// Fuente: docs Next "Native History API" + app-router.js (15.5.22)
function navegarA(url: string, t: Transicion) {
  const idx = (history.state?.sinapsis?.idx ?? 0) + 1
  history.pushState({ sinapsis: { idx, t } }, '', url)   // Next sincroniza usePathname/useSearchParams
}
addEventListener('popstate', (e) => {
  const nuevo = e.state?.sinapsis
  direccionRef.current = !nuevo ? 'dura' : nuevo.idx < idxActual ? 'atras' : 'adelante'
})
```

### Área segura desde el panel
```ts
const getAreaSegura = () => {
  const r = panelRef.current?.getBoundingClientRect()
  if (!r || !hayFoco.current) return { top: 0, right: 0, bottom: 0, left: 0 }
  return innerWidth >= 800
    ? { top: 0, right: 0, bottom: 0, left: r.right }
    : { top: 0, right: 0, bottom: innerHeight - r.top, left: 0 }
}
```

### PRNG sembrado
```ts
// ponytail: mulberry32; suficiente para muestrear una home, no es criptográfico
export const prng = (s: number) => () => {
  s |= 0; s = (s + 0x6d2b79f5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
```

## Fixtures y datos de desarrollo (02-05 pausada)
- Postgres: el repo trae `docker-compose.yml`, pero no se pudo confirmar que la base esté levantada ni poblada (ver Environment). El endpoint devuelve 503 si cae. **No** hacer fallback silencioso a fixtures en error (ocultaría una caída real).
- Recomendado: `TOPOLOGIA_FIXTURE=1` (env explícita, sin commitear) hace que `route.ts` de `topologia` y `nodo/[id]` sirvan `src/lib/red/fixtures/{topologia,detalles}.json`; el borde de confianza sigue siendo el route handler y el cliente no cambia. ~30 nodos que cubran: Tropical Poncho + 6 áreas (`COMPONE`), obras con y sin thumb, una obra con detalle completo (galería + enlaces + YouTube), creadxrs con `rol`, un stub, un nodo sin descripción, un EVENTO, un área sin nodos, y dos labels que colisionan en slug.
- Alternativa descartada: reusar `src/engine/fixtures/subgrafoDemo.js` (12 nodos, sin áreas ni detalle; y `src/app` no puede importar el motor salvo el puente).

## Estado del arte

| Antes | Ahora | Impacto |
|-------|-------|---------|
| `router.push` como única forma de navegar | `history.pushState/replaceState` integrados al router (documentado, presente en 15.5.22) | Navegación de solo-URL sin RSC |
| `searchParams` prop de página | `useSearchParams` bajo `<Suspense>` en un layout persistente | Único modo de leer query en el shell |
| Snapshot de un slot (prototipo) | Historial del navegador + `{idx,t}` | Cumple D-05/D-18 |

**Nota de versión:** los docs consultados son de la 16.x; el comportamiento de `pushState` se verificó además en el código de 15.5.22 instalado (`node_modules/next/dist/client/components/app-router.js`).

## Preguntas abiertas

1. **Slug derivado vs columna.**
   - Sabemos: no hay `slug`; ids son hex de 24 caracteres.
   - Falta: si el dueño acepta que renombrar cambie la URL.
   - Recomendación: derivado ahora (`slugs.ts`), con `ponytail:`; columna única en migración 002 al retomar 02-05 (el import la puede poblar con la misma función).
2. **Contrato del detalle (D-13) vs metadata legado.**
   - Sabemos: la metadata real no trae `texto/galeria/enlaces/youtube`.
   - Falta: quién la normaliza (curaduría 02-05 o mapeo en la ruta).
   - Recomendación: definir `DetalleNodo` y validarlo en la ruta; fixtures ahora; mapeo legado→contrato en 02-05. El botón "Ver más" aparece para toda OBRA no-stub y la ficha, si no hay detalle, muestra solo créditos (que sí salen de vínculos).
3. **Dónde vive `transicionEntrada` (D-16).**
   - Sabemos: `viz_params` acepta strings ≤32 caracteres (no rompe el CHECK de escalares); `VizParams` es un tipo TS.
   - Recomendación: `vizParams.transicionEntrada?: Transicion` (cero migraciones), validado al leer. Aclarar en `vista.ts` que es un escalar de comportamiento, no visual. Si el dueño lo siente como mezcla de conceptos: columna `transicion_entrada` nullable en 002 + `route.ts` + `NodoGrafo` (mismo alcance que el slug, se pueden hacer juntos).
4. **Semántica de los estados del menú superior en home.** Discreción: sin menú (UI-SPEC lo confirma).
5. **`EVENTO` en rutas.** Recomendación: `/obra/…` (una obra que ocurre); no hay decisión del dueño.

## Disponibilidad del entorno

| Dependencia | Requerido por | Disponible | Versión | Fallback |
|-------------|---------------|------------|---------|----------|
| Node | tests, dev, build | Sí | 22.14.0 | — |
| Next / React | app | Sí | 15.5.22 / 19.2.8 | — |
| Docker CLI | Postgres local | Sí | 24.0.6 (CLI; **no se verificó el daemon ni el contenedor**) | Fixtures por `TOPOLOGIA_FIXTURE=1` |
| Postgres poblado | `/api/topologia` real | Sin verificar (`pg_isready` no está en PATH) | — | Fixtures |
| Navegador headless (gstack `/browse`) | smoke checks | Disponible por skill | — | Verificación manual en Chrome con GPU |
| GPU real | fps | No en headless | — | PERF-01 ya documenta la limitación |

**Sin bloqueos.** Todo lo que falta tiene fallback.

## Cómo se prueba (Fase 4)

`workflow.nyquist_validation` está en `false` en `.planning/config.json`: no se genera la sección formal de Validation Architecture. Esto responde la pregunta 7 del pedido.

**Framework:** `node --test --experimental-strip-types "src/**/*.test.*"` (`npm test`, Node 22.14). Sin `jsdom` ni testing-library (Disciplina; los componentes no se prueban con un DOM simulado).

### Testeable en headless (funciones puras en `src/lib/red/`)
| Comportamiento | Archivo de test | Casos mínimos |
|----------------|-----------------|---------------|
| URL ↔ estado, clamp de `prof`, `red=_`, slug inválido | `url.test.ts` | ida y vuelta; `?prof=99` → 4; `red` ausente = enfocado |
| Slugs con colisión y tildes | `slugs.test.ts` | "SOMA BETA"/"SOMA beta"; determinismo |
| `fraccionHome` | `home.test.ts` | misma semilla ⇒ mismo resultado; `≤ limite`; mezcla ENTIDAD/OBRA; sin nodos huérfanos de vínculos |
| Menús (`agrupadoresDe`, `nodosDeLaRed`, `creditosDe`) | `menus.test.ts` | entidad sin áreas ⇒ `[]`; dedupe de créditos; rol |
| Botones por tipo | `botones.test.ts` | stub OBRA sin "Ver más"; ENTIDAD sin sub-red sin "Entrar"; override de transición inválido ⇒ default |
| `inversa` / `transicionPara` | `navegacion.test.ts` | atrás usa la inversa de la entrada abandonada; adelante usa la de destino; sin state ⇒ `reemplazo` |
| Validación de `DetalleNodo` | `detalle.test.ts` | id de YouTube inválido; url `javascript:`; thumb con esquema |
| Hueco 1 del motor | `transiciones.test.js` o nuevo | tras `setVista` sin foco, `_nodoEnfocado === null` (si es testeable sin GPU; si no, va al smoke) |

### Requiere navegador (gstack `/browse`; sin GPU, los fps no se miden)
Recorrido de smoke (WebGL por software alcanza; PERF-01 ya reproduce draw calls en headless): (1) carga de `/` → un solo `<canvas>`, sin errores de consola, loader se retira; (2) click en nodo → URL cambia, panel aparece **después** de la cámara; (3) `entrar` en una ENTIDAD → `?prof` en URL; (4) atrás → animación inversa y panel oculto durante el movimiento; (5) recarga en `/obra/<slug>` (link duro) y atrás/adelante (valida el Pitfall 2); (6) ráfaga de clicks/atrás sin quedar en estado inconsistente; (7) `npm run build` sin el error de Suspense; (8) `npm run lint`.
**Verificación manual del dueño (UAT):** sensación de la secuencia, mobile real, fps en dispositivo (falta, PERF-01), degradado y legibilidad.

### Gates
- Por commit: `npm test`.
- Por wave: `npm test` + `npm run lint` + `npm run build`.
- Antes de `/gsd:verify-work`: smoke completo en `/browse` + UAT manual.

## Corte de trabajo sugerido (para el planner)
1. **Wave 0 (bloquea el resto):** Hueco 1 (motor: desenfocar); corrección de `globals.css`/`<html lang="es">`/`text-center` (UI-SPEC); `.catch` en `topologia.ts`; fixtures + `TOPOLOGIA_FIXTURE` en ambos handlers; esqueleto de tests.
2. **Wave 1 (puro, paralelizable):** `slugs`, `url`, `home`, `menus`, `botones`, `navegacion`, `detalle` con sus tests.
3. **Wave 2 (puente y rutas):** `Shell` + `layout.tsx` + `CanvasSinapsis` reescrito (StrictMode-safe, cola, `pushState`/`popstate`, `getAreaSegura` del panel, loader) + páginas `null`. Retirar del puente los rigs de medición o dejarlos detrás de `?perf=1` sin ensuciar el flujo real.
4. **Wave 3 (UI):** `Overlay`: panel + degradado, menú superior + hamburguesa, lateral, ficha extendida, estados vacíos/errores, a11y (foco al heading, `Esc`, `aria-live`).
5. **Wave 4:** smoke `/browse`, ajuste de `LIMITE_HOME` con una corrida real, UAT.

## Fuentes

### Primarias (ALTA)
- Código del repo leído completo: `SinapsisEngine.js`, `CanvasSinapsis.tsx`, `layout.tsx`, `resolverVista.ts`, `adyacencia.ts`, `topologia.ts`, `route.ts`, `vista.ts`, `adaptador.js`, `cameraController.js` (enfocarNodo), `animationManager.js` (fadeOut), migración `001`, CSVs de curaduría, `dumps.ts`.
- `node_modules/next/dist/client/components/app-router.js` (15.5.22): parche de `pushState/replaceState`, `onPopState`, `copyNextJsInternalHistoryState`.
- `node_modules/3d-force-graph/dist/3d-force-graph.mjs`: `_destructor`.
- `docs/PERF-01.md`, `03-UAT.md`, `04-CONTEXT.md`, `04-UI-SPEC.md`, `REQUIREMENTS.md`, `CLAUDE.md`.
- https://nextjs.org/docs/app/getting-started/linking-and-navigating — Native History API, prefetch de rutas dinámicas.
- https://nextjs.org/docs/app/api-reference/functions/use-search-params — requisito de Suspense, layouts sin `searchParams`.

### Secundarias / sin verificar (MEDIA-BAJA)
- Comportamiento exacto de `graph._destructor()` respecto al DOM/contexto WebGL: **no verificado**; smoke del Pitfall 1.
- Atrás/adelante con `pushState` sobre el árbol guardado de Next: leído en el source, **no probado en navegador**.
- Estado de la base Postgres local: no verificado.

## Metadata

**Confianza:**
- Stack estándar: ALTA — no hay dependencias nuevas; versiones leídas de `node_modules`.
- Arquitectura (shell, cola, URL): MEDIA-ALTA — deriva del código del motor y de Next verificado; falta prueba empírica de historial.
- Huecos de datos/motor: ALTA — verificados leyendo los archivos (no hay `slug`; `_nodoEnfocado` no se limpia; no hay aristas de áreas a TP).
- Pitfalls: MEDIA-ALTA.

**Fecha:** 2026-09-20
**Válido hasta:** ~30 días (el stack es estable; revisar si se retoma 02-05 y cambia el modelo de datos)
