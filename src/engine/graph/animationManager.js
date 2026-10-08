import { ANIMATION_SETTINGS, GLOBAL_DEFAULT_SETTINGS } from './constants.js';

/**
 * Gestor de animaciones para el grafo 3D
 * Maneja animaciones de nodos, enlaces y transiciones visuales
 */
export class AnimationManager {
    constructor(graph, threeObjectManager, cameraController) {
        this.graph = graph;
        this.threeObjectManager = threeObjectManager;
        this.cameraController = cameraController;
        
        // Estado de animaciones
        this.hoverNode = null;
        this.highlightLinks = [];
        this.focusedNodeId = null;
        this.focusedNeighborIds = new Set();
    }

    /**
     * Anima un nodo (hover, selección, etc.)
     * @param {Object} node - Nodo a animar
     * @param {boolean} stay - Si la animación debe permanecer
     */
    animateNode(node, stay = false) {
        if ((!node && !this.threeObjectManager.objectToAnimate) || (node && this.hoverNode === node)) return;

        if(stay) {
            this.threeObjectManager.objectToAnimate = null;
        }

        this.highlightLinks = [];
        if (node) {
            this.threeObjectManager.objectToAnimate = node.id;
            // Obtener enlaces del grafo actual
            const graphData = this.graph.graphData();
            this.highlightLinks = graphData.links.filter(link => 
                link.source.id == node.id || link.target.id == node.id
            );
        }

        this.hoverNode = node || null;
    }

    
    /**
     * Fade out a negro sobre el canvas de Three.js (animación suave)
     * @param {Object|null} node - Nodo destino para zoom in. Si es null, hace zoom out.
     * @param {number} duration - Duración de la animación en ms
     * @returns {Promise}
     */
    async fadeOutCanvasToBlack(node, duration = ANIMATION_SETTINGS.FADE_DURATION) {
        if (node) {
            // Si hay nodo, hacemos Zoom IN (entrar en la neurona)
            this.graph.cameraPosition(
                { x: node.x, y: node.y, z: node.z }, // nueva posición de la cámara (pegada al nodo)
                { x: node.x, y: node.y, z: node.z }, // hacia dónde mira
                duration
            );
        } else {
            // Si NO hay nodo, hacemos Zoom OUT (alejarse para irse)
            this.graph.cameraPosition(
                { x: 0, y: 0, z: GLOBAL_DEFAULT_SETTINGS.longDistance * 2 }, // Nos alejamos mucho
                { x: 0, y: 0, z: 0 }, // Miramos al centro
                duration
            );
        }

        const fadeDuration = Math.max(duration * 0.7, 1); // Duración de la transición de opacidad
        const overlay = this.ensureBlackOverlay();
        overlay.style.opacity = '0';
        await this.animateOverlayOpacity(overlay, 1, fadeDuration);
    }

    /**
     * Fade in desde negro sobre el canvas de Three.js (animación suave)
     * Dos llegadas, las dos bajo el negro y con la misma espera a que la red esté asentada:
     *  - sin foco destino: zoom in desde lejos hasta encuadrar la red (entrar a un área o entidad).
     *  - con foco destino presente en la red (`focoId` + `enfocar`): la cámara arranca dentro de esa
     *    neurona y `enfocar()` la saca hasta el encuadre de foco mientras el negro se retira (D-18,
     *    Volver = la entrada al revés). `enfocar` es del motor (lleva el área segura); acá solo se
     *    lanza en paralelo con el fundido.
     * @param {number} duration - Duración de la animación en ms
     * @param {{focoId?: string|null, enfocar?: () => Promise<void>}} [llegada]
     * @returns {Promise<boolean>} true si `enfocar` se ejecutó acá
     */
    async fadeInCanvasFromBlack(duration = ANIMATION_SETTINGS.FADE_DURATION, { focoId = null, enfocar = null } = {}) {
        const overlay = this.ensureBlackOverlay();
        // forzamos el repaint para que requestAnimationFrame tenga algo que animar
        overlay.getBoundingClientRect();
        overlay.style.opacity = '1';
        // El grafo ya viene asentado (warmupTicks): se encuadra instantáneo MIENTRAS el
        // overlay sigue negro, así aparece directo en zoom-to-fit, sin salto visible.
        // getGraphBbox mide con matrixWorld: hasta que la librería procesa graphData() (crea
        // los objetos de los nodos, diferido) y renderiza, todo está en el origen y el bbox
        // sale diminuto — la cámara quedaba pegada a un solo nodo (UAT 03, test 1). Se espera
        // a que TODOS los nodos tengan objeto y posición, más 2 frames, con tope de 30 s.
        const listos = () => {
            const nodos = this.graph.graphData().nodes;
            return nodos.length > 0 && nodos.every(n => n.__threeObj && Number.isFinite(n.x));
        };
        const inicio = performance.now();
        while (!listos() && performance.now() - inicio < 30000) await new Promise(r => setTimeout(r, 50));
        const frame = () => new Promise(r => { requestAnimationFrame(() => r()); setTimeout(r, 300); });
        await frame();
        await frame();
        this.graph.scene().updateMatrixWorld(true);

        const fundido = this.animateOverlayOpacity(overlay, 0, duration * 1.2);
        const foco = focoId && enfocar ? this.graph.graphData().nodes.find(n => n.id === focoId) : null;
        if (foco) {
            // Un paso afuera de la neurona sobre el eje origen-nodo: nunca posición == lookAt (degenera
            // OrbitControls). ponytail: 6 de distancia a ojo; un nodo en el origen mira desde +z.
            const { x, y, z } = foco, r = Math.hypot(x, y, z);
            const u = r ? { x: x / r, y: y / r, z: z / r } : { x: 0, y: 0, z: 1 };
            this.graph.cameraPosition({ x: x + u.x * 6, y: y + u.y * 6, z: z + u.z * 6 }, { x, y, z }, 0);
            await Promise.all([fundido, enfocar()]);
            return true;
        }
        this.graph.zoomToFit(0, 10);
        const { x, y, z } = this.graph.cameraPosition(); // zoomToFit siempre mira al origen
        const f = ANIMATION_SETTINGS.ENTRADA_FACTOR, origen = { x: 0, y: 0, z: 0 };
        this.graph.cameraPosition({ x: x * f, y: y * f, z: z * f }, origen, 0);
        this.graph.cameraPosition({ x, y, z }, origen, ANIMATION_SETTINGS.ENTRADA_DURACION);
        // tween.js y setTimeout terminan exactos: la promesa resuelve cuando llegó lo más largo (MOTR-09).
        await Promise.all([fundido, new Promise(r => setTimeout(r, ANIMATION_SETTINGS.ENTRADA_DURACION))]);
        return false;
    }

