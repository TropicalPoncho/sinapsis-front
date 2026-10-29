// Mide el layout de la red real (fixture de CSV) en un Chromium headless contra el dev server de la copia (3003).
// uso: node medir.mjs <etiqueta> <dirCapturas|-> <ruta>[ <ruta> ...]   (la ruta puede traer ?dist= ?grado= ?charge= ?escala=)
import { createRequire } from 'node:module'
import { mkdirSync, appendFileSync } from 'node:fs'
const require = createRequire('file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const [, , etiqueta, dir, ...rutas] = process.argv
if (dir !== '-') mkdirSync(dir, { recursive: true })
const base = 'http://localhost:3003'
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
const errs = []
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
for (const ruta of rutas) {
  const url = base + ruta + (ruta.includes('?') ? '&' : '?') + 'perf=1&semilla=hdu'
  await p.goto(url)
  await p.waitForFunction(() => window.__sinapsis && window.__sinapsis.graph.graphData().nodes.length > 0 && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(4000)
  const r = await p.evaluate(() => {
    const escala = Number(new URLSearchParams(location.search).get('escala') ?? 1)
    const nodos = window.__sinapsis.graph.graphData().nodes
    // radio visual del nodo: sprite de imagen (lado 25*2.1) -> medio lado; resto, esfera/forma de radio size=15
    const rad = (n) => (n.esImagen ? 26.25 : 15) * escala
    let min = Infinity, par = null, solapan = 0, cercanos = 0, pares = 0
    const nn = nodos.map(() => Infinity)
    for (let i = 0; i < nodos.length; i++) for (let j = i + 1; j < nodos.length; j++) {
      const a = nodos[i], c = nodos[j]
      const d = Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z)
      const q = d / (rad(a) + rad(c))
      pares++
      if (q < 1) solapan++
      if (q < 1.5) cercanos++
      if (q < min) { min = q; par = [a.name, c.name, Math.round(d)] }
      if (q < nn[i]) nn[i] = q
      if (q < nn[j]) nn[j] = q
    }
    const ord = [...nn].sort((x, y) => x - y)
    const c = [0, 0, 0]
    for (const n of nodos) { c[0] += n.x; c[1] += n.y; c[2] += n.z }
    const m = c.map((v) => v / nodos.length)
    const rmax = Math.max(...nodos.map((n) => Math.hypot(n.x - m[0], n.y - m[1], n.z - m[2])))
    const ls = window.__sinapsis.graph.graphData().links
    const conLink = new Set(ls.flatMap((l) => [l.source.id, l.target.id]))
    const dc = nodos.map((n) => Math.hypot(n.x - m[0], n.y - m[1], n.z - m[2])).sort((x, y) => x - y)
    const lens = ls.map((l) => Math.hypot(l.source.x - l.target.x, l.source.y - l.target.y, l.source.z - l.target.z)).sort((x, y) => x - y)
    return {
      n: nodos.length, links: ls.length, minRatio: +min.toFixed(3), parMin: par, solapan, cercanos, pares,
      nnP10: +ord[Math.floor(ord.length * 0.1)].toFixed(2), nnMediana: +ord[Math.floor(ord.length / 2)].toFixed(2),
      radioRed: Math.round(rmax), radioP90: Math.round(dc[Math.floor(dc.length * 0.9)]), aislados: nodos.filter((n) => !conLink.has(n.id)).map((n) => n.name), linkMediana: Math.round(lens[Math.floor(lens.length / 2)] ?? 0),
      camZ: Math.round(window.__sinapsis.camera.position.length()),
    }
  })
  const fila = { etiqueta, ruta, ...r }
  console.log(JSON.stringify(fila))
  appendFileSync(new URL('./resultados.jsonl', import.meta.url), JSON.stringify(fila) + '\n')
  if (dir !== '-') {
    const nombre = ruta.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'home'
    await p.screenshot({ path: `${dir}/${etiqueta}-${nombre}.png` })
  }
}
if (errs.length) console.log('ERRORES', JSON.stringify(errs))
await b.close()
