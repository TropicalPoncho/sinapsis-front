---
phase: quick-261126-owv
plan: 01
quick_id: 261126-owv
status: complete
subsystem: crecimiento (D-52/D-53) + motor
tags: [dendrita-v2, ryzomatica, crecimiento, motor, D-53]
requires: [quick 261124-ryz2 (dendrita-v2, D-53)]
provides:
  - dendrita-v2 editada (sin puentes, vigor con soma, atracción incremental, mini de un soma)
  - estructura.ts: PISO_MINI, pasosMini(), grosores()
  - motor: grosor por copias en el mismo LineSegments; mini del tamaño de un nodo; vínculos internos del crecimiento sin dibujar
affects: [src/lib/crecimiento, src/engine, .planning/phases/04.1 (D-53), .planning/PROJECT.md]
tech-stack:
  added: []
  patterns: [atracción incremental en colonización del espacio, vigor/crédito por vértice, grosor por copias intercaladas en un drawRange de prefijo]
key-files:
  created:
    - .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/herramientas/medir.mts
    - .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/herramientas/capturar.mjs
    - .planning/quick/261126-owv-ryz3-ryzomatica-v2-ajustada-antes-de-pub/herramientas/lab-sin-crecimiento.mjs
  modified:
    - src/lib/crecimiento/dendrita.ts
    - src/lib/crecimiento/estructura.ts
    - src/lib/crecimiento/crecimiento.test.ts
    - src/lib/crecimiento/config.ts
    - src/engine/adaptador.js
    - src/engine/adaptador.test.js
    - src/engine/SinapsisEngine.js
    - src/engine/threeObjects/crecimientoThreeObject.js
    - src/engine/graph/constants.js
    - .planning/phases/04.1-expandir-nodo-y-secciones-derivadas/04.1-CONTEXT.md
    - .planning/PROJECT.md
decisions:
  - "Sin segmento recto entre raíces (fundadoras ni tardías): se unen solo por crecimiento"
  - "Vínculos entre el nodo que crece y sus raíces ancladas no se dibujan en modo completo (siguen en datos y layout)"
  - "Raíces con su forma curada (se revierte el reemplazo a Perlin de D-53 punto 3)"
  - "Mini de un soma: escalaMini 22, radioMini 0.8, PISO_MINI 100 de 400"
  - "Caminos dominantes por vigor con crédito (soma sin atrofia) y atracción incremental"
  - "Grosor por copias desplazadas en el mismo LineSegments (techo 50 % de pares extra; hoy 38 %)"
  - "v2 editada y no v3 porque no está publicada; test de oro regenerado"
metrics:
  duration: ~60 min
  completed: 2026-11-26
actuals:
  tokens: 18000
  tasks: 3
  commits: 8
plan_head_before: e2b470243a68773f5877877dd3bff9914a0a50f9
plan_head_after: 65e2e30356d3bcd75756e7c1b73e49767d380ee8
---

# Quick 261126-owv: Ryzomatica v2 ajustada antes de publicar — Summary

Ryzomatica sin ninguna recta entre raíces (ni segmento de la estructura ni vínculo dibujado), Tropical con su logo, crecimiento que elige
caminos (profundidad 50 → 91, top-10 ramas 9.6 % → 14.4 %) y más grueso cerca del núcleo con la misma llamada de dibujo, y desde afuera
un crecimiento de un solo soma del tamaño de un nodo; generación 3x más rápida. Todo dentro de `dendrita-v2`, editada porque no se publicó.

## 1. Decisiones que afectan el futuro

**D1. Ningún segmento recto entre raíces, ni fundadoras ni tardías.** `src/lib/crecimiento/dendrita.ts` (`entrar`, ~L190): la raíz entra
como vértice suelto (padre -1); la estructura es un bosque (`a.length === pasos`, `paso[s] === s + 1`).
- Por qué: pedido 3 del dueño ("línea recta uniendo dos puntos que crecen").
- Descartado: conservar el puente solo para raíces tardías (sigue siendo una recta).
- Riesgo concreto: una raíz tardía puede no tocar a la vista la estructura principal (crece hacia sus atractores y los comunes y se frena a
  `muerte` de lo existente). Salida: una fila de atractores entre esa raíz y el soma más cercano, como el eje de las fundadoras; en v3 si v2
  ya está publicada. Hoy no hay raíces tardías en datos reales.

