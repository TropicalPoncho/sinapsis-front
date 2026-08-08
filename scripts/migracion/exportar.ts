// Primera pasada de la migración: dump de Mongo -> CSV de curaduría.
// Solo lee. No abre Postgres, no escribe nada dentro de collectiveConscience.
import fs from 'node:fs'
import path from 'node:path'
import { escribirCsv } from './csv.ts'

const DUMP = '../../collectiveConscience/config/dumps/neurons_prod_23-10-05.json'

interface DumpNodo {
  _id: { $oid: string }
  fromId?: { $oid: string }[]
  name?: string
  info?: { sub?: string; bio?: string }
  imgPath?: string
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

// Primera pasada: conjetura, no verdad. Lo que sale de acá se corrige a mano en la planilla
// y el CSV corregido es el registro durable. `subtipo` sale casi siempre 'persona' a propósito:
// distinguir una banda de una persona por el nombre no es confiable, y una conjetura silenciosa
// es peor que una obvia — la columna ref_revisar existe para eso.
const RE_PRODUCTORA = /productora/i
const RE_CENTRO = /centro cultural|galer/i
const RE_SELLO = /sello/i
const RE_EVENTO = /festival|fiesta|ciclo|session/i

function adivinarTipo(n: DumpNodo): { nodeType: string; subtipo: string } {
  const sub = n.info?.sub ?? ''
  if (RE_PRODUCTORA.test(sub)) return { nodeType: 'ENTIDAD', subtipo: 'productora' }
  if (RE_CENTRO.test(sub)) return { nodeType: 'ENTIDAD', subtipo: 'centro_cultural' }
  if (RE_SELLO.test(sub)) return { nodeType: 'ENTIDAD', subtipo: 'sello' }
  if (RE_EVENTO.test(n.name ?? '')) return { nodeType: 'EVENTO', subtipo: 'funcion' }
  return { nodeType: 'ENTIDAD', subtipo: 'persona' }
}

function aFecha(n: DumpNodo): string {
  const v = n.creationDate?.$date?.$numberLong
  return v ? new Date(Number(v)).toISOString().slice(0, 10) : ''
}

const dumpPath = path.resolve(process.cwd(), DUMP)
if (!fs.existsSync(dumpPath)) {
  console.error(`No se encontró el dump en ${dumpPath}. ¿collectiveConscience está clonado al lado de este repo?`)
  process.exit(1)
}

const data: DumpNodo[] = JSON.parse(fs.readFileSync(dumpPath, 'utf8'))
const totalLeidas = data.length

const conNombre = data.filter((n) => n.name && n.name.trim() !== '')
const descartadasPorNombreVacio = totalLeidas - conNombre.length

const idsConNombre = new Set(conNombre.map((n) => n._id.$oid))

// Grados contando solo aristas entre nodos con nombre (D-09: contexto para la planilla).
const gradoEntrada = new Map<string, number>()
const gradoSalida = new Map<string, number>()
for (const n of conNombre) {
  const destino = n._id.$oid
  for (const f of n.fromId ?? []) {
    if (!idsConNombre.has(f.$oid)) continue
    gradoEntrada.set(destino, (gradoEntrada.get(destino) ?? 0) + 1)
    gradoSalida.set(f.$oid, (gradoSalida.get(f.$oid) ?? 0) + 1)
  }
}

const nodeTypePorId = new Map<string, string>()
const descartarPorId = new Map<string, boolean>()

const filasNodos = conNombre.map((n) => {
  const id = n._id.$oid
  const { nodeType, subtipo } = adivinarTipo(n)
  nodeTypePorId.set(id, nodeType)

  const sinContexto = !n.info && !n.imgPath
  const sinAristas = (gradoEntrada.get(id) ?? 0) + (gradoSalida.get(id) ?? 0) === 0
  const descartar = DESCARTE_LITERAL.has(n.name!) || (sinContexto && sinAristas)
  descartarPorId.set(id, descartar)

  return {
    id,
    descartar: descartar ? 'si' : '',
    node_type: nodeType,
    subtipo,
    ref_revisar: subtipo === 'persona' ? 'REVISAR: subtipo conjeturado por defecto' : '',
    label: n.name!,
    descripcion_breve: n.info?.sub ?? '',
    disciplina: '',
    is_stub: sinContexto ? 'si' : '',
    fecha: aFecha(n),
    thumb: n.imgPath ? `REVISAR:${n.imgPath}` : '',
    ref_sub: n.info?.sub ?? '',
    ref_bio_len: n.info?.bio ? String(n.info.bio.length) : '',
    ref_grado_entrada: String(gradoEntrada.get(id) ?? 0),
    ref_grado_salida: String(gradoSalida.get(id) ?? 0),
  }
})

const labelPorId = new Map(conNombre.map((n) => [n._id.$oid, n.name!]))
const filasVinculos: Record<string, string>[] = []
for (const n of conNombre) {
  const destino = n._id.$oid
  for (const f of n.fromId ?? []) {
    const origen = f.$oid
    if (!idsConNombre.has(origen)) continue
    const tipoVinculo = nodeTypePorId.get(origen) === 'ESPACIO' ? 'PRODUJO' : 'COLABORO_EN'
    filasVinculos.push({
      id: `${origen}__${destino}`,
      descartar: descartarPorId.get(origen) || descartarPorId.get(destino) ? 'si' : '',
      origen,
      destino,
      tipo_vinculo: tipoVinculo,
      rol: '',
      ref_origen_label: labelPorId.get(origen)!,
      ref_destino_label: labelPorId.get(destino)!,
    })
  }
}

const outDir = path.resolve(process.cwd(), 'data/curaduria')
fs.mkdirSync(outDir, { recursive: true })

const columnasNodos = [
  'id', 'descartar', 'node_type', 'subtipo', 'label', 'descripcion_breve', 'disciplina', 'is_stub',
  'fecha', 'thumb', 'ref_sub', 'ref_bio_len', 'ref_grado_entrada', 'ref_grado_salida', 'ref_revisar',
]
const columnasVinculos = [
  'id', 'descartar', 'origen', 'destino', 'tipo_vinculo', 'rol',
  'ref_origen_label', 'ref_destino_label',
]

fs.writeFileSync(path.join(outDir, 'nodos.csv'), escribirCsv(columnasNodos, filasNodos))
fs.writeFileSync(path.join(outDir, 'vinculos.csv'), escribirCsv(columnasVinculos, filasVinculos))

const nodosADescartar = filasNodos.filter((f) => f.descartar === 'si').length
const vinculosADescartar = filasVinculos.filter((f) => f.descartar === 'si').length

console.log(`${totalLeidas} filas leídas`)
console.log(`${descartadasPorNombreVacio} descartadas por nombre vacío`)
console.log(`${String(filasNodos.length).padStart(3)} nodos exportados (${nodosADescartar} marcados para descartar)`)
console.log(`${String(filasVinculos.length).padStart(3)} vínculos exportados (${vinculosADescartar} marcados para descartar)`)
