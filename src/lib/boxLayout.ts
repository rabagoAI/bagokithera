/**
 * Dimensiones de la caja del mecanismo, en unidades de escena (1 unidad ≈ 20 cm).
 * Las proporciones siguen las del fragmento A real: unos 34 x 18 x 9 cm.
 *
 * Están aquí y no dentro del componente porque las necesitan también las
 * manchas de concreción (Grime) y, en la Fase 2, la caja de engranajes.
 */
export const BOX = {
  width: 2.0,
  /** Alto del cuerpo, sin contar la tapa */
  bodyHeight: 0.9,
  depth: 1.2,
  /** Grosor de la tapa */
  lidHeight: 0.14,
} as const

/** Altura total con la tapa cerrada */
export const BOX_TOTAL_HEIGHT = BOX.bodyHeight + BOX.lidHeight

/**
 * Posición del eje de la bisagra: borde trasero superior del cuerpo.
 * La tapa es hija de un grupo situado aquí, así que rotarlo en X la abre
 * como una tapa de verdad y no alrededor de su propio centro.
 */
export const HINGE_POSITION: [number, number, number] = [0, BOX.bodyHeight, -BOX.depth / 2]

/** Ángulo de apertura de la tapa, en radianes (unos 115°) */
export const LID_OPEN_ANGLE = -Math.PI * 0.64

/** Radio de la placa circular de bronce montada sobre la tapa */
export const PLATE_RADIUS = 0.42
export const PLATE_HEIGHT = 0.07

/**
 * Posición de la luz cenital. Vive aquí, y no dentro de Scene, porque el haz
 * volumétrico (SunShaft) tiene que alinearse con ella: si cada uno lleva sus
 * propios números, el volumen de luz acaba apuntando a un sitio distinto del
 * que de verdad ilumina.
 */
export const SUN_POSITION: [number, number, number] = [3.5, 11, 2.6]
