import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { construirAdyacencia } from '../vista/adyacencia.ts'
import { resolverVista } from '../vista/resolverVista.ts'
import type { Subgrafo } from '../../types/vista.ts'
import { estadoDesdeUrl as d, urlDe, claveVista, vistaDe, profDefecto, LIMITE_VISTA, type EstadoRed } from './url.ts'

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
