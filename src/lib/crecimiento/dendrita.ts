// dendrita-v2 (D-52, D-53): colonización del espacio (Runions et al., 2007) en 3D, con el trazo de una neurona dibujada a lápiz: núcleo
// denso, dendritas finas y sinuosas, axones largos sobre el eje que une a las fundadoras.
//
// CONGELADO desde que se publique (inicio 2026-11-25). Esto es una versión: la estructura de cada sitio es f(semilla, esta versión,
// paso, entradas de las raíces). Tocar una línea, una constante o el orden de un bucle cambia la trayectoria de todos; un ajuste es
// dendrita-v3 y esta queda como está. El test de oro (crecimiento.test.ts) rompe si el resultado cambia sin subir la versión.
// (v1 nunca se publicó: se reemplazó por esta antes del primer día, por eso no queda en el repo.) v2 se editó el 2026-11-26 antes de
// publicarse (Ryzomatica no estaba en Neon, quick 261126-owv); desde el import a Neon un cambio es dendrita-v3.
//
// Qué cambió respecto de v1: (1) cada decisión saca su aleatoriedad de azar(semilla, canal, k), sin estado compartido: agregar una raíz
// tardía no desfasa ningún paso anterior a su ingreso; (2) las raíces nacen pegadas al núcleo, no a los extremos, y sin ningún segmento
// recto entre ellas: se unen solo por crecimiento; (3) `raices` con paso de ingreso: una raíz que entra en el paso s es un vértice suelto
// en su punto, trae su nube de atractores y empieza a crecer en ese mismo paso; (4) un perfil `mini` de la
// misma familia (esfera irregular, ~400 pasos) con el que se dibuja el nodo cuando se lo ve desde afuera; (5) trazo de lápiz: sesgo de
// los atractores al centro (núcleo denso), persistencia de dirección + curvatura con inercia (sinuoso sin zigzag), pasos cortos (hilos
// finos) y una fila de atractores sobre el eje de las fundadoras (axones largos); (6) se quitaron las uniones entre ramas de v1: eran
// escaleras entre ramas paralelas y no están en la referencia. Cada paso es ahora una rama (un segmento de crecimiento).
//
// Determinismo entre navegadores: la lógica de decisión solo usa `+ - * /`, `Math.sqrt` (exacto por IEEE 754), comparaciones y
// enteros; aleatoriedad por hash entero; ni Math.random ni sin/cos/exp/pow. Un test lo verifica sobre el texto del módulo.
//
// Coordenadas normalizadas: el núcleo en el origen, las fundadoras en (-raiz,0,0) y (raiz,0,0); la estructura vive en un elipsoide
// achatado (disco con espesor) o, en `mini`, en una unión de esferas. El motor la escala y la coloca; acá no hay mundo, solo la forma.
//
// Prefijo exacto: cada paso agrega al final y nada de lo que se decide depende de `nMax` (solo corta el bucle): generar(s, k) es el
// prefijo de generar(s, k+1) byte a byte, por eso se genera una vez a N completo y se revela hasta el paso actual. Un "paso" es un
// segmento de crecimiento, y todo segmento es un paso.
import { azar } from './prng.ts'

export const VERSION = 'dendrita-v2'

export type NombrePerfil = 'grande' | 'mini'

interface Perfil {
  lobulos: number              // 0: elipsoide de `radios`; >0: esfera irregular, unión de tantas esferas (la irregularidad sale de la semilla)
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
  raiz: number                 // las fundadoras nacen en (-raiz,0,0) y (raiz,0,0): pegadas al núcleo
  nube: number                 // atractores que trae cada raíz que no es fundadora
  radioNube: number
  zona: readonly number[]      // semiejes de la zona donde nacen las raíces que no son fundadoras
}

