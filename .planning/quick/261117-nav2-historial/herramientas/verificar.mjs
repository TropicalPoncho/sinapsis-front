// Verificación de 261117-nav2 (historial desplegable) contra un `next dev -p 3003` aislado (copia de src, TOPOLOGIA_FIXTURE=1).
// uso: node verificar.mjs <dirCapturas> <salida.jsonl> [prefijo]   (el prefijo va delante del nombre de las capturas)
import { createRequire } from 'node:module'
import { mkdirSync, appendFileSync } from 'node:fs'
const require = createRequire('file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const [, , dir, salidaArchivo, pre = ''] = process.argv
mkdirSync(dir, { recursive: true })
const base = 'http://localhost:3003'
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const salida = []
const log = (o) => { salida.push(o); console.log(JSON.stringify(o)) }
const VPS = [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]

async function abrir(viewport, ruta, { sinNavigation = false, reducido = false } = {}) {
  const ctx = await b.newContext({ viewport, hasTouch: viewport.width < 800, isMobile: viewport.width < 800, reducedMotion: reducido ? 'reduce' : 'no-preference' })
  // sin Navigation API: lo que verían Safari/Firefox anteriores
  if (sinNavigation) await ctx.addInitScript(() => { Object.defineProperty(window, 'navigation', { value: undefined, configurable: true }) })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => log({ pageerror: e.message }))
  await p.goto(base + ruta + (ruta.includes('?') ? '&' : '?') + 'perf=1&semilla=nav2', { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(3500)
  return { p, ctx }
}
const foto = (p, nombre) => p.screenshot({ path: `${dir}/${pre}${nombre}.png` })
const estado = (p) => p.evaluate(() => {
  const l = document.querySelector('.historial__lista'), bt = document.querySelector('.historial__boton')
  const tr = document.querySelector('.tituloRed, .floatingTitle')
  const nav = window.navigation
  return {
    url: location.pathname + location.search, hayBoton: !!bt, exp: bt?.getAttribute('aria-expanded'),
    filas: l ? [...l.querySelectorAll('.historial__fila')].map((e) => e.textContent) : [],
    inert: l?.hasAttribute('inert'), vis: l && getComputedStyle(l).visibility, foco: document.activeElement?.className + ':' + document.activeElement?.textContent?.slice(0, 30),
    tituloLeft: tr && Math.round(tr.getBoundingClientRect().left), entradas: nav ? nav.entries().length : history.length,
    titulo: document.querySelector('.tituloRed__red, .tituloRed__h1')?.textContent,
  }
})
const cam = (p) => p.evaluate(() => { const c = window.__sinapsis.camera.position; return [c.x, c.y, c.z].map((v) => Math.round(v * 100) / 100) })

async function recorrer(p, vp) {
  const mob = vp.width < 800
  const menu = async () => { if (mob) { await p.click('#hamburger'); await p.waitForTimeout(500) } }
  await menu(); await p.locator('.nav-item', { hasText: 'Obras' }).first().click(); await p.waitForTimeout(3500) // preview del área en la red de la entidad
  await p.click('.accion--entrar'); await p.waitForTimeout(4000) // entrar al área
  await menu(); await p.locator('.lateralFloatingMenu .branched-menu__head').first().click(); await p.waitForTimeout(3500) // un nodo del área
}

for (const [vp, viewport] of VPS) {
  // 1-9. con Navigation API
  {
    const { p, ctx } = await abrir(viewport, '/entidad/tropical-poncho?red=tropical-poncho')
    const e0 = await estado(p)
    log({ escena: `${vp} 1 deep link sin historial`, hayBoton: e0.hayBoton, tituloLeft: e0.tituloLeft, tieneNavigation: await p.evaluate(() => 'navigation' in window) })
    await foto(p, `${vp}-sin-historial`)
    await recorrer(p, viewport)
    const e1 = await estado(p)
    log({ escena: `${vp} 2 tras recorrer`, ...e1 })
    await foto(p, `${vp}-con-historial-cerrado`)
    // 3. abrir: la animación se muestrea cuadro a cuadro (clip-path de la lista) y se saca una foto a mitad
    await p.evaluate(() => {
      const l = document.querySelector('.historial__lista'); window.__muestras = []; const t0 = performance.now()
      const f = () => { window.__muestras.push([Math.round(performance.now() - t0), getComputedStyle(l).clipPath.replace(/round.*/, '').trim(), getComputedStyle(l).opacity]); if (performance.now() - t0 < 500) requestAnimationFrame(f) }
      requestAnimationFrame(f)
    })
    await p.click('.historial__boton')
    await p.waitForTimeout(90); await foto(p, `${vp}-historial-abriendo`)
    await p.waitForTimeout(600)
    const muestras = await p.evaluate(() => window.__muestras)
    const e2 = await estado(p)
    log({ escena: `${vp} 3 abierto`, ...e2, muestrasClip: [muestras[0], muestras[Math.floor(muestras.length / 3)], muestras[Math.floor(muestras.length * 2 / 3)], muestras.at(-1)] })
    await foto(p, `${vp}-historial-abierto`)
    // 4. flechas
    await p.keyboard.press('ArrowDown'); const f1 = (await estado(p)).foco
    await p.keyboard.press('ArrowUp'); const f0 = (await estado(p)).foco
    await p.keyboard.press('End'); const fEnd = (await estado(p)).foco
    log({ escena: `${vp} 4 flechas`, inicial: e2.foco, abajo: f1, arriba: f0, end: fEnd })
    // 5. Esc cierra solo el historial (URL y panel intactos)
    const urlAntes = (await estado(p)).url
    await p.keyboard.press('Escape'); await p.waitForTimeout(500)
    const e5 = await estado(p)
    log({ escena: `${vp} 5 Esc`, exp: e5.exp, inert: e5.inert, vis: e5.vis, urlIgual: e5.url === urlAntes, foco: e5.foco })
    // 6. afuera cierra
    await p.click('.historial__boton'); await p.waitForTimeout(400)
    await p.mouse.click(viewport.width - 30, Math.round(viewport.height / 2)); await p.waitForTimeout(500)
    log({ escena: `${vp} 6 afuera`, exp: (await estado(p)).exp })
    // 7. elegir el último paso (el más viejo): retrocede varios de una, sin apilar entradas
    await p.click('.historial__boton'); await p.waitForTimeout(400)
    const antes = await estado(p)
    await p.locator('.historial__fila').last().click(); await p.waitForTimeout(4500)
    const e7 = await estado(p)
    log({ escena: `${vp} 7 elegir el mas viejo`, antes: { url: antes.url, entradas: antes.entradas, filas: antes.filas }, despues: { url: e7.url, entradas: e7.entradas, filas: e7.filas, hayBoton: e7.hayBoton, titulo: e7.titulo, tituloLeft: e7.tituloLeft }, cam: await cam(p) })
    await foto(p, `${vp}-tras-elegir-el-mas-viejo`)
    // 8. Adelante del navegador sigue funcionando
    await p.goForward(); await p.waitForTimeout(500); await p.goForward(); await p.waitForTimeout(500); await p.goForward(); await p.waitForTimeout(4000)
    const e8 = await estado(p)
    log({ escena: `${vp} 8 adelante x3`, url: e8.url, filas: e8.filas })
    // 9. recarga: con Navigation API la lista sobrevive
    await p.reload(); await p.waitForFunction(() => document.querySelector('.cargando--fuera'), null, { timeout: 120000 }); await p.waitForTimeout(3500)
    const e9 = await estado(p)
    log({ escena: `${vp} 9 recarga`, url: e9.url, filas: e9.filas })
    await ctx.close()
  }
  // 10. sin Navigation API: lista en memoria
  {
    const { p, ctx } = await abrir(viewport, '/entidad/tropical-poncho?red=tropical-poncho', { sinNavigation: true })
    log({ escena: `${vp} 10 sin Navigation API`, tieneNavigation: await p.evaluate(() => !!window.navigation), hayBoton: (await estado(p)).hayBoton })
    await recorrer(p, viewport)
    await p.click('.historial__boton'); await p.waitForTimeout(500)
    const e = await estado(p)
    log({ escena: `${vp} 10b abierto sin API`, filas: e.filas })
    await foto(p, `${vp}-sin-navigation-api`)
    await p.locator('.historial__fila').nth(1).click(); await p.waitForTimeout(4500)
    const e2 = await estado(p)
    log({ escena: `${vp} 10c elegir el 2do sin API`, url: e2.url, filas: e2.filas, entradas: e2.entradas })
    await p.reload(); await p.waitForFunction(() => document.querySelector('.cargando--fuera'), null, { timeout: 120000 }); await p.waitForTimeout(3500)
    const e3 = await estado(p)
    log({ escena: `${vp} 10d recarga sin API (la lista en memoria se pierde)`, filas: e3.filas, hayBoton: e3.hayBoton })
    await ctx.close()
  }
  // 11. Esc con la expansión de la raíz abierta y el historial abierto: cierra solo el historial
  {
    const { p, ctx } = await abrir(viewport, '/entidad/obras?red=tropical-poncho')
    await p.click('.panel__cerrar'); await p.waitForTimeout(4000) // la X de un área en la red de su entidad sube al home de la entidad: raíz Tropical Poncho, con el historial atrás
    const chev = await p.locator('.tituloRed__desplegar').count()
    await p.click('.tituloRed__desplegar'); await p.waitForTimeout(1200)
    const h = await estado(p)
    await p.locator('.historial__boton').click(); await p.waitForTimeout(400)
    await foto(p, `${vp}-historial-con-raiz-abierta`)
    await p.keyboard.press('Escape'); await p.waitForTimeout(500)
    log({ escena: `${vp} 11 Esc con raiz expandida`, chevronesDelTitulo: chev, historialCerrado: (await estado(p)).exp === 'false', raizSigueAbierta: await p.locator('.tituloRed__desplegar').getAttribute('aria-expanded'), filas: h.filas, tituloLeft: h.tituloLeft })
    await ctx.close()
  }
  // 12. prefers-reduced-motion: sin transición
  {
    const { p, ctx } = await abrir(viewport, '/entidad/tropical-poncho?red=tropical-poncho', { reducido: true })
    await recorrer(p, viewport)
    const dur = await p.evaluate(() => getComputedStyle(document.querySelector('.historial__lista')).transitionDuration)
    log({ escena: `${vp} 12 reduced-motion`, transitionDuration: dur })
    await ctx.close()
  }
  // 13. lateral: ya no tiene Volver; con una sección abierta hay "cerrar sección"
  {
    const { p, ctx } = await abrir(viewport, '/entidad/rama-cerratto?red=rama-cerratto')
    if (vp === 'mobile') { await p.click('#hamburger'); await p.waitForTimeout(500) }
    await p.locator('.nav-item', { hasText: 'Participaciones' }).first().click(); await p.waitForTimeout(1500)
    const l = await p.evaluate(() => ({ cerrar: [...document.querySelectorAll('.lateral__cerrar')].map((e) => e.textContent.trim()), dice_volver: /volver/i.test(document.querySelector('.lateralFloatingMenu')?.textContent ?? '') }))
    log({ escena: `${vp} 13 lateral con seccion`, ...l })
    await foto(p, `${vp}-lateral-seccion`)
    await p.locator('.lateral__cerrar').click(); await p.waitForTimeout(1500)
    log({ escena: `${vp} 13b cerrar seccion`, lateral: await p.locator('.lateralFloatingMenu').count(), url: p.url() })
    await ctx.close()
  }
  // 14. lista lateral de un área: sin Volver (era la fila tenue de 261117-nav1)
  {
    const { p, ctx } = await abrir(viewport, '/entidad/obras')
    if (vp === 'mobile') { await p.click('#hamburger'); await p.waitForTimeout(800) }
    log({ escena: `${vp} 14 area-lista`, cerrar: await p.locator('.lateral__cerrar').count(), dice_volver: /volver/i.test(await p.locator('.lateralFloatingMenu').textContent() ?? '') })
    await foto(p, `${vp}-area-lista`)
    await ctx.close()
  }
}
await b.close()
appendFileSync(salidaArchivo, salida.map((o) => JSON.stringify(o)).join('\n') + '\n')
