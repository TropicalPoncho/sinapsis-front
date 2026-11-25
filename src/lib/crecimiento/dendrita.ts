// dendrita-v2 (D-52, D-53): colonización del espacio (Runions et al., 2007) en 3D, con uniones entre ramas para cerrar celdas.
//
// CONGELADO desde que se publique (inicio 2026-11-25). Esto es una versión: la estructura de cada sitio es f(semilla, esta versión,
// paso, entradas de las raíces). Tocar una línea, una constante o el orden de un bucle cambia la trayectoria de todos; un ajuste es
// dendrita-v3 y esta queda como está. El test de oro (crecimiento.test.ts) rompe si el resultado cambia sin subir la versión.
// (v1 nunca se publicó: se reemplazó por esta antes del primer día, por eso no queda en el repo.)
//
// Qué cambió respecto de v1: (1) cada decisión saca su aleatoriedad de azar(semilla, canal, k), sin estado compartido: agregar una raíz
// tardía no desfasa ningún paso anterior a su ingreso; (2) las raíces nacen unidas y pegadas al núcleo (un segmento de unión en el paso
// 0), no a los extremos: el crecimiento sale del cuerpo unido hacia afuera; (3) `raices` con paso de ingreso: una raíz que entra en el
// paso s se une al vértice más cercano, trae su nube de atractores y empieza a crecer en ese mismo paso; (4) un perfil `mini` de la
// misma familia (esfera irregular, ~400 pasos) con el que se dibuja el nodo cuando se lo ve desde afuera.
//
// Determinismo entre navegadores: la lógica de decisión solo usa `+ - * /`, `Math.sqrt` (exacto por IEEE 754), comparaciones y
// enteros; aleatoriedad por hash entero; ni Math.random ni sin/cos/exp/pow. Un test lo verifica sobre el texto del módulo.
//
// Coordenadas normalizadas: el núcleo en el origen, las fundadoras en (-raiz,0,0) y (raiz,0,0); la estructura vive en un elipsoide
// achatado (disco con espesor) o, en `mini`, en una unión de esferas. El motor la escala y la coloca; acá no hay mundo, solo la forma.
//
// Prefijo exacto: cada paso agrega al final y nada de lo que se decide depende de `nMax` (solo corta el bucle): generar(s, k) es el
// prefijo de generar(s, k+1) byte a byte, por eso se genera una vez a N completo y se revela hasta el paso actual. Un "paso" es una
// rama o un cierre de celda; el puente con que entra una raíz no cuenta como paso (nace con ella).
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
  jitter: number               // ruido de dirección para que las puntas ramifiquen en vez de quedar trabadas
  union: number                // dos nodos de ramas distintas a menos de esto se unen: así se cierran las celdas
  saltos: number               // "ramas distintas" = sin un ancestro común a menos de estos saltos
  unionesMax: number           // uniones por nodo, para que no se vuelva una red
  lado: number                 // la grilla espacial cubre [-lado, lado] en cada eje (celda = influencia)
  raiz: number                 // las fundadoras nacen en (-raiz,0,0) y (raiz,0,0): pegadas al núcleo
  nube: number                 // atractores que trae cada raíz que no es fundadora
  radioNube: number
  zona: readonly number[]      // semiejes de la zona donde nacen las raíces que no son fundadoras
}

const PERFILES: Record<NombrePerfil, Perfil> = {
  grande: {
    lobulos: 0, radios: [1.25, 0.9, 0.35], atractores: 9000, influencia: 0.2, muerte: 0.075, paso: 0.025, jitter: 0.3, union: 0.085,
    saltos: 16, unionesMax: 1, lado: 1.6, raiz: 0.14, nube: 400, radioNube: 0.25, zona: [0.8, 0.6, 0.2],
  },
  mini: {
    lobulos: 5, radios: [1, 1, 1], atractores: 700, influencia: 0.4, muerte: 0.15, paso: 0.06, jitter: 0.3, union: 0.17,
    saltos: 16, unionesMax: 1, lado: 1.6, raiz: 0.12, nube: 0, radioNube: 0, zona: [0.5, 0.5, 0.5],
  },
}

// Canales de azar: cada uso tiene el suyo, así ningún flujo pisa a otro.
const C_ATRACTOR = 1, C_RUIDO = 2, C_RAIZ = 3, C_NUBE = 4, C_LOBULO_ELEGIR = 5, C_LOBULO_CENTRO = 6, C_LOBULO_RADIO = 7
const INTENTOS = 32 // rechazo en el cubo: 0.48^32 ~ 1e-10; si se agotan, el origen (determinista)

