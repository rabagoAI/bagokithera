import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createRandom, randomRange } from '../lib/random'

const COUNT = 900
/** Volumen que ocupan las partículas alrededor de la cámara */
const SPREAD = 26
const HEIGHT = 14

/**
 * Sedimento en suspensión: sistema de puntos con deriva vertical lenta.
 *
 * Cada partícula sube a su propio ritmo y, al salir por arriba, reaparece
 * por abajo (envoltura por módulo). Añadimos una oscilación lateral en seno
 * para que no parezcan caer en línea recta.
 */
export function Sediment() {
  const { geometry, speeds, phases } = useMemo(() => {
    const rng = createRandom(87)
    const positions = new Float32Array(COUNT * 3)
    const sizes = new Float32Array(COUNT)
    const speeds = new Float32Array(COUNT)
    const phases = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = randomRange(rng, -SPREAD / 2, SPREAD / 2)
      positions[i * 3 + 1] = randomRange(rng, 0, HEIGHT)
      positions[i * 3 + 2] = randomRange(rng, -SPREAD / 2, SPREAD / 2)

      sizes[i] = randomRange(rng, 0.015, 0.055)
      speeds[i] = randomRange(rng, 0.04, 0.16)
      phases[i] = randomRange(rng, 0, Math.PI * 2)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    return { geometry: geo, speeds, phases }
  }, [])

  useFrame((_, delta) => {
    const attribute = geometry.attributes.position as THREE.BufferAttribute
    const array = attribute.array as Float32Array
    // Limitamos delta para que un cambio de pestaña no teletransporte todo
    const step = Math.min(delta, 0.1)
    const time = performance.now() * 0.0002

    for (let i = 0; i < COUNT; i++) {
      const yIndex = i * 3 + 1
      array[yIndex] += speeds[i] * step

      if (array[yIndex] > HEIGHT) {
        array[yIndex] = 0
      }

      // Vaivén lateral muy leve, distinto para cada partícula
      array[i * 3] += Math.sin(time + phases[i]) * step * 0.06
    }

    attribute.needsUpdate = true
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.04}
        sizeAttenuation
        color="#9fc4d4"
        transparent
        opacity={0.42}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
