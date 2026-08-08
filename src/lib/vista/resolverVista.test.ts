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
})
