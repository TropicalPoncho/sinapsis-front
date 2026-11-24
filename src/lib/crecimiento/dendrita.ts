// dendrita-v1 (D-52): colonización del espacio (Runions et al., 2007) en 3D, con uniones entre ramas para cerrar celdas.
//
// CONGELADO. Esto es una versión publicada: la estructura de cada sitio es f(semilla, esta versión, paso). Tocar una línea, una
// constante o el orden de un bucle cambia la trayectoria de todos; un ajuste es dendrita-v2 y esta queda como está. El test de oro
// (dendrita.test.ts) rompe si el resultado cambia sin subir la versión.
//
// Determinismo entre navegadores: la lógica de decisión solo usa `+ - * /`, `Math.sqrt` (exacto por IEEE 754), comparaciones y
// enteros; PRNG con semilla; ni Math.random ni sin/cos/exp/pow. Un test lo verifica sobre el texto del módulo.
//
// Coordenadas normalizadas: raíces en (-1,0,0) y (1,0,0); la estructura vive en un elipsoide achatado (disco con espesor). El motor la
// escala y la acomoda entre los dos nodos reales; acá no hay mundo, solo la forma.
//
// Prefijo exacto: cada segmento es un paso. generar(s, k) es el prefijo de generar(s, k+1) byte a byte, porque nada de lo que se decide
// depende de `nMax` (solo corta el bucle): por eso se genera una vez a N completo y se revela hasta el paso actual.
import { mulberry32 } from './prng.ts'

export const VERSION = 'dendrita-v1'

const P = {
  radios: [1.25, 0.9, 0.35], // semiejes del elipsoide de atractores (espesor = 0.35 del radio mayor en plano)
  atractores: 9000,
  influencia: 0.2,           // radio dentro del cual un atractor atrae al nodo más cercano
  muerte: 0.075,             // un atractor a menos de esto de un nodo se consume
  paso: 0.025,               // largo de cada segmento
  jitter: 0.3,               // ruido de dirección (de la PRNG) para que las puntas ramifiquen en vez de quedar trabadas
  union: 0.085,              // dos nodos de ramas distintas a menos de esto se unen: así se cierran las celdas
  saltos: 16,                // "ramas distintas" = sin un ancestro común a menos de estos saltos
  unionesMax: 1,             // uniones por nodo, para que no se vuelva una red
  celda: 0.2,                // lado de la grilla espacial (= influencia)
  lado: 1.6,                 // la grilla cubre [-lado, lado] en cada eje
} as const

export interface Estructura {
  version: string
  // Vértices en orden de creación: 0 y 1 son las raíces. Coordenadas normalizadas.
  pos: Float32Array
  // Padre de cada vértice (-1 en las raíces): el árbol, sin las uniones.
  padre: Int32Array
  // Segmentos en orden de nacimiento: a -> b. Un segmento de árbol va del padre al hijo recién nacido; una unión, del nodo recién
  // nacido a un nodo que ya existía. `paso[s]` es el paso en que el segmento está completo (s + 1).
  a: Uint32Array
  b: Uint32Array
  paso: Uint32Array
  // Cantidad de vértices que existen una vez completo el paso k (k = 0..n): los vértices se crean en orden, un prefijo.
  vertices: Uint32Array
}

