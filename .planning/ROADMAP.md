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
- [ ] **Phase 2: Data & Vista Backend** - Postgres schema owned by SQL migrations, CSV-curated data import, and the topology endpoint plus `resolverVista`
- [x] **Phase 3: 3D Engine** - SinapsisEngine with its three transitions, React-free, measured for its render ceiling
- [ ] **Phase 4: UI & Navigation** - Persistent canvas above the router, Next.js routes as overlays (home, ENTIDAD, OBRA), URL-driven navigation choreographed with camera moves, data-driven menu
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
- [ ] 02-05-PLAN.md — Curaduría de tipos en planilla y segunda pasada: CSV corregido a Postgres (wave 4)

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
**Plans**: 7 plans in 5 waves

Plans:
- [x] 04-01-PLAN.md — Motor puede desenfocar, topologia.ts se recupera de fetch rechazado, fixtures y endpoint de detalle (wave 1)
- [x] 04-02-PLAN.md — Slugs, gramatica de URL y logica de transicion/historial, puras y testeadas (wave 1)
- [x] 04-03-PLAN.md — Home sembrada, menus/creditos y registro de botones, puros y testeados (wave 1)
- [x] 04-04-PLAN.md — Shell en layout.tsx, puente CanvasSinapsis con cola y area segura desde el panel, rutas nulas (wave 2)
- [x] 04-05-PLAN.md — Overlay: estilos, panel de foco con degradado, botones por tipo, loader y errores (wave 3)
- [ ] 04-06-PLAN.md — Menu superior, lateral y hamburguesa; ficha extendida de OBRA (wave 4)
- [ ] 04-07-PLAN.md — Gates, smoke en navegador headless y UAT del dueno (wave 5)
**UI hint**: yes

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
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 (2 and 3 can run in parallel — both depend only on Phase 1)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Repo Cleanup | 4/4 | Complete | 2026-08-06 |
| 2. Data & Vista Backend | 0/? | Not started | - |
| 3. 3D Engine | 6/6 | Complete | 2026-09-20 |
| 4. UI & Navigation | 0/7 | Not started | - |
| 5. Tropical Poncho Launch | 0/? | Not started | - |
