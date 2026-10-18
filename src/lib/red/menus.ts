import type { Adyacencia } from '../vista/adyacencia.ts'
import type { NodeType, NodoGrafo, Subgrafo, VinculoGrafo } from '../../types/vista.ts'
import { slugDe } from './slugs.ts'

const porLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'es')

// Cronológico (más viejo primero); sin fecha, al final y por nombre. Es el orden de la lista lateral:
// las ediciones de un evento tienen que leerse en el orden en que pasaron.
const porFecha = (a: { fecha?: string; label: string }, b: { fecha?: string; label: string }) =>
  a.fecha && b.fecha ? a.fecha.localeCompare(b.fecha) || porLabel(a, b) : a.fecha ? -1 : b.fecha ? 1 : porLabel(a, b)

// Une `sale` y `entra`: el otro extremo de cada vínculo del nodo.
function vecinos(ady: Adyacencia, id: string): { nodo: NodoGrafo; v: VinculoGrafo }[] {
  const out: { nodo: NodoGrafo; v: VinculoGrafo }[] = []
  for (const v of [...(ady.sale.get(id) ?? []), ...(ady.entra.get(id) ?? [])]) {
    const nodo = ady.nodos.get(v.origen === id ? v.destino : v.origen)
    if (nodo) out.push({ nodo, v })
  }
  return out
}

// Las áreas de una entidad: AGRUPACION destino de un COMPONE que SALE de ella. Solo ese sentido: una
// persona que es miembro de un área (Nosotrxs) no la tiene como propia (D-24).
export function agrupadoresDe(ady: Adyacencia, entidadId: string) {
  const vistos = new Map<string, NodoGrafo>()
  for (const v of ady.sale.get(entidadId) ?? []) {
    const nodo = ady.nodos.get(v.destino)
    if (nodo?.nodeType === 'AGRUPACION' && v.tipoVinculo === 'COMPONE') vistos.set(nodo.id, nodo)
  }
  return [...vistos.values()].sort(porLabel).map((n) => ({ id: n.id, label: n.label, color: n.vizParams.color }))
}

// D-11 / D-25: quien compone al nodo (COMPONE entrante) con origen del `tipo` pedido: por defecto el
// agrupador (la serie o área de una obra); con 'ENTIDAD', la dueña de un área.
// ponytail: con dos dueñas/agrupadores gana el primero por nombre (el modelo admite varios, solo el menú
// elige uno); salida: elegir por la red de la que se vino si aparece el caso.
export function padreDe(ady: Adyacencia, nodoId: string, tipo: NodeType = 'AGRUPACION'): string | null {
  const padres = (ady.entra.get(nodoId) ?? [])
    .filter((v) => v.tipoVinculo === 'COMPONE' && ady.nodos.get(v.origen)?.nodeType === tipo)
    .map((v) => ady.nodos.get(v.origen)!)
    .sort(porLabel)
  return padres[0]?.id ?? null
}

// Lista lateral: los miembros del área o serie en la que se está. Las áreas van en el menú superior,
// así que no se listan acá (la dueña del área ya no entra a la Vista: ver vistaDe).
export function nodosDeLaRed(sub: Subgrafo, redId: string) {
  return sub.nodos
    .filter((n) => n.id !== redId && !(n.nodeType === 'AGRUPACION' && n.subtipo === 'area'))
    .sort(porFecha)
    .map((n) => ({ id: n.id, label: n.label, subtipo: n.subtipo }))
}

// Obras y eventos vecinos de una entidad (ambos sentidos), más viejos primero: lo que "Sumar sus obras" agrega.
export function obrasDe(ady: Adyacencia, entidadId: string): string[] {
  const vistos = new Map<string, NodoGrafo>()
  for (const { nodo } of vecinos(ady, entidadId)) {
    if (nodo.nodeType === 'OBRA' || nodo.nodeType === 'EVENTO') vistos.set(nodo.id, nodo)
  }
  return [...vistos.values()].sort(porFecha).map((n) => n.id)
}

// D-29 / D-32: una sección agrupa a los vecinos de un nodo por el `rol` normalizado de sus vínculos de
// participación. Mismo `{ id, label, color }` que las áreas reales de `agrupadoresDe`, más los `nodos`: el menú
// superior dibuja las dos con el mismo componente. `rol` solo viaja en "Otros": la grafía que no encajó.
export interface Seccion {
  id: string
  label: string
  color: string
  nodos: { id: string; rol?: string }[]
}
// roles.json: `secciones` en el orden en que se muestran; `sinRol` por `TIPO` o `TIPO:sale|entra` (sentido del nodo dueño).
export interface VocabularioRoles {
  secciones: { etiqueta: string; roles: string[] }[]
  sinRol: Record<string, string>
  // Etiqueta de la sección cuyos nodos son el lugar del evento (D-44).
  lugar?: string
}

