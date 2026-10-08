import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { construirAdyacencia } from '../vista/adyacencia.ts'
import { resolverVista } from '../vista/resolverVista.ts'
import type { Subgrafo } from '../../types/vista.ts'
import { indexarSlugs } from './slugs.ts'
import { estadoDesdeUrl as d, urlDe, claveVista, vistaDe, profDefecto, LIMITE_VISTA, LIMITE_SUMA, sumarIds, subgrafoDe, type EstadoRed } from './url.ts'

const E = (o: Partial<EstadoRed> = {}): EstadoRed => ({ enfocado: null, red: null, prof: null, semilla: null, raiz: null, puentes: null, ...o })

test('home y raíz por defecto', () => {
  assert.deepEqual(d('/', ''), E())
  assert.deepEqual(d('/entidad/tp', ''), E({ enfocado: 'tp', red: 'tp' }))
})
test('red', () => {
  assert.equal(d('/obra/nudo', '?red=_').red, null)
  const e = d('/obra/nudo', '?red=tp&prof=3')
  assert.equal(e.red, 'tp'); assert.equal(e.prof, 3)
})
test('prof clamp', () => {
  assert.equal(d('/', '?prof=99').prof, 4)
  assert.equal(d('/', '?prof=0').prof, 1)
  assert.equal(d('/', '?prof=abc').prof, null)
  assert.equal(d('/', '?prof=').prof, null)
})
test('semilla', () => {
  assert.equal(d('/', '?semilla=ab_c-1').semilla, 'ab_c-1')
  assert.equal(d('/', '?semilla=a%20b').semilla, null)
  assert.equal(d('/', '?semilla=' + 'a'.repeat(33)).semilla, null)
})
test('raiz', () => {
  assert.equal(d('/', '?raiz=0').raiz, false)
  assert.equal(d('/', '?raiz=1').raiz, true)
  assert.equal(d('/', '').raiz, null)
  assert.equal(d('/', '?raiz=x').raiz, null)
})
test('slugs raros no rompen', () => {
  assert.equal(d('/entidad/a%2Fb', '').enfocado, 'a/b')
  assert.equal(d('/entidad/%E0%A4%A', '').enfocado, '%E0%A4%A')
  assert.equal(d('/entidad/' + 'X'.repeat(100), '').enfocado, 'X'.repeat(100))
})
test('ida y vuelta', () => {
  const casos: [string, EstadoRed][] = [
    ['/', E()],
    ['/entidad/tp', E({ enfocado: 'tp', red: null })],
    ['/entidad/tp', E({ enfocado: 'tp', red: 'tp' })],
    ['/obra/nudo', E({ enfocado: 'nudo', red: 'tp' })],
    ['/obra/nudo', E({ enfocado: 'nudo', red: 'tp', prof: 3, semilla: 'abc' })],
    ['/entidad/obras', E({ enfocado: 'obras', red: 'obras', raiz: false })],
  ]
  for (const [p, e] of casos) {
    const u = urlDe(p, e)
    const [path, q = ''] = u.split('?')
    assert.deepEqual(d(path, q ? '?' + q : ''), e, u)
  }
  assert.equal(urlDe('/entidad/tp', E({ enfocado: 'tp', red: 'tp' })), '/entidad/tp')
  assert.equal(urlDe('/entidad/tp', E({ enfocado: 'tp' })), '/entidad/tp?red=_')
})
test('claveVista ignora enfocado', () => {
  assert.equal(claveVista(E({ enfocado: 'a', red: 'r' })), claveVista(E({ enfocado: 'b', red: 'r' })))
  assert.notEqual(claveVista(E({ red: 'r' })), claveVista(E({ red: 'q' })))
  assert.notEqual(claveVista(E()), claveVista(E({ prof: 2 })))
  assert.notEqual(claveVista(E()), claveVista(E({ semilla: 's' })))
})
test('vistaDe', () => {
  const v = vistaDe(E(), 'r', 'ENTIDAD')
  assert.equal(v.raiz, 'r'); assert.equal(v.profundidad, 2); assert.equal(v.limite, LIMITE_VISTA)
  assert.equal(v.direccion, 'ambas'); assert.equal(v.incluirRaiz, true); assert.equal(v.modoOrden, 'grafo')
  // Entrar a una AGRUPACION muestra solo lo que compone (áreas, obras) y el orden curatorial
  // entre ellas (PRECEDE). Entrar a una ENTIDAD recorre todo a profundidad 2 pero muestra solo
  // ENTIDAD/AGRUPACION: eventos y obras quedan como nodos puente, no se dibujan.
  assert.deepEqual(v.filtroNodeTypes, ['ENTIDAD', 'AGRUPACION']); assert.deepEqual(v.filtroVinculos, [])
  const ag = vistaDe(E(), 'r', 'AGRUPACION')
  assert.deepEqual(ag.filtroNodeTypes, []); assert.deepEqual(ag.filtroVinculos, ['COMPONE', 'PRECEDE']); assert.equal(ag.profundidad, 1)
  assert.deepEqual(vistaDe(E(), 'r', 'OBRA').filtroVinculos, [])
  assert.equal(vistaDe(E({ prof: 4 }), 'r', 'OBRA').profundidad, 4)
  assert.equal(profDefecto('ENTIDAD'), 2); assert.equal(profDefecto('AGRUPACION'), 1); assert.equal(profDefecto(), 1)
  // Una AGRUPACION no se muestra a sí misma por defecto (estás "adentro"); una ENTIDAD sí. `raiz`
  // en la URL pisa el default en cualquier sentido.
  assert.equal(vistaDe(E(), 'r', 'ENTIDAD').incluirRaiz, true)
  assert.equal(vistaDe(E(), 'r', 'AGRUPACION').incluirRaiz, false)
  assert.equal(vistaDe(E({ raiz: false }), 'r', 'ENTIDAD').incluirRaiz, false)
  assert.equal(vistaDe(E({ raiz: true }), 'r', 'AGRUPACION').incluirRaiz, true)
})

