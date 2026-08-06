---
phase: 01-repo-cleanup
plan: 04
subsystem: infra
tags: [strapi, postgres, docker, scaffold]

# Dependency graph
requires:
  - phase: 01-repo-cleanup (plan 01-01)
    provides: tsconfig.json with "strapi" in exclude
provides:
  - docker-compose.yml — Postgres 16 for local dev, healthchecked, accepting connections
  - strapi/ — independent Strapi 5.51.2 app with its own package.json and node_modules
affects: [02-data-vista-backend]

# Tech tracking
tech-stack:
  added:
    - "@strapi/strapi 5.51.2 (in strapi/, not the root app)"
    - "postgres:16-alpine via docker-compose"
  patterns:
    - "Two independent apps in one repo: no npm workspaces, no hoisting, two dependency trees"
    - "Postgres containerized for dev; Strapi runs on the host via its own npm run develop"

key-files:
  created:
    - docker-compose.yml
    - strapi/package.json
    - strapi/config/database.ts
    - strapi/.env
  modified: []

key-decisions:
  - "No top-level `version:` key in docker-compose.yml — Compose V2 treats it as obsolete and warns"
  - "Named volume (sinapsis_pgdata) over a bind mount — a relative bind mount on Windows causes permission grief for the Postgres data directory"
  - "db is the only service; Strapi is not containerized for dev"
  - "No strapi/.gitignore was needed: root .gitignore:85 has unanchored `node_modules/`, which already covers strapi/node_modules"

patterns-established:
  - "Root package.json has no `workspaces` key; Next stays at the repo root, Strapi lives at strapi/"

requirements-completed: [REPO-05]

# Metrics
duration: interrupted-then-completed-inline
completed: 2026-08-06
---

# Phase 01 Plan 04: Strapi Home + Postgres Summary

**`docker-compose.yml` brings up a healthchecked Postgres 16, and `strapi/` holds an independent Strapi 5.51.2 app with its own dependency tree — the ground Phase 2 builds the schema and Vista endpoint on**

## Accomplishments
- `docker-compose.yml` at the repo root: single `db` service on `postgres:16-alpine`, named volume, healthcheck, no `version:` key
- Postgres is up and healthy — `pg_isready -U strapi` reports `accepting connections`, and `psql -c "select 1"` returns a row
- `strapi/` scaffolded with `@strapi/strapi` 5.51.2, plus `@strapi/database`, `@strapi/plugin-cloud`, `@strapi/plugin-users-permissions`
- `strapi/.env` points at the compose service: `DATABASE_CLIENT=postgres`, `DATABASE_NAME=strapi`
- `strapi/node_modules` exists as a real directory — no workspace hoisting; root `package.json` has no `workspaces` key
- No nested git repository (`strapi/.git` absent)
- `strapi/node_modules` is not staged — 0 such paths in the commit
- No content types: `strapi/src/api/` holds only `.gitkeep`
- Root app unaffected: `npm run build` exits 0, `npx tsc --noEmit` exits 0

## Task Commits

1. **Task 1: docker-compose.yml + Postgres up** - `d9cbd45` (feat)
2. **Task 2: Scaffold strapi/ as an independent app** - `8d36626` (feat)

## Files Created/Modified
- `docker-compose.yml` - Postgres 16 for local development, healthchecked, `db` service only
- `strapi/package.json` - Strapi's own manifest, independent of the root app
- `strapi/config/*.ts` - Scaffold defaults (admin, api, database, middlewares, plugins, server)
- `strapi/.env` - Local dev credentials matching the compose service (untracked, covered by root `.env*`)

## Decisions Made
- See key-decisions above. All compose-file choices were locked by the plan and reproduced verbatim.

## Deviations from Plan

### `strapi/.gitignore` was not created — and did not need to be

The plan's Task 2 cleanup step 2 assumed the root `.gitignore` had a **root-anchored**
`/node_modules`, which would not cover `strapi/node_modules`, and instructed appending
`node_modules/` to a `strapi/.gitignore` if `git status --porcelain strapi/node_modules`
printed anything.

That premise was wrong in a harmless direction: root `.gitignore:85` is unanchored
`node_modules/`, which already matches at any depth. Verified directly rather than trusting the
empty `git status` output (which can be misleading when a whole parent directory is untracked
and git collapses it):

- `git check-ignore -v strapi/node_modules` → `.gitignore:85:node_modules/`
- `git add -An strapi/` → 0 paths containing `node_modules`
- The actual commit contains 0 `node_modules` paths across 19 files

No file was created, because the condition the plan gated it on was never met.

**Total deviations:** 1, and it is a no-op — the plan's conditional cleanup did not trigger.

## Issues Encountered

**Execution was interrupted.** The gsd-executor agent running this plan was terminated by an API
monthly spend limit partway through Task 2, after Task 1 had been committed (`d9cbd45`) and the
`create-strapi` scaffold had completed on disk but was left untracked. The agent's last recorded
decision was to add `--no-git-init` and `--no-run` explicitly to the scaffold command rather than
rely on defaults. The orchestrator verified every Task 2 acceptance criterion against the on-disk
result, confirmed all passed, and committed the scaffold inline as `8d36626`. Nothing was redone.

**Flag verification.** The plan flagged the `create-strapi` CLI flag names as LOW confidence and
required checking `--help` first. The interrupted agent did run that check and reported all flag
names matched the plan exactly, with `--no-git-init` and `--no-run` added deliberately. The
scaffold result confirms it: Strapi 5.51.2, no `.git`, and the app was never started.

## User Setup Required

**Docker Desktop must be running** before `docker compose up -d db`. The container
`sinapsis_front-db-1` is currently up and healthy on `0.0.0.0:5432`. Local dev credentials are
`strapi`/`strapi`/`strapi` — not secrets, intentionally unparameterised for one developer on one
machine.

To start Strapi (Phase 2's job, not this plan's): `cd strapi && npm run develop`.

## Next Phase Readiness
Phase 2 (DATA-01..05, VIST-05) can now define the nodo/vínculo content types against a live
Postgres. Deliberately not done here, per the plan's constraints: no content types, no
controllers, no custom Vista route, no migrations, no seed scripts, and the admin panel was
never opened (no admin user exists yet — Phase 2 creates it on first `npm run develop`).

---
*Phase: 01-repo-cleanup*
*Completed: 2026-08-06*

## Self-Check: PASSED

- FOUND: docker-compose.yml
- FOUND: strapi/package.json
- FOUND: d9cbd45
- FOUND: 8d36626
