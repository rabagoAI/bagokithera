import {
  CRANK_RANGE_TURNS,
  selectPhase,
  useMechanismStore,
} from '../lib/useMechanismStore'
import { GEAR_TRAIN, layoutTrain, trainRatio } from '../lib/gears'

const TAU = Math.PI * 2

/**
 * Controles del mecanismo: manivela y modo rayos-X.
 *
 * Solo aparece con la caja abierta — antes de eso no hay nada que accionar
 * y el panel solo distraería de la instrucción de limpiar.
 */
export function ControlPanel() {
  const phase = useMechanismStore(selectPhase)
  const crankAngle = useMechanismStore((s) => s.crankAngle)
  const xrayMode = useMechanismStore((s) => s.xrayMode)
  const setCrankAngle = useMechanismStore((s) => s.setCrankAngle)
  const toggleXray = useMechanismStore((s) => s.toggleXray)

  if (phase !== 'open') return null

  const turns = crankAngle / TAU
  const output = layoutTrain()[GEAR_TRAIN.length - 1]

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-6 sm:p-8">
      <div className="pointer-events-auto w-72 rounded-lg border border-white/10 bg-abyss/70 px-5 py-4 backdrop-blur-sm">
        <h2 className="text-sm font-semibold tracking-wide text-slate-100">
          Mecanismo
        </h2>

        {/* --- Manivela --- */}
        <label
          htmlFor="crank"
          className="mt-4 block text-xs font-medium text-slate-300"
        >
          Manivela
        </label>
        <input
          id="crank"
          type="range"
          min={0}
          max={CRANK_RANGE_TURNS * TAU}
          step={0.01}
          value={crankAngle}
          onChange={(event) => setCrankAngle(Number(event.target.value))}
          className="mt-2 w-full accent-bronze"
        />
        <p className="mt-1 text-xs tabular-nums text-slate-400">
          {turns.toFixed(2)} vueltas · salida {(turns * output.ratio).toFixed(2)}
        </p>

        {/* --- Rayos-X --- */}
        <button
          type="button"
          onClick={toggleXray}
          aria-pressed={xrayMode}
          className={`mt-4 w-full rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
            xrayMode
              ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200'
              : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          {xrayMode ? 'Rayos-X activados' : 'Activar rayos-X'}
        </button>

        {/* --- Ficha del tren --- */}
        <dl className="mt-4 space-y-1 border-t border-white/10 pt-3 text-xs text-slate-400">
          {layoutTrain().map((gear) => (
            <div key={gear.id} className="flex justify-between gap-3">
              <dt className="truncate" title={gear.label}>
                {gear.id} · {gear.teeth} dientes
              </dt>
              <dd className="shrink-0 tabular-nums">
                {gear.ratio > 0 ? '+' : ''}
                {gear.ratio.toFixed(2)}×
              </dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 pt-1 text-slate-300">
            <dt>Ratio del tren</dt>
            <dd className="tabular-nums">{trainRatio().toFixed(3)}×</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
