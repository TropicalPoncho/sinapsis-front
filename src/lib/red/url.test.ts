import { test } from 'node:test'
import assert from 'node:assert/strict'
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
  assert.equal(v.raiz, 'r'); assert.equal(v.profundidad, 1); assert.equal(v.limite, LIMITE_VISTA)
  assert.equal(v.direccion, 'ambas'); assert.equal(v.incluirRaiz, true); assert.equal(v.modoOrden, 'grafo')
  // Entrar a un ENTIDAD o AGRUPACION muestra solo lo que compone (áreas, obras) y el orden
  // curatorial entre ellas (PRECEDE), no colaboradores.
  assert.deepEqual(v.filtroNodeTypes, []); assert.deepEqual(v.filtroVinculos, ['COMPONE', 'PRECEDE'])
  assert.deepEqual(vistaDe(E(), 'r', 'AGRUPACION').filtroVinculos, ['COMPONE', 'PRECEDE'])
  assert.deepEqual(vistaDe(E(), 'r', 'OBRA').filtroVinculos, [])
  assert.equal(vistaDe(E({ prof: 4 }), 'r', 'OBRA').profundidad, 4)
  assert.equal(profDefecto(), 1)
  // Una AGRUPACION no se muestra a sí misma por defecto (estás "adentro"); una ENTIDAD sí. `raiz`
  // en la URL pisa el default en cualquier sentido.
  assert.equal(vistaDe(E(), 'r', 'ENTIDAD').incluirRaiz, true)
  assert.equal(vistaDe(E(), 'r', 'AGRUPACION').incluirRaiz, false)
  assert.equal(vistaDe(E({ raiz: false }), 'r', 'ENTIDAD').incluirRaiz, false)
  assert.equal(vistaDe(E({ raiz: true }), 'r', 'AGRUPACION').incluirRaiz, true)
})
