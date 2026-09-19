import { resolveTHREE } from './threeGlobal.js';
const THREE = resolveTHREE();
import {ThreeObject}  from './ThreeObject.js';

export class LinkThreeObject extends ThreeObject  {

    static type = 'SinLink';
    start;
    end;
    segments = 30;

    constructor (node, config){
        super(node);

        this.start = node.start || null;
        this.end = node.end || null;

        // ponytail: pre-alocar con segments+1 puntos (mismo conteo que animate() escribe
        // cada frame) para que setFromPoints() reuse el buffer en vez de excederlo
        const initialPoints = Array.from({ length: this.segments + 1 }, () => new THREE.Vector3(0, 0, 0));
        const geometry = new THREE.BufferGeometry().setFromPoints(initialPoints);
        const material = new THREE.LineBasicMaterial({ color: 0xff44ff, linewidth: 20, opacity: 0.8, transparent: true });

        this.mesh = new THREE.Line(geometry, material);
    }

    setPosition(start, end) {
        this.start = start;
        this.end = end;
    }

    animate(){
        super.animate();
        if (!this.start || !this.end) return;

        const startVec = new THREE.Vector3(this.start.x, this.start.y, this.start.z);
        const endVec = new THREE.Vector3(this.end.x, this.end.y, this.end.z);

        const amplitude = 5;
        const frequency = 4;
        const segments = this.segments;
        const speed = 1;
        const time = performance.now() * 0.001;

        const direction = new THREE.Vector3().subVectors(endVec, startVec).normalize();
        let up = new THREE.Vector3(0, 1, 0);
        if (Math.abs(direction.dot(up)) > 0.99) up = new THREE.Vector3(1, 0, 0);
        const perpendicular = new THREE.Vector3().crossVectors(direction, up).normalize();
        
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = new THREE.Vector3().lerpVectors(startVec, endVec, t);
            // ponytail: la onda viajera por sí sola no vale 0 en t=0/t=1 (depende de `time`),
            // así que el link "flota" lejos de la posición real del nodo en vez de tocarla —
            // se veía como líneas alineadas en grilla en vez de conectar cada nodo disperso
            // (root cause de "los links estan raros", 03-06). El envelope sin(t*PI) fija los
            // extremos en start/end exactos y sólo deja ondular el medio del link.
            const envelope = Math.sin(t * Math.PI);
            const offset = Math.sin(t * Math.PI * frequency + time * speed) * amplitude * envelope;
            point.addScaledVector(perpendicular, offset);
            points.push(point);
        }

        // Actualiza la geometría de la línea
        this.mesh.geometry.setFromPoints(points);
        this.mesh.geometry.attributes.position.needsUpdate = true;
        if (this.mesh.geometry.attributes.position.addUpdateRange) {
            this.mesh.geometry.attributes.position.addUpdateRange(0, this.mesh.geometry.attributes.position.count);
        }
        return true;
    }

}

