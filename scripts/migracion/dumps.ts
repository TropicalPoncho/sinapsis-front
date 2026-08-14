// Lectura de los dumps de Mongo, normalizados a una forma común.
// Solo lee. No abre Postgres, no escribe nada dentro de collectiveConscience.
//
// Son DOS bases distintas, no dos snapshots de la misma: cero ids en común.
//   - `red`   (neurons_prod_23-10-05)  → la red de colaboradorxs. Sin obras.
//     Los vínculos viven en el campo `fromId` de cada nodo (aristas entrantes).
//   - `sitio` (neurons_prod_20260808)  → el sitio institucional: las áreas y LAS OBRAS.
//     Los vínculos viven en un archivo aparte y referencian el `id` numérico, no el `$oid`.
//
// Ninguna de las dos, por sí sola, da una obra con quién la hizo: una tiene las obras sin
// autorías y la otra las autorías sin obras. Esos vínculos se escriben a mano en la planilla.
import fs from 'node:fs'
import path from 'node:path'

const BASE = '../../collectiveConscience/config/dumps'
export const DUMP_RED = `${BASE}/neurons_prod_23-10-05.json`
export const DUMP_SITIO = `${BASE}/neurons_prod_20260808.json`
export const DUMP_SITIO_VINCULOS = `${BASE}/sinapses_prod_20260808.json`

export type Fuente = 'red' | 'sitio'

export interface NodoFuente {
  id: string // $oid — el id estable que viaja al CSV y a Postgres
  fuente: Fuente
  label: string
  sub: string // candidato a descripcion_breve
  fecha: string
  imgPath: string
  metadata: Record<string, unknown>
  tieneContexto: boolean // sin contexto y sin aristas ⇒ candidato a descartar
  nodeType: string
  subtipo: string
  revisar: string
}

export interface VinculoFuente {
  origen: string
  destino: string
  tipoVinculo: string
  fuente: Fuente
}

// ── dump `red` ────────────────────────────────────────────────────────────────

interface NodoRed {
  _id: { $oid: string }
  fromId?: { $oid: string }[]
  name?: string
  nickName?: string
  info?: { sub?: string; bio?: string; links?: unknown }
  imgPath?: string
  imgSize?: number
  order?: number
  graphVal?: number
  creationDate?: { $date: { $numberLong: string } }
}

// D-04 (assets de campaña) + D-05 (categorías del sitio institucional).
const DESCARTE_LITERAL = new Set([
  'Stickers', 'Sticker01', 'Sticker02', 'Sticker03', 'Sticker04', 'IG Story 01', 'Instagram',
  'Exposiciones', 'EXPOSICIONES', 'LIVE SETs', 'Meditación', 'MEDITACIÓN ACTIVA',
  'Poesía performática', 'Visuales', 'ACTIVIDADES', 'PERFORMANCES', 'BANDAS EN VIVO',
  'ARTES CIRCENSES', 'VJ', 'Biodanza', 'In Session', 'tickets',
  'Vinyls DJ Sets', 'VINYLS DJ SETs',
])

// Conjetura, no verdad. `subtipo` sale casi siempre 'persona' a propósito: distinguir una banda
// de una persona por el nombre no es confiable, y una conjetura silenciosa es peor que una obvia.
const RE_PRODUCTORA = /productora/i
const RE_CENTRO = /centro cultural|galer/i
const RE_SELLO = /sello/i
const RE_EVENTO = /festival|fiesta|ciclo|session/i

function tipoDeRed(sub: string, name: string): { nodeType: string; subtipo: string } {
  if (RE_PRODUCTORA.test(sub)) return { nodeType: 'ENTIDAD', subtipo: 'productora' }
  if (RE_CENTRO.test(sub)) return { nodeType: 'ENTIDAD', subtipo: 'centro_cultural' }
  if (RE_SELLO.test(sub)) return { nodeType: 'ENTIDAD', subtipo: 'sello' }
  if (RE_EVENTO.test(name)) return { nodeType: 'EVENTO', subtipo: 'funcion' }
  return { nodeType: 'ENTIDAD', subtipo: 'persona' }
}

