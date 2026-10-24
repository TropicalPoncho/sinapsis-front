import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

type N = { id: string; label: string; subtipo: string; nodeType: string; thumb?: string; descripcionBreve?: string; isStub?: boolean }
type V = { id: string; origen: string; destino: string; tipoVinculo: string }
const { nodos, vinculos } = JSON.parse(readFileSync('src/lib/red/fixtures/topologia.json', 'utf8')) as { nodos: N[]; vinculos: V[] }
const ids = new Set(nodos.map((n: N) => n.id))
const AREAS = ['concepto', 'obras', 'audiovisuales', 'editorial', 'tecnologia', 'laboratorios'].map((a) => 'area-' + a)

test('fixture de topología cumple el contrato', () => {
  assert.ok(nodos.length >= 30)
  assert.deepEqual(new Set(nodos.map((n: N) => n.nodeType)), new Set(['ENTIDAD', 'OBRA', 'EVENTO', 'AGRUPACION']))
  assert.equal(ids.size, nodos.length)
  assert.equal(new Set(vinculos.map((v: V) => v.id)).size, vinculos.length)
  for (const v of vinculos) assert.ok(ids.has(v.origen) && ids.has(v.destino), v.id)
  const tp = nodos.find((n: N) => n.id === 'tp')
  assert.equal(tp?.label, 'Tropical Poncho')
  assert.equal(tp?.subtipo, 'productora')
  const deTp = vinculos.filter((v: V) => v.origen === 'tp' && v.tipoVinculo === 'COMPONE')
  assert.deepEqual(deTp.map((v: V) => v.destino).sort(), [...AREAS].sort())
  assert.equal(vinculos.filter((v: V) => v.origen === 'area-laboratorios' || v.destino === 'area-laboratorios').length, 1)
  const soma = nodos.filter((n: N) => n.label.toLowerCase() === 'soma beta').map((n: N) => n.label)
  assert.deepEqual(soma.sort(), ['SOMA BETA', 'SOMA beta'])
  for (const n of nodos) {
    if (n.thumb) assert.ok(n.thumb === n.thumb.toLowerCase() && !n.thumb.includes('://') && !n.thumb.includes('..') && !n.thumb.startsWith('/'), n.thumb)
    assert.ok((n.descripcionBreve ?? '').length <= 200)
  }
  assert.ok(nodos.some((n: N) => n.isStub))
  assert.ok(nodos.some((n: N) => n.nodeType === 'OBRA' && !n.descripcionBreve))
  assert.equal(nodos.find((n: N) => n.id === 'obra-nudo')?.thumb, 'obras/nudo.png')
})

test('fixture: ficha: true en la topología <=> contenido en detalles (D-48)', () => {
  const detalles = JSON.parse(readFileSync('src/lib/red/fixtures/detalles.json', 'utf8')) as Record<string, { ficha?: { contenido?: object } }>
  const conFlag = nodos.filter((n) => (n as N & { ficha?: true }).ficha).map((n) => n.id).sort()
  const conContenido = Object.entries(detalles).filter(([, d]) => Object.keys(d.ficha?.contenido ?? {}).length > 0).map(([id]) => id).sort()
  assert.deepEqual(conFlag, conContenido)
  assert.deepEqual(conFlag, ['creadxr-ana', 'obra-espora', 'obra-nudo', 'tp'])
})
