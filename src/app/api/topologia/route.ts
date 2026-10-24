// Único punto del runtime que toca Postgres (VIST-05). Dos SELECT planos, sin joins: la base no
// traversa nada — el recorrido lo hace un BFS sobre un Map en el cliente (PROJECT.md).
// ponytail: sin ETag, sin cache, sin revalidación. La topología de v1 son ~50 nodos, unos pocos
// KB. Cuando el dump crezca o las ediciones tengan que verse sin recargar, acá entra un ETag.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Pool } from 'pg'
import type { Subgrafo, NodoGrafo, VinculoGrafo } from '@/types/vista'
import { horarioOk } from '../../../lib/red/detalle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 })

interface FilaNodo {
  id: string
  node_type: NodoGrafo['nodeType']
  subtipo: string
  label: string
  descripcion_breve: string | null
  thumb: string | null
  viz_params: NodoGrafo['vizParams']
  is_stub: boolean
  fecha: Date | null
  disciplina: string | null
  location_id: string | null
  horario: string | null
  ficha: boolean
}

interface FilaVinculo {
  id: string
  origen: string
  destino: string
  tipo_vinculo: VinculoGrafo['tipoVinculo']
  rol: string | null
  desde: string | null
  hasta: string | null
}

function aNodoGrafo(f: FilaNodo): NodoGrafo {
  return {
    id: f.id,
    nodeType: f.node_type,
    subtipo: f.subtipo,
    label: f.label,
    ...(f.descripcion_breve !== null && { descripcionBreve: f.descripcion_breve }),
    ...(f.thumb !== null && { thumb: f.thumb }),
    vizParams: f.viz_params,
    isStub: f.is_stub,
    ...(f.fecha !== null && { fecha: f.fecha.toISOString() }),
    ...(f.disciplina !== null && { disciplina: f.disciplina }),
    ...(f.location_id !== null && { locationId: f.location_id }),
    ...(horarioOk(f.horario) && { horario: f.horario }),
    ...(f.ficha && { ficha: true as const }),
  }
}

function aVinculoGrafo(f: FilaVinculo): VinculoGrafo {
  return {
    id: f.id,
    origen: f.origen,
    destino: f.destino,
    tipoVinculo: f.tipo_vinculo,
    ...(f.rol !== null && { rol: f.rol }),
    ...(f.desde !== null && { desde: f.desde }),
    ...(f.hasta !== null && { hasta: f.hasta }),
  }
}

export async function GET() {
  // ponytail: fixture por env explícita, jamás fallback silencioso ante un error de la base
  // (ocultaría una caída real); sale cuando 02-05 cargue las aristas reales Tropical Poncho -> área.
  if (process.env.TOPOLOGIA_FIXTURE === '1') {
    return Response.json(JSON.parse(await readFile(join(process.cwd(), 'src/lib/red/fixtures/topologia.json'), 'utf8')))
  }
  try {
    const [nodosRes, vinculosRes] = await Promise.all([
      // metadata queda afuera: es la data profunda (DATA-02), se pide al abrir el nodo. Excepción, dos derivados: D-44, `ficha.horario`
      // ("22–04hs", tope 40 en el import y en horarioOk), porque el preview de un evento futuro no pide nada al servidor; y D-48, si
      // hay `ficha.contenido` (un booleano, no el texto), porque Expandir se decide en el preview sin pedir el detalle.
      // ponytail: dos derivados de metadata en la topología; si viajan más, columna propia en una migración. `ficha` dice "hay
      // contenido", no "es válido": lo garantiza el import, que valida todo antes de escribir.
      pool.query<FilaNodo>(
        `SELECT id, node_type, subtipo, label, descripcion_breve, thumb, viz_params,
                is_stub, fecha, disciplina, location_id, metadata #>> '{ficha,horario}' AS horario,
                COALESCE(metadata #> '{ficha,contenido}' <> '{}'::jsonb, false) AS ficha
         FROM nodos`,
      ),
      // descripcion queda afuera: es prosa no filtrable (DATA-04), se pide al abrir el vínculo. `desde, hasta` (D-49) viajan: el
      // período es contenido público, como el rol. OJO: esta consulta necesita db/migrations/002_vigencia_vinculos.sql; contra una
      // base sin ella /api/topologia da 503. Migrar (Neon incluida) ANTES de desplegar.
      pool.query<FilaVinculo>(
        `SELECT id, origen, destino, tipo_vinculo, rol, desde, hasta
         FROM vinculos`,
      ),
    ])

    const nodos = nodosRes.rows.map(aNodoGrafo)
    const vinculos = vinculosRes.rows.map(aVinculoGrafo)

    return Response.json({ nodos, vinculos } satisfies Subgrafo)
  } catch (error) {
    console.error('GET /api/topologia', error)
    return Response.json({ error: 'No se pudo leer la topología' }, { status: 503 })
  }
}
