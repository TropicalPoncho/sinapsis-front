// Primera pasada de la migración: los dumps de Mongo -> CSV de curaduría.
// Solo lee. No abre Postgres, no escribe nada dentro de collectiveConscience.
//
// Es re-corrible: si ya existe un CSV curado, las columnas editadas a mano se conservan
// intactas y solo se agregan las filas nuevas. Las columnas `ref_*` son hechos derivados
// del dump y se regeneran siempre.
import fs from 'node:fs'
import path from 'node:path'
import { escribirCsv, leerCsv } from './csv.ts'
import { cargarFuentes } from './dumps.ts'

const outDir = path.resolve(process.cwd(), 'data/curaduria')
const rutaNodos = path.join(outDir, 'nodos.csv')
const rutaVinculos = path.join(outDir, 'vinculos.csv')

// Lo que edita la persona en la planilla. Si la fila ya existía, esto no se pisa.
const CURADAS_NODO = [
  'descartar', 'node_type', 'subtipo', 'label', 'descripcion_breve',
  'disciplina', 'is_stub', 'fecha', 'thumb', 'shape',
]
const CURADAS_VINCULO = ['descartar', 'tipo_vinculo', 'rol']

function previas(ruta: string): Map<string, Record<string, string>> {
  if (!fs.existsSync(ruta)) return new Map()
  return new Map(leerCsv(fs.readFileSync(ruta, 'utf8')).map((f) => [f.id, f]))
}

function conservar(
  generada: Record<string, string>,
  previa: Record<string, string> | undefined,
  columnas: string[],
): Record<string, string> {
  if (!previa) return generada
  const fila = { ...generada }
  for (const c of columnas) if (previa[c] !== undefined) fila[c] = previa[c]
  // ref_revisar es del curador: si ya lo resolvió y lo vació, no se lo volvemos a poner.
  if (previa.ref_revisar !== undefined) fila.ref_revisar = previa.ref_revisar
  return fila
}

const { nodos, vinculos, descartadosSinNombre, descartadosBasura, descartadosFormato } = cargarFuentes()

const nodosPrevios = previas(rutaNodos)
const vinculosPrevios = previas(rutaVinculos)

// Grados, contando solo aristas entre nodos presentes (contexto para decidir en la planilla).
const idsPresentes = new Set(nodos.map((n) => n.id))
const gradoEntrada = new Map<string, number>()
const gradoSalida = new Map<string, number>()
for (const v of vinculos) {
  if (!idsPresentes.has(v.origen) || !idsPresentes.has(v.destino)) continue
  gradoEntrada.set(v.destino, (gradoEntrada.get(v.destino) ?? 0) + 1)
  gradoSalida.set(v.origen, (gradoSalida.get(v.origen) ?? 0) + 1)
}

// Mismo nombre en fuentes distintas ⇒ ids distintos ⇒ duplicado si no se reconcilia.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const porNombre = new Map<string, string[]>()
for (const n of nodos) {
  const k = norm(n.label)
  porNombre.set(k, [...(porNombre.get(k) ?? []), n.id])
}

const descartarPorId = new Map<string, boolean>()

