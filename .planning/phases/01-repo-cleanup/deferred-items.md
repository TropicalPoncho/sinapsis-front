# Deferred Items — Phase 01 repo-cleanup

## From plan 01-03 (src/types/vista.ts)

### `npm run build` fails on unrelated files owned by plan 01-02 (parallel)

**Found during:** Task 1 verification (`npm run build`)
**Where:** `src/engine/threeObjects/ThreeObjectManager.js:221` — `Error: Do not assign to the
variable 'module'. See: https://nextjs.org/docs/messages/no-assign-module-variable
@next/next/no-assign-module-variable`. Also many `no-unused-vars` warnings across
`src/engine/threeObjects/*.js` and `src/engine/graph/background.js`.
**Why out of scope:** `src/engine/` is entirely owned by plan 01-02 (REPO-03), which was still
in progress and uncommitted at the time this plan ran in parallel. None of these files were
touched by plan 01-03; `src/types/vista.ts` is the only file this plan created.
**Verification performed instead:** `npx tsc --noEmit` exits 0 with zero errors — confirms
`src/types/vista.ts` itself type-checks cleanly and introduces no compile errors. The `npm run
build` failure is entirely attributable to `src/engine/` content, not to this plan's output.
**Action:** not fixed here. Belongs to plan 01-02 (or the orchestrator's post-merge build
validation) to resolve — either fix the `module` variable shadowing in `ThreeObjectManager.js`
or adjust ESLint config for the ported engine JS files.
