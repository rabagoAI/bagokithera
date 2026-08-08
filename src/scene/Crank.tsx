import * as THREE from 'three'
import { forwardRef } from 'react'

/**
 * Manivela de accionamiento.
 *
 * Va montada sobre el eje de la rueda motriz, girando en horizontal. En el
 * mecanismo real la manivela es lateral, pero aquí las ruedas están tumbadas
 * para que se vean al abrir la tapa: una manivela en el costado necesitaría
 * un engranaje cónico que no existe en el modelo, así que se vería girar algo
 * que no está conectado a nada.
 */
export const Crank = forwardRef<THREE.Group, { material: THREE.Material }>(
  function Crank({ material }, ref) {
    return (
      <group ref={ref}>
        {/* Columna sobre el eje de la rueda motriz */}
        <mesh position={[0, 0.16, 0]} material={material} castShadow>
          <cylinderGeometry args={[0.016, 0.016, 0.32, 12]} />
        </mesh>

        {/* Brazo horizontal */}
        <mesh position={[0.075, 0.31, 0]} material={material} castShadow>
          <boxGeometry args={[0.17, 0.022, 0.03]} />
        </mesh>

        {/* Pomo del extremo */}
        <mesh position={[0.15, 0.35, 0]} material={material} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.07, 12]} />
        </mesh>
      </group>
    )
  },
)
