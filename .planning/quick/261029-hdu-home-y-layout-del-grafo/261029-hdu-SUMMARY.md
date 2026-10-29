---
quick_id: 261029-hdu
type: quick
status: complete
plan_head_before: 5224a8974e2011b93ed6e3dd80bb925b3fa5e8ae
plan_head_after: 4ba51ef63976b35be7722c2412236fa5a439e724
commits: 2   # medido: git rev-list --count plan_head_before..plan_head_after (el commit docs de este SUMMARY va aparte)
actuals:
  tasks: 2
  commits: 2
key-files:
  modified:
    - src/lib/red/home.ts
    - src/lib/red/fuerzas.ts
    - src/engine/SinapsisEngine.js
    - src/engine/graph/utils.js
    - src/app/CanvasSinapsis.tsx
    - src/app/DebugPanel.tsx
  tests:
    - src/lib/red/home.test.ts
    - src/lib/red/neuronas.test.ts
    - src/engine/graph/utils.test.js
---

# Quick 261029-hdu: home solo colectivas + layout sano del grafo

## Decisiones que afectan el futuro (primero)

1. **El home es una regla fija en código: `esDelHome` (`src/lib/red/home.ts:38`).** ENTIDAD con subtipo `productora`, `sello`, `centro_cultural`, `colectivo` o `plataforma`, más toda AGRUPACION (las áreas). Fuera: persona, duo, banda, proyecto, obras y eventos. Con la red de los CSV son 22 nodos (17 + 5) y caben enteros bajo `LIMITE_HOME` = 40, así que el home dejó de ser una muestra al azar: no cambia con la semilla.
   - *Por qué:* con ~140 personas el home era "un bardo de neuronas". El criterio vive en un solo lugar y es una línea de cambiar.
   - *Alternativas descartadas:* filtrar por vínculo (excluir integrantes de Tropical): depende del grafo y no del tipo de entidad; criterio por `nodeType` solo: dejaría entrar las personas.
   - *Riesgo hasta que exista el alta de Vistas:* cada creadxr no puede configurar qué mostrar. `ponytail:` en el código, salida = leer el criterio de una Vista guardada (la Vista es configuración, nunca un campo del nodo).
   - *Decisión del dueño pendiente:* `banda` y `proyecto` quedaron fuera (son colectivas de personas pero no "producen"). Agregar uno es sumar su código a `SUBTIPOS_COLECTIVOS`; hay un test que fija la lista.
2. **El layout se afina con repulsión, no achicando nodos ni bajando la distancia.** `FUERZAS_DEFAULT`: `chargeStrength` -600, `linkDistanciaPorGrado` 0, `gravedad` 0.1 (nueva), `linkDistance` se queda en 140.
   - *Por qué no los defaults de la librería (link 30, charge -60):* están pensados para nodos de radio ~4; los nuestros miden 15 (formas) a 26 (imágenes). Medido: con `?dist=30&grado=0` el home de 40 nodos tiene 20 pares solapados.
   - *Por qué no `?escala=` menor:* solo achica el mesh; las distancias de enfoque de cámara (`aimDistance` 90, 102 de distancia al foco) están calibradas al tamaño actual, y achicar nodos equivale visualmente a subir distancias. Se tocaría la coreografía de cámara (invariante) por nada.
   - *Riesgo:* -600 está calibrado al tamaño actual de nodos. Si cambia `nodeSize`/`size` o la escala, hay que remedir (receta abajo). Un charge fuerte infla las redes grandes: hoy el techo es LIMITE_VISTA + LIMITE_SUMA = 52 nodos con radio de red ~260; con 200 nodos habría que revisar el encuadre.
3. **Deuda de configuración encontrada:** `FUERZAS_DEFAULT.chargeStrength` (-8) nunca se aplicó al arrancar; el motor solo pisaba el charge con `?charge=`. Corría el -60 de three-forcegraph para 3D y el panel de debug mostraba -8. Ahora el motor aplica el valor de `FUERZAS_DEFAULT` (una sola fuente, como decían los comentarios).

