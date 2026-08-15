# Phase 3: 3D Engine - Context

**Gathered:** 2026-08-15
**Status:** Ready for planning
**Source:** Conversación de arquitectura + revisión de los diseños en Figma (`mYq7GwKitb3S4nvW2ZZCh8`)

<domain>
## Phase Boundary

Esta fase produce `SinapsisEngine`: el motor 3D que renderiza cualquier Vista, transiciona entre
Vistas, encuadra el nodo enfocado y limpia lo que sale de escena. Se desarrolla **contra fixtures**,
no depende de la fase 2 ni del endpoint.

**No** escribe UI, ni rutas, ni el panel, ni el degradado, ni el menú. Todo eso es fase 4. Si un
plan crea un componente React que no sea el archivo puente, es un defecto.

Lo que ya existe y no se reinventa:
- `src/engine/` — los 15 `ThreeObject` con sus shaders, `cameraController`, `animationManager`,
  `constants`, `background`, portados desde `collectiveConscience` donde corren en producción.
- `src/lib/vista/resolverVista.ts` y `adyacencia.ts` — puros, con 18 tests. El motor los consume,
  no los reimplementa.
- `src/types/vista.ts` — el contrato. Se importa, no se redeclara.

Lo que se reemplaza: `mundo.js`, `dataLoader.js` y `graphManager.js` del repo viejo **no se
copiaron a propósito** — cargan el modelo `dimensionId`. `SinapsisEngine` es su reemplazo.
Sirven como referencia de lectura para ver qué hacía cada pieza, nunca como base.
</domain>

<decisions>
## Implementation Decisions

### La superficie pública (MOTR-01, MOTR-02)

Dos métodos. Nada más:

```ts
engine.setVista(subgrafo, { transicion, areaSegura, nodoEnfocado? }): Promise<void>
engine.on(evento, handler): () => void
```

`setVista` devuelve una promesa que resuelve **cuando la animación terminó** (MOTR-09). Eso es lo
que permite que un cambio de ruta secuencie Vista → cámara → overlay en vez de dispararlos juntos.

El motor **no importa React**. React **no importa THREE**. Un solo archivo puente los ve a los dos.
Ya se intentó al revés con `react-force-graph-3d` en la rama `task/Refactor-en-React` y falló.

### Las tres transiciones (MOTR-03/04/05/06)

- `reemplazo` — fundido a negro y zoom. Es el `goInto` de hoy, ya implementado en `AnimationManager`.
- `filtrado` — conserva las instancias y posiciones existentes; desvanece lo que sale de la Vista.
- `aditivo` — suma los nodos nuevos sin tocar los que están.

**Cualquier Vista se alcanza con cualquiera de las tres.** La transición es un parámetro de
`setVista`, no una consecuencia de qué se pidió. Que hoy estén atadas es el bug que esta fase
viene a arreglar: en el prototipo el tipo de carga viajaba como atributo HTML de un botón.

### El área segura es continua, no por ruta (MOTR-08)

`areaSegura` es un rect del viewport que **no está tapado por overlays**. En escritorio es el 38%
derecho —el panel ocupa el 62% izquierdo—; en mobile es la banda superior.

**Llega de forma continua, no una vez al cambiar de ruta.** Al scrollear hacia la ficha larga el
panel crece y el degradado se oscurece, así que el rect cambia cuadro a cuadro. Un motor escrito
asumiendo que se setea al montar la ruta se rompe con el primer scroll.

### Encuadre según `shape`, no según tipo de nodo (MOTR-10)

```
vizParams.shape === 'Image'  →  el nodo entra ENTERO en el área segura
cualquier otra                →  basta con que su centro caiga adentro; el derrame es deseable
```

El porqué: en un nodo `Image` la imagen **es** la obra —NUDO, ESPORA, WIP, C.E.P.A., Distopia— y
recortarla la mutila. Un shader recortado contra el borde del viewport se ve más grande y más
inmersivo; así se ve hoy en el prototipo y queda bien.

Es un booleano derivado de data curada, no un `switch (nodeType)`. La columna `shape` del CSV
guarda la elección visual por nodo: Kutral es `Fire`, Tempistica es `Twist`, SOMA es `Lights`.

### El panel no se mueve; la cámara elige el ángulo (MOTR-11)

En el prototipo el panel saltaba de lado —`cameraController.aimAtNode()` devuelve `izq`/`der`—
para que las aristas del nodo no cruzaran por detrás del texto.

**Eso se reemplaza.** El panel queda fijo y el motor **orbita la cámara** alrededor del nodo
enfocado hasta que sus aristas salgan hacia el lado libre.

Se resuelve del lado correcto: es un problema de geometría 3D, no de maquetación. Y el layout deja
de saltar, lo que además permite alinear el texto a la izquierda.

