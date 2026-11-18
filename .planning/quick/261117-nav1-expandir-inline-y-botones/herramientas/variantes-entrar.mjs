// Prueba 3 tratamientos de .accion--entrar inyectando CSS sobre el panel; recorta botones (desktop 2x y mobile).
import { createRequire } from 'node:module'
const require = createRequire('file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const dir = process.argv[2]
const V = {
  'A-contorno-fino': `.accion--entrar{background:rgba(255,0,128,.07);border-color:rgba(255,0,128,.75);color:#fff;font-weight:500}
    .accion--entrar svg{color:#FF0080}.accion--entrar:hover{background:rgba(255,0,128,.16);border-color:#FF0080}`,
  'B-fondo-traslucido': `.accion--entrar{background:rgba(255,0,128,.24);border-color:rgba(255,0,128,.4);color:#fff;font-weight:500;backdrop-filter:blur(8px)}
    .accion--entrar:hover{background:rgba(255,0,128,.36);border-color:rgba(255,0,128,.65)}`,
  'C-acento-en-flecha': `.accion--entrar{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.18);color:#fff;font-weight:500;backdrop-filter:blur(8px)}
    .accion--entrar svg{color:#FF0080;transition:transform 150ms ease}.accion--entrar:hover{background:rgba(255,255,255,.2)}.accion--entrar:hover svg{transform:translateX(3px)}`,
  'actual-lleno': '',
}
const b = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
for (const [vp, viewport, clip] of [['desktop', { width: 1280, height: 800 }, { x: 0, y: 90, width: 640, height: 230 }], ['mobile', { width: 390, height: 844 }, { x: 0, y: 520, width: 390, height: 324 }]]) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: vp === 'desktop' ? 2 : 1, hasTouch: vp === 'mobile', isMobile: vp === 'mobile' })
  const p = await ctx.newPage()
  await p.goto('http://localhost:3003/entidad/rama-cerratto?red=tropical-poncho&perf=1&semilla=nav1', { timeout: 120000 })
  await p.waitForFunction(() => window.__sinapsis && document.querySelector('.cargando--fuera'), null, { timeout: 120000 })
  await p.waitForTimeout(3500)
  for (const [n, css] of Object.entries(V)) {
    await p.evaluate((c) => { document.getElementById('v')?.remove(); const s = document.createElement('style'); s.id = 'v'; s.textContent = c; document.head.append(s) }, css)
    await p.waitForTimeout(300)
    await p.screenshot({ path: `${dir}/variante-${vp}-${n}.png`, clip })
  }
  await ctx.close()
}
await b.close()
