// El esqueleto del motor: compone ForceGraph3D + ThreeObjectManager + CameraController +
// AnimationManager y expone únicamente `setVista`/`on` como superficie de datos (más
// `constructor`/`destruir`, que son ciclo de vida — existen porque el puente desmonta).
// Nada del framework de UI, nada de `next/`: el elemento del DOM llega por parámetro.
import ForceGraph3D from '3d-force-graph';
import { resolveTHREE } from './threeObjects/threeGlobal.js';
const THREE = resolveTHREE();
import { ThreeObjectManager } from './threeObjects/ThreeObjectManager.js';
import './threeObjects/registerTypes.js';        // efecto: registra los 15 tipos
import { CameraController } from './graph/cameraController.js';
import { AnimationManager } from './graph/animationManager.js';
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
            .numDimensions(3)
            // Pre-simula la física antes del primer frame: el grafo nace ya asentado y encuadrable.
            // ponytail: bloquea el hilo ~N ticks; con redes grandes (PERF-01) bajar o mover a worker.
            .warmupTicks(150)
            .enableNodeDrag(true)
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
        // Distancia por link: `link.distance` si viene, si no el default. La librería sólo
        // aplica el override de charge/cooldown default (sin tocar) — ver 03-06 root cause D.
        this.graph.d3Force('link').distance(link => link.distance ?? GLOBAL_DEFAULT_SETTINGS.linkDistance);

        // Se lee el accesor, nunca se le asigna encima: reemplazar `camera()` por una
        // instancia rompe `graph2ScreenCoords`/`screen2GraphCoords` (MOTR-12, Plan 05), que
        // llaman a `this.camera()` como función internamente. Ese es el bug de mundo.js:104
        // que no se porta acá.
        this.camera = this.graph.camera();
        this.renderer = this.graph.renderer();
        this.scene = this.graph.scene();

        this.threeObjectManager = new ThreeObjectManager({ animationType: 'All' });
        this.cameraController = new CameraController(this.graph, this.camera, this.renderer);
        this.cameraController.setupCamera();
        // root cause I (03-06): fadeInCanvasFromBlack hace zoomToFit UNA vez, apenas arranca la
        // física (nodos todavía amontonados en su spawn) — el grafo queda encuadrado diminuto
        // para siempre. activateZoomToFit reencuadra cuando la física termina de asentarse
        // (onEngineStop, cooldownTicks:100), sin tocar el encuadre de nodo enfocado (MOTR-08/09).
        this.cameraController.activateZoomToFit();
        this.animationManager = new AnimationManager(this.graph, this.threeObjectManager, this.cameraController);

        this.graph
            .nodeThreeObject(node => this.threeObjectManager.createObject(node))
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
        if (area && this._nodoEnfocado) this.cameraController.applySafeArea(area, window.innerWidth, window.innerHeight);
        else this.cameraController.clearSafeArea();
        // No se dispara un segundo pintado del frame acá: 3d-force-graph ya corre su propio
        // loop (incluido tweenGroup.update()) y hacerlo de nuevo duplicaría los draw calls
        // que PERF-01 va a medir — ése era el bug de doble render de mundo.js.
        this.animationManager.animate(); // uniforms de shaders + links
        this._emitirFocoSiSeMovio();
        this._actualizarFps();
        this._raf = requestAnimationFrame(this._tick);
    };

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

    on(evento, handler) {
        (this._handlers[evento] ??= new Set()).add(handler);
        return () => this._handlers[evento]?.delete(handler);
    }

    _emitir(evento, payload) {
        this._handlers[evento]?.forEach(h => h(payload));
    }

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
                await desvanecerYQuitar(this.threeObjectManager, salen.map(n => n.id), ANIMATION_SETTINGS.FADE_DURATION);
                this.graph.graphData({ nodes: fusionar(quedan, entran), links: datos.links });
                this.threeObjectManager.disposeUnusedObjects(datos.nodes.map(n => n.id)); // MOTR-07
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
                await this.animationManager.fadeOutCanvasToBlack(this._nodoEnfocado ?? null, ANIMATION_SETTINGS.FADE_DURATION);
                const datos = adaptarSubgrafo(subgrafo);
                this.graph.graphData(datos);
                this.threeObjectManager.disposeUnusedObjects(datos.nodes.map(n => n.id)); // MOTR-07
                await this.animationManager.fadeInCanvasFromBlack(ANIMATION_SETTINGS.FADE_DURATION);
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
        }
    }

    destruir() {
        // Ciclo de vida, no superficie pública — existe porque el puente desmonta y no puede
        // dejar el rAF ni el listener de resize corriendo huérfanos.
        cancelAnimationFrame(this._raf);
        window.removeEventListener('resize', this._onResize);
        this.animationManager.clearState();
        this.threeObjectManager.disposeAll();
        this.graph._destructor?.();
        this._handlers = {};
    }
}
