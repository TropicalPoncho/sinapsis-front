# Phase 3: 3D Engine (`SinapsisEngine`) - Research

**Researched:** 2026-08-15
**Domain:** three.js / 3d-force-graph camera control, off-axis projection, force-simulation state management
**Confidence:** HIGH — every library-API claim below was checked against the installed `.d.ts` files and,
where the types were insufficient, against the actual `.mjs`/`.js` source shipped in `node_modules`, not
against training-data memory. Three findings materially corrected a training-data assumption (see
"Corrections to likely assumptions" at the end).

## Summary

`3d-force-graph@1.80.0` (wrapping `three-forcegraph@1.42.13` and `three-render-objects`) exposes a small,
fully-typed, stable API surface — `cameraPosition()`, `zoomToFit()`, `graphData()`, `graph2ScreenCoords()`,
`screen2GraphCoords()`, `renderer()`, `camera()`, `scene()`, `controls()`, `d3Force()`, `onEngineStop()` —
and **everything `mundo.js` uses is in that typed surface**, with one exception that is an actual bug in
`mundo.js`, not a hidden API (see Pitfall 1). Nothing in `mundo.js`'s use of the library needs to be treated
as "undocumented"; the only landmines are in the *surrounding* `src/engine/` code (JS, not the library).

The four hardest asks — off-centre framing, camera-angle-avoids-panel, `filtrado` without re-layout, and
`setVista`'s promise — all have concrete, verified mechanisms:

1. **Off-centre framing** — `PerspectiveCamera.setViewOffset(fullW, fullH, offsetX, offsetY, fullW, fullH)`
   with `offsetX/Y` computed from `(viewport center) − (rect center)`. This is a pure translation of the
   frustum (no scaling), it auto-calls `updateProjectionMatrix()`, and it does **not** break picking —
   `three-render-objects` raycasts and projects through the same camera object, so it stays in sync for free.