## Causa del colapso (medida con la red real de los CSV, 193 nodos / 344 vínculos)

| Causa | Evidencia |
|-------|-----------|
| **Repulsión insuficiente para el tamaño de los nodos** (principal) | Con link 140 y charge -60 (el real, no el -8): mínimo (distancia entre pares / suma de radios) 0.79 en Rama, 0.87 en Rama `?prof=2` con 5 pares solapados y 16 casi tocándose. Subir solo el charge a -200 con `grado=0` lleva a Rama a 1.53 y el home viejo a 1.13 (0 solapados). |
| **`linkDistanciaPorGrado` 0.4 arma abanicos de hubs** | Los spokes del hub crecen a ~3x (link mediano 382-442) y los links entre sus vecinos siguen en 140: el hub queda afuera y los vecinos amontonados (captura `M0-antes-entidad_rama_cerratto.png`). Quitarlo solo no basta: `grado=0` sin más charge baja Rama a 0.60 (tira todo más junto). Hay que quitarlo Y repeler. |
| **Nodos sin vínculos se van flotando** | En el home, RAYO SECO (sello sin vínculos con el resto) deja el radio de la red en 325 contra 177 del percentil 90: el encuadre lo incluye y la red se ve chica. Gravedad 0.1: radio 285, p90 188. |
| Siembra (`sembrarJuntoAVecinos`) y `warmupTicks` | Descartadas. La siembra solo corre en `aditivo` (radio 42); medido sobre redes asentadas sumando 8 vecinos, el mínimo con los nuevos queda en 1.27-2.29, sin solapamiento. La simulación queda quieta tras el warmup: deriva máxima entre 4 s y 16 s = 0. |

## Antes / después (métrica objetiva)

Métrica: para cada par de nodos, `distancia / (r_i + r_j)` con `r` = 15 para formas y 26,25 (medio lado del sprite) para imágenes. `min` < 1 = los meshes se pisan; `solap` = pares con razón < 1; `cerca` = pares < 1,5; `nn mediana` = razón al vecino más cercano. Medida en Chromium headless con las posiciones reales de `window.__sinapsis.graph.graphData()`, red de los CSV vivos (mismo mapeo de `viz_params` que el import), `next dev -p 3003` desde copia aislada con `TOPOLOGIA_FIXTURE=1`. 1280x800, semilla fija. El layout es determinista: la misma ruta repite los mismos números.

"Antes" = layout original (link 140, grado 0.4, charge -60 efectivo, sin gravedad; verificado igual al código original, M0). "Después" = defaults nuevos. Salvo el home, la escena es la misma en ambos.

| Ruta | nodos | min antes -> después | solap antes -> después | cerca antes -> después | nn mediana antes -> después | radio de red antes -> después |
|------|-------|----------------------|------------------------|------------------------|-----------------------------|-------------------------------|
| **Home original** (40 ENTIDAD al azar) -> **home nuevo** (22 colectivas) | 40 -> 22 | 0.861 -> 1.365 | 4 -> 0 | 16 -> 1 | 1.69 -> 2.75 | 428 -> 285 |
| Home nuevo, solo el layout | 22 | 1.03 -> 1.365 | 0 -> 0 | 3 -> 1 | 2.59 -> 2.75 | 285 -> 285 (p90 276 -> 188) |
| Tropical (`/entidad/tropical-poncho`) | 6 | 2.97 -> 2.75 | 0 -> 0 | 0 -> 0 | 3.78 -> 3.49 | 148 -> 121 |
| Rama (`/entidad/rama-cerratto`) | 17 | 0.785 -> 2.123 | 1 -> 0 | 3 -> 0 | 2.00 -> 2.75 | 349 -> 190 |
| Rama `?prof=2` | 40 | 0.871 -> 1.653 | 5 -> 0 | 16 -> 0 | 1.53 -> 2.39 | 462 -> 243 |
| Tropical `?prof=2` | 40 | 1.06 -> 1.679 | 0 -> 0 | 8 -> 0 | 1.81 -> 2.62 | 453 -> 261 |
| Club Weyba `?prof=2` | 9 | 1.981 -> 2.485 | 0 -> 0 | 0 -> 0 | 3.19 -> 3.18 | 235 -> 165 |
| Keuken Aonikenk | 5 | 1.914 -> 2.407 | 0 -> 0 | 0 -> 0 | 2.19 -> 2.67 | 149 -> 107 |
| Obras (área) | 17 | 1.318 -> 2.736 | 0 -> 0 | 1 -> 0 | 1.91 -> 2.84 | 221 -> 220 |
| SOMA (obra) | 19 | 1.229 -> 2.437 | 0 -> 0 | 1 -> 0 | 2.99 -> 3.15 | 299 -> 188 |
| Tempistica I | 40 | 1.06 -> 1.881 | 0 -> 0 | 4 -> 0 | 3.71 -> 2.85 | 451 -> 238 |
| Aditivo: Rama + 8 vecinos | 17 + 8 | 0.785 -> 1.267 | 1 -> 0 | n/d | n/d | n/d |
| Aditivo: Tropical `?prof=2` + 8 vecinos | 40 + 8 | 0.941 -> 1.679 | 1 -> 0 | n/d | n/d | n/d |

