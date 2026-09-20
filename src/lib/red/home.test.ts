import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fraccionHome } from './home.ts'
import { construirAdyacencia } from '../vista/adyacencia.ts'
import type { NodoGrafo, NodeType, VinculoGrafo } from '../../types/vista.ts'

const nodo = (id: string, nodeType: NodeType): NodoGrafo => ({
  id, nodeType, subtipo: 'x', label: id, vizParams: { shape: 's', color: '#fff' }, isStub: false,
})

// dos componentes: a (0..29) y b (30..59); tipos rotan entre 4
const tipos: NodeType[] = ['OBRA', 'ENTIDAD', 'OBRA', 'ENTIDAD', 'OBRA', 'ENTIDAD', 'AGRUPACION', 'EVENTO']
const nodos = Array.from({ length: 60 }, (_, i) => nodo('n' + i, tipos[i % 8]))
const vinculos: VinculoGrafo[] = []
for (let i = 0; i < 60; i++) {
  for (const j of [i + 1, i + 2]) {
    if (j < 60 && (i < 30) === (j < 30)) vinculos.push({ id: `v${i}-${j}`, origen: 'n' + i, destino: 'n' + j, tipoVinculo: 'COLABORO_EN' })
  }
}
const ady = construirAdyacencia({ nodos, vinculos })
const ids = (s: { nodos: NodoGrafo[] }) => s.nodos.map((n) => n.id)

test('reproducible por semilla', () => {
  assert.deepEqual(ids(fraccionHome(ady, { semilla: 'a', limite: 20 })), ids(fraccionHome(ady, { semilla: 'a', limite: 20 })))
  assert.notDeepEqual(ids(fraccionHome(ady, { semilla: 'a', limite: 20 })), ids(fraccionHome(ady, { semilla: 'b', limite: 20 })))
})
test('tope exacto y nunca superado', () => {
  assert.equal(fraccionHome(ady, { semilla: 's', limite: 40 }).nodos.length, 40)
  assert.ok(fraccionHome(ady, { semilla: 's', limite: 7 }).nodos.length <= 7)
})
test('solo ENTIDAD y OBRA, con ambas', () => {
  const t = new Set(fraccionHome(ady, { semilla: 's', limite: 20 }).nodos.map((n) => n.nodeType))
  assert.deepEqual([...t].sort(), ['ENTIDAD', 'OBRA'])
})
test('vínculos inducidos', () => {
  const s = fraccionHome(ady, { semilla: 's', limite: 20 })
  const set = new Set(ids(s))
  assert.ok(s.vinculos.length > 0)
  for (const v of s.vinculos) assert.ok(set.has(v.origen) && set.has(v.destino))
})
test('pocos candidatos y vacía', () => {
  assert.equal(fraccionHome(ady, { semilla: 's', limite: 500 }).nodos.length, 46)
  assert.deepEqual(fraccionHome(construirAdyacencia({ nodos: [], vinculos: [] }), { semilla: 's', limite: 5 }), { nodos: [], vinculos: [] })
})
test('abarca dos componentes cuando la frontera se vacía', () => {
  const s = fraccionHome(ady, { semilla: 's', limite: 45 })
  assert.ok(s.nodos.some((n) => +n.id.slice(1) < 30) && s.nodos.some((n) => +n.id.slice(1) >= 30))
})
