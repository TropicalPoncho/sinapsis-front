# Phase 1: Repo Cleanup - Context

**Gathered:** 2026-08-06
**Status:** Ready for planning
**Source:** Architecture conversation with the project owner (decisions already settled before planning)

<domain>
## Phase Boundary

This phase produces a clean, buildable base. It writes **no product code** — no Vista endpoint,
no engine class, no UI. It deletes the failed React integration, brings dependencies to a
workable state, lands the 3D engine source from the other repo, carves out Strapi's home, and
defines the one TypeScript contract that Phases 2 and 3 both compile against.

The reason the contract lands here and not in Phase 2 or 3: those two phases run **in parallel**.
Both consume the shape of `Vista` and of the subgraph it returns. If neither defines it first,
they diverge and Phase 4 pays for it.

**In scope:** deletions, dependency versions, file moves, `strapi/` scaffold, `docker-compose.yml`
for Postgres, and `src/types/vista.ts`.

**Out of scope:** implementing anything that consumes the contract. `SinapsisEngine` is Phase 3.
The Vista endpoint is Phase 2. Do not stub either.
</domain>

<decisions>
## Implementation Decisions

### What gets deleted (REPO-01)

The repo contains an abandoned attempt to drive the 3D engine through React. It is being removed,
not repaired. Delete:

- `src/app/lib/mundo.js` and `src/app/lib/mundo2.js`
- `src/app/context/NetworkContext.js` (and the `src/app/context/` directory if it empties)
- `src/app/components/network.js`, `NetworkWrapper.js`, `networkWrapper.js`
- `src/app/components/floatingInfo.js`, `floatingMenu.js`, `RegistrationForm.js`, `ThankYouMessage.js`
- `src/app/utils/ScriptLoader.js`
- The `react-force-graph-3d` dependency from `package.json`

`3d-force-graph` **stays** — it is the force layout and picking engine, and Phase 3 builds on it.
Only the React wrapper goes.

The working tree currently has uncommitted modifications from that attempt. They are being
discarded as part of this deletion; the branch `task/Refactor-en-React` retains them.

### Dependency strategy (REPO-02)

Current state: `next ^15.2.0`, `react ^19.0.0`, `three ^0.174.0`, `typescript ^5`,
`tailwindcss ^3.4.17`, `eslint-config-next 15.1.6`. The repo was last touched around May 2025.

**The real risk is `three`, not Next.** The engine source being copied in was written against
`three 0.147` in the other repo. Between 0.147 and current there are breaking changes that hit
exactly what this engine uses: raw `ShaderMaterial` conventions, the color management defaults,
and the import path for `CSS2DRenderer` (used by `ThreeObject`). `collectiveConscience` also
depends on `three-custom-shader-material`, which is version-coupled to `three`.

Deciding the `three` version is a **research question, not a preference**. Two acceptable outcomes:

1. Move to a current `three` and fix the shader/import fallout in this phase.
2. Pin `three` to a version the engine already works against and record it as a deliberate
   ceiling with a `ponytail:` comment naming the upgrade path.

Pick whichever produces the smaller, more honest diff. Do not half-upgrade and leave broken
shaders for Phase 3 to discover.

`tailwindcss` is on v3. Tailwind v4 is a different configuration model entirely. Unless research
shows the migration is trivial, staying on v3 is the lazy and correct choice for this phase —
the phase's job is a clean base, not a CSS migration.

### Where the engine lands (REPO-03)

