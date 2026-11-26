---
phase: quick-261126-owv
plan: 01
quick_id: 261126-owv
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/crecimiento/dendrita.ts
  - src/lib/crecimiento/estructura.ts
  - src/lib/crecimiento/crecimiento.test.ts
  - src/engine/adaptador.js
  - src/engine/adaptador.test.js
  - src/engine/threeObjects/crecimientoThreeObject.js
  - src/engine/graph/constants.js
  - .planning/phases/04.1-expandir-nodo-y-secciones-derivadas/04.1-CONTEXT.md
  - .planning/PROJECT.md
  - .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/herramientas/capturar.mjs
  - .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/herramientas/medir.mts
autonomous: true
requirements:
  - TODO-2026-11-26-ryzomatica-neurona-duplicada
  - TODO-2026-11-26-ryzomatica-crecimiento-con-caminos

estimate:
  tokens: 80000
  raw_tokens: 80000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "En /obra/ryzomatica al día 0 la estructura no dibuja ningún segmento: no hay línea recta entre las raíces (ni en la grande ni en la mini, ni para raíces tardías); las fundadoras quedan unidas solo por crecimiento orgánico"
    - "En la red de Ryzomatica, Tropical Poncho y Bosque Gracias conservan su forma curada (Tropical = su logo Image), solo más chicas (escalaRaices)"
    - "Desde afuera (Laboratorios, Bosque Gracias) Ryzomatica se ve como UN crecimiento de un solo soma centrado en el nodo, de radio comparable a un nodo común (~15 unidades de mundo), seleccionable, y visible también al día 0"
    - "El crecimiento elige caminos: pocas ramas dominantes y laterales cortas (n=5000: profundidad máxima >= 80, top-10 ramas >= 13 % de los segmentos; n=3000: radio >= 0.8). La v2 anterior medía 50 / 9.6 % / 0.667"
    - "Más grueso cerca del centro: copias desplazadas de los tramos cercanos al núcleo dentro del MISMO LineSegments; la estructura sigue costando 1 llamada de dibujo"
    - "D-52/D-53 se mantienen: determinismo, prefijo exacto, una raíz tardía no cambia ningún paso anterior a su ingreso, sin Math.random ni trigonometría en la decisión; el test de oro se regenera sobre dendrita-v2 (editada porque nunca se publicó)"
    - "Generar la estructura grande (n=5000) no es más lento que con la v2 anterior, medido tibio en la misma sesión"
  artifacts:
    - path: "src/lib/crecimiento/dendrita.ts"
      provides: "dendrita-v2 editada: sin puentes, vigor/crédito con soma, atracción incremental, mini de un soma"
    - path: "src/lib/crecimiento/estructura.ts"
      provides: "estructuraDe con mini de una raíz, PISO_MINI, pasosMini(), grosores()"
    - path: "src/lib/crecimiento/crecimiento.test.ts"
      provides: "tests de caminos dominantes, mini de un soma, pasosMini, grosores, invariantes D-52/D-53 y test de oro regenerado"
    - path: "src/engine/threeObjects/crecimientoThreeObject.js"
      provides: "geometría con copias de grosor intercaladas, drawRange por prefijo, piso del mini, blanco de raycast medido"
    - path: ".planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/herramientas/capturar.mjs"
      provides: "capturas y chequeos automáticos contra localhost:3002"
    - path: ".planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/herramientas/medir.mts"
      provides: "tiempo de generación tibio y métricas de dominancia, antes y después"
  key_links:
    - from: "src/lib/crecimiento/estructura.ts"
      to: "src/lib/crecimiento/dendrita.ts"
      via: "estructuraDe(c, 'mini') llama a generar(semilla, PASOS_MINI, 'mini', [0])"
      pattern: "'mini'"
    - from: "src/engine/threeObjects/crecimientoThreeObject.js"
      to: "src/lib/crecimiento/estructura.ts"
      via: "grosores() arma las copias; pasosMini() decide cuánto se revela el mini"
      pattern: "grosores|pasosMini"
    - from: "src/engine/adaptador.js"
      to: "src/engine/SinapsisEngine.js"
      via: "las raíces conservan node.type curado y solo llevan escalaCrecimiento (el motor escala el mesh)"
      pattern: "escalaCrecimiento"
---

<objective>
Ajustar Ryzomatica (dendrita-v2) antes de publicarla, con las palabras del dueño en el UAT de cierre del 2026-11-26
(`.planning/todos/pending/2026-11-26-ryzomatica-neurona-duplicada.md` y `...-crecimiento-con-caminos.md`):
1. El nodo visto desde afuera es UN crecimiento chico, centrado, del tamaño de un nodo común (no dos copitos unidos por una barra).
2. Tropical y Bosque Gracias conservan su forma de siempre en la red de Ryzomatica (se revierte el reemplazo a Perlin de D-53 punto 3).
3. Ninguna línea recta entre raíces: las raíces quedan unidas solo por crecimiento.
4. El crecimiento elige caminos (ramas dominantes, laterales atrofiadas) y es más grueso cerca del centro.
5. Todo dentro de D-52/D-53: determinismo, `azar(semilla, canal, k)`, prefijo exacto, raíz tardía no cambia el pasado.