Lectura: todos los pares quedaron separados (0 solapados, `min` >= 1,27 en todos los casos); el peor caso previo (Rama, `?prof=2`) pasó de 0.87 a 1.65. En redes chicas (Tropical, Club Weyba, Tempistica I en nn mediana) el espaciado pasa a ser levemente menor o igual porque el link ya no se alarga por grado; sigue sobre 2.7 en Tropical. El radio de la red baja (Rama `?prof=2` 462 -> 243), así que el encuadre acerca la cámara y los nodos se ven más grandes en pantalla.

Capturas en `capturas/`: `M0-antes-*` (código original, home de 40 personas), `M1-home-nueva-home.png` y `M1-antes-layout-*` (home nuevo con el layout viejo), `M2-despues-*` (final). Comparación más clara: `M1-antes-layout-entidad_rama_cerratto_prof_2.png` contra `M2-despues-entidad_rama_cerratto_prof_2.png`. Datos crudos en `mediciones.jsonl`; las etiquetas `sweep*` son el barrido de perillas.

### Barrido de perillas (home viejo de 40 y Rama, antes de fijar los valores)

| Perillas | Home 40 `min` / solap | Rama `min` / solap | Rama `?prof=2` `min` / solap |
|----------|----------------------|--------------------|------------------------------|
| base (140, 0.4, -60) | 0.861 / 4 | 0.785 / 1 | 0.871 / 5 |
| `grado=0` | 0.918 / 2 | 0.601 / 1 | 0.689 / 3 |
| `grado=0&charge=-200` | 1.134 / 0 | 1.528 / 0 | 0.989 / 1 |
| `grado=0&dist=60&charge=-60` | 0.622 / 7 | 0.666 / 3 | 0.534 / 15 |
| `dist=30&grado=0` (defaults d3) | 0.574 / 20 | 0.605 / 16 | 0.531 / 35 |

Sobre el home nuevo y las redes de la tabla anterior: `charge -300` con `gravedad 0` da `min` 1.29-2.81; `charge -600 gravedad 0.1` (elegido) 1.37-2.49 con el radio del home en 285 en vez de 699.

## Qué cambió

- `src/lib/red/home.ts`: `esDelHome` + `SUBTIPOS_COLECTIVOS`, reemplazan a `esCandidato` (solo ENTIDAD). `fraccionHome` no cambia. Tests de `home.test.ts` y de caracterización `neuronas.test.ts` al día (home = 17 ENTIDAD + 5 AGRUPACION sobre los CSV); tabla de `04.1-NEURONAS.md` actualizada.
- `src/lib/red/fuerzas.ts`: valores nuevos con la causa en los comentarios (link 30 ya falló en 03-06 y ahora está explicado).
- `src/engine/SinapsisEngine.js`: aplica `chargeStrength` y `gravedad` de `FUERZAS_DEFAULT` al construir (antes solo `?charge=`); `configurarFuerzas` acepta `gravedad`.
- `src/engine/graph/utils.js`: `fuerzaGravedad(k)` (fuerza d3, 12 líneas) + `utils.test.js`.
- `src/app/CanvasSinapsis.tsx`: perilla `?gravedad=` (el puente sigue siendo el único archivo que ve motor y React). `src/app/DebugPanel.tsx`: rango de charge hasta -1500, slider de gravedad.
- Memoria `layout-distances-retune` actualizada con el resultado y la receta de medición.

