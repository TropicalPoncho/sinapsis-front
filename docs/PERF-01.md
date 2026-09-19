# PERF-01 — Techo de nodos del motor a 30fps

> **Qué es este documento.** El número medido, no una optimización: PERF-01 pide saber cuántos
> nodos sostiene el motor a 30fps en gama media, y cuántos draw calls cuesta cada nodo.
> Instancing y LOD (`.planning/PROJECT.md`, Out of Scope) estaban diferidos hasta tener este
> número — la última sección decide si hace falta empezar ese trabajo.

**El número: ~100 nodos a 30fps o más con CPU throttling 4x** (41 fps con la red de hubs de
100 nodos, 34 fps con el overlay del 62% encima). **A 200 nodos ya no llega: 21 fps** en la
configuración final. **El techo real está entre 100 y 200 nodos.** Cada nodo cuesta **~2,7 draw calls** (1 del nodo + ~1,5 de sus vínculos +
extras de las formas con varios meshes).

**Con CPU throttling 6x (cota conservadora): 12 fps con 100 nodos y 11 con 200.** A 6x el
motor no sostiene 30fps ni con 100 nodos. Entre 4x y 6x está la incertidumbre del número; un
procesador realmente lento queda del lado de 6x.

Esto es una cota, no el dato de un dispositivo real: CPU throttling de Chrome no simula la
GPU (ver "Qué NO mide"). Falta la corrida en un dispositivo real de gama media.

## Corridas

Todas con CPU throttling 4x (salvo las dos marcadas 6x, con red "4G lenta" además) en la máquina de desarrollo, `?perf=1`, esperando a que la
simulación se asiente. `animación` es el `animationType` del `ThreeObjectManager`.

| nodos | topología | animación | overlay | fps | draw calls | draw calls/nodo | triángulos | texturas |
|-------|-----------|-----------|---------|-----|------------|------------------|------------|----------|
| 12 (demo) | curada | Hover | no | 60 | 17 | 1,4 | 332 | 3 |
| 50 | cadena | Todos | no | 44 | 134 | 2,68 | 288.874 | 30 |
| 100 | cadena | Todos | no | 27 | 270 | 2,70 | 663.720 | 60 |
| 200 | cadena | Todos | no | 23 | 540 | 2,70 | 1.157.608 | 117 |
| 200 | cadena | Hover | no | 21 | 540 | 2,70 | 1.157.608 | 117 |
| 100 | hubs | Hover | no | 41 | 264 | 2,64 | 663.720 | 60 |
| 100 | hubs | Hover | sí (62%) | 34 | 264 | 2,64 | 663.720 | 60 |
| 800 | cadena | Hover | no | 0–1 (durante la carga) | 2.161 | 2,70 | 4.721.206 | 458 |
| 100 | cadena | Hover | no | **12 (6x)** | 270 | 2,70 | 663.720 | 60 |
| 200 | cadena | Hover | no | **11 (6x)** | 540 | 2,70 | 1.157.608 | 117 |

Lo que dicen los números:

- **El costo es lineal en nodos**: ~2,7 draw calls por nodo, estable de 50 a 800.
- **Pasar de "todos animados" a "sólo hover" no demostró mejora.** A 200 nodos dio lo mismo
  (23 fps con todos, 21 con hover), así que las animaciones de los nodos no son el cuello. Los
  41 fps de 100 nodos con hubs contra los 27 de la cadena no se pueden atribuir a Hover: cambió
  también la topología, y la varianza entre corridas no está caracterizada.
- **El overlay no ayuda**: el canvas sigue renderizando debajo del panel. 34 vs 41 fps está
  dentro del ruido entre corridas, así que no se puede afirmar que empeore; lo que sí muestra
  es que **no mejora**, y es el caso común de la app.
- **Los fps caen menos que los draw calls crecen** (27 → 23 → 21 con 100, 200 y 200 en Hover):
  el cuello no es sólo el número de draw calls sino también triángulos (1,16 millones a 200
  nodos) y shaders por nodo.

### Carga (tiempo hasta que la red es visible)

Con 4x, medido con `performance.mark('sinapsis:vistaLista')` menos `sinapsis:graphData:inicio`
(el arranque previo en modo dev, ~6–12 s, es Next compilando y no cuenta):

| nodos | `graphData` → red lista |
|-------|--------------------------|
| 12 | ~1,7 s |
| 100 | ~14,9 s (6x, red 4G lenta) |
| 200 | ~3,6 s con `warmupTicks(150)`; ~15,4 s con `warmupTicks(300)` (4x); ~18,4 s (6x, red 4G lenta) |
| 800 | 16 s, 50 s y 145 s en tres corridas |

**La carga es un techo más bajo que los fps.** Con 800 nodos la varianza entre corridas es
enorme y no está explicada, así que se reporta como rango, no como cifra. El costo está en
armar los nodos, compilar shaders y correr `warmupTicks(300)` de forma síncrona; a 800 nodos
la pantalla queda negra decenas de segundos.

### Liberación de recursos (MOTR-07)

Reemplazar una red de 800 nodos por la demo de 12:

| | antes | después |
|-|-------|---------|
| geometrías | 1.364 | 24 (12 en una carga fresca) |
| texturas en GPU | 458 | 10 |
| objetos en escena | 2.954 | 43 |

