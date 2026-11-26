import type { Adyacencia } from '../vista/adyacencia.ts'
import type { NodoGrafo, NodeType, Subgrafo } from '../../types/vista.ts'
import { puentesDe } from '../vista/resolverVista.ts'

// PERF-01 mide ~100 nodos a 30fps con CPU 4x, pero la carga `warmupTicks(300)` síncrona es el
// techo real; se ajusta con una corrida real. El override por `?limite=` lo lee el puente.
export const LIMITE_HOME = 40

// ponytail: mulberry32, no criptográfico; alcanza para una fracción reproducible.
export function prng(s: number): () => number {
  let a = s | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Lazy: nunca en el nivel del módulo ni en render de servidor (hidratación).
let visita: string | undefined
export function semillaDeVisita(): string {
  return (visita ??= Math.random().toString(36).slice(2, 10))
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

// Criterio del home, único lugar: lo colectivo. Entidades que producen o albergan (productora, sello,
// centro cultural, colectivo, plataforma) y las áreas (AGRUPACION). Sin personas, dúos, bandas ni proyectos,
// ni las obras sueltas (esas se ven al entrar a la red de su autor/a): el home es la puerta a quién hace
// las cosas, y con ~140 personas era un bardo de neuronas. Los subtipos son los códigos de `subtipos`.
// ponytail: criterio fijo en código; el dueño quiere que cada unx configure qué mostrar. Salida: leerlo de una
// Vista guardada por creadxr (la Vista es configuración, nunca un campo del nodo) cuando exista el alta de Vistas.
const SUBTIPOS_COLECTIVOS: ReadonlySet<string> = new Set(['productora', 'sello', 'centro_cultural', 'colectivo', 'plataforma', 'banda', 'proyecto'])
export const esDelHome = (n: NodoGrafo): boolean =>
  n.nodeType === 'AGRUPACION' || (n.nodeType === 'ENTIDAD' && SUBTIPOS_COLECTIVOS.has(n.subtipo))

export function fraccionHome(
  ady: Adyacencia,
  { semilla, limite }: { semilla: string; limite: number },
): Subgrafo {
  const rnd = prng(hash(semilla))
  const candidatos = [...ady.nodos.values()].filter(esDelHome)
  const elegidos = new Map<string, NodoGrafo>()
  const elegir = (xs: NodoGrafo[]) => xs[Math.floor(rnd() * xs.length)]

  const frontera = (): NodoGrafo[] => {
    const out = new Map<string, NodoGrafo>()
    for (const id of elegidos.keys()) {
      for (const v of [...(ady.sale.get(id) ?? []), ...(ady.entra.get(id) ?? [])]) {
        const otro = ady.nodos.get(v.origen === id ? v.destino : v.origen)
        if (otro && esDelHome(otro) && !elegidos.has(otro.id)) out.set(otro.id, otro)
      }
    }
    return [...out.values()]
  }

  const inicial = Math.min(2 + Math.floor(rnd() * 2), limite)
  for (let i = 0; i < inicial && elegidos.size < candidatos.length; i++) {
    const libres = candidatos.filter((n) => !elegidos.has(n.id))
    const n = elegir(libres)
    elegidos.set(n.id, n)
  }

  let ultimo: NodeType = 'OBRA'
  while (elegidos.size < limite && elegidos.size < candidatos.length) {
    let f = frontera()
    if (f.length === 0) f = candidatos.filter((n) => !elegidos.has(n.id))
    const alterno = f.filter((n) => n.nodeType !== ultimo)
    const n = elegir(alterno.length ? alterno : f)
    elegidos.set(n.id, n)
    ultimo = n.nodeType
  }

  const vinculos = [...elegidos.keys()].flatMap((id) =>
    (ady.sale.get(id) ?? []).filter((v) => elegidos.has(v.destino)),
  )

  // La muestra del home es aleatoria: el nodo que conectaba a dos elegidos pudo no salir
  // sorteado. Mismo mecanismo de puentes que resolverVista, para no dejarlos sueltos.
  const visibles = new Set(elegidos.keys())
  const excluidos = [...ady.nodos.keys()].filter((id) => !visibles.has(id))
  const yaConectados = new Set(vinculos.map((v) => [v.origen, v.destino].sort().join('|')))
  vinculos.push(...puentesDe(ady, excluidos, visibles, yaConectados))

  return { nodos: [...elegidos.values()], vinculos }
}

