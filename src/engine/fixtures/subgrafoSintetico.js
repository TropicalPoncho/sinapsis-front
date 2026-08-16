// Subgrafo sintético de N nodos para PERF-01: la medición necesita un tamaño arbitrario,
// no los 12 nodos curados de subgrafoDemo.js. Misma forma de Subgrafo (src/types/vista.ts).
// ponytail: generador de una función, no un builder de fixtures — PERF-01 es el único consumidor.
import '../threeObjects/registerTypes.js';        // efecto: registra los tipos, de ahí sale FORMAS
import { ThreeObjectManager } from '../threeObjects/ThreeObjectManager.js';

// Thumbs reales de public/obras/: las texturas son la parte cara del render y no pueden
// faltar de la medición (RESEARCH.md, "PERF-01 measurement").
const THUMBS_IMAGEN = ['obras/nudo.png', 'obras/espora.png', 'obras/wip.png'];

export function subgrafoSintetico(n, { proporcionImagen = 0.2 } = {}) {
    const formas = Object.keys(ThreeObjectManager.getTypes()).filter((t) => t !== 'SinLink' && t !== 'Image');
    const nImagenes = Math.round(n * proporcionImagen);

    const nodos = Array.from({ length: n }, (_, i) => {
        const esImagen = i < nImagenes;
        const shape = esImagen ? 'Image' : formas[i % formas.length];
        const nodo = {
            id: `sint-${i}`,
            nodeType: 'OBRA',
            subtipo: 'sintetico',
            label: `Sintético ${i}`,
            vizParams: { shape, color: '#8AE2C8' },
            isStub: false,
        };
        if (esImagen) nodo.thumb = THUMBS_IMAGEN[i % THUMBS_IMAGEN.length];
        return nodo;
    });

    // Encadenado (n-1 vínculos) para que el grafo quede conexo, más vínculos extra
    // deterministas hasta llegar a n*1.5 — así las fuerzas se comportan como en el caso real
    // (un grafo con componentes sueltas no reheatea igual que uno conexo).
    const vinculos = [];
    for (let i = 1; i < n; i++) {
        vinculos.push({ id: `sint-v${i}`, origen: `sint-${i - 1}`, destino: `sint-${i}`, tipoVinculo: 'COLABORO_EN' });
    }
    const objetivo = Math.round(n * 1.5);
    for (let i = 0; vinculos.length < objetivo && i < n; i++) {
        const destino = (i + Math.floor(n / 2)) % n;
        if (destino === i) continue;
        vinculos.push({ id: `sint-x${i}`, origen: `sint-${i}`, destino: `sint-${destino}`, tipoVinculo: 'COLABORO_EN' });
    }

    return { nodos, vinculos };
}
