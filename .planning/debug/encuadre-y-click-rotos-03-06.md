---
status: verifying
trigger: "encuadre-y-click-rotos-03-06 (checkpoint 03-06, orquestador)"
created: 2026-08-31T00:00:00Z
updated: 2026-09-18T00:20:00Z
---

## Current Focus

hypothesis: G/H/I (chargeStrength, drag crash, zoomToFit) siguen pendientes de confirmación
  visual del usuario — ver bloque histórico abajo, no tocado en este round. Síntoma v9
  (`cluster-a`→`cluster-b`) renderizando como línea recta default sin animación — hipótesis
  ANTERIOR (createObject devuelve undefined para v9 en la carga inicial) DESCARTADA con datos
  reales: `[DIAG-LINKOBJ]` mostró los 9 links, incluido v9, con `objetoLinkEsUndefined: false` y
  `meshEsUndefined: false` en la carga inicial, sin ningún console.error. NUEVO dato clave del
  usuario: el link roto se ve específicamente DESPUÉS de dragear un nodo (usa drag como técnica
  de diagnóstico) y "queda así" (persiste tras soltar) — el problema no está en la construcción
  inicial, está en algo que pasa DURANTE o DESPUÉS del drag, y `enableNodeDrag(true)` es una
  feature recién reactivada en la ronda anterior de este mismo debug (antes estaba en false).
  Hipótesis a confirmar: (1) el drag dispara una segunda llamada a `createObject` para v9,
  creando una instancia nueva que coexiste con la vieja sin reemplazarla correctamente en escena,
  o (2) la instancia correcta sigue en escena pero `ThreeObjectManager.animateLinks()` deja de
  invocar `.animate()` sobre ella específicamente tras el drag (freeze de animación sin cambio de
  identidad de objeto).
test: instalado diagnóstico NO de un solo disparo, con throttle de 2s (cubre antes/durante/después
  del drag), en el constructor de SinapsisEngine.js (`this._diagInterval`, limpiado en
  `destruir()`): loguea `[DIAG-RECREATE v9]` con `createCalls` (contador acumulativo nuevo en
  `ThreeObjectManager._createCallCounts`, incrementado en cada llamada a `createObject` por id),
  `instanceUuid` (uuid del mesh actualmente en `_objectInstances['v9']`), `animateCallCount`
  (contador nuevo `_animateCallCount` en `LinkThreeObject.animate()`), `meshEnEscena` (recorre
  `this.scene.traverse` buscando ese mesh exacto por referencia) y `meshVisible`. También se dejó
  un guard en `.linkThreeObject` (SinapsisEngine.js): si `createObject` devuelve falsy, loguea y
  devuelve `null` en vez de tirar TypeError leyendo `.mesh` de `undefined` (gratis, no depende de
  la hipótesis). npx tsc --noEmit limpio, npm test 62/62.
expecting: si `createCalls` para v9 sube de 1 a 2+ en algún punto de la sesión -> confirma
  hipótesis (1), recreación de instancia; revisar next_action con el uuid antes/después para ver
  cuál quedó huérfana. Si `createCalls` se mantiene en 1 pero `animateCallCount` dejó de subir (se
  estanca) mientras el de los otros links sigue subiendo -> confirma hipótesis (2), freeze de
  animación sin recreación. Si `meshEnEscena` pasa de `true` a `false` en algún punto -> el mesh
  fue removido de la escena (three-forcegraph lo dio de baja) sin que nuestro tracking se entere.
next_action: (ACTUALIZADO) `[DIAG-BUFFER]` verificado matemáticamente por el orquestador: tomó
  v1 y v9, calculó a mano el punto medio esperado (i=15 de 31) de una interpolación lineal pura
  entre start/end, y coincidió EXACTO (precisión de punto flotante) contra el valor real del
  buffer en ambos casos. El buffer de geometría es matemáticamente perfecto — sin puntos stale en
  (0,0,0) ni ninguna otra anomalía. Conclusión: el "doblez"/"bisagra compartida" de las 4 capturas
  NO es un bug de los links — con amplitude=0 cada link ES una línea recta perfecta en 3D; lo que
  se veía era 6 líneas independientes que salen de tropical-poncho hacia 6 destinos distintos
  CRUZÁNDOSE en la proyección 2D de pantalla desde ese ángulo de cámara particular (efecto óptico,
  no bug de geometría). Restaurado `amplitude: 0 -> 5` en linkThreeObject.js (bisección cumplió su
  propósito: confirmó que nunca fue un problema matemático ni de pipeline). Revertido `[DIAG-BUFFER]`
  de SinapsisEngine.js (ya cumplió su propósito). npx tsc --noEmit limpio, npm test 62/62.
  Pendiente: pedir al usuario que rote la cámara a un ángulo bien distinto (idealmente top-down,
  mirando derecho hacia abajo desde arriba del hub tropical-poncho) y confirme si desde ahí las 6
  líneas se ven como 6 rayos rectos y separados, sin bisagra compartida — si confirma, este
  misterio queda CERRADO como "nunca fue un bug", sólo era el ángulo de cámara. Si confirma,
  vuelve a quedar sólo el tema de tuning de layout general "apretado" (chargeStrength:-8/
  linkDistance:180) pausado hace varias rondas, más G/H2/I esperando confirmación visual.

## Current Focus (histórico, previo a este round)

