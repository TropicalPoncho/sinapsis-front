import { resolveTHREE } from './threeGlobal.js';
const THREE = resolveTHREE();
import {ThreeObject}  from './ThreeObject.js';
import { noiseFS } from '../shaders/noise.js';
import { frecuenciasDeColor } from './colorUtils.js';

// 0.009 / 0.05 (speed calibrado a mano de este shader / speed compartido de viz_params).
const VELOCIDAD_RELATIVA = 0.18;

export class LightsThreeObject extends ThreeObject  {

    static type = 'Lights';

    constructor (node, config){
        super(node);
        // Estos shaders se calibraron a mano con speed 0.009; el 0.05 compartido los deja ~5x más
        // rápidos. El factor mantiene el multiplicador global (panel de debug) funcionando.
        this.speed *= VELOCIDAD_RELATIVA;

        // colorR/colorG/colorB fijos (.9/0/.8) para todos los nodos: son la frecuencia de un
        // pnoise() por canal, no un color literal, pero igual definían el mismo resultado visual
        // siempre — ahora salen del color curado (frecuenciasDeColor).
        const { colorR, colorG, colorB } = frecuenciasDeColor(node.color);
        this.localUniforms = {
            weight: { type: "f", value: 3 },
            colorR: { type: "f", value: colorR },
            colorG: { type: "f", value: colorG },
            colorB: { type: "f", value: colorB },
            colorChange: { type: "f", value: 2},
        };

        if(node.style){
            $.extend(this.localUniforms, node.style);
        }

        // Antes 0.009 hardcodeado acá pisaba lo que ya había puesto `super(node)` desde
        // node.speed (viz_params.speed) — el nodo nunca podía tener su propia velocidad.

        const material = new THREE.ShaderMaterial( {
            uniforms: { ...this.localUniforms, ...this.globalUniforms, ...this.uniforms },
            vertexShader: `
                ${noiseFS}
                varying vec3 vNormal;
                uniform float time;
                uniform float weight;

                void main() {

                    float f = weight * pnoise( normal + time, vec3( 10.0 ) );
                    vNormal = normal;
                    vec4 pos = vec4( position + f * normal, 1.0 );
                    gl_Position = projectionMatrix * modelViewMatrix * pos;

                }
            `,
            fragmentShader: `	
                ${noiseFS}
                varying vec3 vNormal;
                uniform sampler2D tShine;
                uniform float time;
                uniform float colorR;
                uniform float colorG;
                uniform float colorB;
                uniform float colorChange;
                
                float PI = 3.14159265358979323846264;
            
                void main() {
            
                    float r = ( pnoise( colorR * ( vNormal + time ), vec3( 10.0 ) ) );
                    float g = ( pnoise( colorG * ( vNormal + time ), vec3( 10.0 ) ) );
                    float b = ( pnoise( colorB * ( vNormal + time ), vec3( 10.0 ) ) );
            
                    float n = pnoise( colorChange * ( vNormal + time ), vec3( 10.0 ) );
                    n = pow( .001, n );
            
                    //float n = 10.0 * pnoise( 5.0 * ( vNormal + time ), vec3( 10.0 ) ) * pnoise( .5 * ( vNormal + time ), vec3( 10.0 ) );
            
                    //n += .5 * pnoise( 4.0 * vNormal, vec3( 10.0 ) );
                    vec3 color = vec3( r + n, g + n, b + n );
                    gl_FragColor = vec4( color, 1.0 );
            
                } `
        } );

        // create a sphere and assign the material
        const detail = Math.max(1, Math.min(3, this.segmentWidth || 1));
        const geometryKey = `lights-${this.size}-${detail}`;
        const geometry = ThreeObject.getSharedGeometry(geometryKey, () => new THREE.IcosahedronGeometry(this.size, detail));

        this.mesh.add(new THREE.Mesh(geometry, material));
        
    }

    animate(){
        super.animate();
    }

}

