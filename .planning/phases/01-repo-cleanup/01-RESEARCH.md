# Phase 1: Repo Cleanup - Research

**Researched:** 2026-08-06
**Domain:** Dependency upgrade (three.js), Vite→Next.js engine port, Strapi scaffold
**Confidence:** HIGH (versions and breaking changes verified against npm registry, package tarballs, and official docs; a few items marked LOW where verification wasn't possible)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**REPO-01 — deletions:** Delete `src/app/lib/mundo.js`, `mundo2.js`, `src/app/context/NetworkContext.js` (and `context/` if it empties), `src/app/components/{network.js,NetworkWrapper.js,networkWrapper.js,floatingInfo.js,floatingMenu.js,RegistrationForm.js,ThankYouMessage.js}`, `src/app/utils/ScriptLoader.js`, and the `react-force-graph-3d` dependency. `3d-force-graph` stays. Uncommitted working-tree changes from the React attempt are discarded (preserved on branch `task/Refactor-en-React`).

**REPO-02 — dependency strategy:** The `three` version decision is the research question of this phase, not a preference. Two acceptable outcomes: (1) move to current `three` and fix shader/import fallout in this phase, or (2) pin to a version the engine already works against with a `ponytail:` comment naming the ceiling. Pick whichever produces the smaller, more honest diff — do not half-upgrade and leave broken shaders for Phase 3. Tailwind stays on v3 unless research shows v4 migration is trivial.

**REPO-03 — engine landing zone:** Copy from `collectiveConscience/src/client/` (read-only, live in production, never modified) into `src/engine/`:
- `threeObjects/` — whole directory, all files, including `crossedLinesThreeObject.js`, `linkThreeObject.js`, `threeGlobal.js` (missing from the stale March-2025 copy currently in `src/app/lib/threeObjects/`, which gets deleted)
- `graph/{cameraController.js, animationManager.js, constants.js, background.js, utils.js}`
- Do NOT copy `graph/mundo.js`, `graph/dataLoader.js`, `graph/graphManager.js` — these carry the `dimensionId` model this project replaces (Phase 3 writes the replacement).
- `ThreeObjectManager`'s `import.meta.glob` auto-registration is Vite-only and **will break on copy** — must be resolved this phase, likely via an explicit barrel file (more boring, more debuggable than the glob).
- Engine stays JavaScript. No TypeScript conversion this phase.

**REPO-04 — Vista contract:** One file, `src/types/vista.ts`, with the exact locked shape given in CONTEXT.md (`NodeType`, `TipoVinculo` without `CUSTOM`, `Transicion`, `ModoOrden`, `Vista`, `NodoGrafo`, `VizParams` scalars-only, `VinculoGrafo`, `Subgrafo`, `AreaSegura`). Types only — no functions, no runtime values, no zod schemas. Not open for reinterpretation.

**REPO-05 — Strapi's home:** `strapi/` at repo root with its own `package.json` and `node_modules`. No npm workspaces, no turborepo. Next stays at repo root (no `apps/web/` restructure). `docker-compose.yml` at root brings up Postgres only — Strapi is not containerized for dev, runs via its own `npm run develop`. Whether to fully scaffold Strapi or just carve out the directory + compose file is the planner's call; success criterion is `strapi/` existing with its own `package.json` and Postgres coming up via compose.

### Claude's Discretion
- Exact `three` version and how much shader fallout to absorb (this research resolves it)
- Whether `ThreeObjectManager`'s auto-registry becomes a barrel file, explicit map, or something else
- How to split this phase into plans and waves
- Whether `strapi/` gets a full scaffold or a minimal one
- Lint/format configuration, as long as `npm run build` passes

### Deferred Ideas (OUT OF SCOPE)
- Converting the engine to TypeScript
- Instancing and LOD (deferred until PERF-01, Phase 3)
- Tailwind v4 migration
- Renaming the repo from `sinapsis-front`
- Strapi content-type configuration (Phase 2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REPO-01 | Repo starts with no trace of the react-force-graph-3d attempt | Deletion list confirmed against CONTEXT.md; no additional files found referencing these modules outside the listed set (see Landmine: verify no stray imports before deleting) |
| REPO-02 | Next/React/three/TypeScript on current versions, `npm run build` passes clean | Versions verified live against npm registry (Section: Standard Stack). Three.js version decision resolved with concrete fix list (Section: The three.js Decision) |
| REPO-03 | `src/engine/` contains the engine files, `import.meta.glob` resolved | File-by-file import graph traced; two previously-undocumented gaps found (`shaders/noise.js`, `Utils.js`) that CONTEXT.md's copy list omits — see Landmines. Barrel-file replacement designed against actual exported class names |
| REPO-04 | Shared `Vista` TypeScript contract | Locked shape copied verbatim from CONTEXT.md; path-alias gap found and fix proposed (Section: Landmines — path alias) |
| REPO-05 | `strapi/` with own `package.json`, `docker-compose.yml` brings up Postgres | Current Strapi version and CLI flags verified via npm + Strapi docs; minimal compose file drafted from official reference, trimmed to Postgres-only per CONTEXT.md |
</phase_requirements>

## Summary

The engine being copied in was written against `three@0.147.0` and last touched in a Vite/CommonJS-adjacent codebase. The target repo declares `three@^0.174.0` already, and current is `0.185.1`. Having traced every import in the files CONTEXT.md lists for copying, **the honest answer is: upgrade to current three, and the "shader fallout" is exactly one line** (`THREE.ColorManagement.enabled = false`), not a rewrite. Every file that reads like a version landmine (`CSS2DRenderer` path, `SRGBColorSpace`, `three/addons` vs `three/examples/jsm`, `three-custom-shader-material`, `three-spritetext`) turns out to already be resolvable against current three without a single import path change. The one real, unconditional break is `import.meta.glob`, which is Vite syntax and has nothing to do with the three.js version — it must be replaced with an explicit barrel file regardless of which three version is chosen.

Two gaps exist in CONTEXT.md's copy list that will produce broken imports if not corrected: five `threeObjects/*.js` files import `../shaders/noise.js`, which is not in the copy list, and `graph/background.js` imports `../Utils.js`, which is also not in the copy list (and is dead code inside `background.js` besides). Both are cheap to fix by copying one more file (or, for `Utils.js`, by deleting a dead import).

Next, React, and Tailwind should stay on their current major lines (Next 15, React 19, Tailwind 3) per the project's locked stack decision — but bumped to their latest minor/patch, which are non-breaking. TypeScript should explicitly **not** jump to the newly-released TypeScript 7 (native Go compiler): it ships without the stable programmatic API that `typescript-eslint` depends on, which `eslint-config-next` requires — adopting it now would break `next lint` for a phase whose job is a clean, boring base. Stay on TypeScript 5's latest (5.9.3).

Strapi 5.51.2 is current. The CLI is `npx create-strapi@latest` (the old `create-strapi-app` binary still works, same version, but the docs now lead with `create-strapi`), with `--non-interactive` plus explicit `--dbclient=postgres` flags for a fully scripted scaffold.

**Primary recommendation:** Upgrade `three` to `^0.185.0` and fix the two missing-file gaps in the copy list; replace `import.meta.glob` with an explicit barrel file; bump Next/React/Tailwind to latest-within-major, TypeScript to latest 5.x (not 7.x); scaffold Strapi with the CLI's non-interactive Postgres flags; add a Postgres-only `docker-compose.yml`.

## The `three` Version Decision

**Recommendation: upgrade to current three (`^0.185.0`, verified latest `0.185.1` as of 2026-07-01), not pin.** The diff to make current three work is smaller than the diff to keep 0.147 pinned and explain why (0.147 is 3+ years old, has no security-relevant patches backported, and `three-custom-shader-material` — which one file in the copy list depends on — declares a peer dependency of `three >= 0.159`, so pinning to 0.147 would mean either dropping `LikeFireThreeObject.js` from the copy or running an unsupported peer-dep combination). Verified fallout, file by file:

| Concern | Finding | Fix needed |
|---|---|---|
| `CSS2DObject` import path (`ThreeObject.js`) | `three/examples/jsm/renderers/CSS2DRenderer.js` still exists at this exact path in the `three@0.185.1` npm tarball (verified by extracting the package). `three/addons/*` is an additional alias added later, not a replacement — both resolve. | None. Import path is unchanged. |
| `TextGeometry`, `FontLoader` (`background.js`, `textThreeObject.js`) via `three/addons/...` | Confirmed present at `package/examples/jsm/geometries/TextGeometry.js` and `package/examples/jsm/loaders/FontLoader.js` in the current tarball; the `addons` export alias maps to the same files. | None. |
| `HDRCubeTextureLoader` (`noiseThreeObject.js`) | Still present in current three (`examples/jsm/loaders/HDRCubeTextureLoader.js`). Note: this file's load callback also references an undefined `MeshPhysicalNodeMaterial` (never imported) — already-dead/broken code in the source, unrelated to the version bump. See Landmines. | None for the version bump; pre-existing bug, not this phase's problem to fix (copy verbatim per CONTEXT.md). |
| Color management (`ColorManagement.enabled` default) | Confirmed via the three source: `ColorManagement.enabled = true` by default since r152. Every custom-shader file in this engine builds `new THREE.Color(hexValue)` and feeds it straight into a raw `THREE.ShaderMaterial` uniform consumed by hand-written GLSL (`linesThreeObject.js`, `marbleThreeObject.js`, `perlinThreeObject.js`, plus the palette in `ThreeObject.colorsArray`/`constants.js COLORS_ARRAY`). With color management on, constructing `THREE.Color` from a hex/CSS string now converts it from sRGB into the linear working color space before your shader ever sees it — shifting the numeric values your GLSL blends, even though the final render-to-canvas step still converts back to sRGB for display. Net effect: colors that only pass straight through a material look right, but any shader that *math's* on the color (gradients, blends, noise tinting — which is most of these) will render visibly different than they did on r147. | **One line, at engine init, before any material is created:** `THREE.ColorManagement.enabled = false;`. This restores the pre-r152 behavior (raw hex values used as-is, no implicit sRGB→linear conversion), which is what every shader here was tuned against. Mark with a `ponytail:` comment naming the ceiling (if the engine ever adopts PBR materials, this flag needs revisiting). **This cannot be verified without running the renderer — flag as "verify visually during Phase 3" once nodes actually render.** |
| `renderer.outputColorSpace` / `outputEncoding` | `outputEncoding` was renamed to `outputColorSpace` at the same r152 boundary. The engine never sets this explicitly (found one commented-out line in `titleObject.js`, not in the copy list) — it relies on the renderer default, which is `SRGBColorSpace` in current three (same effective default behavior as the option `THREE.sRGBEncoding` in old three's non-default configuration). No code in the copy list sets `.outputEncoding`, so there's nothing to rename. | None. |
| `Texture.encoding` → `Texture.colorSpace` | `imageThreeObject.js` and `textThreeObject.js` already use `imgTexture.colorSpace = THREE.SRGBColorSpace` — the *current* API, not the deprecated `.encoding`. Someone already updated these two files past r152 conventions even though the project pins three@0.147 today (meaning this code likely came from a beyond-0.147 edit, or was written speculatively). Either way, no fix needed. | None. |
| `three-custom-shader-material` (`LikeFireThreeObject.js`) | Current version `6.4.0` on npm declares peer dep `three: ">=0.159"`, `react: "^17 || ^18"` (react peer is irrelevant — the vanilla subpath doesn't touch React). The `/vanilla` export subpath (`three-custom-shader-material/vanilla`, exactly what this file imports) still exists in `6.4.0`'s package exports map (verified from the tarball). | None — install `three-custom-shader-material@^6.4.0`. Note: `LikeFireThreeObject` doesn't declare a `static type` (see Landmines) so it never actually self-registers today; this dependency is imported but the class is currently unreachable through the registry either way. |
| `three-spritetext` (`simpleTextThreeObject.js`) | Peer dep `three: ">=0.86.0"`. Current declared `^1.9.5` in target repo; latest is `1.10.0`. | Bump to `^1.10.0` — trivial. |
| `3d-force-graph` | No breaking peer conflict; its dependency `three-forcegraph` requires `three >= 0.118.3`. Current declared `^1.77.0`; latest is `1.80.0`. | Bump to `^1.80.0` — trivial, this stays per REPO-01. |
| Raw `ShaderMaterial` API itself | No breaking changes found to `ShaderMaterial`, `BufferGeometry`, `BufferAttribute`, or `Group`/`Mesh` construction between r147 and current that this engine's usage patterns touch (uniforms objects, `onBeforeCompile`, vertex/fragment shader strings are all unchanged surface). | None. |

**Bottom line:** `npm install three@^0.185.0 three-custom-shader-material@^6.4.0 three-spritetext@^1.10.0 3d-force-graph@^1.80.0`, add `THREE.ColorManagement.enabled = false;` once at engine bootstrap (the file that will own this in Phase 3's bridge — for Phase 1, note it as a required Phase 3 follow-up if there's no engine bootstrap file created yet, or set it directly in `src/engine/threeObjects/threeGlobal.js` right after `resolveTHREE()` runs, since that module is guaranteed to load before any material is constructed). No import path changes required anywhere.

## import.meta.glob Replacement

`ThreeObjectManager.js` ends with:
```js
const modules = import.meta.glob('./*ThreeObject.js', { eager: true });
for (const path in modules) {
    const module = modules[path];
    for (const key in module) {
        const ExportedClass = module[key];
        if (ExportedClass && ExportedClass.type) {
             ThreeObjectManager.registerType(ExportedClass.type, ExportedClass);
        }
    }
}
```
This is Vite-only. Next's webpack and Turbopack builds do not support `import.meta.glob`, and `require.context` (the webpack-only equivalent some CRA-era code uses — there's a dead, already-broken `dynamic-import.js` in the source using exactly this, see Landmines) is not implemented by Turbopack either, so it isn't a safe replacement given this project's `next dev --turbopack` script.

**Recommendation: explicit barrel file.** It's the smallest correct diff, is statically analyzable (so bundlers, TypeScript, and humans can all see what's registered), and preserves the exact existing registration contract (`ExportedClass.type` static field check) without touching any of the 15 type files. Delete the `import.meta.glob` block from `ThreeObjectManager.js` and add a new file, e.g. `src/engine/threeObjects/registerTypes.js`:

```js
// ponytail: explicit registry replaces Vite's import.meta.glob (unsupported by webpack/turbopack).
// Add a line here when a new ThreeObject type file is added — same cost as before, just visible.
import { ThreeObjectManager } from './ThreeObjectManager.js';
import { CrossedLinesThreeObject } from './crossedLinesThreeObject.js';
import { FireThreeObject } from './fireThreeObject.js';
import { ImageThreeObject } from './imageThreeObject.js';
import { LightsThreeObject } from './lightsThreeObject.js';
import { LinesThreeObject } from './linesThreeObject.js';
import { LinkThreeObject } from './linkThreeObject.js';
import { MarbleThreeObject } from './marbleThreeObject.js';
import { NoiseThreeObject } from './noiseThreeObject.js';
import { ParticlesThreeObject } from './particlesThreeObject.js';
import { PerlinNoiseThreeObject } from './perlinNoiseThreeObject.js';
import { PerlinThreeObject } from './perlinThreeObject.js';
import { SimpleTextThreeObject } from './simpleTextThreeObject.js';
import { TextThreeObject } from './textThreeObject.js';
import { TwistThreeObject } from './twistThreeObject.js';
import { WaveLineThreeObject } from './waveLineThreeObject.js';

const types = [
    CrossedLinesThreeObject, FireThreeObject, ImageThreeObject, LightsThreeObject,
    LinesThreeObject, LinkThreeObject, MarbleThreeObject, NoiseThreeObject,
    ParticlesThreeObject, PerlinNoiseThreeObject, PerlinThreeObject,
    SimpleTextThreeObject, TextThreeObject, TwistThreeObject, WaveLineThreeObject,
];

for (const ExportedClass of types) {
    if (ExportedClass && ExportedClass.type) {
        ThreeObjectManager.registerType(ExportedClass.type, ExportedClass);
    }
}
```

Whatever eventually imports `ThreeObjectManager` for real (Phase 3's engine bootstrap) must also import `./registerTypes.js` once, for its side effect. `LikeFireThreeObject` is deliberately excluded from this list — see Landmines (it doesn't declare a static `type` today, so including it changes nothing observable, but importing it pulls in `three-custom-shader-material` for a class that's currently unreachable; the planner's call whether to include it anyway for parity or leave it out and note the gap).

**Verification:** this registration loop is exactly the kind of non-trivial logic ponytail flags as needing a check. A two-line smoke test is enough: `import './registerTypes.js'; console.assert(Object.keys(ThreeObjectManager.getTypes()).length === 15, 'registry mismatch');` — cheap enough to run as a one-off `node --experimental-vm-modules` script or a single Jest/Vitest test if the project adds one later. Not required by REPO-03's success criteria (which only requires the files to exist and `npm run build` to pass), but worth a line in the plan since nothing else exercises this code path until Phase 3.

## Standard Stack

### Core (verified against npm registry, 2026-08-06)
| Package | Currently declared | Latest in same major | Latest overall | Recommendation |
|---|---|---|---|---|
| `next` | `^15.2.0` | `15.5.22` | `16.3.0` | **Stay on 15, bump to `^15.5.22`.** CLAUDE.md locks the stack ("ya está en el repo, no se reabre") — jumping to Next 16 is a framework-major change this phase doesn't need. |
| `react` / `react-dom` | `^19.0.0` | `19.2.8` | 19.2.8 (no v20 yet) | Bump to `^19.2.8`. Non-breaking (patch/minor line within React 19). |
| `three` | `^0.174.0` | — (no majors, calver-ish) | `0.185.1` | Bump to `^0.185.0` — see dedicated section above. |
| `typescript` | `^5` | `5.9.3` | `7.0.2` | **Stay on 5, bump to `^5.9.3`. Do NOT adopt TypeScript 7.** TS 7.0 (GA July 2026) ships the new Go-native compiler but *without* the stable programmatic API `typescript-eslint` needs — and `eslint-config-next` depends on `typescript-eslint`. Adopting TS7 now breaks `next lint` (workaround requires aliasing TS6 alongside TS7 under a second package name, a bigger and stranger diff than staying put). Revisit once TS 7.1 ships the API (Microsoft's own stated target; no date locked in yet). |
| `tailwindcss` | `^3.4.17` | `3.4.19` (dist-tag `v3-lts`) | `4.3.3` | **Stay on v3, bump to `^3.4.19`.** Confirms CONTEXT.md's default: v4 is a different config model (CSS-first `@theme`, drops the JS `tailwind.config.ts` approach this repo uses, changes how `postcss.config.mjs` + `autoprefixer` wire together). The repo's config (`tailwind.config.ts` + `postcss.config.mjs` with `plugins: { tailwindcss: {} }`) is a textbook v3 setup; nothing here makes a v4 migration "trivial" — it's a real reconfiguration. Not this phase's job. |
| `eslint-config-next` | `15.1.6` | `15.5.22` | `16.3.0` | Bump to `15.5.22` to match the `next` version (Next's own convention: keep this package version-locked to `next`). |

### Supporting (unchanged deps, verified current)
| Package | Currently declared | Latest | Notes |
|---|---|---|---|
| `3d-force-graph` | `^1.77.0` | `1.80.0` | Stays per REPO-01 (it's the force layout/picking engine, not the abandoned React wrapper). Bump is non-breaking. |
| `three-spritetext` | `^1.9.5` | `1.10.0` | Non-breaking bump. |
| `three-custom-shader-material` | not yet in `package.json` | `6.4.0` | **New dependency** — needed because `LikeFireThreeObject.js` (part of the whole-directory copy) imports it. Peer dep `three >= 0.159`, satisfied by `^0.185.0`. |

### Version verification commands used
```bash
npm view three version          # 0.185.1
npm view next version           # 16.3.0 (latest); npm view next@15 version → 15.5.22
npm view react version          # 19.2.8
npm view typescript dist-tags   # latest: 7.0.2, but no stable API yet — see above
npm view tailwindcss dist-tags  # latest: 4.3.3, v3-lts: 3.4.19
npm view eslint-config-next version   # 16.3.0 (latest); use 15.5.22 to match next@15
npm view three-custom-shader-material version   # 6.4.0
npm view three-spritetext version               # 1.10.0
npm view 3d-force-graph version                 # 1.80.0
npm view @strapi/strapi version                 # 5.51.2
```

**Installation:**
```bash
npm install next@^15.5.22 react@^19.2.8 react-dom@^19.2.8 three@^0.185.0 three-spritetext@^1.10.0 3d-force-graph@^1.80.0 three-custom-shader-material@^6.4.0
npm uninstall react-force-graph-3d
npm install -D eslint-config-next@15.5.22 typescript@^5.9.3 tailwindcss@^3.4.19
```

## Architecture Patterns

### Recommended Project Structure (after this phase)
```
sinapsis_front/
├── src/
│   ├── app/                    # existing Next App Router routes (React attempt's dead files removed)
│   ├── engine/                 # NEW — vanilla JS 3D engine, copied from collectiveConscience
│   │   ├── threeObjects/       # ThreeObject.js, ThreeObjectManager.js, registerTypes.js (new), + all *ThreeObject.js types
│   │   └── graph/              # cameraController.js, animationManager.js, constants.js, background.js, utils.js
│   └── types/
│       └── vista.ts            # NEW — the shared Vista contract (REPO-04)
├── strapi/                     # NEW — independent Strapi app, own package.json/node_modules
├── docker-compose.yml          # NEW — Postgres only
└── (existing config files)
```

### Pattern: barrel-file registration (see above) instead of build-tool globbing
**What:** Explicit import list replaces a bundler-specific glob.
**When to use:** Any registry/plugin pattern that depended on Vite or CRA-specific dynamic import magic when porting to Next/webpack/Turbopack.
**Example:** see `import.meta.glob Replacement` section above.

### Anti-Patterns to Avoid
- **Don't reach for `require.context`** as a "webpack already does this" fix — Turbopack (this project's dev bundler) doesn't implement it, so it would work in `next build` (webpack) but silently fail in `next dev --turbopack`, a split-brain bug that's worse than the glob it replaces.
- **Don't do a partial three.js upgrade** (e.g., bump the version number but leave `ColorManagement.enabled` at its new default without deciding). That's exactly the "half-upgrade that leaves broken shaders for Phase 3" CONTEXT.md warns against.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Strapi + Postgres local dev environment | A custom Express/pg backend, or a hand-rolled migration runner | `npx create-strapi@latest` non-interactive scaffold + official Postgres Docker image | Strapi's CLI already does DB config wiring, project structure, and admin panel bootstrapping — REPO-05's whole point is "one Postgres, one write door," which is exactly what Strapi gives out of the box |
| ThreeObject type auto-discovery | A custom file-system walker or webpack loader plugin to reintroduce glob-like behavior | Explicit barrel file (see above) | A dozen-line barrel is less code and less risk than writing/maintaining a custom Node-glob or webpack loader just to avoid typing 15 import lines |
| Postgres for local dev | A custom init container or hand-written SQL bootstrap script | Official `postgres` Docker image with `POSTGRES_USER`/`PASSWORD`/`DB` env vars (below) | The official image already handles first-run DB/user creation; DATA-01's schema is Phase 2's job, not this phase's |

**Key insight:** every "don't hand-roll" here is really the same lesson: this phase's job is to remove code (the React experiment, the stale engine copy) and register versions, not add new infrastructure logic. Anywhere a custom solution suggests itself, a CLI or a two-line config already does it.

## Common Pitfalls

### Pitfall 1: Copying "the whole threeObjects/ directory" copies two already-broken files
**What goes wrong:** `dynamic-import.js` references an undefined variable `importedModules` (only `importedClasses` is actually defined) and uses `require.context`, a webpack-only API this project's Turbopack dev script doesn't support. It is not imported anywhere in the source repo — verified via repo-wide grep. `noiseThreeObject.js`'s async HDR-load callback references `MeshPhysicalNodeMaterial`, which is never imported in that file — a `ReferenceError` waiting to fire the day that GitHub-hosted texture URL actually resolves (unlikely in practice, since it points at a raw GitHub tree URL, not raw content).
**Why it happens:** `collectiveConscience` is a live-but-imperfect production codebase; not everything in it is exercised.
**How to avoid:** Copy `dynamic-import.js` for byte-for-byte parity if literalism matters, but do not import or wire it up — it will never be referenced by the new barrel file. Leave `noiseThreeObject.js`'s bug as-is (copy verbatim, per CONTEXT.md instruction not to modify engine logic beyond what the version bump requires) — it's dormant, not blocking.
**Warning signs:** `npm run build` won't catch either of these (neither file is imported by anything in Phase 1); they'd only surface once Phase 3 actually imports the barrel or a type that reaches this constructor.

### Pitfall 2: CONTEXT.md's copy list is missing two files the listed files depend on
**What goes wrong:** `fireThreeObject.js`, `lightsThreeObject.js`, `perlinThreeObject.js`, `twistThreeObject.js`, and `waveLineThreeObject.js` all `import { noiseFS } from '../shaders/noise.js'` — a file one level up from `threeObjects/`, in a `shaders/` directory that CONTEXT.md's copy list never mentions. Separately, `graph/background.js` (which IS in the copy list) does `import Utils from '../Utils.js'`, a file also not in the copy list.
**Why it happens:** CONTEXT.md's copy list was drafted at the directory level (`threeObjects/`, four named `graph/*.js` files) without tracing cross-directory imports.
**How to avoid:** Add `src/client/shaders/noise.js` → `src/engine/shaders/noise.js` to the copy list (five files fail to resolve otherwise). For `Utils.js`: it is dead code inside `background.js` — `Utils.generateHeight` is only called from commented-out blocks — so the fix is to **delete the `import Utils from '../Utils.js'` line** when copying `background.js` rather than pull in a whole extra file for an unused import. Either approach is a one-line fix; deleting the import is less code.
**Warning signs:** `npm run build` will not catch this either, for the same reason as Pitfall 1 — nothing imports `src/engine/` yet this phase. This is a build-time-invisible bug until Phase 3. Recommend the plan explicitly lists these two fixes as copy-time edits, not something to discover later.

### Pitfall 3: `@/*` path alias doesn't reach the new `src/types/` or `src/engine/` directories
**What goes wrong:** `tsconfig.json` currently maps `"@/*": ["./src/app/*"]` only. `src/types/vista.ts` (REPO-04) and `src/engine/` (REPO-03) both live outside `src/app/`, so `import { Vista } from '@/types/vista'` will not resolve — TypeScript will report "Cannot find module."
**Why it happens:** The alias was set up when everything lived under `src/app/` (a common Next starter default), before this project introduced sibling top-level `src/` directories.
**How to avoid:** Add path entries rather than widen the existing one (avoids touching every existing `@/`-based import in `src/app/`):
```json
"paths": {
  "@/*": ["./src/app/*"],
  "@/types/*": ["./src/types/*"],
  "@/engine/*": ["./src/engine/*"]
}
```
**Warning signs:** Phase 2 or 3 importing `Vista` for the first time and immediately hitting a module-resolution error — cheaper to fix now while the file is created than to debug later in a parallel phase.

### Pitfall 4: stale `tsconfig.json` `include` entry for a file being deleted
**What goes wrong:** `tsconfig.json`'s `include` array has an explicit entry, `"src/app/components/network.js"` — one of the files REPO-01 deletes. Leaving it in `include` after deletion doesn't break the build (TypeScript silently ignores includes that don't resolve to existing files in most configurations, but `noEmit`+`incremental` setups can still warn), but it's a stray reference to a decision-and-a-half old workaround (someone had to special-case this one `.js` file into `include` to get IDE/type support on it, likely because it wasn't reachable via any `.ts` import).
**Why it happens:** Leftover from the abandoned React integration attempt.
**How to avoid:** Remove that line from `include` as part of the REPO-01 deletion pass.
**Warning signs:** None functional — just repo hygiene, but explicitly in scope since REPO-01 asks for "no trace" of the deleted attempt.

### Pitfall 5: `LikeFireThreeObject` doesn't self-register today — don't accidentally "fix" that as a side effect of the barrel file
**What goes wrong:** `LikeFireThreeObject.js` sets an *instance* field `type = 'Perlin'` (inside the constructor-time field list), not a `static type`. `ThreeObjectManager.registerType` keys off `ExportedClass.type` — the class-level static, which is `undefined` for this file. Under the current Vite glob, this means `LikeFireThreeObject` was never actually reachable through `ThreeObjectManager.createObject()` — a pre-existing, silent gap in the source repo, not something introduced by this migration. Also note: if it *were* given a static `type = 'Perlin'`, it would collide with `PerlinThreeObject.type = 'Perlin'` — last one processed wins in the registry map.
**Why it happens:** Copy-paste from `ThreeObject`'s pattern without matching the `static` keyword; never caught because it silently doesn't crash, it just never gets used.
**How to avoid:** When writing the barrel file, match the *current* behavior exactly: don't add `LikeFireThreeObject` to the explicit registration list (preserves existing behavior — it wasn't reachable before either). This is a byte-for-byte parity port, not a bug-fix pass. If completeness matters more than parity, that's the planner's call, but it should be a conscious decision, not an accidental side effect of switching from glob to barrel.
**Warning signs:** None — this is invisible either way. Flagging so the planner doesn't "fix" it by accident and then can't explain why a new node type appeared.

### Pitfall 6: color values will look different at first render, and there's no way to verify that without running the renderer
**What goes wrong:** Even with the `ColorManagement.enabled = false` fix applied, this is the one change in this phase that is visual and can't be confirmed by `npm run build` or a type-check — it can only be confirmed by looking at rendered output, which doesn't happen until Phase 3 wires up a bridge component.
**How to avoid:** Set the flag, document it with a `ponytail:` comment, and explicitly flag in the phase's done-criteria that this is "applied but visually unverified — verify in Phase 3 when nodes first render."
**Warning signs:** Phase 3 nodes render with washed-out or shifted colors compared to `collectiveConscience`'s live site (which is the visual reference, since it's still running r147 in production).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | Next.js, Strapi (`>=20 <=26.x`) | ✓ | v22.14.0 | — |
| npm | package installs | ✓ | 10.9.2 | — |
| Docker | `docker-compose.yml` (Postgres) | ✓ | 24.0.6 | — |
| Docker Compose | same | ✓ | v2.23.0-desktop.1 (Compose V2 plugin syntax) | — |

**Missing dependencies with no fallback:** none found.
**Note:** Docker Compose is the V2 plugin (`docker compose`, no hyphen), confirmed by `docker compose version` succeeding. The compose file below should NOT include the legacy top-level `version: '3'` key — Compose V2 treats it as obsolete and will print a warning; omitting it is both simpler and current practice.

## Code Examples

### Minimal `docker-compose.yml` (Postgres only, per CONTEXT.md — Strapi itself is not containerized for dev)
Adapted from Strapi's own reference example (`strapi/strapi-docker/examples/postgresql/docker-compose.yml`), trimmed to just the `db` service and modernized (no obsolete `version:` key, named volume instead of relative bind mount, healthcheck so a `depends_on: condition: service_healthy` is possible later):
```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: strapi
      POSTGRES_PASSWORD: strapi
      POSTGRES_DB: strapi
    ports:
      - "5432:5432"
    volumes:
      - sinapsis_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U strapi"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  sinapsis_pgdata:
```
`postgres:16-alpine` chosen as a current, small, broadly-compatible LTS-line Postgres image — Strapi 5 has no documented upper version ceiling found; this is a reasonable default, **flagged LOW confidence / verify at plan time** since no official Strapi Postgres compatibility matrix was found during research.

### Strapi non-interactive scaffold
```bash
npx create-strapi@latest strapi \
  --non-interactive \
  --dbclient=postgres \
  --dbhost=127.0.0.1 \
  --dbport=5432 \
  --dbname=strapi \
  --dbusername=strapi \
  --dbpassword=strapi \
  --skip-cloud \
  --no-example
```
Notes:
- `create-strapi-app` (old binary name) still resolves to the same `5.51.2` package; docs now lead with `create-strapi`. Either works; use `create-strapi` since it's the currently-documented name.
- `--non-interactive` defaults to TypeScript + npm + git init if no other language/package-manager flags are passed. Since the rest of this repo is TypeScript, that default is a reasonable fit and requires no extra flags — but Strapi is a fully separate app per REPO-05, so this is a free choice either way.
- This command requires `db` (the compose Postgres) to be reachable on `127.0.0.1:5432` at scaffold time if Strapi's installer validates the connection — bring up `docker compose up -d db` first.
- **LOW confidence on exact flag names** — verified against Strapi's official CLI installation docs page content as fetched during this research session, not against a live `--help` run (no Strapi CLI installed locally to cross-check). Recommend the plan run `npx create-strapi@latest --help` at execution time to confirm flags haven't shifted before scripting this non-interactively.

### `ThreeObjectManager` barrel-file registration
See full example in the `import.meta.glob Replacement` section above.

### Engine-side color management fix
```js
// src/engine/threeObjects/threeGlobal.js — after resolveTHREE() runs, before any material is built
// ponytail: pins pre-r152 color behavior (raw hex → shader, no implicit sRGB→linear conversion).
// Every custom-shader ThreeObject in this engine was visually tuned against that behavior on three@0.147.
// Revisit if/when the engine adopts PBR materials that expect linear color management.
THREE.ColorManagement.enabled = false;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact on this engine |
|---|---|---|---|
| `Texture.encoding`, `renderer.outputEncoding` | `Texture.colorSpace`, `renderer.outputColorSpace` | three r152 | Already using current API in the two files that touch textures (`imageThreeObject.js`, `textThreeObject.js`) — no change needed |
| `THREE.ColorManagement.enabled = false` (old default) | `true` (new default) | three r152 | Must explicitly opt back out — see above |
| `three/examples/jsm/*` only | `three/addons/*` added as an additional alias | Introduced via PR #23368, sometime around r150s | Both paths still resolve today; no need to migrate the existing `three/examples/jsm/...` import |
| `create-strapi-app` CLI | `create-strapi` CLI (same package, same version) | Strapi 5 docs restructure | Cosmetic; both work |
| TypeScript classic (tsc in JS) | TypeScript 7 native (Go-ported compiler) | GA July 2026 | Not adopted this phase — missing stable API breaks `typescript-eslint`/`eslint-config-next` |

**Deprecated/outdated:**
- `strapi new` CLI command: removed entirely in Strapi 5, replaced by `create-strapi`/`create-strapi-app`.

## Open Questions

1. **Should `LikeFireThreeObject` be included in the new barrel file?**
   - What we know: it doesn't self-register today (no static `type`), so excluding it from the barrel exactly preserves current behavior.
   - What's unclear: whether that's an intentional gap in `collectiveConscience` (unfinished feature) or a bug worth fixing while porting.
   - Recommendation: exclude it from the barrel (parity, not a bug-fix pass), copy the file verbatim for completeness, and leave a one-line note in the plan so it isn't silently "fixed" by accident. Its dependency `three-custom-shader-material` still needs installing either way, since the file will exist in the tree and must at least parse/import cleanly if anything ever does import it directly.

2. **Exact `create-strapi` CLI flags** — verified against Strapi's official docs page content only, not a live `--help`.
   - Recommendation: run `npx create-strapi@latest --help` at execution time before scripting the non-interactive scaffold, in case flags have shifted since this research.

3. **Whether Postgres image version matters to Strapi 5** — no official compatibility matrix found.
   - Recommendation: `postgres:16-alpine` is a safe default; not worth spending more research time on, since DATA-01 (schema) is Phase 2's problem and this phase only needs Postgres to come up and accept connections.

4. **Visual correctness of the `ColorManagement.enabled = false` fix** — cannot be verified without rendering.
   - Recommendation: explicitly carry this forward as a Phase 3 verification item (first time nodes actually render), not a Phase 1 done-criterion.

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`) — live version/dist-tag/peerDependency queries for `three`, `next`, `react`, `typescript`, `tailwindcss`, `eslint-config-next`, `three-custom-shader-material`, `three-spritetext`, `3d-force-graph`, `@strapi/strapi`, `create-strapi-app` — run 2026-08-06
- `three@0.185.1` npm tarball, extracted and inspected directly (`examples/jsm/renderers/CSS2DRenderer.js`, `examples/jsm/geometries/TextGeometry.js`, `examples/jsm/loaders/{FontLoader,HDRCubeTextureLoader}.js`, `build/three.core.js` color-management source)
- `three-custom-shader-material@6.4.0` npm tarball, extracted and inspected directly (package.json exports map confirms `/vanilla` subpath)
- `collectiveConscience/src/client/threeObjects/*` and `graph/*` — read directly, every import traced
- `collectiveConscience/package.json` and `sinapsis_front/package.json` — read directly

### Secondary (MEDIUM confidence)
- three.js r152 color management changes — cross-referenced via WebSearch (three.js forum discussion "Updates to Color Management in three.js r152", GitHub migration guide) and independently confirmed against the extracted `0.185.1` source (`ColorManagement.enabled` default, `SRGBColorSpace` constant)
- `three/addons` export path history — WebSearch (three.js forum, GitHub PR #23368) confirms it's additive, not a replacement for `examples/jsm`
- Strapi CLI flags — WebFetch of `docs.strapi.io/cms/installation/cli`
- TypeScript 7.0 GA / missing stable API / `typescript-eslint` impact — WebSearch cross-referencing InfoQ, digitalapplied.com, devencyclopedia.com (multiple independent sources agree on the same finding)
- Strapi reference `docker-compose.yml` — WebFetch of `strapi/strapi-docker` GitHub repo raw file

### Tertiary (LOW confidence, flagged for validation)
- Exact `create-strapi` flag names (not verified against a live `--help` run — see Open Questions)
- Postgres version compatibility ceiling/floor for Strapi 5 (no official matrix found)

## Metadata

**Confidence breakdown:**
- Standard stack (Next/React/TS/Tailwind versions): HIGH — verified live against npm registry today
- The `three` version decision and shader fallout: HIGH for what changed in the three.js API (verified against extracted source); MEDIUM for the color-management visual impact specifically (verified as a documented behavior change, but the actual rendered-pixel impact on this engine can't be confirmed without running it)
- `import.meta.glob` replacement: HIGH — the problem and fix are both mechanical, verified against actual exported class names in every type file
- Copy-list gaps (`shaders/noise.js`, `Utils.js`): HIGH — found by tracing every top-level import in every file CONTEXT.md's copy list names
- Strapi scaffold: MEDIUM — version and general CLI shape verified, exact flags LOW (see Open Questions)
- Landmines (SSR/`"use client"`): the engine files have no module-scope (as opposed to per-instance or per-call) references to `window`/`document`/`innerWidth`, so nothing crashes on import today; this only becomes live once Phase 3 builds the bridge component. HIGH confidence in the current-state finding, not applicable as a Phase 1 action item.

**Research date:** 2026-08-06
**Valid until:** ~30 days for the Next/React/Tailwind version table (fast-moving, but this project is pinned to major lines already so drift risk is low); ~7 days for the exact `three` patch version and Strapi CLI flags if execution is delayed, since both are actively shipping.
