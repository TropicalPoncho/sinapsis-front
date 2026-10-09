import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { construirAdyacencia } from './adyacencia.ts'
import { resolverVista } from './resolverVista.ts'
import type { Vista, Subgrafo, NodoGrafo, VinculoGrafo } from '@/types/vista'

const vp = { shape: 'Marble', color: '#6EE7B7' }

const nodos: NodoGrafo[] = [
  { id: 'e1', nodeType: 'ENTIDAD', subtipo: 'productora', label: 'Tropical Poncho', vizParams: vp, isStub: false, fecha: '2022-01-01', disciplina: 'gestion' },
  { id: 'a1', nodeType: 'ENTIDAD', subtipo: 'persona', label: 'Rama', vizParams: vp, isStub: false, fecha: '2022-06-01', disciplina: 'musica', locationId: 'ar-ba' },
  { id: 'a2', nodeType: 'ENTIDAD', subtipo: 'persona', label: 'Mechi', vizParams: vp, isStub: false, fecha: '2023-01-01', disciplina: 'poesia', locationId: 'ar-rn' },
  { id: 'a3', nodeType: 'ENTIDAD', subtipo: 'duo', label: 'Pau', vizParams: vp, isStub: false, disciplina: 'poesia' },
  { id: 'o1', nodeType: 'OBRA', subtipo: 'cancion', label: 'Obra Uno', vizParams: vp, isStub: false, fecha: '2023-05-01', disciplina: 'musica' },
  { id: 'o2', nodeType: 'OBRA', subtipo: 'cancion', label: 'Obra Dos', vizParams: vp, isStub: false, fecha: '2024-05-01', disciplina: 'musica' },
  { id: 's1', nodeType: 'AGRUPACION', subtipo: 'serie', label: 'Serie Uno', vizParams: vp, isStub: false, fecha: '2024-06-01' },
]

const vinculos: VinculoGrafo[] = [
  { id: 'v1', origen: 'e1', destino: 'a1', tipoVinculo: 'PRODUJO', rol: 'anfitrion' },
  { id: 'v2', origen: 'e1', destino: 'a2', tipoVinculo: 'PRODUJO' },
  { id: 'v3', origen: 'a1', destino: 'o1', tipoVinculo: 'COLABORO_EN', rol: 'dj' },
  { id: 'v4', origen: 'a2', destino: 'o1', tipoVinculo: 'COLABORO_EN', rol: 'poeta' },
  { id: 'v5', origen: 'a1', destino: 'o2', tipoVinculo: 'COLABORO_EN', rol: 'dj' },
  { id: 'v6', origen: 's1', destino: 'o1', tipoVinculo: 'COMPONE' },
  { id: 'v7', origen: 'a3', destino: 'o2', tipoVinculo: 'INSPIRO', rol: 'homenaje' },
]

const topologia: Subgrafo = { nodos, vinculos }
const ady = construirAdyacencia(topologia)

const vistaNeutra: Vista = {
  raiz: null,
  profundidad: 1,
  filtroNodeTypes: [],
  filtroVinculos: [],
  direccion: 'ambas',
  incluirRaiz: true,
  modoOrden: 'grafo',
  vinculosVirtuales: false,
}

function vista(parcial: Partial<Vista>): Vista {
  return { ...vistaNeutra, ...parcial }
}

function ids(sub: Subgrafo): string[] {
  return sub.nodos.map((n) => n.id).sort()
}

function vinculoIds(sub: Subgrafo): string[] {
  return sub.vinculos.map((v) => v.id)
}

