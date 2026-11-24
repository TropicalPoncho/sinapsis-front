---
quick_id: 261124-ryz
type: quick
status: complete
plan_head_before: 230383ccff1a2d9231588ee021ae542bcf72207c
plan_head_after: b6c0c5283ed3e56bf9ce970f950fd5fe52fd4e57
commits: 6   # medido: git rev-list --count plan_head_before..plan_head_after (el commit docs de este SUMMARY va aparte)
actuals:
  tasks: 2     # Parte A (datos) y Parte B (estructura generativa)
  commits: 6
  tokens: 60000
key-files:
  created:
    - src/lib/crecimiento/prng.ts
    - src/lib/crecimiento/config.ts
    - src/lib/crecimiento/tiempo.ts
    - src/lib/crecimiento/dendrita.ts
    - src/lib/crecimiento/estructura.ts
    - src/lib/crecimiento/crecimiento.test.ts
    - src/engine/threeObjects/crecimientoThreeObject.js
    - db/migrations/003_subtipo_residencia.sql
  modified:
    - data/curaduria/nodos.csv
    - data/curaduria/vinculos.csv
    - data/curaduria/fichas.json
    - scripts/migracion/importar.ts
    - src/lib/red/detalle.ts
    - src/app/api/topologia/route.ts
    - src/types/vista.ts
    - src/lib/vista/topologia.ts
    - src/engine/SinapsisEngine.js
    - src/app/CanvasSinapsis.tsx
    - src/app/DebugPanel.tsx
    - CLAUDE.md
    - .planning/PROJECT.md
    - .planning/phases/04.1-expandir-nodo-y-secciones-derivadas/04.1-CONTEXT.md
---

# Quick 261124-ryz: Ryzomatica en la red y su estructura que crece hasta el evento

## Decisiones que afectan el futuro (D-52) — primero

**La forma es una función pura del tiempo: `estructura = f(semilla, versionAlgoritmo, pasos(t))`. En la base solo vive la configuración.** Registrada como D-52 en `04.1-CONTEXT.md`, en la tabla Key Decisions de `PROJECT.md` y como invariante en `CLAUDE.md`.

- **Qué se decidió.**
  - `pasos(t) = floor(n * suave((t - inicio) / (fin - inicio)))`, monótona en t (`suave` = smoothstep: lenta al principio y al final). Sin proceso en background, cron ni estado persistido: se recalcula al abrir la red de Ryzomatica y se revela hasta el paso actual.
  - En la base vive `metadata.ficha.crecimiento = { semilla, algoritmo, inicio, fin, n, raices }` (escalares e ids). **Dónde:** `fichas.json` -> `metadata.ficha` por el mismo pipeline de import y `validarDetalle`, y viaja en la topología como **tercer derivado de metadata** (junto con `horario` y `ficha`), porque el motor la necesita al armar la escena sin pedir el detalle. Se justificó contra `viz_params` (solo escalares visuales del nodo, no config de un evento) y contra una constante en código (no sería config publicable ni cambiable sin deploy).
  - **Invariante testeado:** la estructura en el paso k es el prefijo exacto, byte a byte, de la del k+1. Se prueba contra la generación a N completo y contra generaciones con tope k (nada de lo que se decide depende del tope).
  - **Algoritmo congelado por versión (`dendrita-v1`).** Un test de oro (FNV-1a de toda la estructura a 1500 pasos, semilla 20261205: `1edacdcc`) rompe si alguien toca `dendrita.ts` sin subir la versión. Un ajuste es `dendrita-v2` y lo publicado sigue con la suya.
  - **Determinismo entre navegadores:** la decisión usa solo `+ - * /`, `Math.sqrt`, comparaciones y enteros (`Math.imul`); PRNG mulberry32; un test lee el texto de los módulos (sin comentarios) y rompe ante `Math.random`, trigonometría, `exp`, `pow`, `log`, `hypot` o `**`.