// Con la fixture (mismo contrato que la curaduría): ver qué trae de verdad cada red al entrar.
const topo = JSON.parse(readFileSync('src/lib/red/fixtures/topologia.json', 'utf8')) as Subgrafo
const ady = construirAdyacencia(topo)
const redDe = (id: string) => { const t = ady.nodos.get(id)!.nodeType; return resolverVista(ady, vistaDe(E(), id, t)) }

test('vistaDe: una AGRUPACION recorre solo vínculos salientes (contenedor -> miembros)', () => {
  assert.equal(vistaDe(E(), 'r', 'AGRUPACION').direccion, 'sale')
  for (const t of ['ENTIDAD', 'OBRA', 'EVENTO'] as const) assert.equal(vistaDe(E(), 'r', t).direccion, 'ambas')
})
test('fixture: adentro de un área no aparece la entidad dueña', () => {
  const ids = redDe('area-obras').nodos.map((n) => n.id)
  assert.ok(!ids.includes('tp'))
  assert.ok(ids.includes('obra-nudo') && ids.includes('obra-espora'))
})
// Únicas redes de la fixture con nodos sin vínculo dibujable, y por qué (no se relaja la regla en
// general: cualquier otra red que aparezca acá, o una que deje de estar, hace fallar el test).
// Son redes de creadxr cuyos colaboradores se conocen solo a través de un hub (obra-espora, o el
// evento al que ambos aportan) con más de dos vecinos y sin PRODUJO: D-puentes no arma ese clique
// a propósito (puentesDe, resolverVista.ts). La base real no tiene ninguno (172 redes, 165 con
// 2+ nodos, 0 sueltos al 2026-10-08), así que es un hueco de la fixture, no del código.
const SUELTOS_POR_HUB_SIN_PRODUCTORA = [
  'creadxr-banda-eco', 'creadxr-dani', 'creadxr-duo-neon', 'creadxr-eli', 'creadxr-hugo',
  'creadxr-ines', 'creadxr-stub', 'soma-beta-1', 'soma-beta-2',
]
test('fixture: ninguna red de entidad o área tiene nodos sueltos (salvo los hubs sin productora)', () => {
  const conSueltos: string[] = []
  for (const n of topo.nodos.filter((n) => n.nodeType === 'ENTIDAD' || n.nodeType === 'AGRUPACION')) {
    const { nodos, vinculos } = redDe(n.id)
    if (nodos.length < 2) continue
    const ids = new Set(nodos.map((x) => x.id))
    const conVinculo = new Set(vinculos.filter((v) => ids.has(v.origen) && ids.has(v.destino)).flatMap((v) => [v.origen, v.destino]))
    if (nodos.some((x) => !conVinculo.has(x.id))) conSueltos.push(n.id)
  }
  assert.deepEqual(conSueltos.sort(), SUELTOS_POR_HUB_SIN_PRODUCTORA)
})

