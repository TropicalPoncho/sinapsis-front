// El esqueleto del motor: compone ForceGraph3D + ThreeObjectManager + CameraController +
// AnimationManager y expone únicamente `setVista`/`on` como superficie de datos (más
// `constructor`/`destruir`, que son ciclo de vida — existen porque el puente desmonta).
// Nada del framework de UI, nada de `next/`: el elemento del DOM llega por parámetro.
import ForceGraph3D from '3d-force-graph';
import { resolveTHREE } from './threeObjects/threeGlobal.js';
const THREE = resolveTHREE();
import { ThreeObjectManager } from './threeObjects/ThreeObjectManager.js';
import { ThreeObject } from './threeObjects/ThreeObject.js';
import './threeObjects/registerTypes.js';        // efecto: registra los 15 tipos
import { CameraController } from './graph/cameraController.js';
import { AnimationManager } from './graph/animationManager.js';
import { Background } from './graph/background.js';
import { GLOBAL_DEFAULT_SETTINGS, ANIMATION_SETTINGS } from './graph/constants.js';
import { adaptarSubgrafo } from './adaptador.js';
import { clasificarCambio, pinear, fusionar, desvanecerYQuitar } from './graph/transiciones.js';

export class SinapsisEngine {
    constructor(elemento, opciones = {}) {
        this.opciones = opciones; // guarda getAreaSegura, si viene (lo usa el Plan 05)
        this._handlers = {};
        this._subgrafo = null;
        this._areaSegura = undefined;
        this._nodoEnfocado = null;
        this._fps = 0;
        this._fpsFrames = 0;
        this._fpsVentanaInicio = performance.now();

        this.graph = ForceGraph3D({ controlType: 'orbit' })(elemento)
            .nodeLabel('name')
            .numDimensions(GLOBAL_DEFAULT_SETTINGS.numDimensions)
            .dagLevelDistance(GLOBAL_DEFAULT_SETTINGS.dagLevelDistance)
            // Sólo fijable al construir: cambiarlo después de la primera carga rompe el tick
            // (three-forcegraph#layoutTick llama a state.layout['tick'|'step'] según este valor,
            // y el layout viejo no tiene el método del engine nuevo). Ver DebugPanel.tsx.
            .forceEngine(opciones.forceEngine ?? 'd3')
            // Pre-simula la física antes del primer frame: el grafo nace ya asentado y encuadrable.
            // ponytail: bloquea el hilo mientras corren los ticks (crece con los nodos, sin medir aún); la carga progresiva lo reemplazaría.
            .warmupTicks(300)
            .enableNodeDrag(true)
            .d3AlphaMin(GLOBAL_DEFAULT_SETTINGS.d3AlphaMin)
            .d3AlphaDecay(GLOBAL_DEFAULT_SETTINGS.d3AlphaDecay)
            .d3VelocityDecay(GLOBAL_DEFAULT_SETTINGS.d3VelocityDecay)
            .cameraPosition({ z: GLOBAL_DEFAULT_SETTINGS.cameraDistance });

        // ponytail: workaround de un bug ABIERTO de three.js (mrdoob/three.js#32116), no de
        // nuestro código. 3d-force-graph, al terminar un drag, despacha un pointerup sintético
        // (pointerType:'touch') para no dejar OrbitControls pegado. OrbitControls sólo puebla
        // `_pointerPositions` para punteros touch reales — el puntero de mouse real queda en
        // `_pointers` pero nunca en `_pointerPositions`, y onPointerUp lee `.x` de `undefined`
        // -> crash (root cause B, 03-06). El primer guard devolvía un objeto plano {x:0,y:0}
        // para keys ausentes, pero rompía OTRO camino real: `_trackPointer` (llamado desde
        // onTouchStart) chequea `position === undefined` para decidir si crea un Vector2 propio;
        // como nuestro objeto plano es truthy, nunca lo creaba, y el `position.set(...)` de
        // abajo tiraba porque un objeto plano no tiene `.set()` (crash nuevo, causado por este
        // mismo parche). Fix: memoizar un THREE.Vector2 real la primera vez que se lee una key
        // ausente, guardado en el target — así _trackPointer nunca ve undefined inesperadamente
        // (cae directo a position.set(), que sí existe) y onPointerUp sigue leyendo .x de un
        // Vector2 real. Sacar este Proxy el día que se actualice three.js con el fix del issue.
        const controls = this.graph.controls();
        if (controls?._pointerPositions) {
            controls._pointerPositions = new Proxy(controls._pointerPositions, {
                get: (target, prop) => {
                    if (!(prop in target)) target[prop] = new THREE.Vector2();
                    return target[prop];
                },
            });
        }
        // Perillas de tuning visual (llegan por query params desde el puente, ver CanvasSinapsis):
        // charge = fuerza de repulsión; sin valor, queda el default de la librería.
        if (opciones.charge !== undefined) this.graph.d3Force('charge').strength(opciones.charge);
        // Distancia por link: `link.distance` si viene; si no, el default crece con el grado de
        // los extremos, así los hubs con muchos vínculos tienen más espacio (ver _distanciaPorGrado).
        this.graph.d3Force('link').distance(link => link.distance ?? this._distanciaPorGrado(link));

        // Se lee el accesor, nunca se le asigna encima: reemplazar `camera()` por una
        // instancia rompe `graph2ScreenCoords`/`screen2GraphCoords` (MOTR-12, Plan 05), que
        // llaman a `this.camera()` como función internamente. Ese es el bug de mundo.js:104
        // que no se porta acá.
        this.camera = this.graph.camera();
        this.renderer = this.graph.renderer();
        this.scene = this.graph.scene();
        this.background = new Background(this.scene);

        // 'Hover' como en la web original: sólo se anima el nodo bajo el mouse (PERF-01).
        this.threeObjectManager = new ThreeObjectManager({ animationType: 'Hover' });
        this.cameraController = new CameraController(this.graph, this.camera, this.renderer);
        this.cameraController.setupCamera();
        // Sin activateZoomToFit: con warmupTicks(300) la física ya llega asentada y el encuadre
        // se hace una vez, detrás del negro. Un zoomToFit al parar el motor pisaba, con retardo,
        // el encuadre del nodo enfocado (checklist 03-06 #7/#11/#12).
        this.animationManager = new AnimationManager(this.graph, this.threeObjectManager, this.cameraController);

        this.graph
            .nodeThreeObject(node => {
                const mesh = this.threeObjectManager.createObject(node);
                // Escala visual del nodo: las fuerzas no la ven (no cambia el layout), sólo el tamaño en pantalla.
                const escala = this.opciones.escalaNodos ?? 1;
                if (mesh) mesh.scale.setScalar(escala);
                // Nodos que entran por filtrado/aditivo: aparecen creciendo desde 0 (la creación
                // ocurre en el digest diferido de la librería, por eso se engancha acá).
                if (mesh && this._idsEntrando?.delete(node.id)) this._aparecer(mesh, escala);
                return mesh;
            })
            .linkThreeObject(link => {
                link.type = 'SinLink';
                const objetoLink = this.threeObjectManager.createObject(link);
                if (!objetoLink) return null; // createObject ya logueó el error del constructor
                link._threeObj = objetoLink;
                return objetoLink.mesh;
            })
            // El retorno `true` le dice a la librería que la geometría ya está actualizada
            // (falsy => pisa el mesh con su línea recta de 2 puntos).
            .linkPositionUpdate((line, { start, end }, link) => {
                link._threeObj?.setPosition(start, end);
                return true;
            })
            .onNodeHover(n => {
                this.animationManager.animateNode(n);
                this._emitir('nodeHover', n);
            })
            .onNodeClick(n => this._emitir('nodeClick', n));

        this.cameraController.resize();
        this._onResize = () => this.cameraController.resize();
        window.addEventListener('resize', this._onResize);

        this._tick();
    }

