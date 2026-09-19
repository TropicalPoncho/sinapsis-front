// Subgrafo sintético de N nodos para PERF-01: la medición necesita un tamaño arbitrario,
// no los 12 nodos curados de subgrafoDemo.js. Misma forma de Subgrafo (src/types/vista.ts).
// ponytail: generador de una función, no un builder de fixtures — PERF-01 es el único consumidor.
import '../threeObjects/registerTypes.js';        // efecto: registra los tipos, de ahí sale FORMAS
import { ThreeObjectManager } from '../threeObjects/ThreeObjectManager.js';

// Thumbs reales de public/obras/: las texturas son la parte cara del render y no pueden
// faltar de la medición (RESEARCH.md, "PERF-01 measurement").
const THUMBS_IMAGEN = ['obras/nudo.png', 'obras/espora.png', 'obras/wip.png'];

export function subgrafoSintetico(n, { proporcionImagen = 0.2, topologia = 'cadena', enlacesPorNodo = 1.5 } = {}) {
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

    const vinculos = [];
    if (topologia === 'hubs') {
        // Apego preferencial (tipo Barabási–Albert), determinista: cada nodo nuevo se conecta a
        // ~enlacesPorNodo nodos ya existentes elegidos en proporción a su grado — así aparecen
        // hubs con muchas relaciones y la red queda interconectada, no en cinta.
        let semilla = 12345;
        const azar = () => ((semilla = (semilla * 1664525 + 1013904223) >>> 0) / 2 ** 32);
        const urna = [0]; // cada extremo de arista se agrega: elegir de acá pesa por grado
        for (let i = 1; i < n; i++) {
            const k = Math.min(i, Math.floor(enlacesPorNodo) + (azar() < enlacesPorNodo % 1 ? 1 : 0));
            const destinos = new Set();
            while (destinos.size < k) destinos.add(urna[Math.floor(azar() * urna.length)]);
            for (const d of destinos) {
                vinculos.push({ id: `sint-h${i}-${d}`, origen: `sint-${i}`, destino: `sint-${d}`, tipoVinculo: 'COLABORO_EN' });
                urna.push(i, d);
            }
            if (!destinos.size) urna.push(i);
        }
        return { nodos, vinculos };
    }

    // Encadenado (n-1 vínculos) para que el grafo quede conexo, más vínculos extra
    // deterministas hasta llegar a n*1.5 — así las fuerzas se comportan como en el caso real
    // (un grafo con componentes sueltas no reheatea igual que uno conexo).
    for (let i = 1; i < n; i++) {
        vinculos.push({ id: `sint-v${i}`, origen: `sint-${i - 1}`, destino: `sint-${i}`, tipoVinculo: 'COLABORO_EN' });
    }
    const objetivo = Math.round(n * enlacesPorNodo);
    for (let i = 0; vinculos.length < objetivo && i < n; i++) {
        const destino = (i + Math.floor(n / 2)) % n;
        if (destino === i) continue;
        vinculos.push({ id: `sint-x${i}`, origen: `sint-${i}`, destino: `sint-${destino}`, tipoVinculo: 'COLABORO_EN' });
    }

    return { nodos, vinculos };
}
