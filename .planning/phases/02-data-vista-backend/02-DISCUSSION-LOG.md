# Phase 2: Data & Vista Backend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-06
**Phase:** 02-data-vista-backend
**Areas discussed:** Schema ownership, Migration source + typing, viz_params mapping, Endpoint + resolverVista

---

## Pre-discussion finding

Before gray areas were presented, all 20 dump files in `collectiveConscience/config/dumps/` were
surveyed. Two facts changed the shape of the discussion:

1. DATA-06's premise is wrong — no `neuronType` or `synapseType` field exists in any dump.
2. The dumps are two disjoint generations: a 2022–2024 real artist network (251 nodes, 257 edges,
   `fromId` arrays) and a 2025 institutional site (35 nodes, 38 typed links, `dimensionId`).

---

## Schema ownership

### Q1: Who owns the Postgres DDL for nodos and vinculos?

| Option | Description | Selected |
|--------|-------------|----------|
| Strapi owns it | Content-types generate and migrate the tables; DATA-05 free; inherit Strapi's columns and naming | |
| Hand-written SQL, Strapi mapped on top | Full DDL control; Strapi 5 validates on boot and fights it | |
| Strapi owns it + SQL migration for constraints | Strapi generates, a migration adds CHECK/indexes/enum | |

**User's choice:** Other — rejected the framing.

**Notes:** "No me gusta que el schema esté gobernado por strapi, no quiero que el sistema quede
atado a strapi, a una app externa que deberia ser solo para cargar información de administración.
Además yo en un principio queria strapi para resolver la carga de info por parte de usuarios pero
encima al parecer eso no es posible con strapi. Entonces, quizás no tiene sentido o al menos que no
sea gobernanza de strapi."

Two things followed. First, a correction: end-user submission **is** possible with Strapi, via the
`users-permissions` API rather than the admin panel — admin users and API users are separate
identity systems. Second, the objection was noted as consistent with CLAUDE.md's "Postgres es la
fuente de verdad" invariant.

### Q1b (follow-up): What role should Strapi actually play?

| Option | Description | Selected |
|--------|-------------|----------|
| Admin-only, zero authority | Hand-written schema, Strapi as a deletable CRUD panel, Next route for reads; amends VIST-05 | |
| Drop Strapi entirely | Delete `strapi/`, build a small internal admin later; removes DATA-05 | |
| Keep as planned | Strapi owns schema and endpoint per DATA-01/05/VIST-05 | |
| Defer — research the friction first | Establish what actually breaks in Strapi 5.51.2 before deciding | ✓ |

**User's choice:** Defer — research the friction first.

**Notes:** Recorded as OQ-01. The orchestrator's claim that Strapi 5 schema validation is
"recurring friction" was general knowledge, not measured against 5.51.2 — which is why deferring
was the honest call rather than picking a recommendation.

### Q2: How should vinculos reference its two endpoint nodes?

| Option | Description | Selected |
|--------|-------------|----------|
| Scalar id columns, no relation | Joinless dump under any outcome; admin shows raw ids | |
| Strapi relations | Node picker in admin; link tables force 2 joins, contradicting VIST-05 | |
| Relations + denormalized columns | Both, at the cost of a sync mechanism that can drift | |

**User's choice:** Deferred — "revisemos el primer tema antes de resolver esto", then on re-ask,
"Decide after the Strapi research."

**Notes:** Recorded as OQ-02, explicitly conditional on OQ-01.

### Q3: Where does the node's deep data live?

| Option | Description | Selected |
|--------|-------------|----------|
| `metadata jsonb` on nodos | Per DATA-02; one column, never selected by the topology query | ✓ |
| Separate 1:1 `nodo_detalle` table | Structurally impossible to leak into the topology query; extra join | |
| Strapi components / dynamic zones | Best admin editing; locks shape into Strapi's model | |

**User's choice:** `metadata jsonb` column on nodos.

### Q4: How is the 200-character limit enforced?

