---
phase: 02-data-vista-backend
plan: 03
subsystem: database
tags: [migration, csv, mongo, curation-pipeline]

# Dependency graph
requires:
  - phase: 02-data-vista-backend
    provides: "Plan 02-01: npm run migracion:exportar script wired, Vista types, migration SQL CHECK constraints"
provides:
  - "scripts/migracion/csv.ts: dependency-free RFC 4180-subset CSV reader/writer (escribirCsv, leerCsv)"
  - "scripts/migracion/exportar.ts: reads neurons_prod_23-10-05.json, triages by D-01..D-05, writes curation CSVs"
  - "data/curaduria/nodos.csv: 80 named nodes with guessed node_type, 30 pre-marked to discard"
  - "data/curaduria/vinculos.csv: 106 edges between named nodes with guessed tipo_vinculo, 51 pre-marked to discard"
affects: ["02-04 (import pass, reads these CSVs)", "02-05", "phase 5 (real migrated data)"]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Hand-rolled CSV read/write instead of a dependency — repo has no CSV library and the format is single-writer/single-reader"]

key-files:
  created:
    - scripts/migracion/csv.ts
    - scripts/migracion/exportar.ts
    - data/curaduria/nodos.csv
    - data/curaduria/vinculos.csv
  modified: []

key-decisions:
  - "CSV parser/writer hand-written (~85 lines) instead of adding csv-parse/csv-stringify — no CSV lib in repo, format is fully under this pipeline's control"
  - "node_type/tipo_vinculo heuristics never guess OBRA or SERIE — old data has nothing to distinguish them, mislabeling is worse than defaulting everyone to ARTISTA"

patterns-established:
  - "Pattern: migration scripts are read-only against collectiveConscience and write only to data/curaduria/*.csv or Postgres, never both in the same pass"

requirements-completed: [DATA-06, DATA-07]

# Metrics
duration: 20min
completed: 2026-08-07
---

# Phase 02 Plan 03: Mongo-to-CSV curation export Summary

**First-pass migration script exports the 80 named nodes and 106 edges from `neurons_prod_23-10-05.json` into two editable curation CSVs, with node/edge types pre-guessed and 30/51 rows pre-flagged for discard.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2
- **Files modified:** 4 (all created)

## Accomplishments
- `scripts/migracion/csv.ts`: zero-dependency CSV reader/writer handling RFC 4180 quoting (commas, embedded quotes), throws on embedded newlines, with a runnable self-check (`node --experimental-strip-types csv.ts` prints `csv ok`)
- `scripts/migracion/exportar.ts`: reads the Mongo dump read-only, applies the D-01..D-05 triage (empty name, campaign assets, site categories, orphan test rows) and node_type/tipo_vinculo guesses, writes `data/curaduria/nodos.csv` (80 rows) and `data/curaduria/vinculos.csv` (106 rows)
- Verified idempotent: running the script twice produces byte-identical output (`git status --porcelain data/curaduria/` empty on second run)
- Verified referential integrity: every `origen`/`destino` in `vinculos.csv` matches an `id` in `nodos.csv` (0 dangling refs)

## Task Commits

Each task was committed atomically:

1. **Task 1: Lector y escritor CSV sin dependencias** - `a0f1e85` (feat)
2. **Task 2: Primera pasada — dump de Mongo a CSV de curaduría** - `00dc878` (feat)

_Both commits made with `--no-verify` per parallel-executor instructions; orchestrator validates hooks after all agents complete._

## Files Created/Modified
- `scripts/migracion/csv.ts` - `escribirCsv`/`leerCsv`, hand-rolled RFC 4180 subset, no dependency added
- `scripts/migracion/exportar.ts` - Mongo dump → curation CSV first pass, read-only against collectiveConscience
- `data/curaduria/nodos.csv` - 80 named nodes, `node_type` guessed, `descartar` pre-marked (30 rows)
- `data/curaduria/vinculos.csv` - 106 edges between named nodes, `tipo_vinculo` guessed, `descartar` pre-marked (51 rows)

## Decisions Made
- CSV parsing/writing done by hand (~85 lines) rather than installing `csv-parse`/`csv-stringify`: no CSV library exists in the repo, the format has exactly one writer and one reader, and the plan called for this explicitly.
- All heuristics documented inline; none required deviation from the plan's exact regex/threshold specification — every number in the plan (251/80/106/8/15/15/7/125/1289) matched the live dump on first run.

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria (CSV headers, row counts, Instagram/Tropical Poncho/Gestorx Cultural spot checks, REVISAR: count, tsc --noEmit, idempotency, referential integrity) verified and passed without needing fixes.

## Issues Encountered

`git -C ../../collectiveConscience status --porcelain` is not empty — but the pre-existing modifications there (`index.html`, `src/client/graph/*.js`, untracked `CLAUDE.md`/`memory-bank/`) predate this session and are unrelated to `exportar.ts`, which only calls `readFileSync` on the dump JSON. Confirmed no new changes appeared in that repo before/after running the script. Per CLAUDE.md, `collectiveConscience` is read-only and was not touched to "clean" this — out of scope for this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
`data/curaduria/nodos.csv` and `data/curaduria/vinculos.csv` are committed and ready for manual curation in a spreadsheet, then for the second-pass import script (plan 02-04) to read and load into Postgres. No blockers.

---
*Phase: 02-data-vista-backend*
*Completed: 2026-08-07*

## Self-Check: PASSED

All created files found on disk; both task commits (`a0f1e85`, `00dc878`) found in git log.
