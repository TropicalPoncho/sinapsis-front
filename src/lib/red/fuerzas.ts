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
}

export const FUERZAS_DEFAULT: FuerzasConfig = {
  numDimensions: 3,
  // Sólo tiene efecto real con dagMode activo (si no, no hay niveles que espaciar); default de
  // 3d-force-graph es auto-derivado del nº de nodos, 30 lo fija a un valor de tuning visual.
  dagLevelDistance: 30,
  d3AlphaMin: 0,
  d3AlphaDecay: 0.0228,
  d3VelocityDecay: 0.4,
  // root cause K (03-06) DESCARTADA por prueba directa: bajar a 30 (default real de d3-force-3d,
  // node_modules/d3-force-3d/src/link.js:18) para intentar que la onda de LinkThreeObject se
  // viera más — el usuario confirmó "no sirvió de nada y está todo pegado", empeoró el layout.
  // Vuelto a 140. El misterio del "link recto sin animar" SIGUE ABIERTO, no era esto — no
  // reintentar este approach.
  linkDistance: 140,
  // cuánto se alarga un link por cada raíz de grado de sus extremos (0 = distancia fija)
  linkDistanciaPorGrado: 0.4,
  // negativo repele, positivo atrae (root cause D, 03-06). Ni 0 ni el default de three-forcegraph
  // (-60 en 3D, three-forcegraph.mjs:471) sirven acá: con 6 vecinos sin vínculo entre sí, sólo
  // atados al hub por 'link', el charge es lo que separa el "ramo" completo — -30 lo infla más de
  // lo que se ve en la referencia. -8 es un valor de tuning visual, ajustar a ojo si hace falta.
  chargeStrength: -8,
}
