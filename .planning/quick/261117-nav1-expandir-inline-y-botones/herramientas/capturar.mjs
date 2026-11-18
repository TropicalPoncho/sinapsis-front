// Capturas de 261117-nav1 contra el dev server de la copia aislada (3003, TOPOLOGIA_FIXTURE).
// uso: node capturar.mjs <dirCapturas> <prefijo> [escena,escena,...]
import { createRequire } from 'node:module'
import { mkdirSync, appendFileSync } from 'node:fs'
const require = createRequire('file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const [, , dir, pre = '', solo = ''] = process.argv
mkdirSync(dir, { recursive: true })
const base = 'http://localhost:3003'
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const salida = []
const log = (o) => { salida.push(o); console.log(JSON.stringify(o)) }
async function abrir(viewport, ruta) {
  const ctx = await b.newContext({ viewport, hasTouch: viewport.width < 800, isMobile: viewport.width < 800 })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => log({ pageerror: e.message }))
  await p.goto(base + ruta + (ruta.includes('?') ? '&' : '?') + 'perf=1&semilla=nav1', { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(3500)
  return { p, ctx }
}
const foto = (p, nombre) => p.screenshot({ path: `${dir}/${pre}${nombre}.png` })
const tiene = (p, sel) => p.locator(sel).count().then((n) => n > 0)
const quiere = (n) => !solo || solo.split(',').includes(n)
// escenas: [id, ruta, pasos(p, vp)]
const escenas = [
  ['panel', '/entidad/rama-cerratto?red=tropical-poncho', async () => {}],
  ['expandido', '/entidad/rama-cerratto?red=tropical-poncho', async (p) => { await p.click('.accion--expandir'); await p.waitForTimeout(1500) }],
  ['expandido-fondo', '/entidad/rama-cerratto?red=tropical-poncho', async (p) => {
    await p.click('.accion--expandir'); await p.waitForTimeout(1200)
    await p.evaluate(() => { const e = document.querySelector('.panel'); e.scrollTop = e.scrollHeight }); await p.waitForTimeout(600)
  }],
  ['raiz', '/entidad/tropical-poncho?red=tropical-poncho', async () => {}],
  ['raiz-abierta', '/entidad/tropical-poncho?red=tropical-poncho', async (p) => { await p.click('.tituloRed__desplegar'); await p.waitForTimeout(1500) }],
  ['menu-mobile', '/entidad/tropical-poncho?red=tropical-poncho', async (p, vp) => { if (vp.width < 800) { await p.click('#hamburger'); await p.waitForTimeout(800) } }],
  ['area-lista', '/entidad/obras', async (p, vp) => { if (vp.width < 800) { await p.click('#hamburger'); await p.waitForTimeout(800) } }],
  ['seccion-rol', '/entidad/rama-cerratto?red=rama-cerratto', async (p, vp) => { if (vp.width < 800) { await p.click('#hamburger'); await p.waitForTimeout(500) } await p.locator('.nav-item', { hasText: 'Participaciones' }).first().click(); await p.waitForTimeout(1200) }],
  ['obra-lista', '/obra/soma?red=soma', async (p, vp) => { if (vp.width < 800) { const h = p.locator('#hamburger'); if (await h.count()) { await h.click(); await p.waitForTimeout(800) } } }],
]
for (const [nombreVp, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const [id, ruta, pasos] of escenas) {
    if (!quiere(id)) continue
    try {
      const { p, ctx } = await abrir(viewport, ruta)
      await pasos(p, viewport)
      await foto(p, `${nombreVp}-${id}`)
      log({ escena: `${nombreVp} ${id}`, ok: true })
      await ctx.close()
    } catch (e) { log({ escena: `${nombreVp} ${id}`, error: String(e.message).split('\n')[0] }) }
  }
}
await b.close()
appendFileSync(`${dir}/${pre}resultados.jsonl`, salida.map((o) => JSON.stringify(o)).join('\n') + '\n')
