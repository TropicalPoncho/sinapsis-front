// Config única de las fuerzas del layout (3d-force-graph/d3-force-3d). Único lugar: lo lee el
// motor (SinapsisEngine, vía GLOBAL_DEFAULT_SETTINGS en src/engine/graph/constants.js) y el panel
// de debug (DebugPanel.tsx) para sus valores iniciales — ninguno de los dos hardcodea su propia
// copia. Vive en src/lib/ (no en src/engine/) porque un componente de src/app/ no puede importar
// del motor (ver CanvasSinapsis.tsx); este módulo no toca THREE ni React, así que cualquiera de
// los dos lados lo puede leer sin romper ese invariante.
export interface FuerzasConfig {
  numDimensions: number
  dagLevelDistance: number
  d3AlphaMin: number
  d3AlphaDecay: number
  d3VelocityDecay: number
  linkDistance: number
  linkDistanciaPorGrado: number
  chargeStrength: number
  gravedad: number
}

export const FUERZAS_DEFAULT: FuerzasConfig = {
  numDimensions: 3,
  // Sólo tiene efecto real con dagMode activo (si no, no hay niveles que espaciar); default de
  // 3d-force-graph es auto-derivado del nº de nodos, 30 lo fija a un valor de tuning visual.
  dagLevelDistance: 30,
  d3AlphaMin: 0,
  d3AlphaDecay: 0.0228,
  d3VelocityDecay: 0.4,
  // 30 es el default de d3-force-3d (node_modules/d3-force-3d/src/link.js:18) y está pensado para nodos de radio ~4.
  // Los nuestros miden 15 (formas) a 26 (imágenes): a 30 la red real de 40 nodos queda con 20 pares solapados (quick 261029-hdu;
  // ya había fallado en 03-06, "todo pegado"). 140 ~ 30 escalado al tamaño de nuestros nodos; no bajarlo sin achicar los nodos.
  linkDistance: 140,
  // cuánto se alarga un link por cada raíz de grado de sus extremos (0 = distancia fija). 0 desde quick 261029-hdu: con 0.4 el
  // radio de los hubs crecía a ~3x y los links entre sus vecinos seguían en 140, así que el hub quedaba afuera y sus vecinos
  // amontonados en abanico (distancia mínima entre pares / radio = 0.79 en la red de Rama). Se puede seguir probando con ?grado=.
  linkDistanciaPorGrado: 0,
  // negativo repele, positivo atrae. -8 NO se aplicaba: el motor sólo pisaba el charge con ?charge=, así que corría el -60 de
  // three-forcegraph para 3D (three-forcegraph.mjs:471), pensado para nodos de radio ~4. Con nodos 4-6x más grandes y el link a
  // 140, -60 deja la red pegada (ratio mínimo 0.79-1.03); -600 es ese -60 escalado al tamaño de nuestros nodos (quick 261029-hdu).
  chargeStrength: -600,
  // tirón lineal al origen (ver fuerzaGravedad): sin él un nodo sin vínculos en la Vista se va flotando y el encuadre lo incluye
  // (RAYO SECO en el home: radio de la red 325 contra 177 del percentil 90). 0 = apagado; ?gravedad= para probar.
  gravedad: 0.1,
}
