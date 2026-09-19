import { GLOBAL_DEFAULT_SETTINGS, ANIMATION_SETTINGS, CAMERA_SETTINGS } from './constants.js';
import {
    offsetDeAreaSegura,
    distanciaParaEncuadrar,
    elegirLadoOrbit,
    posicionCamaraParaFoco,
} from './encuadre.js';

/**
 * Controlador de cámara para el grafo 3D
 * Maneja posicionamiento, orbit, zoom y animaciones de cámara
 *
 * @param {Object} graph - Instancia del grafo 3D que controla la posición de la cámara
 * @param {THREE.Camera} camera - Cámara utilizada para la visualización
 * @param {THREE.WebGLRenderer} renderer - Renderizador para ajustar el tamaño y otras propiedades
 */
export class CameraController {
    constructor(graph, camera, renderer) {
        this.graph = graph;
        this.camera = camera;
        this.renderer = renderer;
        
        // Estado del orbit
        this.orbitInterval = null;
        this.angle = 0;
        this.finalDistance = 0;
        this.extraDistance = 0;
        
        // Posición original de la cámara
        this.originalCameraPosition = camera ? camera.position.clone() : null;
        
        // Nodo de referencia para orbit (soma)
        this.somaNode = null;
    }

    /**
     * Configura la cámara inicial
     */
    setupCamera() {
        if (this.camera) {
            this.camera.near = CAMERA_SETTINGS.NEAR;
            this.camera.far = CAMERA_SETTINGS.FAR;
            this.camera.fov = CAMERA_SETTINGS.FOV;
            this.camera.updateProjectionMatrix();
        }
    }

