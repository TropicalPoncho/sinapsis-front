---
phase: 02-data-vista-backend
plan: 01
subsystem: database
tags: [postgres, pg, sql-migrations, docker-compose]

# Dependency graph
requires:
  - phase: 01-repo-cleanup
    provides: tsconfig.json baseline (@/types/* alias, strapi/ excluded), src/types/vista.ts contract
provides:
  - Postgres schema for nodos/vinculos, authored exclusively by db/migrations/*.sql
  - db/migrate.mjs runner with schema_migrations tracking, idempotent, transaction-per-file
  - npm run db:migrate script; package.json scripts for the migration data pipeline (plans 02-04/02-05) and resolverVista tests (plan 02-02)
  - .env.example / .env.local convention for DATABASE_URL
affects: [02-02-resolver-vista, 02-04-migracion-exportar, 02-05-migracion-importar]

# Tech tracking
tech-stack:
  added: [pg@^8.22.0, "@types/pg@^8.20.4"]
  patterns:
    - "Schema authored only by db/migrations/*.sql, applied by a hand-rolled ~60-line runner (no migration library)"
    - "CHECK constraints enforce domain rules at the DB layer (node_type/tipo_vinculo enums, descripcion_breve length, viz_params scalar-only via an IMMUTABLE SQL function)"
    - ".env.example versioned via .gitignore negation; .env.local holds the real value, loaded with node --env-file"

key-files:
  created:
    - db/migrate.mjs
    - db/migrations/001_esquema_inicial.sql
    - .env.example
    - .env.local
  modified:
    - package.json
    - tsconfig.json
    - .gitignore

key-decisions:
  - "Lowered the viz_params string-length CHECK cap from 64 to 32 chars — the plan's own GLSL rejection test (48-char fragment) passed the 64-char version, defeating DATA-03's purpose. 32 chars still comfortably fits every legitimate VizParams string (shape/color names)."

patterns-established:
  - "SQL migrations are the only DDL authority (DATA-05) — no ORM, no CMS, no external schema tool touches this database"
  - "Runner is a disposable ~60-line script, not a dependency — node-pg-migrate is the documented upgrade path if rollback or multi-DB CI is ever needed"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-08, VIST-06]

# Metrics
duration: ~15min
completed: 2026-08-07
---

# Phase 02 Plan 01: Postgres schema and migration runner Summary

**`nodos`/`vinculos` Postgres schema with CHECK-enforced enums and a scalar-only `viz_params` guard, applied by a from-scratch SQL migration runner — no ORM, no CMS, no external DDL authority.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-08-07
- **Tasks:** 3
- **Files modified:** 7 (package.json, package-lock.json, tsconfig.json, .gitignore, .env.example, db/migrate.mjs, db/migrations/001_esquema_inicial.sql) + .env.local (untracked, gitignored)

## Accomplishments
- Postgres volume reset so `sinapsis`/`sinapsis` credentials from `docker-compose.yml` actually apply (the old volume had `strapi` baked in from the reverted Phase 1 attempt)
- `db/migrate.mjs`: reads `db/migrations/*.sql` in order, tracks applied versions in `schema_migrations`, one transaction per file, idempotent on rerun
- `db/migrations/001_esquema_inicial.sql`: `nodos` and `vinculos` tables with every CHECK/FK the ERS model requires — node_type enum, tipo_vinculo enum with no `CUSTOM`, `descripcion_breve` capped at 200, `viz_params_escalares()` rejecting nested JSON and long strings, no reflexive or duplicate links
- Verified all four rejection cases and the acceptance case directly against the running database (not just at the application layer)

## Task Commits

Each task was committed atomically:

1. **Task 1: Dependencies, scripts, entorno y reinicio del volumen de Postgres** - `625277a` (chore)
2. **Task 2: Runner de migraciones SQL** - `561e07c` (feat)
3. **Task 3: Migración 001 — schema nodos y vinculos** - `067d7ab` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `db/migrate.mjs` - Migration runner: schema_migrations tracking, transaction-per-file, idempotent
- `db/migrations/001_esquema_inicial.sql` - `nodos`/`vinculos` DDL with all CHECK/FK constraints
- `.env.example` - Versioned DATABASE_URL template
- `.env.local` - Real DATABASE_URL (gitignored)
- `package.json` - Added `pg`/`@types/pg`, four new scripts (`db:migrate`, `test`, `migracion:exportar`, `migracion:importar`)
- `tsconfig.json` - Added `allowImportingTsExtensions` for `.ts` scripts run via `node --experimental-strip-types`
- `.gitignore` - `!.env.example` negation so the template stays versioned

## Decisions Made
- Lowered `viz_params_escalares()`'s string-length cap from 64 to 32 characters. See Deviations below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] viz_params GLSL-rejection CHECK didn't reject the plan's own test fragment**
- **Found during:** Task 3, running the acceptance criteria's four rejection tests against the live database
- **Issue:** The plan's SQL (`length(...) > 64`) let the acceptance criterion's own test insert succeed (`INSERT 0 1`) instead of failing — a 48-character GLSL fragment (`void main(){gl_FragColor=vec4(1.0,0.0,0.0,1.0);}`) is under the 64-char cap. DATA-03's actual purpose (no code smuggled into `viz_params`) wasn't enforced for short fragments.
- **Fix:** Lowered the threshold to 32 characters. Every legitimate `VizParams` string value (`shape`, `color`) is well under that — the longest THREE.js geometry name in this codebase is ~20 chars, hex colors are 7 — so no real value is affected, and the plan's test fragment is now correctly rejected.
- **Files modified:** `db/migrations/001_esquema_inicial.sql`
- **Verification:** Reset the Postgres volume, reapplied the migration, reran all four rejection tests plus the valid-insert acceptance test and the idempotent-rerun check — all pass as specified in the plan's acceptance criteria.
- **Committed in:** `067d7ab` (Task 3 commit — the file was corrected before its first commit, so there's no separate fix commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for DATA-03 to actually hold. No scope creep — same file, same constraint, one changed constant.

## Issues Encountered
- The plan's `grep -riE "dimension|dimension_id|nivel|level" db/` acceptance check matches a line in the migration file itself — but it's the explanatory comment stating these columns do *not* exist ("No existe dimensionId, ni nivel..."), not an actual column. Confirmed via `\d nodos` that no such column exists. Not a deviation, just a comment that happens to contain the forbidden words while explaining why they're forbidden.

## User Setup Required

None - `.env.local` was created directly with the docker-compose credentials; no external service configuration required.

## Next Phase Readiness
- `nodos`/`vinculos` schema is live and verified against every constraint the ERS model requires; plans 02-02 (resolverVista), 02-04/02-05 (migración CSV) can build against a real database instead of assumptions
- `npm run db:migrate` is idempotent and safe to run repeatedly as later plans add `002_*.sql` etc.
- No blockers or concerns for the next plan in this phase

---
*Phase: 02-data-vista-backend*
*Completed: 2026-08-07*

## Self-Check: PASSED

All created files found on disk (db/migrate.mjs, db/migrations/001_esquema_inicial.sql, .env.example, package.json, tsconfig.json, .gitignore). All three task commits (625277a, 561e07c, 067d7ab) found in git log.