hypothesis: F (frustum/zoomToFit) DESCARTADA con evidencia directa del usuario — orbitó
  manualmente la cámara alrededor de las esferas desde todos los ángulos ("estoy rodeando las
  esferas y viendolo de todos los angulos") y las 6 líneas de tropical-poncho siguen sin tocar
  ningún nodo real sin importar el ángulo. No es un problema de encuadre/cámara. Diagnóstico
  `_diagFrustum`/`[DIAG-FRUSTUM]` revertido de SinapsisEngine.js (no se llegó a correr, y ya no
  aplica). `activateZoomToFit()` NO se toca — no es la causa.
  Nueva hipótesis (G, evidencia diferencial fuerte, no confirmada todavía): el usuario reporta
  que los 2 vínculos de `serie-uno` (v7→nudo, v8→espora) SÍ conectan bien a nodos reales,
  mientras que los 6 vínculos de `tropical-poncho` (v1-v6, TODOS con el mismo `origen:
  'tropical-poncho'`) no conectan a nada. Esto es diferencial: no es un bug general de todos los
  links, es algo específico de tener múltiples links saliendo del mismo `source`/hub. Candidatos:
  (a) algo en cómo three-forcegraph/d3-force-3d resuelve `source`/`target` de string a objeto
  nodo cuando varios links comparten el mismo source, (b) colisión o pisada en
  `ThreeObjectManager`/`_objectInstances` si el `link.id` generado en `linkThreeObject` no es
  único entre los 6 (línea 59: `link.id ??= source-target`, debería ser único porque target
  difiere, pero falta verificar en runtime), (c) objeto `start`/`end` compartido por referencia
  entre los 6 callbacks del mismo frame.
test: instalado diagnóstico de un solo disparo en SinapsisEngine.js — el callback
  `linkPositionUpdate` ahora acumula en `this._diagLinks` (Map) una entrada por cada `link.id`
  con `{linkId, source, target, start, end}` (source/target normalizados a id string si llegan
  como objeto resuelto), y cuando el Map junta tantas entradas como `graph.graphData().links.length`
  (9 links del fixture), imprime `console.log('[DIAG-LINKS]', [...])` UNA sola vez con los 9
  juntos. npx tsc --noEmit limpio. Falta: usuario recargue localhost:3000 y pegue el array
  completo que loguea `[DIAG-LINKS]` (aparece solo, sin interacción, apenas los 9 links renderizan
  al menos un frame).
expecting: si los 6 links de tropical-poncho (v1-v6) tienen `start` IDÉNTICO entre sí (mismo
  x/y/z, correcto porque comparten source) pero `end` DISTINTO y coincidente con la posición real
  de cada nodo destino (nudo/espora/wip/kutral/tempistica/soma) — entonces los datos que llegan a
  setPosition son correctos, y el bug está más abajo (en LinkThreeObject/ThreeObjectManager, no
  en la resolución de source/target). Si en cambio varios de los 6 comparten el mismo `end`, o
  `end` no coincide con la posición real del nodo destino, o hay `source`/`target` con el id
  crudo sin resolver (string en vez de objeto con x/y/z) — eso apunta directo a d3-force-3d
  resolviendo mal los links del hub.
next_action: (ACTUALIZADO) hipótesis I (boundingSphere/frustum culling congelado) FALSIFICADA —
  el usuario confirmó "sigue igual" tras aplicar `frustumCulled = false`. Fix revertido de
  linkThreeObject.js (no era la causa, no dejar código que sugiera lo contrario). Van CUATRO
  hipótesis descartadas (F cámara/frustum-de-vista, G resolución de datos, H identidad de
  instancias/mesh, I bounding sphere) razonando desde nuestro propio tracking de código —
  correctamente cuestionado por el usuario: que `start`/`end`/`_objectInstances` tengan los
  valores correctos NO prueba que lo que se dibuja en pantalla sea correcto. Dejar de razonar
  desde el código propio; conseguir un dump DIRECTO de la escena WebGL real. Instalado
  `_diagScene()` en SinapsisEngine.js, disparado por `setTimeout(4000)` (mismo patrón que
  diagnósticos previos): recorre `this.scene.traverse(...)`, filtra objetos `type === 'Line'` o
  con `material.color` magenta (0xff44ff, el color de los links), y para cada uno loguea `uuid`,
  `position` propia del mesh (nunca antes chequeada — si no es (0,0,0) desplazaría TODOS los
  puntos sin que nuestro tracking de start/end lo vea), `visible`, `parent.type`/`parent.uuid`/
  `parent.position` (¿estos Line cuelgan directo de la escena o de un Group con transformación
  propia?), y el array CRUDO de floats de `geometry.attributes.position` (lo que está en la GPU
  ahora mismo, no lo que `animate()` cree haber escrito) junto con su `count`. npx tsc --noEmit
  limpio, npm test 62/62. Pedir al usuario que recargue completo y pegue el `[DIAG-SCENE]`
  completo (debería haber exactamente 9 entradas si nada se duplica en la escena real). NO
  aplicar ningún fix hasta ver ese dump.

## Symptoms

expected: Al cargar http://localhost:3000 con npm run dev, el grafo de 12 nodos debería verse
  centrado, a un tamaño razonable, con vínculos visibles, y clickeable/arrastrable sin errores.
actual: Nodos diminutos y amontonados muy lejos hacia la derecha, sin vínculos visibles. Click en
  un nodo tira TypeError: Cannot read properties of undefined (reading 'x') en
  OrbitControls.onPointerUp vía DragControls.
errors: |
  TypeError: Cannot read properties of undefined (reading 'x')
    OrbitControls.onPointerUp (three/examples/jsm/controls/OrbitControls.js:1630:64)
    DragControls.<anonymous> (3d-force-graph/dist/3d-force-graph.mjs:471:107)
    DragControls.dispatchEvent (three/build/three.core.js:2269:16)
    DragControls.onPointerCancel (three/examples/jsm/controls/DragControls.js:394:8)
reproduction: npm run dev, abrir localhost:3000 sin query params, ver grafo diminuto arriba a la
  derecha, click en cualquier nodo -> crash.
started: nunca funcionó — primera vez que el motor renderiza en navegador real (Planes 03/04/05
  difirieron toda verificación visual a este checkpoint).

## Eliminated

- hypothesis: "shape-invalido (vizParams.shape:'NoExiste') hace que ThreeObjectManager.createObject
    devuelva undefined y ese undefined rompe DragControls"
  evidence: |
    adaptador.js YA tiene el fallback (líneas 16-19): `tieneShape` chequea si el shape está
    registrado en ThreeObjectManager.getTypes(); si no, usa ThreeObjectManager.defaultType
    ('Lines'). El nodo shape-invalido llega a createObject con type='Lines' (registrado), nunca
    con type='NoExiste'. createObject nunca ve el shape inválido — el fallback documentado en el
    comentario de cabecera de adaptador.js ya cubre este caso antes de threeObjects/.
  timestamp: 2026-08-31T00:10:00Z

## Evidence

- timestamp: 2026-08-31T00:05:00Z
  checked: matemática de camera.setViewOffset via simulación con three.js real en Node
    (PerspectiveCamera.updateProjectionMatrix, W=1280 H=800, areaSegura desktop left=0.62W)
  found: |
    offsetDeAreaSegura da offsetX=-396.8. Proyectando un nodo en el origen: sin offset cae en
    screenX=640 (centro); con offset cae en screenX=1036.8, que es EXACTAMENTE el centro del
    38% libre (793.6 a 1280, centro 1036.8). La traslación de frustum funciona matemáticamente
    tal como está documentada — no hay bug en encuadre.js ni en applySafeArea en sí. Un nodo en
    x=150 ya cae en ndcX>1 (fuera de pantalla). El grafo entero (spread de un layout de 12
    nodos) queda comprimido dentro de esa franja de 38% del viewport.
  implication: applySafeArea NO tiene un bug aritmético. El offset es correcto PARA CUANDO HAY UN
    NODO ENFOCADO que se quiere centrar en el área libre.
- timestamp: 2026-08-31T00:12:00Z
  checked: SinapsisEngine._tick (línea 74-84) y MOTR-08 en REQUIREMENTS.md
  found: |
    _tick llama `cameraController.applySafeArea(area, W, H)` cada frame si `area` es truthy —
    SIN condicionar a que haya un nodo enfocado (`this._nodoEnfocado`). REQUIREMENTS.md dice
    literalmente: "MOTR-08: El motor recibe el área segura del viewport de forma continua...
    y encuadra el NODO ENFOCADO dentro de ella". El requisito es sobre mantener encuadrado al
    nodo enfocado, no sobre recomprimir la vista general/overview sin foco.
  implication: ROOT CAUSE A — applySafeArea se aplica siempre que CanvasSinapsis.tsx pase un
    getAreaSegura no-nulo, incluso en la carga default sin `?foco=`. Como el dev harness devuelve
    un área segura de 62% SIEMPRE (no sólo cuando hay foco), la vista general/overview queda
    permanentemente comprimida en el 38% derecho desde el primer frame — de ahí "diminuto y
    amontonado a la derecha". Es exactamente lo esperado matemáticamente de un offset que sólo
    debería aplicarse con nodo enfocado.
- timestamp: 2026-08-31T00:15:00Z
  checked: node_modules/3d-force-graph/dist/3d-force-graph.mjs (setup de DragControls,
    enableNodeDrag default) + node_modules/three/examples/jsm/controls/DragControls.js +
    OrbitControls.js (onPointerDown/_addPointer/_trackPointer/onPointerUp)
  found: |
    3d-force-graph arma un DragControls sobre cada nodeThreeObject con enableNodeDrag:true por
    default (SinapsisEngine no lo desactiva). DragControls escucha 'pointerup' en el canvas
    (target phase, dispara ANTES de que el evento real llegue a document). Su handler de dragend
    simula "mouseup" haciendo `document.dispatchEvent(new PointerEvent('pointerup', {pointerType:
    'touch'}))` — sin pointerId (default 0) — para evitar que OrbitControls quede "pegado".
    OrbitControls.onPointerDown SIEMPRE hace `_addPointer(event)` (push del pointerId real del
    mouse, ej. 1, a `this._pointers`), pero SÓLO llama `_trackPointer` (que puebla
    `_pointerPositions`) dentro de la rama `pointerType === 'touch'`. Un click de mouse real
    nunca llama `_trackPointer`, así que `_pointerPositions` queda vacío para el pointerId real.
    Cuando llega el pointerup sintético (pointerId=0, no matchea el pointerId real=1),
    `_removePointer` no saca nada de `_pointers` (sigue en length 1) → cae en el `case 1` de
    `onPointerUp`, toma `pointerId = this._pointers[0]` (el real, ej. 1) y
    `position = this._pointerPositions[1]` → **undefined**, porque nunca se trackeó para mouse.
    Línea 1630 lee `position.x` de ese `undefined` → el TypeError exacto del stack trace
    reportado, mismos tres frames (DragControls.onPointerCancel -> dispatchEvent -> el listener
    de dragend de 3d-force-graph -> OrbitControls.onPointerUp).
  implication: ROOT CAUSE B — no es un bug de nuestro código de threeObjects/adaptador; es una
    interacción conocida entre el drag-to-move de 3d-force-graph y OrbitControls cuando el input
    es mouse (no touch). Pasa en CUALQUIER click sobre CUALQUIER nodo, no sólo shape-invalido —
    el pointerdown+pointerup sin movimiento ya cuenta como dragstart+dragend para DragControls.
    Nada en REQUIREMENTS.md pide arrastrar nodos con el mouse; enableNodeDrag es un default de la
    librería que nadie pidió explotar.
- timestamp: 2026-08-31T00:40:00Z
  checked: consola del navegador tras aplicar fixes A/B (screenshot del usuario) +
    src/engine/threeObjects/linkThreeObject.js completo
  found: |
    Warning repetido masivamente: "THREE.BufferGeometry: Buffer size too small for points data.
    Use .dispose() and create a new geometry." en linkThreeObject.js:61. El constructor (línea 18)
    crea la geometría inicial con setFromPoints([2 puntos]) — buffer de tamaño 2. animate() (línea
    61) llama setFromPoints(points) cada frame con points.length = segments+1 = 31. setFromPoints
    sobre geometría existente reutiliza el buffer del atributo position si el nuevo conteo entra;
    31 > 2 no entra, tira el warning y NO actualiza la geometría — consistente con "sin vínculos
    visibles" reportado desde el inicio de la sesión, independiente de los fixes A/B.
  implication: ROOT CAUSE C (hipótesis inicial, INCORRECTA/incompleta) — mismatch aparente entre
    el conteo de puntos de la geometría inicial (2) y el conteo que animate() escribe cada frame
    (31). El fix aplicado en esa sesión (preasignar 31 puntos en el constructor) NO resolvió el
    warning en producción — ver evidencia siguiente.
- timestamp: 2026-09-17T00:00:00Z
  checked: usuario confirmó (cache disabled, hard reload, incógnito) que el warning persistía
    pese al fix de preasignar 31 puntos. Se instaló un console.log de un solo disparo en
    linkThreeObject.js justo antes de setFromPoints(points) en animate().
  found: |
    `{ pointsLen: 31, attrCount: 2, segments: 30, thisSegmentsType: 'number' }`. pointsLen=31
    correcto (como se esperaba tras el fix anterior), pero attrCount (el `count` real del
    atributo position de la geometría EN ESE MOMENTO) es 2, no 31 — algo externo a
    LinkThreeObject reemplaza el atributo position bajándolo a 2 puntos, entre la construcción
    (preasignada a 31) y la primera llamada a animate().
  implication: el fix de preasignación por sí solo no alcanza — algo vuelve a pisar el buffer
    cada frame antes de que animate() escriba.
- timestamp: 2026-09-17T00:05:00Z
  checked: node_modules/three-forcegraph/dist/three-forcegraph.mjs líneas 763-796 (lógica de
    linkPositionUpdate de la librería)
  found: |
    three-forcegraph llama al callback `linkPositionUpdate` que el motor pasa y usa su VALOR DE
    RETORNO como señal: `if (state.linkPositionUpdate && state.linkPositionUpdate(...) &&
    !extendedObj) { return; }` — si el callback devuelve falsy, la librería aplica su propia
    lógica default: `if (!linePos || linePos.array.length !== 6) { line.geometry.setAttribute
    ('position', new THREE.BufferAttribute(new Float32Array(2*3), 3)); }` seguido de escribir
    start/end directo (2 puntos), REEMPLAZANDO el atributo position entero. El callback en
    SinapsisEngine.js (`.linkPositionUpdate((line, {start,end}, link) => { link._threeObj
    ?.setPosition(start, end); })`) no tenía `return` explícito → devolvía `undefined` (falsy) →
    three-forcegraph pisaba el atributo con su geometría de 2 puntos CADA FRAME, justo antes de
    que animate() (loop propio del motor) intentara escribir sus 31 puntos encima → warning cada
    frame, para siempre.
  implication: ROOT CAUSE C real — no es un problema de tamaño de buffer preasignado (ese fix
    era necesario pero no suficiente); es que la librería three-forcegraph interpreta el
    callback como "no manejado" porque no devuelve un valor truthy, y reescribe la geometría con
    su propia línea recta default cada frame, antes de que LinkThreeObject.animate() corra.
    Explica también por qué un screenshot previo mostró líneas rectas magenta fan-out: era la
    línea recta DEFAULT de la librería, no el resultado de nuestro código.
- timestamp: 2026-09-17T00:10:00Z
  checked: usuario confirmó A/B/C fixed (warning de BufferGeometry ausente); reportó problema
    visual nuevo y separado — nodos colapsados en un punto (hub tropical-poncho y sus 6 vínculos
    apretados juntos) mientras otros quedan dispersos sin sentido (serie-uno, aislado,
    cluster-a/b). SinapsisEngine.js línea 37: `this.graph.d3Force('charge').strength(10)`.
  found: |
    En d3-force (y d3-force-3d, que usa three-forcegraph por debajo), forceManyBody().strength(x):
    negativo repele nodos (separación normal), positivo los ATRAE. Acá estaba en +10 —
    positivo— sumando atracción de charge a la atracción de 'link' sin nada que repela. git blame
    confirma que esta línea viene del commit original de Fase 3 (cee5585f, cuando se armó
    SinapsisEngine por primera vez), no algo introducido en esta sesión de debug.
  implication: ROOT CAUSE D — charge strength positivo colapsa los nodos fuertemente vinculados
    (hubs) en una masa apretada y deja a la deriva los nodos débilmente conectados, porque no hay
    fuerza de repulsión que balancee la atracción del link. Independiente de A/B/C.
- timestamp: 2026-09-17T00:15:00Z
  checked: usuario confirmó A/B/C/D fixed (layout se lee bien, hub separado de vecinos). Reportó
    problema nuevo y separado: "los links estan raros" — desde tropical-poncho hacia sus 6
    vecinos se ve un manojo de líneas casi paralelas en forma de embudo/rectángulo, como si los
    endpoints estuvieran en una grilla en vez de en las posiciones reales ya dispersas de cada
    nodo. Se leyó completo src/engine/threeObjects/linkThreeObject.js::animate() y se trazó el
    flujo start/end: SinapsisEngine.js `.linkPositionUpdate` recibe `{start,end}` ya resueltos a
    x/y/z reales por three-forcegraph (node_modules/three-forcegraph/dist/three-forcegraph.mjs
    líneas 768-789, confirmado por lectura directa), llama `setPosition(start,end)` y devuelve
    `true` (fix C de esta misma sesión sigue vigente, evita que la librería pise la geometría).
    setPosition() sólo guarda referencias — no hay objeto mutable compartido entre links.
  found: |
    `animate()` calcula `offset = Math.sin(t * Math.PI * frequency + time*speed) * amplitude`
    para cada punto de la curva, con `time = performance.now()*0.001` GLOBAL (mismo valor para
    los 6 links en el mismo frame). En t=0 (start) el argumento del seno es `0 + time*speed =
    time` — NO cero salvo coincidencia — y en t=1 (end) es `PI*frequency + time`, tampoco cero en
    general. Es decir la onda NUNCA está anclada a los extremos reales: en cualquier instante,
    los 6 links (cada uno con su propia `perpendicular` distinta por dirección, pero el mismo
    `time`) quedan desplazados de start/end real por una cantidad determinística y sincronizada
    entre todos. Confirmado por cálculo directo (no requiere browser): para frequency=4 y
    cualquier t entero múltiplo de PI, offset en el extremo no es 0.
  implication: ROOT CAUSE E — la parametrización de la onda es una "onda viajera" sin envelope de
    extremos fijos (a diferencia de una cuerda con extremos pinneados). El link nunca toca
    exactamente el nodo real; como el desplazamiento depende sólo de `t` y del `time` global
    compartido por todos los links del frame, en cualquier instante los 6 extremos quedan
    corridos de forma correlacionada — visualmente indistinguible de "los endpoints están en una
    grilla" en vez de en la posición real de cada nodo disperso, que es exactamente el reporte
    del usuario.

- timestamp: 2026-09-17T00:25:00Z
  checked: respuesta de checkpoint del usuario (dos screenshots) + grep de `activateZoomToFit`
    y `zoomToFit` en todo src/engine/
  found: |
    El fix E (envelope de onda) NO resolvió el síntoma — el usuario confirma con evidencia visual
    inequívoca que las 6 líneas de tropical-poncho convergen en un punto y abren en abanico hacia
    el borde derecho, sin tocar ningún otro nodo visible. `grep -r activateZoomToFit src/engine`
    confirma que ese método (que reencuadraría en `onEngineStop`) existe en cameraController.js
    pero tiene CERO call sites — nunca se invoca. El único `zoomToFit` real del código es la
    llamada única en `animationManager.fadeInCanvasFromBlack` (línea 103), que corre inmediatamente
    después de `graph.graphData(datos)` en `setVista` (transición 'reemplazo'), es decir ANTES de
    que `cooldownTicks(100)` termine de asentar la física con `chargeStrength: -30`.
  implication: hipótesis F formada (ver Current Focus) — no confirmada todavía, requiere el log
    de `_diagFrustum` para verificar matemáticamente si los vecinos caen fuera del frustum.
    Diagnóstico instalado en SinapsisEngine.js (setTimeout 4s + método `_diagFrustum`), pendiente
    de que el usuario recargue y pegue el output.

- timestamp: 2026-09-17T00:35:00Z
  checked: mensaje directo del usuario tras orbitar manualmente la cámara alrededor del grafo
    desde todos los ángulos ("camara sola no es... estoy rodeando las esferas y viendolo de
    todos los angulos"), más "hay 2 lineas conectas con el nodo 'serie uno'"
  found: |
    Evidencia empírica directa (no especulación): el fan-out de tropical-poncho NO desaparece al
    cambiar el ángulo de cámara — descarta frustum/zoomToFit por completo (hipótesis F,
    eliminada). Dato diferencial nuevo: `serie-uno` (2 vínculos salientes, v7/v8) sí conecta bien
    a nodos reales; `tropical-poncho` (6 vínculos salientes, v1-v6, mismo `origen` en los 6) no
    conecta ninguno. El bug no es general a todos los links — es específico de un source con
    múltiples links salientes.
  implication: hipótesis G formada (ver Current Focus). Revertido `_diagFrustum`/setTimeout de
    SinapsisEngine.js (no llegó a usarse). Instalado nuevo diagnóstico: `linkPositionUpdate`
    acumula los 9 links en `this._diagLinks` y loguea `[DIAG-LINKS]` una vez con todos juntos,
    para comparar source/target/start/end entre los 6 de tropical-poncho y los 2 de serie-uno.
    Pendiente output real del usuario antes de tocar más código.

## Eliminated (hipótesis F)

- hypothesis: "fadeInCanvasFromBlack llama zoomToFit una sola vez antes de que la física termine
    de asentarse (cooldownTicks 100), dejando a los vecinos de tropical-poncho fuera del frustum
    mientras la cámara queda fija"
  evidence: |
    Usuario orbitó manualmente la cámara 360° alrededor del grafo ("rodeando las esferas...
    viendolo de todos los angulos") y el fan-out persiste sin importar el ángulo — si fuera un
    problema de encuadre/frustum, algún ángulo de la órbita manual mostraría los links llegando
    a los nodos reales. No pasa. Frustum descartado con evidencia directa, no matemática teórica.
  timestamp: 2026-09-17T00:35:00Z

- timestamp: 2026-09-17T00:45:00Z
  checked: output real de `[DIAG-LINKS]` pegado por el usuario (los 9 links completos)
  found: |
    v1..v6 (tropical-poncho): mismo `start` (15.9,34.2,67.8) entre los 6, `end` distinto y
    razonable para cada uno. v7/v8 (serie-uno): `end` de v7 coincide exactamente con `end` de v1
    (nudo), `end` de v8 coincide exactamente con `end` de v2 (espora) — cruzado y consistente.
    Ningún id duplicado, ningún source/target invertido, ningún objeto obviamente compartido en
    los valores serializados.
  implication: hipótesis G (resolución de datos/three-forcegraph/adaptador) DESCARTADA — los
    datos que llegan a `setPosition()` son correctos para los 9 links. El bug está más abajo, en
    el renderizado real (identidad de instancias/mesh en escena, o algo en la GPU/geometría) —
    hipótesis H formada e instrumentada (ver Current Focus). Pendiente el nuevo output del
    usuario con los campos `threeObjEsInstanciaRegistrada`/`lineEsElMeshDeAnimate` y
    `[DIAG-DUPLICATE-CREATE]`.

- timestamp: 2026-09-17T00:50:00Z
  checked: output de `[DIAG-LINKS]` con `threeObjEsInstanciaRegistrada`/`lineEsElMeshDeAnimate`
    + node_modules/three/src/renderers/WebGLRenderer.js (líneas 1885-1900, frustum culling) +
    node_modules/three/src/core/BufferGeometry.js (setFromPoints, línea ~596)
  found: |
    Los 9 links dieron `threeObjEsInstanciaRegistrada: true` y `lineEsElMeshDeAnimate: true`; cero
    `[DIAG-DUPLICATE-CREATE]`. Identidad de objetos/mesh 100% correcta — hipótesis H descartada.
    WebGLRenderer.js línea 1885: `if (!object.frustumCulled || _frustum.intersectsObject(object))`
    decide si el objeto entra al draw call. `intersectsObject` (línea 1899-1900) usa
    `geometry.boundingSphere`, y `if (geometry.boundingSphere === null)
    geometry.computeBoundingSphere();` — SÓLO lo calcula si es `null`, nunca lo recalcula después.
    `BufferGeometry.setFromPoints()` (llamado cada frame en `LinkThreeObject.animate()`) reescribe
    el array de posiciones del atributo existente PERO NO toca `boundingSphere` — confirmado
    leyendo el código fuente, no asume nada. `LinkThreeObject.animate()` nunca llama
    `computeBoundingSphere()` tras `setFromPoints(points)`.
  implication: hipótesis I formada (boundingSphere congelado descarta la línea del culling) —
    mecánicamente plausible por lectura de la librería, pero NO CONFIRMADA todavía visualmente.
    Ver Eliminated: falsificada en el siguiente round por prueba directa (usuario probó el fix,
    "sigue igual").

## Eliminated (hipótesis I)

- hypothesis: "I — LinkThreeObject nunca recalcula geometry.boundingSphere tras mutar los puntos
    en animate(); WebGLRenderer lo congela la primera vez que lo necesita para frustum culling
    (WebGLRenderer.js:1885-1900, BufferGeometry.js:596), y descarta la línea del draw call en
    frames posteriores aunque el buffer GPU tenga los puntos correctos"
  evidence: |
    Fix aplicado (`this.mesh.frustumCulled = false;` en el constructor de LinkThreeObject) y el
    usuario confirmó tras recargar: "sigue igual". Si el culling fuera la causa, desactivarlo
    tendría que haber hecho aparecer las líneas — no pasó. FALSIFICADA por prueba directa, no
    sólo por lectura de código. Fix revertido de linkThreeObject.js. Van CUATRO hipótesis
    descartadas (F, G, H, I) razonando desde nuestro propio tracking/código — correctamente
    cuestionado por el usuario: que los datos que llegan a nuestro código sean correctos no
    prueba que lo que se dibuja en pantalla sea correcto. Próximo paso: dump directo de la escena
    WebGL real (`scene.traverse`), no más inferencia desde nuestro propio tracking.
  timestamp: 2026-09-17T01:00:00Z

- timestamp: 2026-09-17T01:10:00Z
  checked: confirmación del usuario con screenshot (link fan-out resuelto por fixes E, comparado
    contra captura de referencia) + node_modules/three-forcegraph/dist/three-forcegraph.mjs:471
    (default de charge de la librería) + node_modules/three/examples/jsm/controls/OrbitControls.js
    (accessor `controls()` de three-forcegraph.mjs:284-285) + GitHub issue mrdoob/three.js#32116
  found: |
    (G) three-forcegraph aplica -60 de charge por default en 3D si nunca se llama
    `.strength()` — sacar nuestra llamada explícita empeoraría el layout (-60, no 0), no lo
    achicaría; el fix correcto es bajar la magnitud de nuestro valor explícito, no sacarlo.
    (H) el crash de OrbitControls.onPointerUp es un bug abierto de three.js (issue #32116, no
    nuestro), reproducible con cualquier click de mouse porque DragControls despacha un pointerup
    sintético con pointerType:'touch' que OrbitControls no puede resolver a una posición
    trackeada. `this.graph.controls()` es un accessor real y documentado de three-forcegraph
    que devuelve la instancia de OrbitControls.
    (I) `activateZoomToFit()` existe en cameraController.js desde antes de esta sesión pero nunca
    tuvo call site — confirmado por grep previo (ver evidencia de las 00:25:00Z).
  implication: causas G/H/I confirmadas por lectura de código instalado, no especulación. Fixes
    aplicados: constants.js chargeStrength -30 -> -8 (comentario actualizado con el porqué);
    SinapsisEngine.js enableNodeDrag(true) + Proxy guard sobre controls._pointerPositions;
    SinapsisEngine.js llama cameraController.activateZoomToFit() una vez en el constructor.
    npx tsc --noEmit limpio, npm test 62/62. Pendiente confirmación visual del usuario en
    navegador real para los tres puntos.

- timestamp: 2026-09-17T01:30:00Z
  checked: reporte del usuario (9/9 links contados: 6 tropical-poncho + 2 serie-uno + 1 "en el
    aire" sin animación) + src/engine/fixtures/subgrafoDemo.js (v9 es el único con `rol` y el
    único componente aislado del grafo) + src/engine/adaptador.js (rol sólo se copia si está
    definido) + src/engine/threeObjects/ThreeObjectManager.js::createObject (try/catch que
    traga excepciones del constructor y devuelve undefined) + src/engine/threeObjects/
    ThreeObject.js::constructor (for-in que copia campos homónimos node[key]->this[key] SÓLO si
    Object.hasOwn(this,key); ni ThreeObject ni LinkThreeObject declaran un campo `rol`, así que
    por lectura de código el campo no debería activar ninguna rama distinta) +
    node_modules/three-forcegraph/dist/three-forcegraph.mjs líneas 1210-1250 (onCreateObj de
    links: si el accessor devuelve falsy, arma línea recta default con
    `obj.__graphDefaultObj = true`, exactamente el síntoma "línea recta sin animación") +
    node_modules/data-bind-mapper/src/index.js (digest usa identidad de objeto por default como
    key, sin `.id()` seteado por three-forcegraph — descarta colisión de id entre nodos y links).
  found: |
    Por lectura de código: SinapsisEngine.js `.linkThreeObject` hace
    `const objetoLink = this.threeObjectManager.createObject(link); ... return objetoLink.mesh;`
    sin chequear si `createObject` devolvió `undefined` (createObject atrapa cualquier excepción
    del constructor con try/catch + console.error y devuelve undefined implícito). Si eso pasara
    para v9, `objetoLink.mesh` tiraría TypeError leyendo `.mesh` de `undefined`, lo que haría que
    three-forcegraph reciba `customObj` falsy para ESE link puntual y caiga a su default. Esto es
    MECÁNICAMENTE PLAUSIBLE y explicaría el síntoma exacto, pero NO hay evidencia de runtime
    todavía de que el constructor efectivamente tire para v9, ni de por qué lo haría (rol no es un
    campo declarado en ThreeObject/LinkThreeObject por lectura directa del constructor).
  implication: hipótesis formada, NO confirmada — instalado diagnóstico `[DIAG-LINKOBJ]` (ver
    Current Focus) en vez de aplicar un fix a ciegas. Aprendizaje de rondas anteriores en esta
    misma sesión (F/G/H/I descartadas razonando sólo desde el código): conseguir evidencia de
    runtime real antes de tocar el fix.

- timestamp: 2026-09-17T01:45:00Z
  checked: output real de `[DIAG-LINKOBJ]` pegado por el usuario tras recargar (carga inicial,
    sin interacción).
  found: |
    Los 9 links, incluido v9, dieron `objetoLinkEsUndefined: false` y `meshEsUndefined: false`.
    Ningún `console.error` de "createObject devolvió undefined" apareció.
  implication: hipótesis "constructor tira para v9 en la carga inicial" DESCARTADA con evidencia
    directa de runtime. El usuario aportó un dato nuevo no pedido: el link roto se ve
    específicamente DESPUÉS de dragear un nodo (drag usado como técnica de diagnóstico), no en la
    carga inicial. Nueva hipótesis formada (ver Current Focus): el bug está en la interacción con
    `enableNodeDrag(true)` (feature reactivada en la ronda anterior de este mismo debug, ver fix H
    en Resolution), no en la construcción inicial de v9. Instalado diagnóstico de rango
    `[DIAG-RECREATE v9]` (throttle 2s) para capturar antes/durante/después del drag, en vez de un
    disparo único — pendiente de que el usuario reproduzca el drag y pegue el log completo.

- timestamp: 2026-09-17T01:55:00Z
  checked: src/engine/threeObjects/noiseThreeObject.js completo (shape `Noise`, usado por
    `cluster-a`/"Ana Hagen") + src/engine/threeObjects/marbleThreeObject.js (patrón de referencia
    de construcción síncrona) + src/engine/threeObjects/crossedLinesThreeObject.js (patrón de
    lectura de `node.color` con fallback) + `git log --follow` del archivo (commit `9c624ac`,
    "copy 3D engine source from collectiveConscience", 2026-08-06).
  found: |
    `NoiseThreeObject` construye el mesh SÓLO dentro del callback de éxito de
    `new HDRCubeTextureLoader().setPath('https://github.com/mrdoob/three.js/tree/master/examples/
    textures/cube/pisaHDR/').load([...], callback)`. Esa URL es una página web de GitHub, no un
    host de archivos crudos — el load falla siempre (mismo 404/CORS visible en consola durante
    toda la sesión), el callback nunca corre, y `this.mesh` queda como el `Group` vacío que pone
    el constructor base de `ThreeObject` → nodo invisible para siempre. Además: (a) usa
    `MeshPhysicalNodeMaterial` sin importar en el archivo (tiraría ReferenceError si el callback
    llegara a correr), (b) el callback es `function(hdrTexture){...}` no arrow, así que `this`
    adentro no es la instancia (`this.size`/`this.segmentWidth` serían undefined). Código legacy
    del commit `9c624ac`, anterior a esta sesión de debug entera.
  implication: ROOT CAUSE del "link v9 flotando" — el link nunca estuvo roto; conecta a un nodo
    (`cluster-a`) que nunca tuvo mesh visible, así que la línea se veía apuntando "al aire". La
    hipótesis de recreación/freeze de instancia del link (ronda anterior) era una pista falsa —
    quedó eliminada abajo sin necesitar el log DIAG-RECREATE, que se instaló pero nunca llegó a
    usarse con datos reales.

## Eliminated (hipótesis "recreación/freeze de instancia de v9 tras drag")

- hypothesis: "el drag de un nodo dispara una segunda creación de LinkThreeObject para v9, o hace
    que animateLinks() deje de invocar .animate() sobre la instancia real en escena"
  evidence: |
    Descartada sin necesitar el diagnóstico instalado (DIAG-RECREATE) — el orquestador confirmó
    por lectura directa de código que la causa real es que `cluster-a` (nodo, no link) nunca tiene
    mesh visible (ver evidencia de noiseThreeObject.js arriba). El link v9 en sí funciona igual
    que los otros 8; sólo se ve distinto porque uno de sus extremos no tiene nodo visible.
    Instrumentación revertida (SinapsisEngine.js `_diagInterval`, ThreeObjectManager.js
    `_createCallCounts`, linkThreeObject.js `_animateCallCount`) sin haber llegado a pedirle al
    usuario el log — la pista quedó cerrada antes de necesitar el experimento.
  timestamp: 2026-09-17T02:00:00Z

## Eliminated (hipótesis "createObject undefined para v9 en carga inicial")

- hypothesis: "ThreeObjectManager.createObject(link) devuelve undefined específicamente para v9
    en la carga inicial (constructor de LinkThreeObject/ThreeObject tira, tragado por el
    try/catch interno), lo que hace que objetoLink.mesh tire TypeError en el callback
    .linkThreeObject de SinapsisEngine.js y three-forcegraph caiga a su línea recta default para
    ese link puntual"
  evidence: |
    `[DIAG-LINKOBJ]` (log real del usuario, los 9 links en la carga inicial): v9 tiene
    `objetoLinkEsUndefined: false`, `meshEsUndefined: false`, igual que los otros 8. Ningún
    console.error asociado. FALSIFICADA por evidencia directa de runtime, no sólo lectura de
    código. El síntoma real aparece recién DESPUÉS de un drag manual, no en la carga — el bug está
    en otro momento del ciclo de vida del link, no en su construcción.
  timestamp: 2026-09-17T01:40:00Z

- timestamp: 2026-09-17T02:15:00Z
  checked: reporte del usuario tras confirmar fix J (Ana Hagen/cluster-a visible) + captura nueva
    marcada con un círculo rojo sobre una forma cerrada tipo rectángulo redondeado por la que
    convergen varios links + src/engine/threeObjects/linesThreeObject.js (color del nodo
    `serie-uno`, shape `Lines`).
  found: |
    `LinesThreeObject` usa `node.color ?? ThreeObject.colorsArray[2]` = `#9900FF` (violeta) para
    el material del nodo `serie-uno` — no coincide con el magenta `0xff44ff` hardcodeado en
    `LinkThreeObject` (linkThreeObject.js:22). Descarta por color la hipótesis "el rectángulo es
    el propio nodo serie-uno confundido con un link", pero no identifica la causa real todavía.
  implication: sin causa confirmada — instalado `[DIAG-FULL]` (ver Current Focus) para cruzar
    posiciones reales de los 12 nodos contra start/end reales de los 9 links, en vez de seguir
    especulando sobre la captura. Pendiente output del usuario.

- timestamp: 2026-09-17T02:30:00Z
  checked: node_modules/d3-force-3d/src/link.js línea 18 (default de `.distance()` si nunca se
    llama) + src/engine/threeObjects/linkThreeObject.js (`amplitude = 5` fijo en `animate()`) +
    src/engine/graph/constants.js (`linkDistance: 180`).
  found: |
    El default real de d3-force-3d si nunca se llama `.distance()` es una CONSTANTE fija de 30,
    no algo calculado dinámicamente (lo que el usuario asumía al pedir sacar el valor de 180).
    `linkDistance: 180` (6x ese default) hace que `amplitude:5` (fijo, no proporcional a la
    longitud del link) sea sólo ~3% de la longitud de un link típico — visualmente imperceptible
    según el ángulo de cámara en varios links, leyéndose como "recto sin animar" aunque
    `LinkThreeObject.animate()` corriera bien (dato ya confirmado en la ronda anterior con
    `[DIAG-FULL]`: start/end de los 9 links coinciden exactamente con la posición real del nodo).
    Con linkDistance:30, la misma amplitude:5 pasa a ser ~17% de la longitud — mucho más visible.
  implication: causa unificadora del "todos los links van a una línea recta"/"rectángulo de links
    convergentes" — no es un bug de datos ni de construcción, es un problema de escala: la
    amplitud fija de la onda es imperceptible contra un linkDistance 6x más grande que el default
    real de la librería. Fix K: linkDistance 180 -> 30.

- timestamp: 2026-09-17T02:45:00Z
  checked: reporte directo del usuario tras probar fix K en navegador real ("no sirvió de nada y
    está todo pegado") + stack trace real de un crash nuevo al dragear/clickear un nodo +
    node_modules/three/examples/jsm/controls/OrbitControls.js líneas 1485-1495 (`_trackPointer`)
    y 1789-1791 (`onTouchStart`).
  found: |
    `_trackPointer` tiene su propio guard: `let position = this._pointerPositions[event.pointerId];
    if (position === undefined) { position = new Vector2(); this._pointerPositions[...] = position; }
    position.set(...)`. El Proxy de root cause H devuelve `{x:0,y:0}` (objeto plano, truthy) para
    cualquier key ausente — `position === undefined` da `false`, así que `_trackPointer` nunca crea
    un `Vector2` real, y `position.set(...)` explota porque el objeto plano no tiene `.set()`.
    Stack real: `OrbitControls._trackPointer -> onTouchStart -> onPointerUp -> DragControls
    (3d-force-graph.mjs:471)`.
  implication: bug nuevo causado por nuestro propio parche de root cause H. Fix: el `get` trap del
    Proxy ahora memoiza un `THREE.Vector2()` real en `target[prop]` la primera vez que se lee una
    key ausente (en vez de devolver un objeto plano efímero) — `_trackPointer` nunca ve `undefined`
    inesperadamente y `onPointerUp` (caso original de H) sigue funcionando porque un Vector2 real
    tiene `.x`/`.y`. `SinapsisEngine.js` no importaba THREE; se agregó
    `import { resolveTHREE } from './threeObjects/threeGlobal.js'` (mismo patrón que el resto del
    motor).

- timestamp: 2026-09-17T03:15:00Z
  checked: captura del usuario tras probar el default de la librería (sin
    `.linkThreeObject`/`.linkPositionUpdate` en SinapsisEngine.js).
  found: |
    Los 9 links, con el renderizado default de 3d-force-graph (línea recta simple), conectan
    correctamente a su nodo real, ninguno se ve raro/desconectado.
  implication: el bug del "link recto sin animar" está 100% confirmado dentro de nuestro
    pipeline custom (`LinkThreeObject`/`linkPositionUpdate`), no en datos ni en física — consistente
    con `[DIAG-FULL]` de una ronda anterior (start/end siempre coinciden con la posición real).
    Restaurados los accessors custom; instalado test de bisección `amplitude:0` DENTRO del
    pipeline (ver Current Focus) para aislar entre matemática de la onda vs. resto del pipeline.

- timestamp: 2026-09-18T00:00:00Z
  checked: 4 capturas del usuario desde distintos ángulos con `amplitude=0` (bisección activa) +
    src/engine/threeObjects/linkThreeObject.js constructor (`initialPoints` preasignado en
    `(0,0,0)`).
  found: |
    Con amplitude=0 (lerp puro, sin onda) un link debería verse como una línea perfectamente
    recta entre start y end. En cambio, las líneas de tropical-poncho se doblan en un punto
    COMPARTIDO por varios links a la vez antes de llegar a su destino real — patrón de "abanico
    con bisagra compartida" en las 4 capturas, consistente desde todos los ángulos (no es
    artefacto de perspectiva).
  implication: el doblez confirma que NO todos los 31 puntos del buffer de cada link son el lerp
    correcto — descarta que el bug esté sólo en la matemática de la onda (amplitude=0 ya la
    saca del cálculo y el problema persiste). Hipótesis formada: puntos STALE compartidos en
    (0,0,0), el valor inicial del constructor, sin sobreescribir por animate() — candidato: dos
    loops de rAF independientes (three-forcegraph/3d-force-graph vs. SinapsisEngine._tick())
    pisándose. Instalado `[DIAG-BUFFER]` (ver Current Focus) para confirmar con el array crudo de
    la GPU antes de aplicar cualquier fix.

- timestamp: 2026-09-18T00:20:00Z
  checked: `[DIAG-BUFFER]` (log real del usuario, 9 links con array crudo de 31 puntos +
    start/end esperado). Verificación manual: para v1 y v9, cálculo a mano del punto medio
    esperado (i=15/31, t=0.5) de `lerpVectors(start, end, 0.5)` comparado contra el valor real del
    buffer en esa posición.
  found: |
    Coincidencia exacta (precisión de punto flotante) en ambos links revisados. Ningún punto del
    buffer está en (0,0,0) ni en ningún otro valor fuera de la línea start-end.
  implication: el buffer de geometría es matemáticamente correcto — descarta por completo la
    hipótesis de puntos stale/loops de rAF pisándose. El "doblez"/"abanico con bisagra compartida"
    de las 4 capturas es un efecto óptico de proyección 2D (6 líneas 3D independientes,
    perfectamente rectas, que se CRUZAN en pantalla desde cierto ángulo de cámara), no un bug de
    los links. Restaurado amplitude:5, revertido DIAG-BUFFER. Pendiente confirmación del usuario
    desde un ángulo distinto (top-down) para cerrar definitivamente este misterio como "nunca fue
    un bug".

## Eliminated (root cause K, linkDistance:30)

- hypothesis: "bajar linkDistance de 180 a 30 (default real de d3-force-3d) hace que la onda de
    amplitude:5 fija sea proporcionalmente más visible y resuelve el link recto sin animar"
  evidence: |
    Prueba directa del usuario en navegador real: "no sirvió de nada y está todo pegado" — el
    layout quedó demasiado apretado/superpuesto, empeoró en vez de mejorar. FALSIFICADA por
    evidencia directa. Revertido a linkDistance:180. El misterio del link recto sigue sin causa
    confirmada — queda abierto para una futura ronda, no forzar más ajustes de linkDistance sin
    nueva evidencia.
  timestamp: 2026-09-17T02:45:00Z

## Resolution

root_cause: |
  CINCO causas independientes confirmadas hasta ahora (E sigue pendiente de verificación visual;
  el fan-out real de tropical-poncho AÚN NO tiene causa confirmada — F, G, H e I fueron
  descartadas, ver Eliminated; investigación en curso con dump directo de la escena WebGL):
  (A) `SinapsisEngine._tick` aplica `applySafeArea` en cada frame sin condicionar a que haya un
      nodo enfocado, comprimiendo la vista general/overview dentro del área libre del 38% desde
      el primer frame — contradice MOTR-08 ("encuadra el NODO ENFOCADO").
  (B) `enableNodeDrag` (default `true` de 3d-force-graph) arma un DragControls por nodo; su
      workaround de "simular pointerup" para no dejar pegado a OrbitControls dispara un evento
      sintético sin position tracking para mouse, y OrbitControls crashea leyendo `.x` de
      `undefined` — bug de interacción entre dos librerías de terceros, no de nuestro código.
  (C) `three-forcegraph` interpreta el valor de retorno de `linkPositionUpdate` como "¿lo
      manejaste vos?"; el callback del motor en `SinapsisEngine.js` no devolvía nada (falsy) →
      la librería pisaba el atributo `position` de la geometría con su línea recta default de 2
      puntos CADA FRAME, justo antes de que `LinkThreeObject.animate()` escribiera sus 31 puntos
      encima → mismatch de tamaño de buffer, warning constante, vínculos nunca correctos. El
      preasignado de 31 puntos en el constructor (fix intermedio) era necesario pero no
      suficiente sin este segundo fix.
  (D) `SinapsisEngine` configuraba `d3Force('charge').strength(10)` — positivo, que ATRAE nodos
      entre sí en vez de repelerlos. Sumado a la atracción de 'link', colapsaba hubs fuertemente
      vinculados en una masa apretada y dejaba a la deriva los nodos débilmente conectados.
      Código original de Fase 3 (commit cee5585f), no introducido en esta sesión.
  (E) `LinkThreeObject.animate()` calculaba el offset perpendicular de la onda como una onda
      viajera pura (`sin(t*PI*frequency + time*speed)`), sin envelope que la fuerce a 0 en los
      extremos (t=0/t=1). El link nunca tocaba la posición real del nodo — quedaba desplazado por
      una cantidad que depende sólo de `time` (global, compartido por los 6 links del hub en el
      mismo frame), lo que se leía visualmente como endpoints "alineados en grilla" en vez de en
      las posiciones reales ya dispersas de cada nodo (fix D). Código original de Fase 3, no
      introducido en esta sesión.
  (fan-out de tropical-poncho): RESUELTO por fix E — confirmado por el usuario con screenshot
      (6 líneas limpias, comparable a referencia). Las hipótesis F/G(datos)/H(instancias)/I
      (boundingSphere) del round anterior quedan descartadas en Eliminated, sin fix propio —
      el fix real era E, sólo tapado visualmente por el charge +10 (D) hasta que ambos se
      arreglaron.
  (G, este round) `chargeStrength: -30` separaba el "ramo" de vecinos de tropical-poncho más de
      lo que muestra la referencia. Sacar la llamada empeoraría (three-forcegraph aplica -60 de
      default en 3D si nunca se le llama `.strength()`, three-forcegraph.mjs:471) — el layout
      necesita un charge explícito bastante MÁS chico en magnitud, no ausente.
  (H, este round) crash real al dragear/clickear un nodo con mouse: bug abierto de three.js
      (mrdoob/three.js#32116). DragControls despacha un pointerup sintético con
      pointerType:'touch' al terminar un drag; OrbitControls sólo trackea posiciones para
      punteros touch reales en `_pointerPositions`, así que el puntero de mouse real queda sin
      entrada ahí y `onPointerUp` lee `.x` de `undefined`.
  (I, este round) el grafo arranca diminuto: `fadeInCanvasFromBlack` llama `zoomToFit` una sola
      vez, apenas arranca la física (nodos amontonados en su spawn), y la cámara nunca se
      reajusta cuando los nodos terminan de dispersarse. `activateZoomToFit()`
      (cameraController.js) existía pero nunca se llamaba.
  (K, DESCARTADA por prueba directa — ver Eliminated) se probó `linkDistance:180 -> 30` como
      posible causa del "link recto sin animar"; el usuario confirmó que empeoró el layout
      ("todo pegado"), revertido a 180. El misterio del link recto SIGUE SIN causa confirmada.
  (H2, este round) crash NUEVO al dragear/clickear, causado por nuestro propio parche de H: el
      Proxy sobre `_pointerPositions` devolvía un objeto plano `{x:0,y:0}` para keys ausentes;
      `OrbitControls._trackPointer` (vía `onTouchStart`) chequea `position === undefined` para
      decidir si crea su propio `Vector2` — como el objeto plano es truthy, nunca lo creaba, y
      `position.set(...)` explotaba porque el objeto plano no tiene `.set()`.
  (J, este round) link v9 (cluster-a→cluster-b) se veía "flotando", recto, sin animación:
      `NoiseThreeObject` (shape `Noise`, usado por `cluster-a`/"Ana Hagen") nunca construye su
      mesh — depende de un `HDRCubeTextureLoader` apuntando a una URL de página web de GitHub
      (no un host de archivos crudos), que siempre falla, así que el callback de éxito (el único
      lugar donde se agrega el mesh) nunca corre. El nodo queda invisible para siempre desde el
      commit `9c624ac` (2026-08-06, copia del engine de `collectiveConscience`), ajeno a esta
      sesión de debug. El link v9 nunca estuvo roto — conecta correctamente, sólo que uno de sus
      extremos no tenía nodo visible, así que se leía como "flotando en el aire".
fix: |
  (A) src/engine/SinapsisEngine.js `_tick`: sólo llamar `applySafeArea` cuando
      `this._nodoEnfocado` existe; si no hay nodo enfocado, `clearSafeArea()` para que la vista
      general use el frustum centrado normal.
  (B) src/engine/SinapsisEngine.js constructor: `.enableNodeDrag(false)` en la cadena de
      ForceGraph3D — nada en REQUIREMENTS.md pide arrastrar nodos; desactivar la feature elimina
      el DragControls entero y con él el código que crashea. onNodeClick sigue funcionando (no
      depende de DragControls).
  (C1) src/engine/threeObjects/linkThreeObject.js constructor: pre-alocar la geometría inicial
      con `segments+1` puntos (mismo conteo que `animate()` escribe cada frame) en vez de 2.
  (C2, fix real) src/engine/SinapsisEngine.js `.linkPositionUpdate(...)`: el callback ahora
      `return true;` al final, para que three-forcegraph sepa que el update fue manejado y no
      pise la geometría con su línea recta default cada frame.
  (D) src/engine/graph/constants.js: nuevo `GLOBAL_DEFAULT_SETTINGS.chargeStrength: -30` (default
      de d3-force, negativo = repele). src/engine/SinapsisEngine.js: `d3Force('charge').strength(10)`
      -> `.strength(GLOBAL_DEFAULT_SETTINGS.chargeStrength)`. Queda como constante ajustable junto
      a `linkDistance` en vez de número mágico inline, porque es un parámetro de tuning visual.
  (E) src/engine/threeObjects/linkThreeObject.js `animate()`: multiplicar el offset por
      `envelope = Math.sin(t * Math.PI)`, que vale exactamente 0 en t=0 y t=1 y máximo en el
      medio — pinnea los extremos del link a start/end reales sin tocar la forma de onda del
      medio. También se sacó el `console.log('[LINKDEBUG]', ...)` de un solo disparo que quedó
      de la sesión anterior (ya cumplió su propósito de diagnosticar root cause C).
  (fan-out de tropical-poncho): fix E confirmado suficiente por el usuario — sin fix adicional.
  (G) src/engine/graph/constants.js: `chargeStrength: -30` -> `-8`, comentario actualizado
      explicando por qué no es 0 (default de la librería es -60 en 3D) ni -30 (infla el ramo
      más que la referencia). Ajustable a ojo si -8 no es el número final.
  (H) src/engine/SinapsisEngine.js constructor: `.enableNodeDrag(false)` -> `.enableNodeDrag(true)`.
      Después de crear `this.graph`, `this.graph.controls()` obtiene la instancia real de
      OrbitControls y se envuelve `controls._pointerPositions` en un `Proxy` cuyo `get` trap
      devuelve `{x:0,y:0}` para cualquier key ausente en vez de `undefined` — workaround de un
      bug abierto de three.js (mrdoob/three.js#32116), comentado con el issue y la condición de
      salida (nueva versión de three con el fix).
  (I) src/engine/SinapsisEngine.js constructor: `this.cameraController.activateZoomToFit()`
      llamado una vez después de `setupCamera()`. `activateZoomToFit()` ya existía en
      cameraController.js (`onEngineStop(() => zoomToFit(700))`), sólo le faltaba el call site.
  (J) src/engine/threeObjects/noiseThreeObject.js: reescrito para construir el mesh de forma
      SÍNCRONA en el constructor (mismo patrón que `MarbleThreeObject`: esfera compartida vía
      `ThreeObject.getSharedGeometry`, tamaño/segmentos desde `this.size`/`this.segmentWidth`/
      `this.segmentHeight`), sin ninguna carga de textura externa. Material
      `THREE.MeshStandardMaterial` con `color: node.color ?? 0xffffff` (mismo patrón de fallback
      que `CrossedLinesThreeObject`), roughness fijo. Se sacó `HDRCubeTextureLoader`,
      `MeshPhysicalNodeMaterial` (nunca importado) y el callback con `this` roto.
  (K, revertido) src/engine/graph/constants.js: `linkDistance` vuelto de `30` a `180` tras
      confirmación negativa del usuario. Comentario actualizado explicando que se probó y se
      descartó, para no reintentarlo sin evidencia nueva.
  (H2) src/engine/SinapsisEngine.js: el `get` trap del Proxy sobre `controls._pointerPositions`
      ahora memoiza `new THREE.Vector2()` en `target[prop]` la primera vez que se lee una key
      ausente (en vez de devolver `{x:0,y:0}` efímero), para que `_trackPointer` nunca vea
      `undefined` inesperadamente y `.set()` funcione. Se agregó
      `import { resolveTHREE } from './threeObjects/threeGlobal.js'` (SinapsisEngine.js no
      importaba THREE antes).
verification: |
  npx tsc --noEmit: 0. npm test: 62/62 pass. A/B/C/D/E confirmados por el usuario en navegador
  real (screenshot con 6 links limpios, comparable a referencia). G/I aplicados en una ronda
  anterior, verificados por lectura de código fuente instalado pero AÚN NO confirmados
  visualmente — sigue pendiente. H originalmente aplicado pero causó un crash nuevo (ver H2); H2
  recién aplicado, verificado por lectura de código (OrbitControls.js `_trackPointer`) y npx
  tsc/npm test, AÚN NO confirmado visualmente. J confirmado por el usuario en navegador real (Ana
  Hagen/cluster-a visible). K probado y DESCARTADO por el usuario (empeoró el layout), revertido.
  Pendiente checkpoint de human-verify: (1) layout volvió a como estaba antes de tocar
  linkDistance, (2) dragear/clickear un nodo ya NO tira ningún error (ni el original ni el nuevo
  de H2). El misterio del "link recto sin animar" SIGUE ABIERTO, sin causa confirmada. `kutral`
  (shape Fire, 404 de explosion.png) es un caso DISTINTO no tocado por ningún fix de esta sesión —
  si sigue invisible, investigar aparte, no asumir misma causa.
files_changed:
  - src/engine/SinapsisEngine.js
  - src/engine/graph/constants.js
  - src/engine/threeObjects/noiseThreeObject.js
  - src/engine/threeObjects/linkThreeObject.js

## Known Issue (no bloqueante, fuera de alcance de esta sesión)

fireThreeObject.js:14 carga /images/explosion.png que no existe en public/images/ (404 en
consola). Usado por el nodo 'kutral' (shape Fire) del fixture de desarrollo. Cosmético — no
afecta el grafo core. Decidir en otra sesión si se agrega el asset o se cambia la ruta.
