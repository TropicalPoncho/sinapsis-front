import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { agrupadoresDe, padreDe, nodosDeLaRed, obrasDe, seccionesDe, claveRol, type VocabularioRoles } from './menus.ts'
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
test('obrasDe: obras y eventos vecinos en ambos sentidos, sin repetidos', () => {
  assert.deepEqual(obrasDe(ady, 'p'), ['o'])
  assert.deepEqual(obrasDe(ady, 'o'), [])
})

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

// --- Etiquetas por contexto (D-40) ---
const sub = (id: string, nodeType: NodeType, subtipo: string, label = id, fecha?: string): NodoGrafo => ({ ...nf(id, nodeType, label, fecha), subtipo })
test('seccionesDe (D-40): un espacio lee "Eventos" donde el evento lee "Espacio"', () => {
  const a = construirAdyacencia({
    nodos: [sub('esp', 'ENTIDAD', 'centro_cultural', 'Espacio'), nf('e2', 'EVENTO', 'Dos', '2025-02-01'), nf('e1', 'EVENTO', 'Uno', '2025-01-01')],
    vinculos: [v('e1', 'esp', 'COLABORO_EN', 'Espacio'), v('e2', 'esp', 'COLABORO_EN', 'Espacio')],
  })
  assert.deepEqual(seccionesDe(a, 'esp', vocab).map((x) => [x.id, x.label, x.nodos.map((q) => q.id)]), [['eventos', 'Eventos', ['e1', 'e2']]])
  assert.deepEqual(seccionesDe(a, 'e1', vocab).map((x) => [x.id, x.label]), [['espacio', 'Espacio']])
})
test('seccionesDe (D-40): una banda lee "Conciertos" y "Otros" conserva la grafía original', () => {
  const a = construirAdyacencia({
    nodos: [sub('b', 'ENTIDAD', 'banda'), nf('e1', 'EVENTO', 'Uno', '2025-01-01'), nf('e2', 'EVENTO', 'Dos', '2025-02-01'), nf('e3', 'EVENTO', 'Tres', '2025-03-01')],
    vinculos: [v('e1', 'b', 'COLABORO_EN', 'BANDAS EN VIVO'), v('e2', 'b', 'COLABORO_EN', 'Live set'), v('e3', 'b', 'COLABORO_EN', 'Telonera')],
  })
  assert.deepEqual(seccionesDe(a, 'b', vocab).map((x) => [x.id, x.nodos]), [['conciertos', [{ id: 'e1' }, { id: 'e2' }, { id: 'e3', rol: 'Telonera' }]]])
})
test('seccionesDe (D-40): una persona convocada lee Eventos solo para los EVENTO', () => {
  const a = construirAdyacencia({
    nodos: [n('p', 'ENTIDAD'), nf('ev', 'EVENTO', 'Ev', '2025-01-01'), nf('ob', 'OBRA', 'Ob', '2025-01-01')],
    vinculos: [v('ev', 'p', 'COLABORO_EN', 'Artista Convocade'), v('ob', 'p', 'COLABORO_EN', 'Artista Convocade')],
  })
  assert.deepEqual(seccionesDe(a, 'p', vocab).map((x) => [x.id, x.nodos.map((q) => q.id)]), [['creadxrs-convocades', ['ob']], ['eventos', ['ev']]])
})
test('seccionesDe (D-40): gana la primera regla que coincide; sin contextos da el resultado de siempre', () => {
  const a = construirAdyacencia({ nodos: [n('e', 'ENTIDAD'), nf('x', 'EVENTO', 'X', '2025-01-01')], vinculos: [v('x', 'e', 'COLABORO_EN', 'DJ')] })
  const regla = (etiqueta: string) => ({ dueno: 'ENTIDAD', seccion: 'DJ', etiqueta })
  assert.deepEqual(seccionesDe(a, 'e', { ...vocab, contextos: [regla('Primera'), regla('Segunda')] }).map((x) => x.id), ['primera'])
  assert.deepEqual(seccionesDe(a, 'e', { ...vocab, contextos: undefined }).map((x) => x.id), ['dj'])
  assert.deepEqual(seccionesDe(a, 'e', { ...vocab, contextos: [{ ...regla('Nada'), dueno: 'ENTIDAD:banda' }] }).map((x) => x.id), ['dj'])
})

// --- Portfolio por tipo de dueño (D-46) y "Próximo" (D-47) ---
const resumen = (a: ReturnType<typeof construirAdyacencia>, id: string, hoy?: string) =>
  seccionesDe(a, id, vocab, hoy).map((s) => [s.id, s.nodos.map((q) => (q.rol === undefined ? q.id : `${q.id}:${q.rol}`))])