Esto salió tras corregir dos fugas reales que este plan expuso (`03-06`, checklist #10): las
texturas que `MarbleThreeObject` guarda en uniforms de instancia no se liberaban, y la
liberación corría **antes** de que la librería procesara `graphData()`, así que el render
volvía a subir a la GPU los objetos ya liberados. Ahora se libera después del procesamiento.

## Método

- **Fixture:** `subgrafoSintetico(n)` (`src/engine/fixtures/subgrafoSintetico.js`) — `n` nodos
  repartidos entre las formas registradas, 20% `Image` con thumb real (`public/obras/`),
  ~1,5 vínculos por nodo. `topologia=cadena` (default) o `topologia=hubs` (apego preferencial,
  grados de hasta 16–28 con 100 nodos).
- **Rig:** el puente (`src/app/CanvasSinapsis.tsx`) lee `?nodos=N`, `?topologia=`,
  `?enlaces=`, `?overlay=1`, `?perf=1`. Con `?perf=1` loguea `_perf()` cada 2 s y, al estar
  lista la red, la tabla de marcas. `?demo=liberacion` (con `?nodos=800`) reemplaza por la demo
  y loguea antes/después. Es el aparato de medición, no el panel real (UI-09, Fase 4).
- **FPS:** promedio móvil de ~1 s en `_tick` de `SinapsisEngine`, leído por `_perf().fps`.
- **Draw calls, triángulos, memoria:** `renderer.info` vía `_perf()`.
- **Censo de escena:** `_perf()` también reporta `objetosEscena`, `texturasEnEscena` e
  `instancias`, para distinguir una fuga de objetos que la librería todavía no quitó.
- **Gama media:** CPU throttling 4x del panel Performance de Chrome DevTools.
- **Hardware / navegador:** máquina de desarrollo con CPU Intel i7 y 32 GB de RAM (de gama
  alta), Windows 11, Chrome. No se registró el modelo exacto de CPU/GPU ni la versión de Chrome.
  Los fps son de esta máquina con el CPU frenado 4x: el throttle simula un procesador más lento,
  pero la GPU es la real de una máquina potente, así que el número es **optimista** para gama
  media. No es comparable con otro hardware.
- **Verificación sin GPU:** un Chrome headless (gstack `/browse`) reproduce draw calls y
  triángulos exactos (264 y 663.720 con 100 nodos), por lo que esos dos números son
  determinísticos y verificables sin depender de la máquina. Los fps no lo son.

## Qué NO mide

- **No hay corrida en un dispositivo real de gama media.** El único otro dispositivo a mano
  (el teléfono del desarrollador) es de gama alta y no aporta un dato distinto. Chrome no ofrece throttle de GPU
  confiable: el número CPU-throttled es un piso para el costo de JavaScript y de armar
  el frame, pero no dice nada sobre el fill rate de una GPU móvil. El dato defendible sale de
  un teléfono o una notebook de gama media, y **falta**.
- **Los tiempos de carga con red "4G lenta"** incluyen la descarga de texturas e imágenes por
  esa red, así que no son comparables con los de corridas sin red limitada; los fps sí.
- **Ninguna corrida con overlay a otros tamaños** que 100 nodos.
- **La varianza entre corridas** no se caracterizó (una corrida por punto, salvo la carga de
  800 nodos que se repitió y varió 9x).

## Qué se hace con esto

Los datos justifican **empezar por los vínculos, no por los nodos**. Cada vínculo es su propio
`THREE.Line` y su propio draw call (~1,5 por nodo, más de la mitad de los ~2,7), y además
reescribe 31 puntos en JavaScript en cada actualización. Fusionar todos los vínculos en un solo
`LineSegments` con un buffer compartido bajaría los draw calls por nodo de ~2,7 a ~1,2 y
sacaría trabajo de la CPU. Es el primer paso, y el más barato.

**Instancing de nodos** es el segundo escalón: los nodos no traen shader propio (`viz_params`
son escalares), así que instancing por forma es posible — son 14 formas. Recién ahí el costo
sería sub-lineal en nodos. No se justifica todavía: la red inicial de tropicalponcho.art son
decenas de nodos, por debajo del techo medido.

Para redes más grandes el problema que aparece primero es la carga, no los fps: `warmupTicks`
síncrono más creación de nodos deja la pantalla negra. Antes de instancing conviene la carga
progresiva (agregar nodos por tandas con la transición `aditivo`, que ya pinea lo existente) o
una esfera simple por nodo con el diseño cargado en diferido.

## `ponytail:` que la medición dejó expuestos

- **Un draw call por nodo es el techo conocido.** El `geometryCache` comparte geometrías entre
  instancias pero no materiales ni texturas: `MarbleThreeObject` crea 2 texturas por nodo, que
  se podrían compartir como ya se hace con las geometrías.
- **`warmupTicks(300)` es fijo** y bloquea el hilo; crece con los nodos. Ceiling: redes de
  cientos de nodos. Salida: ticks adaptativos o la carga progresiva.
- **La fuga de texturas fue silenciosa** hasta que `_perf()` empezó a reportar memoria de GPU;
  ese contador es la alarma para el próximo tipo de nodo que agregue texturas propias.
- **Las ondas de los links se calculan por link en cada actualización de la librería.** Con
  redes grandes, animarlas sólo para los vínculos del nodo bajo el mouse (`highlightLinks`
  ya existe) evita el costo para el resto.