// Solo compara, nunca se muestra: sin tildes ni mayúsculas, y en cada palabra de 3+ letras sin plural ni `e` final
// ("LIVE SETs" = "Live Set", "Artistas Convocades" = "Artista Convocade").
export const claveRol = (rol: string) =>
  rol.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().split(/\s+/)
    .map((w) => (w.length >= 3 ? w.replace(/(es|s)$/, '').replace(/e$/, '') : w)).join(' ')

// ponytail: los tipos de participación son una lista fija; salida: sumar uno cuando aparezca un vínculo de participación
// nuevo. El vocabulario llega por parámetro desde un JSON del repo; salida: una tabla `roles` servida con la topología
// cuando lxs creadxrs carguen roles (M2), sin tocar esta función.
const PARTICIPACION = new Set<string>(['COLABORO_EN', 'CORREALIZO', 'PRODUJO', 'INTEGRA'])
const SEPARADOR = /\s*[,+/]\s*|\s+y\s+/i // constante: el dato nunca arma el RegExp
const OTROS = 'Otros'
const esObra = (n: NodoGrafo) => n.nodeType === 'OBRA' || n.nodeType === 'EVENTO'

// En los dos sentidos: en la base el evento es el origen del COLABORO_EN, en la fixture lo es la creadxr; contar solo
// uno dejaría sin secciones a la mitad de los nodos. Así la misma regla da las de un evento y las áreas derivadas de una creadxr.
export function seccionesDe(ady: Adyacencia, nodoId: string, vocabulario: VocabularioRoles): Seccion[] {
  const dueno = ady.nodos.get(nodoId)
  if (!dueno) return []
  const indice = new Map(vocabulario.secciones.flatMap((s) => s.roles.map((r) => [claveRol(r), s.etiqueta] as const)))
  const grupos = new Map<string, Map<string, { nodo: NodoGrafo; roles: string[] }>>()
  const poner = (etiqueta: string, nodo: NodoGrafo, rol?: string) => {
    const g = grupos.get(etiqueta) ?? new Map()
    const e = g.get(nodo.id) ?? { nodo, roles: [] }
    if (rol && !e.roles.includes(rol)) e.roles.push(rol)
    g.set(nodo.id, e)
    grupos.set(etiqueta, g)
  }
  for (const { nodo, v } of vecinos(ady, nodoId)) {
    if (!PARTICIPACION.has(v.tipoVinculo)) continue
    const partes = (v.rol ?? '').split(SEPARADOR).map((p) => p.trim()).filter(Boolean)
    if (!partes.length) {
      const sinRol = vocabulario.sinRol
      poner(sinRol[`${v.tipoVinculo}:${v.origen === nodoId ? 'sale' : 'entra'}`] ?? sinRol[v.tipoVinculo] ?? OTROS, nodo)
    }
    for (const p of partes) {
      const etiqueta = indice.get(claveRol(p))
      if (etiqueta) poner(etiqueta, nodo)
      else poner(OTROS, nodo, p)
    }
  }
  // Vocabulario, después las etiquetas de `sinRol` fuera de la lista por nombre, "Otros" al final.
  const orden = vocabulario.secciones.map((s) => s.etiqueta)
  const lugar = (e: string) => (e === OTROS ? Infinity : orden.indexOf(e) < 0 ? orden.length : orden.indexOf(e))
  return [...grupos.keys()]
    .sort((a, b) => lugar(a) - lugar(b) || a.localeCompare(b, 'es'))
    .map((etiqueta) => ({
      id: slugDe(etiqueta),
      label: etiqueta,
      color: dueno.vizParams.color,
      nodos: [...grupos.get(etiqueta)!.values()]
        .sort((a, b) => (esObra(a.nodo) !== esObra(b.nodo) ? (esObra(a.nodo) ? -1 : 1) : esObra(a.nodo) ? porFecha(a.nodo, b.nodo) : porLabel(a.nodo, b.nodo)))
        .map(({ nodo, roles }) => (roles.length ? { id: nodo.id, rol: roles.join(', ') } : { id: nodo.id })),
    }))
}
