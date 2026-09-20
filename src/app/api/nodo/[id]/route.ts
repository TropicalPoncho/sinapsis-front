// Detalle profundo de un nodo (D-13), pedido al abrir "Ver más". Solo sale lo que
// validarDetalle proyecta: el metadata legado nunca llega al cliente.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Pool } from 'pg'
import { validarDetalle } from '../../../../lib/red/detalle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ponytail: pool duplicado del de /api/topologia; se extrae a un módulo si aparece un tercer handler.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 })

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[\w-]{1,64}$/.test(id)) return Response.json({ error: 'id inválido' }, { status: 400 })
  try {
    if (process.env.TOPOLOGIA_FIXTURE === '1') {
      const f = JSON.parse(await readFile(join(process.cwd(), 'src/lib/red/fixtures/detalles.json'), 'utf8'))
      return Response.json(validarDetalle(f[id]))
    }
    const { rows } = await pool.query('SELECT metadata FROM nodos WHERE id = $1', [id])
    if (!rows.length) return Response.json({ error: 'Nodo no encontrado' }, { status: 404 })
    return Response.json(validarDetalle(rows[0].metadata))
  } catch (error) {
    console.error('GET /api/nodo/[id]', error)
    return Response.json({ error: 'No se pudo leer el nodo' }, { status: 503 })
  }
}