describe('resolverVista', () => {
  test('profundidad 1 desde una raíz trae la raíz y sus vecinos directos', () => {
    const sub = resolverVista(ady, vista({ raiz: 'a1', profundidad: 1, direccion: 'ambas' }))
    assert.deepEqual(ids(sub), ['a1', 'e1', 'o1', 'o2'])
  })

  test('profundidad 0 trae solo la raíz', () => {
    const sub = resolverVista(ady, vista({ raiz: 'a1', profundidad: 0 }))
    assert.deepEqual(ids(sub), ['a1'])
    assert.deepEqual(sub.vinculos, [])
  })

  test('profundidad 2 alcanza el segundo salto', () => {
    const sub = resolverVista(ady, vista({ raiz: 'e1', profundidad: 2 }))
    assert.deepEqual(ids(sub), ['a1', 'a2', 'e1', 'o1', 'o2'])
  })

  test('incluirRaiz false saca la raíz pero conserva las aristas que la conectan', () => {
    const sub = resolverVista(ady, vista({ raiz: 'a1', profundidad: 1, incluirRaiz: false }))
    assert.deepEqual(ids(sub), ['e1', 'o1', 'o2'])
    const vIds = vinculoIds(sub)
    assert.ok(vIds.includes('v1'))
    assert.ok(vIds.includes('v3'))
    assert.ok(vIds.includes('v5'))
  })

  test('filtroNodeTypes recorta lo descubierto y no toca la raíz', () => {
    const sub = resolverVista(ady, vista({ raiz: 'a1', profundidad: 1, filtroNodeTypes: ['OBRA'] }))
    assert.deepEqual(ids(sub), ['a1', 'o1', 'o2'])
  })

  test('filtroVinculos corta el traversal', () => {
    const sub = resolverVista(ady, vista({ raiz: 'e1', profundidad: 2, filtroVinculos: ['PRODUJO'] }))
    assert.deepEqual(ids(sub), ['a1', 'a2', 'e1'])
    assert.ok(!sub.vinculos.some((v) => v.tipoVinculo === 'COLABORO_EN'))
  })

  test('filtroRoles deja pasar solo las aristas con ese rol', () => {
    const sub = resolverVista(ady, vista({ raiz: 'o1', profundidad: 1, filtroRoles: ['dj'] }))
    assert.deepEqual(ids(sub), ['a1', 'o1'])
  })

  test('direccion sale y direccion entra dan resultados distintos', () => {
    const subEntra = resolverVista(ady, vista({ raiz: 'o1', profundidad: 1, direccion: 'entra' }))
    assert.deepEqual(ids(subEntra), ['a1', 'a2', 'o1', 's1'])
    const subSale = resolverVista(ady, vista({ raiz: 'o1', profundidad: 1, direccion: 'sale' }))
    assert.deepEqual(ids(subSale), ['o1'])
  })

  test('filtroAtributos.fechaDesde excluye lo anterior y lo que no tiene fecha', () => {
    const sub = resolverVista(
      ady,
      vista({ raiz: 'e1', profundidad: 2, filtroAtributos: { fechaDesde: '2023-01-01' } }),
    )
    assert.deepEqual(ids(sub), ['a2', 'e1', 'o1', 'o2'])
  })

  test('filtroAtributos.disciplinas filtra por disciplina', () => {
    const sub = resolverVista(
      ady,
      vista({ raiz: 'e1', profundidad: 2, filtroAtributos: { disciplinas: ['poesia'] } }),
    )
    assert.deepEqual(ids(sub), ['a2', 'e1'])
  })

  test('limite trunca por profundidad ascendente', () => {
    const sub = resolverVista(ady, vista({ raiz: 'e1', profundidad: 2, limite: 2 }))
    assert.equal(sub.nodos.length, 2)
    const sorted = ids(sub)
    assert.ok(
      JSON.stringify(sorted) === JSON.stringify(['a1', 'e1']) ||
        JSON.stringify(sorted) === JSON.stringify(['a2', 'e1']),
    )
  })

  test('limite corta por relevancia: gana quien comparte más eventos con la raíz', () => {
    const n = (id: string, nodeType: 'ENTIDAD' | 'EVENTO'): NodoGrafo => ({ id, nodeType, subtipo: nodeType === 'EVENTO' ? 'fiesta' : 'persona', label: id, vizParams: vp, isStub: false })
    const l = (o: string, d: string): VinculoGrafo => ({ id: o + d, origen: o, destino: d, tipoVinculo: 'COLABORO_EN' })
    // p1 aparece último en la lista y está en los dos eventos; p2 y p3 en uno solo
    const a = construirAdyacencia({
      nodos: [n('r', 'ENTIDAD'), n('x', 'EVENTO'), n('y', 'EVENTO'), n('p2', 'ENTIDAD'), n('p3', 'ENTIDAD'), n('p1', 'ENTIDAD')],
      vinculos: [l('r', 'x'), l('r', 'y'), l('x', 'p2'), l('y', 'p3'), l('x', 'p1'), l('y', 'p1')],
    })
    const sub = resolverVista(a, vista({ raiz: 'r', profundidad: 2, filtroNodeTypes: ['ENTIDAD'], incluirRaiz: false, limite: 1 }))
    assert.deepEqual(ids(sub), ['p1'])
  })

  test('raiz null devuelve la red global filtrada', () => {
    const sub = resolverVista(ady, vista({ raiz: null, profundidad: 0, filtroNodeTypes: ['OBRA'] }))
    assert.deepEqual(ids(sub), ['o1', 'o2'])
  })

  test('un conjunto ya cargado devuelve solo sus vecinos nuevos', () => {
    const yaCargados = new Set(['e1', 'a1'])
    const sub = resolverVista(ady, vista({ profundidad: 1, incluirRaiz: false }), yaCargados)
    assert.deepEqual(ids(sub), ['a2', 'o1', 'o2'])
    const vIds = vinculoIds(sub)
    assert.ok(vIds.includes('v3'))
    assert.ok(vIds.includes('v5'))
  })

  test('el subgrafo nunca trae aristas colgantes', () => {
    const vistas: Vista[] = [
      vista({ raiz: 'a1', profundidad: 1 }),
      vista({ raiz: 'e1', profundidad: 2 }),
      vista({ raiz: 'a1', profundidad: 1, incluirRaiz: false }),
      vista({ raiz: 'o1', profundidad: 1, direccion: 'entra' }),
      vista({ raiz: null, profundidad: 0, filtroNodeTypes: ['OBRA'] }),
    ]
    for (const v of vistas) {
      const sub = resolverVista(ady, v)
      const conjuntoInicial = v.raiz !== null ? [v.raiz] : []
      const visibles = new Set([...ids(sub), ...conjuntoInicial])
      for (const vinc of sub.vinculos) {
        assert.ok(visibles.has(vinc.origen), `${vinc.id} origen ${vinc.origen} colgante`)
        assert.ok(visibles.has(vinc.destino), `${vinc.id} destino ${vinc.destino} colgante`)
      }
    }
  })

  test('resolverVista no muta la adyacencia', () => {
    const nodosSize = ady.nodos.size
    const saleSize = ady.sale.size
    const entraSize = ady.entra.size
    resolverVista(ady, vista({ raiz: 'a1', profundidad: 1 }))
    resolverVista(ady, vista({ raiz: 'e1', profundidad: 2 }))
    resolverVista(ady, vista({ raiz: null, profundidad: 0 }))
    resolverVista(ady, vista({ raiz: 'o1', profundidad: 1, direccion: 'entra' }))
    const primera = resolverVista(ady, vista({ raiz: 'a1', profundidad: 1 }))
    const segunda = resolverVista(ady, vista({ raiz: 'a1', profundidad: 1 }))
    assert.equal(ady.nodos.size, nodosSize)
    assert.equal(ady.sale.size, saleSize)
    assert.equal(ady.entra.size, entraSize)
    assert.deepEqual(ids(primera), ids(segunda))
  })

  test('resolverVista y adyacencia no importan framework, base ni browser', () => {
    const dir = fileURLToPath(new URL('.', import.meta.url))
    const archivos = ['resolverVista.ts', 'adyacencia.ts']
    for (const archivo of archivos) {
      const contenido = readFileSync(dir + archivo, 'utf-8')
      assert.ok(!/from ['"](react|next|three|pg|node:)/.test(contenido), `${archivo} importa framework/base/node`)
      assert.ok(
        !/\b(window|document|fetch|localStorage|process)\b/.test(contenido),
        `${archivo} usa un global del browser o de node`,
      )
    }
  })

  test('filtroSubtipos filtra por subtipo sin tocar node_type', () => {
    const sub = resolverVista(ady, vista({ raiz: null, profundidad: 0, filtroSubtipos: ['productora'] }))
    assert.deepEqual(ids(sub), ['e1'])
  })

  test('vinculosVirtuales arma un puente cuando el nodo intermedio queda excluido por tipo', () => {
    // e1 -PRODUJO-> a1,a2 ; a1,a2 -COLABORO_EN-> o1 (o1 queda excluido por filtroNodeTypes).
    // a1-a2 no tienen vínculo real: el puente debe reemplazar el camino que pasaba por o1.
    const sub = resolverVista(
      ady,
      vista({ raiz: 'e1', profundidad: 2, filtroNodeTypes: ['ENTIDAD'], vinculosVirtuales: true }),
    )
    assert.deepEqual(ids(sub), ['a1', 'a2', 'e1'])
    const puente = sub.vinculos.find((v) => v.virtual)
    assert.ok(puente, 'no se generó ningún puente')
    assert.deepEqual([puente!.origen, puente!.destino].sort(), ['a1', 'a2'])
    assert.equal(puente!.tipoVinculo, 'COLABORO_EN')
    assert.equal(puente!.rol, 'Colaboró en Obra Uno')
  })

  test('vinculosVirtuales apagado no agrega nada (default de vistaNeutra)', () => {
    const sub = resolverVista(ady, vista({ raiz: 'e1', profundidad: 2, filtroNodeTypes: ['ENTIDAD'] }))
    assert.ok(!sub.vinculos.some((v) => v.virtual))
  })

  test('vinculosVirtuales en un hub: puentea sólo a través de quien lo PRODUJO, nunca entre participantes', () => {
    // x,y PRODUJO-> h (coproducen) ; p,q COLABORO_EN-> h (participan). h queda excluido por tipo.
    // Deben puentear x-y, x-p, x-q, y-p, y-q (todo par con al menos un productor); nunca p-q.
    const nodosHub: NodoGrafo[] = [
      { id: 'x', nodeType: 'ENTIDAD', subtipo: 'productora', label: 'X', vizParams: vp, isStub: false },
      { id: 'y', nodeType: 'ENTIDAD', subtipo: 'productora', label: 'Y', vizParams: vp, isStub: false },
      { id: 'p', nodeType: 'ENTIDAD', subtipo: 'persona', label: 'P', vizParams: vp, isStub: false },
      { id: 'q', nodeType: 'ENTIDAD', subtipo: 'persona', label: 'Q', vizParams: vp, isStub: false },
      { id: 'h', nodeType: 'OBRA', subtipo: 'evento', label: 'H', vizParams: vp, isStub: false },
    ]
    const vinculosHub: VinculoGrafo[] = [
      { id: 'hx', origen: 'x', destino: 'h', tipoVinculo: 'PRODUJO' },
      { id: 'hy', origen: 'y', destino: 'h', tipoVinculo: 'PRODUJO' },
      { id: 'hp', origen: 'p', destino: 'h', tipoVinculo: 'COLABORO_EN' },
      { id: 'hq', origen: 'q', destino: 'h', tipoVinculo: 'COLABORO_EN' },
    ]
    const adyHub = construirAdyacencia({ nodos: nodosHub, vinculos: vinculosHub })
    const sub = resolverVista(
      adyHub,
      vista({ raiz: 'x', profundidad: 2, filtroNodeTypes: ['ENTIDAD'], vinculosVirtuales: true }),
    )
    assert.deepEqual(ids(sub), ['p', 'q', 'x', 'y'])
    const pares = sub.vinculos.map((v) => [v.origen, v.destino].sort().join('|')).sort()
    assert.deepEqual(pares, ['p|x', 'q|x', 'x|y', 'p|y', 'q|y'].sort())
  })

  test('filtroSubtipos convive con filtroNodeTypes', () => {
    const sub = resolverVista(
      ady,
      vista({ raiz: null, profundidad: 0, filtroNodeTypes: ['ENTIDAD'], filtroSubtipos: ['persona'] }),
    )
    assert.deepEqual(ids(sub), ['a1', 'a2'])
  })
})

// D-24: vínculos virtuales entre agrupaciones (áreas), derivados de sus miembros.
describe('vinculosEntreAgrupaciones', () => {
  const nd = (id: string, nodeType: NodoGrafo['nodeType']): NodoGrafo => ({ id, nodeType, subtipo: 's', label: id, vizParams: vp, isStub: false })
  const ln = (id: string, origen: string, destino: string, tipoVinculo: VinculoGrafo['tipoVinculo']): VinculoGrafo => ({ id, origen, destino, tipoVinculo })
  const base: VinculoGrafo[] = [
    ...['A', 'B', 'C', 'D'].map((a) => ln('c' + a, 'ent', a, 'COMPONE')),
    ln('m1', 'A', 'mA', 'COMPONE'), ln('m2', 'A', 'mAC', 'COMPONE'), ln('m3', 'B', 'mB', 'COMPONE'),
    ln('m4', 'B', 'mB2', 'COMPONE'), ln('m5', 'C', 'mAC', 'COMPONE'), ln('m6', 'D', 'mD', 'COMPONE'),
    ln('x1', 'mA', 'mB', 'INSPIRO'), ln('x2', 'mB2', 'mA', 'COLABORO_EN'),
    ln('x3', 'p', 'mA', 'COLABORO_EN'), ln('x4', 'p', 'mD', 'COLABORO_EN'),
  ]
  const nodosA = [nd('ent', 'ENTIDAD'), ...['A', 'B', 'C', 'D'].map((a) => nd(a, 'AGRUPACION')), nd('p', 'ENTIDAD'),
    ...['mA', 'mAC', 'mB', 'mB2', 'mD'].map((m) => nd(m, 'OBRA'))]
  const vistaAreas = (extra: Partial<Vista> = {}): Vista => ({
    raiz: 'ent', profundidad: 1, direccion: 'sale', filtroNodeTypes: ['AGRUPACION'], filtroVinculos: ['COMPONE', 'PRECEDE'],
    incluirRaiz: true, modoOrden: 'grafo', vinculosVirtuales: true, vinculosEntreAgrupaciones: true, ...extra,
  })
  const resolver = (vinculos: VinculoGrafo[], v: Vista) => resolverVista(construirAdyacencia({ nodos: nodosA, vinculos }), v)

  test('une las áreas por vínculo entre miembros y por miembro compartido, sin repetidos ni colaboradores', () => {
    const sub = resolver(base, vistaAreas())
    assert.deepEqual(sub.nodos.map((n) => n.id).sort(), ['A', 'B', 'C', 'D', 'ent'])
    const virtuales = sub.vinculos.filter((l) => l.virtual)
    assert.deepEqual(virtuales.map((l) => l.id).sort(), ['entre:A|B', 'entre:A|C'])
    assert.match(virtuales.find((l) => l.id === 'entre:A|B')!.rol!, /^Vinculadas por /)
    assert.match(virtuales.find((l) => l.id === 'entre:A|C')!.rol!, /^Comparten mAC/)
    for (const l of virtuales) {
      assert.equal(l.tipoVinculo, 'COLABORO_EN'); assert.ok(l.origen < l.destino); assert.ok(l.rol!.length <= 60)
      assert.ok(l.origen !== 'D' && l.destino !== 'D', 'un colaborador compartido no une áreas')
    }
  })
  test('un vínculo real entre las áreas reemplaza al derivado', () => {
    const sub = resolver([...base, ln('r', 'A', 'B', 'PRECEDE')], vistaAreas())
    assert.ok(sub.vinculos.some((l) => l.id === 'r'))
    assert.ok(!sub.vinculos.some((l) => l.id === 'entre:A|B'))
  })
  test('sin el campo o en false no hay vínculos entre áreas', () => {
    for (const extra of [{ vinculosEntreAgrupaciones: undefined }, { vinculosEntreAgrupaciones: false }]) {
      assert.ok(!resolver(base, vistaAreas(extra)).vinculos.some((l) => l.id.startsWith('entre:')))
    }
  })
})
