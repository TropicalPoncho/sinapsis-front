// Vista previa rápida de la forma (sin Next ni WebGL): genera la estructura y la dibuja en un canvas 2D con mezcla aditiva y el mismo alfa por
// vértice que el motor (opacidades). uso: node --experimental-strip-types preview.mts <salida.png> [n=5000] [perfil=grande] [entradas=0,0] [fraccion=1]
// Dos vistas: de frente (la cámara de entrada mira el disco de cara) y inclinada. No reemplaza las capturas del motor: sirve para iterar.
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { generar } from '../../../../src/lib/crecimiento/dendrita.ts'
import { opacidades } from '../../../../src/lib/crecimiento/estructura.ts'
const require = createRequire(process.env.PLAYWRIGHT_DIR ?? 'file:///C:/Users/ramac/.claude/skills/gstack/node_modules/')
const { chromium } = require('playwright')
const [, , salida, nArg = '5000', perfil = 'grande', entArg = '0,0', frac = '1'] = process.argv
const n = Number(nArg), entradas = entArg.split(',').map(Number)
const t0 = performance.now()
const e = generar(20261205, n, perfil as 'grande' | 'mini', entradas)
const ms = Math.round(performance.now() - t0)
const alfa = opacidades(e.padre)
const hasta = Math.floor(e.a.length * Number(frac))
const segs = Array.from({ length: hasta }, (_, s) => [...e.pos.subarray(3 * e.a[s], 3 * e.a[s] + 3), ...e.pos.subarray(3 * e.b[s], 3 * e.b[s] + 3), alfa[e.a[s]], alfa[e.b[s]]])
// extensión para el reporte
let mx = [0, 0, 0]
for (let v = 0; v < e.pos.length; v += 3) for (let c = 0; c < 3; c++) mx[c] = Math.max(mx[c], Math.abs(e.pos[v + c]))
console.log(JSON.stringify({ perfil, n, pasos: e.pasos, segmentos: e.a.length, vertices: e.pos.length / 3, ms, semiejes: mx.map((x) => +x.toFixed(2)) }))
const html = `<body style="margin:0;background:#111"><canvas id=c width=1400 height=700></canvas><script>
const S=${JSON.stringify(segs)};const c=document.getElementById('c'),g=c.getContext('2d');g.fillStyle='#111';g.fillRect(0,0,1400,700);g.globalCompositeOperation='lighter';
const col=(x)=>{const t=Math.min(1,Math.max(0,(x/1.25+1)/2));const a=[255,188,0],b=[255,0,116];return a.map((v,i)=>Math.round(v+(b[i]-v)*t))};
function vista(ox,k,tilt){const ca=Math.cos(tilt),sa=Math.sin(tilt);for(const s of S){const p=(x,y,z)=>{const Y=y*ca-z*sa,Z=y*sa+z*ca;return [ox+x*k,350-Y*k,Z]};
const A=p(s[0],s[1],s[2]),B=p(s[3],s[4],s[5]);const cc=col((s[0]+s[3])/2);const al=(s[6]+s[7])/2*0.9;
const gr=g.createLinearGradient(A[0],A[1],B[0],B[1]);gr.addColorStop(0,'rgba('+cc+','+s[6]*0.9+')');gr.addColorStop(1,'rgba('+cc+','+s[7]*0.9+')');
g.strokeStyle=gr;g.lineWidth=1;g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.stroke();}}
const k=${perfil === 'mini' ? 260 : 270};vista(350,k,0);vista(1050,k,1.0);
</script>`
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1400, height: 700 } })
await p.setContent(html)
await p.screenshot({ path: salida })
await b.close()
