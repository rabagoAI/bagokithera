/**
 * Generador pseudoaleatorio con semilla (mulberry32).
 *
 * Lo usamos para la distribución de las manchas de concreción y para el
 * relieve del fondo marino: queremos que "parezca" aleatorio pero que sea
 * idéntico en cada recarga, para que la escena no baile entre sesiones
 * ni entre los dos renders de React StrictMode.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Número aleatorio en el rango [min, max) */
export function randomRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}
