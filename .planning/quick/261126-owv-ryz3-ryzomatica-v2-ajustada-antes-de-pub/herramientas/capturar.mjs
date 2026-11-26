// Capturas, medidas y chequeos de 261126-owv contra `next start -p 3002` (base local; ANTES correr el control de base: 195 nodos y
// Ryzomatica con `crecimiento`). Adaptada de 261124-ryz2/herramientas/capturar.mjs.
// uso: node capturar.mjs <dirCapturas> <salida.jsonl> [filtro]   (`filtro` = subcadena de `${vp}-${escena}`; 'cpu4x' para el bloque lento)
// Sale con código 1 si algún chequeo falla (lista `fallas` al final).
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
const require = createRequire(process.env.PLAYWRIGHT_DIR ?? 'file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const [, , dir, salidaArchivo, filtro] = process.argv
mkdirSync(dir, { recursive: true })
const base = 'http://localhost:3002'
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const salida = [], fallas = []
const log = (o) => { salida.push(o); console.log(JSON.stringify(o)) }
const falla = (donde, que) => { fallas.push(`${donde}: ${que}`) }
const VPS = [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]
const ESCENAS = [
  ['ryz-dia0', '/obra/ryzomatica?dia=0&perf=1'], ['ryz-dia1', '/obra/ryzomatica?dia=1&perf=1'], ['ryz-50', '/obra/ryzomatica?dia=5&perf=1'],
  ['ryz-100', '/obra/ryzomatica?dia=10&perf=1'], ['ryz-red-100', '/?red=ryzomatica&dia=10&perf=1'],
  ['lab-dia0', '/entidad/laboratorios?red=laboratorios&dia=0&perf=1'], ['lab-hoy', '/entidad/laboratorios?red=laboratorios&perf=1'],
  ['lab-100', '/entidad/laboratorios?red=laboratorios&dia=10&perf=1'], ['bosque-hoy', '/entidad/bosque-gracias?perf=1'],
]

async function abrir(ctx, ruta, espera = 120000) {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => { log({ pageerror: e.message }); falla(ruta, `pageerror ${e.message}`) })
  p.on('console', (m) => { if (m.type() === 'error') log({ consoleError: m.text().slice(0, 200) }) })
  await p.goto(base + ruta, { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: espera })
  await p.waitForTimeout(5000)
  return p
}
// Draw calls con y sin las líneas del crecimiento en la MISMA escena (esperado: 1 de diferencia) y lo que la escena tiene adentro.
const medir = (p) => p.evaluate(async () => {
  const e = window.__sinapsis
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  await frames()
  const r = e._perf()
  const inst = e._instCrec?.()
  let sin = null
  if (inst) { inst.lineas.visible = false; await frames(); sin = e._perf().drawCalls; inst.lineas.visible = true; await frames() }
  const nodos = e.graph.graphData().nodes
  const curada = new Map((e._subgrafo?.nodos ?? []).map((n) => [n.id, n.vizParams?.shape]))
  return {
    ...r, drawCallsSinCrecimiento: sin, ctxPerdido: e.renderer.getContext().isContextLost(),
    modo: e._modoCrec, pasosRevelados: inst?.pasos ?? null, segmentos: inst?.total ?? null,
    paresDibujados: inst ? inst.geometria.drawRange.count / 2 : null,
    paresGeometria: inst ? inst.geometria.attributes.position.count / 2 : null,
    crecimientos: nodos.filter((n) => n.crecimiento).length,
    raices: nodos.filter((n) => n.escalaCrecimiento !== undefined).map((n) => ({ id: n.id, name: n.name, type: n.type, shape: curada.get(n.id), escala: n.escalaCrecimiento })),
    nombres: nodos.map((n) => [n.name, n.type]),
  }
})
function chequear(donde, escena, m) {
  if (m.crecimientos !== 1) falla(donde, `${m.crecimientos} nodos con crecimiento (esperado 1)`)
  const modo = escena.startsWith('ryz') ? 'completo' : 'mini'
  if (m.modo !== modo) falla(donde, `modo ${m.modo} (esperado ${modo})`)
  for (const r of m.raices) if (r.type !== r.shape) falla(donde, `raíz ${r.name} con type ${r.type} y shape curada ${r.shape}`)
  if (escena === 'ryz-dia0' && m.paresDibujados !== 0) falla(donde, `${m.paresDibujados} pares dibujados al día 0`)
  if (escena === 'lab-dia0' && !(m.pasosRevelados >= 100)) falla(donde, `mini con ${m.pasosRevelados} pasos al día 0 (piso 100)`)
  const dif = m.drawCalls - m.drawCallsSinCrecimiento
  if (m.paresDibujados > 0 ? dif !== 1 : dif > 1) falla(donde, `diferencia de draw calls ${dif} con ${m.paresDibujados} pares`)
  if (m.paresGeometria > 1.5 * m.segmentos) falla(donde, `${m.paresGeometria} pares en la geometría para ${m.segmentos} segmentos (techo 1.5x)`)
  if (m.ctxPerdido) falla(donde, 'contexto WebGL perdido')
}

// Generación con la CPU 4x más lenta (CDP): estimación de un celular de gama media, no una medida de uno.
if (!filtro || 'cpu4x'.includes(filtro)) {
  const ctx = await b.newContext({ viewport: VPS[1][1], hasTouch: true, isMobile: true })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  p.on('pageerror', (e) => falla('cpu4x', `pageerror ${e.message}`))
  await p.goto(base + '/obra/ryzomatica?dia=10&perf=1', { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 240000 })
  await p.waitForTimeout(3000)
  const m = await medir(p)
  log({ vp: 'mobile', escena: 'ryz-100-cpu-4x', ...m })
  chequear('mobile-ryz-100-cpu-4x', 'ryz-100', m)
  await ctx.close()
}
for (const [vp, viewport] of VPS) {
  for (const [nombre, ruta] of ESCENAS) {
    if (filtro && !`${vp}-${nombre}`.includes(filtro)) continue
    const ctx = await b.newContext({ viewport, hasTouch: viewport.width < 800, isMobile: viewport.width < 800 })
    const p = await abrir(ctx, ruta)
    await p.screenshot({ path: `${dir}/${vp}-${nombre}.png` })
    const m = await medir(p)
    log({ vp, escena: nombre, ...m })
    chequear(`${vp}-${nombre}`, nombre, m)
    await ctx.close()
  }
}
writeFileSync(salidaArchivo, salida.map((o) => JSON.stringify(o)).join('\n') + '\n')
await b.close()
console.log(JSON.stringify({ fallas }, null, 2))
process.exit(fallas.length ? 1 : 0)
