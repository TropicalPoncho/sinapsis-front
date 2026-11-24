// Verificación funcional de 261124-ryz contra el 3003 aislado: perillas, reloj del servidor, slider y vida de la estructura al cambiar de red.
// uso: node verificar.mjs <salida.jsonl>
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
const require = createRequire('file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const base = 'http://localhost:3003'
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const salida = []
const log = (o) => { salida.push(o); console.log(JSON.stringify(o)) }
const pasos = (p) => p.evaluate(() => { const c = window.__sinapsis._crec; return c ? { pasos: c.obj.pasos, total: c.obj.total, dibujados: c.obj.geometria.drawRange.count / 2 } : null })

async function abrir(query, { reloj = 0 } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
  // un cliente con el reloj mal (adelantado `reloj` ms): la estructura tiene que seguir la hora del servidor
  if (reloj) await ctx.addInitScript((d) => { const n = Date.now.bind(Date); Date.now = () => n() + d }, reloj)
  const p = await ctx.newPage()
  p.on('pageerror', (e) => log({ pageerror: e.message }))
  await p.goto(base + '/?red=ryzomatica&perf=1&semilla=ryz' + query, { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(2500)
  return { p, ctx }
}

{ // ?t= : el 30/11 a las 00:00 (-03:00) es el 50 % del recorrido -> smoothstep(0.5) * 5000 = 2500
  const { p, ctx } = await abrir('&t=2026-11-30T00:00:00-03:00')
  log({ caso: '?t=2026-11-30 (50 %)', esperado: 2500, ...(await pasos(p)) })
  await ctx.close()
}
{ // ?dia=7.5
  const { p, ctx } = await abrir('&dia=7.5')
  log({ caso: '?dia=7.5 (75 %)', esperado: 4218.75, ...(await pasos(p)) })
  await ctx.close()
}
{ // reloj del servidor: hoy es 2026-11-24 (antes del inicio, 0 pasos). Un cliente 6 días adelantado daría ~25 % si usara su propia hora.
  const { p, ctx } = await abrir('', { reloj: 6 * 86400000 })
  log({ caso: 'cliente +6 dias, sin perillas', esperado: 0, ...(await pasos(p)), offsetMs: await p.evaluate(async () => { const r = await fetch('/api/topologia'); return Date.parse(r.headers.get('date')) - Date.now() }) })
  await ctx.close()
}
{ // slider del DebugPanel
  const { p, ctx } = await abrir('')
  await p.click('.debugPanel__abrir')
  await p.locator('.debugPanel input[type=checkbox]').check()
  await p.locator('.debugPanel input[type=range]').last().fill('0.75')
  await p.waitForTimeout(800)
  log({ caso: 'slider 75 %', esperado: 4218.75, ...(await pasos(p)) })
  await p.locator('.debugPanel input[type=range]').last().fill('1')
  await p.waitForTimeout(800)
  log({ caso: 'slider 100 %', esperado: 5000, ...(await pasos(p)) })
  await p.locator('.debugPanel input[type=checkbox]').uncheck()
  await p.waitForTimeout(800)
  log({ caso: 'slider apagado: vuelve al reloj', esperado: 0, ...(await pasos(p)) })
  await ctx.close()
}
{ // la estructura vive solo en la red que la tiene
  const { p, ctx } = await abrir('&dia=5')
  const existe = () => p.evaluate(() => !!window.__sinapsis._crec)
  const escenas = []
  escenas.push({ ryzomatica: await existe() })
  await p.evaluate(() => history.pushState({ sinapsis: { idx: 1, t: 'reemplazo' } }, '', '/entidad/tropical-poncho?red=tropical-poncho&dia=5'))
  await p.waitForTimeout(6000)
  escenas.push({ tropical: await existe() })
  await p.evaluate(() => history.back())
  await p.waitForTimeout(6000)
  escenas.push({ ryzomaticaDeNuevo: await existe(), ...(await pasos(p)) })
  log({ caso: 'vida al cambiar de red', escenas, esperado: [true, false, true] })
  await ctx.close()
}
writeFileSync(process.argv[2], salida.map((o) => JSON.stringify(o)).join('\n') + '\n')
await b.close()
