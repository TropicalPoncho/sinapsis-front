# Phase 2: Data & Vista Backend - Research

**Researched:** 2026-08-07
**Domain:** Postgres schema design, Strapi 5.51.2 as an admin layer, Mongo→Postgres migration, in-memory graph traversal
**Confidence:** MEDIUM-HIGH (the two deferred questions are answered with primary-source evidence; some Strapi 5-specific internals are corroborated by GitHub issues rather than a single authoritative doc page — flagged inline)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Migration source and triage (DATA-06, DATA-07)**
- **D-01:** The migration source is `config/dumps/neurons_prod_23-10-05.json` **only** — 251 rows, 257 edges. It is the richest real network and the last prod snapshot before the site pivoted to the institutional model.
- **D-02:** The 2025 dumps (`neurons_prod_20250708.json`, `neurons_local_20250802_sinlinks.json`, `synapses_*_sinlinks.json`) are **not** migrated. They are the institutional site, they carry `dimensionId`, and their nodes are the categories DATA-07 says to discard.
- **D-03:** The 171 rows with a blank `name` (68% of the dump) are **dropped**, along with the edges that point at them. A node with no name cannot be rendered, labelled, searched or curated; these are almost certainly soft-deleted Mongo rows.
- **D-04:** Media-asset rows are dropped: `Stickers`, `Sticker01`–`Sticker04`, `IG Story 01`, `Instagram`. They are campaign assets, not entities — note that `Instagram` has the highest in-degree (61) in the raw dump and would otherwise become the network's largest hub.
- **D-05:** Category rows are dropped per DATA-07 — `Exposiciones`, `LIVE SETs`, `Meditación`, `Poesía performática`, `Visuales`, `ACTIVIDADES`, `PERFORMANCES`, `BANDAS EN VIVO`, `ARTES CIRCENSES`, `VJ`, `Biodanza`, `In Session`, `tickets` and similar. These are the "categorías del sitio institucional" the requirement names.
- **D-06:** Expected yield is roughly **40–55 real nodes**, not 251. Plan the migration for that scale — it is small enough that hand-curation is the cheap option, not the expensive one.

**Node and link typing (DATA-06)**
- **D-07:** **DATA-06's premise is factually wrong and the plan must not follow it literally.** It says to translate "los `neuronType` y `synapseType` numéricos". Verified across all 20 dump files: no `neuronType` field exists anywhere; the 2023 dumps carry `nodeType`, which is a *string*, present on **2 of 251 rows**, with the value `"PARTICLES"` — a render type, not a semantic one. No `synapseType` exists; 2023 edges are bare `fromId` arrays with no type at all. There is nothing to translate. `NodeType` and `TipoVinculo` must be **assigned**.
- **D-08:** Typing is a **two-pass CSV workflow**: (1) the migration script emits a CSV of surviving nodes/edges with a best-guess type pre-filled, (2) the user corrects it in a spreadsheet, (3) a second pass imports the corrected CSV. The corrected CSV is committed — it is the durable record of the typing decisions and makes the migration re-runnable.
- **D-09:** Best-guess heuristics are a starting point for the human, never the final answer. Do not silently ship heuristic types.

**Visual parameters (DATA-03)**
- **D-10:** `viz_params` is **assigned, not migrated**. Verified: the chosen dump has zero `style` fields, one node with `particles`, and three with a `graphVal` value. The GLSL uniform blobs exist only in the non-migrated 2025 institutional dump — no lossy flattening problem to solve.
- **D-11:** Defaults are **per `node_type`** — one shape and colour for each of ARTISTA, OBRA, SERIE, ESPACIO, EVENTO — with `seed` randomized per node so instances do not animate in lockstep.
- **D-12:** Per-node visual overrides happen later in the admin, where someone can see the result. Not curated blind in the CSV.
- **D-13:** Scalars only, per CLAUDE.md. If `viz_params` could ever hold GLSL, instancing is permanently off the table.

**Schema shape (DATA-02, DATA-08)**
- **D-14:** Deep data lives in a **`metadata jsonb` column on `nodos`**, exactly as DATA-02 specifies. The topology query never selects it.
- **D-15:** The 200-character limit on `descripcion_breve` is a **DB CHECK constraint**, with Strapi `maxLength` on top for a friendly editor error. The migration must pre-truncate: imported prose from `info.bio` will exceed 200 chars.

**Vista resolution (VIST-01..07)**
- **D-16:** `resolverVista` lives at **`src/lib/vista/`** in the Next app as plain TypeScript. It imports `src/types/vista.ts` and nothing else — no framework, no database, no browser globals.
- **D-17:** No separate workspace package. CLAUDE.md and the Phase 1 decision rejected npm workspaces.
- **D-18:** `resolverVista` does **not** live inside `strapi/`.
- **D-19:** The client **fetches the topology once on load, with no revalidation**. The adjacency index is built in memory; exploring fires zero network requests.
- **D-20:** No ETag layer, no caching strategy, no SSR-embedded payload. Add one when there is a measured need.

### Claude's Discretion
- Exact best-guess heuristic used to pre-fill the CSV (topology position, name patterns, or both)
- CSV column layout and the shape of the two-pass script
- Default shape/colour values per `node_type`
- Adjacency index data structure
- How `resolverVista` is verified, and the fixture graph it runs against
- `limite` truncation ordering and `modoOrden: 'geo'` semantics — currently unspecified in the contract

