import { test } from 'node:test'
import assert from 'node:assert/strict'
import { botonesDe } from './botones.ts'
import type { NodoGrafo, NodeType } from '../../types/vista.ts'

const n = (nodeType: NodeType, o: Partial<NodoGrafo> = {}): NodoGrafo => ({
  id: 'i', nodeType, subtipo: 's', label: 'Lab', vizParams: { shape: 's', color: '#fff' }, isStub: false, ...o,
})
const EXPANDIR = { etiqueta: 'Expandir', accion: 'expandir' }
const ENTRAR = { etiqueta: 'Entrar a Lab', accion: 'entrar' }

test('OBRA/EVENTO con secciones: Expandir y Entrar, en ese orden, con o sin descripción', () => {
  for (const t of ['OBRA', 'EVENTO'] as const) {
    assert.deepEqual(botonesDe(n(t, { descripcionBreve: 'd' }), { compone: false, secciones: 3 }), [EXPANDIR, ENTRAR])
    assert.deepEqual(botonesDe(n(t), { compone: false, secciones: 2 }), [EXPANDIR, ENTRAR]) // 20 créditos y sin descripción
  }
})
test('OBRA stub con secciones: solo Entrar (un stub no expande, D-15; sí entra si tiene algo adentro)', () =>
  assert.deepEqual(botonesDe(n('OBRA', { isStub: true, descripcionBreve: 'd' }), { compone: false, secciones: 2 }), [ENTRAR]))
test('OBRA/EVENTO sin secciones y sin compone: nada, aunque tenga descripción', () => {
  assert.deepEqual(botonesDe(n('OBRA', { descripcionBreve: 'd' }), { compone: false, secciones: 0 }), [])
  assert.deepEqual(botonesDe(n('EVENTO'), { compone: false, secciones: 0 }), [])
})
test('OBRA/EVENTO que compone algo sin secciones: Entrar, no Expandir', () =>
  assert.deepEqual(botonesDe(n('EVENTO'), { compone: true, secciones: 0 }), [ENTRAR]))
test('ENTIDAD sin ficha: sin compone ni secciones nada; con compone solo Entrar; con portfolio (secciones) Expandir y Entrar', () => {
  assert.deepEqual(botonesDe(n('ENTIDAD'), { compone: false, secciones: 0 }), [])
  assert.deepEqual(botonesDe(n('ENTIDAD'), { compone: true, secciones: 0 }), [ENTRAR])
  assert.deepEqual(botonesDe(n('ENTIDAD'), { compone: false, secciones: 2 }), [EXPANDIR, ENTRAR]) // Sello Rojo: portfolio y sin About
})
test('ENTIDAD stub: nunca Expandir, ni con portfolio; Entrar si compone', () => {
  assert.deepEqual(botonesDe(n('ENTIDAD', { isStub: true }), { compone: true, secciones: 0 }), [ENTRAR])
  assert.deepEqual(botonesDe(n('ENTIDAD', { isStub: true }), { compone: false, secciones: 2 }), [ENTRAR])
})
test('ENTIDAD con ficha: Expandir primero, aun sin secciones; luego Entrar (D-48, D-36)', () => {
  assert.deepEqual(botonesDe(n('ENTIDAD', { ficha: true }), { compone: false, secciones: 3 }), [EXPANDIR, ENTRAR])
  assert.deepEqual(botonesDe(n('ENTIDAD', { ficha: true }), { compone: false, secciones: 0 }), [EXPANDIR])
})
test('con ficha: un stub y una AGRUPACION nunca expanden (D-15, D-48)', () => {
  assert.deepEqual(botonesDe(n('ENTIDAD', { ficha: true, isStub: true }), { compone: false, secciones: 0 }), [])
  assert.deepEqual(botonesDe(n('OBRA', { ficha: true, isStub: true }), { compone: false, secciones: 2 }), [ENTRAR])
  assert.deepEqual(botonesDe(n('AGRUPACION', { ficha: true }), { compone: true, secciones: 0 }), [ENTRAR])
})
test('OBRA/EVENTO con ficha y sin secciones: Expandir (el riesgo de D-33, cerrado); con secciones y sin ficha, como siempre', () => {
  for (const t of ['OBRA', 'EVENTO'] as const) {
    assert.deepEqual(botonesDe(n(t, { ficha: true }), { compone: false, secciones: 0 }), [EXPANDIR])
    assert.deepEqual(botonesDe(n(t), { compone: false, secciones: 2 }), [EXPANDIR, ENTRAR])
  }
})
test('AGRUPACION: compone → Entrar; un área sin miembros no; nunca Expandir', () => {
  assert.deepEqual(botonesDe(n('AGRUPACION'), { compone: true, secciones: 0 }), [ENTRAR])
  assert.deepEqual(botonesDe(n('AGRUPACION'), { compone: false, secciones: 0 }), [])
})
test('nunca destino', () => assert.ok(!('destino' in botonesDe(n('ENTIDAD'), { compone: true, secciones: 0 })[0])))