Source of truth is `C:\Users\ramac\source\TropicalPoncho\collectiveConscience\src\client\`.
**That repo is read-only. It is live in production. Nothing in it may be modified.**

Copy into `src/engine/`:

- `threeObjects/` — the whole directory, all 21 files. The copy already in this repo under
  `src/app/lib/threeObjects/` is from March 2025 and is missing `crossedLinesThreeObject.js`,
  `linkThreeObject.js`, `threeGlobal.js`. Overwrite it from the source; delete the old location.
- `graph/cameraController.js`
- `graph/animationManager.js`
- `graph/constants.js`
- `graph/background.js`
- `graph/utils.js` — `animationManager` and the graph code import from it
- `shaders/noise.js` — imported by `fireThreeObject`, `lightsThreeObject`, `perlinThreeObject`,
  `twistThreeObject` and `waveLineThreeObject`. Omitting it breaks five of the node types.
- `Utils.js` (the one at `src/client/Utils.js`, distinct from `graph/utils.js`) —
  `background.js` calls `Utils.generateHeight()` at two places. It is live code, not a stale
  import: deleting the import line breaks the background at runtime.

Do **not** copy `graph/mundo.js`, `graph/dataLoader.js`, or `graph/graphManager.js`. Those carry
the `dimensionId` model that this project replaces. Phase 3 writes their replacement.

`ThreeObjectManager` auto-registers subclasses via `import.meta.glob('./*ThreeObject.js')`, which
is Vite syntax. Next uses webpack/turbopack and does not support `import.meta.glob`. **This will
break on copy and must be resolved in this phase** — the likely answer is an explicit barrel file
listing the types, which is more boring and more debuggable than the glob anyway.

The engine stays JavaScript. Do not convert it to TypeScript in this phase; that is a large
diff with no payoff toward the phase goal.

### The Vista contract (REPO-04)

One file, `src/types/vista.ts`. Phases 2 and 3 import from it rather than restating it.

Locked shape — this was designed in the architecture conversation and is not open for
reinterpretation by the planner:

```typescript
export type NodeType = 'ARTISTA' | 'OBRA' | 'SERIE' | 'ESPACIO' | 'EVENTO' | 'STUB'

// No CUSTOM. A free-typed link cannot be traversed or filtered by a Vista.
// The escape hatch for nuance is `rol` on the link, not a new type.
export type TipoVinculo =
  | 'COMPONE' | 'COLABORO_EN' | 'CORREALIZO' | 'PRODUJO'
  | 'INTEGRA' | 'INSPIRO' | 'REGISTRO'

export type Transicion = 'reemplazo' | 'filtrado' | 'aditivo'
export type ModoOrden = 'grafo' | 'geo' | 'aleatorio'

// INSPIRO es dirigido: "obras que me inspiraron" y "obras que inspiré"
// son consultas distintas y deben poder pedirse por separado.
export type Direccion = 'sale' | 'entra' | 'ambas'

// Campos nombrados a propósito. NO es un lenguaje de consultas:
// se agrega un campo cuando hace falta un filtro concreto.
// "eventos futuros" = fechaDesde: hoy. "pasados" = fechaHasta: hoy.
export interface FiltroAtributos {
  fechaDesde?: string      // ISO 8601
  fechaHasta?: string      // ISO 8601
  disciplinas?: string[]
  locationIds?: string[]
}

export interface Vista {
  raiz: string | null            // null = vista global
  profundidad: number            // saltos desde la raíz
  filtroNodeTypes: NodeType[]
  filtroVinculos: TipoVinculo[]
  filtroRoles?: string[]         // "solo donde fui DJ" — vacío/ausente = todos
  direccion: Direccion
  filtroAtributos?: FiltroAtributos
  incluirRaiz: boolean           // false = el subgrafo excluye la raíz
  limite?: number                // tope de nodos; protege el render de nodos muy conectados
  modoOrden: ModoOrden
}

export interface NodoGrafo {
  id: string
  nodeType: NodeType
  label: string
  // Máximo 200 caracteres. El tope no es estilo: es lo que mantiene
  // enviable el dump de topología. Sin él, prosa larga en cientos de
  // nodos lo lleva a varios MB.
  descripcionBreve?: string
  thumb?: string
  vizParams: VizParams
  isStub: boolean
  // Escalares filtrables. Viajan en el dump porque el cliente filtra
  // por ellos sin volver al servidor.
  fecha?: string                 // ISO 8601 — creación, o fecha del evento
  disciplina?: string
  locationId?: string
}

// Escalares únicamente. Si esto pudiera contener GLSL, instancing queda
// descartado para siempre — ver CLAUDE.md.
export interface VizParams {
  shape: string
  color: string
  speed?: number
  noise?: number
  seed?: number
}

// Tipado en tres niveles, y cada uno vive en un lugar distinto por peso:
//   1. tipoVinculo — estructural, define cómo se traversa. Va en el dump.
//   2. rol         — semántico y filtrable ("director de arte", "dj",
//                    y para INSPIRO también: "cita directa", "homenaje").
//                    Vocabulario distinto por tipo, mismo campo. Va en el dump.
//   3. descripcion — prosa para leer, NO filtrable. NO va en el dump:
//                    se pide al abrir el vínculo, igual que metadata del nodo.
export interface VinculoGrafo {
  id: string
  origen: string
  destino: string
  tipoVinculo: TipoVinculo
  rol?: string                   // corto, filtrable
}