const personaConTodo = () => construirAdyacencia({
  nodos: [sub('yo', 'ENTIDAD', 'persona'), nf('A', 'EVENTO', 'A', '2026-01-01'), nf('B', 'EVENTO', 'B', '2026-06-01'), nf('C', 'OBRA', 'C', '2025-01-01'),
    sub('D', 'ENTIDAD', 'centro_cultural'), sub('E', 'ENTIDAD', 'persona'), nf('G', 'AGRUPACION', 'G')],
  vinculos: [v('A', 'yo', 'COLABORO_EN', 'DJ'), v('yo', 'A', 'PRODUJO'), v('B', 'yo', 'COLABORO_EN', 'DJ Set Híbrido, Visuales'),
    v('C', 'yo', 'COLABORO_EN', 'Mapping'), v('yo', 'D', 'INTEGRA', 'Fundador'), v('yo', 'E', 'COLABORO_EN'), v('yo', 'G', 'INTEGRA')],
})
test('seccionesDe (D-46): una persona lee su portfolio, una fila por nodo, más reciente primero y roles como chips', () => {
  assert.deepEqual(resumen(personaConTodo(), 'yo'), [
    ['participaciones', ['B:DJ · VJ', 'A:Producción · DJ']], ['obras', ['C:Mapping']], ['organizaciones', ['D:Fundadxr']],
    ['colaboraciones', ['E']], ['otros', ['G:Integra']],
  ])
})
test('seccionesDe (D-46): sin fecha al final y por nombre; misma fecha por nombre', () => {
  const a = construirAdyacencia({
    nodos: [sub('yo', 'ENTIDAD', 'persona'), nf('s2', 'EVENTO', 'Zeta'), nf('s1', 'EVENTO', 'Alfa'), nf('d2', 'EVENTO', 'Dos', '2025-01-01'), nf('d1', 'EVENTO', 'Uno', '2025-01-01'), nf('n', 'EVENTO', 'Nuevo', '2026-01-01')],
    vinculos: ['s2', 's1', 'd2', 'd1', 'n'].map((id) => v(id, 'yo', 'COLABORO_EN', 'DJ')),
  })
  assert.deepEqual(resumen(a, 'yo').map(([, ns]) => ns), [['n:DJ', 'd2:DJ', 'd1:DJ', 's1:DJ', 's2:DJ']])
})
test('seccionesDe (D-46): sin portfolio (evento, centro cultural, banda, subtipo desconocido o vocabulario sin portfolios) da lo de siempre', () => {
  const a = personaConTodo()
  assert.deepEqual(seccionesDe(a, 'yo', { ...vocab, portfolios: undefined }).map((s) => s.id), ['produccion', 'fundacion', 'dj', 'vj', 'mapping', 'integra', 'otros'])
  assert.deepEqual(seccionesDe(a, 'A', vocab).map((s) => s.id), ['produccion', 'dj'])
  assert.deepEqual(seccionesDe(a, 'D', vocab).map((s) => s.id), ['fundacion'])
})
test('seccionesDe (D-46): una productora separa Eventos producidos de Participaciones y no repite lo que la sección ya dice', () => {
  const a = construirAdyacencia({
    nodos: [sub('org', 'ENTIDAD', 'productora'), nf('p1', 'EVENTO', 'P1'), nf('p2', 'EVENTO', 'P2', '2025-01-01'), nf('c1', 'EVENTO', 'C1', '2026-01-01'),
      sub('i1', 'ENTIDAD', 'persona', 'I1'), sub('i2', 'ENTIDAD', 'persona', 'I2'), nf('ob', 'OBRA', 'Ob', '2024-01-01'), sub('otra', 'ENTIDAD', 'sello', 'Otra')],
    vinculos: [v('org', 'p1', 'PRODUJO'), v('org', 'p2', 'PRODUJO'), v('p2', 'org', 'COLABORO_EN', 'DJ'), v('c1', 'org', 'COLABORO_EN'),
      v('i1', 'org', 'INTEGRA'), v('i2', 'org', 'INTEGRA', 'Fundador'), v('ob', 'org', 'COLABORO_EN', 'Gráfica'), v('org', 'otra', 'INTEGRA')],
  })
  assert.deepEqual(resumen(a, 'org'), [['eventos-producidos', ['p2:DJ', 'p1']], ['participaciones', ['c1']], ['integrantes', ['i1', 'i2:Fundadxr']],
    ['obras', ['ob:Gráfica']], ['organizaciones', ['otra:Integra']]])
})
test('seccionesDe (D-46): `con` sin coincidencia pasa a la sección siguiente del mismo tipo y nada se pierde', () => {
  const a = construirAdyacencia({ nodos: [sub('org', 'ENTIDAD', 'colectivo'), nf('e', 'EVENTO', 'E', '2025-01-01'), nf('g', 'AGRUPACION', 'G')], vinculos: [v('org', 'e', 'COLABORO_EN', 'DJ'), v('g', 'org', 'COLABORO_EN', 'Telas')] })
  assert.deepEqual(resumen(a, 'org'), [['participaciones', ['e:DJ']], ['otros', ['g:Telas']]])
})
test('seccionesDe (D-47): con hoy los eventos de hoy en adelante van primero, el más cercano antes; sin hoy no hay proximos', () => {
  const a = construirAdyacencia({
    nodos: [sub('yo', 'ENTIDAD', 'persona'), nf('e1', 'EVENTO', 'Lejano', '2026-11-05'), nf('e2', 'EVENTO', 'Cerca', '2026-10-31'), nf('e3', 'EVENTO', 'Viejo', '2025-01-01'), nf('e4', 'EVENTO', 'Hoy', '2026-10-20')],
    vinculos: ['e1', 'e2', 'e3', 'e4'].map((id) => v(id, 'yo', 'COLABORO_EN', 'DJ')),
  })
  const s = seccionesDe(a, 'yo', vocab, '2026-10-20')[0]
  assert.deepEqual(s.nodos.map((q) => q.id), ['e4', 'e2', 'e1', 'e3']); assert.equal(s.proximos, 3)
  const sin = seccionesDe(a, 'yo', vocab)[0]
  assert.deepEqual(sin.nodos.map((q) => q.id), ['e1', 'e2', 'e4', 'e3']); assert.ok(!('proximos' in sin))
  assert.ok(!('proximos' in seccionesDe(a, 'yo', vocab, '2030-01-01')[0]))
})
test('seccionesDe (D-47): vale también en el modo por rol; el resto no cambia de orden', () => {
  const a = construirAdyacencia({
    nodos: [sub('esp', 'ENTIDAD', 'centro_cultural'), nf('v1', 'EVENTO', 'Viejo1', '2025-01-01'), nf('v2', 'EVENTO', 'Viejo2', '2025-06-01'), nf('f', 'EVENTO', 'Futuro', '2026-10-31')],
    vinculos: ['v2', 'f', 'v1'].map((id) => v(id, 'esp', 'COLABORO_EN', 'Espacio')),
  })
  const s = seccionesDe(a, 'esp', vocab, '2026-10-20')[0]
  assert.deepEqual(s.nodos.map((q) => q.id), ['f', 'v1', 'v2']); assert.equal(s.proximos, 1)
})