    /**
     * Maneja el redimensionamiento de la ventana
     */
    resize() {
        if (this.renderer && this.camera) {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            this.renderer.setSize(width, height);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }

    /**
     * MOTR-08: traslada el frustum para que el área libre del viewport (la que no tapa el
     * panel) quede centrada en `areaSegura`, sin rotar la cámara ni cambiar la distancia.
     * Se re-aplica cuadro a cuadro con el tamaño actual del canvas — `setViewOffset` reescribe
     * `camera.aspect` con `viewportW/viewportH`, así que un offset guardado con un tamaño viejo
     * queda obsoleto apenas cambia la ventana.
     */
    applySafeArea(areaSegura, viewportW, viewportH, mezcla = 1) {
        if (!areaSegura || !this.camera) return;
        // `mezcla` 0..1 escala el offset: el motor lo hace crecer junto con el tween de cámara
        // para que el descentrado no aparezca de golpe antes del movimiento.
        const o = offsetDeAreaSegura(areaSegura, viewportW, viewportH);
        this.camera.setViewOffset(viewportW, viewportH, o.x * mezcla, o.y * mezcla, viewportW, viewportH);
    }

    /** Saca el offset de frustum activo (vuelta a proyección centrada). */
    clearSafeArea() {
        this.camera?.clearViewOffset();
    }

    /**
     * Encuadra un nodo: distancia por `shape` (MOTR-10, un `Image` entra entero) y ángulo de
     * órbita elegido por el centroide del grafo para que el panel nunca tape aristas (MOTR-11).
     * El `lookAt` es el nodo exacto — el descentrado hacia el área libre lo hace
     * `applySafeArea`, no un corrimiento del punto de mira como hacía el encuadre viejo.
     * ponytail: dos candidatos espejo en X elegidos por el centroide; si un nodo muy conectado
     * sigue tirando aristas sobre el panel, proyectar cada vecino y elegir el mejor de N ángulos
     * entra acá (ver 03-CONTEXT.md).
     * @returns {Promise<void>} resuelve cuando el tween de la cámara termina.
     */
    enfocarNodo(nodo, nodos, areaSegura, duracion = ANIMATION_SETTINGS.CAMERA_TRANSITION_DURATION) {
        const W = window.innerWidth, H = window.innerHeight;
        const azimut = Math.atan2(GLOBAL_DEFAULT_SETTINGS.aimOffsetX, GLOBAL_DEFAULT_SETTINGS.aimDistance);
        const rectW = W - areaSegura.left - areaSegura.right;
        const rectH = H - areaSegura.top - areaSegura.bottom;
        // El encuadre lo decide `shape` (dato curado), nunca `nodeType`. `esImagen` ya lo derivó
        // el adaptador. Radio del sprite tomado de constants, no medido del mesh: la textura
        // carga async y `Box3.setFromObject` sale vacío contra ella.
        const distancia = nodo.esImagen
            ? distanciaParaEncuadrar(GLOBAL_DEFAULT_SETTINGS.nodeSize * 2.1 / 2, rectW, rectH, H, this.camera.fov)
            // hypot(50, 90) con este azimut reproduce la posición calibrada (±50, 0, 90) del
            // encuadre viejo — las constantes no se tocaron a ciegas.
            : Math.hypot(GLOBAL_DEFAULT_SETTINGS.aimOffsetX, GLOBAL_DEFAULT_SETTINGS.aimDistance);
        const signo = elegirLadoOrbit(nodo, nodos, areaSegura, W, H, distancia, azimut);
        const { pos, lookAt } = posicionCamaraParaFoco(nodo, signo, distancia, azimut);
        this.graph.cameraPosition(pos, lookAt, duracion);
        // cameraPosition no expone onComplete (verificado contra el source instalado): el tween
        // de @tweenjs/tween.js termina exactamente en `duracion`, no es una aproximación.
        return new Promise(r => setTimeout(r, duracion));
    }

    /**
     * Vuelve a la vista básica (vista general)
     * @param {number} extra - Offset vertical adicional
     * @param {number} cameraDistanceOffset - Offset adicional en la distancia de la cámara
     */
    backToBasicsView(extra = 0, cameraDistanceOffset = 0, animationDuration = ANIMATION_SETTINGS.CAMERA_TRANSITION_DURATION) {
        this.graph.cameraPosition(
            {
                x: 0, 
                y: 0, 
                z: GLOBAL_DEFAULT_SETTINGS.cameraDistance + cameraDistanceOffset
            },
            { x: 0, y: extra, z: 0 },
            animationDuration
        );
    }

    /**
     * Activa el modo orbit alrededor del nodo soma
     * @param {number} addDistance - Distancia adicional para el orbit
     * @param {boolean} resetAndStop - Si debe parar cuando llegue a la distancia final
     */
    activateOrbit(addDistance = 0, resetAndStop = false) {
        this.finalDistance += addDistance;

        if (!this.orbitInterval) {
            this.orbitInterval = setInterval(() => {
                // Buscar el nodo soma si no está definido
                if (this.somaNode == null) {
                    this.somaNode = this.graph.graphData().nodes.find(
                        item => item.id == '636326c5b63661e98b47ed11'
                    );
                }
                
                if (this.extraDistance < this.finalDistance) {
                    this.extraDistance += 1;
                }
                
                if (resetAndStop && this.extraDistance >= this.finalDistance) {
                    this.stopOrbit();
                }
                
                this.graph.cameraPosition({
                    x: (GLOBAL_DEFAULT_SETTINGS.cameraDistance + this.extraDistance) * Math.sin(this.angle),
                    y: -90,
                    z: (GLOBAL_DEFAULT_SETTINGS.cameraDistance + this.extraDistance) * Math.cos(this.angle)
                }, this.somaNode);
                
                this.angle += ANIMATION_SETTINGS.ORBIT_SPEED;
            }, ANIMATION_SETTINGS.ORBIT_INTERVAL);
        }
    }

    /**
     * Reinicia el orbit con nueva distancia
     * @param {number} distance - Nueva distancia para el orbit
     * @param {boolean} resetAndStop - Si debe parar al llegar a la distancia
     */
    resetOrbit(distance, resetAndStop = false) {
        this.stopOrbit();
        this.activateOrbit(distance, resetAndStop);
    }

    /**
     * Detiene el orbit
     */
    stopOrbit() {
        if (this.orbitInterval) {
            clearInterval(this.orbitInterval);
            this.orbitInterval = null;
        }
    }

    /**
     * Activa el zoom para ajustar la vista a todos los elementos
     */
    activateZoomToFit() {
        this.graph.onEngineStop(() => this.graph.zoomToFit(700));
    }

    /**
     * Obtiene la posición actual de la cámara
     * @returns {Object} Posición de la cámara
     */
    getCameraPosition() {
        return this.graph.cameraPosition();
    }

    /**
     * Establece la posición de la cámara
     * @param {Object} position - Nueva posición
     * @param {Object} lookAt - Punto hacia donde mirar
     * @param {number} duration - Duración de la transición
     */
    setCameraPosition(position, lookAt = null, duration = 0) {
        this.graph.cameraPosition(position, lookAt, duration);
    }

    /**
     * Limpia recursos del controlador
     */
    dispose() {
        this.stopOrbit();
        this.orbitInterval = null;
        this.somaNode = null;
    }
}