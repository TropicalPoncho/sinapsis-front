// La estructura que crece con el tiempo (D-52), dibujada: UN `LineSegments` con la geometría armada de una vez, ordenada por
// nacimiento, y un `drawRange` hasta el paso actual — una sola llamada de dibujo, sin importar cuánto haya crecido. El segmento
// que está naciendo se interpola por la fracción del paso: las puntas crecen continuo en vez de a saltos de varios minutos.
//
// No es un tipo de nodo del ThreeObjectManager (no representa un nodo): lo posee el motor y vive en la escena mientras la Vista
// tenga a los dos nodos de los que nace. Vanilla, sin React; la forma sale de src/lib/crecimiento (módulo puro, sin THREE).
//
// La forma es invariante (coordenadas normalizadas, raíces en x = -1 y x = +1); la colocación sigue al layout: `actualizar` la
// traslada al punto medio de los dos nodos reales, la escala por la mitad de su distancia y alinea x con la recta que los une.
import { resolveTHREE } from './threeGlobal.js';
const THREE = resolveTHREE();
import { estructuraDe } from '../../lib/crecimiento/estructura.ts';

// ponytail: opacidad a ojo contra el fondo negro; aditivo porque nunca hay fondo claro. Si el fondo cambia, esta línea.
const OPACIDAD = 0.6;

export class CrecimientoObject {
    constructor(config, colorA, colorB) {
        const e = estructuraDe(config);
        this.estructura = e;
        this.total = e.a.length; // segmentos reales: puede ser menos que config.n si la estructura se agota antes
        const pos = new Float32Array(6 * this.total);
        const col = new Float32Array(6 * this.total);
        const cA = new THREE.Color(colorA), cB = new THREE.Color(colorB), c = new THREE.Color();
        for (let s = 0; s < this.total; s++) {
            for (const [k, v] of [[0, e.a[s]], [1, e.b[s]]]) {
                const o = 6 * s + 3 * k;
                pos.set(e.pos.subarray(3 * v, 3 * v + 3), o);
                // degradé a lo largo del eje entre las raíces: la de x=-1 con el color de A, la de x=+1 con el de B
                c.copy(cA).lerp(cB, Math.min(1, Math.max(0, (e.pos[3 * v] + 1) / 2)));
                col.set([c.r, c.g, c.b], o);
            }
        }
        this.geometria = new THREE.BufferGeometry();
        this._pos = new THREE.BufferAttribute(pos, 3);
        this.geometria.setAttribute('position', this._pos);
        this.geometria.setAttribute('color', new THREE.BufferAttribute(col, 3));
        this.geometria.setDrawRange(0, 0);
        this.material = new THREE.LineBasicMaterial({
            vertexColors: true, transparent: true, opacity: OPACIDAD, blending: THREE.AdditiveBlending, depthWrite: false,
        });
        this.lineas = new THREE.LineSegments(this.geometria, this.material);
        this.lineas.frustumCulled = false; // la caja de la geometría no sigue a la matriz que le pone la colocación
        this.lineas.matrixAutoUpdate = false;
        this._crece = -1; // índice del segmento cuyo extremo está a medio camino, o -1
        this._k = -1;
        this._f = -1;
        this._x = new THREE.Vector3(); this._y = new THREE.Vector3(); this._z = new THREE.Vector3(); this._m = new THREE.Vector3();
        this.pasos = 0;
    }

    // `pasos`: lo que ya creció, con fracción (pasosEn). A y B: los nodos del layout (x, y, z) de los que nace.
    actualizar(pasos, A, B) {
        const ex = B.x - A.x, ey = B.y - A.y, ez = B.z - A.z;
        const D = Math.sqrt(ex * ex + ey * ey + ez * ez);
        if (!(D > 1e-6)) { this.lineas.visible = false; return; }
        // Base: x a lo largo de la recta; z lo más cerca del +Z del mundo (de cara a la cámara de entrada, así el disco se lee como
        // disco y no de canto); y completa la mano derecha. Sin trigonometría: proyecciones y un producto cruz.
        const x = this._x.set(ex / D, ey / D, ez / D);
        const z = this._z.set(-x.x * x.z, -x.y * x.z, 1 - x.z * x.z);
        if (z.lengthSq() < 1e-6) z.set(-x.x * x.y, 1 - x.y * x.y, -x.z * x.y); // la recta apunta casi a Z: se usa Y
        z.normalize();
        const y = this._y.crossVectors(z, x);
        const s = D / 2;
        this.lineas.matrix.makeBasis(x.multiplyScalar(s), y.multiplyScalar(s), z.multiplyScalar(s));
        this.lineas.matrix.setPosition((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
        this.lineas.matrixWorldNeedsUpdate = true;
        this.lineas.visible = true;

        const p = Math.min(pasos, this.total);
        const k = Math.floor(p), f = p - k;
        this.pasos = p;
        if (k === this._k && f === this._f) return;
        const { a, b } = this.estructura, buf = this._pos.array;
        this._pos.clearUpdateRanges();
        // el que venía a medio camino se completa (si el tiempo retrocedió, el slider, vuelve a su lugar de todos modos)
        if (this._crece >= 0 && this._crece !== k) this._escribirExtremo(this._crece, 1);
        if (f > 0 && k < this.total) {
            const A0 = 3 * a[k], B0 = 3 * b[k], P = this.estructura.pos;
            const o = 6 * k + 3;
            buf[o] = P[A0] + f * (P[B0] - P[A0]); buf[o + 1] = P[A0 + 1] + f * (P[B0 + 1] - P[A0 + 1]); buf[o + 2] = P[A0 + 2] + f * (P[B0 + 2] - P[A0 + 2]);
            this._pos.addUpdateRange(o, 3);
            this._crece = k;
        } else this._crece = -1;
        this.geometria.setDrawRange(0, 2 * k + (this._crece >= 0 ? 2 : 0));
        this._pos.needsUpdate = true;
        this._k = k; this._f = f;
    }

    _escribirExtremo(s, extremo) {
        const v = extremo ? this.estructura.b[s] : this.estructura.a[s], o = 6 * s + 3 * extremo;
        this._pos.array.set(this.estructura.pos.subarray(3 * v, 3 * v + 3), o);
        this._pos.addUpdateRange(o, 3);
    }

    dispose() {
        this.geometria.dispose();
        this.material.dispose();
        this.lineas.removeFromParent();
    }
}
