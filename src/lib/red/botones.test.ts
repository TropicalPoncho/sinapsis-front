import { test } from 'node:test'
import assert from 'node:assert/strict'
import { botonesDe } from './botones.ts'
import type { NodoGrafo, NodeType } from '../../types/vista.ts'

const n = (nodeType: NodeType, o: Partial<NodoGrafo> = {}): NodoGrafo => ({
  id: 'i', nodeType, subtipo: 's', label: 'Lab', vizParams: { shape: 's', color: '#fff' }, isStub: false, ...o,
})

test('OBRA/EVENTO con descripción: Ver más', () => {
  for (const t of ['OBRA', 'EVENTO'] as const)
    assert.deepEqual(botonesDe(n(t, { descripcionBreve: 'd' }), { grado: 0 }), [{ etiqueta: 'Ver más', accion: 'expandir' }])
})
test('OBRA stub: sin botones', () => assert.deepEqual(botonesDe(n('OBRA', { isStub: true, descripcionBreve: 'd' }), { grado: 3 }), []))
test('OBRA sin descripción: sin botones', () => assert.deepEqual(botonesDe(n('OBRA'), { grado: 3 }), []))
test('ENTIDAD/AGRUPACION con grado: Entrar, incluso stub', () => {
  assert.deepEqual(botonesDe(n('ENTIDAD', { isStub: true }), { grado: 2 }), [{ etiqueta: 'Entrar a Lab', accion: 'entrar' }])
  assert.deepEqual(botonesDe(n('AGRUPACION'), { grado: 1 }), [{ etiqueta: 'Entrar a Lab', accion: 'entrar' }])
})
test('grado 0: sin botones', () => assert.deepEqual(botonesDe(n('ENTIDAD'), { grado: 0 }), []))
test('nunca destino', () => assert.ok(!('destino' in botonesDe(n('ENTIDAD'), { grado: 1 })[0])))