Implementación mínima: orientar de modo que el **centroide del grafo** quede del lado opuesto al
panel. Los vecinos de un nodo tienden a estar hacia donde está la masa de la red, así que un vector
resuelve el caso común. Marcarlo con un comentario `ponytail:` nombrando el techo — si un nodo muy
conectado sigue tirando aristas sobre el panel, ahí se proyectan los vecinos y se elige el mejor
de N ángulos candidatos.

### Lo que el motor reporta (MOTR-12)

`on('nodeFocus')` devuelve la **posición proyectada en pantalla** del nodo: un punto, no una región
ni un lado. Sirve para anclar un rótulo o tirar un conector desde el panel. La decisión de dónde va
el panel ya no depende de esto.

### La medición (PERF-01)

Un número documentado: cuántos nodos sostiene a 30fps en un dispositivo de gama media, con draw
calls por nodo. **Medido en dos escenarios**: canvas limpio y canvas con un overlay tapando el 62%,
que es el caso común. El canvas nunca se desmonta, así que el loop corre incluso en pantallas que
son casi todo texto.

El resultado es un número escrito, no una optimización. Instancing está diferido hasta tenerlo.

### Claude's Discretion

- Cómo se estructura internamente el motor y qué archivos lo componen
- La forma exacta de los eventos de `on` más allá de `nodeFocus`
- Cómo se arman las fixtures para desarrollar sin la fase 2
- El easing y las duraciones de las transiciones
- Cómo se mide PERF-01 y con qué herramienta
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Reglas del proyecto
- `CLAUDE.md` — la sección "Disciplina" y las invariantes. Las que pesan acá: el motor no importa
  React, el canvas es fondo permanente con una sola instancia, el puente es bidireccional,
  navegar es coreografía y no paralelismo, `viz_params` guarda escalares.

### Contrato y contexto
- `src/types/vista.ts` — `Vista`, `Subgrafo`, `NodoGrafo`, `VizParams`, `AreaSegura`, `Transicion`
- `src/lib/vista/resolverVista.ts` y `adyacencia.ts` — lo que alimenta al motor
- `.planning/PROJECT.md` — Key Decisions con el porqué de cada elección
- `.planning/ROADMAP.md` — criterios de éxito de la fase 3

### Motor existente
- `src/engine/threeObjects/ThreeObjectManager.js` — registro por tipo vía barrel explícito
- `src/engine/threeObjects/ThreeObject.js` — la clase base, con `geometryCache` compartido
- `src/engine/graph/cameraController.js` — `aimAtNode`, `backToBasicsView`, `resize`
- `src/engine/graph/animationManager.js` — fundidos y transiciones actuales
- `src/engine/graph/constants.js` — valores calibrados contra salida visual real, no arbitrarios

### Referencia de lectura, nunca base de código (repo de solo lectura)
- `C:\Users\ramac\source\TropicalPoncho\collectiveConscience\src\client\graph\mundo.js`
- `C:\Users\ramac\source\TropicalPoncho\collectiveConscience\src\client\index.js`
</canonical_refs>

<specifics>
## Specific Ideas

- Los diseños de referencia están en Figma, archivo `mYq7GwKitb3S4nvW2ZZCh8`. El frame
  `1:12` ("Neurona en zoom DER") mide 1440×686 con el bloque de texto en x=96 y 618px de ancho.
- Las 14 formas registradas en el motor: `CrossedLines`, `Fire`, `Image`, `Lights`, `Lines`,
  `Marble`, `Noise`, `Particles`, `Perlin`, `Perlin Noise`, `SimpleText`, `Text`, `Twist`,
  `Wave Line`. `Like Fire` queda fuera a propósito — declara `type` de instancia, no `static type`,
  y su valor colisionaría con `Perlin`.
- `ThreeObject` ya comparte geometrías entre instancias con un `geometryCache` estático. Es la
  base sobre la que instancing va a construir; no romperlo.
- `3d-force-graph` sigue siendo quien hace el layout de fuerzas y el picking. El motor lo envuelve,
  no lo reemplaza.
- `constants.js` trae `aimDistance`, `aimOffsetX/Y/Z`, `linkDistance` — calibración contra salida
  visual real. Si el encuadre nuevo necesita otros valores, se agregan; los viejos no se tocan a
  ciegas.
</specifics>

<deferred>
## Deferred Ideas

- Instancing y LOD — hasta tener el número de PERF-01
- El panel, el degradado, el scroll y el menú — fase 4
- Proyectar cada vecino para elegir el ángulo — arranca con el centroide; se sube si hace falta
- Modos de orden `geo` y `aleatorio` de la Vista — solo `grafo` en esta fase
- Optimizar las imágenes a WebP — cuando exista el pipeline de subida
</deferred>

---

*Phase: 03-3d-engine*
*Context gathered: 2026-08-15*
