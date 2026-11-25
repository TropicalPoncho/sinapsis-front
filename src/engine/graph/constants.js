import { FUERZAS_DEFAULT } from '../../lib/red/fuerzas.ts';

// Configuraciones globales para el grafo 3D. Las fuerzas del layout (linkDistance,
// chargeStrength, etc., con sus comentarios de tuning) viven en un solo lugar: src/lib/red/fuerzas.ts.
export const GLOBAL_DEFAULT_SETTINGS = {
    nodeSize: 25,
    cameraDistance: 350,
    longDistance: 1700,
    aimDistance: 90,
    aimOffsetX: 50,
    aimOffsetY: 30,
    aimOffsetZ: 70,
    activeNodeImg: true,
    imgSize: 90,
    ...FUERZAS_DEFAULT,
    LINK_WIDTH: .1,
    LINK_OPACITY: 0.8,
    LINK_PARTICLE_WIDTH: 1,
    LINK_PARTICLE_COUNT: 4,
    LINK_PARTICLE_SPEED: 4 * 0.001
};

// D-53: la estructura que crece (Ryzomatica). Escalas del mundo en unidades por unidad normalizada de la estructura, y escala visual de
// las raíces. ponytail: a ojo; perillas para el UAT del dueño, no configuración de producto.
export const CRECIMIENTO_SETTINGS = {
    // Estructura completa (la red de Ryzomatica): llega a ~1 de radio mayor en unidades normalizadas (con n=5000, medido 0.96 en x) y
    // `radioNormalizado` (1.1) es el radio que se encuadra y se raycastea; en el mundo ~100. Las fundadoras nacen a +-0.14 del núcleo =
    // +-12.6, dos nodos de escala 0.5 (radio ~7.5) con 10.2 de aire entre ellos.
    escalaCompleta: 90,
    radioNormalizado: 1.1,
    // Nodo visto desde afuera (versión mini, esfera irregular de ~0.55 de radio): del tamaño de una neurona normal (radio ~15).
    escalaMini: 28,
    // Tropical y Bosque Gracias en la escena donde el crecimiento está activo: más chicos, de la misma familia que el resto (0.4-0.6).
    escalaRaices: 0.5,
};

// Paleta de colores para los nodos
export const COLORS_ARRAY = [
    "#8AE2C8", // verde
    "#578CCB", // azul
    "#9900FF", // violeta
    "#FF0074", // magenta
    "#FFBC00", // amarillo
    "#111111", // "negro"
    "#FFFFFF"  // blanco
];

// Configuraciones de animación
export const ANIMATION_SETTINGS = {
    CAMERA_TRANSITION_DURATION: 3000,
    FADE_DURATION: 300,
    // Llegada de una red nueva (zoom in desde lejos): la cámara arranca a ENTRADA_FACTOR veces la
    // distancia de encuadre y baja en ENTRADA_DURACION ms. ponytail: a ojo; perillas para el UAT del
    // dueño, no configuración de producto.
    ENTRADA_FACTOR: 2.5,
    ENTRADA_DURACION: 1200,
    // salida/entrada de nodos en filtrado/aditivo: 300 ms no se llegaba a ver (checklist 03-06 #8/#9)
    NODE_FADE_DURATION: 800,
    ORBIT_SPEED: Math.PI / 1500,
    ORBIT_INTERVAL: 10,
    ENTER_NEURON_DURATION:5000
};

// Configuraciones de la cámara
export const CAMERA_SETTINGS = {
    FOV: 70,
    NEAR: 1,
    // El fondo (background.js) llega lejos: estrellas a ~3200 de la cámara y una montaña de 9000
    // de lado; con menos far plane quedaban recortadas al alejarse.
    FAR: 10000,
    ORBIT_DISTANCE: 90
}; 