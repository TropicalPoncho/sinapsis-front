// Contrato compartido del grafo. Lo importan el endpoint de topología,
// `resolverVista` y el motor 3D — nadie lo redeclara.
//
// El `Usuario` NO aparece acá y no es un nodo: es la cuenta privada, con su
// login. Un usuario controla N entidades públicas ("Rama Cerratto",
// "Cachengue Master", "Rayo Seco"), y que esas entidades estén vinculadas
// entre sí en el grafo público es una decisión aparte de quien las controla —
// hay quien mantiene sus alias deliberadamente separados.

// Cuatro tipos, y solo cuatro. `nodeType` es lo ESTRUCTURAL: define cómo se
// recorre y cómo se comporta el nodo. El nombre de la cosa —banda, dúo,
// colectivo, productora, centro cultural, sello— es `subtipo`, vocabulario
// abierto y filtrable. Es el mismo patrón de dos niveles que `tipoVinculo` + `rol`:
// una banda y una productora se comportan idéntico en el grafo, cambia el nombre.
//
// No existe ESPACIO: lo único que lo distinguía era tener lugar físico, y
// `locationId` ya es un campo de todo nodo. Un centro cultural es una ENTIDAD
// con subtipo 'centro_cultural' y locationId puesto.
//
// No existe STUB: es un estado, y ya está como el booleano `isStub`.
export type NodeType =
  | 'ENTIDAD'      // tiene agencia: crea, produce, la integran. Persona, dúo, banda, colectivo, productora, centro cultural
  | 'OBRA'         // algo hecho
  | 'EVENTO'       // obra que ocurre en un tiempo y un lugar
  | 'AGRUPACION'   // contenedor curatorial sin agencia propia: serie, área, podcast, ciclo, colección

// Sin CUSTOM. Un vínculo de tipo libre no se puede traversar ni filtrar desde una Vista.
// El escape hatch para el matiz es `rol` en el vínculo, no un tipo nuevo.
export type TipoVinculo =
  | 'COMPONE' | 'COLABORO_EN' | 'CORREALIZO' | 'PRODUJO'
  | 'INTEGRA' | 'INSPIRO' | 'REGISTRO' | 'SUCEDE_EN' | 'PRECEDE'

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
  filtroSubtipos?: string[]      // "solo bandas", "solo podcasts" — ausente = todos
  filtroVinculos: TipoVinculo[]
  filtroRoles?: string[]         // "solo donde fui DJ" — ausente = todos los roles
  direccion: Direccion
  filtroAtributos?: FiltroAtributos
  incluirRaiz: boolean           // false = el subgrafo excluye la raíz
  limite?: number                // tope de nodos; protege el render de nodos muy conectados
  modoOrden: ModoOrden
  // true = cuando un nodo queda fuera de la Vista (por filtroNodeTypes, o simplemente por no
  // entrar en el recorte) y conectaba a dos nodos que sí quedaron, se agrega un vínculo puente
  // entre esos dos (D-puentes). Sin esto, ese camino se pierde entero y los dos quedan sueltos.
  vinculosVirtuales: boolean
  // true = las agrupaciones visibles (áreas) se unen con un vínculo virtual cuando sus miembros se tocan
  // (D-24). Miembro = destino de un COMPONE que sale de la agrupación, un nivel. Vínculo = cualquier
  // vínculo real entre miembros de dos agrupaciones, o un miembro compartido. Solo entre agrupaciones
  // visibles; un par ya unido por un vínculo real dibujado no recibe el virtual. Nunca se persiste.
  // Opcional: ausente = apagado, así las Vistas que no lo piden no cambian.
  vinculosEntreAgrupaciones?: boolean
}

export interface NodoGrafo {
  id: string
  nodeType: NodeType
  // Vocabulario abierto y filtrable, validado contra la tabla `subtipos`.
  // ENTIDAD: persona · duo · banda · colectivo · productora · centro_cultural · sello · proyecto
  // OBRA: pintura · video · libro · cancion · episodio · instalacion
  // EVENTO: concierto · muestra · funcion · conversatorio
  // AGRUPACION: serie · area · podcast · ciclo · coleccion
  subtipo: string
  label: string
  // Máximo 200 caracteres. El tope no es estilo: es lo que mantiene enviable
  // el dump de topología. Sin él, prosa larga en cientos de nodos lo lleva a varios MB.
  descripcionBreve?: string
  thumb?: string
  vizParams: VizParams
  // true = creadxr invitadx que todavía no se registró
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
  // true = vínculo calculado por resolverVista, nunca persistido: un puente (D-puentes) o un vínculo
  // entre agrupaciones (D-24, id `entre:`). El puente reemplaza el camino
  // A-nodo_excluido-B por A-B cuando `nodo_excluido` quedó fuera de la Vista. El motor puede
  // dibujarlo distinto: el motor lo dibuja punteado (linkThreeObject).
  virtual?: boolean
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