2. **Camera angle away from panel** — orbit the camera between exactly two candidate azimuths (mirror of
   today's `izq`/`der` offset), score each by projecting `centroid − focusedNode` onto the candidate's
   camera-right/up axes, keep the winner. Two candidates, not N — matches the CONTEXT.md-locked minimal scope.
3. **`filtrado`** — `three-forcegraph` re-heats the D3 simulation (`alpha(1)`) on every `graphData()` call
   regardless of whether node objects are reused. The verified fix is `node.fx = node.x` (etc.) — literally
   documented in the installed type declarations — pinning kept nodes before calling `graphData()` with the
   filtered set, so they don't drift even though the simulation restarts.
4. **`setVista` promise (MOTR-09)** — `cameraPosition(pos, lookAt, durationMs)` has no completion callback in
   its public API; its internal tween (`@tweenjs/tween.js`, bundled) finishes at exactly `durationMs`. A
   `setTimeout(resolve, durationMs)` in the engine is not a hack, it's the only hook available and it is exact.

**Primary recommendation:** build `SinapsisEngine` as a thin new class in `src/engine/` that composes the
*existing* `ThreeObjectManager`, `CameraController`, `AnimationManager`, and a raw `ForceGraph3D` instance —
same shape as `Mundo` in the reference repo — rather than rewriting the force-graph wiring. Add new,
narrowly-scoped methods (`applySafeArea`, `chooseOrbitAngle`, `pinPositions`) instead of restructuring what's
already there. Fix the one real bug in `cameraController.resize()` first (see Pitfall 1) since MOTR-08/10
depend on the canvas size being correct.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Superficie pública (MOTR-01, MOTR-02):** exactamente dos métodos:
```ts
engine.setVista(subgrafo, { transicion, areaSegura, nodoEnfocado? }): Promise<void>
engine.on(evento, handler): () => void
```
`setVista` resuelve cuando la animación terminó (MOTR-09). El motor no importa React; React no importa THREE.
Un solo archivo puente. (Ya se intentó al revés en `task/Refactor-en-React` y falló — no reabrir esa vía.)

**Tres transiciones (MOTR-03/04/05/06):** `reemplazo` (fundido a negro + zoom, ya es el `goInto` de hoy en
`AnimationManager`), `filtrado` (conserva instancias y posiciones, desvanece lo que sale), `aditivo` (suma
nodos nuevos sin tocar los existentes). Cualquier Vista se alcanza con cualquiera de las tres — la transición
es un parámetro de `setVista`, nunca una consecuencia de qué Vista se pidió.

**Área segura continua (MOTR-08):** `areaSegura` es un rect del viewport no tapado por overlays. Desktop:
38% derecho. Mobile: banda superior. Llega de forma continua (cuadro a cuadro conforme se scrollea la ficha),
no una vez al montar la ruta.

**Encuadre según `shape` (MOTR-10):**
```
vizParams.shape === 'Image'  →  el nodo entra ENTERO en el área segura
cualquier otra                →  basta con que su centro caiga adentro; el derrame es deseable
```
Es un booleano derivado de `vizParams.shape` (dato curado), nunca un `switch (nodeType)`.

**Panel fijo, cámara orbita (MOTR-11):** el panel no se mueve. El motor orbita la cámara alrededor del nodo
enfocado hasta que sus aristas salgan hacia el lado libre. Implementación mínima: orientar de modo que el
centroide del grafo quede del lado opuesto al panel — un vector resuelve el caso común. Marcar con
`ponytail:` el techo: si un nodo muy conectado sigue tirando aristas sobre el panel, ahí se proyecta cada
vecino y se elige el mejor de N ángulos candidatos (deferred, no en esta fase).

**Reporte del motor (MOTR-12):** `on('nodeFocus')` devuelve la posición proyectada en pantalla del nodo (un
punto), no una región ni un lado.

**Medición (PERF-01):** un número documentado — cuántos nodos sostiene a 30fps en gama media, con draw calls
por nodo. Medido en dos escenarios: canvas limpio y canvas con overlay tapando el 62%. El canvas nunca se
desmonta, el loop corre incluso en pantallas de puro texto. El resultado es un número escrito, no una
optimización — instancing queda diferido hasta tenerlo.

**Lo que ya existe y no se reinventa:** `src/engine/` (15 `ThreeObject` + shaders, `cameraController`,
`animationManager`, `constants`, `background`, portados desde `collectiveConscience` en producción);
`src/lib/vista/resolverVista.ts` + `adyacencia.ts` (puros, 18 tests — el motor los consume, no los
reimplementa); `src/types/vista.ts` (el contrato, se importa, no se redeclara).

**Lo que se reemplaza:** `mundo.js`, `dataLoader.js`, `graphManager.js` del repo viejo — cargan el modelo
`dimensionId`, no se copiaron a propósito. Sirven solo como referencia de lectura.

**Boundary:** esta fase NO escribe UI, rutas, panel, degradado ni menú (fase 4). Un componente React que no
sea el archivo puente es un defecto.

### Claude's Discretion

- Cómo se estructura internamente el motor y qué archivos lo componen
- La forma exacta de los eventos de `on` más allá de `nodeFocus`
- Cómo se arman las fixtures para desarrollar sin la fase 2
- El easing y las duraciones de las transiciones
- Cómo se mide PERF-01 y con qué herramienta

### Deferred Ideas (OUT OF SCOPE)

- Instancing y LOD — hasta tener el número de PERF-01
- El panel, el degradado, el scroll y el menú — fase 4
- Proyectar cada vecino para elegir el ángulo — arranca con el centroide; se sube si hace falta
- Modos de orden `geo` y `aleatorio` de la Vista — solo `grafo` en esta fase
- Optimizar las imágenes a WebP — cuando exista el pipeline de subida
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOTR-01 | `engine.setVista(subgrafo, opts): Promise<void>` como única entrada de datos | §"Bridge surface" below; `cameraPosition` has no native promise, engine must wrap with `setTimeout` (verified, §"MOTR-09") |
| MOTR-02 | `engine.on(evento, handler): () => void` | No library API needed — plain internal event emitter (few lines, don't add a dep) |
| MOTR-03/05/06 | `reemplazo`/`aditivo` transitions | Already implemented in `AnimationManager.fadeOutCanvasToBlack/fadeInCanvasFromBlack` (reemplazo) and plain `graphData()` merge (aditivo) — reuse as-is |
| MOTR-04 | `filtrado`: keep instances/positions, fade what leaves | §"Question 4" — `node.fx/fy/fz` pinning verified against `three-forcegraph` types and the `graphData` re-heat behavior verified against source |
| MOTR-08 | `areaSegura` applied continuously, not per-route | §"Question 2" — `setViewOffset` call must run every frame/every prop update, not once on mount |
| MOTR-09 | `setVista` promise resolves when animation ends | §"MOTR-09" — verified `cameraPosition` tween duration is exact; no native callback exists |
| MOTR-10 | Framing by `shape`, not `nodeType` | §"Question 2" — two code paths (fit-whole-sphere vs. center-only) share one `applySafeArea` primitive |
| MOTR-11 | Camera orbits so edges avoid the panel | §"Question 3" — two-candidate scoring against centroid, degenerate cases enumerated |
| MOTR-12 | `nodeFocus` reports projected screen point | `graph2ScreenCoords(x,y,z)` — verified in `three-render-objects` source, returns `{x,y}` in canvas pixels via `Vector3.project(camera)`, already accounts for `setViewOffset` |
| PERF-01 | Documented fps/draw-calls number, two scenarios | §"Question 5" |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- El motor no importa React; React no importa THREE — un único archivo puente (bidireccional).
- El canvas es fondo permanente, nunca se desmonta, una sola instancia del motor en toda la app.
- El puente es bidireccional: React pasa `areaSegura`, el motor reporta la posición en pantalla del nodo
  enfocado. Ninguna dirección se salta poniendo al otro a adivinar.
- Navegar es coreografía, no paralelismo: un cambio de ruta secuencia Vista → animación de cámara → overlay;
  las animaciones de cámara deben ser esperables desde afuera (esto es literalmente MOTR-09).
- `dimensionId` no existe — no reintroducir un campo de nivel persistido; la profundidad viene de
  `resolverVista`'s BFS y muere con el resultado.
- `viz_params` guarda escalares, nunca GLSL — instancing queda descartado si esto se viola. No relevante para
  construir el motor en sí, pero si el motor añade un parámetro visual nuevo, debe ser escalar.
- La transición es independiente de la consulta (MOTR-03/04/05/06 ya lo capturan).
- Disciplina general: mínimo código, sin abstracciones sin pedido, comentarios `ponytail:` en toda
  simplificación deliberada, nombrando el techo.

## Standard Stack

### Core (already installed — do not add anything)

| Library | Installed | npm latest | Purpose | Status |
|---------|-----------|-------------|---------|--------|
| `3d-force-graph` | 1.80.0 | 1.80.0 | Force layout + picking + camera + scene wrapper | Up to date |
| `three` | 0.185.1 | 0.185.1 | WebGL/scene graph | Up to date |
| `three-forcegraph` | 1.42.13 (transitive) | 1.43.4 | The actual `ThreeForceGraph` Object3D that `3d-force-graph` wraps | One minor behind, no action needed |
| `three-custom-shader-material` | ^6.4.0 | — | Used by some `ThreeObject` shaders (not audited line-by-line here — out of scope, existing code) | — |
| `three-spritetext` | ^1.10.0 | — | Available if any `ThreeObject` needs text sprites | — |
| `@tweenjs/tween.js` | bundled inside `three-render-objects`, not a direct dependency | — | Drives `cameraPosition()`'s transition; **do not add a tweening library**, it's already there and already ticked every frame by the library's own render loop | Verified in source |

**Installation:** none needed. Everything Phase 3 needs is already in `package.json`.

### Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Camera tweening | A custom animation/easing loop for `cameraPosition` moves | `graph.cameraPosition(pos, lookAt, ms)` | Already tweens via `@tweenjs/tween.js`, ticked automatically inside the library's render loop (verified: `state.tweenGroup.update()` runs every frame in `three-render-objects.mjs`) |
| Screen-space projection of a node | Manual `Vector3.project(camera)` + pixel math for MOTR-12 | `graph.graph2ScreenCoords(x, y, z)` | Does exactly this, already accounts for `setViewOffset`, one call |
| World-to-ray unprojection | Manual raycaster setup | `graph.screen2GraphCoords(x, y, distance)` | Same reasoning, symmetric API |
| Force layout | A custom spring simulation | `d3Force('link'|'charge'|'center', fn)` via the library | Already wired in `mundo.js`/should be reused as-is |
| Fitting the whole graph in view | Custom bounding-box + FOV math for the *global* view | `graph.zoomToFit(ms, padding, nodeFilter?)` | Only for whole-graph framing, not for the off-centre single-node case (MOTR-08/10 need the custom math below, `zoomToFit` doesn't take a rect) |
| Bounding sphere of a node for framing | `new THREE.Box3().setFromObject(mesh)` every frame | The already-known configured size (`GLOBAL_DEFAULT_SETTINGS.imgSize`/`nodeSize` from `constants.js`) | `ImageThreeObject`'s sprite texture loads **asynchronously** (`TextureLoader.load` callback) — measuring the mesh's actual bounding box before the texture resolves gives a wrong/empty box. The size used to *create* the sprite (`imgSize`) is already known synchronously; use that number for the framing distance formula instead of measuring geometry |

**Key insight:** every piece of "hard 3D math" this phase seems to need (off-axis framing, screen projection,
camera tweening) is either already implemented in the installed libraries or directly derivable from
`PerspectiveCamera.updateProjectionMatrix()`'s own published formula — nothing here justifies a new dependency.

## Architecture Patterns

### Recommended structure — extend, don't restructure

`src/engine/` already has the right shape (`ThreeObjectManager`, `CameraController`, `AnimationManager`,
`constants.js`, `background.js`, 15 `ThreeObject`s). The phase's job is:

```
src/engine/
├── graph/
│   ├── cameraController.js      # existing — fix resize() bug (Pitfall 1), add applySafeArea() + chooseOrbitAngle()
│   ├── animationManager.js      # existing — reemplazo already implemented; add filtrado (pin/unpin + fade)
│   ├── constants.js             # existing — add new constants here if framing needs them, don't touch calibrated ones
│   └── utils.js                 # existing — has getSide(); repurpose the vector-math pattern, don't duplicate it
├── threeObjects/                # existing — untouched, ThreeObject/ThreeObjectManager/registerTypes as-is
├── SinapsisEngine.js             # NEW — composes the above, exposes only setVista()/on(), owns the fixture-driven
│                                  #        graphData, no React import
└── (fixtures live under a sibling test/dev folder, Claude's discretion — see Open Questions)
```

`src/app/` gets exactly one new file for the bridge (per CLAUDE.md invariant — "un solo archivo de puente"),
which is explicitly out of scope boundary-wise for this phase's *engine* work but is needed to develop/verify
against fixtures. Keep it minimal — a client-only mount point, not UI.

### Pattern 1: `applySafeArea` — off-axis framing without rotating the camera

**What:** shift the projected image so a node that's centred in the frustum appears centred in an arbitrary,
continuously-changing rect, using `PerspectiveCamera.setViewOffset`.

**Verified against:** `node_modules/three/src/cameras/PerspectiveCamera.js` (`setViewOffset`,
`updateProjectionMatrix`) — the exact formula below is derived line-by-line from that source, not recalled
from training data.

```js
// src/engine/graph/cameraController.js — new method

/**
 * Traduce la proyección para que lo que hoy cae en el centro del frustum
 * (p. ej. el nodo enfocado, si lookAt apunta a él) caiga en el centro de `areaSegura`.
 * No rota la cámara, no cambia distancia/zoom — es una traslación pura del frustum.
 * Debe llamarse en cada frame o en cada cambio de `areaSegura`/resize; el offset queda
 * obsoleto si el canvas cambia de tamaño y no se vuelve a llamar (setViewOffset reescribe
 * camera.aspect a fullWidth/fullHeight, así que hay que pasar el tamaño ACTUAL siempre).
 *
 * @param {AreaSegura} areaSegura - { top, right, bottom, left } como insets desde cada borde
 *   del viewport (convención CSS `inset`), NO como coordenadas absolutas. Verificar contra lo
 *   que emite React antes de implementar — ver Open Questions.
 */
applySafeArea(areaSegura, viewportW, viewportH) {
    const rectCenterX = (areaSegura.left + (viewportW - areaSegura.right)) / 2;
    const rectCenterY = (areaSegura.top + (viewportH - areaSegura.bottom)) / 2;

    const offsetX = viewportW / 2 - rectCenterX;
    const offsetY = viewportH / 2 - rectCenterY;

    // fullWidth === width, fullHeight === height ⇒ pura traslación, sin escalar (sin "zoom").
    // setViewOffset llama a updateProjectionMatrix() internamente — no hace falta llamarla aparte.
    this.camera.setViewOffset(viewportW, viewportH, offsetX, offsetY, viewportW, viewportH);
}

clearSafeArea() {
    this.camera.clearViewOffset();
}
```

**Sign derivation (so the planner doesn't have to re-derive it):** from
`PerspectiveCamera.updateProjectionMatrix()`, with `width = fullWidth` and `height = fullHeight` (our case,
ratio 1 — no scaling): `left' = left + offsetX`, `top' = top - offsetY`. Since NDC→pixel mapping is linear
across `[left', right']`→`[0, canvasWidth]`, a world point that projects to the frustum center (pixel
`canvasWidth/2`) lands at `canvasWidth/2 - offsetX` after the offset. Solving for the point to land at
`rectCenterX` gives `offsetX = canvasWidth/2 - rectCenterX`. Same derivation for Y.

**Picking/raycasting after `setViewOffset` — verified, not broken:** `three-render-objects` computes both
hover/click raycasting (`intersectingObjects`) and `graph2ScreenCoords`/`screen2GraphCoords` from the *same*
`camera` object's `projectionMatrix`/`projectionMatrixInverse`, which `setViewOffset` already refreshed via
`updateProjectionMatrix()`. No extra correction needed — mouse coordinates are converted to NDC using the
canvas's actual pixel size (unaffected by the offset), and the shifted projection matrix does the rest.
(Verified: `node_modules/three-render-objects/dist/three-render-objects.mjs` lines ~423–446.)

### Pattern 2: fit-whole-sphere distance (MOTR-10, `shape === 'Image'`)

**Verified derivation** (same source file as above): `top = near·tan(fov/2)`, so at any distance `d` a
world-space object of diameter `2r` projects to `2r · canvasHeight / (2d·tan(fov/2))` vertical pixels, and by
the aspect relationship the same formula (using `canvasHeight`) also bounds the horizontal fit when the
limiting rect side is the smaller of the two — see derivation comment in code:

```js
/**
 * Distancia de cámara para que una esfera de radio `radio` entre completa en un rect de
 * rectW x rectH (en píxeles), dado el FOV vertical de la cámara (grados) y el alto real del
 * canvas. Derivado directamente de PerspectiveCamera.updateProjectionMatrix():
 *   top = near·tan(fov/2); la proyección vertical en píxeles de un objeto de 2r a distancia d
 *   es 2r·canvasHeight / (2d·tan(fov/2)).
 * Se toma el lado más restrictivo (min(rectW, rectH)) porque el objeto debe entrar en AMBOS ejes.
 * `margen` deja aire para no tocar el borde exacto del área segura.
 */
function distanciaParaEncuadrar(radio, rectW, rectH, canvasHeight, fovDegrees, margen = 0.9) {
    const fovRad = fovDegrees * Math.PI / 180;
    const ladoLimitante = Math.min(rectW, rectH) * margen;
    return radio * canvasHeight / (Math.tan(fovRad / 2) * ladoLimitante);
}
```

`radio` for `shape === 'Image'` is `GLOBAL_DEFAULT_SETTINGS.nodeSize * 2.1 / 2` — the exact factor
`imageThreeObject.js` already uses to size the sprite (`getImageSize(node, 2.1)`), read from `constants.js`,
**not measured from the mesh** (see "Don't Hand-Roll" — the sprite texture loads async).

For non-`Image` shapes (MOTR-10's "basta con que su centro caiga adentro"): reuse the *existing*
`GLOBAL_DEFAULT_SETTINGS.aimDistance` constant unchanged (calibrated, per CONTEXT.md — "si el encuadre nuevo
necesita otros valores, se agregan; los viejos no se tocan a ciegas") and call `applySafeArea` with the rect
center — landing the node's center inside the rect trivially satisfies "center falls inside," no separate
"anywhere in the rect" algorithm needed.

### Pattern 3: two-candidate orbit angle (MOTR-11)

```js
// src/engine/graph/utils.js — new, alongside the existing getSide()

function centroide(nodos, idExcluido) {
    const resto = nodos.filter(n => n.id !== idExcluido);
    if (resto.length === 0) return null; // nodo aislado — sin señal direccional
    let sx = 0, sy = 0, sz = 0;
    for (const n of resto) { sx += n.x; sy += n.y; sz += n.z; }
    return { x: sx / resto.length, y: sy / resto.length, z: sz / resto.length };
}

// Vector normalizado, en espacio de pantalla, desde el centro del viewport hacia el centro
// del área segura. Unifica desktop (derecha) y mobile (arriba) en una sola fórmula.
function ladoDestino(areaSegura, viewportW, viewportH) {
    const rectCenterX = (areaSegura.left + (viewportW - areaSegura.right)) / 2;
    const rectCenterY = (areaSegura.top + (viewportH - areaSegura.bottom)) / 2;
    const dx = rectCenterX - viewportW / 2;
    const dy = rectCenterY - viewportH / 2;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
}

/**
 * Dos candidatos únicamente — espejo del offsetX izq/der que `aimAtNode` ya usaba, pero
 * elegido por el centroide del grafo en vez de por el signo de node.x. Sube a N candidatos
 * (proyectar cada vecino) solo si el techo se cruza — ver CONTEXT.md, deferred.
 */
function elegirLadoOrbit(nodoEnfocado, nodos, areaSegura, viewportW, viewportH, offsets) {
    const c = centroide(nodos, nodoEnfocado.id);
    if (!c) return 1; // ponytail: sin vecinos, no hay arista que evitar — default histórico "der"

    const objetivo = ladoDestino(areaSegura, viewportW, viewportH);
    let mejorSigno = 1, mejorScore = -Infinity;

    for (const signo of [1, -1]) {
        const camPos = {
            x: nodoEnfocado.x + signo * offsets.aimOffsetX,
            y: nodoEnfocado.y,
            z: nodoEnfocado.z + offsets.aimDistance,
        };
        const viewDir = normalize(sub(nodoEnfocado, camPos));
        const right = normalize(cross(viewDir, { x: 0, y: 1, z: 0 }));
        const up = cross(right, viewDir);

        const haciaCentroide = sub(c, nodoEnfocado);
        const score = dot(haciaCentroide, right) * objetivo.x
                    - dot(haciaCentroide, up) * objetivo.y; // -up: pantalla y+ es "abajo"

        if (score > mejorScore) { mejorScore = score; mejorSigno = signo; }
    }
    return mejorSigno;
}
// normalize/sub/cross/dot: 4 one-line THREE.Vector3 wrappers, or use THREE.Vector3 directly —
// don't hand-roll a vector math module, three ships all of this.
```

**Degenerate cases (enumerated, not hand-waved):**
- **Focused node has no neighbors in the current Subgrafo** (`centroide` returns `null`) → no directional
  signal exists; fall back to the historical default side (`der`/signo 1). One line, already in the code above.
- **Focused node IS the centroid** (only possible if it's the sole node counted, i.e. same as "no neighbors"
  once `nodoEnfocado.id` is excluded from the average) → same path as above, already handled by the exclusion
  filter in `centroide()`.
- **One neighbor** → `centroide` = that neighbor's position. Formula works unmodified — no special case.
- **Two-node graph** → identical to the one-neighbor case.
- **Centroid directly along the initial view axis (no lateral component)** → both candidates score ~equally;
  `>` (strict) keeps the first-evaluated candidate (signo `1`, "der"), a deterministic, sane tie-break —
  matches the historical default.

### Pattern 4: `filtrado` transition — pin, don't fight the simulation

**Verified against source**, not assumed: `three-forcegraph`'s `graphData` prop has an `onChange` that only
pauses (`state.engineRunning = false`), but the *actual* re-init happens further down in `_updateForces()`:
any `graphData` change re-heats the D3 simulation (`d3ForceLayout.stop().alpha(1)`) and re-runs it, **every
time** `graphData()` is called — this is unconditional, there's no config flag to suppress it (checked
`d3AlphaMin`, `cooldownTicks`, `cooldownTime`, `warmupTicks` — none of them prevent the reheat itself, they
only control how long the *subsequent* re-simulation runs before stopping).

`node.fx`/`fy`/`fz` are real, documented fields (`three-forcegraph.d.ts`, `NodeObject` type): *"a node with a
defined `node.fx` has `node.x` reset to this value and `node.vx` set to zero"* on every tick — this is the
verified mechanism to freeze positions through a reheat.

```js
// AnimationManager or a new small module — filtrado transition
async function filtrar(graph, nodosNuevos, vinculosNuevos, nodosActuales) {
    const idsNuevos = new Set(nodosNuevos.map(n => n.id));
    const salen = nodosActuales.filter(n => !idsNuevos.has(n.id));
    const quedan = nodosActuales.filter(n => idsNuevos.has(n.id));

    // 1. Fijar los que quedan en su posición actual — sobreviven al reheat de graphData().
    for (const n of quedan) { n.fx = n.x; n.fy = n.y; n.fz = n.z; }

    // 2. Fade out de los que salen (ThreeObjectManager / opacity de sus meshes), luego
    //    disponerlos — reusar disposeUnusedObjects(idsNuevos) que ya existe en ThreeObjectManager.

    // 3. Recién ahí, graphData({ nodes: nodosNuevos, links: vinculosNuevos }). Los `quedan`
    //    conservan x/y/z exactos (fijados); no hay salto visual pese al reheat interno.

    // 4. Opcional: soltar el pin (`delete n.fx` etc.) después de que se estabilice, si se
    //    quiere que vuelvan a responder a fuerzas en interacciones futuras. Si no hace falta,
    //    dejarlos fijos es más simple — ponytail: nodos "filtrados" quedan pineados para
    //    siempre; revisar si una futura Vista los necesita libres otra vez.
}
```

This also directly informs `aditivo` (MOTR-05): pin the *existing* nodes the same way before adding new ones,
so the existing layout doesn't jump when new nodes join and get force-simulated into place around the
(temporarily) fixed backbone.

### `setVista`'s promise (MOTR-09) — verified, no native hook exists

`cameraPosition(position, lookAt, transitionMs)`'s public signature (from the installed `.d.ts`) returns
`ChainableInstance`, not a promise, and has no callback parameter. Verified in the actual implementation
(`three-render-objects.mjs`, `cameraPosition` setter): it builds a `Tween(...).to(finalPos, transitionDuration)`
and a second tween for the look-at target over `transitionDuration / 3`. Both tweens are driven every frame by
`state.tweenGroup.update()`, which the library's own render loop already calls — the engine does not need to
drive the tween. Since there is no `onComplete` exposed publicly, the correct, honest mechanism is:

```js
function moverCamara(graph, pos, lookAt, ms) {
    graph.cameraPosition(pos, lookAt, ms);
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

This is not an approximation — `Easing.Quadratic.Out` changes the interpolation curve, not the total
duration; the tween's `.to(..., transitionDuration)` call fixes the end time exactly at `ms`.

### Anti-Patterns to Avoid

- **Reassigning `Graph.camera` as a property** (`this.Graph.camera = new THREE.PerspectiveCamera(...)`, as
  `mundo.js` line 104 does) — see Pitfall 1, this clobbers the accessor method the library and
  `graph2ScreenCoords`/`screen2GraphCoords` depend on.
- **Calling `pauseAnimation()`/`resumeAnimation()` to "freeze" the simulation for `filtrado`** — this pauses
  the *entire* render loop (camera tweens, shader `animate()` ticks, everything), not just the force layout.
  Use `fx`/`fy`/`fz` pinning instead (Pattern 4).
- **Measuring a node's bounding sphere via `Box3.setFromObject(mesh)` for framing** — races the async texture
  load in `ImageThreeObject`. Use the known configured size from `constants.js`.
- **Rebuilding a "which side" chooser per-neighbor from day one** — CONTEXT.md explicitly locks the
  two-candidate/centroid approach as the *minimum* for this phase; the N-candidate version is deferred.

## Common Pitfalls

### Pitfall 1: `cameraController.resize()` uses `window.outerWidth/outerHeight` — wrong, and it will break MOTR-08/10

**What goes wrong:** `resize()` (src/engine/graph/cameraController.js, lines 46-55) does
`renderer.setSize(window.outerWidth, window.outerHeight)` and sets `camera.aspect` from the same. `outerWidth`/
`outerHeight` is the **browser chrome size** (including toolbars/borders), not the viewport or canvas size —
different from `innerWidth`/`innerHeight`, which `aimAtNode()` in the *same file* uses for its mobile
breakpoint check (`window.innerWidth < 800`), an inconsistency between two methods in one class.

**Why it matters for this phase specifically:** `applySafeArea` (Pattern 1) must pass the canvas's *actual*
pixel dimensions as `fullWidth`/`fullHeight` to `setViewOffset` — if `camera.aspect` was set from
`outerWidth/outerHeight` while the actual `<canvas>` is sized differently (any DevTools panel open, any
non-fullscreen embed, mobile browser chrome), the frustum and the offset math will be computed against a
size that doesn't match the rendered pixels, producing visible misalignment.

**How to avoid:** switch `resize()` to `window.innerWidth`/`window.innerHeight` (matches the existing
`aimAtNode` convention) or, more robustly, `renderer.domElement.parentElement`'s bounding rect if the canvas
is ever not full-viewport. Minimum fix: one line change, do before implementing MOTR-08/10, not after.

**Warning signs:** framing looks "close but not quite centered," worse with DevTools open or on mobile.

### Pitfall 2: `mundo.js`'s `this.Graph.camera = new THREE.PerspectiveCamera(...)` clobbers the accessor

**What goes wrong:** `Graph.camera` is a chainable getter/setter *method* (`camera(): Camera` per the typed
API). `mundo.js` line 104 assigns a raw `THREE.PerspectiveCamera` instance directly to that property name,
overwriting the function with an object. After that line, `this.Graph.camera()` — called as a function
anywhere later, including inside `graph2ScreenCoords`/`screen2GraphCoords`'s internal `this.camera()` calls —
would throw `TypeError: this.camera is not a function`.

**Why it happens:** looks like an attempt to force a specific camera instance/config at construction time;
it's dead/vestigial code (the line runs *after* `this.camera = this.Graph.camera()` already captured the
correct instance on the line above — the reassignment achieves nothing except breaking the method).

**How to avoid:** do not port this line. `SinapsisEngine` should read `graph.camera()` once (or whenever
needed) as a getter, and configure it via `cameraController.setupCamera()` (`near`/`far`/`fov`,
`updateProjectionMatrix()`) — already the correct pattern one method away in the same file.

**Warning signs:** if MOTR-12's `nodeFocus` screen-position event silently returns `undefined`/throws, check
this first.

### Pitfall 3: JS engine files aren't in the TS `include` glob, but `allowJs` makes the import work anyway

**What goes wrong (or doesn't):** `tsconfig.json`'s `include` only lists `**/*.ts`/`**/*.tsx`
(`.js` files under `src/engine/` aren't explicitly included) but `compilerOptions.allowJs: true` is set. This
means: a `.ts` bridge file importing `src/engine/SinapsisEngine.js` type-checks fine (TS infers loose/`any`
types from the JS, no "could not find declaration file" error) — verified by reading `tsconfig.json` directly.
No `.d.ts` stub file is needed for the engine. There's also no `@/engine/*` path alias configured (only
`@/*` → `src/app/*` and `@/types/*` → `src/types/*`) — the bridge file will need a relative import or a new
alias added to `tsconfig.json`.

**How to avoid:** nothing to fix — just don't assume you need JSDoc-driven `.d.ts` generation or a path alias
that doesn't exist yet; add one line to `tsconfig.json` `paths` if a `@/engine/*` alias is wanted, or use
relative imports (simpler, one file, ponytail-consistent).

### Pitfall 4: `dynamic-import.js` is dead code that will crash if anything imports it

**What goes wrong:** `src/engine/threeObjects/dynamic-import.js` uses `require.context(...)` — a
**webpack-only** API. `package.json`'s dev script runs `next dev --turbopack`, and Turbopack does not
implement `require.context`. Independently of that, the file also references `importedModules` on its last
line (`export default importedModules`) without ever declaring it (only `importedClasses` is declared) — a
plain `ReferenceError` regardless of bundler. `registerTypes.js` (already read, already has a `ponytail:`
comment explaining exactly this: *"registro explícito en lugar del glob dinámico de Vite — webpack/turbopack
no lo implementan"*) is the real, working replacement.

**How to avoid:** don't import `dynamic-import.js` from anything new. It's already effectively dead; nothing
in this phase needs to touch or delete it (out of phase boundary), just don't reference it.

### Pitfall 5: `setViewOffset` must be re-applied on every resize/areaSegura change, or it goes stale

**What goes wrong:** `camera.view` (once set by `setViewOffset`) persists across `updateProjectionMatrix()`
calls, reusing the *stored* `fullWidth/fullHeight/offsetX/offsetY` until `setViewOffset` is called again or
`clearViewOffset()` runs. If `applySafeArea` is only invoked once (e.g. inside `setVista()`) and not from the
main render loop / on every `areaSegura` prop change from React, a window resize or the continuous scroll-driven
`areaSegura` changes CONTEXT.md describes will desync the offset from the actual rect.

**How to avoid:** wire `applySafeArea` to run every frame (cheap — one matrix recompute) or, at minimum, on
every `areaSegura` update from the bridge and on every `resize` event — not just once per `setVista()` call.
This is a design requirement, not an optimization: MOTR-08 explicitly requires "continuous, not per-route."

### Pitfall 6: `ThreeObject`/`background.js` read `innerWidth`/`innerHeight` as bare globals in instance fields — false alarm, but confirm the invariant that protects it

**What was checked:** `ThreeObject.js` (`globalUniforms = { ..., aspect: {value: innerWidth/innerHeight} }`),
`background.js` (same pattern), and `LikeFireThreeObject.js` (unregistered, dead) all reference `innerWidth`/
`innerHeight` as **class instance fields**, not `static` fields — meaning they execute on `new ThreeObject()`
(i.e. when `nodeThreeObject()`/`linkThreeObject()` fire during render), **not** at module import time. As long
as `SinapsisEngine` (and the bridge that mounts it) only ever runs client-side — which the CLAUDE.md invariant
("el canvas es fondo permanente," single client instance) already requires — this never executes during Next's
SSR pass. No fix needed, but the bridge component must be mounted client-only (e.g. `next/dynamic` with
`ssr:false`, or a `'use client'` component whose effects don't run during server render) for this to hold;
flag this explicitly in the plan's bridge-file task so it isn't accidentally rendered eagerly on the server.

### Pitfall 7: `ThreeObjectManager.registerType` throws if `Like Fire` collides — confirmed non-issue, `LikeFireThreeObject` is never imported

**What was checked:** `registerTypes.js`'s explicit import list (15 classes) does **not** include
`LikeFireThreeObject` — matches CONTEXT.md's note that it's excluded on purpose (declares instance `type`,
not `static type`, and would collide with `Perlin`). Confirmed by reading `registerTypes.js` directly: no
action needed, just don't add it to the barrel.

## Code Examples

### `graph2ScreenCoords` for MOTR-12 (`nodeFocus` event)

```js
// Verified: three-render-objects.mjs — getScreenCoords(state, x, y, z):
//   vec.project(this.camera()); return { x: (vec.x+1)*width/2, y: -(vec.y-1)*height/2 }
// Already accounts for any active setViewOffset, since it projects through the same camera.
const screenPos = graph.graph2ScreenCoords(node.x, node.y, node.z); // { x, y } in canvas pixels
engine.emit('nodeFocus', { nodeId: node.id, screen: screenPos });
```

### Reusing `AnimationManager` for `reemplazo` (MOTR-03) — already correct, don't rewrite

```js
// animationManager.js already implements this exact sequence (fadeOutCanvasToBlack →
// graphData/replace → fadeInCanvasFromBlack). SinapsisEngine.setVista() with
// transicion === 'reemplazo' should call this as-is, just resolve the returned promise
// from setVista once fadeInCanvasFromBlack's promise settles — no new logic needed here.
await animationManager.fadeOutCanvasToBlack(nodoEnfocadoAnterior, duration);
graph.graphData({ nodes: subgrafo.nodos, links: subgrafo.vinculos });
await animationManager.fadeInCanvasFromBlack(duration);
```

## State of the Art

| Old Approach (`mundo.js` / `cameraController.aimAtNode`) | New Approach (this phase) | Why Changed |
|---|---|---|
| Panel picks `izq`/`der` based on `node.x < 0` (arbitrary, static) | Camera orbits between 2 candidates scored against graph centroid, panel stays fixed | MOTR-11 — geometry problem, not layout; layout no longer needs to jump |
| Load type traveled as an HTML button attribute, tangled with which Vista was requested | `transicion` is an explicit parameter of `setVista`, orthogonal to the Vista | MOTR-03/04/05/06 — this coupling was itself the bug being fixed |
| `dimensionId` on nodes drove which "network" was loaded | `resolverVista` (pure, already built) computes the Subgrafo from a `Vista` config; the engine never sees `dimensionId` | CLAUDE.md invariant, Phase 2 already delivered `resolverVista` |
| Camera framing = fixed offset from node, no notion of a UI-occluded region | `setViewOffset`-based off-axis framing against a continuously-updated `areaSegura` rect | MOTR-08/10, new requirement — `mundo.js` never had a "safe area" concept, panel used to just overlay in front of centered content |

**Deprecated/superseded:**
- `mundo.js`, `dataLoader.js`, `graphManager.js` (collectiveConscience) — read-only reference only, per
  CONTEXT.md and the invariant "`collectiveConscience` se lee, no se toca."
- `dynamic-import.js` (Pitfall 4) — already dead, superseded by `registerTypes.js`.

## Open Questions

1. **`AreaSegura`'s exact pixel semantics — inset vs. absolute rect**
   - What we know: `src/types/vista.ts` defines `AreaSegura { top, right, bottom, left }` with the comment
     "la zona del viewport que NO está tapada por overlays." CONTEXT.md's "38% derecho" / "62% izquierdo"
     description is consistent with an **inset** interpretation (`left: 0.62 * viewportW` describing how much
     is covered from the left edge), which is what all code in this document assumes
     (`rectCenterX = (areaSegura.left + (viewportW - areaSegura.right)) / 2`).
   - What's unclear: whether the bridge component (Phase 4, but its contract needs to be pinned before Phase 3
     can be tested end-to-end) will actually emit insets-from-edges vs. literal `{x1,y1,x2,y2}` rect
     coordinates. The type name `AreaSegura` with `top/right/bottom/left` naming mirrors CSS `inset`, which
     supports the inset reading, but it's not proven by the type alone.
   - Recommendation: pin this down with a Wave 0 unit test on `applySafeArea`/`ladoDestino` using a literal
     example (e.g. desktop 1440×686 rect from Figma frame `1:12`, panel width 618+96=714px per CONTEXT.md's
     "specifics" — cross-check the resulting `rectCenterX` against the Figma frame's actual safe area before
     writing engine tasks that consume `AreaSegura`).

2. **Fixture shape for developing without the Phase 2 endpoint**
   - What we know: `Subgrafo { nodos: NodoGrafo[], vinculos: VinculoGrafo[] }` is the exact shape
     `resolverVista` produces and the exact shape `SinapsisEngine.setVista()` should accept — no adapter
     needed between a hand-written fixture and the engine's input.
   - What's unclear: whether fixtures should be static `Subgrafo` JSON matching the 14 registered shapes
     (`CrossedLines`, `Fire`, `Image`, ... — see `registerTypes.js`), or generated. No existing dump in the
     repo is in the new `NodoGrafo`/`VinculoGrafo` shape (the old `dimensionId`-based prod dumps referenced
     in git status belong to a different, unrelated repo snapshot, not usable here).
   - Recommendation (Claude's discretion per CONTEXT.md): hand-write a small fixture module (10-20 nodes,
     covering a few of each `shape`, at least one `Image`-shape node, one isolated node, one 2-node
     sub-cluster) — enough to exercise the degenerate cases enumerated in Pattern 3, not exhaustive coverage
     of all 14 shapes.

3. **Whether `nodePositionUpdate`/`linkPositionUpdate` need any change for `filtrado`**
   - What we know: `linkPositionUpdate` (used by `mundo.js` to drive `SinLink` mesh positions from `{start,
     end}`) is unaffected by `fx/fy/fz` pinning — it reads live `x/y/z` each tick regardless of whether those
     are force-simulated or pinned.
   - What's unclear: whether fading a link's opacity during `filtrado` (for links whose node left the Vista)
     needs a distinct code path in `linkThreeObject`'s `SinLink` wrapper, or can piggyback on the same
     mesh-opacity fade used for nodes. Not investigated — small enough to resolve during implementation,
     doesn't change the phase's architecture.

## Sources

### Primary (HIGH confidence — read directly from installed source/types, not training data)

- `node_modules/3d-force-graph/dist/3d-force-graph.d.ts` — full public API surface of `ForceGraph3DInstance`
- `node_modules/three-forcegraph/dist/three-forcegraph.d.ts` — `NodeObject`/`LinkObject` fields (`fx/fy/fz`),
  `ThreeForceGraphGeneric` methods (`graphData`, `d3Force`, `cooldownTicks`, `onEngineStop`, etc.)
- `node_modules/three-forcegraph/dist/three-forcegraph.mjs` — `graphData` `onChange`, force-engine re-init
  block (lines ~440-500, ~1370-1450), confirms unconditional reheat on `graphData()` change
- `node_modules/three-render-objects/dist/three-render-objects.mjs` — `cameraPosition` implementation (tween,
  controls.target sync), `getScreenCoords`/`getSceneCoords`/`intersectingObjects` (picking/projection), the
  `state.tweenGroup.update()` render-loop call
- `node_modules/three/src/cameras/PerspectiveCamera.js` — `setViewOffset`, `updateProjectionMatrix` (exact
  frustum-shift formula used in Pattern 1 and 2)
- `node_modules/three/src/math/ColorManagement.js` — confirms `.enabled` is a live API in three@0.185.1
  (relevant since `threeGlobal.js` sets it)
- `tsconfig.json` — `allowJs`, `include` globs, `paths` aliases (verified, not assumed)
- `package.json` + `npm view <pkg> version` — installed vs. latest npm versions confirmed live
- Direct reads of `src/engine/**` (all files listed in `<files_to_read>`) and `imageThreeObject.js`,
  `registerTypes.js`, `threeGlobal.js`, `dynamic-import.js`, `Utils.js`, `background.js` for landmine analysis
- `collectiveConscience/src/client/graph/mundo.js` (read-only reference) — cross-checked every library call
  against the typed API above

### Secondary / Tertiary

None used — every claim in this document was checked against installed source rather than web search or
training-data recall, given the explicit instruction that a wrong API guess here produces a broken build.

## Corrections to likely training-data assumptions

Flagging these because they contradict what a model might otherwise "recall" about this library ecosystem:

1. **`3d-force-graph`/`three-forcegraph` do NOT do an id-based merge/diff on `graphData()`.** A plausible
   assumption is "the library diffs old vs. new graphData and only animates the delta" (like a virtual-DOM
   reconciler). It does not — `graphData()` replacing the array **always** triggers a full simulation reheat
   (`alpha(1)`) if any of `['graphData', 'nodeId', 'linkSource', 'linkTarget', 'numDimensions', 'forceEngine',
   'dagMode', ...]` changed. Reused node *objects* keep their `x/y/z` as-is (JS reference identity, not a
   library feature), but the simulation still restarts around them. This is exactly why `filtrado` needs
   explicit `fx/fy/fz` pinning — verified in source, not assumed from the "how force-graph libraries usually
   work" prior.
2. **There is no `onCameraMoveEnd`/`onTransitionComplete` callback on `cameraPosition`.** Checked the full
   typed surface — it isn't there. The `setTimeout`-based promise in this document is the actual mechanism,
   not a stand-in for a "real" API that was missed.
3. **`three/addons/*` imports (used by `background.js`, `Utils.js`) look like they'd fail** against a naive
   filesystem check (no physical `node_modules/three/addons/` directory exists) — but `three`'s `package.json`
   `exports` map (`"./addons/*": "./examples/jsm/*"`) resolves them correctly at bundle/runtime. Confirmed by
   checking `package.json` `exports` rather than trusting the filesystem-glob result alone — this is *not* a
   landmine, despite initially looking like one.

## Metadata

**Confidence breakdown:**
- Standard stack (3d-force-graph/three/three-forcegraph API surface): HIGH — read from installed `.d.ts`/source
- Off-axis framing math (`setViewOffset`): HIGH — derived line-by-line from `PerspectiveCamera.js` source
- `filtrado` mechanism (`fx/fy/fz` pinning): HIGH — documented field behavior + verified reheat trigger in source
- Camera-angle-avoids-panel math (Pattern 3): MEDIUM-HIGH — vector math is standard/verifiable by inspection,
  but the exact `AreaSegura` pixel semantics (Open Question 1) affects the `ladoDestino` inputs, not the
  approach itself
- PERF-01 measurement approach: MEDIUM — Chrome DevTools CPU throttling is well-established but wasn't
  independently re-verified against current docs in this pass (no web fetch was needed given local evidence
  answered the higher-priority questions); flagged for confirmation during execution, not blocking for planning
- Landmines (Pitfalls 1-7): HIGH — every one verified by reading the actual file, not inferred

**Research date:** 2026-08-15
**Valid until:** ~30 days (stable, locally-pinned dependency versions; re-verify if `package.json` versions change)

## PERF-01 measurement — recommended approach (Claude's discretion, documented for planner convenience)

- **FPS:** roll your own — a `requestAnimationFrame` delta counter (rolling average over ~1s) is a few lines
  and avoids adding `stats.js` as a new dependency (it's not currently installed; `mundo.js`'s commented-out
  `this.stats.begin()/end()` calls reference a library that isn't in `package.json` — don't reinstate it).
- **Draw calls:** `renderer.info.render.calls` — already logged by `mundo.js`'s `startRendererInfoDebug()`
  (`renderer.info.render.calls/triangles/points/lines`, `renderer.info.memory.geometries/textures`); port that
  pattern as-is.
- **Mid-range device simulation:** Chrome DevTools Performance panel → CPU throttling (4x/6x slowdown) is the
  standard no-dependency approach for CPU; there's no reliable built-in GPU throttle in stock Chrome DevTools,
  so pair the throttled-CPU number with at least one real mid-range device test if the number needs to be
  defensible for a written spec (PERF-01 asks for "a documented number," not just a synthetic one). Not
  independently re-verified against current Chrome docs in this pass — confirm the throttling UI is unchanged
  before writing the measurement task.
- **Two scenarios (per CONTEXT.md):** clean canvas, and canvas with a DOM overlay covering 62% (a plain `<div>`
  with `position: fixed` and a solid background is enough to simulate the panel for this measurement — no
  need to wait for the real Phase 4 panel).
