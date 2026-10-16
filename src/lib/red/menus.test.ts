import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { agrupadoresDe, padreDe, nodosDeLaRed, creditosDe, obrasDe, seccionesDe, claveRol, type VocabularioRoles } from './menus.ts'
import { construirAdyacencia } from '../vista/adyacencia.ts'
import { leerCsv } from '../../../scripts/migracion/csv.ts'
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

test('claveRol: mayúsculas, tildes, plurales y espacios no fragmentan', () => {
  const igual = (a: string, b: string) => assert.equal(claveRol(a), claveRol(b), a + ' = ' + b)
  igual('LIVE SETs', 'Live Set'); igual('PERFORMANCES', 'Performance'); igual('Artistas Convocades', 'Artista Convocade')
  igual('MEDITACIÓN', 'meditacion'); igual('Exposiciones', 'Exposición'); igual('DJs', 'DJ'); igual('  Pintura   en Vivo ', 'pintura en vivo')
  assert.notEqual(claveRol('Expositora'), claveRol('Exposición'))
})

// Un evento `e` con un participante por rol; devuelve los ids de las secciones donde cae cada uno.
const evento = (roles: Record<string, string | undefined>) => {
  const a = construirAdyacencia({
    nodos: [n('e', 'EVENTO'), ...Object.keys(roles).map((id) => n(id, 'ENTIDAD'))],
    vinculos: Object.entries(roles).map(([id, rol]) => v('e', id, 'COLABORO_EN', rol)),
  })
  const s = seccionesDe(a, 'e', vocab)
  return (id: string) => s.filter((x) => x.nodos.some((q) => q.id === id)).map((x) => x.id)
}
test('seccionesDe: roles múltiples ponen al nodo en cada sección', () => {
  const en = evento({ a: 'DJ Set Híbrido, Visuales', b: 'Charla + Liveset', c: 'Armonía / Puerta', d: 'Telas y Cocina' })
  assert.deepEqual(en('a'), ['dj', 'vj'])
  assert.deepEqual(en('b'), ['live-set', 'charlas']) // orden del vocabulario, no del texto
  assert.deepEqual(en('c'), ['armonia', 'otros'])
  assert.deepEqual(en('d'), ['cocina', 'otros'])
})
test('seccionesDe: la grafía que no encajó viaja en "rol" de Otros', () => {
  const a = construirAdyacencia({ nodos: [n('e', 'EVENTO'), n('c', 'ENTIDAD'), n('d', 'ENTIDAD')], vinculos: [v('e', 'c', 'COLABORO_EN', 'Armonía / Puerta'), v('e', 'd', 'COLABORO_EN', 'Telas y Cocina')] })
  assert.deepEqual(seccionesDe(a, 'e', vocab).find((x) => x.id === 'otros')!.nodos, [{ id: 'c', rol: 'Puerta' }, { id: 'd', rol: 'Telas' }])
})
test('seccionesDe: dos vínculos que caen en la misma sección dan un solo nodo', () => {
  const a = construirAdyacencia({ nodos: [n('e', 'EVENTO'), n('r', 'ENTIDAD')], vinculos: [v('e', 'r', 'COLABORO_EN', 'DJ'), v('e', 'r', 'COLABORO_EN', 'VINYLS DJ SETS')] })
  assert.deepEqual(seccionesDe(a, 'e', vocab).map((x) => [x.id, x.nodos.length]), [['dj', 1]])
})
test('seccionesDe: los dos sentidos, como en la fixture (la creadxr es el origen)', () => {
  const a = construirAdyacencia({ nodos: [n('ana', 'ENTIDAD'), n('nudo', 'OBRA')], vinculos: [v('ana', 'nudo', 'COLABORO_EN', 'dirección')] })
  assert.deepEqual(seccionesDe(a, 'nudo', vocab).map((x) => [x.id, x.nodos]), [['otros', [{ id: 'ana', rol: 'dirección' }]]])
  assert.deepEqual(seccionesDe(a, 'ana', vocab).map((x) => [x.id, x.nodos]), [['otros', [{ id: 'nudo', rol: 'dirección' }]]])
})
test('seccionesDe: sin rol, PRODUJO e INTEGRA dan su etiqueta; COLABORO_EN va a Otros', () => {
  const a = construirAdyacencia({
    nodos: [n('ev', 'EVENTO'), n('prod', 'ENTIDAD'), n('g', 'ENTIDAD'), n('p', 'ENTIDAD'), n('q', 'ENTIDAD'), n('dj', 'ENTIDAD')],
    vinculos: [v('prod', 'ev', 'PRODUJO'), v('p', 'g', 'INTEGRA'), v('g', 'q', 'INTEGRA', '  '), v('ev', 'dj', 'COLABORO_EN', ' '), v('ev', 'dj', 'COLABORO_EN', 'DJ')],
  })
  assert.deepEqual(seccionesDe(a, 'ev', vocab).map((x) => x.id), ['produccion', 'dj', 'otros'])
  assert.deepEqual(seccionesDe(a, 'prod', vocab).map((x) => x.id), ['produccion'])
  assert.deepEqual(seccionesDe(a, 'g', vocab).map((x) => [x.id, x.nodos.map((q) => q.id)]), [['integra', ['q']], ['integrantes', ['p']]]) // por nombre, D-32
  assert.deepEqual(seccionesDe(a, 'p', vocab).map((x) => x.id), ['integra'])
})
test('seccionesDe: las etiquetas de sinRol van después del vocabulario y antes de Otros', () => {
  const a = construirAdyacencia({ nodos: [n('g', 'ENTIDAD'), n('p', 'ENTIDAD'), n('x', 'ENTIDAD'), n('y', 'ENTIDAD')], vinculos: [v('p', 'g', 'INTEGRA'), v('g', 'x', 'COLABORO_EN'), v('g', 'y', 'COLABORO_EN', 'DJ')] })
  assert.deepEqual(seccionesDe(a, 'g', vocab).map((s) => s.id), ['dj', 'integrantes', 'otros'])
})
test('seccionesDe: en una sección mixta, obras y eventos (por fecha) van antes que las entidades', () => {
  const a = construirAdyacencia({
    nodos: [n('g', 'ENTIDAD'), n('z', 'ENTIDAD', 'Zeta'), nf('o2', 'OBRA', 'Dos', '2025-01-01'), nf('o1', 'EVENTO', 'Uno', '2024-01-01'), n('a', 'ENTIDAD', 'Abel')],
    vinculos: ['z', 'o2', 'o1', 'a'].map((id) => v(id, 'g', 'COLABORO_EN', 'Luces')),
  })
  assert.deepEqual(seccionesDe(a, 'g', vocab)[0].nodos.map((q) => q.id), ['o1', 'o2', 'a', 'z'])
})
test('seccionesDe: Rama Cerratto, áreas derivadas de sus vínculos reales', () => {
  const ev = (id: string, label: string, fecha: string, tipo: NodeType = 'EVENTO') => nf(id, tipo, label, fecha)
  const a = construirAdyacencia({
    nodos: [n('rama', 'ENTIDAD', 'Rama Cerratto'), n('tp', 'ENTIDAD', 'Tropical Poncho'), ev('t', 'Tempistica I', '2021-12-19'), ev('sb', 'SOMA beta', '2022-11-26'),
      ev('s', 'SOMA', '2023-01-21'), ev('ps', 'Punk Solar', '2025-03-15'), ev('pe', 'Punk Estelar', '2025-05-02'), ev('an', 'Anomalia', '2026-02-14'),
      ev('en', 'Entropía', '2026-05-23'), ev('em', 'Entropía (Mapping)', '2026-05-23', 'OBRA')],
    vinculos: [v('rama', 'tp', 'INTEGRA', 'Fundador'), v('s', 'rama', 'COLABORO_EN', 'VINYLS DJ SETS'), v('sb', 'rama', 'COLABORO_EN', 'DJ'), v('an', 'rama', 'COLABORO_EN', 'DJ'),
      v('t', 'rama', 'COLABORO_EN', 'DJ'), v('ps', 'rama', 'COLABORO_EN', 'DJ Set Híbrido'), v('pe', 'rama', 'COLABORO_EN', 'DJ Set Híbrido'),
      v('en', 'rama', 'COLABORO_EN', 'DJ Set Híbrido, Visuales'), v('em', 'rama', 'COLABORO_EN', 'Mapping con TouchDesigner')],
  })
  const s = seccionesDe(a, 'rama', vocab)
  assert.deepEqual(s.map((x) => x.id), ['fundacion', 'dj', 'vj', 'mapping'])
  assert.deepEqual(s.find((x) => x.id === 'dj')!.nodos.map((q) => q.id), ['t', 'sb', 's', 'ps', 'pe', 'an', 'en'])
})

