---
quick_id: 261124-ryz2
type: quick
status: complete
plan_head_before: e18837e12a1d9d415b7f282a795d3ff6572d8fba
plan_head_after: 04d3fe286d02131651352ccaa7a46b2ed5f1e378
commits: 5   # medido: git rev-list --count plan_head_before..plan_head_after (el commit docs de este SUMMARY va aparte)
actuals:
  tasks: 5     # compilar, estetica/algoritmo, tests del adaptador, D-53 y capturas
  commits: 5
  tokens: 45000
key-files:
  modified:
    - src/lib/crecimiento/dendrita.ts
    - src/lib/crecimiento/estructura.ts
    - src/lib/crecimiento/crecimiento.test.ts
    - src/engine/threeObjects/crecimientoThreeObject.js
    - src/engine/graph/constants.js
    - src/engine/SinapsisEngine.js
    - src/engine/adaptador.js
    - src/engine/adaptador.test.js
    - CLAUDE.md
    - .planning/PROJECT.md
    - .planning/phases/04.1-expandir-nodo-y-secciones-derivadas/04.1-CONTEXT.md
  created:
    - .planning/quick/261124-ryz2-crecimiento-v2/herramientas/preview.mts
    - .planning/quick/261124-ryz2-crecimiento-v2/herramientas/medir-ryz.mjs
---

# Quick 261124-ryz2: el crecimiento ES la neurona, raíces unidas, participantes futuros

