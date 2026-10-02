import { resolveTHREE } from '../threeObjects/threeGlobal.js';
const THREE = resolveTHREE();
import Utils from '../Utils.js';

// Fondo de la escena, heredado de collectiveConscience (src/client/graph/background.js: color de
// fondo + estrellas + una montaña de ruido comentada, renderizada como grilla de líneas sin
// textura ni material sólido). Acá va reescrito y reconectado — el archivo viejo vivía en este
// mismo repo pero nunca lo importaba nadie.
// ponytail: heightmap bajado de 1024x1024 a 128x128 (~64x menos iteraciones de ruido y ~64x menos
// vértices en la grilla) — la red de Sinápsis es mucho más chica que la escena original y un
// decorado de fondo no necesita esa resolución; si algún día se ve "poligonoso" de cerca, subir
// MUNDO_LADO.
const ESTRELLAS = 4000;
const RADIO_ESTRELLAS_MIN = 600;
const RADIO_ESTRELLAS_MAX = 1400;
const MUNDO_LADO = 128;
const MONTANA_TAMANO = 2200;
const MONTANA_INTENSIDAD = 5;
// El pico más alto de la montaña nunca queda por encima de esta Y, sea cual sea el ruido que
// haya tocado en esta corrida (alturas[i] sale de un Uint8Array, 0-255, así que el pico real
// varía). Un offset fijo (como antes, -500) no alcanza: con intensidad 5 un pico de 255 sube
// 1275 unidades y atraviesa la red, que vive mucho más arriba. Bien por debajo de donde el
// layout de fuerzas suele extenderse (nodeSize 25, linkDistance ~140-200).
const MONTANA_TECHO = -350;

export class Background {
    constructor(scene) {
        this.scene = scene;
        this.objetos = [];
        if (!scene) return;

        scene.background = new THREE.Color(0x111111);
        this._agregarEstrellas();
        this._agregarMontana();
    }

    _agregarEstrellas() {
        const posiciones = new Float32Array(ESTRELLAS * 3);
        for (let i = 0; i < ESTRELLAS; i++) {
            const r = RADIO_ESTRELLAS_MIN + Math.random() * (RADIO_ESTRELLAS_MAX - RADIO_ESTRELLAS_MIN);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            posiciones[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            posiciones[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            posiciones[i * 3 + 2] = r * Math.cos(phi);
        }
        const geometria = new THREE.BufferGeometry();
        geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
        const estrellas = new THREE.Points(geometria, new THREE.PointsMaterial({
            color: 0x8AE2C8, size: 5, sizeAttenuation: true, transparent: true, opacity: 0.8,
        }));
        this.scene.add(estrellas);
        this.objetos.push(estrellas);
    }

    // La "mesh con forma de montaña sin textura": PlaneGeometry desplazado por un heightmap de
    // ruido (Utils.generateHeight, mismo algoritmo que collectiveConscience), dibujado como
    // WireframeGeometry — nunca tuvo un material con color sólido ni mapa de textura, sólo líneas.
    _agregarMontana() {
        const geometria = new THREE.PlaneGeometry(MONTANA_TAMANO, MONTANA_TAMANO, MUNDO_LADO - 1, MUNDO_LADO - 1);
        geometria.rotateX(-Math.PI / 2);
        const alturas = Utils.generateHeight(MUNDO_LADO, MUNDO_LADO);
        const vertices = geometria.attributes.position.array;
        let picoMaximo = 0;
        for (let i = 0, j = 0; i < alturas.length; i++, j += 3) {
            const y = alturas[i] * MONTANA_INTENSIDAD;
            vertices[j + 1] = y;
            if (y > picoMaximo) picoMaximo = y;
        }
        const wireframe = new THREE.WireframeGeometry(geometria);
        const linea = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({
            color: 0x578CCB, transparent: true, opacity: 0.25, depthTest: true,
        }));
        // Desplaza el mesh entero hacia abajo lo justo para que ni el pico más alto de esta
        // corrida pase de MONTANA_TECHO — no un offset fijo adivinado.
        linea.position.y = MONTANA_TECHO - picoMaximo;
        this.scene.add(linea);
        this.objetos.push(linea);
        // La PlaneGeometry sin rotar/desplazar ya no hace falta una vez armado el wireframe.
        geometria.dispose();
    }

    destruir() {
        for (const o of this.objetos) {
            this.scene?.remove(o);
            o.geometry?.dispose();
            o.material?.dispose();
        }
        this.objetos = [];
    }
}