export interface Estructura {
  version: string
  // Vértices en orden de creación: 0 y 1 son las fundadoras; una raíz tardía es un vértice más, creado al entrar. Normalizadas.
  pos: Float32Array
  // Padre de cada vértice (-1 en las raíces): el árbol, sin las uniones ni los puentes.
  padre: Int32Array
  // Segmentos en orden de nacimiento: a -> b. `paso[s]` (no decreciente) es el paso en que el segmento aparece: 0 para el puente de
  // las raíces que nacen juntas, s+1 para el que completa el paso s+1; el puente de una raíz tardía lleva el paso en que entra.
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
    enEsfera(semilla, C_ATRACTOR, i, q)
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
  const unidos = new Uint8Array(cap)
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

  // Entra la raíz i: vértice nuevo, puente al vértice más cercano que ya exista (la unión del nacimiento: no cuenta como paso) y, si no
  // es fundadora, su nube de atractores. Devuelve dónde empiezan sus atractores en `vivos`.
  const entrar = (i: number): number => {
    entro[i] = 1
    const x = posRaices[3 * i], y = posRaices[3 * i + 1], z = posRaices[3 * i + 2]
    let mejor = -1, md = Infinity
    for (let j = 0; j < nV; j++) {
      const dx = vx[j] - x, dy = vy[j] - y, dz = vz[j] - z, d = dx * dx + dy * dy + dz * dz
      if (d < md) { md = d; mejor = j }
    }
    const v = nuevoVertice(x, y, z, -1, i >= 2 ? i : -1)
    raizV[i] = v
    if (mejor >= 0) { sa[nS] = v; sb[nS] = mejor; sp[nS] = nPaso; nS++ }
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

  // ¿q y r son de la misma rama? Comparten un ancestro (o uno es del otro) dentro de `saltos` saltos.
  const ancQ = new Int32Array(P.saltos + 1)
  const relacionados = (q: number, r: number) => {
    let n = 0
    for (let u = q; u >= 0 && n <= P.saltos; u = padre[u]) ancQ[n++] = u
    let k = 0
    for (let u = r; u >= 0 && k <= P.saltos; u = padre[u], k++) for (let i = 0; i < n; i++) if (ancQ[i] === u) return true
    return false
  }

  const unir = (q: number) => {
    if (unidos[q] >= P.unionesMax) return
    const cx = ci(vx[q]), cy = ci(vy[q]), cz = ci(vz[q])
    let mejor = -1, md = P.union * P.union
    for (let i = Math.max(0, cx - 1); i <= Math.min(dim - 1, cx + 1); i++) for (let j = Math.max(0, cy - 1); j <= Math.min(dim - 1, cy + 1); j++) for (let k = Math.max(0, cz - 1); k <= Math.min(dim - 1, cz + 1); k++) {
      const lista = celdas[(i * dim + j) * dim + k]
      for (let m = 0; m < lista.length; m++) {
        const r = lista[m]
        if (r === q || unidos[r] >= P.unionesMax) continue
        const dx = vx[r] - vx[q], dy = vy[r] - vy[q], dz = vz[r] - vz[q]
        const d = dx * dx + dy * dy + dz * dz
        if (d < md && !relacionados(q, r)) { md = d; mejor = r }
      }
    }
    if (mejor < 0) return
    sa[nS] = q; sb[nS] = mejor; sp[nS] = nPaso + 1; nS++; nPaso++; nVert[nPaso] = nV
    unidos[q]++; unidos[mejor]++
  }

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

  // 2. un nodo atraído crece un paso hacia el promedio de sus atractores. El ruido del paso sale de (semilla, paso), de nadie más.
  const crecer = (j: number): boolean => {
    if (cuenta[j] === 0) return false
    const c = cuenta[j], k = 4 * nPaso
    const dx = sumX[j] / c + P.jitter * (2 * azar(semilla, C_RUIDO, k) - 1)
    const dy = sumY[j] / c + P.jitter * (2 * azar(semilla, C_RUIDO, k + 1) - 1)
    const dz = sumZ[j] / c + P.jitter * (2 * azar(semilla, C_RUIDO, k + 2) - 1)
    const largo = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (largo < 1e-12) return false
    const n = nuevoVertice(vx[j] + (P.paso * dx) / largo, vy[j] + (P.paso * dy) / largo, vz[j] + (P.paso * dz) / largo, j, dueno[j])
    sa[nS] = j; sb[nS] = n; sp[nS] = nPaso + 1; nS++; nPaso++; nVert[nPaso] = nV
    if (nPaso < nMax) unir(n)
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
