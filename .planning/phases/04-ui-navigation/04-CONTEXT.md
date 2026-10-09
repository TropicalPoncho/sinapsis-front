# Phase 4: UI & Navigation - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Los visitantes exploran la red en el navegador de punta a punta, sobre un espacio 3D continuo:
el canvas es el fondo permanente (nunca se desmonta), las rutas son overlays flotantes, y cada
navegación se coreografía con un movimiento de cámara. Cubre home, páginas ENTIDAD y OBRA,
menú, panel de información, URL como Vista y el botón atrás. Requisitos: UI-01 a UI-06, UI-08,
UI-09, UI-10. (UI-07, tropicalponcho.art como perfil de la entidad, es la Fase 5.)

</domain>

<decisions>
## Implementation Decisions

### Ya decidido en fases anteriores (se arrastra, no se reabre)
- **D-00a:** Panel siempre del mismo lado: izquierda 62% en escritorio, banda inferior en mobile,
  degradado hacia el canvas (no corte duro), texto alineado a la izquierda (UI-09, 03-CONTEXT).
- **D-00b:** El canvas vive por encima del router y nunca se desmonta; el motor expone solo
  `setVista`/`on`; el foco entra por `nodoEnfocado`; el área segura llega continua desde el DOM.
- **D-00c:** La Vista vive en la URL; el historial es el stack de navegación (UI-05). (enmendada por D-22: el conjunto efímero de nodos sumados al recorrer vive en memoria del Shell; el ancla sigue en la URL)
- **D-00d:** Cambio de ruta secuencia Vista → cámara → overlay (UI-10). Tipografía Briller/Gotham.
  Se dice "creadxr", no "artista".

### Click y navegación (dos pasos)
- **D-01:** Un click en un nodo **enfoca** (paso 1): cambia la ruta, la cámara llega y aparece el
  panel con un resumen. **Entrar** (paso 2) es un botón del panel, no un segundo click.
- **D-02:** El botón del panel depende del **tipo** del nodo, y se estandariza como un "tipo de
  botón" = una acción, con posibilidad de sub-botones:
  - **OBRA:** el botón despliega más información — el panel se extiende hacia abajo y se puede
    scrollear (texto + imágenes).
  - **ENTIDAD / AGRUPACIÓN (área):** el botón carga la sub-red.
  - **Otros comportamientos:** enlaces externos (ir a otra web). La lista de acciones es abierta.
  En la web original era un "tipo de botón" que disparaba acciones distintas; se porta ese patrón
  como datos, no como código por nodo.
- **D-03:** Mientras hay un nodo enfocado, un click en otro nodo visible **enfoca ese nodo**
  (cambia foco y URL; atrás vuelve al anterior; el panel no cambia de lado) — UI-02.
  *(enmendada 2026-10-07, G-02/G-04, ver "Decisiones tras el UAT": el panel ya no hace cross-fade de
  contenido. Orden: se oculta con el contenido viejo, cambia el contenido ya oculto, se mueve la cámara y
  recién ahí se muestra. Excepción: si solo cambia lo sumado ("Sumar sus obras", D-22) el panel no se
  oculta. Enfocar un nodo que no está visible lo suma como un crédito, D-23.)*
- **D-04:** URLs por tipo: `/`, `/entidad/[slug]`, `/obra/[slug]`. Los parámetros de la Vista
  (profundidad, filtros) van en query (`?prof=2`).
- **D-05:** **Cada navegación es un paso de historial**; atrás deshace un paso con la
  animación inversa (reemplaza el snapshot de un solo slot del prototipo).

### Home
- **D-06:** La home (`/`) **no es la red completa**: es una **fracción** de la red social,
  una mezcla de obras y entidades, con semilla distinta en cada visita, hasta un límite de nodos
  que se define por performance. Imagen de referencia: el home de Instagram, "empezás a ver
  obras y entidades". El límite es una constante configurable (PERF-01: ~100 nodos a 30fps con
  CPU 4x es la cota medida; a 6x no llega).
- **D-07:** Más adelante, filtros o una forma simple de elegir "cómo navegar / cómo ver".
  Se empieza simple; el diseño de la home no debe impedirlo.