Ryzomatica NO está en Neon (producción sirve 193 nodos, sin ella): dendrita-v2 no se publicó, así que se edita v2 y se regenera el test
de oro. NO se crea dendrita-v3, `inicio` sigue 2026-11-25. Desde que se importe a Neon, cualquier cambio es v3 (D-52).

La "neurona duplicada" no se reprodujo (la neurona común de abajo en la red de Ryzomatica es Laboratorios): no se arregla nada; el
SUMMARY deja capturas, la lista de nodos de la escena y la pregunta para el dueño.

Fuera de alcance: merge a main, push, import a Neon, mover los todos (los cierra el dueño tras ver las capturas), ADRs en Notion.

Output: código y tests ajustados, herramientas de medición/captura en la carpeta del quick, capturas desktop 1280 y mobile 390, D-53
enmendada, auditoría ponytail del diff, SUMMARY con las decisiones arriba.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.planning/quick/261124-ryz2-crecimiento-v2/261124-ryz2-PLAN.md
@.planning/quick/261124-ryz2-crecimiento-v2/261124-ryz2-SUMMARY.md
@.planning/todos/pending/2026-11-26-ryzomatica-neurona-duplicada.md
@.planning/todos/pending/2026-11-26-ryzomatica-crecimiento-con-caminos.md
@src/lib/crecimiento/dendrita.ts
@src/lib/crecimiento/estructura.ts
@src/lib/crecimiento/crecimiento.test.ts
@src/engine/threeObjects/crecimientoThreeObject.js
@src/engine/adaptador.js

Reglas fijas de este quick (valen para las tres tareas):
- QD = `.planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub` (todas las rutas son relativas a la raíz del repo).
- NUNCA leer `.env*` ni tocar Neon. El servidor de pruebas es `next start` en 3002 contra la base local (docker); `.env.local` apunta a
  ella (el `.env.production.local` de Neon se renombró a `.env.neon` el 2026-11-26 y Next no lo carga).
- Control de base antes de cualquier captura: `/api/topologia` devuelve 195 nodos y uno de ellos trae `crecimiento` (Ryzomatica). Si da
  193 o ningún nodo trae `crecimiento`, el servidor está leyendo Neon: PARAR, no capturar, reportar.
- Ciclo del servidor (Windows; `next build` no puede pisar el `.next` que está sirviendo un `next start`): (1) cortar lo que escucha en
  3002 con PowerShell entre comillas simples para que bash no expanda `$_`:
  `powershell -NoProfile -Command 'Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }'`;
  (2) `npx next build`; (3) `npx next start -p 3002 -H 0.0.0.0` en background; (4) esperar a que `/api/topologia` responda y correr el
  control de base.
- Playwright está en `C:/Users/ramac/.claude/skills/gstack/node_modules/` (se carga con `createRequire`, como en las herramientas de ryz2).
- Commits atómicos en la rama `ryz2-cloud`, con `git add` de rutas explícitas (NUNCA `git add -A` ni `git add .`: hay sin trackear
  `.claude/`, `.gsd/`, `design/`, `.planning/milestone.lock`, `.planning/state.json` que no son de este quick). Trailer de cada commit:
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Sin push, sin merge.

Mediciones del planner (spike descartable sobre una copia de dendrita.ts, 2026-11-26, misma máquina; el executor las vuelve a medir):
- v2 actual, grande n=5000: generación tibia 345 ms, profundidad máxima 50, top-10 ramas 9.6 % de los segmentos, mediana de ramas 3,
  radio máximo 0.972; a n=3000 radio 0.667. Mini actual: 2 raíces a +-0.12 con el puente (la "H").
- Con vigor/crédito + soma sin atrofia + atracción incremental (lo que pide la Tarea 2): tibia 173-200 ms (la atracción incremental la
  hace ~5x más barata y compensa las rondas extra del vigor), profundidad 91, top-10 14.4 %, mediana 3, radio 1.144 a n=5000 y 0.908 a
  n=3000; núcleo denso, sinuoso y alfa siguen pasando; prefijo exacto, raíz tardía (ingreso 600: 97 descendientes, primer segmento en el
  paso 601) y prefijo del mini se mantienen byte a byte. Mini de una raíz: 4 dendritas primarias, r95 0.67-0.74, rmax 0.78-0.90 según
  semilla, llega a 400 pasos. Grosor con (0.3, 0.55) en la grande duplicaba demasiado (8522 pares para 5000 segmentos): arrancar más
  ajustado.