## Receta de medición (reproducible)

`herramientas/`: `build-topo.mts` genera la topología desde `data/curaduria/*.csv` (193 nodos, 344 vínculos, igual que el import); `medir.mjs` (home y subredes, escribe `resultados.jsonl` y capturas), `medir-aditivo-y-deriva.mjs`, `barrido*.sh`, `tabla.cjs`. Servidor: copia aislada de `src/` con `node_modules` y `public` enlazados (junctions), `TOPOLOGIA_FIXTURE=1 next dev -p 3003`, fixture reemplazado SOLO en la copia. El 3000 y la base real no se tocaron; no se leyó ningún `.env*`. El servidor de 3003 quedó cerrado y la copia sin junctions.

## Gates

| gate | resultado |
|------|-----------|
| `npm test` | 244/244 (eran 242 + 2 de `fuerzaGravedad`; los de home y neuronas se reescribieron) |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 (solo warnings previos en `src/engine/threeObjects/*` y `Ficha.tsx`, no tocados) |
| G-06 (texturas 512 px, montaña liviana en táctiles) | sin cambios; no se tocó `imageThreeObject.js` ni `background.js` |
| Invariantes | motor sin React (la gravedad es JS puro en `engine/`), un canvas, `viz_params` escalares, sin cambios al modelo de datos |

No se corrió `next build`. FPS no medido: el headless usa GL por software; la gravedad es O(n) por tick y el warmup de 300 ticks no cambia de costo asintótico.

## Deviations from Plan

**1. [Rule 2 - Missing critical] Gravedad (`fuerzaGravedad`) y arreglo del charge muerto.** No estaban en el plan. El charge de `fuerzas.ts` nunca se aplicaba (hallazgo, no decisión); sin gravedad, subir la repulsión empuja a los nodos sin vínculos a >2x el radio del resto (radio del home 699 con charge -300) y el encuadre achica toda la red. Ambos dentro de los archivos del layout del plan. **Commit:** 4ba51ef.

**2. [Alcance] El plan sugería "bajar el tamaño de nodos y/o subir la repulsión".** Se eligió solo repulsión (decisión 2 arriba); `?escala=` quedó como perilla de experimento sin tocar su default.

## Known Stubs

Ninguno.

## Threat Flags

Ninguno: no hay superficie nueva (ni endpoints, ni auth, ni esquema). `?gravedad=` es un número leído del query igual que `?dist=`/`?charge=`: sin NaN no cambia nada, con NaN d3 deja velocidades en NaN solo en esa pestaña (mismo comportamiento que las perillas existentes; no persiste ni se comparte).

## Pendiente para el dueño

- Mirar el home y las redes en su GPU/celular con la base real (Neon): la medición usa los CSV, no la base viva (que podría tener más vínculos desde el último import).
- Confirmar `banda` y `proyecto` fuera del home.
- Un nodo colectivo sin vínculos en el home (hoy RAYO SECO) sigue flotando algo apartado; si molesta, subir `?gravedad=` o conectarlo con curaduría.

## Self-Check: PASSED

- Commits `13e5c94` y `4ba51ef` presentes (`git log`); `commits: 2` medido contra `plan_head_before` `5224a89`.
- Archivos modificados presentes; `capturas/` (18 PNG), `mediciones.jsonl` y `herramientas/` presentes en el task_dir.
- 3003 sin listeners; el 3000 y las bases reales no se tocaron.
