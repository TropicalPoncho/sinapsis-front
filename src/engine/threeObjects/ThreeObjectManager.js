import { ThreeObject } from "./ThreeObject.js";


export class ThreeObjectManager {

    static ThreeObjectsTypes;
    static defaultType = 'Lines';

    static animationTypes = [
        'All','Hover'
    ];
    
    animationType = ThreeObjectManager.animationTypes[0]; 
    objectToAnimate;

    /**
     * The ThreeObjectFactory class is responsible for creating and managing instances of Three.js objects.
     * It allows for the creation of objects of different types and provides a way to animate these objects.
     * 
     * @example
     * const factory = new ThreeObjectFactory();
     * 
     * // Create a Three.js object
     * const object = factory.createObject({ type: 'Cube' });
     * 
     * // Animate the objects
     * factory.animate();
     */
    constructor(properties){
        Object.assign(this, properties);
        
        if(!ThreeObjectManager.animationTypes.includes(this.animationType)){
            throw new Error(`The Animation type is not valid.`);
        }
        if(!ThreeObjectManager.defaultType){
            throw new Error(`There is no default type defined, define one!`);
        }
        
    }
    
    static registerType(type, classReference, isDefault = false) {
        if (!ThreeObjectManager.ThreeObjectsTypes) {
            ThreeObjectManager.ThreeObjectsTypes = {};
        }
        
        ThreeObjectManager.ThreeObjectsTypes[type] = classReference;
        
        if(isDefault){
            if(!ThreeObjectManager.defaultType){
                ThreeObjectManager.defaultType = type;
            }else{
                throw new Error(`There can be only 1 defaultType: ${ThreeObjectManager.defaultType}`);
            }
        }
    }

    static getTypes() {
        return ThreeObjectManager.ThreeObjectsTypes;
    }

    /**
     * Keeps track of all instances of objects created.
     */
    _objectInstances = {};

    /**
     * Creates a Three.js object of the specified type.
     * 
     * @param {Object} node - The node data.
     * @param {string} node.type - The type of the Three.js object to create.
     * @returns {Object} - The created Three.js object.
     * @throws {TypeError} - If the specified type is not a string or is empty.
     * @throws {Error} - If the specified type is invalid.
     */
    createObject(node){
        let type = node.type ?? ThreeObjectManager.defaultType; //if type not defined, i get first //TODO: define a default type
        if (typeof type !== 'string' || type.trim() === '' ) {
            throw new TypeError(`Invalid type parameter: ${type} ${node.id}`);
        }
        const ThreeObjectClass = ThreeObjectManager.ThreeObjectsTypes[type];
        if (!ThreeObjectClass) {
            throw new Error(`Invalid ThreeObject Class type: ${type}`);
        }
        try {
/*             if (!this._objectInstances[type]) {
                this._objectInstances[type] = []; //Initialize instances for this object
            } */
            let objectInstance = new ThreeObjectClass(node);
            this._objectInstances[node.id] = objectInstance;
            if (objectInstance.type === "SinLink") {
                return objectInstance;
            }
            return objectInstance.mesh;
        } catch (error) {
            console.error(error);
          // Handle error during instantiation
        }
    }

    /**
     * Executes animation for each object created.
     */
    animate() {
        //Asks if the animation type is "All" so it animates all objects, if not, it animates the one selected
        if(this.animationType == ThreeObjectManager.animationTypes[0]){
            Object.values(this._objectInstances).forEach((objectInstance) => {
                // Solo animar si no es un link (los links se animan separadamente)
                if (objectInstance.type !== "SinLink") {
                    objectInstance.animate();
                }
            });
        }else{
            if(this.objectToAnimate && this._objectInstances[this.objectToAnimate]) {
                this._objectInstances[this.objectToAnimate].animate();
            }
        }
        
    }

