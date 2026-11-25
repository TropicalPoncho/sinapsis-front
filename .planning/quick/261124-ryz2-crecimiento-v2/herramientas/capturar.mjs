// Capturas y medidas de 261124-ryz2 contra un `next dev -p 3003` aislado (copia de src fuera del repo, TOPOLOGIA_FIXTURE=1, fixture de los CSV
// con build-fixture.mts). uso: node capturar.mjs <dirCapturas> <salida.jsonl> [filtro]
// Escenas: la red de Ryzomatica (donde el crecimiento ES la neurona) al día 0, 50 % y 100 %; Laboratorios y Tropical vistos desde afuera
// (Ryzomatica como versión pequeña) al día 0 y 100 %. Desktop 1280 y mobile 390. `filtro` = subcadena del nombre de la captura.
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
const require = createRequire(process.env.PLAYWRIGHT_DIR ?? 'file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const [, , dir, salidaArchivo, filtro] = process.argv
mkdirSync(dir, { recursive: true })
const base = 'http://localhost:3003'
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const salida = []
const log = (o) => { salida.push(o); console.log(JSON.stringify(o)) }
const VPS = [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]
const ESCENAS = [
  ['ryz-dia0', '/?red=ryzomatica&dia=0'], ['ryz-50', '/?red=ryzomatica&dia=5'], ['ryz-100', '/?red=ryzomatica&dia=10'],
  ['lab-dia0', '/?red=laboratorios&dia=0'], ['lab-100', '/?red=laboratorios&dia=10'],
  ['tropical-dia0', '/?red=tropical-poncho&dia=0'], ['tropical-100', '/?red=tropical-poncho&dia=10'],
]
const SUFIJO = '&perf=1&semilla=ryz'

async function abrir(viewport, ruta) {
  const ctx = await b.newContext({ viewport, hasTouch: viewport.width < 800, isMobile: viewport.width < 800 })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => log({ pageerror: e.message }))
  p.on('console', (m) => { if (m.type() === 'error') log({ consoleError: m.text().slice(0, 200) }) })
  await p.goto(base + ruta + SUFIJO, { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(5000)
  return { p, ctx }
}
// Draw calls con y sin el dibujo del crecimiento en la MISMA escena: la diferencia es lo que cuesta (esperado: 1).
const perf = (p) => p.evaluate(async () => {
  const e = window.__sinapsis
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  await frames()
  const r = e._perf()
  let sin = null
  const inst = e._instCrec?.()
  if (inst) { inst.lineas.visible = false; inst._ocultar = true; await frames(); sin = e._perf().drawCalls; inst.lineas.visible = true; inst._ocultar = false; await frames() }
  return { ...r, drawCallsSinCrecimiento: sin, ctxPerdido: e.renderer.getContext().isContextLost() }
})

// Generación con la CPU 4x más lenta (CDP): estimación de un celular de gama media, no una medida de uno.
if (!filtro || 'cpu4x'.includes(filtro)) {
  const ctx = await b.newContext({ viewport: VPS[1][1], hasTouch: true, isMobile: true })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await p.goto(base + '/?red=ryzomatica&dia=10' + SUFIJO, { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 240000 })
  await p.waitForTimeout(3000)
  log({ vp: 'mobile', escena: 'ryz-100-cpu-4x', ...(await perf(p)) })
  await ctx.close()
}
for (const [vp, viewport] of VPS) {
  for (const [nombre, ruta] of ESCENAS) {
    if (filtro && !`${vp}-${nombre}`.includes(filtro)) continue
    const { p, ctx } = await abrir(viewport, ruta)
    await p.screenshot({ path: `${dir}/${vp}-${nombre}.png` })
    log({ vp, escena: nombre, ...(await perf(p)) })
    await ctx.close()
  }
}
writeFileSync(salidaArchivo, salida.map((o) => JSON.stringify(o)).join('\n') + '\n')
await b.close()
