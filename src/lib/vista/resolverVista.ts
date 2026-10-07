// resolverVista — pura, sin framework, sin base, sin browser (VIST-01, VIST-07). Corre igual en
// el cliente hoy y en el servidor el día que la topología no entre en el browser.
// La profundidad de cada nodo se calcula acá, en el BFS, y muere con el resultado: nunca se
// persiste ni se cachea (ver CLAUDE.md, invariante sobre el campo de nivel por nodo que ya no existe).

import type { Vista, Subgrafo, NodoGrafo, VinculoGrafo } from '@/types/vista'
import type { Adyacencia } from './adyacencia.ts'

function pasaFiltroVinculo(vista: Vista, v: VinculoGrafo): boolean {
  if (vista.filtroVinculos.length > 0 && !vista.filtroVinculos.includes(v.tipoVinculo)) return false
  if (vista.filtroRoles && vista.filtroRoles.length > 0) {
    if (v.rol === undefined || !vista.filtroRoles.includes(v.rol)) return false
  }
  return true
}

function pasaFiltroNodo(vista: Vista, n: NodoGrafo): boolean {
  if (vista.filtroNodeTypes.length > 0 && !vista.filtroNodeTypes.includes(n.nodeType)) return false
  // node_type es lo estructural; subtipo es el nombre de la cosa. "solo bandas" filtra acá.
  if (vista.filtroSubtipos && vista.filtroSubtipos.length > 0) {
    if (!vista.filtroSubtipos.includes(n.subtipo)) return false
  }
  const fa = vista.filtroAtributos
  if (!fa) return true
  // Fechas ISO 8601 comparadas como string: el mismo formato ordena lexicográficamente
  // igual que cronológicamente.
  if (fa.fechaDesde && (n.fecha === undefined || n.fecha < fa.fechaDesde)) return false
  if (fa.fechaHasta && (n.fecha === undefined || n.fecha > fa.fechaHasta)) return false
  if (fa.disciplinas && fa.disciplinas.length > 0) {
    if (n.disciplina === undefined || !fa.disciplinas.includes(n.disciplina)) return false
  }
  if (fa.locationIds && fa.locationIds.length > 0) {
    if (n.locationId === undefined || !fa.locationIds.includes(n.locationId)) return false
  }
  return true
}

// D-puentes: un nodo alcanzado por el BFS pero que no entró en la Vista (filtrado por tipo, o
// simplemente sin lugar tras el límite) conectaba entre sí a los nodos que sí quedaron. Sin esto
// ese camino se pierde entero y esos nodos quedan sueltos. Nunca se persiste — se recalcula acá
// cada vez, como el resto de lo que sale del traversal.
// Con exactamente dos vecinos visibles es un pasaje real: se puentean sin condición. Con más de
// dos, el excluido es un hub (evento, obra con varios créditos) y conectar a todos sus vecinos
// entre sí formaría un clique falso — ahí sólo se puentea a través de quien lo PRODUJO (productora
// u organizador), nunca entre dos participantes/asistentes entre sí.
export function puentesDe(
  ady: Adyacencia,
  excluidos: Iterable<string>,
  visibles: ReadonlySet<string>,
  yaConectados: Set<string>, // pares "a|b" ya unidos por un vínculo real o un puente anterior
): VinculoGrafo[] {
  const puentes: VinculoGrafo[] = []
  for (const id of excluidos) {
    if (visibles.has(id)) continue
    const nodo = ady.nodos.get(id)
    const vecinos = new Set<string>()
    const productores = new Set<string>()
    for (const v of [...(ady.sale.get(id) ?? []), ...(ady.entra.get(id) ?? [])]) {
      const vecino = v.origen === id ? v.destino : v.origen
      if (!visibles.has(vecino)) continue
      vecinos.add(vecino)
      if (v.tipoVinculo === 'PRODUJO' && v.destino === id) productores.add(vecino)
    }
    const lista = [...vecinos]
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const a = lista[i]
        const b = lista[j]
        if (lista.length > 2 && !productores.has(a) && !productores.has(b)) continue
        const [x, y] = [a, b].sort()
        const clave = `${x}|${y}`
        if (yaConectados.has(clave)) continue
        yaConectados.add(clave)
        puentes.push({
          id: `puente:${clave}:${id}`,
          origen: x,
          destino: y,
          tipoVinculo: 'COLABORO_EN',
          rol: nodo ? `Colaboró en ${nodo.label}`.slice(0, 60) : undefined,
          virtual: true,
        })
      }
    }
  }
  return puentes
}

