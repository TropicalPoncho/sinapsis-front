// Segunda pasada de la migración: CSV curado + dump de Mongo -> Postgres.
// Falla todo junto antes de tocar la base si algo no valida (D-09).
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { leerCsv } from './csv.ts'
import { cargarFuentes, metadataPorId } from './dumps.ts'

const NODE_TYPES = new Set(['ENTIDAD', 'OBRA', 'EVENTO', 'AGRUPACION'])
const TIPOS_VINCULO = new Set([
  'COMPONE', 'COLABORO_EN', 'CORREALIZO', 'PRODUJO', 'INTEGRA', 'INSPIRO', 'REGISTRO',
])

// DATA-03: shape/color asignados por tipo, no migrados — el dump no tiene estilos que traducir (D-10).
const VIZ_POR_TIPO: Record<string, { shape: string; color: string }> = {
  ENTIDAD: { shape: 'Marble', color: '#6EE7B7' },
  OBRA: { shape: 'Perlin', color: '#F472B6' },
  EVENTO: { shape: 'Wave Line', color: '#A78BFA' },
  AGRUPACION: { shape: 'Twist', color: '#FBBF24' },
}

// Default por node_type. Es solo el piso: si la fila del CSV trae `shape`, esa manda — la forma
// 3D es curaduría visual y varias obras la tienen elegida a mano (Kutral es Fire, Tempistica es
// Twist, SOMA es Lights). Perderla por asignar por tipo sería borrar una decisión de autorx.

// Los tipos que el motor tiene registrados con `static type`. Validar acá evita que un nombre
// mal escrito llegue a runtime, donde ThreeObjectManager tira "Invalid ThreeObject Class type"
// y el nodo simplemente no se dibuja.
const SHAPES_VALIDAS = new Set([
  'CrossedLines', 'Fire', 'Image', 'Lights', 'Lines', 'Marble', 'Noise', 'Particles',
  'Perlin', 'Perlin Noise', 'SimpleText', 'Text', 'Twist', 'Wave Line',
])

// Seed determinista por id (FNV-1a 32 bits, normalizada a [0,1) con tres decimales).
// Sin fuente aleatoria: reimportar no puede reacomodar la animación de toda la red.
function seedDeId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  const normalizado = (h >>> 0) / 0xffffffff
  return Math.round(normalizado * 1000) / 1000
}

// La metadata sale de las dos fuentes, normalizada en dumps.ts — el mismo módulo que usa
// el export, para que ambas pasadas vean exactamente lo mismo.
const metadataDeFuentes = metadataPorId(cargarFuentes().nodos)

const csvDir = path.resolve(process.cwd(), 'data/curaduria')
const filasNodos = leerCsv(fs.readFileSync(path.join(csvDir, 'nodos.csv'), 'utf8'))
const filasVinculos = leerCsv(fs.readFileSync(path.join(csvDir, 'vinculos.csv'), 'utf8'))

const esSi = (v: string | undefined) => (v ?? '').trim().toLowerCase() === 'si'

// --- Validación: juntar todos los errores antes de escribir nada ---
const errores: string[] = []
const idsNodoVistos = new Set<string>()
const nodosVivos = new Set<string>() // sobreviven al filtrado por descartar

filasNodos.forEach((fila, i) => {
  const numeroFila = i + 2 // +1 header, +1 base 1
  if (idsNodoVistos.has(fila.id)) errores.push(`nodos.csv línea ${numeroFila}: id repetido "${fila.id}"`)
  idsNodoVistos.add(fila.id)

  if (esSi(fila.descartar)) return // no valida filas descartadas

  nodosVivos.add(fila.id)

  if (!NODE_TYPES.has(fila.node_type)) {
    errores.push(`nodos.csv línea ${numeroFila}: node_type inválido "${fila.node_type}"`)
  }
  // El vocabulario válido lo impone la FK contra `subtipos`; acá solo se atrapa el vacío,
  // que produciría un error de FK mucho menos legible.
  if (fila.subtipo.trim() === '') {
    errores.push(`nodos.csv línea ${numeroFila}: subtipo vacío`)
  }
  const shape = fila.shape?.trim() ?? ''
  if (shape !== '' && !SHAPES_VALIDAS.has(shape)) {
    errores.push(`nodos.csv línea ${numeroFila}: shape "${shape}" no está registrada en el motor`)
  }
  if (fila.label.trim() === '') {
    errores.push(`nodos.csv línea ${numeroFila}: label vacío`)
  }
  if (fila.descripcion_breve && fila.descripcion_breve.length > 200) {
    errores.push(`nodos.csv línea ${numeroFila}: descripcion_breve de más de 200 caracteres`)
  }
  if (fila.fecha.trim() !== '' && isNaN(Date.parse(fila.fecha))) {
    errores.push(`nodos.csv línea ${numeroFila}: fecha no parseable "${fila.fecha}"`)
  }
})