- Contra la suite actual, ese spike solo rompe las aserciones del puente (tests "forma", "raíz tardía (a)", "(b)", "una entrada que el
  tope no alcanza") y el test de oro: todo lo demás queda verde.
</context>

<tasks>

<task type="tracer">
  <name>Tarea 1 (tracer): sin segmento recto entre raíces y Tropical con su forma, visto de punta a punta en el navegador</name>
  <files>src/lib/crecimiento/dendrita.ts, src/lib/crecimiento/crecimiento.test.ts, src/engine/adaptador.js, src/engine/adaptador.test.js, .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/herramientas/capturar.mjs, .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/herramientas/medir.mts</files>
  <read_first>src/lib/crecimiento/dendrita.ts, src/lib/crecimiento/crecimiento.test.ts, src/engine/adaptador.js, src/engine/adaptador.test.js, .planning/quick/261124-ryz2-crecimiento-v2/herramientas/capturar.mjs, src/engine/SinapsisEngine.js (líneas 250-330: _perf, _instCrec, _anclarCrecimiento)</read_first>
  <precondition>La base Postgres local (docker) está levantada: tras arrancar 3002, `/api/topologia` devuelve 195 nodos con Ryzomatica (`crecimiento`).</precondition>
  <action>
Objetivo: el camino más fino que toca algoritmo, adaptador, motor y navegador, para probar el circuito build + 3002 + capturas antes de
la tarea pesada. Cubre los pedidos 2 y 3 del dueño (D-53 puntos 3 y 4 enmendados).

0. Registrar `git rev-parse HEAD` como `plan_head_before` (va al SUMMARY).

1. Herramienta de medición `QD/herramientas/medir.mts` (se corre con `node --experimental-strip-types`): importa `generar` de
`../../../../src/lib/crecimiento/dendrita.ts` y `estructuraDe` de `.../estructura.ts` (misma profundidad que el `preview.mts` de ryz2);
config literal igual a la de `data/curaduria/fichas.json` para Ryzomatica (semilla 20261205, dendrita-v2, inicio 2026-11-25T00:00:00-03:00,
fin 2026-12-05T00:00:00-03:00, n 5000, dos raíces). Imprime UN JSON: `grande` = { ms (una corrida de calentamiento y la mediana de 3 de
`generar(20261205, 5000)`), pasos, segmentos, profMax, top10frac, medianaRamas, rmax }, `grande3000` = { rmax }, `mini` (de
`estructuraDe(config, 'mini')`) = { pasos, raices (vértices con padre -1), hijosRaiz (hijos del vértice 0), r95, rmax }. Definiciones:
una "rama" empieza en una raíz o en un vértice que no es el primer hijo (el de menor índice) de su padre y sigue por primeros hijos; su
largo es la cantidad de segmentos (contando el que la une al padre). profMax = máximo de segmentos de un vértice a su raíz. top10frac =
suma de las 10 ramas más largas / segmentos. rmax y r95 = distancia al origen (máximo y percentil 95) de los vértices. Es una herramienta,
no el módulo: puede usar Math.hypot. Correrla ANTES de tocar nada y guardar la salida en `QD/capturas/medicion-base.json`.

2. `dendrita.ts`, sin puentes (decisión de este quick: ningún segmento recto entre raíces, ni las fundadoras ni las tardías). En
`entrar(i)` borrar la búsqueda del vértice más cercano y el segmento que se agregaba con el paso actual: la raíz entra como vértice suelto
en su punto (padre -1), con su nube si no es fundadora, y se une a la estructura solo por crecimiento. Actualizar los comentarios que
hablan del puente o de la "unión en el paso 0" (cabecera del archivo, el tipo `Estructura`: `paso[s]` ya no tiene ceros y
`a.length === pasos`, y la nota de "prefijo exacto" sobre el puente que no cuenta como paso). La cabecera dice que v2 se editó el
2026-11-26 antes de publicarse (Ryzomatica no estaba en Neon) y que desde el import un cambio es dendrita-v3. Mantener VERSION
`dendrita-v2`.

3. `adaptador.js`: quitar la constante de forma orgánica de reemplazo, su comentario y la rama `else if` que cambiaba un `Image` raíz por
otra forma. Las raíces conservan su `type` curado y solo llevan `escalaCrecimiento`. Actualizar el comentario de `contextoCrecimiento` si
menciona raíces "orgánicas".

4. Tests:
   - `adaptador.test.js`, test "en la red del propio nodo": r1 (shape Image) queda `type` 'Image', `esImagen` true y
     `escalaCrecimiento` 0.5; el título dice que las raíces van chicas con su forma de siempre.
   - `crecimiento.test.ts`: "forma" (sin puente: `segmentosHasta(e, 0) === 0`, `paso` empieza [1, 2, 3, 4], `a.length === pasos`, bosque
     de dos árboles: `a.length === vértices - 2`; las fundadoras siguen en float32 de +-0.14 y con padre -1; el título deja de decir
     "unidas"); "raíz tardía (a)" (en el paso de ingreso hay los mismos segmentos y un vértice más); "raíz tardía (b)" (sin aserciones de
     puente: su posición es `posRaices`, padre -1, su primer segmento es de su propio vértice en el paso INGRESO + 1, más de 20
     descendientes, no existe antes de entrar; título "crece desde su ingreso, de su propio punto, sin segmento recto"); "una entrada que el
     tope no alcanza" (`temprana.vertices[0] === 3` y `segmentosHasta(temprana, 0) === 0`); test de oro: regenerar los tres hashes con lo
     que dé la corrida y dejar el comentario "v2 editada el 2026-11-26 antes de publicarse; desde el import a Neon, un cambio es v3".

5. Herramienta de capturas `QD/herramientas/capturar.mjs`, adaptada de `.planning/quick/261124-ryz2-crecimiento-v2/herramientas/capturar.mjs`
(misma forma de uso `node capturar.mjs dirCapturas salida.jsonl [filtro]`, mismo `waitForFunction` + 5 s, mismas medidas de draw calls
con y sin las líneas). Cambios: base `http://localhost:3002`; sin SUFIJO (`perf=1` va en cada ruta); escenas (nombre, ruta):
`ryz-dia0` /obra/ryzomatica?dia=0&perf=1, `ryz-dia1` /obra/ryzomatica?dia=1&perf=1, `ryz-50` /obra/ryzomatica?dia=5&perf=1,
`ryz-100` /obra/ryzomatica?dia=10&perf=1, `ryz-red-100` /?red=ryzomatica&dia=10&perf=1 (sin panel),
`lab-dia0` /entidad/laboratorios?red=laboratorios&dia=0&perf=1, `lab-hoy` /entidad/laboratorios?red=laboratorios&perf=1,
`lab-100` /entidad/laboratorios?red=laboratorios&dia=10&perf=1, `bosque-hoy` /entidad/bosque-gracias?perf=1; el bloque CPU 4x usa
/obra/ryzomatica?dia=10&perf=1 en mobile. Por escena registra además: `modo` (`_modoCrec`), `pasosRevelados` (`_instCrec()?.pasos`),
`segmentos` (`inst.total`), `paresDibujados` (`drawRange.count / 2`), `paresGeometria` (`attributes.position.count / 2`),
`crecimientoMs`, `crecimientos` (nodos de `graphData()` con `crecimiento`), `raices` (por cada nodo con `escalaCrecimiento`: id, name,
type, la shape curada de `_subgrafo.nodos` y la escala) y `nombres` (pares [name, type] de toda la escena, para la pregunta de la neurona
duplicada). Chequeos que suman a una lista `fallas`: exactamente 1 nodo con `crecimiento` por escena; `ryz-*` en modo 'completo' y
`lab-*`/`bosque-*` en 'mini'; cada raíz con `type` igual a su shape curada; `ryz-dia0` con `paresDibujados === 0`; `lab-dia0` con
`pasosRevelados >= 100` (el piso del mini de la Tarea 2; hasta entonces ese chequeo puede fallar y no se corre); draw calls con y sin la
estructura difieren en exactamente 1 cuando `paresDibujados > 0` y en a lo sumo 1 cuando es 0 (three puede saltear un drawRange vacío);
`paresGeometria <= 1.5 * segmentos` (techo de las copias de grosor de la Tarea 2); contexto WebGL no perdido; cualquier `pageerror`. Al final escribe el jsonl, imprime `fallas` y
sale con código 1 si hay alguna.

6. Build y servidor con el ciclo de las reglas fijas; control de base (195 + Ryzomatica con `crecimiento`); correr `capturar.mjs` con el
filtro `ryz-dia0`; mirar las dos capturas (Read de los PNG): la red de Ryzomatica al día 0 sin barra entre las raíces y Tropical con su
logo. Si el logo a escala 0.5 tapa el centro de la estructura, anotarlo para el SUMMARY (no se cambia el ancla ni `raiz` acá).

7. Commits: (a) `fix(crecimiento): sin segmento recto entre raíces y raíces con su forma de siempre (quick 261126-owv)` con dendrita.ts,
crecimiento.test.ts, adaptador.js, adaptador.test.js; (b) `docs(quick-261126-owv): herramientas de medición y capturas, captura del
tracer` con las dos herramientas, `medicion-base.json`, `tracer.jsonl` y las capturas.
  </action>
  <verify>
    <automated>npm test && npx tsc --noEmit && node .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/herramientas/capturar.mjs .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/capturas .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/capturas/tracer.jsonl ryz-dia0</automated>
  </verify>
  <done>Tests y tsc verdes con el test de oro regenerado; 3002 sirve la base local (195 nodos, Ryzomatica con crecimiento); en ryz-dia0 (desktop y mobile) la estructura dibuja 0 pares y Tropical tiene type Image; `medicion-base.json` guardado; dos commits.</done>
</task>

<task type="auto" tdd="true">
  <name>Tarea 2: caminos dominantes, mini de un soma del tamaño de un nodo y grosor cerca del centro</name>
  <files>src/lib/crecimiento/dendrita.ts, src/lib/crecimiento/estructura.ts, src/lib/crecimiento/crecimiento.test.ts, src/engine/threeObjects/crecimientoThreeObject.js, src/engine/graph/constants.js</files>
  <read_first>src/lib/crecimiento/dendrita.ts (ya sin puentes), src/lib/crecimiento/estructura.ts, src/lib/crecimiento/crecimiento.test.ts, src/engine/threeObjects/crecimientoThreeObject.js, src/engine/graph/constants.js (CRECIMIENTO_SETTINGS), QD/capturas/medicion-base.json</read_first>
  <reversibility rating="reversible">dendrita-v2 no está publicada (Ryzomatica no está en Neon): editarla es reversible hasta el import; desde el import cualquier cambio es dendrita-v3 (D-52).</reversibility>
  <behavior>
    - Caminos dominantes (grande, semilla 20261205): n=5000 profundidad máxima >= 80, top-10 ramas >= 0.13 de los segmentos, mediana de ramas <= 4; n=3000 radio máximo >= 0.8. Falla hoy (50 / 0.096 / 3 / 0.667).
    - Mini de un soma (`estructuraDe(config, 'mini')`): `pasos === PASOS_MINI`; un solo vértice con padre -1, el 0, en el origen (comparar con `===`: -0 y +0 son iguales; deepStrictEqual los distingue); entre 3 y 8 hijos del vértice 0; extensión por eje entre 0.6 y 2; otra semilla da otro hash y otra caja; r95 entre 0.5 y 1.
    - `pasosMini(pasos, n)`: `pasosMini(0, n) === PISO_MINI`, `pasosMini(n / 2, n) === PASOS_MINI / 2`, `pasosMini(n, n) === PASOS_MINI`, monótona y nunca mayor que PASOS_MINI.
    - `grosores(e, cerca, medio)`: largo = segmentos; 2 si el vértice `a` del segmento está a menos de `cerca` del origen, 1 si a menos de `medio`, 0 si no; en la grande n=5000 con (0.2, 0.4) hay segmentos de las tres clases.
    - Siguen verdes sin cambiar su intención: prefijo exacto (grande y mini, ahora con entradas [0] en la mini), raíz tardía (a)/(b), determinismo, trazo de lápiz (núcleo denso, sinuoso, alfa), tope de segmentos, caché, determinismo entre navegadores (sin Math.random, trig, exp, pow, hypot ni `**` en dendrita.ts, prng.ts, tiempo.ts y estructura.ts).
  </behavior>
  <action>
Pedidos 1 y 4 del dueño, dentro de D-52/D-53 (todo sale de `azar(semilla, canal, k)` y de `+ - * /`, `Math.sqrt`, comparaciones y
enteros).

RED. En `crecimiento.test.ts` agregar los tests de `<behavior>` (caminos dominantes con un helper de ramas como el de `medir.mts`; mini de
un soma, que reemplaza al test "mini: misma familia en esfera irregular"; `pasosMini`; `grosores`) y pasar entradas [0] a las llamadas
`generar(..., 'mini')` de los tests de determinismo y prefijo. Correr `npm test` y confirmar que fallan (dominancia por umbrales;
`pasosMini`/`grosores` por no existir). Commit `test(crecimiento): caminos dominantes, mini de un soma, piso del mini y grosor (rojo)`.

GREEN, `dendrita.ts`:
a) Atracción incremental (equivalente a la búsqueda por ronda, ~5x más barata; sin ella el vigor duplica el tiempo de generación). La
grilla `celdas` pasa a guardar ATRACTORES en vez de nodos: los M comunes se insertan al inicio; la nube de una raíz tardía, al entrar.
Por atractor: `cerca` (Int32Array, -1) = nodo elegible más cercano dentro de `influencia`, `dc` (Float64Array, inicial influencia al
cuadrado) su distancia al cuadrado, `muerto` (Uint8Array). Al crear un vértice (en `nuevoVertice`, en lugar de insertarlo en la grilla)
se recorren los atractores de las 27 celdas vecinas: se saltean los muertos y los que tienen dueño distinto del dueño del vértice; si la
distancia al cuadrado mejora `dc`, se actualizan `cerca` y `dc`. La nube de una raíz tardía, además de insertarse, toma como `cerca`
inicial a la raíz recién creada si queda dentro de `influencia` (es el único nodo elegible para esos atractores). `atraer(desde)` queda
como un recorrido de `vivos` desde `desde`, sin grilla: si `cerca >= 0` y `dc < muerte^2` el atractor muere y sale de `vivos`; si no,
sigue vivo y, si tiene `cerca`, suma su dirección normalizada (dividiendo por `Math.sqrt(dc)`) en sumX/Y/Z del nodo y cuenta uno.
b) Vigor con crédito (las ramas dominantes acaparan el avance, las laterales se atrofian). Arreglos `vigor` y `credito` (Float64Array):
un vértice nuevo hereda el vigor de su padre (las raíces nacen con 1) y crédito 0. En `crecer(j)`, después de crear el hijo, si j NO es
raíz su vigor pasa a `max(VIGOR_MIN, vigor[j] * (ATROFIA_BASE + ATROFIA_AZAR * azar(semilla, C_VIGOR, k)))`, con k = el paso que se está
creando (nPaso antes de incrementarlo) y un canal nuevo `C_VIGOR = 10`. Las raíces no se atrofian: son el soma y cada hijo suyo es una
dendrita primaria plena. En la ronda, cada j con `cuenta[j] > 0` marca que hubo atraídos, suma `vigor[j]` a su crédito y, si el crédito
llega a 1 y `crecer(j)` crea el segmento, descuenta 1. Una raíz tardía que entra pasa por el mismo umbral (con vigor 1 crece en ese mismo
paso, como hoy). Terminación: una ronda sin crecimiento pero con atraídos no es "estructura agotada" (el crédito se acumula), salvo que se
repita `ceil(1 / VIGOR_MIN) + 1` rondas seguidas; superado eso, o sin atraídos, se sigue por la rama de hoy (entran las raíces que faltan
o termina). Valores de arranque (spike): ATROFIA_BASE 0.15, ATROFIA_AZAR 0.5, VIGOR_MIN 0.05, como constantes del módulo.
c) Perfil `mini` de un solo soma: sin lóbulos (borrar el campo `lobulos` de `Perfil`, el arreglo de lóbulos, los canales C_LOBULO_* y la
rama que ubicaba atractores en lóbulos), `radios` [1, 1, 1] y `raiz` 0; el resto del perfil igual. Con entradas [0] queda una sola raíz en
el origen.
d) Reescribir la cabecera: qué es v2 hoy (sin puentes, vigor con soma, atracción incremental, mini de un soma) y por qué se editó v2 y no
se creó v3 (nunca se publicó).