- **D-08:** El dominio `tropicalponcho.art` accederá directo a la **entidad Tropical Poncho** y
  se verá como la web de Tropical: la red de nodos migrados de **primer nivel** (las áreas /
  agrupadores), no todo. Es UI-07 (Fase 5), pero la página ENTIDAD de esta fase no puede tener
  código específico de Tropical Poncho y debe aceptar una profundidad / niveles visibles como
  parámetro.
  *(enmendada 2026-10-08 por D-24/D-25, ver "Decisiones tras el UAT 2": la "red de primer nivel" queda
  realizada para toda entidad con áreas (raíz + sus áreas, unidas por vínculos virtuales derivados);
  `?prof=N` sigue siendo el parámetro de niveles y pide la Vista general.)*

### Menú
- **D-09:** El menú de arriba muestra los **agrupadores de la entidad en foco** (en
  tropicalponcho.art son las áreas: CONCEPTO, OBRAS, AUDIOVISUALES, EDITORIAL, TECNOLOGÍA,
  LABORATORIOS en la web original). Sale de la misma data que el grafo (UI-06).
  *(enmendada 2026-10-07, G-03/04-09: tocar un ítem del menú **enfoca** el área, como cualquier nodo
  (aditivo, `/entidad/<área>?red=<entidad>`); el botón "Entrar a {área}" del panel es el que carga su
  sub-red. Es el patrón de dos pasos de D-01 aplicado al menú. Mientras se previsualiza un área el menú
  superior se oculta hoy, igual que con cualquier foco dentro de la red. **Respuesta del dueño (UAT 2,
  2026-10-08, pregunta 3b): el menú superior queda visible**, con el área previsualizada o abierta marcada
  como activa (captura de diseño); el cambio es el gap G-10, implementado en 04-12.)*
  *(enmendada 2026-10-08 por D-24/D-25, ver "Decisiones tras el UAT 2": el menú es el de la **entidad de
  contexto** (la red si es una ENTIDAD; la dueña si la red es un área) y queda visible al previsualizar y
  adentro de un área, con el área activa (color del dato, `aria-current`). Desde adentro de un área, otra
  área del menú se previsualiza en la red de la dueña; tocar la actual no hace nada. "Áreas de una
  entidad" = AGRUPACION destino de un COMPONE que SALE de ella.)*
- **D-10:** Al entrar a una sub-red aparece un **menú lateral**: lista de los nodos de esa
  sub-red y un VOLVER, de la misma data que el grafo.
  *(enmendada 2026-10-08 por D-24/D-25, ver "Decisiones tras el UAT 2": VOLVER sube un nivel y va
  **arriba** de la lista, como decía UI-SPEC §3. Con otro nodo enfocado vuelve al panorama del área; en el
  panorama sube a la red de la entidad dueña con el área enfocada.)*
- **D-11:** Mobile: **hamburguesa** que despliega hacia abajo (patrón de la web original); con
  un nodo enfocado muestra solo el botón activo, y el botón del nivel padre queda iluminado.

### Contenido de los paneles
- **D-12:** Panel al enfocar: **nombre, subtipo, descripción breve y botones**. Solo datos que ya
  viajan en la topología; no pide nada al servidor.
- **D-13:** Ficha extendida de una OBRA lleva: **créditos** (creadxrs y su rol, cada uno
  clickeable para enfocar su nodo, sale de los vínculos — UI-04), **texto descriptivo largo**,
  **galería de imágenes**, **enlaces externos** y un **iframe de video de YouTube opcional** (solo
  si el dato lo trae).
- **D-14:** En una ENTIDAD, las obras producidas aparecen **solo en la red al entrar** (y en el
  menú lateral), no como lista dentro del panel.
  *(enmendada 2026-10-08 por D-24, ver "Decisiones tras el UAT 2": drift existente desde 04-02. La Vista
  de ENTIDAD filtra por tipo (ENTIDAD + AGRUPACION), así que las obras de una entidad no aparecen al
  entrar a ella; con D-24 aparecen al entrar al área que las compone, y en el lateral.)*
- **D-15:** Un nodo stub o sin descripción muestra un **panel mínimo con el nombre**: sin
  descripción, sin botón de expandir, sin aviso de "perfil pendiente".

### Coreografía
- **D-16:** Transición por defecto al **entrar**: **ENTIDAD = filtrado, ÁREA (AGRUPACION) =
  reemplazo**. Es configurable: el dueño de la entidad podrá elegir otra. En M1 (sin auth) el
  default vive **solo en código** (ver D-20); leer la elección por entidad del dato y la interfaz
  de edición del dueño son M2.
  *(enmendada 2026-10-07, G-03/04-09: **ENTIDAD también entra con reemplazo**, igual que AGRUPACION.
  Motivo: la decisión 2 del UAT pide "zoom in a la neurona, luego zoom in a la red interna"; con filtrado
  los nodos se quedan en su lugar y la cámara solo puede alejarse del enfocado, o sea zoom out por
  construcción. Alternativa descartada: mantener filtrado y encuadrar la red filtrada con `zoomToFit`
  animado (sigue alejando). Costo: al entrar a una entidad se pierde la continuidad de posiciones (la red
  interna se reasienta). OBRA y EVENTO no tienen Entrar. Reversible en una línea,
  `transicionEntrada` (`src/lib/red/navegacion.ts:15-16`), más su test; D-20 no cambia (el default vive
  solo en código). **Confirmada por el dueño** (UAT 2, 2026-10-08, punto 4): entrar a una entidad y entrar a un área son zoom in,
  "vas ingresando". El dueño agrega que el movimiento aditivo/filtrado puede ser el **lateral** entre
  entidad y obra (de un evento ver sus artistas ocultando el resto; de un artista sumar sus últimas obras),
  a diseñar más adelante; no cambia esta decisión. Ver "Temas abiertos" en `04-UAT-GAPS.md`.)*
- **D-17:** Secuencia estricta: la **cámara llega y recién ahí aparece el panel** (UI-10).
- **D-18:** **Volver = animación inversa** de la que se usó para entrar.

### Decisiones tomadas tras la investigación (2026-09-20)
- **D-19:** El **slug** de las URLs se **deriva del nombre** del nodo por ahora (`Tropical Poncho` a
  `tropical-poncho`), marcado con `ponytail:`; renombrar un nodo cambia su URL. Pasa a columna
  única cuando entre la curaduría real (02-05).
- **D-20:** La **transición de entrada por entidad** (D-16) queda **solo en código** en M1
  (entidad = filtrado, área = reemplazo; hoy ambas con reemplazo, ver la enmienda de D-16); no se lee del
  dato hasta M2, con el editor del dueño.
- **D-21:** Los vínculos **entidad a área** (6 áreas unidas a Tropical Poncho) que necesita el menú
  D-09 **no existen en la curaduría actual**: la UI se desarrolla con **fixtures** que los incluyen, y
  agregar esas aristas queda como tarea de 02-05 (en pausa).

### Decisiones tras el UAT (2026-10-07)
- **D-22 (registro de decisión): la red acumulada vive en memoria; la URL lleva el ancla.**
  - **Qué se decidió:** los nodos que se suman al recorrer (tocar un crédito, "Sumar sus obras") viven en
    memoria del Shell, durante la sesión, atados a la red actual. La URL queda como estaba (foco + `red` +
    los parámetros existentes): sin parámetro nuevo, sin reescribir entradas del historial. Tope P1: la
    Vista base no cambia (`LIMITE_VISTA = 40`) y se suman hasta `LIMITE_SUMA = 12`, con descarte FIFO por
    recencia (sale lo tocado hace más tiempo); el foco nunca se descarta. Techo: 52 nodos = 52 draw calls.
  - **Por qué:** el dueño quiere más adelante "recorrer" la red como un scroll tipo Instagram por obras
    (algunas precargadas, aparecen otras y se van otras): lo acumulado es estado de sesión efímero y
    cambiante, no una Vista. Poder ir por URL a un lugar puntual (una entidad, una obra) es bueno; el
    resto no debe condicionar la URL "salvo que haya una muy buena razón".
  - **Alternativas descartadas:** (a2) `?suma=slug.slug` y reescribir la entrada de origen antes de empujar
    la nueva: Atrás conservaba al colaborador, pero fijaba un formato de una sola vía en links e
    historiales y reescribía pasos ya dados. (a1) `?suma=` solo empujando entradas: Atrás sacaba al
    colaborador, contra lo pedido. (b) `history.state`: tampoco se comparte, no permite tocar entradas
    anteriores y Next comparte ese objeto.
  - **Reglas:** lo sumado persiste con Atrás/Adelante dentro de la misma red y con VOLVER del lateral; se
    borra al cambiar de red (Entrar, Atrás/Adelante a otra red, home) y al recargar; Atrás a una red
    anterior no restaura lo que se sumó ahí, solo vuelve el foco; el link abre el ancla (si el foco no es
    parte de la red, se suma); "Sumar sus obras" no es una navegación ni un paso de historial.
  - **Riesgo:** UI-05 vale para la Vista ancla; lo visible puede tener hasta 12 nodos más que lo que
    reproduce el link, y Atrás no deshace "Sumar sus obras". El feed futuro usa este mismo estado (sumar
    con descarte, limpiar al dejar la red) y no lo convierte en historial; si hiciera falta historial de
    lo sumado, se reabre el invariante y se discute antes del código. Reversible: no queda en links ni
    historiales.
  - **Estado:** decidida por el dueño el 2026-10-07; ADR en Notion pendiente (lo lista 04-11).
  - **Matiz (enmendada 2026-10-08 por D-25, ver "Decisiones tras el UAT 2"):** VOLVER desde el panorama de un
    área cambia de red (sube a la de la entidad dueña), así que lo sumado en el área se borra, como en
    cualquier cambio de red. VOLVER con otro nodo enfocado sigue conservándolo.
  - **Contrastada con el código en 04-11 (2026-10-07):** todas las reglas coinciden con `Shell.tsx` y `url.ts`
    (`subgrafoDe`, `sumarIds`). Un matiz que el texto no decía: la home cuenta como una red más
    (`red = null`), así que dentro de la home también se acumulan los enfocados que quedan fuera de la
    fracción; se borra al salir de ella como en cualquier otra red. Y el foco nunca sale por el tope porque
    `subgrafoDe` lo vuelve a poner al final en cada cálculo, aunque "Sumar sus obras" lo haya empujado
    fuera de lo guardado.
- **D-23 (criterio G-05, 2026-10-07): dentro de una red, enfocar otro nodo nunca la cambia.** Si el nodo ya
  está visible, solo cambia el foco (ni nodos nuevos ni cambio de Vista). Si no está visible, se suma a la
  red como un crédito (D-22), con sus vínculos reales contra lo presente. Su red propia solo se carga con
  el botón "Entrar a ..." (reemplazo, D-16). Causa eliminada: el puente desviaba el click a la red propia
  del enfocado y por eso aparecían "nodos sin relación" (17 → 56 nodos medidos en 04-08); ese desvío se
  borró en 04-10 (`CanvasSinapsis.tsx` ya no calcula la Vista, solo corrige el pedido imposible
  aditivo → filtrado). Resuelve la decisión 3 de `04-UAT-GAPS.md`.
  *(enmendada 2026-10-08 por D-25, ver "Decisiones tras el UAT 2": excepción explícita para el menú
  superior. Desde adentro de un área, tocar otra área del menú **sí** cambia de red: la previsualiza en la
  red de la entidad dueña (`/entidad/<área>?red=<dueña>`, reemplazo). Es navegación de la red de la
  entidad, no de los nodos de la red actual; con otro nodo enfocado en cualquier otro caso, la regla
  sigue igual.)*

### Decisiones tras el UAT 2 (2026-10-08)

Las tomó el plan 04-12 dentro del pedido del dueño (UAT 2, G-08, G-09 y G-10); el texto completo y las
mediciones están en `04-12-PLAN.md` y `04-12-SUMMARY.md`. El dueño las confirma o ajusta en el UAT 3
(04-13). Ninguna es de una sola vía: son una rama en `vistaDe`, un campo opcional de la Vista y funciones
de Overlay; no hay migraciones, datos nuevos ni gramática de URL nueva.

- **D-24 (registro de decisión): vista de entrada de una ENTIDAD con áreas (G-08, UI-03).**
  - **Qué se decidió:** si la entidad COMPONE al menos una AGRUPACION y la URL no trae `prof`, su Vista de
    entrada es la raíz + esas agrupaciones (`profundidad: 1`, `direccion: 'sale'`, `filtroNodeTypes:
    ['AGRUPACION']`, `filtroVinculos: ['COMPONE','PRECEDE']`, `incluirRaiz: e.raiz ?? true`, `limite:
    LIMITE_VISTA`), más **vínculos virtuales entre áreas** pedidos con un campo opcional nuevo de la Vista,
    `vinculosEntreAgrupaciones`, y calculados en `resolverVista` (`src/lib/vista/resolverVista.ts`;
    `vistaDe` en `src/lib/red/url.ts`).
    - *Miembro* de un área = destino de un COMPONE que sale de ella (un nivel, cualquier `nodeType`).
    - Dos áreas se unen si un miembro de una tiene un vínculo real (de cualquier tipo y sentido) con un
      miembro de la otra, o si un mismo nodo es miembro de las dos. Un virtual por par
      (`entre:{x}|{y}`, `virtual: true`, `COLABORO_EN`, punteado como los puentes, rol "Comparten …" o
      "Vinculadas por … y …"). Un vínculo curado entre áreas (COMPONE o PRECEDE) reemplaza al derivado.
      Nunca se persiste; `?puentes=0` los apaga junto con los puentes.
    - "Áreas de una entidad" = AGRUPACION destino de un COMPONE que SALE de ella (`agrupadoresDe`): el menú
      y la vista de entrada salen de la misma función.
    - Fallback: entidad sin áreas, o con `?prof=N` explícito, entra a la Vista general de siempre
      (profundidad 2, ENTIDAD + AGRUPACION, puentes). `?prof` mantiene vivo el parámetro de niveles de D-08.
  - **Por qué:** es la regla literal del dueño ("hay nodos que son parte de un área que se vinculan con
    nodos de otra área, y eso genera el vínculo virtual"). Vive en `resolverVista` (pura, al lado de
    `puentesDe`) y se pide desde la Vista: la vista de entrada sigue siendo configuración de una Vista
    (Core Value) y corre igual el día que el traversal pase al servidor.
  - **Alternativas descartadas:** (a) unir áreas también por colaboradorxs compartidxs (no es lo pedido y
    une áreas por cualquier crédito; sería un salto más en la misma función); (b) calcularlo en `subgrafoDe`
    (saca de la Vista parte de la vista de entrada y no correría en el servidor); (c) derivarlo en toda
    Vista con dos o más áreas, sin campo nuevo (cambia en silencio otras redes y el contrato de
    `resolverVista` de la Fase 2); (d) persistirlo (contradice "virtuales" y deja un dato derivado como
    fuente de verdad). Fallback descartado: raíz + vecinos directos (quedaría la raíz casi sola) y raíz sola
    (vista vacía que dispararía "Todavía no hay nada acá").
  - **Riesgo:** (1) con la base de hoy solo Obras tiene miembros (16), así que la entrada a Tropical es una
    estrella de 5 áreas sin vínculos entre ellas (medido: 6 nodos, 5 vínculos, 0 virtuales) hasta que la
    curaduría cargue miembros en una segunda área; (2) hay dos formas de entrar a una entidad según el
    dato: una creadxr que suma un área pasa a la vista limpia; (3) lxs colaboradorxs de Tropical dejan de
    verse al entrar: se llega por un área, por créditos o con `?prof=2`. Reversible: nada queda en datos ni
    en links.
  - **Estado:** decidida en 04-12 dentro del pedido del dueño; **pendiente de confirmación en el UAT 3**.
    ADR en Notion pendiente (campo nuevo del contrato de la Vista y vínculos derivados en el traversal).

- **D-25 (registro de decisión): adentro de un área, el contexto es la entidad dueña; VOLVER sube un nivel
  (G-09, G-10, UI-06, UI-09, UI-10).**
  - **Qué se decidió:** la *entidad de contexto* es la red si es una ENTIDAD, o la ENTIDAD que COMPONE al
    área si la red es una AGRUPACION (con dos dueñas, la primera por nombre: `padreDe(ady, redId,
    'ENTIDAD')`, con `ponytail:` en `menus.ts`). Con ella:
    - (a) Título (escritorio): la dueña, también adentro del área. Mobile sigue mostrando el área.
    - (b) Menú superior: las áreas de la dueña, visible al previsualizar y adentro de un área; activo = el
      área en la que se está o la que se previsualiza (color del dato, `aria-current="true"`).
    - (c) Desde adentro de un área, otra área del menú se previsualiza en la red de la dueña; tocar la
      actual no hace nada.
    - (d) VOLVER del lateral: con otro nodo enfocado, al panorama del área (conserva lo sumado, D-22); en el
      panorama, a la red de la dueña con el área enfocada, con reemplazo, así la cámara sale de la neurona
      (D-18). Sin dueña, `volver()`.
    - (e) `navegar` no empuja una entrada si la URL es la actual (`src/app/Shell.tsx`, una sola guardia).
    - Mobile sin rediseño: adentro de un área el título sigue siendo el área, el menú superior queda
      oculto ahí y la hamburguesa abre solo el lateral; lo único nuevo es que la hamburguesa aparece al
      previsualizar un área.
  - **Por qué:** G-10 pide (a) y (b) y la captura de diseño del dueño muestra el menú visible con el área
    activa. G-09, causa confirmada contra la base real en 04-12: en el panorama de un área, VOLVER ejecutaba
    `irA(redId, true)`, que arma la URL actual; no cambiaba nada y dejaba una entrada duplicada (el Atrás
    siguiente también parecía no andar, H1). VOLVER además quedaba bajo el pliegue de una laptop con 16
    obras (H2).
  - **Alternativas descartadas:** VOLVER = `history.back()` (no es la inversa exacta con un link duro);
    VOLVER a la red de la dueña sin foco (llega con zoom in, no es la inversa); menú desde adentro =
    entrar directo al área (saltea la previsualización de D-09); menú desde adentro = sumar el área a la del
    área (deja una neurona suelta, lo que hacía D-23).
  - **Riesgo:** D-23 pasa a tener una excepción explícita para el menú superior; VOLVER desde el panorama
    cambia de red y borra lo sumado (D-22); el color del activo sale del dato (Obras es `#FFBC00` en la
    base; el turquesa de la captura es un ejemplo). Ajuste de maqueta con evidencia (04-12, Deviation 1):
    en escritorio "TROPICAL PONCHO" en mayúsculas (Briller es ancha) no entra en una fila con el menú de 5
    ítems; el título usa `clamp(22px, 2.3vw, 32px)` en una línea con elipsis y el menú arranca en `46vw` y
    envuelve (a 1280x800 queda en dos filas). La captura usa una fuente condensada, por eso allí entra en
    una fila; para una sola fila, achicar los ítems o dejar el activo en 18 px. Reversible: todo vive en
    Overlay, Shell y CSS.
  - **Estado:** decidida en 04-12 dentro del pedido del dueño; **pendiente de confirmación en el UAT 3**.

### Claude's Discretion
- Menú de arriba en la home social (contexto general, sin entidad en foco).
- Mobile fino: gestos, alto exacto del panel/banda inferior, comportamiento del scroll con el
  degradado.
- Pantalla de carga (hoy el inicio queda en negro un rato) y estados de error.
- De dónde salen los datos mientras 02-05 (curaduría real) esté en pausa: la UI se desarrolla
  contra el endpoint de topología y fixtures.
- Cómo se modela el registro de acciones de botón, y cómo se lee el override de transición.
- Estilos visuales concretos dentro de la tipografía y el degradado ya definidos.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y alcance
- `.planning/ROADMAP.md` — Fase 4 (goal y success criteria)
- `.planning/REQUIREMENTS.md` — UI-01 a UI-06, UI-08 a UI-10 (UI-07 es Fase 5)
- `.planning/PROJECT.md` — invariantes (canvas permanente, Vista en la URL, "creadxr")
- `CLAUDE.md` — invariantes de arquitectura y disciplina

### Motor y decisiones previas
- `.planning/phases/03-3d-engine/03-CONTEXT.md` — superficie del motor, transiciones, área segura,
  encuadre por `shape`, `nodeFocus`
- `.planning/phases/03-3d-engine/03-06-SUMMARY.md` y `03-UAT.md` — bugs resueltos y gaps abiertos
  (ángulo de enfoque, fade, carga)
- `docs/PERF-01.md` — el techo medido de nodos; sustenta el límite de la home (D-06)
- `.planning/phases/02-data-vista-backend/02-CONTEXT.md` — modelo de datos y topología

### Web original (referencia de comportamiento)
- `../../collectiveConscience/index.html` — estructura del menú (`.floatingMenu`, lateral, botones)
- `../../collectiveConscience/src/client/index.js` — máquina de estados de UI (menú, hamburguesa,
  SEGUIR/VOLVER, `loadType`)

### Contratos del código
- `src/types/vista.ts` — contrato de Vista y Subgrafo
- `src/lib/vista/resolverVista.ts`, `adyacencia.ts`, `topologia.ts` — resolución local de Vistas
- `src/app/api/topologia/route.ts` — único punto que toca Postgres

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/CanvasSinapsis.tsx`: el único puente motor/React; ya expone el foco por click (demo),
  `nodeFocus`, `getAreaSegura` de desarrollo por breakpoint y las perillas de medición por URL.
- `SinapsisEngine.setVista(subgrafo, { transicion, areaSegura, nodoEnfocado })` con las tres
  transiciones y promesa que resuelve al terminar la animación (MOTR-09).
- `resolverVista` + índice de adyacencia: resuelven Vistas localmente sin pedir al servidor.
- Fuentes Briller/Gotham y `.floatingTitle` ya cargan; `src/styles/index.css` trae CSS de la web
  original (menú flotante, botones `.bn`).

### Established Patterns
- El motor no importa React; React no importa THREE; un solo archivo puente.
- El área segura se lee cuadro a cuadro (pull); el offset entra gradual con el tween de cámara.
- Parámetros visuales del nodo son escalares (`viz_params`), nunca código.

### Integration Points
- `src/app/layout.tsx`: hoy solo envuelve `children`; el canvas debe montarse acá, por encima del
  router (UI-08). `page.tsx` es un placeholder.
- Rutas nuevas bajo `src/app/` para `/entidad/[slug]` y `/obra/[slug]`.
- El puente debe traducir click → navegación de ruta y ruta → `setVista`.

</code_context>

<specifics>
## Specific Ideas

- La home se parece al feed de Instagram: obras y entidades apareciendo, sin abrumar.
- El menú y los botones del panel de la web original son la referencia: menú flotante con las
  áreas de Tropical, lateral con VOLVER al entrar a una sub-red, botón "SEGUIR"/"VOLVER" en el panel,
  hamburguesa en mobile.
- Un botón del panel puede ir a otra web: los "tipos de botón" son estándar por tipo de nodo, con
  sub-botones posibles.

</specifics>

<deferred>
## Deferred Ideas

- Filtros y selector de "cómo navegar / cómo ver" en la home — después de la versión simple.
- Controles de niveles visibles (áreas, obras, creadxrs conectados) y configuración por entidad o
  por usuario (por ejemplo ocultar áreas y mostrar directo las obras) — requiere cuentas: M2.
- Edición de la transición de entrada por el dueño de la entidad — M2 (auth).
- Carga progresiva de la red y esfera simple con diseño diferido (docs/PERF-01.md) — mejora de
  motor, posterior a esta fase.
- Fade de nodos con opacidad en vez de escala, y ángulo de enfoque más fino (MOTR-11) — gaps de
  la Fase 3.
- Dominio `tropicalponcho.art` apuntando a la entidad — Fase 5 (UI-07).

</deferred>

---

*Phase: 04-ui-navigation*
*Context gathered: 2026-09-20*
