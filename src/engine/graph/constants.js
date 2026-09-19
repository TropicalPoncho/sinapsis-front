// Configuraciones globales para el grafo 3D
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
    // root cause K (03-06) DESCARTADA por prueba directa: bajar a 30 (default real de
    // d3-force-3d, node_modules/d3-force-3d/src/link.js:18) para intentar que la onda de
    // LinkThreeObject se viera más — el usuario confirmó "no sirvió de nada y está todo pegado",
    // empeoró el layout. Vuelto a 180. El misterio del "link recto sin animar" SIGUE ABIERTO,
    // no era esto — no reintentar este approach.
    linkDistance: 80,
    // negativo repele, positivo atrae (root cause D, 03-06). Ni 0 ni el default de
    // three-forcegraph (-60 en 3D, three-forcegraph.mjs:471) sirven acá: con 6 vecinos sin
    // vínculo entre sí, sólo atados al hub por 'link', el charge es lo que separa el "ramo"
    // completo — -30 lo infla más de lo que se ve en la referencia. -8 es un valor de tuning
    // visual, ajustar a ojo si hace falta.
    chargeStrength: -8,
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
    ORBIT_SPEED: Math.PI / 1500,
    ORBIT_INTERVAL: 10,
    ENTER_NEURON_DURATION:5000
};

// Configuraciones de la cámara
export const CAMERA_SETTINGS = {
    FOV: 70,
    NEAR: 1,
    FAR: 1000,
    ORBIT_DISTANCE: 90
}; 