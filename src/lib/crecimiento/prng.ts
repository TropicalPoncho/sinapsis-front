// Aleatoriedad SIN ESTADO (D-52, enmendada en dendrita-v2): cada decisión saca su número de (semilla, canal, k), un hash entero.
// Nada se comparte entre pasos: agregar o sacar un paso, o una raíz que entra tarde, no corre el número que ve ningún otro paso.
// Una PRNG secuencial (mulberry32 en v1) no sirve para eso: un solo consumo extra desfasa todo lo que viene después.
// NUNCA Math.random. Solo enteros de 32 bits (`Math.imul`, `>>>`) y una división final por 2^32: aritmética exacta en cualquier motor JS.

// Finalizador de 32 bits (lowbias32): buena difusión, sin estado.
const mezclar = (h: number): number => {
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d)
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b)
  return (h ^ (h >>> 16)) >>> 0
}

// canal = "para qué" (atractores, ruido de dirección, posición de una raíz...); k = el índice dentro del canal. Devuelve [0, 1).
export function azar(semilla: number, canal: number, k: number): number {
  let h = mezclar((semilla ^ 0x9e3779b9) >>> 0)
  h = mezclar((h ^ Math.imul(canal, 0x85ebca6b)) >>> 0)
  h = mezclar((h + k) >>> 0)
  return h / 4294967296
}