- **Alternativas descartadas.** Persistir cada decisión (crece sin necesidad y se vuelve estado a migrar); un cron o Function que avance el estado (frágil, con costo, fuera de "una sola base sin procesos"); DLA como algoritmo base (caro y menos controlable; puede sumarse como textura de puntas en una versión nueva).
- **Riesgos concretos mientras no se resuelvan:**
  1. **El reloj.** El paso depende de la hora; se usa la del servidor (cabecera `Date` de `/api/topologia`, resolución de 1 s, sin descontar latencia). Verificado con un cliente 6 días adelantado: offset -518400 s y 0 pasos (la hora del servidor, no la del cliente). Si un CDN cachea esa respuesta, `Age` corrige solo lo que el CDN declare; la ruta es `force-dynamic`. Salida: `/api/hora`.
  2. **Generar en el hilo principal.** 170-350 ms a n=5000 en escritorio (medido en 13 cargas), **1255 ms con la CPU 4x más lenta** (estimación de un celular de gama media, no una medida de uno). Salida: un Worker.
  3. **`inicio` es una constante a fijar al publicar** (hoy `2026-11-25T00:00:00-03:00`, el dueño la ajusta en `fichas.json`). Cambiarla después mueve el ritmo, no la forma. `fin` = `2026-12-05T00:00:00-03:00`.
  4. **Import contra Neon, en este orden:** `npm run db:migrate` (corre `003_subtipo_residencia.sql`) y después `npm run migracion:importar`. Sin la fila en `subtipos`, la FK de `nodos.subtipo` rechaza Ryzomatica. Además `/api/topologia` ahora lee `metadata #> '{ficha,crecimiento}'`: esa consulta **no se pudo probar contra Postgres** (no se toca Neon); es una proyección jsonb análoga a la de `horario` y `ficha`, validada contra la fixture, pero el primer deploy con la base real es su primera ejecución.
  5. **Encuadre.** La cámara de foco encuadra el nodo, no la estructura: con el foco en Ryzomatica la estructura queda fuera de cuadro. Se ve entera en la red sin foco (`/?red=ryzomatica`, es lo que muestran las capturas).

## Qué cambió

| # | Parte | Cambio | Commit |
|---|-------|--------|--------|
| 1 | A: datos | `Bosque Gracias` (ENTIDAD colectivo, "Colectivo de artistas.", sin imagen) y `Ryzomatica` (EVENTO residencia, 2026-12-05, "Residencia piloto, reducida y formativa. 5 y 6 de diciembre."). Vínculos `Laboratorios COMPONE`, `Tropical Poncho PRODUJO` y `Bosque Gracias PRODUJO` (rol "Coproducción", como Sello Rojo en Entropía). Ids `origen__destino`, CSV en CRLF. Migración `003_subtipo_residencia.sql`. Tests y `04.1-NEURONAS.md` al día | 889bd99 |
| 2 | B1: módulo puro | `src/lib/crecimiento/`: PRNG, config validada, tiempo (`suave`, `pasosEn`, perillas, reloj), `dendrita-v1`, caché de la estructura. 12 tests | 343b759 |
| 3 | B3/B4: datos y borde | `fichas.json`, `validarDetalle` + `importar.ts` (config válida y raíces = nodos vivos), `/api/topologia` (deriva y valida), `NodoGrafo.crecimiento`, `ahoraServidor()` | 62fe369 |
| 4 | B2/B4/B5: motor, puente, perillas | `crecimientoThreeObject.js` (un `LineSegments` + `drawRange`), integración en `SinapsisEngine`, puente en `CanvasSinapsis` (hora del servidor, `?t=`/`?dia=`), slider en `DebugPanel` | 3ae918f |
| 5 | Docs | D-52 en `04.1-CONTEXT.md`, fila en `PROJECT.md`, invariante en `CLAUDE.md` | 986215b |
| 6 | Capturas y herramientas | 5 momentos x desktop/mobile, mediciones, `build-fixture.mts`, `capturar.mjs`, `verificar.mjs` | b6c0c52 |

