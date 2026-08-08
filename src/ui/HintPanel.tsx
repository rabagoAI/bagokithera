import { CLEAN_STEPS, selectPhase, useMechanismStore } from '../lib/useMechanismStore'

/** Texto de la instrucción según en qué punto está el usuario */
const HINTS: Record<ReturnType<typeof selectPhase>, string> = {
  dirty: 'Haz click en la caja para empezar a limpiarla',
  clean: 'Ahora haz click en la tapa para abrirla',
  open: 'Fragmento A del mecanismo, recuperado del pecio de Anticitera',
}

export function HintPanel() {
  const phase = useMechanismStore(selectPhase)
  const cleanLevel = useMechanismStore((s) => s.cleanLevel)

  const remaining = Math.max(0, Math.round((1 - cleanLevel) * CLEAN_STEPS))

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 sm:p-8">
      <div className="max-w-md rounded-lg border border-white/10 bg-abyss/70 px-5 py-4 backdrop-blur-sm">
        <p className="text-sm font-medium tracking-wide text-slate-100 sm:text-base">
          {HINTS[phase]}
        </p>

        {phase === 'dirty' && (
          <>
            {/* Barra de progreso de la limpieza */}
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-bronze transition-[width] duration-500 ease-out"
                style={{ width: `${cleanLevel * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {remaining === 1
                ? 'Queda 1 pasada de limpieza'
                : `Quedan ${remaining} pasadas de limpieza`}
            </p>
          </>
        )}

        <p className="mt-3 text-xs text-slate-500">
          Arrastra para orbitar · Rueda para acercar
        </p>
      </div>
    </div>
  )
}