test('roles.json: sin colisiones, sin "artista", sin "Otros", sin vacíos', () => {
  const vistas = new Map<string, string>()
  for (const { etiqueta, roles } of vocab.secciones) {
    assert.ok(etiqueta.trim() && roles.length && roles.every((r) => r.trim()), etiqueta)
    assert.ok(!/artista/i.test(etiqueta) && etiqueta !== 'Otros', etiqueta)
    for (const r of roles) {
      const previa = vistas.get(claveRol(r))
      assert.ok(!previa || previa === etiqueta, `"${r}" cae en ${previa} y en ${etiqueta}`)
      vistas.set(claveRol(r), etiqueta)
    }
  }
  for (const [clave, etiqueta] of Object.entries(vocab.sinRol)) assert.ok(clave && typeof etiqueta === 'string' && etiqueta.trim() && !/artista/i.test(etiqueta), clave)
})

test('censo de data/curaduria/vinculos.csv: todo rol real da sección y los del PRD no caen en Otros', () => {
  const leer = (f: string) => leerCsv(readFileSync(new URL(`../../../data/curaduria/${f}`, import.meta.url), 'utf8'))
  const filas = leer('nodos.csv').filter((r) => r.descartar !== 'si')
  const vivos = new Set(filas.map((r) => r.id))
  const nodos = filas.map((r) => ({ ...n(r.id, r.node_type as NodeType, r.label), fecha: r.fecha || undefined }))
  const vinculos = leer('vinculos.csv').filter((r) => r.descartar !== 'si' && vivos.has(r.origen) && vivos.has(r.destino))
    .map((r) => ({ id: r.id, origen: r.origen, destino: r.destino, tipoVinculo: r.tipo_vinculo as TipoVinculo, rol: r.rol || undefined }))
  const a = construirAdyacencia({ nodos, vinculos })
  const secciones = new Map(nodos.map((x) => [x.id, seccionesDe(a, x.id, vocab)]))
  const participa = vinculos.filter((x) => ['COLABORO_EN', 'CORREALIZO', 'PRODUJO', 'INTEGRA'].includes(x.tipoVinculo) && x.rol?.trim())
  assert.ok(participa.length > 0)
  for (const x of participa) {
    const de = secciones.get(x.origen)!.filter((s) => s.nodos.some((q) => q.id === x.destino))
    assert.ok(de.length > 0 && de.every((s) => s.id && s.label), `sin sección: ${x.rol}`)
  }
  const nombrados = ['DJ Set Híbrido, Visuales', 'Live Set', 'Artista Convocade', 'Edición Audiovisual', 'Expositorx', 'Exposición de Cortos', 'Productora', 'Espacio',
    'MEDITACIÓN ACTIVA', 'ACTIVIDADES', 'PERFORMANCES', 'BANDAS EN VIVO', 'VJ', 'VINYLS DJ SETS']
  for (const rol of nombrados) {
    const enDatos = participa.filter((x) => claveRol(x.rol!) === claveRol(rol))
    assert.ok(enDatos.length > 0, `el censo no tiene "${rol}"`)
    for (const x of enDatos) assert.ok(secciones.get(x.origen)!.some((s) => s.id !== 'otros' && s.nodos.some((q) => q.id === x.destino)), `"${rol}" cae en Otros`)
  }
})