| Option | Description | Selected |
|--------|-------------|----------|
| DB CHECK + Strapi maxLength | DATA-08 says "a nivel de base"; friendly editor error on top | ✓ |
| Strapi validation only | One place, good UX; migration and direct SQL bypass it | |
| varchar(200) | Simplest; errors rather than truncates, needs table rewrite to change | |

**User's choice:** DB CHECK constraint + Strapi maxLength.

---

## Migration source + typing

### Q1: Which dump is the migration source of truth?

| Option | Description | Selected |
|--------|-------------|----------|
| `neurons_prod_23-10-05.json` only | 251 rows, 257 edges; richest real network; last pre-pivot prod snapshot | ✓ |
| 2023 + 2025 merged | Nothing lost; two id spaces to reconcile manually | |
| Start clean, hand-enter | Guaranteed clean; drops DATA-06 and Phase 5's "real migrated data" claim | |
| Let research pick | Diff the candidates properly first | |

**User's choice:** `neurons_prod_23-10-05.json` only.

### Q2: What happens to the 171 rows with blank names?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop them | Unnameable nodes can't be rendered or curated; likely soft-deleted Mongo rows | ✓ |
| Import as STUB | Contract already has STUB/is_stub; preserves topology; ~171 unlabelled blobs | |
| Drop except edge-critical | Keep only blanks whose removal disconnects named nodes; needs connectivity pass | |

**User's choice:** Drop them.

### Q3: How do nodes get NodeType and edges get TipoVinculo?

| Option | Description | Selected |
|--------|-------------|----------|
| Generated CSV → user curates → script imports | ~50 rows is an afternoon; CSV becomes the durable record | ✓ |
| Heuristic only, refine in admin | Fastest to populated DB; wrong types ship and get fixed one dialog at a time | |
| Everything STUB / COLABORO_EN | Invents no semantics; every Vista filter meaningless until curation | |

**User's choice:** Generated CSV, you curate, script imports.

---

## viz_params mapping

**Framing changed before the question was asked.** The originally-planned question (how to flatten
GLSL uniform objects into 5 scalars) turned out to be moot: the chosen dump has zero `style` fields,
one node with `particles`, three with `graphVal`. The GLSL blobs exist only in the 2025 institutional
dump, which is not being migrated. The question became "where do assigned defaults come from".

### Q1: Where do viz_params values come from?

| Option | Description | Selected |
|--------|-------------|----------|
| Defaults per node_type, seed randomized | Type legible at a glance; per-node overrides later in admin | ✓ |
| Add shape/color to the curation CSV | Max control in one session; ~50 aesthetic calls made blind | |
| One identical default | Smallest script; first render visually flat | |

**User's choice:** Defaults per node_type, seed randomized.

---

## Endpoint + resolverVista

### Q1: Where does resolverVista physically live?

| Option | Description | Selected |
|--------|-------------|----------|
| `src/lib/vista/` in the Next app | Plain .ts; import discipline enforces VIST-07; no build step | ✓ |
| Separate workspace package | Structurally enforced; reopens the rejected workspaces decision | |
| Inside `strapi/` | Couples frontend to Strapi; dies if Strapi is dropped | |

**User's choice:** `src/lib/vista/` in the Next app.

### Q2: How does the client get the topology?

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch once on load, no revalidation | Few KB at ~50 nodes; zero requests while exploring per VIST-04 | ✓ |
| Fetch once + ETag | Cheap 304 on repeat visits; a caching layer before measured need | |
| Server-rendered into initial payload | Best first paint; couples topology to page rendering | |

**User's choice:** Fetch once on load, no revalidation.

---

## Claude's Discretion

- Best-guess heuristic for pre-filling the curation CSV
- CSV column layout and two-pass script shape
- Default shape/colour values per node_type
- Adjacency index data structure
- `resolverVista` verification approach and fixture graph
- `limite` truncation ordering and `modoOrden: 'geo'` semantics

## Deferred Ideas

Offered as further discussion areas and declined in favour of proceeding to context:

- `resolverVista` verification strategy
- `limite` and `modoOrden` semantics
- Admin/authoring workflow and artist self-submission

Raised during discussion and deferred:

- Per-node visual curation in the admin (post-migration)
- ETag/caching for the topology endpoint (until measured)