**D2. (Desvío, Regla 1) La recta que veía el dueño era también un par de vínculos.** Al quitar el puente la recta seguía en
`ryz-dia0`: eran los vínculos PRODUJO Tropical → Ryzomatica y Bosque Gracias → Ryzomatica. Con el núcleo anclado en el origen y las raíces en
±12.6 sobre x, esos dos vínculos dibujan una línea de raíz a raíz por el centro. Decisión: en modo `completo`, un vínculo cuyos dos
extremos son el nodo que crece o una raíz anclada lleva `link.dentroDelCrecimiento` (`src/engine/adaptador.js`, en `adaptarSubgrafo`) y el
motor no lo dibuja (`.linkVisibility(...)`, `src/engine/SinapsisEngine.js`, junto a `linkPositionUpdate`). El vínculo sigue en los datos,
en `graphData` y en el layout; desde cualquier otra red se dibuja igual que siempre. Test nuevo en `adaptador.test.js`.
- Descartado: sacar esos vínculos de `links` (cambia los grados y la distancia de Laboratorios por `_distanciaPorGrado`).
- Riesgo: es una decisión de presentación que el plan no traía; si el dueño quiere ver el vínculo de producción en esa red, es borrar una
  línea en cada archivo.

**D3. Raíces con su forma curada.** Se revierte D-53 punto 3: Tropical vuelve a ser su logo (`Image`) y Bosque Gracias su `Perlin`, solo a
`escalaRaices` 0.5. Verificado por `capturar.mjs` (cada raíz con `type` = shape curada) en las 10 escenas de la red de Ryzomatica.

**D4. Vigor con crédito + soma sin atrofia + atracción incremental** (`dendrita.ts`, `crecer`/`avanzar`/`nuevoVertice`/`atraer`).
- El hijo hereda el vigor del padre; el padre que no es raíz se atrofia ×(0.15 + 0.5·`azar(semilla, C_VIGOR=10, paso)`), piso 0.05. Cada
  ronda en que lo atraen suma su vigor como crédito; crece con crédito 1. Tope de rondas sin crecer con atraídos: `ceil(1/0.05)+1 = 21`
  (garantiza terminar, T-owv-01).
- Atracción incremental: la grilla guarda atractores; cada uno recuerda su nodo elegible más cercano (`cerca`/`dc`/`muerto`) y se actualiza
  al nacer un vértice. Con `ponytail:` (techo ~12k atractores; salida: compactar celdas).
- Descartado: corredores fijos de atractores (forma impuesta, no elegida).
- Constantes de arranque del spike, sin tocar: ya pasan los umbrales.

**D5. Mini de un soma con piso** (`estructura.ts`): `estructuraDe(c, 'mini')` con entradas `[0]`, perfil sin lóbulos, `raiz: 0`.
`escalaMini` 22 (= 15 / r95 0.668), `radioMini` 0.8 (rmax 0.781), `PISO_MINI` 100 de 400 (`pasosMini`).
- **Pregunta abierta para el dueño:** con el piso, el nodo se ve con un cuarto de su forma aun antes del inicio y, "hoy" (día 1), sigue en
  ese cuarto: en `mobile-bosque-hoy.png` el mini se ve más chico que Bosque Gracias; llega al tamaño de un nodo al final del recorrido. ¿Se
  ve antes del inicio o no (piso 0)? ¿Querés que "hoy" ya tenga tamaño de nodo (piso más alto, por ejemplo 250-400)?

**D6. Grosor por copias** (`crecimientoThreeObject.js`, `GROSOR`): 0/1/2 copias por segmento según la distancia del vértice `a` al origen
(`grosores()`, `completo` [0.2, 0.4], `mini` [0.15, 0.3], desplazamiento 0.6 de mundo en +y y +x), intercaladas detrás de su original para
que el `drawRange` por prefijo siga valiendo. Pares extra 38 % en ambos modos (techo 50 %, chequeado). Sigue 1 draw call (medido).
- Descartado: `Line2`/`LineMaterial` (triángulos y un material más). Es la salida si hace falta grosor continuo (`ponytail:` en el archivo).

**D7. v2 editada, no v3.** Ryzomatica no está en Neon (producción sirve 193 nodos sin ella). Test de oro regenerado:
grande 1500 `5fb85ccb`, con raíz tardía en 600 `288025b4`, mini 400 con `[0]` `e8235b01`. **Desde que Ryzomatica se importe a Neon, v2
queda congelada y cualquier ajuste es `dendrita-v3`.**

D-53 enmendada en `04.1-CONTEXT.md` (sub-bullet al final de D-53, sin reescribir la historia) y fila de `PROJECT.md` actualizada.
`CLAUDE.md` (invariante D-52) sigue siendo cierto tal cual: no se editó.