export function resolverVista(
  ady: Adyacencia,
  vista: Vista,
  yaCargados?: ReadonlySet<string>,
): Subgrafo {
  const esGlobal = !(yaCargados && yaCargados.size > 0) && vista.raiz === null

  let inicial: Set<string>
  if (yaCargados && yaCargados.size > 0) {
    inicial = new Set([...yaCargados].filter((id) => ady.nodos.has(id)))
  } else if (vista.raiz !== null) {
    inicial = ady.nodos.has(vista.raiz) ? new Set([vista.raiz]) : new Set()
  } else {
    inicial = new Set(ady.nodos.keys())
  }

  // BFS: alcanza todo lo conectado dentro de la profundidad sin filtro de nodo. El filtro de
  // nodo se aplica recién al armar la lista final — si no, un nodo que no matchea cortaría el
  // camino hacia lo que sí matchea detrás suyo.
  const alcanzados = new Map<string, number>()
  for (const id of inicial) {
    if (esGlobal && !pasaFiltroNodo(vista, ady.nodos.get(id)!)) continue
    alcanzados.set(id, 0)
  }

  for (let profundidadActual = 0; profundidadActual < vista.profundidad; profundidadActual++) {
    const nivelActual = [...alcanzados].filter(([, d]) => d === profundidadActual).map(([id]) => id)
    for (const id of nivelActual) {
      const candidatas: readonly VinculoGrafo[] =
        vista.direccion === 'sale'
          ? (ady.sale.get(id) ?? [])
          : vista.direccion === 'entra'
            ? (ady.entra.get(id) ?? [])
            : [...(ady.sale.get(id) ?? []), ...(ady.entra.get(id) ?? [])]

      for (const v of candidatas) {
        if (!pasaFiltroVinculo(vista, v)) continue
        const vecino = v.origen === id ? v.destino : v.origen
        if (alcanzados.has(vecino)) continue
        if (!ady.nodos.has(vecino)) continue
        alcanzados.set(vecino, profundidadActual + 1)
      }
    }
  }

  // En la vista global no hay raíz que sacar, así que incluirRaiz no aplica.
  if (!vista.incluirRaiz && !esGlobal) {
    for (const id of inicial) alcanzados.delete(id)
  }

  // La raíz (o yaCargados) queda exenta del filtro de nodo: es el ancla de la Vista, no un
  // resultado de búsqueda. En la vista global no hay ancla, así que el filtro aplica siempre.
  let visibles = new Map(
    [...alcanzados].filter(
      ([id]) => (!esGlobal && inicial.has(id)) || pasaFiltroNodo(vista, ady.nodos.get(id)!),
    ),
  )

  if (vista.limite !== undefined && visibles.size > vista.limite) {
    // Corta por relevancia, no por orden de recorrido: primero la cercanía a la raíz y, dentro de
    // cada nivel, quien se conecta a más nodos ya alcanzados (para una entidad: con quién compartió
    // más eventos). Así lo que queda afuera es lo que menos pesa en esta red.
    // ponytail: modoOrden 'geo' y 'aleatorio' siguen sin implementarse (ver contrato de Vista);
    // 'grafo' es este criterio.
    const peso = (id: string): number => {
      let c = 0
      for (const v of [...(ady.sale.get(id) ?? []), ...(ady.entra.get(id) ?? [])]) {
        if (alcanzados.has(v.origen === id ? v.destino : v.origen)) c++
      }
      return c
    }
    const pesos = new Map([...visibles.keys()].map((id) => [id, peso(id)]))
    visibles = new Map(
      [...visibles]
        .sort(([ia, da], [ib, db]) => da - db || pesos.get(ib)! - pesos.get(ia)!)
        .slice(0, vista.limite),
    )
  }

  const nodos: NodoGrafo[] = [...visibles.keys()].map((id) => ady.nodos.get(id)!)

  // El conjunto visible para las aristas suma la raíz/yaCargados de vuelta aunque incluirRaiz
  // los haya sacado de `nodos`: evita aristas huérfanas en el modo aditivo del motor. En la
  // vista global no hay ancla que sumar.
  const idsVisiblesParaVinculos = esGlobal
    ? new Set(visibles.keys())
    : new Set([...visibles.keys(), ...inicial])

  const vistoVinculos = new Set<string>()
  const vinculos: VinculoGrafo[] = []
  for (const id of idsVisiblesParaVinculos) {
    for (const v of ady.sale.get(id) ?? []) {
      if (vistoVinculos.has(v.id)) continue
      if (!idsVisiblesParaVinculos.has(v.origen) || !idsVisiblesParaVinculos.has(v.destino)) continue
      if (!pasaFiltroVinculo(vista, v)) continue
      vistoVinculos.add(v.id)
      vinculos.push(v)
    }
  }

  if (vista.vinculosVirtuales) {
    const yaConectados = new Set(vinculos.map((v) => [v.origen, v.destino].sort().join('|')))
    vinculos.push(...puentesDe(ady, alcanzados.keys(), idsVisiblesParaVinculos, yaConectados))
  }

  return { nodos, vinculos }
}
