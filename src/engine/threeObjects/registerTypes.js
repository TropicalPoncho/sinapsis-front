// ponytail: registro explícito en lugar del glob dinámico de Vite (webpack/turbopack no lo
// implementan). Al agregar un tipo nuevo se agrega una línea acá — mismo costo que antes, visible.
// El ThreeObject "Like Fire" queda fuera a propósito: declara `type` de instancia, no `static type`,
// así que tampoco se registraba en collectiveConscience, y su valor colisionaría con PerlinThreeObject.
import { ThreeObjectManager } from './ThreeObjectManager.js';
import { CrossedLinesThreeObject } from './crossedLinesThreeObject.js';
import { FireThreeObject } from './fireThreeObject.js';
import { ImageThreeObject } from './imageThreeObject.js';
import { LightsThreeObject } from './lightsThreeObject.js';
import { LinesThreeObject } from './linesThreeObject.js';
import { LinkThreeObject } from './linkThreeObject.js';
import { MarbleThreeObject } from './marbleThreeObject.js';
import { NoiseThreeObject } from './noiseThreeObject.js';
import { ParticlesThreeObject } from './particlesThreeObject.js';
import { PerlinNoiseThreeObject } from './perlinNoiseThreeObject.js';
import { PerlinThreeObject } from './perlinThreeObject.js';
import { SimpleTextThreeObject } from './simpleTextThreeObject.js';
import { TextThreeObject } from './textThreeObject.js';
import { TwistThreeObject } from './twistThreeObject.js';
import { WaveLineThreeObject } from './waveLineThreeObject.js';

const types = [
    CrossedLinesThreeObject, FireThreeObject, ImageThreeObject, LightsThreeObject,
    LinesThreeObject, LinkThreeObject, MarbleThreeObject, NoiseThreeObject,
    ParticlesThreeObject, PerlinNoiseThreeObject, PerlinThreeObject,
    SimpleTextThreeObject, TextThreeObject, TwistThreeObject, WaveLineThreeObject,
];

for (const ExportedClass of types) {
    if (ExportedClass && ExportedClass.type) {
        ThreeObjectManager.registerType(ExportedClass.type, ExportedClass);
    }
}