    // MOTR-08: el área segura se LEE cuadro a cuadro (pull) en vez de esperar que la UI la
    // empuje — con el scroll cambiando el rect a cada frame, pull es más barato que 60 llamadas
    // por segundo, y la superficie pública sigue siendo sólo `setVista`/`on`.
    _tick = () => {
        // MOTR-08 encuadra el NODO ENFOCADO dentro del área segura, no la vista general: sin
        // nodo enfocado, applySafeArea comprimiría el overview entero dentro del área libre
        // desde el primer frame (bug real de 03-06, la vista general no tiene por qué esquivar
        // un panel que todavía no está mostrando nada de ese nodo).
        const area = this.opciones.getAreaSegura?.() ?? this._areaSegura;
        // El offset entra y sale de forma gradual (misma duración que el tween de cámara): aplicarlo
        // de golpe movía toda la red unos píxeles antes de que la cámara empezara a acercarse.
        const ahora = performance.now();
        const paso = (ahora - (this._ultimoTick ?? ahora)) / ANIMATION_SETTINGS.CAMERA_TRANSITION_DURATION;
        this._ultimoTick = ahora;
        const objetivo = area && this._nodoEnfocado ? 1 : 0;
        this._mezclaArea = Math.min(1, Math.max(0, (this._mezclaArea ?? 0) + (objetivo ? paso : -paso)));
        const k = this._mezclaArea * this._mezclaArea * (3 - 2 * this._mezclaArea); // smoothstep
        if (area && k > 0) this.cameraController.applySafeArea(area, window.innerWidth, window.innerHeight, k);
        else this.cameraController.clearSafeArea();
        // No se dispara un segundo pintado del frame acá: 3d-force-graph ya corre su propio
        // loop (incluido tweenGroup.update()) y hacerlo de nuevo duplicaría los draw calls
        // que PERF-01 va a medir — ése era el bug de doble render de mundo.js.
        this.animationManager.animate(); // uniforms de shaders + links
        this._emitirFocoSiSeMovio();
        this._actualizarFps();
        this._raf = requestAnimationFrame(this._tick);
    };

