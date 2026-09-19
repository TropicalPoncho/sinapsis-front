import { resolveTHREE } from './threeGlobal.js';
const THREE = resolveTHREE();
import {ThreeObject}  from './ThreeObject.js';

// ponytail: versión anterior cargaba una textura HDR desde una URL de GitHub (página web, no
// host de archivos crudos) — el load nunca resolvía, el callback de éxito nunca corría, y el
// nodo quedaba invisible para siempre (root cause de 03-06, "Ana Hagen"/cluster-a sin mesh).
// Además usaba `MeshPhysicalNodeMaterial` sin importar y `this` roto dentro del callback (no
// arrow function). Esfera síncrona con material estándar, mismo patrón que MarbleThreeObject.
export class NoiseThreeObject extends ThreeObject  {

    static type = 'Noise';

    constructor (node, config){
        super(node);

        const widthSegments = Math.max(8, Math.min(32, this.segmentWidth || 16));
        const heightSegments = Math.max(6, Math.min(24, this.segmentHeight || 12));
        const geometryKey = `noise-${this.size}-${widthSegments}-${heightSegments}`;
        const geometry = ThreeObject.getSharedGeometry(geometryKey, () => new THREE.SphereGeometry(
            this.size,
            widthSegments,
            heightSegments
        ));

        const material = new THREE.MeshStandardMaterial({ color: node.color ?? 0xffffff, roughness: 0.6 });

        this.mesh.add(new THREE.Mesh(geometry, material));
    }

}
