import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esDelHome, fraccionHome } from './home.ts'
import { construirAdyacencia } from '../vista/adyacencia.ts'
import type { NodoGrafo, NodeType, VinculoGrafo } from '../../types/vista.ts'

const nodo = (id: string, nodeType: NodeType, subtipo = 'x'): NodoGrafo => ({
  id, nodeType, subtipo, label: id, vizParams: { shape: 's', color: '#fff' }, isStub: false,
})

// dos componentes: a (0..29) y b (30..59); tipos rotan entre 4
const tipos: NodeType[] = ['OBRA', 'ENTIDAD', 'OBRA', 'ENTIDAD', 'OBRA', 'ENTIDAD', 'AGRUPACION', 'EVENTO']
// las ENTIDAD rotan entre persona (no entra al home), productora y sello (colectivas, sí entran)
const subtipos = ['x', 'persona', 'x', 'productora', 'x', 'sello', 'area', 'x']
const nodos = Array.from({ length: 60 }, (_, i) => nodo('n' + i, tipos[i % 8], subtipos[i % 8]))
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
  assert.equal(fraccionHome(ady, { semilla: 's', limite: 15 }).nodos.length, 15)
  assert.ok(fraccionHome(ady, { semilla: 's', limite: 7 }).nodos.length <= 7)
})
test('solo colectivas y áreas: sin personas, obras ni eventos', () => {
  const s = fraccionHome(ady, { semilla: 's', limite: 20 })
  assert.ok(s.nodos.length > 0)
  for (const n of s.nodos) assert.ok(n.nodeType === 'AGRUPACION' || ['productora', 'sello'].includes(n.subtipo), n.id)
  assert.ok(s.nodos.some((n) => n.nodeType === 'ENTIDAD') && s.nodos.some((n) => n.nodeType === 'AGRUPACION'))
})
test('criterio por subtipo real de ENTIDAD', () => {
  const e = (subtipo: string) => esDelHome(nodo('z', 'ENTIDAD', subtipo))
  for (const ok of ['productora', 'sello', 'centro_cultural', 'colectivo', 'plataforma', 'banda', 'proyecto']) assert.ok(e(ok), ok)
  for (const no of ['persona', 'duo']) assert.ok(!e(no), no)
  assert.ok(esDelHome(nodo('z', 'AGRUPACION', 'area')))
  assert.ok(!esDelHome(nodo('z', 'OBRA', 'disco')) && !esDelHome(nodo('z', 'EVENTO', 'festival')))
})
test('vínculos inducidos', () => {
  const s = fraccionHome(ady, { semilla: 's', limite: 20 })
  const set = new Set(ids(s))
  assert.ok(s.vinculos.length > 0)
  for (const v of s.vinculos) assert.ok(set.has(v.origen) && set.has(v.destino))
})
test('pocos candidatos y vacía', () => {
  assert.equal(fraccionHome(ady, { semilla: 's', limite: 500 }).nodos.length, 22)
  assert.deepEqual(fraccionHome(construirAdyacencia({ nodos: [], vinculos: [] }), { semilla: 's', limite: 5 }), { nodos: [], vinculos: [] })
})
test('abarca dos componentes cuando la frontera se vacía', () => {
  // componente A (ids 0-29) sólo tiene 12 ENTIDAD: con límite 20 tiene que cruzar a B.
  const s = fraccionHome(ady, { semilla: 's', limite: 20 })
  assert.ok(s.nodos.some((n) => +n.id.slice(1) < 30) && s.nodos.some((n) => +n.id.slice(1) >= 30))
})
