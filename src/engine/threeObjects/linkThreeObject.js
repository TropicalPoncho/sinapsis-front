import { resolveTHREE } from './threeGlobal.js';
const THREE = resolveTHREE();
import {ThreeObject}  from './ThreeObject.js';
import { escribirOnda } from '../graph/ondaLink.js';

// Link custom: un THREE.Line propio (material, forma y onda por link). La geometría la escribe
// `setPosition`, llamado desde `linkPositionUpdate` en el tick de la librería — un solo
// conductor, sin loop de animación propio que pueda desfasarse de las posiciones de los nodos.
export class LinkThreeObject extends ThreeObject  {

    static type = 'SinLink';

    constructor (node, config){
        super(node);
        this.onda = node.onda; // {amplitude, frequency, speed, segments}, opcional por link
        const material = new THREE.LineBasicMaterial({ color: 0xff44ff, opacity: 0.8, transparent: true });
        this.mesh = new THREE.Line(new THREE.BufferGeometry(), material);
    }

    setPosition(start, end) {
        escribirOnda(this.mesh, start, end, this.onda);
    }

}