## Parte A: datos

- **Subtipo `residencia`: el importer NO lo habría aceptado contra la base real.** El vocabulario es abierto (un INSERT, no una migración de esquema), pero la tabla `subtipos` de Neon solo tiene lo sembrado en 001; la FK rechaza el valor. Se agregó `003_subtipo_residencia.sql` (idempotente, `ON CONFLICT DO NOTHING`). El rótulo que se ve es el código crudo (`residencia`), como el resto (`Overlay.tsx` imprime `nodo.subtipo`).
- Nodo sin `thumb`: el import le da forma y color por hash de id (`shapeVariado`), igual que las personas; en las capturas Bosque Gracias es la esfera rosa y Ryzomatica el cuerpo central.
- El modelo no tiene fecha de fin: `fecha` = 2026-12-05 y la descripción lleva los dos días, como pedía el plan.
- **Números nuevos de los tests (con explicación, nada debilitado):**
  - Home 17 -> 18 colectivas (Bosque Gracias es `colectivo`), fila 1 de `04.1-NEURONAS.md` 22 -> 23.
  - Entidades sin áreas 165 -> 166; censo D-46 300 -> 302 (151 entidades x 2).
  - Tropical "Eventos producidos" 15 -> 16.
  - **Vista general de Rama con `?prof=2`: 39 ENTIDAD + 1 AGRUPACION -> 38 + 2.** Laboratorios, que no tenía vínculos, ahora es alcanzable por la red de Tropical y, con el tope de 40, deja afuera a **Sello Rojo** (diferencia medida contra los CSV de HEAD, solo esos dos nodos). Es un efecto del tope, no un error; las 17 escenas de la tabla de neuronas no cambian.
- Validación de import corrida sin base: `importar.ts` pasa toda la validación (incluida la config de crecimiento) y corta recién en "Falta DATABASE_URL". No se leyó ningún `.env*` ni se tocó Neon.

## Parte B: la estructura

- **dendrita-v1.** Colonización del espacio en 3D: 9000 atractores (PRNG) en un elipsoide de semiejes 1.25 x 0.9 x 0.35 (espesor 0.35 del radio mayor en el plano), raíces en (-1,0,0) y (1,0,0); influencia 0.2, consumo 0.075, paso 0.025, ruido de dirección 0.3. **Celdas cerradas, regla más simple que funcionó:** un nodo recién nacido se une al más cercano a menos de 0.085 que sea de otra rama (sin ancestro común dentro de 16 saltos), una unión por nodo. Cada unión es un segmento más (y un paso más). Sale una venación radial desde cada raíz con celdas donde las ramas se cruzan.
- **n = 5000, no 6000** (decisión de criterio): `dendrita-v1` se agota naturalmente en 5148 segmentos; con `n = 5000` el tope corta casi al final y la estructura llega entera al evento. El techo de 6000 sigue validado en `validarCrecimiento`. Si `n` supera lo que da el algoritmo, `pasos` se acota al total real.
- **Un paso = un segmento.** `paso[s] = s + 1`; las puntas crecen una por vez dentro de una iteración, a la escala de minutos que dura un paso no se nota, y hace el prefijo trivial de razonar.
- **Dibujo.** Un `LineSegments` (6 floats por segmento, ordenados por nacimiento), `drawRange` hasta el paso, y el segmento en curso interpolado por la fracción (se actualizan 3 floats por cuadro con `addUpdateRange`). Degradé entre los `viz_params.color` de las dos raíces por la coordenada x, aditivo, opacidad 0.6. Colocación por cuadro: traslación al punto medio de los dos nodos reales, escala D/2, eje x sobre la recta, disco de cara a +Z del mundo (de frente a la cámara de entrada; sin trigonometría).
- **Cuándo existe.** Cuando la escena que recibe `setVista` trae un nodo con `crecimiento` **y** sus dos raíces (hoy: la red de Ryzomatica y cualquier Vista que junte a Ryzomatica, Tropical y Bosque Gracias). Lo decide el motor desde los datos del Subgrafo: no hay camino aparte, es el mismo puente. Verificado: aparece en la red de Ryzomatica, desaparece al ir a la de Tropical y vuelve con el mismo paso.
- **Perillas:** `?t=ISO`, `?dia=N` (días desde el inicio) y un checkbox + slider en `DebugPanel` (0-100 % del recorrido; el slider gana a `?t=`, que gana a `?dia=`). Son parámetros de desarrollo, no estado de la Vista.

