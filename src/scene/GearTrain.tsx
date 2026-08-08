import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BOX } from '../lib/boxLayout'
import { gearAngle, layoutTrain, trainBounds } from '../lib/gears'
import { PALETTE } from '../lib/palette'
import { getPatinaTextures } from '../lib/textures'
import { useMechanismStore } from '../lib/useMechanismStore'
import { enableXray } from '../lib/xray'
import { Crank } from './Crank'
import { Gear } from './Gear'

/**
 * Altura a la que se monta el tren dentro de la caja. Lo más arriba que
 * permite la manivela, que sobresale unos 0.39 y no debe chocar con la tapa
 * cerrada (el borde está en BOX.bodyHeight = 0.9).
 */
const TRAIN_Y = 0.46

/**
 * El tren de engranajes dentro de la caja.
 *
 * Todas las ruedas giran a partir de un único ángulo de manivela: sus
 * posiciones y ratios los calcula `lib/gears.ts`, que no sabe nada de Three.
 * Aquí solo se lee ese resultado y se aplica.
 */
export function GearTrain() {
  const gearRefs = useRef<(THREE.Group | null)[]>([])
  const crankRef = useRef<THREE.Group>(null)

  // El layout es determinista, así que se calcula una vez
  const placements = useMemo(() => layoutTrain(), [])

  /** Desplazamiento para centrar el tren en el hueco de la caja */
  const offset = useMemo(() => {
    const bounds = trainBounds()
    return {
      x: -(bounds.minX + bounds.maxX) / 2,
      z: -(bounds.minZ + bounds.maxZ) / 2,
    }
  }, [])

  /** Bronce de las piezas internas, protegidas del mar por la caja */
  const bronze = useMemo(() => {
    const textures = getPatinaTextures()

    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.bronzeDeep),
      map: textures.map,
      roughnessMap: textures.roughnessMap,
      // Más mate y menos metálico que la placa exterior: dentro de la caja
      // hay poca luz, y con metalness alto las ruedas salían lavadas y planas
      roughness: 0.62,
      metalness: 0.38,
      side: THREE.DoubleSide,
    })
  }, [])

  /** Control de la mezcla hacia la radiografía */
  const xray = useMemo(() => enableXray(bronze), [bronze])

  useEffect(() => () => bronze.dispose(), [bronze])

  useFrame((_, delta) => {
    const { crankAngle, xrayMode } = useMechanismStore.getState()

    // Cada rueda gira su propio múltiplo del ángulo de la manivela
    placements.forEach((placement, index) => {
      const gear = gearRefs.current[index]
      if (gear) gear.rotation.y = gearAngle(placement, crankAngle)
    })

    // La manivela es solidaria con la rueda motriz, que tiene ratio 1
    if (crankRef.current) crankRef.current.rotation.y = crankAngle

    // Transición suave hacia el modo radiografía
    xray.set(THREE.MathUtils.damp(xray.get(), xrayMode ? 1 : 0, 5, delta))
  })

  return (
    <>
      {/* Luz de relleno dentro de la caja. El interior queda en sombra de la
          cenital y de la propia tapa abierta, y sin esto las ruedas se leen
          como siluetas planas: son los reflejos los que dibujan los dientes */}
      <pointLight
        position={[0, 0.78, 0]}
        intensity={1.6}
        distance={2.6}
        decay={2}
        color="#ffe0b0"
      />

      {/* Bancada donde se apoyan los ejes. Va fuera del grupo desplazado,
          porque se centra respecto a la caja y no respecto al tren */}
      <mesh position={[0, BOX.wallThickness + 0.012, 0]} material={bronze} receiveShadow>
        <boxGeometry
          args={[
            BOX.width - BOX.wallThickness * 2.6,
            0.02,
            BOX.depth - BOX.wallThickness * 2.6,
          ]}
        />
      </mesh>

      <group position={[offset.x, 0, offset.z]}>
        {placements.map((placement, index) => (
          <group
            key={placement.id}
            ref={(node) => {
              gearRefs.current[index] = node
            }}
            position={[placement.x, TRAIN_Y, placement.z]}
          >
            {/* La rueda va en el origen del grupo, porque es el grupo el que
                aplica el giro: si llevara posición propia, orbitaría */}
            <Gear placement={{ ...placement, x: 0, z: 0 }} material={bronze} y={0} />
          </group>
        ))}

        {/* Manivela sobre el eje de la rueda motriz */}
        <group position={[placements[0].x, TRAIN_Y, placements[0].z]}>
          <Crank ref={crankRef} material={bronze} />
        </group>
      </group>
    </>
  )
}