export interface Subgrafo {
  nodos: NodoGrafo[]
  vinculos: VinculoGrafo[]
}

// React → motor: la zona del viewport que NO está tapada por overlays,
// donde la cámara debe dejar al nodo enfocado.
// Izquierda en escritorio, arriba en mobile.
export interface AreaSegura {
  top: number
  right: number
  bottom: number
  left: number
}
```

Types only. No functions, no runtime values, no zod schemas — nothing to keep in sync.

### Strapi's home (REPO-05)

`strapi/` at the repo root, with its own `package.json` and its own `node_modules`. No npm
workspaces, no turborepo, no shared tooling. Two independent apps in one repo.

Next stays at the repo root. Do **not** restructure it into `apps/web/` for symmetry — that is
a large diff on a working repo purchased with aesthetics.

`docker-compose.yml` at the root brings up Postgres for local development. Strapi itself does not
need to be containerized for dev; it runs with its own `npm run develop`.

Whether to scaffold Strapi fully in this phase or only carve out the directory and compose file
is the planner's call — the success criterion is that `strapi/` exists with its own
`package.json` and that `docker-compose.yml` brings up Postgres. Configuring Strapi's content
types against the real schema is Phase 2 work, not this phase.

### Claude's Discretion

- Exact `three` version and how much shader fallout to absorb (research decides)
- Whether `ThreeObjectManager`'s auto-registry becomes a barrel file, an explicit map, or something else
- How to split this phase into plans and waves
- Whether `strapi/` gets a full scaffold or a minimal one
- Lint/format configuration, as long as `npm run build` passes
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project invariants
- `CLAUDE.md` — the "Disciplina" section and the eight architectural invariants. These are not
  style preferences; each traces to a recorded decision. The relevant ones for this phase:
  the engine imports no React, `dimensionId` does not exist, `viz_params` holds only scalars,
  `CUSTOM` is not in the link enum, `collectiveConscience` is read-only.

### Project context
- `.planning/PROJECT.md` — Key Decisions table with the rationale behind each choice
- `.planning/ROADMAP.md` — Phase 1 success criteria, and how Phases 2 and 3 depend on this one
- `.planning/REQUIREMENTS.md` — REPO-01 through REPO-05

### Source material (read-only, never modify)
- `C:\Users\ramac\source\TropicalPoncho\collectiveConscience\src\client\threeObjects\` — the engine
- `C:\Users\ramac\source\TropicalPoncho\collectiveConscience\src\client\graph\` — camera, animation, constants, background, utils
- `C:\Users\ramac\source\TropicalPoncho\collectiveConscience\package.json` — the dependency versions the engine currently works against
</canonical_refs>

<specifics>
## Specific Ideas

- `ThreeObject.js` imports `CSS2DObject` from `three/examples/jsm/renderers/CSS2DRenderer.js`.
  That path has moved across three versions — it is the canary for the version decision.
- `ThreeObject` already shares geometries across instances through a static `geometryCache`.
  Keep it; it is the groundwork instancing will build on later.
- `threeGlobal.js` exists because the old repo had to resolve THREE differently under AR.
  AR is out of scope now, so this may simplify to a plain import — check before deleting.
- The old repo's `constants.js` holds tuned values (`aimDistance`, `aimOffsetX/Y/Z`, `linkDistance`).
  Those are calibration against real visual output, not arbitrary numbers. Copy them verbatim.
</specifics>

<deferred>
## Deferred Ideas

- Converting the engine to TypeScript — large diff, no payoff toward this phase's goal
- Instancing and LOD — deferred until PERF-01 produces a measurement in Phase 3
- Tailwind v4 migration — different config model, not this phase's job
- Renaming the repo from `sinapsis-front` — cosmetic, does not block anything
- Strapi content-type configuration — Phase 2, once the real schema exists
</deferred>

---

*Phase: 01-repo-cleanup*
*Context gathered: 2026-08-06 from prior architecture conversation*
