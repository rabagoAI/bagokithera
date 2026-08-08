import { create } from 'zustand'

/** Cuántos clicks hacen falta para retirar toda la concreción */
export const CLEAN_STEPS = 4

export type MechanismPhase = 'dirty' | 'clean' | 'open'

interface MechanismState {
  /** Progreso de limpieza, de 0 (cubierto de concreción) a 1 (bronce a la vista) */
  cleanLevel: number
  /** Tapa abierta sobre su bisagra */
  lidOpen: boolean

  /** Retira una tanda de concreción (1 / CLEAN_STEPS del total) */
  clean: () => void
  /** Abre la tapa. Sin efecto si la caja todavía está sucia */
  openLid: () => void
  /** Vuelve al estado inicial (útil para depurar la escena) */
  reset: () => void
}

export const useMechanismStore = create<MechanismState>((set) => ({
  cleanLevel: 0,
  lidOpen: false,

  clean: () =>
    set((state) => ({
      cleanLevel: Math.min(1, state.cleanLevel + 1 / CLEAN_STEPS),
    })),

  openLid: () =>
    set((state) => (state.cleanLevel >= 1 ? { lidOpen: true } : state)),

  reset: () => set({ cleanLevel: 0, lidOpen: false }),
}))

/**
 * Fase derivada del estado, para que la UI no tenga que recalcular la misma
 * condición en varios sitios.
 */
export function selectPhase(state: MechanismState): MechanismPhase {
  if (state.cleanLevel < 1) return 'dirty'
  return state.lidOpen ? 'open' : 'clean'
}
