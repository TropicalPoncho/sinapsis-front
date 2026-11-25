// Verificación funcional de 261124-ryz2 contra el 3003 aislado: perillas, reloj del servidor, slider, vida de la estructura al cambiar de
// red, y que tocar la estructura (o una raíz) enfoca el nodo correcto (el blanco de raycast invisible). uso: node verificar.mjs <salida.jsonl>
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
const require = createRequire(process.env.PLAYWRIGHT_DIR ?? 'file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const base = 'http://localhost:3003'
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const salida = []
const log = (o) => { salida.push(o); console.log(JSON.stringify(o)) }
const pasos = (p) => p.evaluate(() => { const e = window.__sinapsis, i = e._instCrec?.(); return i ? { modo: e._modoCrec, pasos: i.pasos, total: i.total, dibujados: i.geometria.drawRange.count / 2 } : null })

async function abrir(ruta, query, { reloj = 0, viewport = { width: 1280, height: 800 } } = {}) {
  const ctx = await b.newContext({ viewport })
  if (reloj) await ctx.addInitScript((d) => { const n = Date.now.bind(Date); Date.now = () => n() + d }, reloj)
  const p = await ctx.newPage()
  p.on('pageerror', (e) => log({ pageerror: e.message }))
  await p.goto(base + ruta + (ruta.includes('?') ? '&' : '?') + 'perf=1&semilla=ryz2' + query, { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(3000)
  return { p, ctx }
}
// dónde cae en pantalla un punto del mundo (x, y, z) o el centro de un nodo por nombre
const enPantalla = (p, nombre) => p.evaluate((nombre) => {
  const e = window.__sinapsis, n = e.graph.graphData().nodes.find((m) => m.name === nombre)
  const v = e.camera.position.clone().set(n.x, n.y, n.z).project(e.camera)
  return { x: Math.round(((v.x + 1) / 2) * innerWidth), y: Math.round(((1 - v.y) / 2) * innerHeight) }
}, nombre)

{ // ?t= : el 30/11 a las 00:00 (-03:00) es el 50 % del recorrido -> smoothstep(0.5) * 5000 = 2500
  const { p, ctx } = await abrir('/', '&red=ryzomatica&t=2026-11-30T00:00:00-03:00')
  log({ caso: '?t=2026-11-30 (50 %)', esperado: 2500, ...(await pasos(p)) })
  await ctx.close()
}
{ // ?dia=7.5
  const { p, ctx } = await abrir('/', '&red=ryzomatica&dia=7.5')
  log({ caso: '?dia=7.5 (75 %)', esperado: 4218.75, ...(await pasos(p)) })
  await ctx.close()
}
{ // reloj del servidor: un cliente 6 días adelantado daría ~25 % si usara su propia hora; hoy (antes del 25/11 00:00 -03:00 o después) lo que dé el servidor
  const { p, ctx } = await abrir('/', '&red=ryzomatica', { reloj: 6 * 86400000 })
  const r = await pasos(p)
  const off = await p.evaluate(async () => { const r = await fetch('/api/topologia'); return Date.parse(r.headers.get('date')) - Date.now() })
  log({ caso: 'cliente +6 dias, sin perillas', ...r, offsetMs: off, nota: 'pasos esperados = pasosEn(hora del servidor), no la del cliente' })
  await ctx.close()
}
{ // slider del DebugPanel
  const { p, ctx } = await abrir('/', '&red=ryzomatica')
  await p.click('.debugPanel__abrir')
  await p.locator('.debugPanel input[type=checkbox]').check()
  await p.locator('.debugPanel input[type=range]').last().fill('0.75')
  await p.waitForTimeout(800)
  log({ caso: 'slider 75 %', esperado: 4218.75, ...(await pasos(p)) })
  await p.locator('.debugPanel input[type=range]').last().fill('1')
  await p.waitForTimeout(800)
  log({ caso: 'slider 100 %', esperado: 5000, ...(await pasos(p)) })
  await ctx.close()
}
{ // modo completo en su red, mini en cualquier otra que contenga el nodo, nada en una que no
  const { p, ctx } = await abrir('/', '&red=ryzomatica&dia=5')
  const escenas = [{ ryzomatica: await pasos(p) }]
  await p.evaluate(() => history.pushState({ sinapsis: { idx: 1, t: 'reemplazo' } }, '', '/entidad/laboratorios?red=laboratorios&dia=5'))
  await p.waitForTimeout(6000)
  escenas.push({ laboratorios: await pasos(p) })
  await p.evaluate(() => history.pushState({ sinapsis: { idx: 2, t: 'reemplazo' } }, '', '/entidad/tropical-poncho?red=tropical-poncho&dia=5'))
  await p.waitForTimeout(6000)
  escenas.push({ tropical: await pasos(p) })
  await p.evaluate(() => history.go(-2))
  await p.waitForTimeout(6000)
  escenas.push({ ryzomaticaDeNuevo: await pasos(p) })
  log({ caso: 'vida al cambiar de red', escenas, esperado: 'completo, mini, null, completo (mismo paso)' })
  await ctx.close()
}
{ // seleccionable: tocar la estructura enfoca Ryzomatica; tocar una raíz enfoca esa raíz
  const { p, ctx } = await abrir('/', '&red=ryzomatica&dia=10')
  const antes = p.url()
  const c = await enPantalla(p, 'Tropical Poncho')
  await p.mouse.move(c.x - 75, c.y - 45); await p.waitForTimeout(400); await p.mouse.move(c.x - 74, c.y - 44); await p.waitForTimeout(400) // el hover del raycaster va con throttle: mover antes de tocar
  await p.mouse.click(c.x - 74, c.y - 44) // dentro de la estructura, lejos de las raíces
  await p.waitForTimeout(3500)
  log({ caso: 'clic en la estructura', urlAntes: antes, urlDespues: p.url(), titulo: await p.locator('h1').first().innerText().catch(() => null) })
  await p.goto(base + '/?red=ryzomatica&dia=10&perf=1&semilla=ryz2')
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(3000)
  const r = await enPantalla(p, 'Bosque Gracias')
  await p.mouse.move(r.x, r.y); await p.waitForTimeout(400); await p.mouse.move(r.x + 1, r.y); await p.waitForTimeout(400)
  await p.mouse.click(r.x + 1, r.y)
  await p.waitForTimeout(3500)
  log({ caso: 'clic en la raíz Bosque Gracias', urlDespues: p.url(), titulo: await p.locator('h1').first().innerText().catch(() => null) })
  await ctx.close()
}
{ // la versión mini (desde afuera) también es seleccionable: hover y clic sobre ella enfocan a Ryzomatica
  const { p, ctx } = await abrir('/', '&red=laboratorios&dia=10')
  const c = await p.evaluate(() => { const e = window.__sinapsis, n = e.graph.graphData().nodes[0], v = e.camera.position.clone().set(n.x, n.y, n.z).project(e.camera); return { x: Math.round(((v.x + 1) / 2) * innerWidth), y: Math.round(((1 - v.y) / 2) * innerHeight) } })
  await p.evaluate(() => { const e = window.__sinapsis; window.__ev = []; const o = e._emitir.bind(e); e._emitir = (n, ...a) => { window.__ev.push(n + ':' + (a[0]?.name ?? '')); return o(n, ...a) } })
  await p.mouse.move(c.x, c.y); await p.waitForTimeout(400); await p.mouse.move(c.x + 1, c.y); await p.waitForTimeout(400)
  await p.mouse.click(c.x + 1, c.y); await p.waitForTimeout(2500)
  log({ caso: 'clic en la mini', eventos: (await p.evaluate(() => window.__ev)).filter((x) => !x.startsWith('nodeFocus')).slice(0, 6), url: p.url() })
  await ctx.close()
}
writeFileSync(process.argv[2], salida.map((o) => JSON.stringify(o)).join('\n') + '\n')
await b.close()