## 2. Pregunta para el dueño: la "neurona duplicada"

No se reprodujo. En todas las escenas de la red de Ryzomatica (`verificacion.jsonl`, campo `nombres`) hay exactamente 4 nodos:
`Ryzomatica` (Crecimiento), `Laboratorios` (Lights), `Tropical Poncho` (Image), `Bosque Gracias` (Perlin), y exactamente 1 nodo con
`crecimiento`. **Hipótesis:** la neurona común de abajo, con el cable que sube hasta las raíces, es **Laboratorios** (vínculo COMPONE
Laboratorios → Ryzomatica y Tropical → Laboratorios), no una segunda Ryzomatica. ¿Es esa la que viste? Si es otra, decime en qué URL.

Capturas: `capturas/desktop-ryz-{dia0,dia1,50,100,red-100}.png` y `capturas/mobile-ryz-*.png`.

Observaciones para el UAT:
- En `/obra/ryzomatica` la estructura queda chica y arriba a la derecha (encuadre con el panel); sin panel (`ryz-red-100`, `/?red=ryzomatica`)
  queda centrada y grande.
- El logo de Tropical a escala 0.5 tapa parte del centro de la estructura (se ve en `desktop-ryz-red-100.png`). Perilla para probar:
  `?escalaraiz=0.3`. No se cambió el ancla ni `raiz`.
- Al día 1 (`ryz-dia1`, 140 pasos) las fundadoras todavía no se tocan: cada una tiene sus primeros brotes; se ven unidas por crecimiento a
  mitad del recorrido (`ryz-50`). No hay recta en ninguna escena.

## 3. Mediciones antes / después

| Medida | Antes (v2 al inicio del quick) | Después | Fuente |
|---|---|---|---|
| Generación tibia grande n=5000, node, mediana de 7 alternadas en el mismo proceso | 389 ms | 127 ms | `tiempos-misma-sesion.json` |
| Generación en el navegador, escritorio (`crecimientoMs`) | ~0.2-0.25 s (ryz2) | 100-390 ms (ruido de máquina) | `verificacion.jsonl` |
| Generación con CPU 4x (mobile, estimación, no un celular) | 1.5 s (ryz2, máquina cargada) | 716 ms | `verificacion.jsonl` |
| Profundidad máxima (n=5000) | 50 | 91 | `medicion-base/final.json` |
| Top-10 ramas / segmentos | 9.6 % | 14.4 % | ídem |
| Mediana de largo de rama | 3 | 3 | ídem |
| Radio máximo n=5000 / n=3000 | 0.972 / 0.667 | 1.144 / 0.908 | ídem |
| Segmentos grande | 5001 (con puente) | 5000 | ídem |
| Mini: raíces / dendritas primarias / r95 / rmax | 2 / 3 / 0.555 / 0.617 | 1 / 4 / 0.668 / 0.781 | ídem |
| Pares en la geometría (completo / mini) | 5001 / 401 | 6900 / 552 (+38 %) | `verificacion.jsonl` |
| Draw calls con / sin la estructura | +1 | +1 en las 19 corridas (9/8 Ryzomatica, 3/2 Laboratorios, 5/4 Bosque) | ídem |
| escalaMini / radioMini / radioNormalizado | 40 / 0.75 fijo / 1.1 | 22 / 0.8 / 1.15 | `constants.js` |

`medicion-base.json` registra 1133 ms porque la máquina estaba cargada en esa corrida (dos corridas previas dieron 676 y 605); por eso la
comparación válida es la de `tiempos-misma-sesion.json` (v2 anterior copiada de `e2b4702` y v2 editada, alternadas en el mismo proceso).

## 4. Estado de los todos (no se movieron; los cierra el dueño)

`2026-11-26-ryzomatica-neurona-duplicada.md`:
1. Neurona duplicada: **pregunta abierta** (sección 2).
2. Tropical distinto: **hecho** (D3).
3. Línea recta: **hecho** (D1 + D2: era el puente y también los dos vínculos).
4. Mini como un crecimiento del tamaño de un nodo: **hecho**, con la pregunta del piso (D5).

`2026-11-26-ryzomatica-crecimiento-con-caminos.md`: caminos dominantes **hecho** (D4, umbrales medidos); más grueso cerca del centro
**hecho** (D6).

## 5. Auditoría ponytail (`ponytail:ponytail-review` sobre `git diff e2b4702..HEAD -- src`)

