import { resolveTHREE } from './threeGlobal.js';
const THREE = resolveTHREE();
import {ThreeObject}  from "./ThreeObject.js";

function randomPointOnSphere(radius) {
	return new THREE.Vector3().setFromSphericalCoords(
		radius,
		Math.acos(2 * Math.random() - 1),
		2 * Math.PI * Math.random()
	);
}

export class CrossedLinesThreeObject extends ThreeObject {

    static type = 'CrossedLines';

    constructor (node, config){
        super(node);
        // Antes 40 hardcodeado, ignorando this.size (15, la base que usan el resto de las formas)
        // — por eso se veía más grande que sus vecinos sin ningún curado real detrás (nada asigna
        // node.radius todavía).
        const radius = node.radius ?? this.size;
        this.radius = radius;
        const lineCount = node.lineCount ?? 70;
        const positions = new Float32Array(lineCount * 2 * 3);

        for (let i = 0; i < lineCount; i++) {
            const start = randomPointOnSphere(radius);
            const end = randomPointOnSphere(radius);
            const offset = i * 6;

            positions[offset] = start.x;
            positions[offset + 1] = start.y;
            positions[offset + 2] = start.z;

            positions[offset + 3] = end.x;
            positions[offset + 4] = end.y;
            positions[offset + 5] = end.z;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
			color: node.color ?? 0xffffff,
			transparent: true,
			opacity: node.opacity ?? 0.6,
			blending: THREE.AdditiveBlending,
			depthTest: true
		});

        const group = new THREE.Group();
        group.add(new THREE.LineSegments(geometry, material));
        this.mesh = group;
    }

    // Antes no animaba nada (sin shader propio, `time` no lo tocaba nadie). Misma estructura que
    // el resto: `super.animate()` avanza `globalUniforms.time` según speed/multiplicador
    // compartidos, acá lo uso para rotar el grupo entero en vez de un uniform de shader.
    animate(){
        super.animate();
        const t = this.globalUniforms.time.value;
        this.mesh.rotation.y = t * 0.5;
        this.mesh.rotation.x = t * 0.2;
    }

}
