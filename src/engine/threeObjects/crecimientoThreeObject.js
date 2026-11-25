// La estructura que crece con el tiempo (D-52, D-53) COMO NEURONA: el nodo del evento se dibuja con esto en vez de una esfera. Es un
// ThreeObject más (tipo 'Crecimiento'): su Group lo coloca three-forcegraph donde el layout puso al nodo, y UN `LineSegments` con la
// geometría armada de una vez, ordenada por nacimiento, y un `drawRange` hasta el paso actual — una sola llamada de dibujo sin importar
// cuánto haya crecido. El segmento que está naciendo se interpola por la fracción del paso: las puntas crecen continuo.
//
// Dos modos, de la misma familia de algoritmo (lo decide el adaptador desde la Vista, no este archivo):
//   'completo'  la red del propio evento: la estructura grande (disco con espesor, miles de segmentos) ES la neurona; las dos raíces son
//               nodos reales anclados al núcleo (ver SinapsisEngine._anclarCrecimiento).
//   'mini'      el nodo visto desde afuera: ~400 segmentos en una esfera irregular, mismo avance en el tiempo (proporcional a pasos(t)).
// En ambos la forma sale de src/lib/crecimiento (módulo puro, sin THREE) y nunca cambia por cuadro: solo cuánto se revela.
//
// Seleccionable sin pagar dibujo: una esfera invisible (BackSide) envuelve la estructura. BackSide a propósito: el raycaster elige el
// punto más cercano, y con la cara de afuera la esfera grande le ganaría a las dos raíces que viven adentro; con la de atrás, un clic
// sobre una raíz le da a la raíz y un clic en el resto de la estructura le da al evento. Las líneas no se raycastean (miles de segmentos).
import { resolveTHREE } from './threeGlobal.js';
const THREE = resolveTHREE();
import { ThreeObject } from './ThreeObject.js';
import { CRECIMIENTO_SETTINGS } from '../graph/constants.js';
import { estructuraDe, segmentosHasta, PASOS_MINI } from '../../lib/crecimiento/estructura.ts';

// ponytail: opacidad a ojo contra el fondo negro; aditivo porque nunca hay fondo claro. Si el fondo cambia, esta línea.
const OPACIDAD = { completo: 0.6, mini: 0.85 };
// radio mayor de la estructura completa en unidades normalizadas (semieje x del elipsoide): para colorear y para el blanco del raycast
const RADIO_NORMALIZADO = 1.25;

export class CrecimientoThreeObject extends ThreeObject {
    static type = 'Crecimiento';

    constructor(node) {
        super(node);
        this.config = node.crecimiento;
        this.completo = node.crecimientoModo === 'completo';
        const e = estructuraDe(this.config, this.completo ? 'grande' : 'mini');
        this.estructura = e;
        this.total = e.a.length; // segmentos reales (los puentes incluidos)
        this.pasos = 0;
        const escala = this.completo ? CRECIMIENTO_SETTINGS.escalaCompleta : CRECIMIENTO_SETTINGS.escalaMini;

        const pos = new Float32Array(6 * this.total);
        const col = new Float32Array(6 * this.total);
        const [colorA, colorB] = node.coloresRaices ?? [node.color ?? '#ffffff', node.color ?? '#ffffff'];
        const cA = new THREE.Color(colorA), cB = new THREE.Color(colorB), c = new THREE.Color();
        for (let s = 0; s < this.total; s++) {
            for (const [k, v] of [[0, e.a[s]], [1, e.b[s]]]) {
                const o = 6 * s + 3 * k;
                pos.set(e.pos.subarray(3 * v, 3 * v + 3), o);
                // degradé a lo largo del eje entre las raíces: la de x<0 con el color de la primera, la de x>0 con el de la segunda
                c.copy(cA).lerp(cB, Math.min(1, Math.max(0, (e.pos[3 * v] / RADIO_NORMALIZADO + 1) / 2)));
                col.set([c.r, c.g, c.b], o);
            }
        }
        this.geometria = new THREE.BufferGeometry();
        this._pos = new THREE.BufferAttribute(pos, 3);
        this.geometria.setAttribute('position', this._pos);
        this.geometria.setAttribute('color', new THREE.BufferAttribute(col, 3));
        this.geometria.setDrawRange(0, 0);
        this.material = new THREE.LineBasicMaterial({
            vertexColors: true, transparent: true, opacity: OPACIDAD[this.completo ? 'completo' : 'mini'], blending: THREE.AdditiveBlending, depthWrite: false,
        });
        this.lineas = new THREE.LineSegments(this.geometria, this.material);
        this.lineas.scale.setScalar(escala);
        this.lineas.frustumCulled = false; // la caja de la geometría no sigue al drawRange ni a la escala
        this.lineas.raycast = () => {};
        this.mesh.add(this.lineas);

        // Blanco de raycast: invisible (no se dibuja), BackSide, que envuelve la estructura.
        const esfera = ThreeObject.getSharedGeometry('hitbox-crecimiento', () => new THREE.SphereGeometry(1, 16, 12));
        const hit = new THREE.Mesh(esfera, new THREE.MeshBasicMaterial({ side: THREE.BackSide }));
        hit.visible = false;
        hit.scale.setScalar((this.completo ? RADIO_NORMALIZADO + 0.1 : 1.3) * escala);
        this.mesh.add(hit);

        this._crece = -1; // índice del segmento cuyo extremo está a medio camino, o -1
        this._k = -1;
        this._f = -1;
    }

    // `pasos` son los de la estructura grande, con fracción (pasosEn); la mini avanza en proporción: PASOS_MINI * pasos / n.
    actualizar(pasos) {
        const e = this.estructura;
        const p = Math.min(this.completo ? pasos : (PASOS_MINI * pasos) / this.config.n, e.pasos);
        this.pasos = p;
        const k = Math.floor(p), f = p - k;
        if (k === this._k && f === this._f) return;
        const { a, b } = e, buf = this._pos.array;
        this._pos.clearUpdateRanges();
        const completos = segmentosHasta(e, k); // segmentos con paso <= k: los puentes de ingreso nacen con su paso
        // el que venía a medio camino se completa (si el tiempo retrocedió, el slider, vuelve a su lugar de todos modos)
        if (this._crece >= 0 && this._crece !== completos) this._escribirExtremo(this._crece);
        if (f > 0 && completos < this.total) {
            const A0 = 3 * a[completos], B0 = 3 * b[completos], P = e.pos;
            const o = 6 * completos + 3;
            buf[o] = P[A0] + f * (P[B0] - P[A0]); buf[o + 1] = P[A0 + 1] + f * (P[B0 + 1] - P[A0 + 1]); buf[o + 2] = P[A0 + 2] + f * (P[B0 + 2] - P[A0 + 2]);
            this._pos.addUpdateRange(o, 3);
            this._crece = completos;
        } else this._crece = -1;
        this.geometria.setDrawRange(0, 2 * completos + (this._crece >= 0 ? 2 : 0));
        this._pos.needsUpdate = true;
        this._k = k; this._f = f;
    }

    _escribirExtremo(s) {
        const v = this.estructura.b[s], o = 6 * s + 3;
        this._pos.array.set(this.estructura.pos.subarray(3 * v, 3 * v + 3), o);
        this._pos.addUpdateRange(o, 3);
    }
}