export function generar(semilla: number, nMax: number): Estructura {
  const rnd = mulberry32(semilla)
  const { radios, celda, lado } = P

  // Atractores: uniformes en el elipsoide, por rechazo en el cubo (sin trigonometría).
  const M = P.atractores
  const ax = new Float64Array(M), ay = new Float64Array(M), az = new Float64Array(M)
  for (let i = 0; i < M; i++) {
    let x = 0, y = 0, z = 0
    for (;;) {
      x = 2 * rnd() - 1; y = 2 * rnd() - 1; z = 2 * rnd() - 1
      if (x * x + y * y + z * z <= 1) break
    }
    ax[i] = x * radios[0]; ay[i] = y * radios[1]; az[i] = z * radios[2]
  }
  const vivos = new Int32Array(M)
  for (let i = 0; i < M; i++) vivos[i] = i
  let nVivos: number = M

  const cap = nMax + 2
  const vx = new Float64Array(cap), vy = new Float64Array(cap), vz = new Float64Array(cap)
  const padre = new Int32Array(cap).fill(-1)
  const unidos = new Uint8Array(cap)
  const sa = new Uint32Array(nMax), sb = new Uint32Array(nMax)
  const nVert = new Uint32Array(nMax + 1)
  let nV = 0, nS = 0

  // Grilla espacial de nodos: celdas densas, cada una una lista de índices.
  const dim = Math.ceil((2 * lado) / celda) + 1
  const celdas: number[][] = Array.from({ length: dim * dim * dim }, () => [])
  const ci = (v: number) => Math.min(dim - 1, Math.max(0, Math.floor((v + lado) / celda)))
  const insertar = (j: number) => { celdas[(ci(vx[j]) * dim + ci(vy[j])) * dim + ci(vz[j])].push(j) }

  const nuevoVertice = (x: number, y: number, z: number, p: number) => {
    vx[nV] = x; vy[nV] = y; vz[nV] = z; padre[nV] = p
    insertar(nV)
    return nV++
  }
  nuevoVertice(-1, 0, 0, -1)
  nuevoVertice(1, 0, 0, -1)
  nVert[0] = nV

  const sumX = new Float64Array(cap), sumY = new Float64Array(cap), sumZ = new Float64Array(cap), cuenta = new Uint32Array(cap)

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
    sa[nS] = q; sb[nS] = mejor; nS++; nVert[nS] = nV
    unidos[q]++; unidos[mejor]++
  }

  const infl2 = P.influencia * P.influencia, muerte2 = P.muerte * P.muerte
  while (nS < nMax) {
    const V0 = nV
    sumX.fill(0, 0, V0); sumY.fill(0, 0, V0); sumZ.fill(0, 0, V0); cuenta.fill(0, 0, V0)
    // 1. cada atractor mira su nodo más cercano: lo atrae, o si está muy cerca se consume
    let w = 0
    for (let n = 0; n < nVivos; n++) {
      const i = vivos[n]
      const cx = ci(ax[i]), cy = ci(ay[i]), cz = ci(az[i])
      let mejor = -1, md = infl2
      for (let u = Math.max(0, cx - 1); u <= Math.min(dim - 1, cx + 1); u++) for (let v = Math.max(0, cy - 1); v <= Math.min(dim - 1, cy + 1); v++) for (let t = Math.max(0, cz - 1); t <= Math.min(dim - 1, cz + 1); t++) {
        const lista = celdas[(u * dim + v) * dim + t]
        for (let m = 0; m < lista.length; m++) {
          const j = lista[m]
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
    // 2. cada nodo atraído crece un paso hacia el promedio de sus atractores
    let crecio = false
    for (let j = 0; j < V0 && nS < nMax; j++) {
      if (cuenta[j] === 0) continue
      const c = cuenta[j]
      const dx = sumX[j] / c + P.jitter * (2 * rnd() - 1), dy = sumY[j] / c + P.jitter * (2 * rnd() - 1), dz = sumZ[j] / c + P.jitter * (2 * rnd() - 1)
      const largo = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (largo < 1e-12) continue
      const q = nuevoVertice(vx[j] + (P.paso * dx) / largo, vy[j] + (P.paso * dy) / largo, vz[j] + (P.paso * dz) / largo, j)
      sa[nS] = j; sb[nS] = q; nS++; nVert[nS] = nV
      crecio = true
      if (nS < nMax) unir(q)
    }
    if (!crecio) break
  }

  const pos = new Float32Array(nV * 3)
  for (let i = 0; i < nV; i++) { pos[3 * i] = vx[i]; pos[3 * i + 1] = vy[i]; pos[3 * i + 2] = vz[i] }
  const paso = new Uint32Array(nS)
  for (let s = 0; s < nS; s++) paso[s] = s + 1
  return { version: VERSION, pos, padre: padre.slice(0, nV), a: sa.slice(0, nS), b: sb.slice(0, nS), paso, vertices: nVert.slice(0, nS + 1) }
}
