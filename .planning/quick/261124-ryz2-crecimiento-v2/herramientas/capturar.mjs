// Capturas y medidas de 261124-ryz contra un `next dev -p 3003` aislado (copia de src en el scratchpad, TOPOLOGIA_FIXTURE=1, fixture de los CSV
// con build-fixture.mts). uso: node capturar.mjs <dirCapturas> <salida.jsonl>
// 5 momentos del crecimiento (día 0, 25 %, 50 %, 75 %, 100 % del recorrido de 10 días) en desktop 1280 y mobile 390, vía ?dia=N.
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
const require = createRequire('file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const [, , dir, salidaArchivo] = process.argv
mkdirSync(dir, { recursive: true })
const base = 'http://localhost:3003'
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const salida = []
const log = (o) => { salida.push(o); console.log(JSON.stringify(o)) }
const VPS = [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]
const MOMENTOS = [['dia0', 0], ['25', 2.5], ['50', 5], ['75', 7.5], ['100', 10]]
const RUTA = '/?red=ryzomatica' // la red de Ryzomatica sin foco: el encuadre toma los dos nodos de los que nace la estructura

async function abrir(viewport, query) {
  const ctx = await b.newContext({ viewport, hasTouch: viewport.width < 800, isMobile: viewport.width < 800 })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => log({ pageerror: e.message }))
  p.on('console', (m) => { if (m.type() === 'error') log({ consoleError: m.text().slice(0, 200) }) })
  await p.goto(base + RUTA + '&perf=1&semilla=ryz' + query, { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(4000)
  return { p, ctx }
}
// Draw calls con y sin la estructura en la MISMA escena y encuadre: la diferencia es lo que cuesta (esperado: 1).
const perf = (p) => p.evaluate(async () => {
  const e = window.__sinapsis
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  await frames()
  const r = e._perf()
  let sin = null
  if (e._crec) { const l = e._crec.obj.lineas; e.scene.remove(l); await frames(); sin = e._perf().drawCalls; e.scene.add(l); await frames() } // sacarla de la escena: actualizar() la vuelve visible cada cuadro
  return { ...r, drawCallsSinEstructura: sin, ctxPerdido: e.renderer.getContext().isContextLost() }
})

// Generación de la estructura con la CPU 4x más lenta (CDP): estimación de un celular de gama media, no una medida de uno.
{
  const ctx = await b.newContext({ viewport: VPS[1][1], hasTouch: true, isMobile: true })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await p.goto(base + RUTA + '&perf=1&semilla=ryz&dia=10', { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 240000 })
  await p.waitForTimeout(3000)
  log({ vp: 'mobile', momento: 'cpu-4x', ...(await perf(p)) })
  await ctx.close()
}

for (const [vp, viewport] of VPS) {
  for (const [nombre, dia] of MOMENTOS) {
    const { p, ctx } = await abrir(viewport, `&dia=${dia}`)
    await p.screenshot({ path: `${dir}/${vp}-${nombre}.png` })
    log({ vp, momento: nombre, dia, ...(await perf(p)) })
    await ctx.close()
  }
  // sin perillas: el reloj real (hoy, 2026-11-24: antes del inicio, 0 segmentos)
  const { p, ctx } = await abrir(viewport, '')
  log({ vp, momento: 'reloj-real', ...(await perf(p)) })
  await ctx.close()
}
// control: una red sin la estructura (Tropical Poncho) no cuesta nada
for (const [vp, viewport] of VPS) {
  const ctx = await b.newContext({ viewport })
  const p = await ctx.newPage()
  await p.goto(base + '/entidad/tropical-poncho?red=tropical-poncho&perf=1&semilla=ryz', { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(3000)
  log({ vp, momento: 'control-sin-estructura', ...(await perf(p)) })
  await ctx.close()
}
writeFileSync(salidaArchivo, salida.map((o) => JSON.stringify(o)).join('\n') + '\n')
await b.close()
