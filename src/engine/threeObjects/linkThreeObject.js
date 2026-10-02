import { resolveTHREE } from './threeGlobal.js';
const THREE = resolveTHREE();
import {ThreeObject}  from './ThreeObject.js';
import { escribirOnda } from '../graph/ondaLink.js';
import { colorDeVinculo } from '../../lib/red/coloresVinculo.ts';

// Link custom: un THREE.Line propio (material, forma y onda por link). La geometría la escribe
// `setPosition`, llamado desde `linkPositionUpdate` en el tick de la librería — un solo
// conductor, sin loop de animación propio que pueda desfasarse de las posiciones de los nodos.
export class LinkThreeObject extends ThreeObject  {

    static type = 'SinLink';

    constructor (node, config){
        super(node);
        this.onda = node.onda; // {amplitude, frequency, speed, segments}, opcional por link
        // Puente virtual (resolverVista/puentesDe, ver src/types/vista.ts): no es un vínculo
        // curado, se dibuja punteado y más tenue para no confundirlo con uno real.
        this.virtual = !!node.virtual;
        const color = new THREE.Color(colorDeVinculo(node.tipoVinculo));
        const material = this.virtual
            ? new THREE.LineDashedMaterial({ color, opacity: 0.45, transparent: true, dashSize: 3, gapSize: 2 })
            : new THREE.LineBasicMaterial({ color, opacity: 0.8, transparent: true });
        this.mesh = new THREE.Line(new THREE.BufferGeometry(), material);
    }

    setPosition(start, end) {
        escribirOnda(this.mesh, start, end, this.onda);
        if (this.virtual) this.mesh.computeLineDistances();
    }

}