// D-22: lo sumado al recorrer. La red base no cambia; el foco o lo guardado que no está se suma.
const idx = indexarSlugs(topo.nodos)
const sd = (e: Partial<EstadoRed>, guardados: string[] = []) => subgrafoDe(ady, idx, E(e), guardados, { semilla: 'abc', limiteHome: 40 })
const ids = (r: { sub: Subgrafo }) => r.sub.nodos.map((n) => n.id)
const vids = (r: { sub: Subgrafo }) => r.sub.vinculos.map((v) => v.id)

test('sumarIds: lo nuevo al final, lo re-tocado pasa al final, tope LIMITE_SUMA', () => {
  assert.deepEqual(sumarIds(['a', 'b'], ['b', 'c']), ['a', 'b', 'c'])
  assert.deepEqual(sumarIds(['a', 'b'], ['a']), ['b', 'a'])
  const quince = Array.from({ length: 15 }, (_, i) => 'n' + i)
  const r = sumarIds([], quince)
  assert.equal(r.length, LIMITE_SUMA); assert.equal(r[0], 'n3'); assert.equal(r.at(-1), 'n14')
})
test('subgrafoDe: un crédito fuera de la red se suma con su vínculo real, la red no se reemplaza (G-04)', () => {
  const r = sd({ enfocado: 'ana-ruiz', red: 'obras' })
  assert.equal(r.sub.nodos.length, 6)
  assert.ok(ids(r).includes('creadxr-ana') && ids(r).includes('obra-nudo'))
  assert.ok(vids(r).includes('v14') && !vids(r).includes('v22'))
  assert.deepEqual(r.sumados, ['creadxr-ana'])
})
test('subgrafoDe: lo guardado se conserva al enfocar otra cosa (Atrás)', () => {
  const r = sd({ enfocado: 'nudo', red: 'obras' }, ['creadxr-ana'])
  assert.equal(r.sub.nodos.length, 6); assert.ok(ids(r).includes('creadxr-ana'))
})
test('subgrafoDe: enfocar algo visible solo cambia el foco (G-05)', () => {
  const base = redDe('tp').nodos.map((n) => n.id).sort()
  const r = sd({ enfocado: 'beto-sosa', red: 'tropical-poncho' })
  assert.deepEqual(ids(r).sort(), base); assert.deepEqual(r.sumados, [])
})
test('subgrafoDe: enfocar algo no visible lo suma sin traer su red propia (G-05)', () => {
  const r = sd({ enfocado: 'fede-roca', red: 'tropical-poncho' })
  assert.equal(r.sub.nodos.length, redDe('tp').nodos.length + 1)
  assert.ok(ids(r).includes('creadxr-fede') && !ids(r).includes('obra-corto'))
  assert.ok(redDe('tp').nodos.every((n) => ids(r).includes(n.id)))
})
test('subgrafoDe: el área enfocada adentro de sí misma no se suma', () => {
  const r = sd({ enfocado: 'obras', red: 'obras' })
  assert.equal(r.sub.nodos.length, 5); assert.deepEqual(r.sumados, [])
})
test('subgrafoDe: ids desconocidos en guardados se ignoran', () => {
  const r = sd({ enfocado: 'nudo', red: 'obras' }, ['no-existe'])
  assert.equal(r.sub.nodos.length, 5); assert.deepEqual(r.sumados, [])
})
test('subgrafoDe: punto fijo (si no, el Shell entra en un ciclo de render)', () => {
  const e = { enfocado: 'ana-ruiz', red: 'obras' }
  const r = sd(e)
  assert.deepEqual(sd(e, r.sumados).sumados, r.sumados)
  const r2 = sd({ enfocado: 'beto-sosa', red: 'obras' }, r.sumados)
  assert.deepEqual(sd({ enfocado: 'beto-sosa', red: 'obras' }, r2.sumados).sumados, r2.sumados)
})
test('subgrafoDe: tope — nunca más de LIMITE_VISTA + LIMITE_SUMA y el foco no sale', () => {
  const base = new Set(redDe('area-obras').nodos.map((n) => n.id))
  const libres = topo.nodos.map((n) => n.id).filter((id) => !base.has(id) && id !== 'creadxr-ana')
  const r = sd({ enfocado: 'ana-ruiz', red: 'obras' }, libres.slice(0, 20))
  assert.equal(r.sumados.length, LIMITE_SUMA); assert.equal(r.sumados.at(-1), 'creadxr-ana')
  assert.ok(r.sub.nodos.length <= LIMITE_VISTA + LIMITE_SUMA)
})
test('subgrafoDe: en la home una obra enfocada se suma', () => {
  assert.ok(ids(sd({ enfocado: 'nudo' })).includes('obra-nudo'))
})
