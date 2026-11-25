// Espaciado en la red de Ryzomatica (la métrica de 261029-hdu: distancia entre pares / suma de radios; < 1 = solapados), contra el 3003 aislado.
// El nodo del evento (la estructura) no cuenta como esfera: no se dibuja. Las raíces miden 15 * escalaRaices; el resto 15 (formas) o 26.25 (imágenes).
// uso: node medir-ryz.mjs <salida.jsonl> [query extra, p. ej. &escalaraiz=0.5]
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
const require = createRequire(process.env.PLAYWRIGHT_DIR ?? 'file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const [, , salida, extra = ''] = process.argv
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
await p.goto(`http://localhost:3003/?red=ryzomatica&dia=10&perf=1&semilla=ryz2${extra}`)
await p.waitForFunction(() => window.__sinapsis && window.__sinapsis.graph.graphData().nodes.length > 0 && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
await p.waitForTimeout(5000)
const r = await p.evaluate(() => {
  const e = window.__sinapsis, nodos = e.graph.graphData().nodes
  const evento = e._crec.nodoId
  const visibles = nodos.filter((n) => n.id !== evento)
  const pares = []
  let min = Infinity
  for (let i = 0; i < visibles.length; i++) for (let j = i + 1; j < visibles.length; j++) {
    const a = visibles[i], c = visibles[j]
    const d = Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z)
    const ra = (a.esImagen ? 26.25 : 15) * (a.escalaCrecimiento ?? 1) * (e.opciones.escalaNodos ?? 1), rc = (c.esImagen ? 26.25 : 15) * (c.escalaCrecimiento ?? 1) * (e.opciones.escalaNodos ?? 1)
    const q = d / (ra + rc)
    pares.push({ par: [a.name, c.name], dist: Math.round(d * 10) / 10, rad: [ra, rc], ratio: Math.round(q * 100) / 100 })
    min = Math.min(min, q)
  }
  const nucleo = nodos.find((n) => n.id === evento)
  return { n: nodos.length, minRatio: Math.round(min * 100) / 100, pares, nucleo: [nucleo.x, nucleo.y, nucleo.z].map(Math.round), raices: visibles.filter((n) => n.escalaCrecimiento).map((n) => ({ name: n.name, pos: [n.x, n.y, n.z].map((v) => Math.round(v * 10) / 10), aLaNucleo: Math.round(Math.hypot(n.x, n.y, n.z) * 10) / 10 })) }
})
console.log(JSON.stringify(r, null, 1))
writeFileSync(salida, JSON.stringify(r) + '\n')
await b.close()