GREEN, `estructura.ts`: `estructuraDe(c, 'mini')` pasa entradas [0] (comentario: la mini es un soma, sin raíces tardías). Exportar
`PISO_MINI = 100` y `pasosMini(pasos, n)` = mínimo entre PASOS_MINI y el máximo entre PISO_MINI y `PASOS_MINI * pasos / n`, con un
`ponytail:` que diga el techo y la salida: es un piso de dibujo para que el nodo visto desde afuera nunca se vea más chico que un cuarto de
su forma (sin él, al día 0 no hay nada y hoy, día 1, serían 11 segmentos); muestra un cuarto aun antes del inicio; si el dueño quiere que
no se vea antes del inicio, el piso pasa a 0. Exportar `grosores(e, cerca, medio)` → Uint8Array por segmento según la distancia al
cuadrado al origen del vértice `a` (sin raíz ni hypot), documentada como "solo dibujo, no decide la forma" (como `opacidades`).

Afinar con `QD/herramientas/medir.mts` y la vista previa de ryz2
(`node --experimental-strip-types .planning/quick/261124-ryz2-crecimiento-v2/herramientas/preview.mts QD/capturas/preview-grande.png 5000`
y `... preview-mini.png 400 mini 0`) hasta que: pasan los umbrales de dominancia sin aflojarlos (se pueden endurecer), siguen verdes los
tests de trazo/prefijo/raíz tardía, y el `ms` de la grande es <= el de `medicion-base.json`. Palancas en este orden: ATROFIA_*,
VIGOR_MIN; no tocar `n` de la config. Regenerar los tres hashes del test de oro (la mini con [0]). Guardar `QD/capturas/medicion-final.json`.
Commit `feat(crecimiento): caminos dominantes y mini de un soma (dendrita-v2 editada antes de publicar)`.