// ── dump `sitio` ──────────────────────────────────────────────────────────────

interface NodoSitio {
  _id: { $oid: string }
  id?: number
  name?: string
  nickName?: string
  title?: string
  img?: string
  imgSize?: number
  order?: number
  val?: number
  type?: string
  style?: unknown
  dimensionId?: number
  neuronType?: number
  html?: { subtitle?: string; info?: unknown; next?: unknown }
  creationDate?: { $date: { $numberLong: string } }
}

interface VinculoSitio {
  source: number
  target: number
  type: number
}

// Formatos/disciplinas que el sitio dibujaba como nodos. No son entidades ni obras: son
// etiquetas. En el modelo nuevo su lugar es `disciplina` o `subtipo`, no una fila propia.
const FORMATOS = new Set([
  'CONVERSATORIO', 'OBRA', 'LABORATORIO', 'ESCULTURA 3D', 'VJ', 'LIVE SET',
  'MUESTRA INTERACTIVA', 'LIVE CODING',
])

// Envíos del formulario de registro que quedaron guardados como neuronas.
const RE_BASURA_FORMULARIO = /^[A-Za-z]{16,}$/

function tipoDeSitio(n: NodoSitio, label: string): { nodeType: string; subtipo: string; revisar: string } {
  if (n.dimensionId === 0) {
    return {
      nodeType: 'AGRUPACION',
      subtipo: 'area',
      revisar: label === 'Nosotres' ? 'REVISAR: "Nosotres" es una sección del sitio, no un área de trabajo — descartar?' : '',
    }
  }
  if (n.dimensionId === 1) return { nodeType: 'OBRA', subtipo: 'obra', revisar: '' }
  // Personas del staff: nombres en caja mixta, sin dimensionId.
  if (/[a-z]/.test(label)) return { nodeType: 'ENTIDAD', subtipo: 'persona', revisar: '' }
  return { nodeType: 'OBRA', subtipo: 'obra', revisar: 'REVISAR: sin dimensionId, tipo conjeturado' }
}

// 1 related → andamiaje del force layout, no semántica: se descarta.
// Los otros tres sí son relaciones reales del sitio.
const TIPO_VINCULO_SITIO: Record<number, string | null> = {
  1: null,
  2: 'PRODUJO',
  3: 'COLABORO_EN',
  4: 'COMPONE',
}

// ── API ───────────────────────────────────────────────────────────────────────

