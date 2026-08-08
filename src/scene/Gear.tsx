import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { gearRootRadius, gearTipRadius, type GearPlacement } from '../lib/gears'

/** Grosor de la rueda */
const THICKNESS = 0.035
/** Radio del eje central */
const AXLE_RADIUS = 0.022

/**
 * Contorno de la rueda dentada como THREE.Shape.
 *
 * Cada diente se recorre en cuatro tramos —valle, flanco de subida, cresta y
 * flanco de bajada— con un perfil trapezoidal. No es una involuta real, que
 * es lo que llevan los engranajes modernos, pero a este tamaño la diferencia
 * no se aprecia y el contorno queda mucho más simple.
 */
function createGearShape(teeth: number): THREE.Shape {
  const shape = new THREE.Shape()
  const tip = gearTipRadius(teeth)
  const root = gearRootRadius(teeth)
  const step = (Math.PI * 2) / teeth

  const pointAt = (radius: number, angle: number): [number, number] => [
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
  ]

  for (let i = 0; i < teeth; i++) {
    const base = i * step

    // Fracciones del paso: el diente ocupa algo menos que el valle, que es
    // lo que deja hueco para que encaje el diente de la rueda contraria
    const [x0, y0] = pointAt(root, base)
    const [x1, y1] = pointAt(tip, base + step * 0.3)
    const [x2, y2] = pointAt(tip, base + step * 0.55)
    const [x3, y3] = pointAt(root, base + step * 0.78)

    if (i === 0) shape.moveTo(x0, y0)
    else shape.lineTo(x0, y0)

    shape.lineTo(x1, y1)
    shape.lineTo(x2, y2)
    shape.lineTo(x3, y3)
  }

  shape.closePath()
  return shape
}

/**
 * Agujero central por donde pasa el eje. Como agujero de la Shape, sale
 * vaciado en la extrusión en vez de tener que restar geometría.
 */
function createAxleHole(): THREE.Path {
  const hole = new THREE.Path()
  hole.absarc(0, 0, AXLE_RADIUS, 0, Math.PI * 2, true)
  return hole
}

function createGearGeometry(teeth: number): THREE.ExtrudeGeometry {
  const shape = createGearShape(teeth)
  shape.holes.push(createAxleHole())

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: THICKNESS,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 1,
    curveSegments: 4,
  })

  // La extrusión crece en +Z desde el plano XY. La centramos y la tumbamos
  // para que la rueda quede horizontal, con su eje de giro en Y
  geometry.translate(0, 0, -THICKNESS / 2)
  geometry.rotateX(-Math.PI / 2)
  geometry.computeVertexNormals()

  return geometry
}

interface GearProps {
  placement: GearPlacement
  material: THREE.Material
  /** Altura a la que flota la rueda dentro de la caja */
  y: number
}

/**
 * Una rueda dentada del tren, con su eje.
 *
 * No anima nada por su cuenta: GearTrain le pasa la rotación, porque el
 * ángulo de todas las ruedas sale de un único cálculo compartido.
 */
export function Gear({ placement, material, y }: GearProps) {
  const geometry = useMemo(() => createGearGeometry(placement.teeth), [placement.teeth])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group position={[placement.x, y, placement.z]}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />

      {/* Eje: sobresale por ambas caras, como un pasador real */}
      <mesh material={material} castShadow>
        <cylinderGeometry args={[AXLE_RADIUS * 0.85, AXLE_RADIUS * 0.85, THICKNESS * 3.2, 12]} />
      </mesh>
    </group>
  )
}
