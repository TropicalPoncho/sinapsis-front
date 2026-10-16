import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { agrupadoresDe, padreDe, nodosDeLaRed, creditosDe, obrasDe, seccionesDe, type VocabularioRoles } from './menus.ts'
import { construirAdyacencia } from '../vista/adyacencia.ts'
import type { NodoGrafo, NodeType, TipoVinculo } from '../../types/vista.ts'

const vocab: VocabularioRoles = JSON.parse(readFileSync(new URL('./roles.json', import.meta.url), 'utf8'))

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

// --- Secciones derivadas de los roles (D-29, D-32) ---
const nf = (id: string, nodeType: NodeType, label: string, fecha?: string, color = '#111'): NodoGrafo => ({ ...n(id, nodeType, label, color), fecha })
const labels = (ids: { id: string }[], a: { nodos: ReadonlyMap<string, NodoGrafo> }) => ids.map((x) => a.nodos.get(x.id)!.label)

// Los 16 vínculos reales de SOMA en la base (el evento es el origen de los COLABORO_EN).
const soma = construirAdyacencia({
  nodos: [nf('soma', 'EVENTO', 'SOMA', '2023-01-21', '#abc'), nf('tp', 'ENTIDAD', 'Tropical Poncho'), nf('is', 'ENTIDAD', 'In Session'),
    nf('obras', 'AGRUPACION', 'Obras'), nf('beta', 'EVENTO', 'SOMA beta', '2022-11-26'), nf('nudo', 'EVENTO', 'NUDO', '2024-01-01'),
    nf('juli', 'ENTIDAD', 'Juli Garro Yoga'), nf('trama', 'OBRA', 'Trama', '2023-01-10'), nf('fedah', 'ENTIDAD', 'Fedah'),
    nf('kirtan', 'ENTIDAD', 'KIRTAN ROCK'), nf('astro', 'ENTIDAD', 'Astronautas De La Mente'), nf('marian', 'ENTIDAD', 'Marian Basti'),
    nf('e11', 'ENTIDAD', 'E110101'), nf('rama', 'ENTIDAD', 'Rama Cerratto'), nf('ludmila', 'ENTIDAD', 'Ludmila Di Pascuale'), nf('luciano', 'ENTIDAD', 'Luciano Rodriguez')],
  vinculos: [v('tp', 'soma', 'PRODUJO'), v('is', 'soma', 'PRODUJO'), v('obras', 'soma', 'COMPONE'), v('beta', 'soma', 'PRECEDE', 'Edición'),
    v('beta', 'soma', 'COLABORO_EN'), v('soma', 'nudo', 'PRECEDE'),
    v('soma', 'juli', 'COLABORO_EN', 'MEDITACIÓN ACTIVA'), v('soma', 'trama', 'COLABORO_EN', 'ACTIVIDADES'), v('soma', 'fedah', 'COLABORO_EN', 'PERFORMANCES'),
    v('soma', 'kirtan', 'COLABORO_EN', 'BANDAS EN VIVO'), v('soma', 'astro', 'COLABORO_EN', 'BANDAS EN VIVO'), v('soma', 'marian', 'COLABORO_EN', 'VJ'),
    v('soma', 'e11', 'COLABORO_EN', 'VINYLS DJ SETS'), v('soma', 'rama', 'COLABORO_EN', 'VINYLS DJ SETS'),
    v('soma', 'ludmila', 'COLABORO_EN', 'VINYLS DJ SETS'), v('soma', 'luciano', 'COLABORO_EN', 'VINYLS DJ SETS')],
})

test('seccionesDe: SOMA con sus vínculos reales y el vocabulario del repo', () => {
  const s = seccionesDe(soma, 'soma', vocab)
  assert.deepEqual(s.map((x) => x.id), ['produccion', 'meditacion', 'actividades', 'performance', 'bandas-en-vivo', 'dj', 'vj', 'otros'])
  const de = (id: string) => labels(s.find((x) => x.id === id)!.nodos, soma)
  assert.deepEqual(de('produccion'), ['In Session', 'Tropical Poncho'])
  assert.deepEqual(de('actividades'), ['Trama'])
  assert.deepEqual(de('bandas-en-vivo'), ['Astronautas De La Mente', 'KIRTAN ROCK'])
  assert.deepEqual(de('dj'), ['E110101', 'Luciano Rodriguez', 'Ludmila Di Pascuale', 'Rama Cerratto'])
  assert.deepEqual(s.find((x) => x.id === 'otros')!.nodos, [{ id: 'beta' }])
  assert.ok(s.every((x) => x.color === '#abc'))
  assert.equal(s.find((x) => x.id === 'bandas-en-vivo')!.label, 'Bandas en vivo')
  assert.equal(s.find((x) => x.id === 'dj')!.label, 'DJ')
})
test('seccionesDe: COMPONE y PRECEDE no forman sección; SOMA beta aparece una sola vez', () => {
  const todos = seccionesDe(soma, 'soma', vocab).flatMap((x) => x.nodos.map((nn) => nn.id))
  assert.ok(!todos.includes('obras') && !todos.includes('nudo'))
  assert.equal(todos.filter((id) => id === 'beta').length, 1)
})
test('seccionesDe: sin vínculos de participación devuelve []', () => assert.deepEqual(seccionesDe(soma, 'obras', vocab), []))
