import { createRequire } from 'node:module'
const require = createRequire('file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
async function run(modo) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
  await p.goto('http://localhost:3003/entidad/tropical-poncho?red=tropical-poncho&perf=1&semilla=nav2', { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(3500)
  const cam = () => p.evaluate(() => { const c = window.__sinapsis.camera.position; return [c.x, c.y, c.z].map((v) => Math.round(v * 10) / 10) })
  await p.locator('.nav-item', { hasText: 'Obras' }).click(); await p.waitForTimeout(3500)
  const medio = await cam()
  if (modo === 'back') await p.evaluate(() => history.back())
  else { await p.click('.historial__boton'); await p.waitForTimeout(400); await p.locator('.historial__fila').first().click() }
  const t = []; for (let i = 0; i < 6; i++) { await p.waitForTimeout(1500); t.push(await cam()) }
  console.log(modo, 'preview', medio, 'tras volver', JSON.stringify(t))
}
await run('back'); await run('chevron')
await b.close()
