/**
 * Física de la transmisión del mecanismo.
 *
 * Este módulo es deliberadamente puro: no importa Three ni React, solo
 * aritmética. Así se puede probar sin montar una escena, que es lo que pide
 * el CLAUDE.md — y los ratios son justo la parte donde un signo cambiado no
 * se ve a simple vista en pantalla.
 */

/**
 * Módulo del engranaje: la constante que relaciona dientes y tamaño. En un
 * engranaje real, dos ruedas solo encajan si comparten módulo, de ahí que
 * sea único para todo el tren.
 *
 * Radio primitivo = módulo × dientes / 2
 */
export const GEAR_MODULE = 0.01

/** Altura del diente por encima del radio primitivo */
export const ADDENDUM = GEAR_MODULE
/** Profundidad del valle por debajo del radio primitivo */
export const DEDENDUM = GEAR_MODULE * 1.25

export interface GearSpec {
  id: string
  /** Número de dientes. Determina tanto el tamaño como el ratio */
  teeth: number
  /** Qué pieza del mecanismo real representa */
  label: string
  /**
   * Ángulo, en radianes, en el que se coloca el centro de esta rueda respecto
   * al de la anterior. La distancia no es libre: viene impuesta por la suma de
   * los dos radios primitivos, o los dientes no encajarían.
   */
  placementAngle: number
}

/**
 * Tren visible, con conteos de dientes documentados del mecanismo real.
 *
 * Es un subconjunto elegido para que las cuatro ruedas convivan con sus
 * proporciones correctas: la rueda b1 de 223 dientes, la más icónica, tendría
 * aquí un radio de casi 1 unidad y no cabría dentro de la caja. Sus ratios
 * están recogidos igualmente en HISTORIC_RATIOS.
 */
export const GEAR_TRAIN: GearSpec[] = [
  { id: 'b2', teeth: 64, label: 'Rueda motriz, solidaria con la manivela', placementAngle: 0 },
  { id: 'c2', teeth: 48, label: 'Primera transmisión', placementAngle: -0.22 },
  { id: 'c1', teeth: 38, label: 'Segunda transmisión', placementAngle: 0.28 },
  { id: 'd1', teeth: 24, label: 'Rueda de salida', placementAngle: -0.15 },
]

/**
 * Ratios reales del mecanismo, documentados pero todavía no representados.
 * La Fase 3 los necesitará para mover los punteros de eclipses.
 */
export const HISTORIC_RATIOS = {
  /**
   * Ciclo de saros: 223 meses sinódicos (unos 18 años y 11 días) tras los
   * cuales la geometría Sol-Tierra-Luna se repite y los eclipses vuelven a
   * darse en el mismo orden. Es el ciclo que permitía predecirlos.
   */
  saros: { driver: 223, driven: 64 },
  /**
   * Ciclo metónico: 19 años solares equivalen casi exactamente a 235 meses
   * sinódicos, lo que reconcilia calendario lunar y solar.
   */
  metonic: { driver: 235, driven: 19 },
} as const

/** Radio primitivo: la circunferencia teórica donde dos ruedas hacen contacto */
export function gearRadius(teeth: number): number {
  return (GEAR_MODULE * teeth) / 2
}

/** Radio hasta la punta del diente */
export function gearTipRadius(teeth: number): number {
  return gearRadius(teeth) + ADDENDUM
}

/** Radio hasta el fondo del valle entre dientes */
export function gearRootRadius(teeth: number): number {
  return Math.max(gearRadius(teeth) - DEDENDUM, GEAR_MODULE)
}

export interface GearPlacement extends GearSpec {
  radius: number
  /** Centro de la rueda, en el plano horizontal de la caja */
  x: number
  z: number
  /**
   * Cuánto gira esta rueda por cada vuelta de la motriz, con signo.
   * El signo alterna en cada engrane: dos ruedas en contacto giran al revés.
   */
  ratio: number
}

/**
 * Coloca el tren en cadena y calcula el ratio de cada rueda.
 *
 * Ojo con lo que este montaje NO hace: en una cadena simple como esta, el
 * ratio final solo depende de la primera y la última rueda — las de en medio
 * giran, pero no multiplican nada (son ruedas «locas»). El mecanismo real
 * consigue sus ratios enormes montando dos ruedas de distinto tamaño sobre un
 * mismo eje, algo que este tren todavía no reproduce.
 */
export function layoutTrain(train: GearSpec[] = GEAR_TRAIN): GearPlacement[] {
  const placements: GearPlacement[] = []

  train.forEach((spec, index) => {
    const radius = gearRadius(spec.teeth)

    if (index === 0) {
      placements.push({ ...spec, radius, x: 0, z: 0, ratio: 1 })
      return
    }

    const previous = placements[index - 1]

    // La distancia entre centros la impone la geometría, no el gusto:
    // si no es exactamente la suma de radios, los dientes se solapan
    const distance = previous.radius + radius

    placements.push({
      ...spec,
      radius,
      x: previous.x + Math.cos(spec.placementAngle) * distance,
      z: previous.z + Math.sin(spec.placementAngle) * distance,
      // Inversa a los dientes y de signo contrario a la rueda que la arrastra
      ratio: -previous.ratio * (previous.teeth / spec.teeth),
    })
  })

  return placements
}

/** Ángulo de una rueda, en radianes, para un giro dado de la motriz */
export function gearAngle(placement: GearPlacement, driverAngle: number): number {
  return driverAngle * placement.ratio
}

/**
 * Ratio total del tren: cuántas vueltas da la última rueda por cada vuelta
 * de la primera. Negativo si giran en sentidos opuestos.
 */
export function trainRatio(train: GearSpec[] = GEAR_TRAIN): number {
  const placements = layoutTrain(train)
  return placements[placements.length - 1].ratio
}

/** Ancho total que ocupa el tren, para comprobar que cabe en la caja */
export function trainBounds(train: GearSpec[] = GEAR_TRAIN) {
  const placements = layoutTrain(train)

  const xs = placements.flatMap((p) => [p.x - p.radius, p.x + p.radius])
  const zs = placements.flatMap((p) => [p.z - p.radius, p.z + p.radius])

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
    width: Math.max(...xs) - Math.min(...xs),
    depth: Math.max(...zs) - Math.min(...zs),
  }
}
