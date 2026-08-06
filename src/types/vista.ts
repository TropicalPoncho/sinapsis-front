export type NodeType = 'ARTISTA' | 'OBRA' | 'SERIE' | 'ESPACIO' | 'EVENTO' | 'STUB'

// Sin CUSTOM. Un vínculo de tipo libre no se puede traversar ni filtrar desde una Vista.
// El escape hatch para el matiz es `rol` en el vínculo, no un tipo nuevo.
export type TipoVinculo =
  | 'COMPONE' | 'COLABORO_EN' | 'CORREALIZO' | 'PRODUJO'
  | 'INTEGRA' | 'INSPIRO' | 'REGISTRO'

export type Transicion = 'reemplazo' | 'filtrado' | 'aditivo'
export type ModoOrden = 'grafo' | 'geo' | 'aleatorio'

// INSPIRO es dirigido: "obras que me inspiraron" y "obras que inspiré"
// son consultas distintas y deben poder pedirse por separado.
export type Direccion = 'sale' | 'entra' | 'ambas'

// Campos nombrados a propósito. NO es un lenguaje de consultas:
// se agrega un campo cuando hace falta un filtro concreto.
// "eventos futuros" = fechaDesde: hoy. "pasados" = fechaHasta: hoy.
export interface FiltroAtributos {
  fechaDesde?: string            // ISO 8601
  fechaHasta?: string            // ISO 8601
  disciplinas?: string[]
  locationIds?: string[]
}

export interface Vista {
  raiz: string | null            // null = vista global
  profundidad: number            // saltos desde la raíz
  filtroNodeTypes: NodeType[]
  filtroVinculos: TipoVinculo[]
  filtroRoles?: string[]         // "solo donde fui DJ" — ausente = todos los roles
  direccion: Direccion
  filtroAtributos?: FiltroAtributos
  incluirRaiz: boolean           // false = el subgrafo excluye la raíz
  limite?: number                // tope de nodos; protege el render de nodos muy conectados
  modoOrden: ModoOrden
}

export interface NodoGrafo {
  id: string
  nodeType: NodeType
  label: string
  // Máximo 200 caracteres. El tope no es estilo: es lo que mantiene enviable
  // el dump de topología. Sin él, prosa larga en cientos de nodos lo lleva a varios MB.
  descripcionBreve?: string
  thumb?: string
  vizParams: VizParams
  isStub: boolean
  // Escalares filtrables. Viajan en el dump porque el cliente filtra por ellos
  // sin volver al servidor.
  fecha?: string                 // ISO 8601 — creación, o fecha del evento
  disciplina?: string
  locationId?: string
}

// Escalares únicamente. Si esto pudiera contener GLSL, instancing queda
// descartado para siempre — ver CLAUDE.md.
export interface VizParams {
  shape: string
  color: string
  speed?: number
  noise?: number
  seed?: number
}

// Tipado en tres niveles, cada uno en un lugar distinto por peso:
//   1. tipoVinculo — estructural, define cómo se traversa. Va en el dump.
//   2. rol         — semántico y filtrable ("director de arte", "dj"; para
//                    INSPIRO también: "cita directa", "homenaje"). Vocabulario
//                    distinto por tipo, mismo campo. Va en el dump.
//   3. descripcion — prosa para leer, NO filtrable. NO va acá: se pide al abrir
//                    el vínculo, igual que el metadata del nodo.
export interface VinculoGrafo {
  id: string
  origen: string
  destino: string
  tipoVinculo: TipoVinculo
  rol?: string                   // corto, filtrable
}

export interface Subgrafo {
  nodos: NodoGrafo[]
  vinculos: VinculoGrafo[]
}

// React → motor: la zona del viewport que NO está tapada por overlays,
// donde la cámara debe dejar al nodo enfocado.
// Izquierda en escritorio, arriba en mobile.
export interface AreaSegura {
  top: number
  right: number
  bottom: number
  left: number
}