### Deferred Ideas (OUT OF SCOPE)
- `resolverVista` verification strategy specifics — left to discretion under CLAUDE.md's one-runnable-check rule
- `limite` truncation ordering and `modoOrden: 'geo'` semantics — unspecified in the contract, needs a decision later (Phase 3/4)
- Artist self-submission workflow — possible via users-permissions API, but ownership/draft-state columns are unresolved; belongs in a later phase
- Per-node visual curation in the admin — D-12 defers it past the migration
- ETag/caching for the topology endpoint — D-20 defers it until measured
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| DATA-01 | Postgres schema `nodos`/`vinculos`, no `dimensionId` | See "OQ-01 Answer" and "Standard Stack: Schema DDL" — schema authorship path directly determines who writes this DDL |
| DATA-02 | `nodos` light columns + `metadata jsonb`, topology query excludes `metadata` | See "Architecture Patterns: nodos table" and "Code Examples: topology dump query" |
| DATA-03 | `viz_params` scalars only | See "Architecture Patterns: viz_params defaults per node_type" |
| DATA-04 | `tipo_vinculo` named enum, `rol` short text, `descripcion` long text excluded from topology, no `CUSTOM` | See "Enum vs CHECK constraint" — resolved with evidence, applies regardless of OQ-01 outcome |
| DATA-05 | Strapi CRUD over Postgres | See "OQ-01 Answer" — directly resolves what this requirement can safely mean |
| DATA-06 | Mongo migration (note: requirement text is factually wrong per D-07, types are assigned not translated) | See "Migration Source: Concrete Shape" for the exact fields the script must handle |
| DATA-07 | `concept` type discarded with institutional categories | Covered by D-05; no additional research needed beyond confirming dump shape |
| DATA-08 | `descripcion_breve` 200-char DB-level cap | See "Common Pitfalls: bio truncation" — migration must pre-truncate `info.bio` |
| VIST-01 | `resolverVista` pure traversal function | See "Architecture Patterns: adjacency index + BFS" |
| VIST-02 | `incluirRaiz` | Straightforward filter on the BFS output; no new research needed, contract already locked in `vista.ts` |
| VIST-03 | Same function returns 1-hop neighbors excluding already-loaded nodes | See "Architecture Patterns: adjacency index" — the same adjacency Map serves both root-traversal and expand-from-frontier |
| VIST-04 | Fetch topology once, resolve Vistas locally | See "OQ-01/OQ-02 Answer" — payload size and single-fetch model depend on the topology dump shape |
| VIST-05 | Two joinless queries, single Postgres touchpoint | See "OQ-01 Answer" and "OQ-02 Answer" — the crux of this phase's research |
| VIST-06 | No persisted dimension/level | Already enforced by schema design in DATA-01; no additional research needed |
| VIST-07 | `resolverVista` has zero browser/Strapi imports | See "Code Examples: resolverVista verification" for how this is enforced by a runnable check |
</phase_requirements>

## Summary

