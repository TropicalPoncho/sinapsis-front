// 1) Aditivo: sobre una red ya asentada se suman N nodos vecinos (como 'Sumar sus obras' / créditos) con la transición real.
// 2) Deriva: cuánto se mueven los nodos entre 4 s y 16 s después de cargar (la simulación sigue viva con alphaMin 0).
// uso: node medir-aditivo-y-deriva.mjs <etiqueta> <ruta con perillas> [N]
import { createRequire } from 'node:module'
const require = createRequire('file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const [, , etiqueta, ruta, N = '6'] = process.argv
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
await p.goto('http://localhost:3003' + ruta + (ruta.includes('?') ? '&' : '?') + 'perf=1&semilla=hdu')
await p.waitForFunction(() => window.__sinapsis && window.__sinapsis.graph.graphData().nodes.length > 0 && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
const pos = () => p.evaluate(() => Object.fromEntries(window.__sinapsis.graph.graphData().nodes.map((n) => [n.id, [n.x, n.y, n.z]])))
await p.waitForTimeout(4000)
const a = await pos()
await p.waitForTimeout(12000)
const c = await pos()
const deriva = Math.max(...Object.keys(a).map((k) => Math.hypot(a[k][0] - c[k][0], a[k][1] - c[k][1], a[k][2] - c[k][2])))
const r = await p.evaluate(async (N) => {
  const topo = await (await fetch('/api/topologia')).json()
  const eng = window.__sinapsis
  const actuales = eng.graph.graphData().nodes
  const ids = new Set(actuales.map((n) => n.id))
  const extra = []
  for (const v of topo.vinculos) {
    const [x, y] = ids.has(v.origen) ? [v.origen, v.destino] : ids.has(v.destino) ? [v.destino, v.origen] : []
    if (x && !ids.has(y) && !extra.includes(y)) extra.push(y)
    if (extra.length >= Number(N)) break
  }
  const todos = new Set([...ids, ...extra])
  const sub = { nodos: topo.nodos.filter((n) => todos.has(n.id)), vinculos: topo.vinculos.filter((v) => todos.has(v.origen) && todos.has(v.destino)) }
  await eng.setVista(sub, { transicion: 'aditivo' })
  await new Promise((r) => setTimeout(r, 4000))
  const ns = eng.graph.graphData().nodes
  const rad = (n) => (n.esImagen ? 26.25 : 15)
  let min = Infinity, par = null, minNuevo = Infinity, sol = 0
  for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
    const d = Math.hypot(ns[i].x - ns[j].x, ns[i].y - ns[j].y, ns[i].z - ns[j].z), q = d / (rad(ns[i]) + rad(ns[j]))
    if (q < 1) sol++
    if (q < min) { min = q; par = [ns[i].name, ns[j].name] }
    if (extra.includes(ns[i].id) || extra.includes(ns[j].id)) minNuevo = Math.min(minNuevo, q)
  }
  return { antes: ids.size, nuevos: extra.length, total: ns.length, minRatio: +min.toFixed(3), minRatioConNuevos: +minNuevo.toFixed(3), solapan: sol, par }
}, N)
console.log(JSON.stringify({ etiqueta, ruta, derivaMax4a16s: +deriva.toFixed(2), ...r }))
await b.close()