    animateOverlayOpacity(overlay, targetOpacity, duration, startOpacity = null) {
        return new Promise(resolve => {
            overlay.style.transition = '';
            const parsed = Number.parseFloat(overlay.style.opacity);
            const fromOpacity = startOpacity ?? (Number.isFinite(parsed) ? parsed : 0);
            const normalizedDuration = Math.max(duration, 1);
            const delta = targetOpacity - fromOpacity;
            let start = null;
            const step = now => {
                if (!start) start = now;
                const elapsed = now - start;
                const t = Math.min(elapsed / normalizedDuration, 1);
                overlay.style.opacity = (fromOpacity + delta * t).toString();
                if (t < 1) {
                    requestAnimationFrame(step);
                } else {
                    overlay.style.opacity = targetOpacity.toString();
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });
    }



    /**
     * Ejecuta el ciclo de animación
     */
    animate() {
        this.threeObjectManager.animate();
        this.threeObjectManager.animateLinks();
    }

    /**
     * Obtiene el nodo actualmente en hover
     * @returns {Object|null} Nodo en hover o null
     */
    getHoverNode() {
        return this.hoverNode;
    }

    /**
     * Obtiene los enlaces resaltados
     * @returns {Array} Array de enlaces resaltados
     */
    getHighlightLinks() {
        return this.highlightLinks;
    }

    /**
     * Obtiene el ID del nodo enfocado
     * @returns {string|null} ID del nodo enfocado o null
     */
    getFocusedNodeId() {
        return this.focusedNodeId;
    }

    /**
     * Obtiene los IDs de los vecinos enfocados
     * @returns {Set} Set de IDs de vecinos enfocados
     */
    getFocusedNeighborIds() {
        return this.focusedNeighborIds;
    }

    /**
     * Limpia el estado de animación
     */
    clearState() {
        this.hoverNode = null;
        this.highlightLinks = [];
        this.focusedNodeId = null;
        this.focusedNeighborIds = new Set();
        this.removeBlackOverlay();
    }

    /**
     * Remueve el overlay negro si existe
     */
    removeBlackOverlay() {
        if (!this.graph?.renderer) return;
        let renderer = this.graph.renderer();
        if (!renderer) return;
        let canvas = renderer.domElement;
        if (!canvas) return;
        let parent = canvas.parentElement;
        if (!parent) return;
        let overlay = parent.querySelector('.threejs-black-fade');
        if (overlay) {
            overlay.remove();
        }
    }


    /**
     * Crea (si no existe) un overlay negro sobre el canvas
     */
    ensureBlackOverlay() {
        if (!this.graph?.renderer) {
            throw new Error("Cannot create black overlay: missing graph or renderer");
        }
        let renderer = this.graph.renderer();
        if (!renderer) {
            throw new Error("Cannot create black overlay: renderer is missing");
        }
        let canvas = renderer.domElement;
        let parent = canvas.parentElement;
        let overlay = parent.querySelector('.threejs-black-fade');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'threejs-black-fade';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.pointerEvents = 'none';
            overlay.style.background = '#000';
            overlay.style.opacity = '0';
            overlay.style.transition = '';
            parent.appendChild(overlay);
        }
        return overlay;
    }

}