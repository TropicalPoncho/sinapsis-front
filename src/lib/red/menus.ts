import type { Adyacencia } from '../vista/adyacencia.ts'
import type { NodoGrafo, Subgrafo, VinculoGrafo } from '../../types/vista.ts'

const porLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'es')

// Une `sale` y `entra`: el otro extremo de cada vínculo del nodo.
function vecinos(ady: Adyacencia, id: string): { nodo: NodoGrafo; v: VinculoGrafo }[] {
  const out: { nodo: NodoGrafo; v: VinculoGrafo }[] = []
  for (const v of [...(ady.sale.get(id) ?? []), ...(ady.entra.get(id) ?? [])]) {
    const nodo = ady.nodos.get(v.origen === id ? v.destino : v.origen)
    if (nodo) out.push({ nodo, v })
  }
  return out
}

export function agrupadoresDe(ady: Adyacencia, entidadId: string) {
  const vistos = new Map<string, NodoGrafo>()
  for (const { nodo, v } of vecinos(ady, entidadId)) {
    if (nodo.nodeType === 'AGRUPACION' && v.tipoVinculo === 'COMPONE') vistos.set(nodo.id, nodo)
  }
  return [...vistos.values()].sort(porLabel).map((n) => ({ id: n.id, label: n.label, color: n.vizParams.color }))
}

export function entidadDeMenu(
  ady: Adyacencia,
  { redId, enfocadoId }: { redId: string | null; enfocadoId: string | null },
): string | null {
  for (const id of [redId, enfocadoId]) {
    if (id && ady.nodos.get(id)?.nodeType === 'ENTIDAD') return id
  }
  return null
}

// D-11: el agrupador que compone al nodo (origen AGRUPACION, destino el nodo).
export function padreDe(ady: Adyacencia, nodoId: string): string | null {
  const padres = (ady.entra.get(nodoId) ?? [])
    .filter((v) => v.tipoVinculo === 'COMPONE' && ady.nodos.get(v.origen)?.nodeType === 'AGRUPACION')
    .map((v) => ady.nodos.get(v.origen)!)
    .sort(porLabel)
  return padres[0]?.id ?? null
}

export function nodosDeLaRed(sub: Subgrafo, redId: string) {
  return sub.nodos
    .filter((n) => n.id !== redId)
    .sort(porLabel)
    .map((n) => ({ id: n.id, label: n.label, subtipo: n.subtipo }))
}

// ponytail: sin ordenar por relevancia del rol; sale cuando el dato traiga un orden explícito.
export function creditosDe(ady: Adyacencia, obraId: string) {
  const porEntidad = new Map<string, { nombre: string; roles: string[] }>()
  for (const { nodo, v } of vecinos(ady, obraId)) {
    if (nodo.nodeType !== 'ENTIDAD') continue
    const c = porEntidad.get(nodo.id) ?? { nombre: nodo.label, roles: [] }
    if (v.rol && !c.roles.includes(v.rol)) c.roles.push(v.rol)
    porEntidad.set(nodo.id, c)
  }
  return [...porEntidad]
    .map(([id, c]) => ({ id, nombre: c.nombre, ...(c.roles.length ? { rol: c.roles.join(', ') } : {}) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
