// Único punto del runtime que toca Postgres (VIST-05). Dos SELECT planos, sin joins: la base no
// traversa nada — el recorrido lo hace un BFS sobre un Map en el cliente (PROJECT.md).
// ponytail: sin ETag, sin cache, sin revalidación. La topología de v1 son ~50 nodos, unos pocos
// KB. Cuando el dump crezca o las ediciones tengan que verse sin recargar, acá entra un ETag.

import { Pool } from 'pg'
import type { Subgrafo, NodoGrafo, VinculoGrafo } from '@/types/vista'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 })

interface FilaNodo {
  id: string
  node_type: NodoGrafo['nodeType']
  label: string
  descripcion_breve: string | null
  thumb: string | null
  viz_params: NodoGrafo['vizParams']
  is_stub: boolean
  fecha: Date | null
  disciplina: string | null
  location_id: string | null
}

interface FilaVinculo {
  id: string
  origen: string
  destino: string
  tipo_vinculo: VinculoGrafo['tipoVinculo']
  rol: string | null
}

function aNodoGrafo(f: FilaNodo): NodoGrafo {
  return {
    id: f.id,
    nodeType: f.node_type,
    label: f.label,
    ...(f.descripcion_breve !== null && { descripcionBreve: f.descripcion_breve }),
    ...(f.thumb !== null && { thumb: f.thumb }),
    vizParams: f.viz_params,
    isStub: f.is_stub,
    ...(f.fecha !== null && { fecha: f.fecha.toISOString() }),
    ...(f.disciplina !== null && { disciplina: f.disciplina }),
    ...(f.location_id !== null && { locationId: f.location_id }),
  }
}

function aVinculoGrafo(f: FilaVinculo): VinculoGrafo {
  return {
    id: f.id,
    origen: f.origen,
    destino: f.destino,
    tipoVinculo: f.tipo_vinculo,
    ...(f.rol !== null && { rol: f.rol }),
  }
}

export async function GET() {
  try {
    const [nodosRes, vinculosRes] = await Promise.all([
      // metadata queda afuera: es la data profunda (DATA-02), se pide al abrir el nodo.
      pool.query<FilaNodo>(
        `SELECT id, node_type, label, descripcion_breve, thumb, viz_params,
                is_stub, fecha, disciplina, location_id
         FROM nodos`,
      ),
      // descripcion queda afuera: es prosa no filtrable (DATA-04), se pide al abrir el vínculo.
      pool.query<FilaVinculo>(
        `SELECT id, origen, destino, tipo_vinculo, rol
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
