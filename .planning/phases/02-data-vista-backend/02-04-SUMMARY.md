---
phase: 02-data-vista-backend
plan: 04
subsystem: api
tags: [nextjs, postgres, pg, route-handler, fetch-memoization]

# Dependency graph
requires:
  - phase: 02-data-vista-backend (02-01)
    provides: nodos/vinculos Postgres schema
  - phase: 02-data-vista-backend (02-02)
    provides: construirAdyacencia and the Adyacencia index shape
provides:
  - "GET /api/topologia: the only route/file in src/ that opens a Postgres connection"
  - "cargarAdyacencia(): single-fetch, promise-memoized client-side topology loader"
affects: [03-3d-engine, 04-ui-routing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level pg.Pool reused across requests (never per-request)"
    - "Promise memoization (not value memoization) to collapse concurrent callers into one fetch"

key-files:
  created: [src/app/api/topologia/route.ts, src/lib/vista/topologia.ts]
  modified: []

key-decisions:
  - "No deviations - plan executed exactly as written"

patterns-established:
  - "snake_case DB rows map to camelCase Subgrafo fields with optional fields omitted (not null) when absent"
  - "Client-side impurity (fetch) stays isolated in topologia.ts, keeping resolverVista.ts and adyacencia.ts framework/browser-free"

requirements-completed: [VIST-04, VIST-05, DATA-02, DATA-04]

# Metrics
duration: 12min
completed: 2026-08-08
---

# Phase 02 Plan 04: Topology Route Handler + Client Loader Summary

**Single Next.js route handler dumps the full topology with two joinless SELECTs, and a promise-memoized client loader (`cargarAdyacencia`) fetches it exactly once and builds the in-memory adjacency index.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-08T04:48:00Z
- **Completed:** 2026-08-08T05:00:00Z
- **Tasks:** 2 completed
- **Files modified:** 2 (both new)

## Accomplishments
- `GET /api/topologia` is the sole Postgres touchpoint in `src/`, running exactly two joinless `SELECT`s in parallel and mapping snake_case rows to the camelCase `Subgrafo` contract
- `metadata` (nodos) and `descripcion` (vinculos) are excluded from the dump per DATA-02/DATA-04
- `cargarAdyacencia()` memoizes the in-flight *promise*, not the resolved value, so concurrent callers before resolution still produce exactly one fetch
- Verified end-to-end against the real (migrated-schema, empty) Postgres database via `npm run dev` + `curl` — matches the exact expected `{"nodos":[],"vinculos":[]}` payload

## Task Commits

Each task was committed atomically:

1. **Task 1: Route handler de topología** - `76114c1` (feat)
2. **Task 2: Carga única de la topología en el cliente** - `2917852` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/app/api/topologia/route.ts` - Next route handler; module-level `pg.Pool`, `runtime='nodejs'`, `dynamic='force-dynamic'`, two parallel joinless SELECTs, row-to-contract mapping, 503 on DB failure without leaking the Postgres error
- `src/lib/vista/topologia.ts` - `cargarAdyacencia()` (promise-memoized single fetch + `construirAdyacencia`) and `olvidarTopologia()` (test/hard-nav reset)

## Decisions Made
None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Docker Desktop daemon was not running at the start of verification (needed for the live `curl` check against Postgres). Started it, waited for the `sinapsis_front-db-1` container's healthcheck to pass, then verified the schema was present (`nodos`, `vinculos`, `schema_migrations`) before running the endpoint check. Not a plan deviation — infra was already provisioned from plan 02-01, just not started in this session.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 (3D Engine) can now consume real `/api/topologia` data via `cargarAdyacencia()` once fixture-based development is ready to switch to the live endpoint
- Plan 02-05 (data migration/seed) will populate `nodos`/`vinculos` so the endpoint returns real content instead of the current empty arrays
- No blockers

---
*Phase: 02-data-vista-backend*
*Completed: 2026-08-08*

## Self-Check: PASSED

- FOUND: src/app/api/topologia/route.ts
- FOUND: src/lib/vista/topologia.ts
- FOUND commit: 76114c1
- FOUND commit: 2917852
