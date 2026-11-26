// dendrita-v2 (D-52, D-53): colonización del espacio (Runions et al., 2007) en 3D, con el trazo de una neurona dibujada a lápiz: núcleo
// denso, pocos caminos dominantes con laterales cortas, dendritas finas y sinuosas, axones largos sobre el eje que une a las fundadoras.
//
// CONGELADO desde que se publique (inicio 2026-11-25). Esto es una versión: la estructura de cada sitio es f(semilla, esta versión,
// paso, entradas de las raíces). Tocar una línea, una constante o el orden de un bucle cambia la trayectoria de todos; un ajuste es
// dendrita-v3 y esta queda como está. El test de oro (crecimiento.test.ts) rompe si el resultado cambia sin subir la versión.
// (v1 nunca se publicó: se reemplazó por esta antes del primer día, por eso no queda en el repo.)
// v2 se editó el 2026-11-26 (quick 261126-owv) y NO se creó v3 porque v2 todavía no estaba publicada: Ryzomatica no estaba en Neon.
// Desde que se importe, cualquier cambio es dendrita-v3.
//
// Qué es v2 hoy:
// (1) cada decisión saca su aleatoriedad de azar(semilla, canal, k), sin estado compartido: agregar una raíz tardía no desfasa ningún
//     paso anterior a su ingreso;
// (2) sin puentes: ningún segmento recto entre raíces, ni las fundadoras (pegadas al núcleo) ni las tardías. Cada raíz es un vértice
//     suelto en su punto y se une a lo demás solo por crecimiento; una tardía trae su nube de atractores y crece desde su ingreso;
// (3) caminos dominantes por vigor con crédito: cada vértice acumula su vigor como crédito por ronda en que lo atraen y crece al llegar
//     a 1. El hijo hereda el vigor de su padre y el padre se atrofia al crecer, así la punta de un camino sigue plena y las laterales
//     que brotan después salen débiles y quedan cortas. Las raíces no se atrofian: son el soma y cada hijo suyo es una dendrita primaria;
// (4) atracción incremental: cada atractor recuerda su nodo elegible más cercano y se actualiza al nacer un vértice, en vez de buscarlo
//     de nuevo en cada ronda (el vigor multiplica las rondas; sin esto la generación duplicaba su tiempo);
// (5) un perfil `mini` de un solo soma en el origen (~400 pasos, misma familia) con el que se dibuja el nodo visto desde afuera;
// (6) trazo de lápiz: sesgo de los atractores al centro (núcleo denso), persistencia de dirección + curvatura con inercia (sinuoso sin
//     zigzag), pasos cortos (hilos finos) y una fila de atractores sobre el eje de las fundadoras (axones largos). Sin uniones entre ramas.
//
// Determinismo entre navegadores: la lógica de decisión solo usa `+ - * /`, `Math.sqrt` (exacto por IEEE 754), comparaciones y
// enteros; aleatoriedad por hash entero; ni Math.random ni sin/cos/exp/pow. Un test lo verifica sobre el texto del módulo.
//
// Coordenadas normalizadas: el núcleo en el origen, las fundadoras en (-raiz,0,0) y (raiz,0,0); la estructura vive en un elipsoide
// achatado (disco con espesor) o, en `mini`, en una esfera. El motor la escala y la coloca; acá no hay mundo, solo la forma.
//
// Prefijo exacto: cada paso agrega al final y nada de lo que se decide depende de `nMax` (solo corta el bucle): generar(s, k) es el
// prefijo de generar(s, k+1) byte a byte, por eso se genera una vez a N completo y se revela hasta el paso actual. Un "paso" es un
// segmento de crecimiento, y todo segmento es un paso.
import { azar } from './prng.ts'

export const VERSION = 'dendrita-v2'

export type NombrePerfil = 'grande' | 'mini'

interface Perfil {
  radios: readonly number[]    // semiejes del elipsoide de atractores
  atractores: number
  influencia: number           // radio dentro del cual un atractor atrae al nodo más cercano
  muerte: number               // un atractor a menos de esto de un nodo se consume
  paso: number                 // largo de cada segmento
  persistencia: number         // peso de la dirección que traía la rama: serpentea en vez de zigzaguear
  sinuosidad: number           // peso del vector de curvatura (pseudoaleatorio, con inercia): lo que hace sinuoso el trazo
  inercia: number              // 0..1: cuánto de la curvatura del paso anterior sigue en este (el resto es empujón nuevo)
  sesgo: number                // 0..1: concentra los atractores hacia el centro de su cuerpo (núcleo denso, hilos ralos afuera)
  axon: number                 // atractores en fila sobre el eje que une a las fundadoras: de ahí salen los axones largos
  lado: number                 // la grilla espacial cubre [-lado, lado] en cada eje (celda = influencia)
  raiz: number                 // las fundadoras nacen en (-raiz,0,0) y (raiz,0,0): pegadas al núcleo (0 en el mini: un solo soma)
  nube: number                 // atractores que trae cada raíz que no es fundadora
  radioNube: number
  zona: readonly number[]      // semiejes de la zona donde nacen las raíces que no son fundadoras
}

