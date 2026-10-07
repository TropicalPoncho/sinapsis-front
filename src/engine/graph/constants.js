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