function leerJson<T>(rel: string): T {
  const p = path.resolve(process.cwd(), rel)
  if (!fs.existsSync(p)) {
    console.error(`No se encontró el dump en ${p}. ¿collectiveConscience está clonado al lado de este repo?`)
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T
}

function aFecha(c?: { $date: { $numberLong: string } }): string {
  const v = c?.$date?.$numberLong
  return v ? new Date(Number(v)).toISOString().slice(0, 10) : ''
}

export interface Cargado {
  nodos: NodoFuente[]
  vinculos: VinculoFuente[]
  descartadosSinNombre: number
  descartadosBasura: number
  descartadosFormato: number
}

export function cargarFuentes(): Cargado {
  const nodos: NodoFuente[] = []
  const vinculos: VinculoFuente[] = []

  // --- red ---
  const red = leerJson<NodoRed[]>(DUMP_RED)
  const redConNombre = red.filter((n) => n.name && n.name.trim() !== '')
  const descartadosSinNombre = red.length - redConNombre.length
  const idsRed = new Set(redConNombre.map((n) => n._id.$oid))

  for (const n of redConNombre) {
    const label = n.name!
    const sub = n.info?.sub ?? ''
    const { nodeType, subtipo } = tipoDeRed(sub, label)
    const metadata: Record<string, unknown> = { mongoId: n._id.$oid, fuente: 'red' }
    if (n.nickName !== undefined) metadata.nickName = n.nickName
    if (n.info?.sub !== undefined) metadata.sub = n.info.sub
    if (n.info?.bio !== undefined) metadata.bio = n.info.bio
    if (n.info?.links !== undefined) metadata.links = n.info.links
    if (n.imgPath !== undefined) metadata.imgPath = n.imgPath
    if (n.imgSize !== undefined) metadata.imgSize = n.imgSize
    if (n.order !== undefined) metadata.order = n.order
    if (n.graphVal !== undefined) metadata.graphVal = n.graphVal

    nodos.push({
      id: n._id.$oid,
      fuente: 'red',
      label,
      sub,
      fecha: aFecha(n.creationDate),
      imgPath: n.imgPath ?? '',
      metadata,
      tieneContexto: Boolean(n.info || n.imgPath),
      nodeType,
      subtipo,
      revisar: subtipo === 'persona' ? 'REVISAR: subtipo conjeturado por defecto' : '',
    })
  }

  for (const n of redConNombre) {
    const destino = n._id.$oid
    for (const f of n.fromId ?? []) {
      if (!idsRed.has(f.$oid)) continue
      vinculos.push({ origen: f.$oid, destino, tipoVinculo: 'COLABORO_EN', fuente: 'red' })
    }
  }

  // --- sitio ---
  const sitio = leerJson<NodoSitio[]>(DUMP_SITIO)
  let descartadosBasura = 0
  let descartadosFormato = 0
  const oidPorIdNumerico = new Map<number, string>()

  for (const n of sitio) {
    const label = (n.name ?? n.nickName ?? n.title ?? '').trim()
    if (label === '') continue
    if (RE_BASURA_FORMULARIO.test(label)) { descartadosBasura++; continue }
    if (FORMATOS.has(label)) { descartadosFormato++; continue }

    if (n.id !== undefined) oidPorIdNumerico.set(n.id, n._id.$oid)
    const { nodeType, subtipo, revisar } = tipoDeSitio(n, label)
    const sub = n.html?.subtitle ?? ''
    const metadata: Record<string, unknown> = { mongoId: n._id.$oid, fuente: 'sitio' }
    if (n.title !== undefined) metadata.title = n.title
    if (n.html?.subtitle !== undefined) metadata.subtitle = n.html.subtitle
    if (n.html?.info !== undefined) metadata.info = n.html.info
    if (n.img !== undefined) metadata.imgPath = n.img
    if (n.imgSize !== undefined) metadata.imgSize = n.imgSize
    if (n.order !== undefined) metadata.order = n.order
    if (n.val !== undefined) metadata.graphVal = n.val
    if (n.type !== undefined) metadata.shapeOriginal = n.type

    nodos.push({
      id: n._id.$oid,
      fuente: 'sitio',
      label,
      sub,
      fecha: aFecha(n.creationDate),
      imgPath: n.img ?? '',
      metadata,
      tieneContexto: Boolean(n.html || n.img),
      nodeType,
      subtipo,
      revisar,
    })
  }

  for (const v of leerJson<VinculoSitio[]>(DUMP_SITIO_VINCULOS)) {
    const tipoVinculo = TIPO_VINCULO_SITIO[v.type]
    if (!tipoVinculo) continue // `related`: andamiaje visual
    const origen = oidPorIdNumerico.get(v.source)
    const destino = oidPorIdNumerico.get(v.target)
    if (!origen || !destino || origen === destino) continue
    vinculos.push({ origen, destino, tipoVinculo, fuente: 'sitio' })
  }

  return { nodos, vinculos, descartadosSinNombre, descartadosBasura, descartadosFormato }
}

/** Metadata por id, para que el import no vuelva a parsear los dumps por su cuenta. */
export function metadataPorId(nodos: NodoFuente[]): Map<string, Record<string, unknown>> {
  return new Map(nodos.map((n) => [n.id, n.metadata]))
}