const PERFILES: Record<NombrePerfil, Perfil> = {
  grande: {
    lobulos: 0, radios: [1.25, 0.9, 0.35], atractores: 12000, influencia: 0.2, muerte: 0.07, paso: 0.018, persistencia: 0.8, sinuosidad: 0.7, inercia: 0.7, sesgo: 0.8, axon: 70,
    lado: 1.6, raiz: 0.14, nube: 400, radioNube: 0.25, zona: [0.8, 0.6, 0.2],
  },
  mini: {
    lobulos: 5, radios: [1, 1, 1], atractores: 1200, influencia: 0.3, muerte: 0.1, paso: 0.045, persistencia: 0.8, sinuosidad: 0.7, inercia: 0.7, sesgo: 0.5, axon: 0,
    lado: 1.6, raiz: 0.12, nube: 0, radioNube: 0, zona: [0.5, 0.5, 0.5],
  },
}

// Canales de azar: cada uso tiene el suyo, así ningún flujo pisa a otro.
const C_ATRACTOR = 1, C_RUIDO = 2, C_RAIZ = 3, C_NUBE = 4, C_LOBULO_ELEGIR = 5, C_LOBULO_CENTRO = 6, C_LOBULO_RADIO = 7, C_SESGO = 8, C_AXON = 9
const INTENTOS = 32 // rechazo en el cubo: 0.48^32 ~ 1e-10; si se agotan, el origen (determinista)

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

