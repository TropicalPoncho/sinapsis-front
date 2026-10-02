// Segunda pasada de la migración: CSV curado + dump de Mongo -> Postgres.
// Falla todo junto antes de tocar la base si algo no valida (D-09).
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { leerCsv } from './csv.ts'
import { cargarFuentes, metadataPorId } from './dumps.ts'

const NODE_TYPES = new Set(['ENTIDAD', 'OBRA', 'EVENTO', 'AGRUPACION'])
const TIPOS_VINCULO = new Set([
  'COMPONE', 'COLABORO_EN', 'CORREALIZO', 'PRODUJO', 'INTEGRA', 'INSPIRO', 'REGISTRO', 'SUCEDE_EN', 'PRECEDE',
])

// DATA-03/DATA-06: paleta de marca (src/styles/style.css --ColorPalette-*, mismo array que
// COLORS_ARRAY en src/engine/graph/constants.js). Color elegido al azar (determinista por id) de
// acá por nodo — no por tipo: la primera versión mezclaba tonos de un único verde por node_type y
// se veía todo turquesa, nada distinto de sus vecinos. Sin negro: es el mismo color de fondo de
// la escena (background.js), un nodo negro sería invisible.
const PALETA = ['#8AE2C8', '#578CCB', '#9900FF', '#FF0074', '#FFBC00', '#FFFFFF']

// Pool de formas por tipo para el nodo que no trae `shape` curado a mano en el CSV — sin esto,
// todo ENTIDAD (la gran mayoría del dataset) caía en la misma forma única y se veían todos
// idénticos. `shapeVariado` elige una del pool de forma determinista por id (ver seedDeId): la
// misma red se ve siempre igual entre reimports, pero cada nodo del mismo tipo es visualmente
// distinto de sus pares.
// 'Noise' queda afuera a propósito: NoiseThreeObject es una esfera lisa con material estándar,
// un placeholder de cuando se sacó una textura rota (ver noiseThreeObject.js) — no aporta
// variedad visual, es indistinguible de "sin forma".
const SHAPES_POR_TIPO: Record<string, string[]> = {
  ENTIDAD: ['Marble', 'Perlin', 'CrossedLines', 'Lights', 'Twist'],
  OBRA: ['Perlin', 'Marble', 'CrossedLines'],
  EVENTO: ['Wave Line', 'Twist', 'Lights', 'Fire'],
  AGRUPACION: ['Twist', 'CrossedLines', 'Perlin Noise', 'Lights'],
}

// Si la fila del CSV trae `shape`, esa manda siempre — la forma 3D es curaduría visual y varias
// obras la tienen elegida a mano (Kutral es Fire, Tempistica es Twist, SOMA es Lights). Perderla
// por asignar del pool sería borrar una decisión de autorx.

// Los tipos que el motor tiene registrados con `static type`. Validar acá evita que un nombre
// mal escrito llegue a runtime, donde ThreeObjectManager tira "Invalid ThreeObject Class type"
// y el nodo simplemente no se dibuja.
const SHAPES_VALIDAS = new Set([
  'CrossedLines', 'Fire', 'Image', 'Lights', 'Lines', 'Marble', 'Noise', 'Particles',
  'Perlin', 'Perlin Noise', 'SimpleText', 'Text', 'Twist', 'Wave Line',
])

// Velocidad base de la animación de cada forma (viz_params.speed), igual para todo nodo — sin
// variación por id (era ±40%, sacada a pedido: "quiero que sea igual para todes por ahora").
// Historial: 1.0 original -> 0.3 (-70%) -> 0.12 (-60% más; recién ahí se entendió que
// Lights/Fire/WaveLine tenían un `this.speed` hardcodeado que pisaba este valor, así que ninguno
// de los dos recortes anteriores se había aplicado de verdad en esos tres) -> 0.05 (-58% más).
const SPEED_DEFAULT = 0.05

// Seed determinista por (id, sal) — FNV-1a 32 bits normalizada a [0,1) con tres decimales. Sin
// fuente aleatoria: reimportar no puede reacomodar la animación de toda la red. La sal separa los
// distintos usos (shape/speed/noise) para que no varíen en lockstep unos con otros.
function seedDe(id: string, sal = ''): number {
  const texto = id + sal
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  const normalizado = (h >>> 0) / 0xffffffff
  return Math.round(normalizado * 1000) / 1000
}
const seedDeId = (id: string) => seedDe(id)

// Elige una forma del pool del tipo, determinista por id. Sin pool para el tipo (no debería
// pasar, los 4 node_type están cubiertos), cae a la primera forma válida como piso.
function shapeVariado(nodeType: string, id: string): string {
  const pool = SHAPES_POR_TIPO[nodeType] ?? ['Marble']
  return pool[Math.floor(seedDe(id, ':shape') * pool.length) % pool.length]
}

// ±40% sobre la base: mismo mecanismo de variedad reproducible que `shapeVariado`, para que dos
// nodos del mismo tipo no se vean idénticos en velocidad/ruido además de en forma.
function variar(id: string, sal: string, base: number, amplitud: number): number {
  return Math.round((base + (seedDe(id, sal) - 0.5) * 2 * amplitud) * 100) / 100
}

// Color determinista por id: uno de la paleta, no una mezcla del mismo tono — la primera versión
// de esto (mezclar hacia blanco/negro un único verde por tipo) daba variación real pero seguía
// leyéndose "todo turquesa, todo lo mismo".
function colorDeNodo(id: string): string {
  return PALETA[Math.floor(seedDe(id, ':color') * PALETA.length) % PALETA.length]
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
  // Si hay thumb real, el shape por defecto es Image — el logo manda sobre el genérico por tipo.
  // Solo cuando ni el CSV ni el thumb dicen nada, cae al pool variado por tipo.
  const shape = f.shape?.trim() || (thumb ? 'Image' : shapeVariado(f.node_type, f.id))
  return {
    id: f.id,
    node_type: f.node_type,
    subtipo: f.subtipo.trim(),
    label: f.label,
    descripcion_breve: f.descripcion_breve || null,
    disciplina: f.disciplina || null,
    thumb,
    viz_params: {
      shape,
      color: colorDeNodo(f.id),
      // Igual para todos los nodos por ahora — a pedido, sin variación por id (antes ±40%).
      speed: SPEED_DEFAULT,
      noise: variar(f.id, ':noise', 0.5, 0.2),
      seed: seedDeId(f.id),
    },
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