    // Grado (cantidad de vínculos) de cada nodo, cacheado por identidad del array de links: se
    // recalcula solo cuando graphData() trae links nuevos. d3 llama a la distancia una vez por
    // link al inicializar, no por tick, así que no pesa en el loop.
    _distanciaPorGrado(link) {
        const links = this.graph.graphData().links;
        if (this._grados?.links !== links) {
            const mapa = new Map();
            for (const l of links) for (const e of [l.source, l.target]) mapa.set(e.id ?? e, (mapa.get(e.id ?? e) ?? 0) + 1);
            this._grados = { links, mapa };
        }
        const g = e => this._grados.mapa.get(e.id ?? e) ?? 1;
        // ponytail: raíz del grado y factor a ojo; un nodo de grado 1 con otro de grado 1 da la
        // distancia base. Si la red real necesita otra curva, es esta línea (o `link.distance`).
        return GLOBAL_DEFAULT_SETTINGS.linkDistance * (1 + GLOBAL_DEFAULT_SETTINGS.linkDistanciaPorGrado * (Math.sqrt(g(link.source)) + Math.sqrt(g(link.target)) - 2));
    }

    // graphData() se procesa diferido: hasta entonces los objetos viejos siguen en la escena. Si se
    // liberan antes, el siguiente render los vuelve a subir a la GPU (fuga vista en el checklist
    // 03-06 #10: 800 -> 12 nodos dejaba 257 texturas). Se libera recién después del procesamiento.
    async _liberarTrasDigest(idsQueSeQuedan) {
        await new Promise(r => setTimeout(r, 50));
        this.threeObjectManager.disposeUnusedObjects(idsQueSeQuedan);
    }

