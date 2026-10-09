import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agrupadoresDe, padreDe, nodosDeLaRed, creditosDe, obrasDe } from './menus.ts'
import { construirAdyacencia } from '../vista/adyacencia.ts'
import type { NodoGrafo, NodeType, TipoVinculo } from '../../types/vista.ts'

const n = (id: string, nodeType: NodeType, label = id, color = '#111'): NodoGrafo => ({
  id, nodeType, subtipo: 's', label, vizParams: { shape: 's', color }, isStub: false,
})
let k = 0
const v = (origen: string, destino: string, tipoVinculo: TipoVinculo, rol?: string) => ({ id: 'v' + k++, origen, destino, tipoVinculo, rol })

const ady = construirAdyacencia({
  nodos: [n('tp', 'ENTIDAD'), n('b', 'AGRUPACION', 'Beta', '#f00'), n('a', 'AGRUPACION', 'Álamo', '#0f0'), n('x', 'AGRUPACION', 'Otra'),
    n('p', 'ENTIDAD', 'Persona'), n('o', 'OBRA', 'Obra'), n('z', 'ENTIDAD', 'Ana'), n('solo', 'OBRA')],
  vinculos: [v('tp', 'b', 'COMPONE'), v('a', 'tp', 'COMPONE'), v('a', 'tp', 'COMPONE'), v('tp', 'a', 'COMPONE'), v('tp', 'a', 'COMPONE'), v('tp', 'x', 'PRODUJO'), v('tp', 'p', 'COMPONE'),
    v('a', 'o', 'COMPONE'), v('p', 'o', 'COLABORO_EN', 'dj'), v('p', 'o', 'PRODUJO', 'dj'), v('o', 'p', 'INSPIRO', 'voz'), v('z', 'o', 'COLABORO_EN')],
})

test('agrupadoresDe: COMPONE, sin duplicados, orden es, color del dato', () => {
  assert.deepEqual(agrupadoresDe(ady, 'tp'), [{ id: 'a', label: 'Álamo', color: '#0f0' }, { id: 'b', label: 'Beta', color: '#f00' }])
})
test('agrupadoresDe: sin áreas', () => assert.deepEqual(agrupadoresDe(ady, 'z'), []))
test('agrupadoresDe: solo el COMPONE que sale; ser miembro de un área no la hace propia', () => {
  const a2 = construirAdyacencia({ nodos: [n('a', 'AGRUPACION'), n('z', 'ENTIDAD')], vinculos: [v('a', 'z', 'COMPONE')] })
  assert.deepEqual(agrupadoresDe(a2, 'z'), [])
})
test('padreDe', () => {
  assert.equal(padreDe(ady, 'o'), 'a')
  assert.equal(padreDe(ady, 'tp'), 'a')
  assert.equal(padreDe(ady, 'solo'), null)
})
test('padreDe con tipo: la dueña de un área es la ENTIDAD que la COMPONE', () => {
  assert.equal(padreDe(ady, 'b', 'ENTIDAD'), 'tp')
  assert.equal(padreDe(ady, 'x', 'ENTIDAD'), null)
  assert.equal(padreDe(ady, 'solo', 'ENTIDAD'), null)
})
test('nodosDeLaRed sin raíz y ordenados', () => {
  const r = nodosDeLaRed({ nodos: [n('r', 'ENTIDAD'), n('2', 'OBRA', 'b'), n('1', 'OBRA', 'a')], vinculos: [] }, 'r')
  assert.deepEqual(r.map((x) => x.id), ['1', '2'])
})
test('creditosDe: dedup, une roles, sin rol vacío', () => {
  assert.deepEqual(creditosDe(ady, 'o'), [{ id: 'z', nombre: 'Ana' }, { id: 'p', nombre: 'Persona', rol: 'voz, dj' }])
})
test('creditosDe: obra sin vínculos', () => assert.deepEqual(creditosDe(ady, 'solo'), []))
test('obrasDe: obras y eventos vecinos en ambos sentidos, sin repetidos', () => {
  assert.deepEqual(obrasDe(ady, 'p'), ['o'])
  assert.deepEqual(obrasDe(ady, 'o'), [])
})
test('creditosDe ignora no-ENTIDAD', () => assert.ok(creditosDe(ady, 'o').every((c) => c.id !== 'a')))
