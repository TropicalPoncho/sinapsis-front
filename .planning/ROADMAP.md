# Roadmap: Sinápsis

## Overview

Milestone 1 turns `sinapsis-front` into the motor + Vistas system with tropicalponcho.art
as the first real consumer. The path: clean the repo down to a known-good base with the
engine source present and the shared `Vista` type defined, then build the Postgres/Strapi/Vista
backend and the vanilla 3D engine in parallel (both import that same type, and the engine
develops against fixture data so it doesn't wait on the endpoint), wire them together into the
Next.js UI, and close by proving the whole thing with tropicalponcho.art running on real
migrated data and zero node-specific code.

The interaction model shapes the whole build: the 3D canvas is a permanent full-screen
background that never unmounts, routes are floating overlays on top of it, and every UI action
is choreographed with a camera move. That is why the `Vista` contract and the bidirectional
React↔engine bridge are settled in Phase 1 and Phase 3 rather than discovered in Phase 4.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Repo Cleanup** (2026-08-06) - Remove the failed react-force-graph-3d attempt, update dependencies, land the engine source from collectiveConscience, carve out `strapi/`, define the shared `Vista` contract
- [x] **Phase 2: Data & Vista Backend** (2026-10-01) - Postgres schema owned by SQL migrations, CSV-curated data import, and the topology endpoint plus `resolverVista`
- [x] **Phase 3: 3D Engine** - SinapsisEngine with its three transitions, React-free, measured for its render ceiling
- [ ] **Phase 4: UI & Navigation** - Persistent canvas above the router, Next.js routes as overlays (home, ENTIDAD, OBRA), URL-driven navigation choreographed with camera moves, data-driven menu
- [ ] **Phase 4.1: Expandir nodo y secciones derivadas** (INSERTED) - Ficha expandida sobre el canvas, acciones derivadas de los datos, secciones por rol y portfolio por tipo de nodo
- [ ] **Phase 5: Tropical Poncho Launch** - tropicalponcho.art live as the ENTIDAD profile page, on real migrated data, no special-cased code

## Phase Details

### Phase 1: Repo Cleanup

**Goal**: The repo is a clean, buildable base — no trace of the react-force-graph-3d experiment, current dependency versions, the engine source copied in from collectiveConscience, Strapi's home carved out, and the shared `Vista` contract defined so phases 2 and 3 can build against the same shape in parallel.
**Depends on**: Nothing (first phase)
**Requirements**: REPO-01, REPO-02, REPO-03, REPO-04, REPO-05
**Success Criteria** (what must be TRUE):
  1. `npm run build` passes clean on current versions of Next, React, three, and TypeScript.
  2. No trace of `mundo.js`, `mundo2.js`, `NetworkContext`, the react-force-graph-3d components, or the dependency itself remains in the repo or `package.json`.
  3. `src/engine/` contains `threeObjects/`, `cameraController`, `animationManager`, and `constants` copied from collectiveConscience, including `crossedLines`, `linkThreeObject`, `threeGlobal`, and `background`.
  4. A TypeScript `Vista` type exists as the shared contract — its fields, the three transitions, and the shape of the returned subgraph — and both the Vista backend and the engine are expected to import it rather than restate it.
  5. `strapi/` exists with its own `package.json`, and `docker-compose.yml` brings up Postgres for local development.

**Plans**: 4 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md — Delete the react-force-graph-3d attempt, settle tsconfig, bring dependencies current (wave 1)
- [x] 01-02-PLAN.md — Copy the engine into `src/engine/`, replace `import.meta.glob` with an explicit barrel (wave 2)
- [x] 01-03-PLAN.md — Write the shared `Vista` contract at `src/types/vista.ts` (wave 2)
- [x] 01-04-PLAN.md — Carve out `strapi/` and bring up Postgres via `docker-compose.yml` (wave 2)

### Phase 2: Data & Vista Backend

**Goal**: Postgres holds the nodo/vínculo model with no `dimensionId`, under a schema this repo owns through plain SQL migrations, the old Mongo data is curated in and the topology is served for the client to traverse locally.
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10, VIST-01, VIST-02, VIST-03, VIST-04, VIST-05, VIST-06, VIST-07
**Success Criteria** (what must be TRUE):
  1. A Postgres schema exists with `nodos` (light columns plus a `metadata jsonb`, `viz_params` holding only scalars) and `vinculos` (`tipo_vinculo` enum without `CUSTOM`, free-text `rol`) tables matching the ERS model — no `dimensionId` field anywhere, and graph queries don't pull `metadata`.
  2. The schema is defined by versioned SQL migrations in this repo — real foreign keys and CHECK constraints, no tool-imposed bookkeeping columns, and no external service with authority to alter the DDL.
  3. The Mongo dumps from `collectiveConscience` are migrated into the new schema, with `neuronType`/`synapseType` translated to the named enums and the `concept` type dropped.
  4. One Next route handler dumps the topology — light nodes plus links — with two joinless queries, and it is the only thing that touches Postgres.
  5. `resolverVista(adyacencia, vista)` is a pure, framework-free, database-free function that resolves a Vista by depth, `filtroNodeTypes`, `filtroVinculos`, `filtroRoles`, `direccion`, `filtroAtributos`, `limite` and `incluirRaiz`, and returns only the un-loaded neighbours of an already-loaded set when asked for depth 1.
  6. The client fetches the topology once, builds the adjacency index in memory and resolves every Vista locally — exploring the network fires no network requests. The same function is importable server-side unchanged, for the day the topology stops fitting in the browser.

**Plans**: 5 plans in 4 waves

Plans:
- [x] 02-01-PLAN.md — Schema Postgres, runner de migraciones SQL y las CHECK que hacen cumplir los invariantes (wave 1)
- [x] 02-02-PLAN.md — `resolverVista` y el índice de adyacencia, puros y con test runnable (wave 2)
- [x] 02-03-PLAN.md — Primera pasada de la migración: dump de Mongo a CSV de curaduría (wave 2)
- [x] 02-04-PLAN.md — Route handler de topología con dos SELECT sin joins y carga única en el cliente (wave 3)
- [x] 02-05-PLAN.md — Curaduría de tipos en planilla y segunda pasada: CSV corregido a Postgres (wave 4)

### Phase 3: 3D Engine

**Goal**: `SinapsisEngine` renders and transitions between any Vista independent of React, cleans up after itself, and its real render ceiling is measured and written down.
**Depends on**: Phase 1
**Requirements**: MOTR-01, MOTR-02, MOTR-03, MOTR-04, MOTR-05, MOTR-06, MOTR-07, MOTR-08, MOTR-09, MOTR-10, MOTR-11, MOTR-12, PERF-01
**Success Criteria** (what must be TRUE):
  1. `SinapsisEngine` mounts on a DOM element and exposes only `setVista(vista, { transicion })` and `on(evento, handler)` as public API — the engine imports no React, and only one bridge file imports both it and React.
  2. Feeding the engine a fixture Vista via `reemplazo` produces the fade-to-black-and-zoom swap, via `filtrado` keeps existing instances in place and fades out what's no longer in the Vista, and via `aditivo` adds the new nodes without disturbing what's already on screen — and any Vista can be driven by any of the three.
  3. Swapping to a new network releases the geometries, materials, and textures of the nodes that left the scene.
  4. The engine accepts the safe-area rect **continuously** — scroll changes it, so it cannot be set once per route — and frames the focused node inside it. An `Image` node fits entirely within the rect; any other shape only needs its centre inside, and bleeding off-viewport is desirable.
  5. On focus, the engine picks the camera angle so the node's edges radiate away from the occluded side, and reports the node's projected screen point through `on`. The panel never switches sides — this replaces today's `aimAtNode` returning `izq`/`der`.
  6. Camera animations are awaitable from outside, so a caller can sequence animation and overlay instead of firing both at once.
  6. A documented number states how many nodes the engine sustains at 30fps on a mid-range device — measured both with a bare canvas and with an overlay covering most of the screen, which is the common case — along with draw calls per node.

**Plans**: 6 plans in 5 waves

Plans:
- [x] 03-01-PLAN.md — Geometria pura del encuadre y del angulo de orbita, testeada headless (wave 1)
- [x] 03-02-PLAN.md — Adaptador Subgrafo -> force-graph, fixtures, y liberacion sin romper el geometryCache (wave 1)
- [x] 03-03-PLAN.md — SinapsisEngine: montaje, `on`, `reemplazo`, la promesa, y el archivo puente (wave 2)
- [x] 03-04-PLAN.md — Transiciones `filtrado` y `aditivo` con pinning fx/fy/fz (wave 3)
- [x] 03-05-PLAN.md — Area segura continua, encuadre por `shape`, orbita por centroide y `nodeFocus` (wave 4)
- [x] 03-06-PLAN.md — Medicion PERF-01 en los dos escenarios y checklist visual de la fase (wave 5)

### Phase 4: UI & Navigation

**Goal**: Visitors can explore the network in the browser end to end, over one continuous 3D space — the canvas is the persistent background, routes are overlays on top of it, and every navigation is choreographed with a camera move.
**Depends on**: Phase 2, Phase 3
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-08, UI-09, UI-10
**Success Criteria** (what must be TRUE):
  1. Landing on the site shows a navigable 3D global network, usable by mouse on desktop and by gestures on mobile.
  2. The canvas mounts once above the router and survives every route change without remounting — navigating between home, ENTIDAD and OBRA never restarts the 3D scene.
  3. Tapping a node shows its information and lets the visitor keep exploring along its vínculos, with the panel scrimmed over the text side and the region holding the neuron left transparent — left on desktop, top on mobile.
  4. An ENTIDAD node page shows that entity's network and the obras it produced; an OBRA node page shows its ficha técnica and the artists who collaborated on it.
  5. A route change sequences the Vista change, the camera animation and the overlay rather than firing them in parallel.
  6. The active Vista is reflected in the URL — the browser back button steps back through the Vista history, and a Vista link can be shared and reopened directly.
  7. The side nav menu is rendered from the same data feeding the graph, with no separate hardcoded menu structure.

**Plans**: 12/13 plans executed (7 + 4 de cierre de gaps del UAT 1; 04-12 y 04-13 cierran los gaps del UAT 2, waves 1-2 propias)

Plans:
- [x] 04-01-PLAN.md — Motor puede desenfocar, topologia.ts se recupera de fetch rechazado, fixtures y endpoint de detalle (wave 1)
- [x] 04-02-PLAN.md — Slugs, gramatica de URL y logica de transicion/historial, puras y testeadas (wave 1)
- [x] 04-03-PLAN.md — Home sembrada, menus/creditos y registro de botones, puros y testeados (wave 1)
- [x] 04-04-PLAN.md — Shell en layout.tsx, puente CanvasSinapsis con cola y area segura desde el panel, rutas nulas (wave 2)
- [x] 04-05-PLAN.md — Overlay: estilos, panel de foco con degradado, botones por tipo, loader y errores (wave 3)
- [x] 04-06-PLAN.md — Menu superior, lateral y hamburguesa; ficha extendida de OBRA (wave 4)
- [x] 04-07-PLAN.md — Gates, smoke en navegador headless y UAT del dueno (wave 5)
- [x] 04-08-PLAN.md — Gaps: panel se oculta antes de cambiar (G-02), Volver sin salto (G-01), cámara nunca en NaN tras un crédito (G-04 motor), "Sinápsis" abajo en mobile (G-07) (gap wave 1)
- [x] 04-09-PLAN.md — Gaps: el menú enfoca el área, entrar es zoom in y volver la inversa, área sin la dueña flotando; ENTIDAD entra con reemplazo (G-03, enmienda D-16) (gap wave 2)
- [x] 04-10-PLAN.md — Gaps: D-22 (lo sumado al recorrer vive en memoria del Shell, la URL lleva el ancla; excepción al invariante escrita); crédito suma al colaborador, "Sumar sus obras", criterio G-05, estado vacío de área (G-04, G-05) (gap wave 3)
- [x] 04-11-PLAN.md — Gaps: auditoría ponytail, D-23 y CONTEXT/UI-SPEC enmendados, re-smoke de gaps y reglas de D-22, UAT del dueño con base real (D-16, menú en preview) (gap wave 4)
- [x] 04-12-PLAN.md — Gaps del UAT 2: VOLVER del área reproducido con la base real, sube un nivel, y navegar no apila la URL actual (G-09); la entrada a una entidad con áreas es la raíz y sus áreas, con vínculos virtuales derivados de sus miembros (G-08, D-24); adentro de un área, la entidad queda fija, el menú marca el área activa y el lateral sigue la captura del dueño (G-10, D-25) (gap wave 1)
- [ ] 04-13-PLAN.md — Gaps del UAT 2: auditoría ponytail de 04-12, D-24/D-25 y sus enmiendas en CONTEXT/UI-SPEC, re-smoke de G-08..G-10 y UAT del dueño 3 contra la captura (gap wave 2)

**UI hint**: yes

### Phase 04.1: Expandir nodo y secciones derivadas (INSERTED)

**Goal**: Cada nodo se puede expandir (ficha de lectura que sube por encima del canvas) o ingresar (red interna), con las acciones derivadas de los datos; el panel de preview ocupa el ancho libre; y un evento u obra muestra secciones virtuales derivadas de los roles de sus vínculos, con un recorrido recursivo hasta lxs creadxrs y sus propias áreas.
**Requirements**: UI-04, UI-11, UI-12, UI-13, UI-14, UI-15, UI-16, UI-17, UI-18, UI-19
**Depends on:** Phase 4
**Plans:** 6/7 plans executed (4 en 4 waves; 04.1-05, 04.1-06 y 04.1-07 cierran los gaps del UAT, waves 1-3 propias)

Plans:
- [x] 04.1-01-PLAN.md — Secciones derivadas de los roles: vocabulario curado en datos (`roles.json`) y `seccionesDe` pura, probada con SOMA, Rama y el censo de roles reales (D-29, D-32) (wave 1)
- [x] 04.1-02-PLAN.md — Expandir (variante A) desde los datos: ficha sobre el canvas sin mover la cámara, cabecera con secciones y scroll-spy, columna de 620-680 px; panel fluido y título grande en mobile dentro del área segura; auditoría de D-31 (D-26, D-27, D-28, D-31, D-33..D-35) (wave 2)
- [x] 04.1-03-PLAN.md — Entrar desde los datos (también obras y eventos), menú de secciones derivadas, lista lateral de una sección y recorrido recursivo hasta lxs creadxrs y sus propias secciones o áreas, también desde la ficha (D-26, D-29, D-30, D-36, D-37) (wave 3)
- [x] 04.1-04-PLAN.md — Auditoría ponytail, D-32..D-37 en CONTEXT y enmiendas de la Fase 4 (CONTEXT y UI-SPEC), re-smoke headless y UAT del dueño (wave 4)
- [x] 04.1-05-PLAN.md — Gaps/pedido del dueño 2026-10-18: ficha por bloques de contenido configurables en datos (`bloques.json` + override en `metadata.ficha`), créditos por rol en una columna a la derecha, carga de curaduría `fichas.json` → `importar.ts` → `metadata.ficha` validada en el borde (Alterego de punta a punta), evento futuro con fecha/horario/espacio en preview y ficha más Entradas, animación de expandir sin mover la cámara (D-38, D-39, D-42..D-44) (gap wave 1)
- [x] 04.1-06-PLAN.md — Gaps G41-01 y G41-02: etiquetas de sección por contexto en `roles.json` → `contextos` (un espacio lee "Eventos", una banda "Conciertos"); la subred de una entidad sin áreas muestra sus eventos y obras en lugar de personas (decisión del dueño, `vistaDe`); tabla y test de neuronas por contexto (D-40, D-41, D-45) (gap wave 2)
- [ ] 04.1-07-PLAN.md — Cierre: auditoría ponytail de 04.1-05/06, D-38..D-45 en CONTEXT (D-24 enmendada) y UI-SPEC, re-smoke headless y UAT del dueño con Alterego como evento futuro (gap wave 3)

**Fase abierta tras el UAT del dueño (2026-10-17, "bastante bien"):** gaps G41-01 (etiquetas de sección según el contexto del nodo, UI-14) y G41-02 (auditoría de qué neuronas aparecen en cada situación, UI-15) en `04.1-UAT-GAPS.md`, más el pedido del dueño del 2026-10-18 (ficha por bloques, créditos a la derecha, evento futuro, animación; UI-17..UI-19) y su decisión sobre la red de las entidades sin áreas (D-45): planes 04.1-05, 04.1-06 y 04.1-07.

### Phase 5: Tropical Poncho Launch

**Goal**: tropicalponcho.art works as the live proof point that the model needs no special-casing — the ENTIDAD profile page for Tropical Poncho, running on the real migrated production data.
**Depends on**: Phase 2, Phase 4
**Requirements**: UI-07
**Success Criteria** (what must be TRUE):
  1. Visiting tropicalponcho.art renders through the same ENTIDAD page component and Vista logic as any other espacio node — no node-specific code path.
  2. The page's network and obras reflect the real data migrated in Phase 2, not fixtures.

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 4.1 → 5 (2 and 3 can run in parallel — both depend only on Phase 1)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Repo Cleanup | 4/4 | Complete | 2026-08-06 |
| 2. Data & Vista Backend | 5/5 | Complete | 2026-10-01 |
| 3. 3D Engine | 6/6 | Complete | 2026-09-20 |
| 4. UI & Navigation | 12/13 | In Progress|  |
| 4.1 Expandir nodo y secciones derivadas (INSERTED) | 6/7 | In Progress|  |
| 5. Tropical Poncho Launch | 0/? | Not started | - |
