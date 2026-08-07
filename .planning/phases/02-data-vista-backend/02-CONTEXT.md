# Phase 2: Data & Vista Backend - Context

**Gathered:** 2026-08-06
**Status:** Ready for planning (two open research questions — see `<open_questions>`)

<domain>
## Phase Boundary

Postgres holds the nodo/vínculo model with no `dimensionId`. The old Mongo data is migrated in.
One endpoint dumps the topology, and `resolverVista` resolves every Vista from it client-side
without further requests.

**In scope:** the Postgres schema, the admin write path, the migration from `collectiveConscience`'s
Mongo dumps, the topology dump endpoint, and `resolverVista`.

**Out of scope:** anything that renders. `SinapsisEngine` is Phase 3, the overlays and routing are
Phase 4. Phase 2 produces data and a pure function, not pixels.

Phase 2 and Phase 3 run in parallel. Both compile against `src/types/vista.ts`, which Phase 1
already locked. Phase 2 does not restate or extend that contract.
</domain>

<decisions>
## Implementation Decisions

### Migration source and triage (DATA-06, DATA-07)

- **D-01:** The migration source is `config/dumps/neurons_prod_23-10-05.json` **only** — 251 rows,
  257 edges. It is the richest real network and the last prod snapshot before the site pivoted to
  the institutional model.
- **D-02:** The 2025 dumps (`neurons_prod_20250708.json`, `neurons_local_20250802_sinlinks.json`,
  `synapses_*_sinlinks.json`) are **not** migrated. They are the institutional site, they carry
  `dimensionId`, and their nodes are the categories DATA-07 says to discard.
- **D-03:** The 171 rows with a blank `name` (68% of the dump) are **dropped**, along with the edges
  that point at them. A node with no name cannot be rendered, labelled, searched or curated; these
  are almost certainly soft-deleted Mongo rows.
- **D-04:** Media-asset rows are dropped: `Stickers`, `Sticker01`–`Sticker04`, `IG Story 01`,
  `Instagram`. They are campaign assets, not entities — note that `Instagram` has the highest
  in-degree (61) in the raw dump and would otherwise become the network's largest hub.
- **D-05:** Category rows are dropped per DATA-07 — `Exposiciones`, `LIVE SETs`, `Meditación`,
  `Poesía performática`, `Visuales`, `ACTIVIDADES`, `PERFORMANCES`, `BANDAS EN VIVO`,
  `ARTES CIRCENSES`, `VJ`, `Biodanza`, `In Session`, `tickets` and similar. These are the
  "categorías del sitio institucional" the requirement names.
- **D-06:** Expected yield is roughly **40–55 real nodes**, not 251. Plan the migration for that
  scale — it is small enough that hand-curation is the cheap option, not the expensive one.

### Node and link typing (DATA-06)

- **D-07:** **DATA-06's premise is factually wrong and the plan must not follow it literally.**
  It says to translate "los `neuronType` y `synapseType` numéricos". Verified across all 20 dump
  files: no `neuronType` field exists anywhere; the 2023 dumps carry `nodeType`, which is a
  *string*, present on **2 of 251 rows**, with the value `"PARTICLES"` — a render type, not a
  semantic one. No `synapseType` exists; 2023 edges are bare `fromId` arrays with no type at all.
  There is nothing to translate. `NodeType` and `TipoVinculo` must be **assigned**.
- **D-08:** Typing is a **two-pass CSV workflow**:
  1. The migration script emits a CSV of the surviving nodes and edges with a best-guess type
     pre-filled.
  2. The user corrects it in a spreadsheet.
  3. A second pass imports the corrected CSV.
  The corrected CSV is committed — it is the durable record of the typing decisions and makes the
  migration re-runnable.
- **D-09:** Best-guess heuristics are a starting point for the human, never the final answer.
  Do not silently ship heuristic types.

### Visual parameters (DATA-03)