Dibujo, `crecimientoThreeObject.js` (grosor por copias desplazadas en el MISMO LineSegments, porque WebGL ignora `linewidth`):
- `GROSOR` = { completo: [cerca, medio], mini: [cerca, medio], desplazamiento (unidades de mundo) }, arranque { completo: [0.2, 0.4],
  mini: [0.15, 0.3], desplazamiento: 0.6 }, con `ponytail:` (a ojo; techo: pares extra <= 50 % de los segmentos; salida: líneas con
  ancho real de three/examples, Line2/LineMaterial, si hace falta grosor continuo).
- Geometría intercalada por nacimiento: por segmento s, primero el original (A, B) y después sus `grosores[s]` copias; la copia 1
  desplazada en +y y la 2 en +x, en `desplazamiento / escala` unidades normalizadas (la grande se mira de frente: el desplazamiento va en
  el plano del disco); cada copia lleva el color y el alfa de su original. `inicio` (Uint32Array de segmentos + 1) = vértice donde empieza
  cada segmento.
- `actualizar`: `p` = en completo, el mínimo entre `pasos` y `e.pasos`; en mini, el mínimo entre `pasosMini(pasos, config.n)` y
  `e.pasos`. El segmento que está naciendo interpola solo el B del original (posición `inicio[s] + 1`); sus copias entran al completarse.
  drawRange = `inicio[completos]` más 2 si hay uno naciendo. `_escribirExtremo(s)` escribe el B del original en `inicio[s] + 1` (las
  copias nunca se tocan).
