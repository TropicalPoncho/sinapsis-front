// Detalle profundo de un nodo (D-13, D-38), pedido al Expandir. Solo sale lo que validarDetalle proyecta de
// `metadata.ficha`: los bloques de contenido (el esquema por defecto sale de bloques.json por tipo y subtipo del
// nodo) y Entradas. El metadata legado nunca llega al cliente.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Pool } from 'pg'
import { esquemaDe, validarDetalle } from '../../../../lib/red/detalle'
import type { BloqueDef } from '../../../../lib/red/detalle'
import bloques from '../../../../lib/red/bloques.json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ponytail: pool duplicado del de /api/topologia; se extrae a un módulo si aparece un tercer handler.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 })

const leer = async (ruta: string) => JSON.parse(await readFile(join(process.cwd(), ruta), 'utf8'))

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[\w-]{1,64}$/.test(id)) return Response.json({ error: 'id inválido' }, { status: 400 })
  const config = bloques as Record<string, BloqueDef[]>
  try {
    if (process.env.TOPOLOGIA_FIXTURE === '1') {
      const detalles = await leer('src/lib/red/fixtures/detalles.json')
      const nodo = ((await leer('src/lib/red/fixtures/topologia.json')).nodos as { id: string; nodeType: string; subtipo: string }[]).find((n) => n.id === id)
      return Response.json(validarDetalle(detalles[id], nodo ? esquemaDe(config, nodo.nodeType, nodo.subtipo) : []))
    }
    const { rows } = await pool.query('SELECT node_type, subtipo, metadata FROM nodos WHERE id = $1', [id])
    if (!rows.length) return Response.json({ error: 'Nodo no encontrado' }, { status: 404 })
    return Response.json(validarDetalle(rows[0].metadata, esquemaDe(config, rows[0].node_type, rows[0].subtipo)))
  } catch (error) {
    console.error('GET /api/nodo/[id]', error)
    return Response.json({ error: 'No se pudo leer el nodo' }, { status: 503 })
  }
}