## Evidencia (3003 aislado, `TOPOLOGIA_FIXTURE=1`, fixture armado desde los CSV nuevos con `herramientas/build-fixture.mts`)

Chromium headless con GPU, 1280x800 y 390x844 táctil. Capturas en `capturas/` (`desktop-` y `mobile-` x `dia0`, `25`, `50`, `75`, `100`); datos crudos en `capturas/verificacion.jsonl` (== `log.txt`) y `capturas/verificacion-funcional.jsonl`. 0 `pageerror`, 0 errores de consola.

| Medida | Resultado |
|---|---|
| Pasos medidos | `?dia=0/2.5/5/7.5/10` -> 0, 781.25, 2500, 4218.75, 5000 (= `5000 * suave(x)`) |
| Generación a n=5000 | **desktop 173-230 ms**, **mobile 390 (CPU normal) 179-230 ms**, **CPU 4x 1255 ms** (estimación de celular de gama media) |
| Llamadas de dibujo | **12 con la estructura vs 11 sin ella en la misma escena y encuadre: +1.** Medido sacando el `LineSegments` de la escena. Sin la estructura (red de Tropical, control) no existe: `_crec` es null |
| fps / contexto | 60 fps (headless); `isContextLost()` false en las 13 cargas incluida la de CPU 4x; ninguna pantalla en blanco en mobile (G-06) |
| Texturas | 512px y montaña mobile intactos (no se tocaron) |
| Reloj | cliente 6 días adelantado, sin perillas: offset -518400377 ms, 0 pasos |
| `?t=2026-11-30T00:00:00-03:00` | 2500 pasos (50 %) |
| Slider | 75 % -> 4218.75, 100 % -> 5000, apagado -> vuelve al reloj (0 hoy) |
| Vida | Ryzomatica sí, Tropical no, Ryzomatica de nuevo (paso 2500) |

Hoy (2026-11-24) el reloj real da **0 pasos**: la estructura empieza a verse el 25/11 a las 00:00 (-03:00). Un día después ya hay ~140 segmentos; a mitad del recorrido (30/11) 2500.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] El importer no acepta el subtipo `residencia`**
- **Found during:** Parte A, al revisar `importar.ts` y `001_esquema_inicial.sql`.
- **Issue:** `nodos.subtipo` es FK a `subtipos`, que solo tiene el vocabulario sembrado en 001.
- **Fix:** migración `003_subtipo_residencia.sql`.
- **Files modified:** `db/migrations/003_subtipo_residencia.sql`
- **Commit:** 889bd99

**2. [Rule 1 - Bug] Los tests de topología rompían con la cabecera `Date`**
- **Found during:** correr `npm test` tras `ahoraServidor()`.
- **Issue:** los mocks de `fetch` de `topologia.test.ts` no traen `headers`.
- **Fix:** los mocks traen `new Headers()`; un test nuevo cubre el offset contra una cabecera adelantada 1 minuto.
- **Files modified:** `src/lib/vista/topologia.test.ts`
- **Commit:** 62fe369

**3. [Rule 1 - Bug] Tipo literal en `dendrita.ts`** (`let nVivos = M` heredaba `9000` de `as const`): anotado `number`. Commit 343b759.

### Ajustes de afinación del algoritmo (antes de congelarlo)
Tres vueltas sobre los parámetros mirando la vista de arriba y de lado (`influencia` 0.3 -> 0.2 para bajar la generación de 1.3 s a 0.27 s; `paso` y `muerte` para que se agotara cerca de 5000; `unionesMax` 1 y `saltos` 16 para menos "escaleras"). Todo antes del primer commit del módulo; el test de oro congela el resultado final.