- Blanco de raycast: completo `radioNormalizado * escala`; mini `radioMini * escala`.
- Comentarios de cabecera: el mini es un soma del tamaño de un nodo; el grosor sale de copias; `RADIO_COLOR` con el radio medido.

`constants.js` (`CRECIMIENTO_SETTINGS`), con los números de `medicion-final.json` en el comentario: `escalaMini` = 15 / r95 del mini,
redondeado (un nodo común tiene radio 15); `radioMini` nuevo = rmax del mini redondeado hacia arriba a 0.05; `radioNormalizado` = rmax de
la grande n=5000 redondeado hacia arriba a 0.05; el comentario de `escalaRaices` dice "con su forma de siempre". El techo de las copias
(pares extra <= 50 % de los segmentos) lo chequea `capturar.mjs` con `paresGeometria`; si falla, achicar `cerca`/`medio`.

Commit `feat(motor): grosor cerca del núcleo y mini de un soma del tamaño de un nodo (quick 261126-owv)`.

Capturas: ciclo del servidor y control de base de las reglas fijas; `capturar.mjs` sin filtro a `QD/capturas/verificacion.jsonl` (sale
con 0: incluye el piso del mini en `lab-dia0` y +1 draw call). Mirar los 18 PNG (Read): sin línea recta en ninguna escena, las
fundadoras unidas por crecimiento desde `ryz-dia1`, caminos dominantes visibles a 50 % y 100 %, más grueso cerca del centro, Tropical con
su logo, mini de un soma con tamaño de nodo en Laboratorios y Bosque (también al día 0). Si algo no se ve, volver a las perillas de
arriba. Commit `docs(quick-261126-owv): capturas y mediciones` con capturas, `verificacion.jsonl`, `medicion-final.json` y previews.
  </action>
  <verify>
    <automated>npm test && npx tsc --noEmit && node --experimental-strip-types .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/herramientas/medir.mts && node .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/herramientas/capturar.mjs .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/capturas .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/capturas/verificacion.jsonl</automated>
  </verify>
  <done>Tests nuevos primero en rojo y después verdes junto con todos los de D-52/D-53; `medicion-final.json` con profMax >= 80, top10frac >= 0.13, rmax a n=3000 >= 0.8 y ms <= base; `capturar.mjs` sale con 0 (incluye pares extra <= 50 %) en las 9 escenas x 2 viewports más CPU 4x; las capturas muestran lo pedido; commits rojo, algoritmo, motor y capturas.</done>
