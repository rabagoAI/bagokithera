/**
 * Paleta compartida entre los materiales 3D y la UI.
 * Los mismos valores están declarados como tokens de Tailwind en index.css;
 * si cambias uno aquí, cámbialo también allí.
 */
export const PALETTE = {
  /** Azul casi negro del fondo y de la niebla */
  abyss: '#05141f',
  deep: '#0a2a3d',
  /**
   * Tinte del limo del fondo. Va claro a propósito: multiplica a la textura
   * de arena, y con un tono oscuro el suelo se confundía con la niebla y la
   * caja parecía flotar en el vacío.
   */
  silt: '#93aaa2',
  /**
   * Tintes de la madera. Ojo: multiplican al mapa de color, que ya lleva el
   * marrón de la madera empapada. Por eso van claros — con un marrón oscuro
   * aquí, el producto de ambos dejaba la caja completamente negra.
   */
  wood: '#9c9a90',
  woodClean: '#f4ead9',
  /** Realce ámbar al pasar el puntero por encima de la caja */
  woodGlow: '#6b4a2a',
  /** Bronce cubierto de pátina verdosa (estado inicial) */
  bronzePatina: '#4e7a63',
  /** Bronce recuperado tras la limpieza */
  bronzeClean: '#b08d4f',
  /** Bronce del mecanismo interno: más saturado, para despegarlo de la madera */
  bronzeDeep: '#8a6a33',
  /** Concreción marina: coral, sedimento y conchas calcificadas */
  grime: '#6b7a63',
  /** Luz cenital que se filtra desde la superficie */
  sunlight: '#cfe8ff',
} as const
