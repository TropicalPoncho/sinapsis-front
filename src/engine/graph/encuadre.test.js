import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { centroAreaSegura, offsetDeAreaSegura, distanciaParaEncuadrar } from './encuadre.js'

describe('centroAreaSegura', () => {
    test('escritorio: panel 62% izquierdo (1440x686)', () => {
        const c = centroAreaSegura({ top: 0, right: 0, bottom: 0, left: 892.8 }, 1440, 686)
        assert.equal(c.x, 1166.4)
        assert.equal(c.y, 343)
    })
})

describe('offsetDeAreaSegura', () => {
    test('escritorio (1440x686, panel izquierdo 62%)', () => {
        const o = offsetDeAreaSegura({ top: 0, right: 0, bottom: 0, left: 892.8 }, 1440, 686)
        // 1166.4 no tiene representación binaria exacta; tolerancia de punto flotante.
        assert.ok(Math.abs(o.x - -446.4) < 1e-9, `esperaba -446.4, dio ${o.x}`)
        assert.equal(o.y, 0)
    })

    test('mobile (390x844, panel tapa 60% inferior)', () => {
        const o = offsetDeAreaSegura({ top: 0, right: 0, bottom: 506.4, left: 0 }, 390, 844)
        assert.equal(o.x, 0)
        assert.equal(o.y, 253.2)
    })

    test('área segura vacía (sin overlays)', () => {
        const o = offsetDeAreaSegura({ top: 0, right: 0, bottom: 0, left: 0 }, 1440, 686)
        assert.equal(o.x, 0)
        assert.equal(o.y, 0)
    })
})

describe('distanciaParaEncuadrar', () => {
    test('escritorio: nodo Image entra entero en el área segura', () => {
        const d = distanciaParaEncuadrar(26.25, 547.2, 686, 686, 70)
        assert.ok(Math.abs(d - 52.2) < 0.5, `esperaba ~52.2, dio ${d}`)
    })

    test('duplicar el radio duplica la distancia', () => {
        const d1 = distanciaParaEncuadrar(26.25, 547.2, 686, 686, 70)
        const d2 = distanciaParaEncuadrar(52.5, 547.2, 686, 686, 70)
        assert.ok(Math.abs(d2 - 2 * d1) < 0.001)
    })

    test('achicar el lado limitante aumenta la distancia', () => {
        const dAncho = distanciaParaEncuadrar(26.25, 547.2, 686, 686, 70)
        const dAngosto = distanciaParaEncuadrar(26.25, 200, 686, 686, 70)
        assert.ok(dAngosto > dAncho)
    })

    test('el lado limitante es min(rectW, rectH)', () => {
        const a = distanciaParaEncuadrar(26.25, 200, 5000, 686, 70)
        const b = distanciaParaEncuadrar(26.25, 200, 200, 686, 70)
        assert.ok(Math.abs(a - b) < 0.001)
    })
})
