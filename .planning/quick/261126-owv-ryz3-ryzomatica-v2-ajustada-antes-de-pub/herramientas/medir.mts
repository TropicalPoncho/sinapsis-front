// Mediciones de 261126-owv (sin Next ni WebGL): tiempo de generación tibio de la grande y métricas de dominancia y de tamaño del mini.
// uso: node --experimental-strip-types medir.mts  -> un JSON por stdout. Es una herramienta, no el módulo: puede usar Math.hypot.
// Rama: empieza en una raíz o en un vértice que no es el primer hijo (el de menor índice) de su padre y sigue por primeros hijos; su largo
// es la cantidad de segmentos (contando el que la une al padre). top10frac = las 10 ramas más largas / segmentos.
import { generar } from '../../../../src/lib/crecimiento/dendrita.ts'
import type { Estructura } from '../../../../src/lib/crecimiento/dendrita.ts'
import { estructuraDe } from '../../../../src/lib/crecimiento/estructura.ts'

const CONFIG = {
  semilla: 20261205, algoritmo: 'dendrita-v2' as const, inicio: '2026-11-25T00:00:00-03:00', fin: '2026-12-05T00:00:00-03:00', n: 5000,
  raices: [{ id: '6335d5fa7636ed5b3529c545' }, { id: 'd4ad9c37a5ed06230cbd80d0' }],
}

export function ramas(e: Pick<Estructura, 'padre'>) {
  const V = e.padre.length
  const primer = new Int32Array(V).fill(-1)
  for (let v = 0; v < V; v++) { const p = e.padre[v]; if (p >= 0 && primer[p] < 0) primer[p] = v }
  const largos: number[] = []
  for (let v = 0; v < V; v++) {
    const p = e.padre[v]
    if (p >= 0 && primer[p] === v) continue // sigue la rama del padre
    let largo = p >= 0 ? 1 : 0, u = v
    while (primer[u] >= 0) { u = primer[u]; largo++ }
    largos.push(largo)
  }
  return largos
}

function profMax(e: Pick<Estructura, 'padre'>) {
  const prof = new Int32Array(e.padre.length)
  let m = 0
  for (let v = 0; v < e.padre.length; v++) { const p = e.padre[v]; if (p >= 0) { prof[v] = prof[p] + 1; if (prof[v] > m) m = prof[v] } }
  return m
}

function radios(e: Pick<Estructura, 'pos'>) {
  const r: number[] = []
  for (let v = 0; v < e.pos.length; v += 3) r.push(Math.hypot(e.pos[v], e.pos[v + 1], e.pos[v + 2]))
  r.sort((x, y) => x - y)
  return { r95: +r[Math.floor(0.95 * (r.length - 1))].toFixed(3), rmax: +r[r.length - 1].toFixed(3) }
}

const mediana = (xs: number[]) => { const s = [...xs].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)] }

generar(CONFIG.semilla, CONFIG.n) // calentamiento
const tiempos: number[] = []
let g!: Estructura
for (let i = 0; i < 3; i++) { const t0 = performance.now(); g = generar(CONFIG.semilla, CONFIG.n); tiempos.push(performance.now() - t0) }
const rs = ramas(g).sort((x, y) => y - x)
const g3 = generar(CONFIG.semilla, 3000)
const m = estructuraDe(CONFIG, 'mini')
const hijosRaiz = [...m.padre].filter((p) => p === 0).length

console.log(JSON.stringify({
  grande: {
    ms: Math.round(mediana(tiempos)), pasos: g.pasos, segmentos: g.a.length, profMax: profMax(g),
    top10frac: +(rs.slice(0, 10).reduce((s, x) => s + x, 0) / g.a.length).toFixed(4), medianaRamas: mediana(rs), rmax: radios(g).rmax,
  },
  grande3000: { rmax: radios(g3).rmax },
  mini: { pasos: m.pasos, raices: [...m.padre].filter((p) => p === -1).length, hijosRaiz, ...radios(m) },
}, null, 2))
