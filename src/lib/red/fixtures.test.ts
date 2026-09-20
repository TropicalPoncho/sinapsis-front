import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const { nodos, vinculos } = JSON.parse(readFileSync('src/lib/red/fixtures/topologia.json', 'utf8'))
const ids = new Set(nodos.map((n: any) => n.id))
const AREAS = ['concepto', 'obras', 'audiovisuales', 'editorial', 'tecnologia', 'laboratorios'].map((a) => 'area-' + a)

test('fixture de topología cumple el contrato', () => {
  assert.ok(nodos.length >= 30)
  assert.deepEqual(new Set(nodos.map((n: any) => n.nodeType)), new Set(['ENTIDAD', 'OBRA', 'EVENTO', 'AGRUPACION']))
  assert.equal(ids.size, nodos.length)
  assert.equal(new Set(vinculos.map((v: any) => v.id)).size, vinculos.length)
  for (const v of vinculos) assert.ok(ids.has(v.origen) && ids.has(v.destino), v.id)
  const tp = nodos.find((n: any) => n.id === 'tp')
  assert.equal(tp.label, 'Tropical Poncho')
  assert.equal(tp.subtipo, 'productora')
  const deTp = vinculos.filter((v: any) => v.origen === 'tp' && v.tipoVinculo === 'COMPONE')
  assert.deepEqual(deTp.map((v: any) => v.destino).sort(), [...AREAS].sort())
  assert.equal(vinculos.filter((v: any) => v.origen === 'area-laboratorios' || v.destino === 'area-laboratorios').length, 1)
  const soma = nodos.filter((n: any) => n.label.toLowerCase() === 'soma beta').map((n: any) => n.label)
  assert.deepEqual(soma.sort(), ['SOMA BETA', 'SOMA beta'])
  for (const n of nodos) {
    if (n.thumb) assert.ok(n.thumb === n.thumb.toLowerCase() && !n.thumb.includes('://') && !n.thumb.includes('..') && !n.thumb.startsWith('/'), n.thumb)
    assert.ok((n.descripcionBreve ?? '').length <= 200)
  }
  assert.ok(nodos.some((n: any) => n.isStub))
  assert.ok(nodos.some((n: any) => n.nodeType === 'OBRA' && !n.descripcionBreve))
  assert.equal(nodos.find((n: any) => n.id === 'obra-nudo').thumb, 'obras/nudo.png')
})