</task>

<task type="auto">
  <name>Tarea 3: auditoría ponytail del diff, enmienda de D-53 y compuertas finales</name>
  <files>.planning/phases/04.1-expandir-nodo-y-secciones-derivadas/04.1-CONTEXT.md, .planning/PROJECT.md, (los archivos de src que la auditoría corrija)</files>
  <read_first>git diff plan_head_before..HEAD -- src, .planning/phases/04.1-expandir-nodo-y-secciones-derivadas/04.1-CONTEXT.md (D-52 y D-53, líneas ~510-535), .planning/PROJECT.md (fila de D-53 en Key Decisions, línea ~155), CLAUDE.md (invariante D-52)</read_first>
  <action>
Auditoría ponytail explícita (patrón del proyecto: tarea propia antes de la compuerta humana).

1. Correr la skill `ponytail:ponytail-review` sobre `git diff plan_head_before..HEAD -- src`. Para cada hallazgo: aplicarlo si no toca un
pedido del dueño, un invariante de CLAUDE.md, la validación en bordes ni D-52/D-53; si no se aplica, una línea de por qué. Revisar en
particular: código muerto que dejó la atracción incremental o la quita de lóbulos y puentes (variables, canales, campos de `Perfil`
como `zona`/`nube` que sigan en uso o no), comentarios que todavía hablen de puente, unión en el paso 0, lóbulos, esfera irregular o
reemplazo orgánico, y que cada simplificación deliberada nueva tenga su `ponytail:` con techo y salida (atracción incremental, piso del
mini, grosor por copias). Si hay correcciones: `npm test` y commit
`refactor(crecimiento): auditoría ponytail del diff (quick 261126-owv)`.

2. Enmendar D-53 sin reescribir la historia: en `04.1-CONTEXT.md`, al final del bloque de D-53, un sub-bullet
"Enmendada por quick 261126-owv (2026-11-26, antes de publicar v2)" con: qué se decidió (sin segmento recto entre raíces, ni fundadoras
ni tardías: se unen solo por crecimiento; las raíces conservan su forma curada a `escalaRaices`, se revierte el punto 3; el mini es un
soma centrado del tamaño de un nodo con `escalaMini`/`radioMini` medidos y piso `PISO_MINI`; caminos dominantes por vigor con crédito,
soma sin atrofia; atracción incremental; grosor por copias en el mismo LineSegments; v2 editada y test de oro regenerado porque no está en
Neon), las alternativas descartadas (conservar el puente de las raíces tardías; corredores fijos de atractores; Line2/LineMaterial;
mini sin piso) y los riesgos concretos (una raíz tardía puede no tocar a la vista la estructura principal: crece hacia los atractores
comunes y se frena a `muerte` de ella, la salida es una fila de atractores entre esa raíz y el soma más cercano como en el eje de las
fundadoras, en v3 si v2 ya está publicada; el mini muestra un cuarto antes del inicio; tiempos de generación medidos de nuevo, escritorio y
CPU 4x; v2 queda congelada al importar Ryzomatica a Neon). En `PROJECT.md`, actualizar la fila de D-53 en Key Decisions al estado actual
con "(enmendada 2026-11-26, quick 261126-owv)". Revisar si el invariante D-52 de `CLAUDE.md` sigue siendo cierto tal cual; si algo quedó
desactualizado, señalarlo en el SUMMARY (no editar CLAUDE.md sin necesidad). Commit
`docs(04.1): D-53 enmendada por el quick 261126-owv`.

3. Compuertas finales: `npm test`, `npx tsc --noEmit`, `npm run lint` (sin errores), y el ciclo del servidor de las reglas fijas (cortar
3002, `npx next build`, `npx next start -p 3002 -H 0.0.0.0` en background, control de base). Si la auditoría cambió código de `src`,
volver a correr `capturar.mjs` sin filtro y reemplazar `verificacion.jsonl`. Dejar 3002 corriendo con el build final: el dueño mira ahí.
  </action>
  <verify>
    <automated>npm test && npx tsc --noEmit && npm run lint && curl -s http://localhost:3002/api/topologia | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const n=JSON.parse(s).nodos;const ok=n.length===195&&n.some(x=>x.crecimiento);console.log(n.length,ok);process.exit(ok?0:1)})"</automated>
  </verify>
  <done>Hallazgos de la auditoría aplicados o justificados; D-53 enmendada en 04.1-CONTEXT.md y PROJECT.md; tests, tsc y lint verdes; `next build` limpio; 3002 sirviendo el build final contra la base local (195 nodos, Ryzomatica con crecimiento).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| base/API -> motor | `metadata.ficha.crecimiento` llega del jsonb por `/api/topologia`; se valida en `validarCrecimiento` (sin cambios en este quick) |
