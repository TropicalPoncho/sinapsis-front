import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
    centroAreaSegura, offsetDeAreaSegura, distanciaParaEncuadrar,
    centroide, ladoDestino, posicionCamaraParaFoco, elegirLadoOrbit,
} from './encuadre.js'

const AREA_DESKTOP = { top: 0, right: 0, bottom: 0, left: 892.8 } // 1440x686
const AREA_MOBILE = { top: 0, right: 0, bottom: 506.4, left: 0 }  // 390x844

const DISTANCIA = Math.hypot(50, 90) // 102.9563...
const AZIMUT = Math.atan2(50, 90)    // 0.50737...
const tol = (a, b, t = 0.01) => Math.abs(a - b) < t

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

describe('centroide', () => {
    test('excluye al nodo enfocado del promedio', () => {
        const nodos = [{ id: 'n1', x: 0, y: 0, z: 0 }, { id: 'n2', x: 10, y: 0, z: 0 }]
        assert.deepEqual(centroide(nodos, 'n1'), { x: 10, y: 0, z: 0 })
    })

    test('nodo aislado (único elemento excluido) devuelve null', () => {
        assert.equal(centroide([{ id: 'n1', x: 0, y: 0, z: 0 }], 'n1'), null)
    })
})

describe('ladoDestino', () => {
    test('escritorio: área segura a la derecha', () => {
        const l = ladoDestino(AREA_DESKTOP, 1440, 686)
        assert.ok(tol(l.x, 1) && tol(l.y, 0))
    })

    test('mobile: área segura arriba', () => {
        const l = ladoDestino(AREA_MOBILE, 390, 844)
        assert.ok(tol(l.x, 0) && tol(l.y, -1))
    })
})

describe('posicionCamaraParaFoco', () => {
    test('reproduce el encuadre calibrado de aimAtNode (nodo en el origen, signo der)', () => {
        const { pos, lookAt } = posicionCamaraParaFoco({ x: 0, y: 0, z: 0 }, 1, DISTANCIA, AZIMUT)
        assert.ok(tol(pos.x, 50) && tol(pos.y, 0) && tol(pos.z, 90))
        assert.deepEqual(lookAt, { x: 0, y: 0, z: 0 })
    })

    test('signo izq espeja en X', () => {
        const { pos } = posicionCamaraParaFoco({ x: 0, y: 0, z: 0 }, -1, DISTANCIA, AZIMUT)
        assert.ok(tol(pos.x, -50) && tol(pos.y, 0) && tol(pos.z, 90))
    })

    test('nodo fuera del origen, signo izq', () => {
        const { pos, lookAt } = posicionCamaraParaFoco({ x: 10, y: 20, z: 30 }, -1, DISTANCIA, AZIMUT)
        assert.ok(tol(pos.x, -40) && tol(pos.y, 20) && tol(pos.z, 120))
        assert.deepEqual(lookAt, { x: 10, y: 20, z: 30 })
    })
})

describe('elegirLadoOrbit', () => {
    const nodoOrigen = { id: 'foco', x: 0, y: 0, z: 0 }

    test('sin vecinos devuelve el default histórico (der)', () => {
        const lado = elegirLadoOrbit(nodoOrigen, [nodoOrigen], AREA_DESKTOP, 1440, 686, DISTANCIA, AZIMUT)
        assert.equal(lado, 1)
    })

    test('nodo aislado (mismo caso que sin vecinos)', () => {
        const lado = elegirLadoOrbit(nodoOrigen, [nodoOrigen], AREA_DESKTOP, 1440, 686, DISTANCIA, AZIMUT)
        assert.equal(lado, 1)
    })

    test('un solo vecino delante del nodo: elige el signo que aleja el vecino del panel', () => {
        const nodos = [nodoOrigen, { id: 'v1', x: 0, y: 0, z: 100 }]
        const lado = elegirLadoOrbit(nodoOrigen, nodos, AREA_DESKTOP, 1440, 686, DISTANCIA, AZIMUT)
        assert.equal(lado, -1)
    })

    test('centroide detrás del nodo', () => {
        const nodos = [nodoOrigen, { id: 'v1', x: 0, y: 0, z: -100 }]
        const lado = elegirLadoOrbit(nodoOrigen, nodos, AREA_DESKTOP, 1440, 686, DISTANCIA, AZIMUT)
        assert.equal(lado, 1)
    })

    test('empate exacto se desempata de forma determinista (der)', () => {
        const nodos = [nodoOrigen, { id: 'v1', x: 100, y: 0, z: 0 }]
        const lado = elegirLadoOrbit(nodoOrigen, nodos, AREA_DESKTOP, 1440, 686, DISTANCIA, AZIMUT)
        assert.equal(lado, 1)
    })

    test('mobile: objetivo vertical, los dos candidatos empatan siempre (der)', () => {
        const nodos = [nodoOrigen, { id: 'v1', x: 0, y: 0, z: 100 }]
        const lado = elegirLadoOrbit(nodoOrigen, nodos, AREA_MOBILE, 390, 844, DISTANCIA, AZIMUT)
        assert.equal(lado, 1)
    })
})