Aplicados (commit `6d99bec`):
- `estructura.ts` `pasosMini`: dos ternarios → `Math.min(PASOS_MINI, Math.max(PISO_MINI, ...))`, una línea.
- `config.ts:18`: el comentario de las fundadoras decía "nacen unidas"; ahora "sin segmento entre ellas".

Revisado sin hallazgo: no quedan comentarios de puente, unión en el paso 0, lóbulos, esfera irregular ni reemplazo orgánico en `src`; los
canales `C_LOBULO_*` y el campo `lobulos` se borraron; las tres simplificaciones nuevas tienen su `ponytail:` con techo y salida
(atracción incremental, piso del mini, grosor por copias).

Descartados, con motivo:
- `Estructura.paso` y `segmentosHasta` quedaron redundantes (`paso[s] === s + 1`, `segmentosHasta(e, k) === min(k, total)`): no se borran
  porque son el contrato del prefijo que usan `hastaPaso`, el motor y los tests, y el test de oro los hashea; borrarlos cambia el formato
  de la estructura por ~10 líneas. Candidato para cuando haya una v3.
- Campos `nube`/`radioNube`/`zona` en el perfil `mini`: sin uso en el mini (no tiene raíces tardías) pero los pide el tipo `Perfil`, que es
  uno solo para los dos perfiles; hacerlos opcionales agrega chequeos.

## 6. Desvíos, verificación y lo que no se pudo verificar

### Desvíos
1. **[Regla 1] Vínculos dibujados como recta entre raíces** (D2). Encontrado en la Tarea 1 al mirar `ryz-dia0`. Archivos: `adaptador.js`,
   `adaptador.test.js`, `SinapsisEngine.js`. Commit `46aece8`.
2. **[Regla 3] `capturar.mjs`**: un navegador por escena (Chrome bloqueaba WebGL después de varias pérdidas de contexto seguidas) y medir
   ANTES de capturar, con `ctxPerdidoTrasCaptura` y `captura` registrados aparte. Motivo: en la red de Laboratorios (un solo nodo) la
   captura de pantalla de Chrome headless pierde el contexto WebGL y sale en negro o en blanco. **Se comprobó que no es de este quick:**
   pasa igual con las líneas del crecimiento ocultas y también quitándole `crecimiento` a Ryzomatica en la respuesta de `/api/topologia`
   (`herramientas/lab-sin-crecimiento.mjs`: 3/3 corridas con los mensajes de pérdida en ambos casos). No pasa en Ryzomatica ni en Bosque.
3. `BUENA` en `crecimiento.test.ts` pasó a `algoritmo: 'dendrita-v2' as const` para que `tsc` acepte `estructuraDe(BUENA, 'mini')`.

### TDD (Tarea 2)
RED `123fd7e`: el archivo de tests falla (no existen `PISO_MINI`/`pasosMini`/`grosores`; los umbrales de dominancia fallaban con la v2
anterior según `medicion-base.json`: 50 / 0.096 / 0.667). GREEN `1f4eb8c`: 285/285.

### Compuertas finales
- `npm test`: 285 pass, 0 fail. `npx tsc --noEmit`: limpio. `npm run lint`: 0 errores (19 warnings preexistentes, ninguno en archivos
  tocados). `npx next build`: compilado sin errores.
- Control de base antes de cada tanda de capturas: `/api/topologia` 195 nodos y Ryzomatica con `crecimiento`.
- `capturar.mjs` sin filtro: sale con 0, `fallas: []`, 9 escenas × 2 viewports + CPU 4x.
- 3002 queda sirviendo el build final (de `6d99bec`; los commits posteriores son solo docs) contra la base local.

### No verificado
- **Capturas de Laboratorios** (`*-lab-*.png`) salen en negro/blanco por lo de arriba; las medidas de esas escenas sí son válidas (piso
  del mini: 100 pasos al día 0, +1 draw call). Hay una captura buena de la misma escena con el build final, tomada con otro arnés:
  `capturas/desktop-lab-100-alt.png` (mini completo, de un soma, con las copias de grosor visibles). El mini al día 0 se ve en
  `*-bosque-hoy.png` (piso 100).
- Celular real y fps fiables (headless: escritorio ~21-33, mobile 60).
- Clic sobre el mini con el nuevo `radioMini` (solo se verificó que el blanco existe con su escala).
- ADRs en Notion de D-50..D-53 siguen pendientes.

`plan_head_before`: `e2b470243a68773f5877877dd3bff9914a0a50f9` · `plan_head_after`: `65e2e30356d3bcd75756e7c1b73e49767d380ee8`

## Self-Check: PASSED
