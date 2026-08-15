// El esqueleto del motor: compone ForceGraph3D + ThreeObjectManager + CameraController +
// AnimationManager y expone únicamente `setVista`/`on` como superficie de datos (más
// `constructor`/`destruir`, que son ciclo de vida — existen porque el puente desmonta).
// Nada del framework de UI, nada de `next/`: el elemento del DOM llega por parámetro.
import ForceGraph3D from '3d-force-graph';
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

        this.graph = ForceGraph3D({ controlType: 'orbit' })(elemento)
            .nodeLabel('name')
            .numDimensions(3)
            .cooldownTicks(100)
            .cameraPosition({ z: GLOBAL_DEFAULT_SETTINGS.cameraDistance });
        this.graph.d3Force('link').distance(() => GLOBAL_DEFAULT_SETTINGS.linkDistance);
        this.graph.d3Force('charge').strength(10);

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
        this.animationManager = new AnimationManager(this.graph, this.threeObjectManager, this.cameraController);

        this.graph
            .nodeThreeObject(node => this.threeObjectManager.createObject(node))
            .linkThreeObject(link => {
                link.type = 'SinLink';
                link.id ??= `${link.source?.id ?? link.source}-${link.target?.id ?? link.target}`;
                const objetoLink = this.threeObjectManager.createObject(link);
                link._threeObj = objetoLink;
                return objetoLink.mesh;
            })
            .linkPositionUpdate((line, { start, end }, link) => {
                link._threeObj?.setPosition(start, end);
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

    _tick = () => {
        // No se dispara un segundo pintado del frame acá: 3d-force-graph ya corre su propio
        // loop (incluido tweenGroup.update()) y hacerlo de nuevo duplicaría los draw calls
        // que PERF-01 va a medir — ése era el bug de doble render de mundo.js.
        this.animationManager.animate(); // uniforms de shaders + links
        this._raf = requestAnimationFrame(this._tick);
    };

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
        this._nodoEnfocado = nodoEnfocado ?? this._nodoEnfocado;

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