const filasNodos = nodos.map((n) => {
  const sinAristas = (gradoEntrada.get(n.id) ?? 0) + (gradoSalida.get(n.id) ?? 0) === 0
  const descartar = !n.tieneContexto && sinAristas

  const colision = (porNombre.get(norm(n.label)) ?? []).length > 1
  const avisos = [n.revisar, colision ? `REVISAR: "${n.label}" aparece en las dos fuentes con ids distintos — reconciliar` : '']
    .filter(Boolean)
    .join(' | ')

  const generada: Record<string, string> = {
    id: n.id,
    descartar: descartar ? 'si' : '',
    node_type: n.nodeType,
    subtipo: n.subtipo,
    label: n.label,
    descripcion_breve: n.sub.slice(0, 200),
    disciplina: '',
    is_stub: !n.tieneContexto ? 'si' : '',
    fecha: n.fecha,
    thumb: n.imgPath ? `REVISAR:${n.imgPath}` : '',
    // Vacío = el import elige por node_type. Con valor, manda esto.
    shape: n.shape,
    ref_fuente: n.fuente,
    ref_sub: n.sub,
    ref_grado_entrada: String(gradoEntrada.get(n.id) ?? 0),
    ref_grado_salida: String(gradoSalida.get(n.id) ?? 0),
    ref_revisar: avisos,
  }

  const fila = conservar(generada, nodosPrevios.get(n.id), CURADAS_NODO)
  // Una colisión de nombre es un hecho nuevo: se avisa aunque la fila ya estuviera curada.
  if (colision && !fila.ref_revisar.includes('las dos fuentes')) {
    fila.ref_revisar = [fila.ref_revisar, `REVISAR: "${n.label}" aparece en las dos fuentes con ids distintos — reconciliar`]
      .filter(Boolean)
      .join(' | ')
  }
  descartarPorId.set(n.id, fila.descartar.trim().toLowerCase() === 'si')
  return fila
})

const labelPorId = new Map(nodos.map((n) => [n.id, n.label]))

const filasVinculos = vinculos.map((v) => {
  const generada: Record<string, string> = {
    id: `${v.origen}__${v.destino}`,
    descartar: descartarPorId.get(v.origen) || descartarPorId.get(v.destino) ? 'si' : '',
    origen: v.origen,
    destino: v.destino,
    tipo_vinculo: v.tipoVinculo,
    rol: '',
    ref_fuente: v.fuente,
    ref_origen_label: labelPorId.get(v.origen) ?? '?',
    ref_destino_label: labelPorId.get(v.destino) ?? '?',
  }
  return conservar(generada, vinculosPrevios.get(generada.id), CURADAS_VINCULO)
})

// Vínculos escritos a mano en la planilla: no vienen de ningún dump y hay que conservarlos.
// Son los que importan de verdad — "quién hizo qué obra" no existe en Mongo.
const idsGenerados = new Set(filasVinculos.map((f) => f.id))
const aMano = [...vinculosPrevios.values()].filter((f) => !idsGenerados.has(f.id))
for (const f of aMano) {
  filasVinculos.push({ ...f, ref_fuente: f.ref_fuente || 'manual' })
}

fs.mkdirSync(outDir, { recursive: true })

const columnasNodos = [
  'id', 'descartar', 'node_type', 'subtipo', 'label', 'descripcion_breve', 'disciplina',
  'is_stub', 'fecha', 'thumb', 'shape', 'ref_fuente', 'ref_sub', 'ref_grado_entrada',
  'ref_grado_salida', 'ref_revisar',
]
const columnasVinculos = [
  'id', 'descartar', 'origen', 'destino', 'tipo_vinculo', 'rol',
  'ref_fuente', 'ref_origen_label', 'ref_destino_label',
]

fs.writeFileSync(rutaNodos, escribirCsv(columnasNodos, filasNodos))
fs.writeFileSync(rutaVinculos, escribirCsv(columnasVinculos, filasVinculos))

const vivos = filasNodos.filter((f) => f.descartar !== 'si')
const porFuente = (f: string) => vivos.filter((n) => n.ref_fuente === f).length
const marcados = vivos.filter((f) => f.ref_revisar).length
const conservadas = filasNodos.filter((f) => nodosPrevios.has(f.id)).length

console.log(`descartados en la lectura: ${descartadosSinNombre} sin nombre, ${descartadosBasura} del formulario, ${descartadosFormato} etiquetas de formato`)
console.log(`nodos exportados:    ${filasNodos.length} (${vivos.length} vivos — ${porFuente('red')} de la red, ${porFuente('sitio')} del sitio)`)
console.log(`vinculos exportados: ${filasVinculos.length}${aMano.length ? ` (${aMano.length} escritos a mano, conservados)` : ''}`)
console.log(`curaduría previa conservada en ${conservadas} filas`)
console.log(`filas vivas marcadas con REVISAR: ${marcados}`)
