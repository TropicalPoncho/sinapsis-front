import { test } from 'node:test'
import assert from 'node:assert/strict'
import { indexarSlugs, rutaDe, slugDe } from './slugs.ts'
import type { NodoGrafo, NodeType } from '../../types/vista.ts'

const n = (id: string, label: string, nodeType: NodeType = 'ENTIDAD'): NodoGrafo =>
  ({ id, label, nodeType, subtipo: 'x', vizParams: { shape: 's', color: '#fff' }, isStub: false })

test('slugDe', () => {
  assert.equal(slugDe('Tropical Poncho'), 'tropical-poncho')
  assert.equal(slugDe('TECNOLOGÍA'), 'tecnologia')
  assert.equal(slugDe('  ¡Ñandú & Co.! '), 'nandu-co')
  assert.equal(slugDe('***'), 'nodo')
})

test('colisiones deterministas', () => {
  const a = n('a', 'SOMA BETA'), b = n('b', 'SOMA beta')
  for (const orden of [[a, b], [b, a]]) {
    const i = indexarSlugs(orden)
    assert.equal(i.slugPorId.get('a'), 'soma-beta')
    assert.equal(i.slugPorId.get('b'), 'soma-beta-2')
    assert.equal(i.idPorSlug.get('soma-beta-2'), 'b')
  }
})

test('sufijo sigue hasta uno libre', () => {
  const i = indexarSlugs([n('a', 'soma'), n('b', 'soma'), n('c', 'soma-2')])
  assert.equal(new Set(i.slugPorId.values()).size, 3)
  assert.equal(i.slugPorId.get('b'), 'soma-2')
  assert.equal(i.slugPorId.get('c'), 'soma-2-2')
})

test('rutaDe', () => {
  const nodos = [n('o', 'Nudo', 'OBRA'), n('v', 'Fiesta', 'EVENTO'), n('e', 'Tp'), n('g', 'Serie', 'AGRUPACION')]
  const i = indexarSlugs(nodos)
  assert.deepEqual(nodos.map(x => rutaDe(x, i)), ['/obra/nudo', '/obra/fiesta', '/entidad/tp', '/entidad/serie'])
})
