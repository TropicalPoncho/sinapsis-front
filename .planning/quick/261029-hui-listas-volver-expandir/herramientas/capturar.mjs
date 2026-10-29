// Capturas y chequeos de 261029-hui contra el dev server de la copia (3003, TOPOLOGIA_FIXTURE con la red de los CSV).
// uso: node capturar.mjs <dirCapturas> <prefijo>
import { createRequire } from 'node:module'
import { mkdirSync, appendFileSync } from 'node:fs'
const require = createRequire('file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const [, , dir, pre = ''] = process.argv
mkdirSync(dir, { recursive: true })
const base = 'http://localhost:3003'
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const salida = []
const log = (o) => { salida.push(o); console.log(JSON.stringify(o)) }

async function abrir(viewport, ruta) {
  const ctx = await b.newContext({ viewport, hasTouch: viewport.width < 800, isMobile: viewport.width < 800 })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => log({ pageerror: e.message }))
  await p.goto(base + ruta + (ruta.includes('?') ? '&' : '?') + 'perf=1&semilla=hui', { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(3500)
  return { p, ctx }
}
const alPortfolio = (p) => p.evaluate(() => { const e = document.querySelector('.expandido'); const c = document.querySelector('.expandido__creditos'); e.style.scrollBehavior = 'auto'; e.scrollTop = c.getBoundingClientRect().top + e.scrollTop - 140 }).then(() => p.waitForTimeout(900))
const foto = (p, nombre) => p.screenshot({ path: `${dir}/${pre}${nombre}.png` })

for (const [nombreVp, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
  // 1. Lista lateral de un área (Obras de Tropical): orden, Próximos/Pasados y Volver abajo.
  {
    const { p, ctx } = await abrir(viewport, '/entidad/obras')
    if (nombreVp === 'mobile') { await p.click('#hamburger'); await p.waitForTimeout(800) }
    const r = await p.evaluate(() => {
      const nav = document.querySelector('.lateralFloatingMenu')
      const volver = nav?.querySelector('.accion--lateral')
      const lista = nav?.querySelector('.branched-menu')
      const filas = [...(lista?.children ?? [])].filter((e) => e.matches('.branched-menu__titulo, .branched-menu__section')).map((e) => e.classList.contains('branched-menu__titulo') ? `[${e.textContent}]` : e.textContent.trim())
      const rv = volver?.getBoundingClientRect(), rl = lista?.getBoundingClientRect()
      return { filas, volverTop: rv && Math.round(rv.top), listaBottom: rl && Math.round(rl.bottom), volverEsUltimo: nav?.lastElementChild === volver, volverTexto: volver?.textContent }
    })
    log({ escena: `${nombreVp} lista lateral /entidad/obras`, ...r })
    await foto(p, `${nombreVp}-1-lista-obras-volver-abajo`)
    await ctx.close()
  }
  // 2. Panel con Expandir y Entrar (Tropical): estilos distintos.
  {
    const { p, ctx } = await abrir(viewport, '/entidad/rama-cerratto?red=tropical-poncho')
    const r = await p.evaluate(() => [...document.querySelectorAll('.panel__botones .accion')].map((e) => {
      const c = getComputedStyle(e); return { texto: e.textContent.trim(), clase: e.className, fondo: c.backgroundColor, borde: c.borderTopColor, svg: !!e.querySelector('svg') }
    }))
    log({ escena: `${nombreVp} panel Rama (botones)`, botones: r })
    await foto(p, `${nombreVp}-2-panel-expandir-vs-entrar`)
    await ctx.close()
  }
  // 3. Sello Rojo: entidad con portfolio y sin About -> Expandir, y la ficha solo con Portfolio.
  {
    const { p, ctx } = await abrir(viewport, '/entidad/sello-rojo?red=tropical-poncho')
    const botones = await p.evaluate(() => [...document.querySelectorAll('.panel__botones .accion')].map((e) => e.textContent.trim()))
    log({ escena: `${nombreVp} panel Sello Rojo`, botones })
    await foto(p, `${nombreVp}-3-panel-sello-rojo`)
    await p.click('.accion--expandir')
    await p.waitForSelector('.expandido')
    await p.waitForTimeout(1800)
    const r = await p.evaluate(() => ({ columnas: document.querySelectorAll('.expandido__cuerpo > .expandido__columna').length, creditos: document.querySelector('.expandido__creditos')?.textContent.slice(0, 160), solo: !!document.querySelector('.expandido__creditos--solo') }))
    log({ escena: `${nombreVp} ficha Sello Rojo`, ...r })
    await alPortfolio(p)
    await foto(p, `${nombreVp}-4-ficha-sello-rojo-solo-portfolio`)
    await ctx.close()
  }
  // 4. Ficha de Rama: Próximos / Pasados en el portfolio.
  {
    const { p, ctx } = await abrir(viewport, '/entidad/rama-cerratto?red=tropical-poncho')
    await p.click('.accion--expandir')
    await p.waitForSelector('.expandido')
    await p.waitForTimeout(1800)
    const r = await p.evaluate(() => [...document.querySelectorAll('.expandido__grupo')].map((g) => ({ grupo: g.querySelector('h4')?.textContent, subs: [...g.querySelectorAll('.expandido__sub')].map((s) => s.textContent), items: [...g.querySelectorAll('li')].slice(0, 5).map((l) => l.textContent) })))
    log({ escena: `${nombreVp} ficha Rama`, grupos: r })
    await alPortfolio(p)
    await foto(p, `${nombreVp}-5-ficha-rama-proximos-pasados`)
    await ctx.close()
  }
  // 5. Ficha de Tropical: sin Integrantes ni Ex integrantes.
  {
    const { p, ctx } = await abrir(viewport, '/entidad/tropical-poncho?red=rama-cerratto')
    // en su propia red el panel no ofrece Entrar pero sí Expandir
    await p.click('.accion--expandir')
    await p.waitForSelector('.expandido')
    await p.waitForTimeout(1800)
    const r = await p.evaluate(() => [...document.querySelectorAll('.expandido__grupo-titulo')].map((e) => e.textContent))
    const desc = await p.evaluate(() => document.querySelector('.expandido__bajada')?.textContent)
    log({ escena: `${nombreVp} ficha Tropical`, grupos: r, descripcionBreve: desc })
    await foto(p, `${nombreVp}-6a-ficha-tropical-descripcion`)
    await alPortfolio(p)
    await foto(p, `${nombreVp}-6b-ficha-tropical-sin-integrantes`)
    await ctx.close()
  }
}
await b.close()
appendFileSync(`${dir}/${pre}resultados.jsonl`, salida.map((o) => JSON.stringify(o)).join('\n') + '\n')
