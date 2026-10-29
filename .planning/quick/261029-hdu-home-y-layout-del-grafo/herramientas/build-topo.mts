// Topología "real" desde los CSV vivos (mismo mapeo viz_params que scripts/migracion/importar.ts). NO es la base viva.
import { readFileSync, writeFileSync } from 'node:fs'
import { leerCsv } from 'file:///C:/Users/ramac/source/TropicalPoncho/sinapsis/sinapsis_front/scripts/migracion/csv.ts'
const R = 'C:/Users/ramac/source/TropicalPoncho/sinapsis/sinapsis_front/'
const out = process.argv[2]
const PALETA = ['#8AE2C8', '#578CCB', '#9900FF', '#FF0074', '#FFBC00', '#FFFFFF']
const POOL: Record<string, string[]> = {
  ENTIDAD: ['Marble', 'Perlin', 'CrossedLines', 'Lights', 'Twist'], OBRA: ['Perlin', 'Marble', 'CrossedLines'],
  EVENTO: ['Wave Line', 'Twist', 'Lights', 'Fire'], AGRUPACION: ['Twist', 'CrossedLines', 'Perlin Noise', 'Lights'],
}
function seedDe(id: string, sal = ''): number {
  const t = id + sal; let h = 0x811c9dc5
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return Math.round(((h >>> 0) / 0xffffffff) * 1000) / 1000
}
const variar = (id: string, sal: string, base: number, amp: number) => Math.round((base + (seedDe(id, sal) - 0.5) * 2 * amp) * 100) / 100
const nf = (leerCsv(readFileSync(R + 'data/curaduria/nodos.csv', 'utf8')) as any[]).filter((r) => r.descartar !== 'si')
const vf = (leerCsv(readFileSync(R + 'data/curaduria/vinculos.csv', 'utf8')) as any[]).filter((r) => r.descartar !== 'si')
const nodos = nf.map((r) => {
  const thumb = r.thumb && !r.thumb.startsWith('REVISAR:') ? r.thumb : undefined
  const pool = POOL[r.node_type]
  return {
    id: r.id, nodeType: r.node_type, subtipo: r.subtipo.trim(), label: r.label,
    ...(r.descripcion_breve && { descripcionBreve: r.descripcion_breve }), ...(thumb && { thumb }),
    vizParams: { shape: r.shape?.trim() || (thumb ? 'Image' : pool[Math.floor(seedDe(r.id, ':shape') * pool.length) % pool.length]),
      color: r.color?.trim() || PALETA[Math.floor(seedDe(r.id, ':color') * PALETA.length) % PALETA.length], speed: 0.05, noise: variar(r.id, ':noise', 0.5, 0.2), seed: seedDe(r.id) },
    isStub: r.is_stub === 'si', ...(r.fecha && { fecha: new Date(r.fecha).toISOString() }),
  }
})
const ids = new Set(nodos.map((n) => n.id))
const vinculos = vf.filter((r) => ids.has(r.origen) && ids.has(r.destino)).map((r) => ({
  id: r.id, origen: r.origen, destino: r.destino, tipoVinculo: r.tipo_vinculo,
  ...(r.rol && { rol: r.rol }), ...(r.desde && { desde: r.desde }), ...(r.hasta && { hasta: r.hasta }),
}))
writeFileSync(out, JSON.stringify({ nodos, vinculos }))
const c: Record<string, number> = {}
for (const v of vinculos) c[v.tipoVinculo] = (c[v.tipoVinculo] ?? 0) + 1
console.log('nodos', nodos.length, 'vinculos', vinculos.length, c)