## Decisiones de criterio propio (para que el dueño las revise)

1. **Dónde vive la config:** `metadata.ficha.crecimiento` + tercer derivado en `/api/topologia`. Alternativa: pedirla a `/api/nodo/[id]` al entrar; descartada porque la escena de Ryzomatica tendría un tiempo sin estructura y el motor no pide nada al servidor.
2. **`raices` en la config** (dos ids de nodo): el motor no hardcodea Tropical ni Bosque Gracias. Si se agrega un tercer nodo emisor, es otra versión del algoritmo.
3. **Regla de activación:** la escena contiene el nodo con config y sus dos raíces (no "el nodo enfocado es Ryzomatica"): así sigue visible al enfocar a Tropical dentro de esa red.
4. **n = 5000** (arriba) y un paso = un segmento (unión o rama).
5. **Aspecto:** degradé de colores de las raíces, opacidad 0.6 aditiva, disco de frente a +Z, líneas de 1 px. Es a ojo; las líneas finas con DPR 1 se leen tenues. Se ven "escaleras" cortas donde dos ramas paralelas se unen (aceptable: son las celdas de la referencia, pero son lo menos elegante). El hueco entre los dos frentes, en el centro, es la sutura natural de dos colonizaciones; no se forzó a unirlos.
6. **Rol "Coproducción"** en `Bosque Gracias PRODUJO Ryzomatica` (el plan pedía el patrón de Entropía/Sello Rojo).
7. **`smoothstep`** como `suave`: a 1 día del inicio ya hay ~140 segmentos, a la mitad 2500, y el final llega sin golpe. Una `suave` lineal da 500 por día.
8. **Caché de una sola entrada** en `estructuraDe` (`ponytail:` en el código).
9. **CLAUDE.md** gana un invariante (D-52); el plan pedía D-52 en 04.1-CONTEXT y PROJECT.md, y dejarlo solo ahí no lo hace visible para el próximo agente.
10. **No se tocó** `src/lib/red/fixtures/topologia.json` (la fixture sintética de 38 nodos): un `TOPOLOGIA_FIXTURE=1` sobre el 3000 del dueño no mostrará Ryzomatica. Las capturas salen de una fixture armada desde los CSV (`build-fixture.mts`).

## Known Stubs

Ninguno. La descripción de Bosque Gracias es deliberadamente mínima ("Colectivo de artistas.") por pedido del plan; sin imagen ni personas hasta que el dueño las cargue.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: trust-boundary | `src/app/api/topologia/route.ts` | Nueva proyección de `metadata #> '{ficha,crecimiento}'` hacia el cliente. Mitigado: `validarCrecimiento` (lista cerrada de claves y algoritmos, `n` acotado a 6000, ISO estricto, ids `[\w-]{1,64}`) antes de que llegue a `NodoGrafo`; una config inválida se esconde |

## Verificación

- `npm test`: **271 de 271** (antes 257: +12 del módulo, +1 de `detalle`, +1 de `topologia`).
- `npx tsc --noEmit`: limpio. `next lint`: 0 errores; las advertencias son las de siempre en `src/engine/threeObjects/*` y no hay ninguna en los archivos nuevos o tocados.
- No se corrió `next build`. Neon, el 3000 del dueño y los `.env*` no se tocaron. El 3003 aislado quedó cerrado; `node_modules` y `public` del repo intactos (la copia usó junctions).

## Self-Check: PASSED

- Archivos creados presentes: `src/lib/crecimiento/*.ts` (6), `src/engine/threeObjects/crecimientoThreeObject.js`, `db/migrations/003_subtipo_residencia.sql`, 10 capturas en `capturas/`.
- Commits presentes: 889bd99, 343b759, 62fe369, 3ae918f, 986215b, b6c0c52.
