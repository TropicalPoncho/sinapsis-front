import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inversa, entradaValida, alPop } from './navegacion.ts'

test('inversa', () => {
  assert.deepEqual([inversa.reemplazo, inversa.filtrado, inversa.aditivo], ['reemplazo', 'aditivo', 'filtrado'])
  assert.equal(inversa.reemplazo, 'reemplazo') // Volver de una entrada (todo Entrar es reemplazo, D-26) sigue siendo reemplazo
})
test('entradaValida', () => {
  assert.deepEqual(entradaValida({ sinapsis: { idx: 0, t: 'aditivo' } }), { idx: 0, t: 'aditivo' })
  for (const x of [null, undefined, 3, {}, { sinapsis: { idx: -1, t: 'filtrado' } }, { sinapsis: { idx: 1.5, t: 'filtrado' } }, { sinapsis: { idx: 1, t: 'zzz' } }])
    assert.equal(entradaValida(x), null)
})
test('alPop', () => {
  const a = { idx: 2, t: 'filtrado' as const }
  assert.deepEqual(alPop(a, { idx: 1, t: 'reemplazo' }), { direccion: 'atras', t: 'aditivo' })
  assert.deepEqual(alPop(a, { idx: 3, t: 'reemplazo' }), { direccion: 'adelante', t: 'reemplazo' })
  assert.deepEqual(alPop(a, null), { direccion: 'dura', t: 'reemplazo' })
  assert.deepEqual(alPop(null, { idx: 1, t: 'filtrado' }), { direccion: 'dura', t: 'reemplazo' })
})
