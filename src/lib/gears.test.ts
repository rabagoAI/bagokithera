import { describe, expect, it } from 'vitest'
import {
  GEAR_TRAIN,
  HISTORIC_RATIOS,
  gearAngle,
  gearRadius,
  gearRootRadius,
  gearTipRadius,
  layoutTrain,
  trainBounds,
  trainRatio,
} from './gears'
import { BOX } from './boxLayout'

describe('geometría de una rueda', () => {
  it('el radio es proporcional al número de dientes', () => {
    // Dos ruedas del mismo módulo: el doble de dientes, el doble de radio
    expect(gearRadius(48)).toBeCloseTo(gearRadius(24) * 2)
  })

  it('la punta del diente queda fuera y el valle dentro del radio primitivo', () => {
    const radius = gearRadius(38)
    expect(gearTipRadius(38)).toBeGreaterThan(radius)
    expect(gearRootRadius(38)).toBeLessThan(radius)
  })

  it('el valle nunca llega al centro, ni en la rueda más pequeña', () => {
    // Con pocos dientes el dedendum podría comerse el radio entero y dar
    // un valor negativo, que produciría una geometría invertida
    expect(gearRootRadius(6)).toBeGreaterThan(0)
  })
})

describe('montaje del tren', () => {
  const placements = layoutTrain()

  it('coloca una rueda por especificación', () => {
    expect(placements).toHaveLength(GEAR_TRAIN.length)
  })

  it('separa cada par exactamente por la suma de sus radios', () => {
    // Si esta distancia no es exacta, los dientes se solapan o no se tocan
    for (let i = 1; i < placements.length; i++) {
      const a = placements[i - 1]
      const b = placements[i]
      const distance = Math.hypot(b.x - a.x, b.z - a.z)

      expect(distance).toBeCloseTo(a.radius + b.radius)
    }
  })

  it('invierte el sentido de giro en cada engrane', () => {
    for (let i = 1; i < placements.length; i++) {
      const previous = placements[i - 1].ratio
      const current = placements[i].ratio

      expect(Math.sign(current)).toBe(-Math.sign(previous))
    }
  })

  it('hace girar más deprisa a las ruedas con menos dientes', () => {
    for (let i = 1; i < placements.length; i++) {
      const previous = placements[i - 1]
      const current = placements[i]

      if (current.teeth < previous.teeth) {
        expect(Math.abs(current.ratio)).toBeGreaterThan(Math.abs(previous.ratio))
      }
    }
  })

  it('el ratio total depende solo de la primera y la última rueda', () => {
    // Propiedad de las cadenas simples: las intermedias son ruedas locas.
    // Si esto deja de cumplirse es que se han introducido ejes compuestos
    const first = GEAR_TRAIN[0]
    const last = GEAR_TRAIN[GEAR_TRAIN.length - 1]
    const sign = GEAR_TRAIN.length % 2 === 0 ? -1 : 1

    expect(trainRatio()).toBeCloseTo((sign * first.teeth) / last.teeth)
  })

  it('cabe dentro del hueco interior de la caja', () => {
    const bounds = trainBounds()
    const innerWidth = BOX.width - BOX.wallThickness * 2
    const innerDepth = BOX.depth - BOX.wallThickness * 2

    expect(bounds.width).toBeLessThan(innerWidth)
    expect(bounds.depth).toBeLessThan(innerDepth)
  })
})

describe('rotación', () => {
  const placements = layoutTrain()

  it('deja la motriz girando exactamente lo que se le pide', () => {
    expect(gearAngle(placements[0], Math.PI)).toBeCloseTo(Math.PI)
  })

  it('no mueve nada con la manivela quieta', () => {
    for (const placement of placements) {
      // toBeCloseTo y no toBe: las ruedas de ratio negativo dan -0, que para
      // Object.is no es 0, pero como ángulo es exactamente lo mismo
      expect(gearAngle(placement, 0)).toBeCloseTo(0)
    }
  })

  it('es lineal: doble giro de manivela, doble giro de cada rueda', () => {
    for (const placement of placements) {
      expect(gearAngle(placement, 2)).toBeCloseTo(gearAngle(placement, 1) * 2)
    }
  })
})

describe('ratios históricos', () => {
  it('el saros son 223 meses sinódicos', () => {
    expect(HISTORIC_RATIOS.saros.driver).toBe(223)
  })

  it('el ciclo metónico encaja 235 meses en 19 años', () => {
    expect(HISTORIC_RATIOS.metonic.driver).toBe(235)
    expect(HISTORIC_RATIOS.metonic.driven).toBe(19)

    // 19 años de unos 12.37 meses lunares cada uno
    const monthsPerYear =
      HISTORIC_RATIOS.metonic.driver / HISTORIC_RATIOS.metonic.driven
    expect(monthsPerYear).toBeCloseTo(12.37, 1)
  })
})