Phase 2's two deferred questions both resolve to the same underlying fact: **Strapi 5.51.2's schema-sync-on-boot is not optional, is not reliably disable-able, and is explicitly declared out of support scope by Strapi itself for any database it did not create.** The official docs state plainly that Strapi apps are "not meant to be connected to a pre-existing database, not created by a Strapi application... Attempting to connect to an unsupported database may, and most likely will, result in lost data." A filed GitHub issue (#15027) shows the one configuration flag that looks like an opt-out (`forceMigration: false`) does not reliably prevent Postgres table deletion, and was closed "not planned" by the maintainers — so it cannot be trusted as a safety valve.

This does not mean Strapi must be dropped. It means the two extremes in CONTEXT.md's three-outcome framing are the two safe ones, and the middle ground ("hand-write the DDL, then point Strapi's content-type builder at it as a thin CRUD skin") is the one the evidence argues against — that is exactly the scenario Strapi's own team warns will lose data. Between the two safe extremes, dropping Strapi entirely conflicts with `REQUIREMENTS.md`'s own opening sentence for this milestone ("la data la carga el dueño por Strapi"), so the evidence-backed recommendation is: **let Strapi's content-type builder generate and own the DDL for `nodos`/`vinculos`** (satisfying DATA-05 and avoiding any fight with its schema sync, since Strapi's own opinion of the schema is the schema), while neutralizing the two things that would otherwise break VIST-05 and VIST-06: model `vinculos.origen`/`destino` as **plain scalar columns, not Strapi relation attributes** (Strapi creates a `_lnk` join table for every relation type, including manyToOne — this is documented v4 behavior, corroborated for v5 by production evidence), and **disable Draft & Publish** on both content-types so each entity produces exactly one row (Strapi 5 always adds `document_id`/`published_at`/`locale` columns regardless, but with D&P off, `published_at` is always auto-set to a timestamp rather than splitting into a null-draft/dated-published pair — one row per entity, not two).

This resolves VIST-05 literally (two genuinely joinless `SELECT`s) and DATA-05 literally (Strapi's panel creates/edits/deletes), at the cost of the schema physically carrying Strapi's bookkeeping columns (`document_id`, `published_at`, `locale`, `created_at`, `updated_at`, `created_by_id`, `updated_by_id`) forever, and Postgres being — in the narrow DDL-authorship sense — governed by Strapi. That residual tension is a genuine value tradeoff, not a technical unknown; it should go back to the user for explicit sign-off before the plan locks DATA-01/05 and VIST-05's wording, because it only partially honors the stated objection ("no debería ser de Strapi para gobernar el modelo de datos").

**Primary recommendation:** Strapi content-type builder authors the `nodos`/`vinculos` DDL (satisfies DATA-05, avoids fighting schema sync); `origen`/`destino` are plain UUID/string attributes, not Strapi relations (satisfies VIST-05's joinless constraint); Draft & Publish is disabled on both content-types (keeps row count 1:1 with entity count); `tipo_vinculo` is a Strapi `enumeration` attribute, which Strapi itself implements as VARCHAR + CHECK constraint at the Postgres level — so this choice is free, not a tradeoff. Flag the residual "Strapi governs the DDL" tension to the user before finalizing.

## OQ-01 Answer: What role should Strapi actually play?

**Question:** Does Strapi 5 alter/drop columns on boot when schema.json doesn't match the DB? Is there a supported opt-out? Can a content-type map onto a pre-existing table with custom columns? What does Draft & Publish do to row count?

**Finding 1 — Strapi explicitly disclaims support for pre-existing databases. (HIGH confidence, official docs, verbatim)**

From `docs.strapi.io/cms/configurations/database`, in the "Supported databases" section:

> "Strapi applications are not meant to be connected to a pre-existing database, not created by a Strapi application, nor connected to a Strapi v3 database. The Strapi team will not support such attempts. Attempting to connect to an unsupported database may, and most likely will, result in lost data."

This is not a warning about a corner case — it is the general rule, stated unconditionally.

**Finding 2 — Schema sync deletes unknown tables, and runs every boot. (HIGH confidence, official docs, verbatim)**

From `docs.strapi.io/cms/database-migrations`:

> "Strapi will delete any unknown tables without warning." ... custom migrations (in `./database/migrations`) "run before the automated schema migrations that Strapi also performs on boot."

Automatic schema sync — the process that reconciles `schema.json` content-type definitions against actual DB tables — runs on every `strapi develop`/`strapi start`, not just once. It is documented as "still a work in progress" / "experimental" as of 5.51.2.

**Finding 3 — The one plausible opt-out flag doesn't reliably work. (MEDIUM confidence: official docs confirm the flag's intent; a filed, maintainer-closed GitHub issue contradicts it in practice)**

`docs.strapi.io/cms/configurations/database` documents two `settings` object flags:
- `forceMigration` (Boolean, default `true`) — "Enable or disable the forced database migration"
- `runMigrations` (Boolean, default `true`) — "Enable or disable database migrations from running on start up"

GitHub issue [strapi/strapi#15027](https://github.com/strapi/strapi/issues/15027), title `forceMigration: false not working with PostgreSQL databases?`: a user set `forceMigration: false` in `connection.forceMigration` and reported "Strapi deletes the tables anyway." **The issue was closed as "not planned"** — i.e., the maintainers did not treat this as a bug to fix. This is the single most load-bearing piece of evidence against Outcome 1 (hand-written SQL + Strapi as a thin CRUD skin): the configuration surface that looks like the intended opt-out does not reliably deliver on it, on the exact database engine this project uses.

**Finding 4 — `collectionName` maps a content-type to an existing table name, but does not exempt it from Strapi's bookkeeping columns. (MEDIUM confidence — `collectionName` itself is documented; the "no exemption" conclusion is inferred from Finding 5, not separately documented)**

`collectionName` on a content-type schema sets which DB table it reads/writes. This is real and documented. But it does not disable schema governance of that table — see Finding 5.

**Finding 5 — Every Strapi 5 content-type unconditionally gets `document_id`, `published_at`, and `locale` columns, regardless of whether Draft & Publish or i18n are enabled for it. (HIGH confidence, official breaking-changes doc, verbatim)**

From `docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/database-columns`:

> "In Strapi 5, Content types always have document, publication and internationalization columns created in database."
> "All the Content Types have a new `document_id` column. The `published_at` column is now always added. The `locale` column is now always added."
> "Is this breaking change automatically handled by a codemod? No"

This means: **there is no "plain" content-type in Strapi 5.** Any table Strapi manages — hand-written DDL or not — gets these columns imposed. Combined with Finding 1–3, this closes off the "point Strapi at existing tables and it behaves as a passive CRUD skin" interpretation of Outcome 1 as CONTEXT.md described it: as soon as a content-type exists for a table, Strapi owns its columns, and disabling that governance is not a supported, working switch.

**Finding 6 — Draft & Publish row count. (MEDIUM confidence: the "2 rows when enabled" half is directly documented; the "1 row when disabled" half is a strong, consistent inference, not a single explicit sentence)**

`docs.strapi.io/cms/features/draft-and-publish`: "If the Draft & Publish feature is enabled on the content-type, a document can have a **published** and a **draft** version" — i.e., up to 2 rows per document (draft: `published_at IS NULL`; published: `published_at` set), sharing the same `document_id`.

`docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/publishedat-always-set-when-dandp-disabled`: "If Draft & Publish is disabled, `publishedAt` is set to the latest creation or edition date of the document." A document with D&P disabled never has a null-`published_at` row to pair against — the practical, consistent reading (and the one every migration guide and forum thread treats as correct) is **exactly one row per document** when D&P is off.

**Practical implication for VIST-05/DATA-02:** disable Draft & Publish on `nodos` and `vinculos` content-types. This keeps row count 1:1 with logical entity count, so the topology dump does not need a `WHERE published_at IS NOT NULL` filter or any de-duplication by `document_id` — it is a genuinely flat `SELECT` either way, but skipping the filter is one less thing that can silently break the row count if someone re-enables D&P later. Flag this filter's absence with a `ponytail:` comment naming the risk.

**Recommendation for OQ-01, with cost of being wrong:**

| Outcome | Verdict | Evidence | Cost if this turns out wrong |
|---|---|---|---|
| 1. Hand-written SQL, Strapi as thin CRUD skin | **Not recommended** | Findings 1, 3, 5 — explicitly unsupported by Strapi, and the looks-like-an-opt-out flag doesn't reliably work per a maintainer-closed bug | Silent data loss on some future `strapi develop` boot where schema.json drifts from the hand-written DDL — the failure mode is exactly "lost data," per Strapi's own words, discovered late |
| 2. Drop Strapi entirely | **Not recommended for v1** | Contradicts `REQUIREMENTS.md`'s stated v1 ingestion model ("la data la carga el dueño por Strapi") — this is a bigger scope change than amending DATA-05, it invalidates a milestone-level assumption | Loses the working admin panel for zero technical necessity; the project would need to hand-build CRUD forms with no more safety than Strapi already offers |
| **3. Strapi owns DDL, modified** (recommended) | Strapi's content-type builder generates `nodos`/`vinculos`; `origen`/`destino` are scalar attributes, not relations; Draft & Publish disabled | Findings 2–6, all corroborating each other | Postgres schema permanently carries Strapi's bookkeeping columns; "drop Strapi later" means either living with those columns forever or a real migration effort — this is the residual risk to flag to the user |

## OQ-02 Answer: vinculos.origen/destino as scalar columns or Strapi relations?

**Finding — every Strapi relation type, not just manyToMany, creates a separate join/link table. (HIGH confidence for v4, documented; MEDIUM-HIGH for v5, corroborated by production evidence rather than a single explicit v5 doc page)**

From the Strapi v4 migration docs (`docs-v4.strapi.io/dev-docs/migration/v3-to-v4/data/sql-relations`), describing the architecture Strapi 5 continues:

> "In Strapi v4, every type of relation between 2 entities triggers the creation of a SQL join table." All four relation kinds — one-to-one, one-to-many, many-to-one, many-to-many — create a dedicated join table (pattern: `{entity}_{attribute}_links` in v4).

For Strapi 5, no single official doc page states this as plainly (the Models reference page documents `relation`/`target`/`mappedBy`/`inversedBy` attribute config but not the physical storage), but real-world v5 database dumps referenced in GitHub issues confirm the pattern continues with a renamed suffix: link tables named `{entity}_{attribute}_lnk` (e.g., `stories_clusters_season_lnk`) exist in production Strapi 5 apps for ordinary relation attributes.

**What this means concretely for `vinculos`:** if `origen`/`destino` on the `vinculos` content-type are modeled as Strapi `manyToOne` relation attributes pointing at `nodos`, Strapi generates two separate link tables (matching CONTEXT.md's own prediction: `vinculos_origen_lnk`, `vinculos_destino_lnk`). `vinculos` itself would carry no `origen_id`/`destino_id` columns at all — the FK lives in the link table. Dumping the topology (`vinculos.id, tipo_vinculo, rol` + the two endpoint ids) would then require joining `vinculos` against both link tables — **two joins, not zero**, directly contradicting VIST-05's "dos consultas sin joins."

**Recommendation, with cost of being wrong:**

Model `origen` and `destino` as **plain scalar attributes** (Strapi `uid`/`string` or `integer`, matching whatever type `nodos.id` uses) on the `vinculos` content-type — not as Strapi `relation` attributes. This is exactly CONTEXT.md's "outcome 1/2" resolution, but it is achievable **inside** OQ-01's recommended "Strapi owns DDL" outcome too, because whether an attribute is a relation is a per-attribute choice, independent of who authors the rest of the schema.

- **Cost:** Strapi's admin panel shows raw node ids in a text field for `origen`/`destino` instead of a relation picker with autocomplete/search. Editing a `vinculo` by hand in the admin is less pleasant. A DB-level `FOREIGN KEY` constraint should still be added directly in Postgres (`REFERENCES nodos(id)`) to keep referential integrity — Strapi does not need to know about the FK for the constraint to exist and be enforced.
- **Cost of choosing relations instead:** VIST-05 becomes literally unachievable without amending it, and the topology dump's query complexity grows with every future relation-typed attribute — a growing maintenance cost that compounds, versus the one-time admin-UX cost of scalar ids.

This conclusion is **inconclusive only in one respect**: I could not find an official Strapi 5 doc page that states the `_lnk`-for-every-relation-type rule for v5 as explicitly as the v4 docs did for v4. The v5 evidence is real production table names from GitHub issue threads, not a doc page. Treat the specific naming (`_lnk` suffix) as MEDIUM confidence and verify directly against the actual generated table names the first time a content-type with a relation attribute is created in this project's Strapi instance, before committing to the "always scalar" plan irreversibly.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `@strapi/strapi` | 5.51.2 (verified current on npm registry, 2026-08-07) | Admin CRUD panel + schema authoring for `nodos`/`vinculos` | Already scaffolded in Phase 1 (REPO-05); locked stack choice |
| `pg` | 8.20.0 (already in `strapi/package.json`) | Postgres driver, used by Strapi and by any Next-side raw query | Already installed |
| Postgres | 16 (via `postgres:16-alpine`, already running per Phase 1) | Source of truth | Locked in PROJECT.md |
| Next.js Route Handlers | matches root `next@^15.5.22` | If the topology endpoint ends up as a Next API route rather than a Strapi custom route (only relevant if OQ-01 outcome shifts) | Already in the app |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:test` + `node:assert` | built into Node 22.14 (project's installed version) | `resolverVista` verification — no new dependency | See "Code Examples" below |
| `--experimental-strip-types` | Node ≥22.6, confirmed present in this project's Node 22.14 (`node --help` lists the flag) | Run a `.ts` test file directly with `node --test`, no transpile step, no new dependency | Only if the plan wants a zero-dependency runnable check in raw TS; otherwise route the check through the existing Next/tsc toolchain |
| `csv-parse` / `csv-stringify`, or none | — | Two-pass CSV workflow (D-08) | **Discretion:** a hand-rolled CSV writer for ~50 rows with no embedded commas/quotes in the identifiers (only free-text columns like `name` need quoting) is well within "does it fit in a few lines" — Node's nothing-fancy `Array.join(',')` plus a minimal quote-escape function is likely sufficient and avoids a new dependency for a one-time script. Reach for a library only if the free-text fields (bios) make hand-rolled CSV escaping error-prone in review. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Strapi owning the DDL (recommended) | Hand-written SQL + Strapi as read-only-of-schema CRUD skin | Explicitly unsupported by Strapi's own docs (Finding 1); the one apparent opt-out (`forceMigration: false`) doesn't reliably work (Finding 3, GH#15027) |
| Native Postgres `ENUM` type for `tipo_vinculo` | `VARCHAR` + `CHECK` constraint (recommended) | See "Enum vs CHECK constraint" below — CHECK wins on evidence, and happens to be what Strapi's own `enumeration` field generates anyway |
| Strapi `relation` attribute for `origen`/`destino` | Plain scalar id attribute + hand-added Postgres `FOREIGN KEY` (recommended) | Relations cost 2 joins in the topology dump (OQ-02); scalars cost admin-UX polish only |

**Installation:** No new packages required. Everything needed (`@strapi/strapi`, `pg`, `node:test`) is already installed or built into the Node/Strapi versions already in the repo.

**Version verification performed:**
```
npm view @strapi/strapi version   →  5.51.2 (matches strapi/package.json — current)
node --version                    →  v22.14.0 (supports --experimental-strip-types)
```

## Architecture Patterns

### Recommended Project Structure
```
strapi/
├── src/api/
│   ├── nodo/content-types/nodo/schema.json       # id, node_type, label, descripcion_breve,
│   │                                                thumb, viz_params, is_stub, fecha,
│   │                                                disciplina, location_id, metadata (json)
│   └── vinculo/content-types/vinculo/schema.json # id, origen (uid/string, NOT relation),
│                                                    destino (uid/string, NOT relation),
│                                                    tipo_vinculo (enumeration), rol, descripcion
├── database/migrations/                            # hand-written FK constraints + CHECK
│   └── 2026.08.XX.00-00-00.add-fk-and-checks.js    # constraints Strapi's schema builder
│                                                       won't create for non-relation attributes
src/
├── types/vista.ts                # locked, Phase 1 — do not touch
├── lib/vista/
│   ├── resolverVista.ts          # pure function, VIST-01/02/03/06/07
│   ├── adjacencia.ts             # in-memory adjacency index builder, VIST-04
│   └── resolverVista.test.ts     # node:test self-check, VIST-07 enforcement
└── (topology fetch — wherever Phase 4's app shell lives; out of scope for Phase 2
     beyond exposing the endpoint)
scripts/
└── migracion/
    ├── 01-export-csv.ts          # reads Mongo dump, applies D-01..07 triage, emits CSV
    └── 02-import-csv.ts          # reads corrected CSV, writes to Postgres via Strapi's
                                     Document Service or direct pg insert
```

### Pattern 1: Topology dump as two flat SELECTs
**What:** A single endpoint (Strapi custom route, given the OQ-01 recommendation) runs exactly two queries and returns `{ nodos, vinculos }` matching `Subgrafo`-adjacent shapes (full topology, not a single Vista).
**When to use:** VIST-05, VIST-04.
**Example:**
```sql
-- Query 1: light node columns only, metadata excluded (DATA-02)
SELECT id, node_type, label, descripcion_breve, thumb, viz_params,
       is_stub, fecha, disciplina, location_id
FROM nodos;

-- Query 2: structural + filterable link fields only, descripcion excluded (DATA-04)
SELECT id, origen, destino, tipo_vinculo, rol
FROM vinculos;
```
No `JOIN`, no `WHERE published_at IS NOT NULL` needed if Draft & Publish is disabled per OQ-01's recommendation (every row already has a single, always-set `published_at`).

### Pattern 2: Adjacency index + BFS, shared by VIST-01 and VIST-03
**What:** `resolverVista` builds a `Map<nodeId, VinculoGrafo[]>` once from the fetched `Subgrafo` (or receives a pre-built one), then does bounded BFS from `vista.raiz` respecting `profundidad`, filters, and `direccion`. The same adjacency Map, given a set of already-loaded node ids instead of a single root, produces "neighbors at 1 hop not already present" for VIST-03 — it's the same traversal primitive with a different frontier and depth=1.
**When to use:** Core of `src/lib/vista/resolverVista.ts`.
**Example (sketch, not sourced from official docs — this is the phase's own design, informed by the locked `vista.ts` contract):**
```typescript
// src/lib/vista/adyacencia.ts
import type { NodoGrafo, VinculoGrafo, Direccion } from '@/types/vista'

export interface Adyacencia {
  nodos: Map<string, NodoGrafo>
  // por direccion: aristas que salen del nodo y aristas que entran, indexadas por id
  sale: Map<string, VinculoGrafo[]>
  entra: Map<string, VinculoGrafo[]>
}

export function construirAdyacencia(nodos: NodoGrafo[], vinculos: VinculoGrafo[]): Adyacencia {
  const nodosMap = new Map(nodos.map(n => [n.id, n]))
  const sale = new Map<string, VinculoGrafo[]>()
  const entra = new Map<string, VinculoGrafo[]>()
  for (const v of vinculos) {
    ;(sale.get(v.origen) ?? sale.set(v.origen, []).get(v.origen)!).push(v)
    ;(entra.get(v.destino) ?? entra.set(v.destino, []).get(v.destino)!).push(v)
  }
  return { nodos: nodosMap, sale, entra }
}
```

### Anti-Patterns to Avoid
- **Modeling `origen`/`destino` as Strapi relations:** creates `_lnk` join tables, breaks VIST-05's joinless constraint (OQ-02).
- **Leaving Draft & Publish enabled "just in case":** doubles row count per entity, forces a `published_at IS NOT NULL` filter into what should be a trivial flat SELECT, and reintroduces exactly the kind of implicit state the project is trying to get away from (`dimensionId`'s sibling problem).
- **Persisting BFS depth or "level" on the node:** VIST-06 forbids this explicitly — depth is always a traversal-time property of a specific Vista, never a column.
- **Silently shipping heuristic types from the CSV pre-fill:** D-09 — the first pass is a guess for a human to correct, not the final import.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Admin CRUD for nodos/vinculos | A custom Next admin UI | Strapi's Content Manager (already scaffolded) | DATA-05 already assumes this; REQUIREMENTS.md's opening sentence assumes Strapi is the v1 loading mechanism |
| Enum-with-growing-values storage | Postgres native `ENUM` type | `VARCHAR` + `CHECK` constraint | See dedicated section below — adding/removing values from a native enum is real friction; CHECK constraints alter trivially and are what Strapi's own `enumeration` field generates anyway |
| CSV round-trip for migration typing | A bespoke UI for correcting types | A spreadsheet-editable CSV (D-08) | Explicitly the locked decision; do not add tooling beyond a plain CSV read/write |
| `resolverVista` test harness | A test framework (Jest/Vitest) not yet in this repo | Node's built-in `node:test` + `node:assert` | No test framework exists in the repo yet (root `package.json` has none); adding one for a single pure function is disproportionate. `node:test` is stdlib as of Node 22 |

**Key insight:** every "don't hand-roll" here is really the same lesson from OQ-01/02 applied narrowly — the fastest way to violate this phase's architecture invariants is to let a well-intentioned Strapi convenience feature (relations, Draft & Publish, native enums via a plugin) make an implicit decision that the plan needed to make explicitly.

## Enum vs CHECK constraint for `tipo_vinculo`

**Finding (MEDIUM-HIGH confidence — general Postgres knowledge cross-checked against Strapi's own field implementation):**

Native Postgres `ENUM` types support adding a value with `ALTER TYPE ... ADD VALUE` since Postgres 12 without the old same-transaction restriction (Postgres 16, this project's version, has no issue here) — but they have no supported way to **remove** or **rename** a value without recreating the whole type and rewriting every dependent column, a real operational cost if a `tipo_vinculo` value is ever retired or corrected. `VARCHAR` + `CHECK (tipo_vinculo IN (...))` alters with a plain `DROP CONSTRAINT` / `ADD CONSTRAINT`, symmetric for add and remove, and is trivially inspectable (`\d+ vinculos` shows the exact allowed list).

Independently, WebSearch of live Strapi Postgres schemas confirms Strapi's own `enumeration` attribute type is implemented at the DB level as `VARCHAR` + `CHECK (value = ANY (ARRAY[...]))` — **not** a native Postgres enum. So if OQ-01's recommendation is followed (Strapi authors the DDL), Strapi will generate exactly the CHECK-constraint shape being recommended here anyway — there is no tension between "what Postgres best practice suggests" and "what Strapi will build," which removes one potential point of friction between the two.

**Recommendation:** `tipo_vinculo` as a Strapi `enumeration` attribute (→ VARCHAR + CHECK at the DB level). Same reasoning applies to `node_type` on `nodos`.

## Indexes for the traversal (Postgres, `nodos`/`vinculos`, ~50 nodes / ~250 edges)

**Finding:** at this scale, no traversal-supporting index is needed, and adding one now would be premature. The topology dump (Pattern 1 above) is two unfiltered `SELECT *`-shaped queries — a sequential scan over 250 rows completes in microseconds regardless of indexing; Postgres will not even consider using an index for a full-table scan. The BFS itself happens client-side over the in-memory adjacency Map (D-19/PROJECT.md), so there is no `WHERE origen = $1` server-side query in this phase's critical path at all.

What *is* worth adding, because it's essentially free and protects data integrity rather than performance: `FOREIGN KEY (origen) REFERENCES nodos(id)` and `FOREIGN KEY (destino) REFERENCES nodos(id)` on `vinculos` — Postgres does not auto-create an index for FK columns, and one is not needed here since nothing filters by them server-side. Mark this explicitly:

```sql
-- ponytail: no index on vinculos.origen/destino — nothing queries by them server-side
-- at this scale (traversal is client-side, D-19). Add a btree index on both if a
-- server-side traversal query is ever introduced (project's own stated crossover
-- point is ~20-50k nodes, per PROJECT.md).
```

## Common Pitfalls

### Pitfall 1: Trusting `forceMigration: false` as a safety valve
**What goes wrong:** A plan or task assumes setting `forceMigration: false` in `strapi/config/database.ts` protects hand-written or previously-migrated schema from being altered/dropped on the next `strapi develop`.
**Why it happens:** The setting's name and documented intent ("Enable or disable the forced database migration") strongly suggest it does exactly this.
**How to avoid:** Don't rely on it. Follow OQ-01's recommendation instead — let Strapi's content-type builder be the schema's actual author, so there's nothing for the sync to fight.
**Warning signs:** Any task description that says "add `forceMigration: false` so Strapi doesn't touch our tables" should be treated as unverified and re-checked against GH#15027 before being trusted.

### Pitfall 2: `info.bio` overflowing `descripcion_breve`'s 200-char cap
**What goes wrong:** The migration script copies `info.bio` verbatim into `descripcion_breve`; the DB CHECK constraint (DATA-08/D-15) rejects the insert for any of the (few, per CONTEXT.md — only 8 of 251 rows have a bio) rows with prose longer than 200 chars.
**Why it happens:** Mongo had no such limit; `info.bio` in the sample dump runs to several paragraphs (see Tropical Poncho's own bio in the dump — well over 1000 characters).
**How to avoid:** The migration script must truncate (not silently, log what was cut) before insert, or route long bios into `metadata jsonb` instead of `descripcion_breve` and leave `descripcion_breve` for a separately-curated short blurb during CSV correction (D-08's second pass).
**Warning signs:** An import that fails on a CHECK-constraint violation for exactly the small set of nodes that have a `info.bio`.

### Pitfall 3: Draft & Publish silently re-enabled by a later Strapi upgrade or manual admin toggle
**What goes wrong:** Someone (or an upgrade codemod) re-enables D&P on `nodos`/`vinculos` after the schema is live; the topology dump's row count doubles overnight, and `resolverVista`'s assumption of 1 row per entity breaks silently (duplicate node ids in `Subgrafo`).
**Why it happens:** D&P is a per-content-type checkbox in the admin UI, not something enforced by the plan's code.
**How to avoid:** Add the `published_at IS NOT NULL` filter to the topology dump query anyway, even though it's currently a no-op with D&P off — it's one clause, and it converts a silent future breakage into a query that keeps working correctly. This is cheap enough that "no index/no filter for what's currently unnecessary" reasoning shouldn't apply here — the cost is one `WHERE` clause, not a new index.
**Warning signs:** `SELECT count(*) FROM nodos` growing without a corresponding count of real migrated/curated entities.

### Pitfall 4: Assuming `collectionName` alone is enough to "reuse" a table Strapi didn't fully build
**What goes wrong:** Pointing a content-type's `collectionName` at a table that has extra hand-added columns Strapi doesn't know about (or is missing columns Strapi expects) and assuming Strapi will "just read the columns it knows about."
**Why it happens:** `collectionName` genuinely does let you name the table; it's easy to over-generalize from that to "and everything else about the table can be managed outside Strapi."
**How to avoid:** Per Finding 5, don't do this. Let Strapi's schema builder be the single author of every column Strapi will ever touch; add only the FK constraints and CHECK constraints (via `database/migrations/`, which documented-runs before the automatic sync) that Strapi's attribute types don't already produce.

## Migration Source: Concrete Shape

`config/dumps/neurons_prod_23-10-05.json` (75,870 bytes, 251 top-level array entries, verified 2026-08-07). Representative row shapes, verified by direct read:

**A node with full data** (Tropical Poncho, `_id.$oid = "6335d5fa..."`):
```json
{
  "_id": { "$oid": "6335d5fa7636ed5b3529c545" },
  "fromId": [],
  "name": "Tropical Poncho",
  "info": {
    "sub": "Productora de Experiencias Artísticas",
    "bio": "Tropical Poncho es, principalmente, una productora... (well over 200 chars — Pitfall 2)",
    "links": [{ "name": "IG", "href": "https://www.instagram.com/tropicalponcho" }]
  },
  "imgPath": "isologo_blanco.png",
  "imgActive": true,
  "graphVal": 5,
  "creationDate": { "$date": { "$numberLong": "1664472488294" } },
  "__v": 0,
  "nickName": "tropicalponcho",
  "imgSize": 110,
  "order": 1
}
```

**A minimal/discardable node** (`Instagram`, in-degree 61 — D-04 drops it):
```json
{
  "_id": { "$oid": "63bd0f695fcd03a3def047c6" },
  "fromId": [{ "$oid": "6335d5fa7636ed5b3529c545" }],
  "name": "Instagram",
  "nickName": "instagram",
  "creationDate": { "$date": { "$numberLong": "1673334454074" } },
  "__v": 0
}
```

**A `nodeType: "PARTICLES"` node** (one of only 2 in the whole dump — a render hint, not a semantic type per D-07):
```json
{
  "_id": { "$oid": "6335d5e37636ed5b3529c543" },
  "fromId": [{ "$oid": "6335d5fa7636ed5b3529c545" }],
  "name": "SOMA BETA",
  "graphVal": 50,
  "creationDate": { "$date": { "$numberLong": "1664472488294" } },
  "__v": 0,
  "nodeType": "PARTICLES",
  "particles": { "minDistance": 20, "maxParticleCount": 100, "maxConnections": 90 }
}
```

**Blank-name nodes** (6+ confirmed by direct grep, part of the 171/251 D-03 drops): `"name": ""` with otherwise sparse fields.

**Field-by-field mapping the migration script must handle:**
| Mongo field | Type | Maps to | Note |
|---|---|---|---|
| `_id.$oid` | string (ObjectId hex) | `nodos.id` origin / CSV join key | Not necessarily reused as the Postgres PK verbatim — discretion, but must be the stable join key between the two CSV passes |
| `fromId` | array of `{ $oid }`, 0 or 1 typically | `vinculos` rows (this node → each `fromId` entry) | Edge direction and `tipo_vinculo` must be assigned (D-07), not read from the source |
| `name` | string, often `""` | `nodos.label` | Blank → row dropped (D-03) |
| `info.bio` | string, long-form, present on 8/251 rows | `nodos.descripcion_breve` (truncated) or `metadata.bio` | See Pitfall 2 |
| `info.sub` | string | candidate for `metadata` | Subtitle/role text |
| `info.links` | array of `{ name, href }` | `metadata.links` | Deep data, not in the topology dump |
| `imgPath` | string, filename, present on 7/251 rows | `nodos.thumb` (needs a real asset path/URL, not just the bare filename — original asset host is `collectiveConscience`, read-only) | |
| `graphVal` | number or null, present on 3/251 rows with a value | discretion — could seed `viz_params` or be dropped (D-10 already decided `viz_params` is assigned, not migrated) | |
| `creationDate.$date.$numberLong` | string of epoch millis | `nodos.fecha` (ISO 8601 per `vista.ts`) | Needs `new Date(Number(str)).toISOString()` |
| `nickName` | string | discretion — could become `metadata.nickname` or informs `location_id`/URL slug in a later phase | Not part of the locked `Vista` contract |
| `__v` | Mongoose version key | discard | |
| `nodeType` | string, 2/251 rows, value `"PARTICLES"` | discard or informs `viz_params.shape` heuristic for the CSV pre-fill (D-10, discretion) | Not a semantic type — do not map to `NodeType` |

No `neuronType`, `synapseType`, `style`, or GLSL uniform fields exist anywhere in this file (confirmed, D-07/D-10).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Postgres | DATA-01/02/05, VIST-05 | ✓ | 16 (postgres:16-alpine, healthy per Phase 1) | — |
| Strapi | DATA-05, VIST-05 (per OQ-01 recommendation) | ✓ (scaffolded, no content types yet; `node_modules` not currently installed — 474K, effectively empty) | 5.51.2 (matches npm registry latest) | — |
| Node.js | `resolverVista` self-check, migration scripts | ✓ | v22.14.0 (supports `--experimental-strip-types`) | — |
| `config/dumps/neurons_prod_23-10-05.json` | DATA-06 migration | ✓ | — (verified 75,870 bytes, 251 rows, read-only source in `collectiveConscience`) | — |

**Missing dependencies with no fallback:** none identified.

**Note:** `strapi/node_modules` is present as a directory but effectively empty (no `@strapi/*` packages actually installed on disk despite `package.json` listing them) — the planner should include an explicit `npm install` step inside `strapi/` as part of Wave 0/Task 1, not assume the Phase 1 scaffold left a runnable Strapi install.

## Sources

### Primary (HIGH confidence)
- `docs.strapi.io/cms/configurations/database` — "Supported databases" warning (Finding 1), `settings` object / `forceMigration` / `runMigrations` documentation
- `docs.strapi.io/cms/database-migrations` — schema-sync-on-boot behavior, "delete any unknown tables without warning"
- `docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/database-columns` — `document_id`/`published_at`/`locale` always-added columns
- `docs.strapi.io/cms/features/draft-and-publish` and `docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/publishedat-always-set-when-dandp-disabled` — Draft & Publish row semantics
- `docs-v4.strapi.io/dev-docs/migration/v3-to-v4/data/sql-relations` — every relation type creates a join table (v4, architecturally continued into v5)
- `npm view @strapi/strapi version` — confirms 5.51.2 is current
- Direct read of `strapi/package.json`, `strapi/config/database.ts`, `strapi/database/migrations/` (empty, `.gitkeep` only) — actual scaffold state
- Direct read of `config/dumps/neurons_prod_23-10-05.json` (byte count, multiple full-row samples, grep for `Instagram` and blank-name rows) — migration source shape

### Secondary (MEDIUM confidence)
- GitHub issue [strapi/strapi#15027](https://github.com/strapi/strapi/issues/15027) — `forceMigration: false` doesn't prevent table deletion on Postgres, closed "not planned"
- WebSearch-surfaced evidence of `_lnk`-suffixed join tables in production Strapi 5 databases (e.g., `stories_clusters_season_lnk`) — no single official v5 doc page states the rule as explicitly as the v4 docs did
- WebSearch-surfaced confirmation that Strapi's `enumeration` attribute generates `VARCHAR` + `CHECK` at the Postgres level, not a native enum

### Tertiary (LOW confidence)
- General Postgres native-`ENUM`-vs-`CHECK` tradeoff reasoning — standard, well-established Postgres knowledge, not specifically re-verified against a single authoritative source in this research pass, but low-risk given it's corroborated by what Strapi itself generates

## Metadata

**Confidence breakdown:**
- OQ-01/OQ-02 (Strapi schema governance): MEDIUM-HIGH — core claims are verbatim official docs; the v5-specific `_lnk` naming and the "forceMigration doesn't work" claim rely on GitHub issue evidence rather than an official statement, explicitly flagged inline
- Standard stack: HIGH — nothing new to install, versions verified against the actual scaffold and npm registry
- Migration source shape: HIGH — verified by direct file read, not inference
- Architecture patterns (adjacency index, BFS): MEDIUM — this is the phase's own design work informed by the locked `vista.ts` contract, not sourced from external docs; flagged as a sketch, not a verified pattern
- Pitfalls: MEDIUM-HIGH — grounded in the same primary sources as OQ-01/02, plus direct inspection of the source dump for the bio-length pitfall

**Research date:** 2026-08-07
**Valid until:** ~30 days for the Strapi-specific findings (fast-moving area, "database migrations" feature explicitly marked experimental by Strapi) — re-verify Findings 1–6 if planning is delayed past early September 2026 or if `strapi/package.json` is bumped past 5.51.2.