const PERFILES: Record<NombrePerfil, Perfil> = {
  grande: {
    radios: [1.25, 0.9, 0.35], atractores: 12000, influencia: 0.2, muerte: 0.07, paso: 0.018, persistencia: 0.8, sinuosidad: 0.7, inercia: 0.7, sesgo: 0.8, axon: 70,
    lado: 1.6, raiz: 0.14, nube: 400, radioNube: 0.25, zona: [0.8, 0.6, 0.2],
  },
  mini: {
    radios: [1, 1, 1], atractores: 1200, influencia: 0.3, muerte: 0.1, paso: 0.045, persistencia: 0.8, sinuosidad: 0.7, inercia: 0.7, sesgo: 0.5, axon: 0,
    lado: 1.6, raiz: 0, nube: 0, radioNube: 0, zona: [0.5, 0.5, 0.5],
  },
}

// Canales de azar: cada uso tiene el suyo, así ningún flujo pisa a otro. (5, 6 y 7 eran los lóbulos del mini, que ya no existen.)
const C_ATRACTOR = 1, C_RUIDO = 2, C_RAIZ = 3, C_NUBE = 4, C_SESGO = 8, C_AXON = 9, C_VIGOR = 10
const INTENTOS = 32 // rechazo en el cubo: 0.48^32 ~ 1e-10; si se agotan, el origen (determinista)
// Vigor: al crecer, un vértice que no es raíz multiplica el suyo por ATROFIA_BASE + ATROFIA_AZAR * azar, con piso VIGOR_MIN (una lateral
// nunca se congela del todo: crece cada 1/VIGOR_MIN rondas a lo sumo).
const ATROFIA_BASE = 0.15, ATROFIA_AZAR = 0.5, VIGOR_MIN = 0.05
// Rondas seguidas con atraídos pero sin crecer que se toleran antes de dar la estructura por agotada: con vigor >= VIGOR_MIN, cualquier
// atraído llega a crédito 1 en ceil(1/VIGOR_MIN) rondas; pasado eso, no crece nadie más (garantiza que el bucle termina).
const RONDAS_VACIAS = Math.ceil(1 / VIGOR_MIN) + 1

export interface Estructura {
  version: string
  // Vértices en orden de creación: 0 y 1 son las fundadoras; una raíz tardía es un vértice más, creado al entrar. Normalizadas.
  pos: Float32Array
  // Padre de cada vértice (-1 en las raíces): un bosque, un árbol por raíz; los segmentos son exactamente sus aristas.
  padre: Int32Array
  // Segmentos en orden de nacimiento: a -> b. `paso[s] === s + 1`: el segmento s completa el paso s+1 (a.length === pasos).
  a: Uint32Array
  b: Uint32Array
  paso: Uint32Array
  // Cantidad de vértices que existen una vez completo el paso k (k = 0..pasos): un prefijo, también con raíces tardías.
  vertices: Uint32Array
  // Pasos reales: puede ser menos que `nMax` si la estructura se agota antes.
  pasos: number
  // Dónde nace cada raíz de `entradas` (3 floats por raíz), entre o no ya en el paso actual: el motor coloca ahí al nodo.
  posRaices: Float32Array
}

// Raíces que no son fundadoras: dónde nacen, una función pura de (semilla, índice).
function posicionRaiz(semilla: number, i: number, P: Perfil): [number, number, number] {
  if (i === 0) return [-P.raiz, 0, 0]
  if (i === 1) return [P.raiz, 0, 0]
  const p: [number, number, number] = [0, 0, 0]
  enEsfera(semilla, C_RAIZ, i, p)
  return [p[0] * P.zona[0], p[1] * P.zona[1], p[2] * P.zona[2]]
}