- **D-10:** `viz_params` is **assigned, not migrated**. Verified: the chosen dump has zero `style`
  fields, one node with `particles`, and three with a `graphVal` value. The GLSL uniform blobs
  (`uNoiseStrength`, `uBrightness` as x/y/z vectors) exist only in the 2025 institutional dump,
  which is not being migrated — so there is no lossy flattening problem to solve.
- **D-11:** Defaults are **per `node_type`** — one shape and colour for each of ARTISTA, OBRA,
  SERIE, ESPACIO, EVENTO — with `seed` randomized per node so instances do not animate in lockstep.
  Type is legible at a glance in the render.
- **D-12:** Per-node visual overrides happen later in the admin, where someone can see the result.
  They are not curated blind in the CSV.
- **D-13:** Scalars only, per CLAUDE.md. If `viz_params` could ever hold GLSL, instancing is
  permanently off the table.

### Schema shape (DATA-02, DATA-08)

- **D-14:** Deep data lives in a **`metadata jsonb` column on `nodos`**, exactly as DATA-02
  specifies. The topology query never selects it.
- **D-15:** The 200-character limit on `descripcion_breve` is a **DB CHECK constraint**, with
  Strapi `maxLength` on top for a friendly editor error. DATA-08 says "a nivel de base" — the
  constraint is the real guarantee, because the topology dump's size depends on it and Strapi may
  not be the only writer. The migration must pre-truncate: imported prose from `info.bio` will
  exceed 200 chars.

### Vista resolution (VIST-01..07)

- **D-16:** `resolverVista` lives at **`src/lib/vista/`** in the Next app as plain TypeScript. It
  imports `src/types/vista.ts` and nothing else — no framework, no database, no browser globals.
  VIST-07 is honored by import discipline, not by a package boundary.
- **D-17:** No separate workspace package. CLAUDE.md and the Phase 1 decision rejected npm
  workspaces; this does not reopen that.
- **D-18:** `resolverVista` does **not** live inside `strapi/`. That would couple the frontend to
  the Strapi directory and break if Strapi is dropped.
- **D-19:** The client **fetches the topology once on load, with no revalidation**. The adjacency
  index is built in memory and every Vista resolves locally — exploring fires zero network
  requests (VIST-04). At ~50 nodes the payload is a few KB. Admin edits appear on next reload,
  which is correct for a curated art network that changes rarely.
- **D-20:** No ETag layer, no caching strategy, no SSR-embedded payload. Add one when there is a
  measured need.

### Claude's Discretion

- Exact best-guess heuristic used to pre-fill the CSV (topology position, name patterns, or both)
- CSV column layout and the shape of the two-pass script
- Default shape/colour values per `node_type`
- Adjacency index data structure
- How `resolverVista` is verified, and the fixture graph it runs against — not discussed, but
  CLAUDE.md's "Disciplina" requires one runnable check for non-trivial logic, and this is the
  function everything else depends on
- `limite` truncation ordering and `modoOrden: 'geo'` semantics — currently unspecified in the
  contract; note only 3 nodes in the source have any location data
</decisions>

<open_questions>
## Open Research Questions

**These two are deliberately unresolved. The phase researcher answers them with evidence; the
planner must not assume either way.**

### OQ-01: What role should Strapi actually play?

The project owner does not want the data model governed by Strapi, and does not want the system
coupled to an external app that should only be an admin-data-loading tool. This is consistent with
CLAUDE.md's invariant "Una sola base. Postgres es la fuente de verdad" — if Strapi owns the DDL,
Strapi becomes the source of truth, not Postgres.

Three candidate outcomes:

1. **Admin-only, zero authority.** Schema is hand-written SQL and is the source of truth. Strapi is
   pointed at those tables purely as a CRUD panel and can be deleted without the app noticing. The
   topology endpoint becomes a Next route hitting Postgres directly. **Requires amending VIST-05**,
   which currently reads "Strapi expone un endpoint que dumpea la topología... es el único punto
   que toca Postgres."
