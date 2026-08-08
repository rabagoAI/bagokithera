import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { getWoodTextures } from '../lib/textures'
import {
  BOX,
  HINGE_POSITION,
  LID_OPEN_ANGLE,
  PLATE_HEIGHT,
} from '../lib/boxLayout'
import { PALETTE } from '../lib/palette'
import { useMechanismStore } from '../lib/useMechanismStore'
import { BronzePlate } from './BronzePlate'
import { Grime } from './Grime'

const woodColor = new THREE.Color(PALETTE.wood)
const woodCleanColor = new THREE.Color(PALETTE.woodClean)
const targetColor = new THREE.Color()

/**
 * Clona los mapas de madera con un repeat propio. Cada pieza necesita el suyo
 * porque el BoxGeometry da UV 0-1 a todas las caras sin tener en cuenta sus
 * proporciones: sin esto, la veta saldría estirada en las caras alargadas.
 */
function useWoodMaps(repeatX: number, repeatY: number) {
  return useMemo(() => {
    const source = getWoodTextures()
    const map = source.map.clone()
    const roughnessMap = source.roughnessMap!.clone()
    const normalMap = source.normalMap!.clone()

    for (const texture of [map, roughnessMap, normalMap]) {
      texture.repeat.set(repeatX, repeatY)
      texture.needsUpdate = true
    }

    return { map, roughnessMap, normalMap }
  }, [repeatX, repeatY])
}

/**
 * La caja del mecanismo: cuerpo de madera + tapa abisagrada con la placa
 * de bronce encima.
 *
 * Interacción:
 * - Mientras queda concreción, cualquier click sobre la caja limpia una tanda.
 * - Una vez limpia, el click sobre la tapa la abre sobre su bisagra.
 */
export function MechanismBox() {
  const hingeRef = useRef<THREE.Group>(null)
  const woodRef = useRef<THREE.MeshStandardMaterial>(null)
  // El hover va en un ref, no en estado: un re-render de React reaplicaría las
  // props declarativas sobre los materiales que estamos animando por useFrame
  const hovered = useRef(false)

  const clean = useMechanismStore((s) => s.clean)
  const openLid = useMechanismStore((s) => s.openLid)

  // Cuerpo y tapa comparten mapas: sus caras grandes miden lo mismo (2.0 x 1.2),
  // así que la veta mantiene la escala entre ambas piezas
  const wood = useWoodMaps(2, 1)

  useFrame((_, delta) => {
    const { cleanLevel, lidOpen } = useMechanismStore.getState()

    // Bisagra: la tapa persigue su ángulo objetivo en vez de saltar a él
    if (hingeRef.current) {
      const target = lidOpen ? LID_OPEN_ANGLE : 0
      hingeRef.current.rotation.x = THREE.MathUtils.damp(
        hingeRef.current.rotation.x,
        target,
        3.5,
        delta,
      )
    }

    // La madera también gana algo de tono al retirar el sedimento, y se
    // realza levemente cuando el puntero está encima
    if (woodRef.current) {
      targetColor.copy(woodColor).lerp(woodCleanColor, cleanLevel)
      woodRef.current.color.lerp(targetColor, 1 - Math.exp(-4 * delta))

      woodRef.current.emissiveIntensity = THREE.MathUtils.damp(
        woodRef.current.emissiveIntensity,
        hovered.current ? 0.16 : 0,
        8,
        delta,
      )
    }
  })

  /** Click sobre el cuerpo: solo sirve para limpiar */
  const handleBodyClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useMechanismStore.getState().cleanLevel < 1) clean()
  }

  /** Click sobre la tapa: limpia mientras haya suciedad, luego abre */
  const handleLidClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const { cleanLevel, lidOpen } = useMechanismStore.getState()
    if (cleanLevel < 1) {
      clean()
    } else if (!lidOpen) {
      openLid()
    }
  }

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    hovered.current = true
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    hovered.current = false
    document.body.style.cursor = 'auto'
  }

  return (
    <group
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* --- Cuerpo de madera ---
          El onClick va en el grupo, no en el mesh: así los clicks sobre las
          manchas de concreción burbujean hasta aquí y también limpian */}
      <group onClick={handleBodyClick}>
        <mesh position={[0, BOX.bodyHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[BOX.width, BOX.bodyHeight, BOX.depth]} />
          <meshStandardMaterial
            ref={woodRef}
            {...wood}
            normalScale={new THREE.Vector2(1.1, 1.1)}
            color={PALETTE.wood}
            roughness={0.95}
            metalness={0.05}
            emissive={PALETTE.woodGlow}
            emissiveIntensity={0}
          />
        </mesh>

        {/* Concreción sobre las caras del cuerpo */}
        <Grime surface="body" />
      </group>

      {/* --- Tapa abisagrada ---
          El grupo se sitúa en el eje de la bisagra (borde trasero superior);
          todo lo que cuelga de él gira como una tapa real */}
      <group ref={hingeRef} position={HINGE_POSITION} onClick={handleLidClick}>
        <mesh
          position={[0, BOX.lidHeight / 2, BOX.depth / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BOX.width, BOX.lidHeight, BOX.depth]} />
          <meshStandardMaterial
            {...wood}
            normalScale={new THREE.Vector2(1.1, 1.1)}
            color={PALETTE.wood}
            roughness={0.95}
            metalness={0.05}
          />
        </mesh>

        {/* Placa de bronce, centrada sobre la tapa y solidaria con ella */}
        <group position={[0, BOX.lidHeight + PLATE_HEIGHT / 2, BOX.depth / 2]}>
          <BronzePlate />
        </group>

        {/* Concreción sobre la tapa */}
        <Grime surface="lid" />
      </group>
    </group>
  )
}
