'use client'

import { useState } from 'react'
import { COLOR_POR_TIPO_VINCULO, COLOR_VINCULO_DEFAULT } from '../lib/red/coloresVinculo.ts'
import { FUERZAS_DEFAULT } from '../lib/red/fuerzas.ts'

// Panel de desarrollo para probar en vivo las opciones de 3d-force-graph/d3-force-3d
// (https://github.com/vasturiano/3d-force-graph). Sólo habla con el motor a través de
// `engine.configurarFuerzas`, nunca toca THREE ni `engine.graph` directamente — no rompe el
// invariante de que el único puente React/THREE es CanvasSinapsis.tsx.
// Los valores iniciales salen de FUERZAS_DEFAULT (src/lib/red/fuerzas.ts), la misma config que
// usa el motor al construirse — un solo lugar, nadie hardcodea su propia copia de estos números.
interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engine: any
}

const DAG_MODES = ['', 'td', 'bu', 'lr', 'rl', 'zout', 'zin', 'radialout', 'radialin']

export default function DebugPanel({ engine }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [cfg, setCfg] = useState({ ...FUERZAS_DEFAULT, dagMode: '' })
  const [velocidadAnimacion, setVelocidadAnimacion] = useState(1)

  const set = <K extends keyof typeof cfg>(k: K, v: (typeof cfg)[K]) => {
    setCfg((c) => ({ ...c, [k]: v }))
    engine?.configurarFuerzas({ [k]: v })
  }

  if (!abierto) {
    return (
      <button className="debugPanel__abrir" onClick={() => setAbierto(true)}>
        ⚙ debug
      </button>
    )
  }

  return (
    <div className="debugPanel">
      <div className="debugPanel__cabecera">
        <span>Fuerzas (3d-force-graph)</span>
        <button onClick={() => setAbierto(false)}>×</button>
      </div>

      {/* forceEngine no es re-configurable en vivo: 3d-force-graph no reconstruye `state.layout`
          al cambiarlo después de la primera carga, y el tick de tres-forcegraph termina llamando
          a un método que el layout viejo no tiene (crash en cada frame). Se fija al montar la
          página (?engine=ngraph), no desde acá. */}
      <label>
        numDimensions
        <select value={cfg.numDimensions} onChange={(e) => set('numDimensions', Number(e.target.value))}>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </label>

      <label>
        dagMode
        <select value={cfg.dagMode} onChange={(e) => set('dagMode', e.target.value)}>
          {DAG_MODES.map((m) => (
            <option key={m} value={m}>{m || '(ninguno)'}</option>
          ))}
        </select>
      </label>

      <label>
        dagLevelDistance: {cfg.dagLevelDistance}
        <input type="range" min={0} max={400} step={10} value={cfg.dagLevelDistance}
          onChange={(e) => set('dagLevelDistance', Number(e.target.value))} />
      </label>

      <label>
        d3AlphaMin: {cfg.d3AlphaMin}
        <input type="range" min={0} max={1} step={0.01} value={cfg.d3AlphaMin}
          onChange={(e) => set('d3AlphaMin', Number(e.target.value))} />
      </label>

      <label>
        d3AlphaDecay: {cfg.d3AlphaDecay}
        <input type="range" min={0} max={0.2} step={0.001} value={cfg.d3AlphaDecay}
          onChange={(e) => set('d3AlphaDecay', Number(e.target.value))} />
      </label>

      <label>
        d3VelocityDecay: {cfg.d3VelocityDecay}
        <input type="range" min={0} max={1} step={0.01} value={cfg.d3VelocityDecay}
          onChange={(e) => set('d3VelocityDecay', Number(e.target.value))} />
      </label>

      <label>
        linkDistance: {cfg.linkDistance}
        <input type="range" min={20} max={400} step={5} value={cfg.linkDistance}
          onChange={(e) => set('linkDistance', Number(e.target.value))} />
      </label>

      <label>
        linkDistanciaPorGrado: {cfg.linkDistanciaPorGrado}
        <input type="range" min={0} max={2} step={0.05} value={cfg.linkDistanciaPorGrado}
          onChange={(e) => set('linkDistanciaPorGrado', Number(e.target.value))} />
      </label>

      <label>
        chargeStrength: {cfg.chargeStrength}
        <input type="range" min={-100} max={0} step={1} value={cfg.chargeStrength}
          onChange={(e) => set('chargeStrength', Number(e.target.value))} />
      </label>

      <label>
        velocidad de animación (shader, no layout): {velocidadAnimacion}×
        <input type="range" min={0} max={1} step={0.05} value={velocidadAnimacion}
          onChange={(e) => {
            const v = Number(e.target.value)
            setVelocidadAnimacion(v)
            engine?.configurarAnimacion({ velocidad: v })
          }} />
      </label>

      <div className="debugPanel__leyenda">
        {Object.entries(COLOR_POR_TIPO_VINCULO).map(([tipo, color]) => (
          <span key={tipo} className="debugPanel__color">
            <i style={{ background: color }} />{tipo}
          </span>
        ))}
        <span className="debugPanel__color"><i style={{ background: COLOR_VINCULO_DEFAULT }} />otros</span>
      </div>
    </div>
  )
}