| URL -> motor | perillas de desarrollo `dia=`, `t=`, `escalaraiz=`, `perf=1` (ya existentes, solo dibujo/tiempo) |
| executor -> bases | el executor corre `next start` con credenciales locales; Neon no debe tocarse |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-owv-01 | Denial of Service | `generar` (bucle de rondas con crédito) | medium | mitigate | Tope de rondas vacías seguidas `ceil(1/VIGOR_MIN)+1` que garantiza terminar; `n <= 6000` y `raices <= 12` siguen validados en el borde; tiempo de generación medido y <= la v2 anterior (atracción incremental) |
| T-owv-02 | Information Disclosure | `.env*` / Neon | high | mitigate | Nunca leer `.env*`; control de base (195 nodos y Ryzomatica con `crecimiento`) antes de capturar y PARAR si no da; sin import a Neon ni push |
| T-owv-03 | Tampering | config de crecimiento desde la base | low | accept | Sin claves nuevas en la config ni en `viz_params`: los parámetros nuevos (vigor, grosor, piso) son constantes del motor, no datos |
| T-owv-SC | Tampering | npm/pip/cargo installs | high | accept | No aplica: este quick no instala paquetes (Playwright ya está en gstack y solo lo usan las herramientas del quick) |
</threat_model>

<verification>
- `npm test` verde (todas las suites; los tests de D-52/D-53 sin aflojar su intención; test de oro regenerado sobre dendrita-v2).
- `npx tsc --noEmit` limpio; `npm run lint` sin errores; `npx next build` limpio.
- `QD/capturas/medicion-base.json` vs `medicion-final.json`: dominancia (profMax, top10frac, rmax a 3000) y ms de generación.
- `capturar.mjs` sale con 0 en 9 escenas x desktop 1280 y mobile 390 más CPU 4x: 1 nodo con crecimiento por escena, raíces con su
  forma curada, 0 pares al día 0 en la red de Ryzomatica, piso del mini al día 0 en Laboratorios, +1 draw call cuando dibuja, pares
  extra de grosor <= 50 %, sin errores.
- Capturas revisadas a ojo contra lo pedido por el dueño.
</verification>

<success_criteria>
- Ningún segmento recto entre raíces en ninguna escena; las fundadoras se unen por crecimiento.
- Tropical se ve con su logo en la red de Ryzomatica; Bosque Gracias con su forma curada.
- Desde afuera, Ryzomatica es un crecimiento de un soma del tamaño de un nodo común, visible al día 0, seleccionable.
- El crecimiento elige caminos (umbrales medidos) y es más grueso cerca del centro, con 1 llamada de dibujo.
- D-52/D-53 intactos (determinismo, prefijo, raíz tardía, sin Math.random/trig); v2 editada, no v3; D-53 enmendada con decisión,
  alternativas y riesgos.
- Auditoría ponytail hecha y registrada.
</success_criteria>

<output>
Crear `QD/261126-owv-SUMMARY.md` (QD = `.planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub`), con este orden:
1. **Decisiones que afectan el futuro, primero** (regla de oro del dueño): sin puentes (también para raíces tardías) con alternativa y
   riesgo; vigor con soma + atracción incremental; mini de un soma con `PISO_MINI` (y la pregunta: ¿se ve antes del inicio o no?);
   grosor por copias con su techo; raíces con forma curada (punto 3 de D-53 revertido); v2 editada y no v3, con los hashes nuevos del
   test de oro y la advertencia de que el import a Neon la congela.
2. **Pregunta para el dueño** sobre la "neurona duplicada": no se reprodujo; lista `nombres` de la escena de Ryzomatica (de
   `verificacion.jsonl`), capturas `desktop-ryz-*` y `mobile-ryz-*`, y la hipótesis (la neurona común de abajo es Laboratorios). Sumar la
   observación de que en `/obra/ryzomatica` la estructura queda chica y arriba a la derecha (comparar con `ryz-red-100`, sin panel) y, si
   pasó, que el logo de Tropical tapa el centro (con `?escalaraiz=` como perilla para probar).
3. Tabla de mediciones antes/después (generación tibia en node, CPU 4x en el navegador, profMax, top10frac, rmax, segmentos y pares,
   draw calls con y sin la estructura, escalaMini/radioMini/radioNormalizado).
4. Estado de cada punto de los dos todos (hecho / pregunta abierta); los todos NO se mueven.
5. Hallazgos de la auditoría ponytail (aplicados y descartados con su motivo).
6. Desvíos, qué no se verificó (celular real, fps fiable) y `plan_head_before`/`plan_head_after`. ADRs en Notion de D-50..D-53 siguen
   pendientes.
</output>
