// Laboratorios con y sin `crecimiento` en Ryzomatica (interceptando /api/topologia): ¿la captura rompe el GPU por el crecimiento o por la escena?
import { createRequire } from 'node:module'
const require = createRequire('file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const [, , dir, modo, veces = '2'] = process.argv
for (let i = 0; i < +veces; i++) {
  const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
  if (modo === 'sin') await ctx.route('**/api/topologia*', async (r) => { const res = await r.fetch(); const j = await res.json(); for (const n of j.nodos) delete n.crecimiento; await r.fulfill({ response: res, json: j }) })
  const p = await ctx.newPage()
  let perdio = 0
  p.on('console', (m) => { if (/context lost|CONTEXT_LOST/i.test(m.text())) perdio++ })
  await p.goto('http://localhost:3002/entidad/laboratorios?red=laboratorios&dia=10&perf=1')
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(5000)
  const tipo = await p.evaluate(() => window.__sinapsis.graph.graphData().nodes.map((n) => n.type).join(','))
  let ok = true
  try { await p.screenshot({ path: `${dir}/lab-${modo}-${i}.png` }) } catch { ok = false }
  const lost = await p.evaluate(() => window.__sinapsis.renderer.getContext().isContextLost())
  console.log(modo, i, tipo, 'captura', ok, 'perdido', lost, 'msgs', perdio)
  await b.close()
}
