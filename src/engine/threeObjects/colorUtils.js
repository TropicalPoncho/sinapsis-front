import { resolveTHREE } from './threeGlobal.js';
const THREE = resolveTHREE();

// Varias formas (Marble, Perlin, Twist, Lights, Wave Line) tenían su paleta hardcodeada en el
// constructor, ignorando por completo `node.color` (viz_params.color, ya variado por nodo desde
// el importer) — por eso se veían todas iguales sin importar el color curado. Estos dos helpers
// derivan lo que cada shape necesita a partir de ese único color, en un solo lugar.

// Par claro/oscuro del mismo color: para paletas tipo colorA/colorB (Marble) o color1/color2
// (Perlin) que mezclan dos tonos.
export function parDeTonos(colorBase) {
    const base = new THREE.Color(colorBase ?? 0xffffff);
    return {
        claro: base.clone().offsetHSL(0, 0, 0.22),
        oscuro: base.clone().offsetHSL(0, 0, -0.22),
    };
}

// Lights/WaveLineThreeObject no mezclan un color final: cada canal RGB entra como frecuencia de
// un pnoise() independiente (colorR/colorG/colorB). Mapear los canales del color curado a ese
// rango mantiene la lógica original pero ligada al nodo en vez de fija para todos.
export function frecuenciasDeColor(colorBase) {
    const c = new THREE.Color(colorBase ?? 0xffffff);
    return { colorR: 0.3 + c.r * 1.2, colorG: 0.3 + c.g * 1.2, colorB: 0.3 + c.b * 1.2 };
}