    _aparecer(mesh, escala) {
        const duracion = ANIMATION_SETTINGS.NODE_FADE_DURATION;
        const inicio = performance.now();
        mesh.scale.setScalar(0.001);
        const paso = ahora => {
            const t = Math.min((ahora - inicio) / duracion, 1);
            mesh.scale.setScalar(Math.max(escala * t, 0.001));
            if (t < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
    }

    // PERF-01: promedio móvil de ~1s, no un delta crudo por frame (demasiado ruidoso para leer).
    _actualizarFps() {
        this._fpsFrames++;
        const ahora = performance.now();
        const transcurrido = ahora - this._fpsVentanaInicio;
        if (transcurrido >= 1000) {
            this._fps = Math.round((this._fpsFrames * 1000) / transcurrido);
            this._fpsFrames = 0;
            this._fpsVentanaInicio = ahora;
        }
    }

    // ponytail: método de debug, no parte de la superficie pública (que sigue siendo
    // setVista/on/destruir). Existe para PERF-01 y para el día que haya que volver a medir.
    // Barato: lee contadores que three ya mantiene.
    // Qué hay vivo de verdad: sirve para distinguir una fuga (memoria de GPU > lo que la escena
    // referencia) de objetos que la librería todavía no quitó de la escena.
    _censoEscena() {
        const texturas = new Set();
        let objetos = 0;
        this.scene.traverse(o => {
            objetos++;
            for (const m of [o.material].flat()) {
                if (!m) continue;
                for (const v of Object.values(m)) if (v?.isTexture) texturas.add(v);
                for (const u of Object.values(m.uniforms ?? {})) if (u?.value?.isTexture) texturas.add(u.value);
            }
        });
        // También las que las instancias tienen en sus uniforms (no cuelgan del material).
        for (const inst of Object.values(this.threeObjectManager._objectInstances)) {
            for (const g of [inst.uniforms, inst.localUniforms]) {
                for (const u of Object.values(g ?? {})) if (u?.value?.isTexture) texturas.add(u.value);
            }
        }
        return { objetosEscena: objetos, texturasEnEscena: texturas.size, instancias: Object.keys(this.threeObjectManager._objectInstances).length };
    }

    _perf() {
        const info = this.renderer.info;
        const nodos = this.graph.graphData().nodes.length;
        return {
            fps: this._fps,
            nodos,
            drawCalls: info.render.calls,
            drawCallsPorNodo: nodos ? info.render.calls / nodos : 0,
            triangulos: info.render.triangles,
            geometrias: info.memory.geometries,
            texturas: info.memory.textures,
            ...this._censoEscena(),
        };
    }

    // MOTR-12: un punto, no una región ni un lado — lo único que la UI necesita del nodo enfocado.
    _emitirFocoSiSeMovio() {
        const n = this._nodoEnfocado;
        if (!n) return;
        const p = this.graph.graph2ScreenCoords(n.x, n.y, n.z); // ya contempla el offset activo
        // ponytail: se emite cuando el punto se movió más de 1px, que durante una animación de
        // cámara son ~60 eventos/s. Si un consumidor re-renderiza de más, acá va un throttle.
        if (!this._ultimoFoco || Math.abs(p.x - this._ultimoFoco.x) > 1 || Math.abs(p.y - this._ultimoFoco.y) > 1) {
            this._ultimoFoco = p;
            this._emitir('nodeFocus', { nodeId: n.id, screen: p });
        }
    }

    // Debug: tuning en vivo de la simulación de fuerzas (3d-force-graph/d3-force-3d) desde un
    // panel de desarrollo — no es parte del flujo normal de navegación, que sigue siendo sólo
    // setVista. Cada campo es opcional; sólo se toca lo que venga definido.
    configurarFuerzas(cfg = {}) {
        const g = this.graph;
        if (cfg.numDimensions !== undefined) g.numDimensions(cfg.numDimensions);
        if (cfg.dagMode !== undefined) g.dagMode(cfg.dagMode || null);
        if (cfg.dagLevelDistance !== undefined) g.dagLevelDistance(cfg.dagLevelDistance);
        if (cfg.d3AlphaMin !== undefined) g.d3AlphaMin(cfg.d3AlphaMin);
        if (cfg.d3AlphaDecay !== undefined) g.d3AlphaDecay(cfg.d3AlphaDecay);
        if (cfg.d3VelocityDecay !== undefined) g.d3VelocityDecay(cfg.d3VelocityDecay);
        if (cfg.linkDistance !== undefined) GLOBAL_DEFAULT_SETTINGS.linkDistance = cfg.linkDistance;
        if (cfg.linkDistanciaPorGrado !== undefined) GLOBAL_DEFAULT_SETTINGS.linkDistanciaPorGrado = cfg.linkDistanciaPorGrado;
        if (cfg.linkDistance !== undefined || cfg.linkDistanciaPorGrado !== undefined) {
            this._grados = null; // el caché de grados quedó atado a los parámetros viejos
            g.d3Force('link').distance(link => link.distance ?? this._distanciaPorGrado(link));
        }
        if (cfg.chargeStrength !== undefined) g.d3Force('charge').strength(cfg.chargeStrength);
        g.d3ReheatSimulation();
    }

    // Debug: multiplicador global de la animación interna de cada forma (shader/time, no la
    // posición del nodo en el layout — eso lo maneja configurarFuerzas). 1 = velocidad curada tal
    // cual; <1 la frena. Estático en ThreeObject, no hay que recorrer los objetos ya creados.
    configurarAnimacion({ velocidad } = {}) {
        if (velocidad !== undefined) ThreeObject.multiplicadorVelocidad = velocidad;
    }

    on(evento, handler) {
        (this._handlers[evento] ??= new Set()).add(handler);
        return () => this._handlers[evento]?.delete(handler);
    }

    _emitir(evento, payload) {
        this._handlers[evento]?.forEach(h => h(payload));
    }

    // nodoEnfocado: undefined no toca el foco, null desenfoca, un id enfoca.
    // NO es reentrante: el puente serializa las llamadas (UI-10).
    async setVista(subgrafo, { transicion = 'reemplazo', areaSegura, nodoEnfocado } = {}) {
        this._subgrafo = subgrafo;
        this._areaSegura = areaSegura ?? this._areaSegura;

        switch (transicion) {
            case 'filtrado': {
                // Conserva instancias/posiciones de lo que sigue en la Vista, desvanece y
                // libera lo que sale. La transición sale sólo de `transicion`: no se mira
                // el Subgrafo (raíz, profundidad) para decidir la rama (MOTR-06).
                const actuales = this.graph.graphData().nodes;
                const datos = adaptarSubgrafo(subgrafo);
                const { quedan, salen, entran } = clasificarCambio(actuales, datos.nodes);
                pinear(quedan); // sobreviven al reheat de graphData()
                this._idsEntrando = new Set(entran.map(n => n.id));
                await desvanecerYQuitar(this.threeObjectManager, salen.map(n => n.id), ANIMATION_SETTINGS.NODE_FADE_DURATION);
                this.graph.graphData({ nodes: fusionar(quedan, entran), links: datos.links });
                await this._liberarTrasDigest(datos.nodes.map(n => n.id)); // MOTR-07
                // ponytail: los nodos filtrados quedan pineados (no se llama soltarPin); si una
                // Vista futura los necesita libres para volver a responder a fuerzas, ahí se
                // llama `soltarPin` en `onEngineStop`.
                this._emitir('vistaLista', { transicion, nodos: datos.nodes, entran, salen });
                break;
            }
            case 'aditivo': {
                // Suma nodos nuevos sin tocar lo existente: nada sale de escena, no hay dispose.
                const actuales = this.graph.graphData().nodes;
                const datos = adaptarSubgrafo(subgrafo);
                const { entran } = clasificarCambio(actuales, datos.nodes);
                pinear(actuales); // el esqueleto existente no se mueve
                this._idsEntrando = new Set(entran.map(n => n.id));
                const linksPorId = new Map();
                for (const l of this.graph.graphData().links) linksPorId.set(l.id, l);
                for (const l of datos.links) linksPorId.set(l.id, l);
                this.graph.graphData({ nodes: [...actuales, ...entran], links: [...linksPorId.values()] });
                // Sin animación de entrada propia en esta fase: la promesa resuelve apenas
                // graphData() termina de aplicarse — no hay fundido para 'aditivo' (CONTEXT.md).
                this._emitir('vistaLista', { transicion, nodos: datos.nodes, entran, salen: [] });
                break;
            }
            case 'reemplazo':
            default: {
                // Primera carga: no hay red que ocultar, el fundido de salida sólo agrega negro.
                if (this.graph.graphData().nodes.length) await this.animationManager.fadeOutCanvasToBlack(this._nodoEnfocado ?? null, ANIMATION_SETTINGS.FADE_DURATION);
                const datos = adaptarSubgrafo(subgrafo);
                performance.mark('sinapsis:graphData:inicio'); // PERF-01: dónde se va el tiempo de carga
                this.graph.graphData(datos);
                performance.mark('sinapsis:graphData:fin');
                await this.animationManager.fadeInCanvasFromBlack(ANIMATION_SETTINGS.FADE_DURATION);
                await this._liberarTrasDigest(datos.nodes.map(n => n.id)); // MOTR-07
                this._emitir('vistaLista', { transicion, nodos: datos.nodes.length });
                // La promesa resuelve recién acá, después del último await: eso es MOTR-09.
                // `cameraPosition()` no expone `onComplete` (verificado contra el source
                // instalado, ver 03-RESEARCH.md); el `setTimeout(ms)` que usan
                // fadeOutCanvasToBlack/fadeInCanvasFromBlack por debajo es exacto, no una
                // aproximación — el tween de @tweenjs/tween.js termina justo en `ms`.
                break;
            }
        }

        // MOTR-09/12: el encuadre corre después de la transición, nunca en paralelo — la
        // promesa de setVista resuelve recién cuando la cámara llegó. `nodoEnfocado` es un id;
        // si no está en el Subgrafo recién aplicado, no enfoca y no emite — sin throw.
        if (nodoEnfocado) {
            const nodo = this.graph.graphData().nodes.find(n => n.id === nodoEnfocado);
            const area = this.opciones.getAreaSegura?.() ?? this._areaSegura;
            if (nodo && area) {
                // _nodoEnfocado se marca ANTES del await: _tick ya aplica applySafeArea durante
                // el tween (no sólo al final), si no el frustum saltaría recién al terminar la
                // animación en vez de acompañarla.
                this._nodoEnfocado = nodo;
                await this.cameraController.enfocarNodo(nodo, this.graph.graphData().nodes, area);
                this._ultimoFoco = null; // fuerza la emisión de nodeFocus en el próximo frame
                this._emitirFocoSiSeMovio();
            }
        } else if (nodoEnfocado === null) {
            const habia = this._nodoEnfocado;
            this._nodoEnfocado = null;
            this._ultimoFoco = null;
            // En 'reemplazo' el fundido ya reencuadra; en las demás se anima y se espera a mano
            // porque backToBasicsView no devuelve promesa (MOTR-09).
            if (habia && transicion !== 'reemplazo') {
                this.cameraController.backToBasicsView();
                await new Promise(r => setTimeout(r, ANIMATION_SETTINGS.CAMERA_TRANSITION_DURATION));
            }
        }
    }

    destruir() {
        // Ciclo de vida, no superficie pública — existe porque el puente desmonta y no puede
        // dejar el rAF ni el listener de resize corriendo huérfanos.
        cancelAnimationFrame(this._raf);
        window.removeEventListener('resize', this._onResize);
        this.animationManager.clearState();
        this.threeObjectManager.disposeAll();
        this.background?.destruir();
        this.graph._destructor?.();
        this._handlers = {};
    }
}