2. **Drop Strapi entirely.** Delete `strapi/` and the Phase 1 scaffold. Admin CRUD becomes a small
   internal Next page. **Removes DATA-05.**
3. **Keep as originally specified.** Strapi owns the schema and the endpoint per DATA-01/05 and
   VIST-05.

**What research must establish:** how hard Strapi 5.51.2 actually fights being pointed at tables it
did not create. Specifically — does it attempt to alter or drop columns on boot when its
content-type schema does not match the existing DDL, and can that be disabled? The orchestrator's
claim that this is "recurring friction" was general knowledge, not measured against 5.51.2, which
is why the decision was deferred rather than made.

**Correction already established and not open for re-litigation:** end-user content submission
*is* possible with Strapi. Two identity systems exist — admin users (the `/admin` panel, staff
only) and API users (`@strapi/plugin-users-permissions`, already installed by the Phase 1 scaffold).
Artists submitting their own work is a Next UI POSTing to the Strapi API as an authenticated API
user with a role-scoped permission. What Strapi does not provide is a public-facing panel. The
initial belief that user upload was impossible with Strapi was mistaken.

### OQ-02: How does `vinculos` reference its endpoint nodes?

Follows from OQ-01 and was explicitly deferred with it.

- If the schema is hand-written (outcomes 1 or 2): `origen`/`destino` are plain node-id columns
  with FK constraints, and the topology dump is a genuinely joinless SELECT. This resolves
  automatically.
- If Strapi retains schema authority (outcome 3): modelling them as Strapi relations produces link
  tables (`vinculos_origen_lnk`, `vinculos_destino_lnk`), and dumping links then requires 2 joins —
  contradicting VIST-05's "dos consultas sin joins". Relations buy a real node picker in the admin;
  scalar columns show raw ids.

**Constraint on any outcome:** VIST-05's "two joinless queries" is the requirement text. If the
chosen path cannot satisfy it literally, the requirement must be amended explicitly rather than
quietly missed.
</open_questions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project invariants
- `CLAUDE.md` — the "Disciplina" section and the architectural invariants. The ones that bind this
  phase: `dimensionId` does not exist and is never persisted; `viz_params` holds scalars, never
  GLSL; `CUSTOM` is not in the `tipo_vinculo` enum and `rol` is the escape hatch; one database,
  Postgres is the source of truth, `metadata jsonb` is the deep data; `collectiveConscience` is
  read-only.

### The contract this phase compiles against
- `src/types/vista.ts` — the locked Vista contract from Phase 1. Twelve exported types, zero runtime
  values. Phase 2 imports it and does not restate, extend or duplicate it.
- `.planning/phases/01-repo-cleanup/01-CONTEXT.md` §"The Vista contract (REPO-04)" — why the shape
  is what it is, including why `descripcionBreve` is capped and why the three-level link typing
  (`tipoVinculo` / `rol` / `descripcion`) splits across three storage locations by weight.

### Project context
- `.planning/PROJECT.md` — Key Decisions table. Directly relevant: "Postgres único, sin Neo4j",
  "La topología vive en el cliente, no en el servidor", "`resolverVista` es una función pura sin
  framework", "Postgres nunca traversa", "Tipado de vínculos en tres niveles", "Strapi en `strapi/`
  del mismo repo".
- `.planning/REQUIREMENTS.md` — DATA-01..08 and VIST-01..07. **Note DATA-06 contains a factual
  error about the source data — see D-07.**
- `.planning/ROADMAP.md` §"Phase 2: Data & Vista Backend" — goal and the six success criteria.

### Source data (read-only, never modify)
- `C:/Users/ramac/source/TropicalPoncho/collectiveConscience/config/dumps/neurons_prod_23-10-05.json`
  — **the migration source.** 251 rows, 257 edges via `fromId` arrays.