Rama `ryz2-cloud` (https://github.com/TropicalPoncho/sinapsis-front), base `e18837e` (wip de gsd/m1-motor-vistas).

## Decisiones que afectan el futuro (D-53, enmienda a D-52) — primero

Registradas en `04.1-CONTEXT.md` (D-53 y nota en D-52), `PROJECT.md` (Key Decisions) y `CLAUDE.md` (invariante). Detalle completo con alternativas y riesgos en D-53; lo esencial:

1. **`dendrita-v2` reemplaza a v1 (nunca publicada) y se congela al publicar.** Test de oro v2 (`abb04c62` grande a 1500 pasos, `80373d20` con raíz tardía, `f3f2beb8` mini). **Riesgo:** con inicio el 2026-11-25, cualquier ajuste estético posterior es `dendrita-v3`; v2 es lo que verán todos.
2. **El azar es un hash sin estado `azar(semilla, canal, k)` (lowbias32), no una PRNG secuencial.** Es lo que permite el invariante crítico: **agregar una raíz tardía no cambia ningún paso anterior a su ingreso, byte a byte** (testeado también generando con tope). El trazo de cada rama (dirección y curvatura) es estado local a la rama, sin estado compartido.
3. **Config `raices: [{ id, desde? }]`**, validada en el borde (las dos primeras son fundadoras y no llevan `desde`; hasta 12). Un participante real será una ENTIDAD (persona) pública vinculada al evento (el Usuario no es un nodo); de dónde sale `desde` (el vínculo, con su fecha) **se decide en la fase de registro**. Hoy solo existe `raices` de la config y una raíz tardía de ejemplo en una fixture de prueba (`build-fixture.mts tardia`), no en datos reales ni en `fichas.json`.
4. **La señal "este nodo se dibuja como crecimiento" sale de los datos** (`nodo.crecimiento`), vía `contextoCrecimiento(Subgrafo, red)` en el adaptador: `completo` si la red es la del propio nodo y están sus dos fundadoras, `mini` en cualquier otro caso. Cero ids o nombres en el motor; sin clave nueva en `viz_params` (el renderer `Crecimiento` es del conjunto cerrado del motor).
5. **Layout: se anclan (`fx/fy/fz`) el núcleo y las dos raíces**, no `link.distance`. Justificación: el link tiene fuerza 1/grado y la repulsión (-600) lo estira, no garantiza "pegado"; anclar es determinista (mismo mecanismo que `pinear`). Con anclas, `forceCenter` arrastraba al resto sobre el núcleo (medido en el WIP: Laboratorios colapsaba), así que en esa red se saca (la gravedad ya centra).
6. **Se quitaron las uniones entre ramas de v1.** Con persistencia de dirección producían escaleras entre ramas paralelas y no están en la referencia del dueño (con radio 0.04 ya no disparaban nunca: código muerto). Cada paso es un segmento de crecimiento. El "reticular" de v1 se pierde: es árbol con trazo sinuoso.

## Qué cambió

| # | Cambio | Commit |
|---|--------|--------|
| 1 | El árbol parte compilando (el wip ya traía el import arreglado: faltaban los hashes del test de oro); herramientas sin rutas absolutas | 409d043 |
| 2 | Trazo de lápiz: sesgo al centro, persistencia + curvatura con inercia, paso 0.018, 12000 atractores, 70 sobre el eje (axones), sin uniones; `opacidades()` (alfa RGBA por vértice según subárbol); encuadre y raycast medidos; tests nuevos | 519a13f |
| 3 | Tests de `contextoCrecimiento` / adaptador (completo, mini, sin config, sin fundadoras) | 46f1aec |
| 4 | D-53, D-52 enmendada, `PROJECT.md`, `CLAUDE.md`; `escalaMini` 40; `ponytail:` del tope de un nodo por escena | 9b7f537 |
| 5 | Capturas, mediciones y herramientas (`capturar`, `verificar`, `medir-ryz`, `preview`) | 04d3fe2 |

Lo que ya traía el wip y se conservó (revisado y verificado): modos `completo`/`mini` en `crecimientoThreeObject.js` con esfera invisible `BackSide`, `contextoCrecimiento`, anclaje en `SinapsisEngine._anclarCrecimiento`, `escalaRaices` (0.5) con cambio de `Image` a `Perlin`, `radioEncuadre` en el controlador de cámara, `raices` con `desde`, perfil `mini`.

## Los 5 puntos del plan

1. **Sin esfera del evento en su red:** hecho. El nodo se dibuja solo con la estructura. Seleccionable: clic sobre la estructura abre Ryzomatica (`/obra/ryzomatica`), clic sobre una raíz abre esa raíz (hover/clic reales con Playwright). Costo: 1 llamada de dibujo (10 contra 9 con la estructura oculta).
2. **Desde afuera:** hecho (perfil `mini`, 401 segmentos, esfera irregular de 5 lóbulos que sale de la semilla, `pasosMini = 400 * pasos / n`, prefijo exacto). Seleccionable (hover y clic verificados en la red de Laboratorios). Un `LineSegments` por nodo, **tope de uno por escena** con `ponytail:` (salida: Set de ids + geometría compartida o instancing).
3. **Raíces pequeñas y orgánicas:** `escalaRaices` 0.5 (perilla `?escalaraiz=`), solo en la red del evento; el logo de Tropical pasa a `Perlin`. En las demás redes sigue como hoy (cubierto por test del adaptador).
4. **Nacen unidas:** fundadoras a ±0.14 del núcleo con segmento de unión en el paso 0; en el mundo a ±12.6, radios 7.5. **Espaciado (métrica de 261029-hdu):** raíz-raíz 1.68 (distancia 25.2), raíz-Laboratorios 5.6-5.9, 0 solapados (`capturas/medida-espaciado.jsonl`). Nota: Laboratorios queda a ~130 del núcleo, dentro del radio de la estructura (~100) pero hacia abajo, sin tocarla.
5. **Participantes futuros:** costura lista y testeada (a)-(e): (a) prefijo exacto con y sin raíz tardía hasta el paso previo al ingreso, (b) la raíz tardía crece desde su ingreso con >20 descendientes, (c) determinismo, (d) test de oro v2, (e) sin `Math.random`/trig/`exp`/`pow`/`log`/`hypot` en el texto del módulo. **No hecho:** ejes (axones) propios de las raíces tardías (solo las fundadoras tienen la fila de atractores); registro/formulario.

## Referencia visual (dibujo a lápiz): qué quedó parecido y qué no

Capturas: `capturas/` (desktop 1280 y mobile 390: red de Ryzomatica día 0, 50 %, 100 %, y con foco; Laboratorios y Bosque Gracias desde afuera día 0 y 100; raíz tardía de ejemplo; `preview-forma-*.png` es un render 2D de la forma, no del motor).

- **Parecido:** núcleo denso y brillante alrededor de las raíces con muchos hilos finos que se afinan hacia la punta (alfa RGBA, tronco pleno, hoja 0.1; una sola llamada de dibujo, sin shader); trazo sinuoso sin zigzag (test: coseno medio entre tramos consecutivos entre 0.6 y 0.995, <10 % rectos); muchos hilos cortos.
- **No parecido:** es claro sobre oscuro con degradé amarillo-rosa (la referencia es lápiz sobre papel); los axones largos entre somas son débiles: la fila de atractores sobre el eje produce un par de ramas largas hacia los extremos pero se confunden con las dendritas, y la unión entre las dos raíces es una barra recta corta (es el puente pedido en el punto 4); hay una sola pareja de núcleos, así que "axón de un soma a otro" no tiene un segundo soma lejano salvo que existan raíces tardías; las puntas con DPR 1 y líneas de 1 px se leen tenues en pantallas chicas.

## Mediciones

| Medida | Resultado |
|---|---|
| Generación (grande, n=5000) | escritorio **167-250 ms** (node 200-210 ms), mobile 390 con CPU normal 165-208 ms, **CPU 4x 1469 ms** (estimación, no un celular; con la máquina cargada). Mini ~15-25 ms |
| Segmentos | grande 5001 (natural ~5230 con n=6000); mini 401; con raíz tardía 5002 |
| Llamadas de dibujo | Ryzomatica 10 con la estructura vs 9 sin ella (+1); Laboratorios 3 vs 2; Bosque Gracias 5 vs 4 |
| Pasos | `?t=2026-11-30` 2500, `?dia=7.5` 4218.75, slider 75 % 4218.75, 100 % 5000; reloj del servidor con cliente +6 días: offset -518400665 ms y pasos del servidor (no del cliente) |
| Vida | completo en su red, mini en Laboratorios (paso 200 de 400 a mitad), nada en Tropical, completo de nuevo con el mismo paso |
| Contexto WebGL | `isContextLost()` false en las 17 cargas; 0 `pageerror` ni errores de consola |
| fps | **no concluyente**: la máquina estaba cargada (15 fps en la red de Ryzomatica con y sin la estructura visible, 60 fps en otras escenas; en una pasada anterior 44-59). La diferencia con/sin estructura es nula en la misma sesión |

## Deviations from Plan

**1. [Rule 3 - Blocking] El estado del árbol no era el descrito.** El plan decía cambios sin commitear y build roto; HEAD (`e18837e`, el wip) ya traía todo commiteado y compilando (`tsc` limpio); lo único roto era el test de oro con hashes de relleno. Se fijó el golden y se siguió.
**2. [Rule 1 - Bug] Herramientas con rutas absolutas del dueño** (`build-fixture.mts`, `sync.sh`): ahora relativas al repo (`ISO=<dir>` para la copia aislada). `capturar.mjs`/`verificar.mjs` usaban `_crec.obj` del motor v1: reescritas para `_instCrec()`.
**3. Verificación de clic:** el hover del raycaster va con throttle; un clic sin mover antes no entra. La herramienta mueve antes de tocar (no es un bug del producto).
**4. Escena "Tropical desde afuera" reemplazada por Bosque Gracias:** la red por defecto de Tropical lista sus áreas y no trae a Ryzomatica (ni con `?prof=2`, tope de 40 nodos). La miniatura se ve en Laboratorios y Bosque Gracias.
**5. Uniones entre ramas eliminadas** (ver decisión 6): no estaba en el plan; es una consecuencia de la referencia.
**6. `n` queda en 5000** (config sin cambios en `fichas.json`): el algoritmo da ~5230 naturales; con 5000 faltan solo las últimas puntas.

## Verificación

- `npm test`: **281 de 281** (antes 276 del wip: +1 trazo de lápiz, +4 adaptador; las cifras de neuronas del home no cambian: no se tocaron datos).
- `npx tsc --noEmit`: limpio. `next lint`: sin errores ni advertencias en los archivos tocados (las de siempre en `src/engine/threeObjects/*`).
- Chromium headless con GPU real (Windows, ANGLE/d3d11): capturas, hover, clic, reloj, slider, vida de la estructura, espaciado.
- **No verificado:** un celular real (solo emulación táctil 390x844 y CPU 4x); fps fiable (máquina cargada); `next build`; Neon, `/api/topologia` con la base real y la migración 003 (no se tocó ninguna base, ni se leyó ningún `.env*`; todo con `TOPOLOGIA_FIXTURE=1` y una fixture armada de `data/curaduria/*.csv`); la raíz tardía solo en fixture; comparación visual contra la imagen de referencia original del dueño (no estaba en el repo; se aplicó la descripción del plan).
- Los fixes G-06 no se tocaron. Las perillas `?t=`/`?dia=` siguen siendo solo de desarrollo.

## Known Stubs

Ninguno. Salida pendiente declarada: el nodo de una raíz tardía existe desde que existe su vínculo y aparece antes de que crezca su rama (D-53, riesgo 3).

## Threat Flags

Ninguno nuevo: la config sigue validándose en el borde (`validarCrecimiento`, ahora con `raices: [{id, desde?}]`, ids `[\w-]{1,64}`, ISO estricto, tope 12 raíces y 6000 segmentos).

## Self-Check: PASSED

- Archivos: `herramientas/preview.mts`, `medir-ryz.mjs`, 25 archivos en `capturas/`, `04.1-CONTEXT.md` con D-53.
- Commits en `origin/ryz2-cloud`: 409d043, 519a13f, 46f1aec, 9b7f537, 04d3fe2.
