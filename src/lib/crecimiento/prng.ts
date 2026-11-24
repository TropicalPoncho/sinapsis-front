// PRNG con semilla (mulberry32). NUNCA Math.random: la estructura tiene que salir idéntica en todo navegador (D-52).
// Solo enteros de 32 bits (`Math.imul`, `>>>`) y una división final por 2^32: aritmética exacta en cualquier motor JS.
export function mulberry32(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