// Punto uniforme en la esfera unidad, por rechazo y sin estado: el k-ésimo del canal. Sin trigonometría ni raíz cúbica.
function enEsfera(semilla: number, canal: number, k: number, out: [number, number, number]) {
  for (let t = 0; t < INTENTOS; t++) {
    const x = 2 * azar(semilla, canal, k * 96 + 3 * t) - 1, y = 2 * azar(semilla, canal, k * 96 + 3 * t + 1) - 1, z = 2 * azar(semilla, canal, k * 96 + 3 * t + 2) - 1
    if (x * x + y * y + z * z <= 1) { out[0] = x; out[1] = y; out[2] = z; return }
  }
  out[0] = 0; out[1] = 0; out[2] = 0
}

// `entradas[i]` = paso en que entra la raíz i (0 = nace en el paso 0). Las dos primeras son las fundadoras y entran en 0. El mini se
// genera con una sola entrada, [0]: un soma en el origen.
export function generar(semilla: number, nMax: number, perfil: NombrePerfil = 'grande', entradas: readonly number[] = [0, 0]): Estructura {
  const P = PERFILES[perfil]
  const R = entradas.length
  const celda = P.influencia

  // Atractores: uniformes en el elipsoide. Los de las raíces tardías van al final y se calculan al entrar la raíz. Todo por hash: el
  // atractor i es el mismo haya o no raíces tardías.
  const M = P.atractores
  const total = M + Math.max(0, R - 2) * P.nube
  const ax = new Float64Array(total), ay = new Float64Array(total), az = new Float64Array(total)
  const q: [number, number, number] = [0, 0, 0]
  for (let i = 0; i < M; i++) {
    if (i < P.axon) { // los primeros `axon`: una fila sobre el eje x, de punta a punta, con un hilo de dispersión
      ax[i] = P.radios[0] * 0.95 * ((2 * (i + 0.5)) / P.axon - 1)
      ay[i] = 0.02 * (2 * azar(semilla, C_AXON, 2 * i) - 1); az[i] = 0.02 * (2 * azar(semilla, C_AXON, 2 * i + 1) - 1)
      continue
    }
    enEsfera(semilla, C_ATRACTOR, i, q)
    // sesgo al centro: el radio se multiplica por un número en [1-sesgo, 1]; con sesgo > 0 la densidad crece hacia el núcleo
    const s = 1 - P.sesgo + P.sesgo * azar(semilla, C_SESGO, i)
    ax[i] = q[0] * s * P.radios[0]; ay[i] = q[1] * s * P.radios[1]; az[i] = q[2] * s * P.radios[2]
  }
  // Dueño de cada atractor: -1 = del campo común; i >= 2 = de la nube de la raíz i, que solo atrae a lo que cuelga de ella (si no, la
  // estructura ya densa le gana todos los atractores y la raíz tardía no llega a ser una forma propia).
  const duenoAtr = new Int8Array(total).fill(-1)
  const vivos = new Int32Array(total)
  for (let i = 0; i < M; i++) vivos[i] = i
  let nVivos = M
  const infl2 = P.influencia * P.influencia, muerte2 = P.muerte * P.muerte
  // Atracción incremental: el nodo elegible más cercano de cada atractor dentro de `influencia` (-1 si no hay) y su distancia al cuadrado.
  // ponytail: la grilla guarda atractores y nunca saca los muertos (se saltean); el techo es ~12k atractores por estructura. Si un perfil
  // llegara a cientos de miles, compactar las celdas cada tanto.
  const cerca = new Int32Array(total).fill(-1), dc = new Float64Array(total).fill(infl2), muerto = new Uint8Array(total)

  const cap = nMax + R + 2
  const vx = new Float64Array(cap), vy = new Float64Array(cap), vz = new Float64Array(cap)
  const padre = new Int32Array(cap).fill(-1)
  const dueno = new Int8Array(cap).fill(-1) // a qué raíz tardía pertenece el vértice (hereda del padre); -1 = la estructura común
  // Estado de trazo de cada vértice (lo hereda del padre al crecer): hacia dónde iba la rama y cuánto venía curvando. Local a la rama.
  const dirX = new Float64Array(cap), dirY = new Float64Array(cap), dirZ = new Float64Array(cap)
  const curX = new Float64Array(cap), curY = new Float64Array(cap), curZ = new Float64Array(cap)
  const vigor = new Float64Array(cap), credito = new Float64Array(cap)
  const sa = new Uint32Array(cap), sb = new Uint32Array(cap), sp = new Uint32Array(cap)
  const nVert = new Uint32Array(nMax + 1)
  let nV = 0, nS = 0, nPaso = 0

  // Grilla espacial de atractores: celdas densas, cada una una lista de índices.
  const dim = Math.ceil((2 * P.lado) / celda) + 1
  const celdas: number[][] = Array.from({ length: dim * dim * dim }, () => [])
  const ci = (v: number) => Math.min(dim - 1, Math.max(0, Math.floor((v + P.lado) / celda)))
  const insertar = (a: number) => { celdas[(ci(ax[a]) * dim + ci(ay[a])) * dim + ci(az[a])].push(a) }
  for (let i = 0; i < M; i++) insertar(i)

  const sumX = new Float64Array(cap), sumY = new Float64Array(cap), sumZ = new Float64Array(cap), cuenta = new Uint32Array(cap)
  // Un vértice nuevo hereda el vigor de su padre (las raíces nacen con 1) y pasa a ser el más cercano de los atractores vivos y elegibles
  // de las 27 celdas vecinas que tenga más cerca que el que tenían.
  const nuevoVertice = (x: number, y: number, z: number, p: number, d: number) => {
    vx[nV] = x; vy[nV] = y; vz[nV] = z; padre[nV] = p; dueno[nV] = d
    sumX[nV] = 0; sumY[nV] = 0; sumZ[nV] = 0; cuenta[nV] = 0
    vigor[nV] = p >= 0 ? vigor[p] : 1; credito[nV] = 0
    const cx = ci(x), cy = ci(y), cz = ci(z)
    for (let u = Math.max(0, cx - 1); u <= Math.min(dim - 1, cx + 1); u++) for (let v = Math.max(0, cy - 1); v <= Math.min(dim - 1, cy + 1); v++) for (let t = Math.max(0, cz - 1); t <= Math.min(dim - 1, cz + 1); t++) {
      const lista = celdas[(u * dim + v) * dim + t]
      for (let m = 0; m < lista.length; m++) {
        const i = lista[m]
        if (muerto[i] || (duenoAtr[i] >= 0 && duenoAtr[i] !== d)) continue
        const dx = ax[i] - x, dy = ay[i] - y, dz = az[i] - z
        const dd = dx * dx + dy * dy + dz * dz
        if (dd < dc[i]) { dc[i] = dd; cerca[i] = nV }
      }
    }
    return nV++
  }

  // Raíces: entran cuando el paso llega a su entrada (las de entrada 0, antes del primer paso).
  const entro = new Uint8Array(R), raizV = new Int32Array(R).fill(-1)
  const posRaices = new Float32Array(3 * R)
  for (let i = 0; i < R; i++) { const p = posicionRaiz(semilla, i, P); posRaices[3 * i] = p[0]; posRaices[3 * i + 1] = p[1]; posRaices[3 * i + 2] = p[2] }

  // Entra la raíz i: un vértice suelto en su punto (padre -1, sin segmento recto a nada: se une a la estructura solo por crecimiento) y,
  // si no es fundadora, su nube de atractores, cuyo único nodo elegible es la raíz recién creada. Devuelve dónde empiezan en `vivos`.
  const entrar = (i: number): number => {
    entro[i] = 1
    const x = posRaices[3 * i], y = posRaices[3 * i + 1], z = posRaices[3 * i + 2]
    const r = nuevoVertice(x, y, z, -1, i >= 2 ? i : -1)
    raizV[i] = r
    nVert[nPaso] = nV
    const desde = nVivos
    if (i >= 2) {
      for (let m = 0; m < P.nube; m++) {
        const a = M + (i - 2) * P.nube + m
        enEsfera(semilla, C_NUBE, i * 1024 + m, q)
        ax[a] = x + q[0] * P.radioNube; ay[a] = y + q[1] * P.radioNube; az[a] = z + q[2] * P.radioNube * 0.5
        duenoAtr[a] = i
        insertar(a)
        const dx = ax[a] - x, dy = ay[a] - y, dz = az[a] - z, dd = dx * dx + dy * dy + dz * dz
        if (dd < dc[a]) { dc[a] = dd; cerca[a] = r }
        vivos[nVivos++] = a
      }
    }
    return desde
  }
  for (let i = 0; i < R; i++) if (entradas[i] <= 0) entrar(i)

  // 1. cada atractor vivo (desde `desde` en `vivos`) mira su nodo más cercano: si está muy cerca se consume; si no, lo atrae
  const atraer = (desde: number) => {
    let w = desde
    for (let n = desde; n < nVivos; n++) {
      const i = vivos[n], j = cerca[i]
      if (j >= 0 && dc[i] < muerte2) { muerto[i] = 1; continue } // consumido
      vivos[w++] = i
      if (j >= 0) {
        const d = Math.sqrt(dc[i])
        sumX[j] += (ax[i] - vx[j]) / d; sumY[j] += (ay[i] - vy[j]) / d; sumZ[j] += (az[i] - vz[j]) / d
        cuenta[j]++
      }
    }
    nVivos = w
  }

  // 2. un nodo atraído crece un paso: hacia el promedio de sus atractores, con la inercia de la dirección que traía y una curvatura que
  // sigue de un paso al siguiente (trazo sinuoso, sin zigzag). El empujón nuevo sale de (semilla, paso), de nadie más. El hijo hereda
  // el vigor; el padre, si no es raíz, se atrofia (lo que brote de él después será una lateral débil).
  const crecer = (j: number): boolean => {
    if (cuenta[j] === 0) return false
    const c = cuenta[j], k = 4 * nPaso, r = 1 - P.inercia
    const qx = P.inercia * curX[j] + r * (2 * azar(semilla, C_RUIDO, k) - 1)
    const qy = P.inercia * curY[j] + r * (2 * azar(semilla, C_RUIDO, k + 1) - 1)
    const qz = P.inercia * curZ[j] + r * (2 * azar(semilla, C_RUIDO, k + 2) - 1)
    const dx = sumX[j] / c + P.persistencia * dirX[j] + P.sinuosidad * qx
    const dy = sumY[j] / c + P.persistencia * dirY[j] + P.sinuosidad * qy
    const dz = sumZ[j] / c + P.persistencia * dirZ[j] + P.sinuosidad * qz
    const largo = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (largo < 1e-12) return false
    const ux = dx / largo, uy = dy / largo, uz = dz / largo
    const n = nuevoVertice(vx[j] + P.paso * ux, vy[j] + P.paso * uy, vz[j] + P.paso * uz, j, dueno[j])
    dirX[n] = ux; dirY[n] = uy; dirZ[n] = uz; curX[n] = qx; curY[n] = qy; curZ[n] = qz
    if (padre[j] >= 0) {
      const v = vigor[j] * (ATROFIA_BASE + ATROFIA_AZAR * azar(semilla, C_VIGOR, nPaso))
      vigor[j] = v > VIGOR_MIN ? v : VIGOR_MIN
    }
    sa[nS] = j; sb[nS] = n; sp[nS] = nPaso + 1; nS++; nPaso++; nVert[nPaso] = nV
    return true
  }
  // un nodo atraído suma su vigor al crédito; con crédito 1 crece y lo paga
  const avanzar = (j: number): boolean => {
    credito[j] += vigor[j]
    if (credito[j] >= 1 && crecer(j)) { credito[j] -= 1; return true }
    return false
  }

  let vacias = 0
  while (nPaso < nMax) {
    const V0 = nV
    sumX.fill(0, 0, V0); sumY.fill(0, 0, V0); sumZ.fill(0, 0, V0); cuenta.fill(0, 0, V0)
    atraer(0)
    let crecio = false, atraidos = false
    for (let j = 0; j < V0 && nPaso < nMax; j++) {
      // una raíz que entra ahora crece ya, en este mismo paso (con sus atractores y los vecinos que la vean)
      for (let i = 0; i < R; i++) {
        if (entro[i] || entradas[i] > nPaso) continue
        const desde = entrar(i)
        atraer(desde)
        if (cuenta[raizV[i]] > 0) { atraidos = true; if (avanzar(raizV[i])) crecio = true }
        if (nPaso >= nMax) break
      }
      if (nPaso < nMax && cuenta[j] > 0) { atraidos = true; if (avanzar(j)) crecio = true }
    }
    if (crecio) { vacias = 0; continue }
    // con atraídos, una ronda sin crecer solo acumula crédito; agotada = sin atraídos, o RONDAS_VACIAS seguidas sin crecer
    if (atraidos && ++vacias < RONDAS_VACIAS) continue
    vacias = 0
    // estructura agotada: las raíces que faltan entran ahora (su entrada pedía un paso que no existe) y siguen; si no falta ninguna, fin
    let alguna = false
    for (let i = 0; i < R; i++) if (!entro[i]) { entrar(i); alguna = true }
    if (!alguna) break
  }

  const pos = new Float32Array(nV * 3)
  for (let i = 0; i < nV; i++) { pos[3 * i] = vx[i]; pos[3 * i + 1] = vy[i]; pos[3 * i + 2] = vz[i] }
  return { version: VERSION, pos, padre: padre.slice(0, nV), a: sa.slice(0, nS), b: sb.slice(0, nS), paso: sp.slice(0, nS), vertices: nVert.slice(0, nPaso + 1), pasos: nPaso, posRaices }
}