const idsVinculoVistos = new Set<string>()
filasVinculos.forEach((fila, i) => {
  const numeroFila = i + 2
  if (idsVinculoVistos.has(fila.id)) errores.push(`vinculos.csv línea ${numeroFila}: id repetido "${fila.id}"`)
  idsVinculoVistos.add(fila.id)

  if (esSi(fila.descartar)) return

  if (fila.tipo_vinculo === 'CUSTOM') {
    errores.push(`vinculos.csv línea ${numeroFila}: CUSTOM no existe en tipo_vinculo, el matiz va en rol`)
  } else if (!TIPOS_VINCULO.has(fila.tipo_vinculo)) {
    errores.push(`vinculos.csv línea ${numeroFila}: tipo_vinculo inválido "${fila.tipo_vinculo}"`)
  }
  if (fila.rol && fila.rol.length > 60) {
    errores.push(`vinculos.csv línea ${numeroFila}: rol de más de 60 caracteres`)
  }
  if (fila.origen === fila.destino) {
    errores.push(`vinculos.csv línea ${numeroFila}: origen y destino iguales "${fila.origen}"`)
  }
})

if (errores.length > 0) {
  console.error(`${errores.length} error(es) de validación:`)
  for (const e of errores) console.error(`  - ${e}`)
  process.exit(1)
}

// --- Mapeo ---
let thumbsSinResolver = 0

const nodosACargar = filasNodos.filter((f) => !esSi(f.descartar))
const vinculosACargar = filasVinculos.filter(
  (f) => !esSi(f.descartar) && nodosVivos.has(f.origen) && nodosVivos.has(f.destino)
)

// Un nodo escrito a mano en la planilla no está en ningún dump: metadata vacía, no es un error.
function metadataDe(id: string): Record<string, unknown> {
  return metadataDeFuentes.get(id) ?? {}
}

const nodosParaInsertar = nodosACargar.map((f) => {
  let thumb: string | null = f.thumb || null
  if (thumb?.startsWith('REVISAR:')) {
    // ponytail: thumb queda en NULL mientras el prefijo REVISAR: siga puesto. Los archivos están en
    // collectiveConscience (solo lectura). Se resuelve cuando se decida dónde se sirven los assets
    // — en la fase 4 o 5, editando la columna thumb del CSV.
    console.log(`thumb sin resolver: ${f.label}`)
    thumbsSinResolver++
    thumb = null
  }
  const viz = VIZ_POR_TIPO[f.node_type]
  const shape = f.shape?.trim() || viz.shape
  return {
    id: f.id,
    node_type: f.node_type,
    subtipo: f.subtipo.trim(),
    label: f.label,
    descripcion_breve: f.descripcion_breve || null,
    disciplina: f.disciplina || null,
    thumb,
    viz_params: { shape, color: viz.color, speed: 1, noise: 0.5, seed: seedDeId(f.id) },
    is_stub: esSi(f.is_stub),
    fecha: f.fecha.trim() === '' ? null : f.fecha,
    metadata: metadataDe(f.id),
  }
})

const vinculosParaInsertar = vinculosACargar.map((f) => ({
  id: f.id,
  origen: f.origen,
  destino: f.destino,
  tipo_vinculo: f.tipo_vinculo,
  rol: f.rol || null,
  descripcion: null as string | null,
}))

// --- Escritura ---
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Falta DATABASE_URL')
  process.exit(1)
}

const { Client } = pg
const client = new Client({ connectionString: databaseUrl })
await client.connect()

try {
  await client.query('BEGIN')
  await client.query('TRUNCATE vinculos, nodos RESTART IDENTITY CASCADE')

  for (const n of nodosParaInsertar) {
    await client.query(
      `INSERT INTO nodos
        (id, node_type, subtipo, label, descripcion_breve, thumb, viz_params, is_stub, fecha, disciplina, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        n.id, n.node_type, n.subtipo, n.label, n.descripcion_breve, n.thumb,
        JSON.stringify(n.viz_params), n.is_stub, n.fecha, n.disciplina,
        JSON.stringify(n.metadata),
      ]
    )
  }

  for (const v of vinculosParaInsertar) {
    await client.query(
      `INSERT INTO vinculos (id, origen, destino, tipo_vinculo, rol, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [v.id, v.origen, v.destino, v.tipo_vinculo, v.rol, v.descripcion]
    )
  }

  await client.query('COMMIT')
} catch (err) {
  await client.query('ROLLBACK')
  console.error(`import falló, sin cambios en la base: ${(err as Error).message}`)
  process.exit(1)
} finally {
  await client.end()
}

const nodosDescartados = filasNodos.length - nodosACargar.length
const vinculosDescartados = filasVinculos.length - vinculosParaInsertar.length

console.log(`nodos importados:    ${nodosParaInsertar.length} (descartados: ${nodosDescartados})`)
console.log(`vinculos importados: ${vinculosParaInsertar.length} (descartados: ${vinculosDescartados})`)
console.log(`thumbs sin resolver: ${thumbsSinResolver}`)
