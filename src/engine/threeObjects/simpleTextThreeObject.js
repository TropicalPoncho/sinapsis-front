import {ThreeObject}  from "./ThreeObject.js";
import SpriteText from 'three-spritetext';

export class SimpleTextThreeObject extends ThreeObject  {

    static type = 'SimpleText';

    constructor (node, config){
        super(node, false);

        const sprite = new SpriteText(node.name);
        sprite.material.depthWrite = false; // make sprite background transparent
        sprite.color = node.color;
        // ponytail: node.val no lo define nadie (adaptador/fixtures): con undefined el canvas del
        // sprite quedaba de 0x0 y WebGL tiraba warnings de textura vacía. 10 = default de three-spritetext.
        sprite.textHeight = node.val ?? 10;
                
        this.mesh.add(sprite);
        
        return this;
    }
}