- `C:/Users/ramac/source/TropicalPoncho/collectiveConscience/config/dumps/` — the other 19 dumps,
  surveyed and rejected. The 2025 `synapses_*.json` files are the only ones with typed edges, and
  they carry `dimensionId`.

### Phase 1 output this phase builds on
- `docker-compose.yml` — Postgres 16 on `localhost:5432`, db/user/password all `strapi`.
- `strapi/` — Strapi 5.51.2, own `package.json` and `node_modules`, no content types defined yet.
- `.planning/phases/01-repo-cleanup/01-04-SUMMARY.md` — what the scaffold does and does not include.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/types/vista.ts` — the whole contract. `Subgrafo`, `NodoGrafo`, `VinculoGrafo` are the
  migration's target shapes and `resolverVista`'s return type. `FiltroAtributos` names exactly the
  filters the traversal must support.
- `tsconfig.json` — already carries the `@/types/*` alias (Phase 1, plan 01-01), so
  `import type { Vista } from '@/types/vista'` resolves. `strapi` is in `exclude`, so Strapi's
  TypeScript stays outside the root type-check.
- `docker-compose.yml` — Postgres already up and healthy; no infrastructure work needed to start.

### Established Patterns
- **Two independent apps, no workspaces.** Root `package.json` has no `workspaces` key and must not
  gain one. Strapi has its own dependency tree.
- **The engine is JavaScript, the app is TypeScript.** `src/engine/**` is deliberately outside the
  type-check (`include` lists only `.ts`/`.tsx`). New Phase 2 code is TypeScript and inside it.
- **`ponytail:` comments mark deliberate simplifications** with a named ceiling and exit path. D-19
  (fetch once, no revalidation) and D-11 (defaults per type) both warrant one.

### Integration Points
- `src/lib/vista/` — new. `resolverVista` and the adjacency index builder.
- The topology endpoint — a Next route handler or a Strapi custom route, pending OQ-01.
- `strapi/src/api/` — currently holds only `.gitkeep`. Content types land here if OQ-01 keeps Strapi.
- Phase 3 consumes `Subgrafo` from `resolverVista`; Phase 5 depends on this migration producing a
  real `Tropical Poncho` ESPACIO node — it is present in the chosen dump with in-degree 9.
</code_context>

<specifics>
## Specific Ideas

- The project owner's objection, in their words: Strapi should be "solo para cargar información de
  administración", and the system should not be "atado a strapi, a una app externa". The schema
  should not be Strapi's to govern.
- `Instagram` has in-degree 61 in the raw dump — the single largest hub. Any migration that does
  not drop media-asset nodes will produce a network whose centre is an Instagram logo.
- Only 8 of 251 nodes have a bio and 7 have an image. The migrated network will be structurally
  real but textually sparse; the curation CSV is where that gets fixed, not the migration script.
- `Rama Cerratto` (the project owner) has in-degree 36 — second-largest. Useful as a test root for
  a dense-node Vista, and for the `limite` behaviour that protects the render.
- `Tropical Poncho` is present with in-degree 9 — this is Phase 5's proof-point node.

</specifics>

<deferred>
## Deferred Ideas

- **`resolverVista` verification strategy** — offered but not discussed. Left to Claude's
  discretion under CLAUDE.md's one-runnable-check rule.
- **`limite` truncation ordering and `modoOrden: 'geo'` semantics** — offered but not discussed.
  Unspecified in the contract; only 3 source nodes have location data. Will need a decision before
  `modoOrden` is meaningfully implemented, likely in Phase 3 or 4 when ordering becomes visible.
- **Artist self-submission workflow** — offered but not discussed. Possible via the
  users-permissions API (see OQ-01), but whether it implies ownership columns or a draft state in
  the schema is unresolved. Belongs in a later phase; do not add speculative columns now.
- **Per-node visual curation in the admin** — D-12 defers it past the migration.
- **ETag/caching for the topology endpoint** — D-20 defers it until measured.

</deferred>

---

*Phase: 02-data-vista-backend*
*Context gathered: 2026-08-06*
