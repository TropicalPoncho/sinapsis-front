import { resolveTHREE } from '../threeObjects/threeGlobal.js';
const THREE = resolveTHREE();

// Parámetros de la onda de un link — se pasan por link para poder personalizarlos
// (amplitude/frequency/speed) sin tocar el algoritmo.
export const ONDA_DEFAULT = { amplitude: 5, frequency: 4, speed: 1, segments: 30 };

const dir = new THREE.Vector3();
const perp = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);

// Escribe la onda dentro de la línea DEFAULT de la librería (su objeto/material), en vez de
// reemplazar el mesh. Extremos fijos en start/end por el envelope sin(t*PI).
export function escribirOnda(line, start, end, params = ONDA_DEFAULT) {
    const { amplitude, frequency, speed, segments } = { ...ONDA_DEFAULT, ...params };
    const n = segments + 1;
    let pos = line.geometry.getAttribute('position');
    if (!pos || pos.count !== n) {
        line.geometry.setAttribute('position', pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    }
    dir.set(end.x - start.x, end.y - start.y, end.z - start.z).normalize();
    perp.crossVectors(dir, Math.abs(dir.dot(UP)) > 0.99 ? RIGHT : UP).normalize();
    const time = performance.now() * 0.001;
    for (let i = 0; i < n; i++) {
        const t = i / segments;
        const off = Math.sin(t * Math.PI * frequency + time * speed) * amplitude * Math.sin(t * Math.PI);
        pos.setXYZ(
            i,
            start.x + (end.x - start.x) * t + perp.x * off,
            start.y + (end.y - start.y) * t + perp.y * off,
            start.z + (end.z - start.z) * t + perp.z * off
        );
    }
    pos.needsUpdate = true;
    line.geometry.computeBoundingSphere();
}
