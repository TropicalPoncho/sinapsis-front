// Chequeos de comportamiento de 261117-nav1 (DOM + camara) contra el 3003 aislado. uso: node verificar.mjs <salida.jsonl>
import { createRequire } from 'node:module'
import { appendFileSync } from 'node:fs'
const require = createRequire('file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
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
const cam = (p) => p.evaluate(() => { const c = window.__sinapsis.camera.position; return [c.x, c.y, c.z].map((v) => Math.round(v * 100) / 100) })
const panel = (p) => p.evaluate(() => {
  const e = document.querySelector('.panel'); const r = e.getBoundingClientRect()
  return { visible: e.classList.contains('panel--visible'), vis: getComputedStyle(e).visibility, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), h: Math.round(r.height) }
})
for (const [vp, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
  // A. nodo no raiz: expandir/plegar inline, camara quieta, Esc pliega, X cierra
  {
    const { p, ctx } = await abrir(viewport, '/entidad/rama-cerratto?red=tropical-poncho')
    const antes = { cam: await cam(p), panel: await panel(p), url: p.url() }
    await p.click('.accion--expandir'); await p.waitForTimeout(1500)
    const abierto = await p.evaluate(() => {
      const pn = document.querySelector('.panel')
      return {
        btn: document.querySelector('.accion--expandir')?.textContent.trim(), exp: document.querySelector('.accion--expandir')?.getAttribute('aria-expanded'),
        d: document.querySelector('#panel-desplegable')?.className, inert: document.querySelector('#panel-desplegable')?.hasAttribute('inert'),
        titulo: document.querySelector('.panel__nombre')?.textContent, grupos: [...document.querySelectorAll('.desplegable__grupo-titulo')].map((e) => e.textContent),
        scrollH: pn.scrollHeight, clientH: pn.clientHeight, hscroll: pn.scrollWidth > pn.clientWidth,
      }
    })
    const despues = { cam: await cam(p), panel: await panel(p), url: p.url() }
    log({ escena: `${vp} A expandir`, antes, abierto, despues, camaraQuieta: JSON.stringify(antes.cam) === JSON.stringify(despues.cam), urlIgual: antes.url === despues.url })
    await p.keyboard.press('Escape'); await p.waitForTimeout(900)
    const plegado = await p.evaluate(() => {
      const d = document.querySelector('#panel-desplegable')
      return { btn: document.querySelector('.accion--expandir')?.textContent.trim(), inert: d.hasAttribute('inert'), vis: getComputedStyle(d).visibility, h: Math.round(d.getBoundingClientRect().height), url: location.href }
    })
    log({ escena: `${vp} A Esc pliega`, plegado, urlIgual: plegado.url === antes.url })
    await p.click('.panel__cerrar'); await p.waitForTimeout(2500)
    log({ escena: `${vp} A X cierra`, url: p.url(), panel: await panel(p) })
    await ctx.close()
  }
  // B. raiz: sin panel, el chevron abre/cierra la expansion inline; la X de la raiz pliega, no navega
  {
    const { p, ctx } = await abrir(viewport, '/entidad/tropical-poncho?red=tropical-poncho')
    const url0 = p.url()
    const cerrado = { panel: await panel(p), chevron: await p.locator('.tituloRed__desplegar').count(), exp: await p.locator('.tituloRed__desplegar').getAttribute('aria-expanded'), cam: await cam(p) }
    await p.click('.tituloRed__desplegar'); await p.waitForTimeout(1500)
    const abierto = { panel: await panel(p), exp: await p.locator('.tituloRed__desplegar').getAttribute('aria-expanded'), h2: await p.evaluate(() => document.querySelector('.panel__nombre').className), cam: await cam(p), bloques: await p.locator('.desplegable__bloque').count() }
    log({ escena: `${vp} B raiz`, cerrado, abierto, camaraQuieta: JSON.stringify(cerrado.cam) === JSON.stringify(abierto.cam), urlIgual: p.url() === url0 })
    await p.click('.panel__cerrar'); await p.waitForTimeout(1200)
    log({ escena: `${vp} B X pliega la raiz`, panel: await panel(p), urlIgual: p.url() === url0 })
    await ctx.close()
  }
  // C. raiz obra (SOMA): sin panel; chevron presente
  {
    const { p, ctx } = await abrir(viewport, '/obra/soma?red=soma')
    log({ escena: `${vp} C obra raiz`, panel: await panel(p), chevron: await p.locator('.tituloRed__desplegar').count(), url: p.url() })
    await ctx.close()
  }
}
await b.close()
appendFileSync(process.argv[2] ?? 'capturas/verificacion.jsonl', salida.map((o) => JSON.stringify(o)).join('\n') + '\n')