// `entradas[i]` = paso en que entra la raíz i (0 = nace en el paso 0). Las dos primeras son las fundadoras y entran en 0.
export function generar(semilla: number, nMax: number, perfil: NombrePerfil = 'grande', entradas: readonly number[] = [0, 0]): Estructura {
  const P = PERFILES[perfil]
  const R = entradas.length
  const celda = P.influencia

  // Atractores: uniformes en el elipsoide, o en la unión de esferas del perfil mini. Los de las raíces tardías van al final y se
  // calculan al entrar la raíz. Todo por hash: el atractor i es el mismo haya o no raíces tardías.
  const M = P.atractores
  const total = M + Math.max(0, R - 2) * P.nube
  const ax = new Float64Array(total), ay = new Float64Array(total), az = new Float64Array(total)
  const lobulo = new Float64Array(4 * Math.max(1, P.lobulos)) // cx, cy, cz, radio de cada esfera
  const q: [number, number, number] = [0, 0, 0]
  for (let l = 0; l < P.lobulos; l++) {
    enEsfera(semilla, C_LOBULO_CENTRO, l, q)
    lobulo[4 * l] = 0.5 * q[0]; lobulo[4 * l + 1] = 0.5 * q[1]; lobulo[4 * l + 2] = 0.5 * q[2]
    lobulo[4 * l + 3] = 0.45 + 0.25 * azar(semilla, C_LOBULO_RADIO, l)
  }
  for (let i = 0; i < M; i++) {
    if (i < P.axon) { // los primeros `axon`: una fila sobre el eje x, de punta a punta, con un hilo de dispersión
      ax[i] = P.radios[0] * 0.95 * ((2 * (i + 0.5)) / P.axon - 1)
      ay[i] = 0.02 * (2 * azar(semilla, C_AXON, 2 * i) - 1); az[i] = 0.02 * (2 * azar(semilla, C_AXON, 2 * i + 1) - 1)
      continue
    }
    enEsfera(semilla, C_ATRACTOR, i, q)
    // sesgo al centro: el radio se multiplica por un número en [1-sesgo, 1]; con sesgo > 0 la densidad crece hacia el núcleo
    const s = 1 - P.sesgo + P.sesgo * azar(semilla, C_SESGO, i)
    q[0] *= s; q[1] *= s; q[2] *= s
    if (P.lobulos === 0) { ax[i] = q[0] * P.radios[0]; ay[i] = q[1] * P.radios[1]; az[i] = q[2] * P.radios[2] }
    else {
      const l = Math.floor(azar(semilla, C_LOBULO_ELEGIR, i) * P.lobulos)
      ax[i] = lobulo[4 * l] + q[0] * lobulo[4 * l + 3]; ay[i] = lobulo[4 * l + 1] + q[1] * lobulo[4 * l + 3]; az[i] = lobulo[4 * l + 2] + q[2] * lobulo[4 * l + 3]
    }
  }
  // Dueño de cada atractor: -1 = del campo común; i >= 2 = de la nube de la raíz i, que solo atrae a lo que cuelga de ella (si no, la
  // estructura ya densa le gana todos los atractores y la raíz tardía no llega a ser una forma propia).
  const duenoAtr = new Int8Array(total).fill(-1)
  const vivos = new Int32Array(total)
  for (let i = 0; i < M; i++) vivos[i] = i
  let nVivos = M

  const cap = nMax + R + 2
  const vx = new Float64Array(cap), vy = new Float64Array(cap), vz = new Float64Array(cap)
  const padre = new Int32Array(cap).fill(-1)
  const dueno = new Int8Array(cap).fill(-1) // a qué raíz tardía pertenece el vértice (hereda del padre); -1 = la estructura común
  // Estado de trazo de cada vértice (lo hereda del padre al crecer): hacia dónde iba la rama y cuánto venía curvando. Local a la rama.
  const dirX = new Float64Array(cap), dirY = new Float64Array(cap), dirZ = new Float64Array(cap)
  const curX = new Float64Array(cap), curY = new Float64Array(cap), curZ = new Float64Array(cap)
  const sa = new Uint32Array(cap), sb = new Uint32Array(cap), sp = new Uint32Array(cap)
  const nVert = new Uint32Array(nMax + 1)
  let nV = 0, nS = 0, nPaso = 0

  // Grilla espacial de nodos: celdas densas, cada una una lista de índices.
  const dim = Math.ceil((2 * P.lado) / celda) + 1
  const celdas: number[][] = Array.from({ length: dim * dim * dim }, () => [])
  const ci = (v: number) => Math.min(dim - 1, Math.max(0, Math.floor((v + P.lado) / celda)))
  const insertar = (j: number) => { celdas[(ci(vx[j]) * dim + ci(vy[j])) * dim + ci(vz[j])].push(j) }

  const sumX = new Float64Array(cap), sumY = new Float64Array(cap), sumZ = new Float64Array(cap), cuenta = new Uint32Array(cap)
  const nuevoVertice = (x: number, y: number, z: number, p: number, d: number) => {
    vx[nV] = x; vy[nV] = y; vz[nV] = z; padre[nV] = p; dueno[nV] = d
    sumX[nV] = 0; sumY[nV] = 0; sumZ[nV] = 0; cuenta[nV] = 0
    insertar(nV)
    return nV++
  }

  // Raíces: entran cuando el paso llega a su entrada (las de entrada 0, antes del primer paso).
  const entro = new Uint8Array(R), raizV = new Int32Array(R).fill(-1)
  const posRaices = new Float32Array(3 * R)
  for (let i = 0; i < R; i++) { const p = posicionRaiz(semilla, i, P); posRaices[3 * i] = p[0]; posRaices[3 * i + 1] = p[1]; posRaices[3 * i + 2] = p[2] }

  // Entra la raíz i: un vértice suelto en su punto (padre -1, sin segmento recto a nada: se une a la estructura solo por crecimiento) y,
  // si no es fundadora, su nube de atractores. Devuelve dónde empiezan sus atractores en `vivos`.
  const entrar = (i: number): number => {
    entro[i] = 1
    const x = posRaices[3 * i], y = posRaices[3 * i + 1], z = posRaices[3 * i + 2]
    raizV[i] = nuevoVertice(x, y, z, -1, i >= 2 ? i : -1)
    nVert[nPaso] = nV
    const desde = nVivos
    if (i >= 2) {
      for (let m = 0; m < P.nube; m++) {
        const a = M + (i - 2) * P.nube + m
        enEsfera(semilla, C_NUBE, i * 1024 + m, q)
        ax[a] = x + q[0] * P.radioNube; ay[a] = y + q[1] * P.radioNube; az[a] = z + q[2] * P.radioNube * 0.5
        duenoAtr[a] = i
        vivos[nVivos++] = a
      }
    }
    return desde
  }
  for (let i = 0; i < R; i++) if (entradas[i] <= 0) entrar(i)

  const infl2 = P.influencia * P.influencia, muerte2 = P.muerte * P.muerte
  // 1. cada atractor (desde `desde` en `vivos`) mira su nodo más cercano: lo atrae, o si está muy cerca se consume
  const atraer = (desde: number) => {
    let w = desde
    for (let n = desde; n < nVivos; n++) {
      const i = vivos[n], di = duenoAtr[i]
      const cx = ci(ax[i]), cy = ci(ay[i]), cz = ci(az[i])
      let mejor = -1, md = infl2
      for (let u = Math.max(0, cx - 1); u <= Math.min(dim - 1, cx + 1); u++) for (let v = Math.max(0, cy - 1); v <= Math.min(dim - 1, cy + 1); v++) for (let t = Math.max(0, cz - 1); t <= Math.min(dim - 1, cz + 1); t++) {
        const lista = celdas[(u * dim + v) * dim + t]
        for (let m = 0; m < lista.length; m++) {
          const j = lista[m]
          if (di >= 0 && dueno[j] !== di) continue
          const dx = ax[i] - vx[j], dy = ay[i] - vy[j], dz = az[i] - vz[j]
          const d = dx * dx + dy * dy + dz * dz
          if (d < md) { md = d; mejor = j }
        }
      }
      if (mejor >= 0 && md < muerte2) continue // consumido
      vivos[w++] = i
      if (mejor >= 0) {
        const d = Math.sqrt(md)
        sumX[mejor] += (ax[i] - vx[mejor]) / d; sumY[mejor] += (ay[i] - vy[mejor]) / d; sumZ[mejor] += (az[i] - vz[mejor]) / d
        cuenta[mejor]++
      }
    }
    nVivos = w
  }

  // 2. un nodo atraído crece un paso: hacia el promedio de sus atractores, con la inercia de la dirección que traía y una curvatura que
  // sigue de un paso al siguiente (trazo sinuoso, sin zigzag). El empujón nuevo sale de (semilla, paso), de nadie más.
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
    sa[nS] = j; sb[nS] = n; sp[nS] = nPaso + 1; nS++; nPaso++; nVert[nPaso] = nV
    return true
  }

  while (nPaso < nMax) {
    const V0 = nV
    sumX.fill(0, 0, V0); sumY.fill(0, 0, V0); sumZ.fill(0, 0, V0); cuenta.fill(0, 0, V0)
    atraer(0)
    let crecio = false
    for (let j = 0; j < V0 && nPaso < nMax; j++) {
      // una raíz que entra ahora crece ya, en este mismo paso (con sus atractores y los vecinos que la vean)
      for (let i = 0; i < R; i++) {
        if (entro[i] || entradas[i] > nPaso) continue
        const desde = entrar(i)
        atraer(desde)
        if (crecer(raizV[i])) crecio = true
        if (nPaso >= nMax) break
      }
      if (nPaso < nMax && crecer(j)) crecio = true
    }
    if (!crecio) {
      // estructura agotada: las raíces que faltan entran ahora (su entrada pedía un paso que no existe) y siguen; si no falta ninguna, fin
      let alguna = false
      for (let i = 0; i < R; i++) if (!entro[i]) { entrar(i); alguna = true }
      if (!alguna) break
    }
  }

  const pos = new Float32Array(nV * 3)
  for (let i = 0; i < nV; i++) { pos[3 * i] = vx[i]; pos[3 * i + 1] = vy[i]; pos[3 * i + 2] = vz[i] }
  return { version: VERSION, pos, padre: padre.slice(0, nV), a: sa.slice(0, nS), b: sb.slice(0, nS), paso: sp.slice(0, nS), vertices: nVert.slice(0, nPaso + 1), pasos: nPaso, posRaices }
}