    animateLinks(){
        // Recorre todas las instancias y anima solo las que sean de tipo "SinLink" (link)
        Object.values(this._objectInstances).forEach((objectInstance) => {
            if (objectInstance.type === "SinLink") {
                objectInstance.animate();
            }
        });
    }

    /**
     * Libera recursos de objetos Three.js que ya no se usan
     * @param {Array} nodeIdsToKeep - Array de IDs de nodos a mantener
     */
    disposeUnusedObjects(nodeIdsToKeep = []) {
        const idsToKeep = new Set(nodeIdsToKeep);
        const idsToRemove = [];

        // Identificar objetos a eliminar
        Object.keys(this._objectInstances).forEach(id => {
            if (!idsToKeep.has(id)) {
                idsToRemove.push(id);
            }
        });

        // Disponer y eliminar objetos
        idsToRemove.forEach(id => {
            const objectInstance = this._objectInstances[id];
            if (objectInstance) {
                // Disponer geometría y material si existen
                if (objectInstance.mesh) {
                    this._disposeMesh(objectInstance.mesh);
                }
                ThreeObjectManager._disposeTexturasDeInstancia(objectInstance);
                delete this._objectInstances[id];
            }
        });
    }

    /**
     * Libera recursivamente un mesh y sus hijos
     * @private
     */
    _disposeMesh(mesh) {
        if (!mesh) return;

        // Disponer hijos recursivamente
        if (mesh.children && mesh.children.length > 0) {
            mesh.children.forEach(child => this._disposeMesh(child));
        }

        // El geometryCache es estático y compartido entre instancias: disponer acá la geometría de
        // un nodo que sale de escena rompería a todos los que quedan usando la misma clave.
        // Materiales y texturas sí son por instancia y se disponen siempre.
        // ponytail: el cache no se libera nunca — son ~15 geometrías, techo constante. Si algún día
        // las claves dependen de datos del nodo (tamaño por nodo), acá va un refcount.
        if (mesh.geometry && !ThreeObjectManager._esGeometriaCompartida(mesh.geometry)) {
            mesh.geometry.dispose();
        }

        // Disponer material(es)
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(material => this._disposeMaterial(material));
            } else {
                this._disposeMaterial(mesh.material);
            }
        }
    }

    /**
     * @private
     */
    static _esGeometriaCompartida(geometry) {
        for (const g of ThreeObject.geometryCache.values()) if (g === geometry) return true;
        return false;
    }

    /**
     * Texturas que la instancia guarda en sus propios uniforms (Marble las inyecta al shader por
     * onBeforeCompile): no cuelgan del material, así que _disposeMaterial no las ve. Fuga vista
     * en el checklist 03-06 #10: 800 -> 12 nodos dejaba ~250 texturas en GPU.
     * @private
     */
    static _disposeTexturasDeInstancia(instancia) {
        for (const grupo of [instancia.uniforms, instancia.localUniforms]) {
            Object.values(grupo ?? {}).forEach(u => {
                if (u?.value?.isTexture) u.value.dispose();
            });
        }
    }

    /**
     * Libera un material y sus texturas
     * @private
     */
    _disposeMaterial(material) {
        if (!material) return;

        // Disponer texturas
        Object.keys(material).forEach(prop => {
            if (material[prop] && material[prop].isTexture) {
                material[prop].dispose();
            }
        });

        // Los ShaderMaterial guardan sus texturas en uniforms, no como propiedades del material
        // (fuga vista en el checklist 03-06 #10: 458 -> 257 texturas tras liberar 800 nodos).
        Object.values(material.uniforms ?? {}).forEach(u => {
            if (u?.value?.isTexture) u.value.dispose();
        });

        material.dispose();
    }

    /**
     * Limpia todos los objetos
     */
    disposeAll() {
        Object.values(this._objectInstances).forEach(objectInstance => {
            if (objectInstance.mesh) {
                this._disposeMesh(objectInstance.mesh);
            }
            ThreeObjectManager._disposeTexturasDeInstancia(objectInstance);
        });
        this._objectInstances = {};
    }
}
