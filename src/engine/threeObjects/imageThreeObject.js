import { resolveTHREE } from './threeGlobal.js';
const THREE = resolveTHREE();
import {ThreeObject}  from "./ThreeObject.js";
import { GLOBAL_DEFAULT_SETTINGS } from '../graph/constants.js';

// Un nodo mide ~50 unidades en pantalla: una textura de 1920 px (wip.png) pesa ~15 MB decodificada,
// y con 40 nodos cargados el tab del celular se quedaba sin memoria (UAT 04-07, G-06).
// ponytail: tope fijo de 512 px por lado, escalado en canvas al cargar; si algún día un nodo
// ocupa toda la pantalla a distancia de enfoque en un display denso, subir o servir miniaturas (R2).
const MAX_TEXTURA = 512;
function reducir(img) {
    const mayor = Math.max(img.width, img.height);
    if (!mayor || mayor <= MAX_TEXTURA) return img;
    const k = MAX_TEXTURA / mayor;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * k);
    canvas.height = Math.round(img.height * k);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
}

export class ImageThreeObject extends ThreeObject  {

    static type = 'Image';
    imgSize = GLOBAL_DEFAULT_SETTINGS.imgSize;

    constructor (node, config){
        super(node, false);

        // Calcula el tamaño de la imagen en base al nodeSize
        const getImageSize = (node, factor = 1) => {
            const size = node.nodeSize || GLOBAL_DEFAULT_SETTINGS.nodeSize || 20;
            return [size * factor, size * factor];
        };

        // node.img llega ya resuelto desde adaptador.js a partir de `thumb` (clave relativa
        // bajo public/, p.ej. "obras/nudo.png"), no bajo una carpeta "images/".
        const imgTexture = new THREE.TextureLoader().load(node.img, () => {
            imgTexture.colorSpace = THREE.SRGBColorSpace;
            const material = new THREE.SpriteMaterial({map: imgTexture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 });
            const sprite = new THREE.Sprite(material);

            // Usa el tamaño calculado en vez de imgSize
            const imgSize = Array.isArray(node.imgSize)
                ? node.imgSize
                : getImageSize(node, 2.1); // factor 1 = igual que el nodo

            // Respeta la relación de aspecto de la imagen: el lado mayor mide lo calculado y el otro
            // se achica en proporción (logos horizontales como Post.xno o Sello Rojo, flyers verticales).
            const { width, height } = imgTexture.image;
            const lado = Math.max(imgSize[0], imgSize[1]);
            const aspecto = width && height ? width / height : 1;
            sprite.scale.set(aspecto >= 1 ? lado : lado * aspecto, aspecto >= 1 ? lado / aspecto : lado);
            
            this.mesh.add(sprite);
            return this;
        },
        undefined,
        (err) => { console.error('Error cargando imagen', err); }
        );
    }
}