test('roles.json: contextos con forma válida y lugar en el vocabulario (T-04.1-15)', () => {
  const tipos = ['ENTIDAD', 'OBRA', 'EVENTO', 'AGRUPACION']
  const etiquetas = new Set([...vocab.secciones.map((s) => s.etiqueta), ...Object.values(vocab.sinRol), 'Otros'])
  assert.ok(vocab.contextos && vocab.contextos.length > 0)
  for (const r of vocab.contextos!) {
    assert.match(r.dueno, /^(ENTIDAD|OBRA|EVENTO|AGRUPACION)(:[a-z_]+)?$/, r.dueno)
    assert.ok(r.seccion === '*' || etiquetas.has(r.seccion), r.seccion)
    assert.ok(!r.contraparte || tipos.includes(r.contraparte), r.contraparte)
    assert.ok(r.etiqueta.trim() && r.etiqueta !== 'Otros' && !/artista/i.test(r.etiqueta), r.etiqueta)
  }
  assert.ok(vocab.secciones.some((s) => s.etiqueta === vocab.lugar))
})
test('roles.json: portfolios y chips con forma válida (T-04.1-19)', () => {
  const clave = /^(ENTIDAD|OBRA|EVENTO|AGRUPACION)(:[a-z_]+)?$/
  const texto = (t: string) => t.trim() && !/artista/i.test(t) && t !== 'Otros'
  assert.ok(vocab.portfolios && vocab.portfolios.length > 0)
  const ids = new Set<string>(); const duenos = new Set<string>()
  for (const p of vocab.portfolios!) {
    assert.ok(p.id.trim() && !ids.has(p.id), p.id); ids.add(p.id)
    for (const d of p.duenos) { assert.match(d, clave, d); assert.ok(!duenos.has(d), `${d} está en dos portfolios`); duenos.add(d) }
    const etiquetas = new Set<string>()
    for (const s of p.secciones) {
      assert.ok(texto(s.etiqueta) && !etiquetas.has(s.etiqueta), s.etiqueta); etiquetas.add(s.etiqueta)
      assert.match(s.contraparte, clave, s.contraparte)
    }
  }
  for (const { etiqueta, chip } of vocab.secciones) if (chip !== undefined) assert.ok(texto(chip) && chip.length <= 30, `${etiqueta}: ${chip}`)
})
test('roles.json: cada `con` es una etiqueta del vocabulario o de sinRol (T-04.1-19)', () => {
  const etiquetas = new Set([...vocab.secciones.map((s) => s.etiqueta), ...Object.values(vocab.sinRol)])
  const cons = vocab.portfolios!.flatMap((p) => p.secciones.flatMap((s) => s.con ?? []))
  assert.ok(cons.length > 0)
  for (const c of cons) assert.ok(etiquetas.has(c), c)
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
    'MEDITACIÓN ACTIVA', 'ACTIVIDADES', 'PERFORMANCES', 'BANDAS EN VIVO', 'VJ', 'VINYLS DJ SETS', 'DJ Set']
  for (const rol of nombrados) {
    const enDatos = participa.filter((x) => claveRol(x.rol!) === claveRol(rol))
    assert.ok(enDatos.length > 0, `el censo no tiene "${rol}"`)
    for (const x of enDatos) assert.ok(secciones.get(x.origen)!.some((s) => s.id !== 'otros' && s.nodos.some((q) => q.id === x.destino)), `"${rol}" cae en Otros`)
  }
})
