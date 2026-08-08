import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PLATE_HEIGHT, PLATE_RADIUS } from '../lib/boxLayout'
import { PALETTE } from '../lib/palette'
import { getPatinaTextures } from '../lib/textures'
import { useMechanismStore } from '../lib/useMechanismStore'

// Instancias reutilizadas en el bucle de render, para no crear un Color por frame
const patinaColor = new THREE.Color(PALETTE.bronzePatina)
const cleanColor = new THREE.Color(PALETTE.bronzeClean)
const targetColor = new THREE.Color()

/**
 * Placa circular de bronce montada sobre la tapa.
 *
 * Interpola del verde de la pátina al bronce dorado según avanza la limpieza.
 * En la Fase 2 esta placa pasará a llevar las escalas grabadas y los punteros.
 */
export function BronzePlate() {
  // Un único material para el disco y el aro: así ambos se limpian a la vez
  const material = useMemo(() => {
    const textures = getPatinaTextures()

    return new THREE.MeshStandardMaterial({
      color: patinaColor.clone(),
      map: textures.map,
      roughnessMap: textures.roughnessMap,
      normalMap: textures.normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.85,
      metalness: 0.4,
    })
  }, [])

  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    const { cleanLevel } = useMechanismStore.getState()

    // El color persigue al objetivo con amortiguación, así el cambio entre
    // clicks es un fundido y no un salto brusco
    targetColor.copy(patinaColor).lerp(cleanColor, cleanLevel)
    material.color.lerp(targetColor, 1 - Math.exp(-4 * delta))

    // El bronce limpio refleja más y es menos rugoso que la pátina
    material.roughness = THREE.MathUtils.damp(material.roughness, 0.85 - cleanLevel * 0.32, 4, delta)
    material.metalness = THREE.MathUtils.damp(material.metalness, 0.4 + cleanLevel * 0.35, 4, delta)

    // Al retirar la costra la superficie se alisa: bajamos el relieve
    const normalTarget = 0.8 - cleanLevel * 0.5
    material.normalScale.setScalar(
      THREE.MathUtils.damp(material.normalScale.x, normalTarget, 4, delta),
    )
  })

  return (
    <group>
      {/* Cuerpo de la placa */}
      <mesh material={material} castShadow receiveShadow>
        <cylinderGeometry args={[PLATE_RADIUS, PLATE_RADIUS, PLATE_HEIGHT, 48]} />
      </mesh>

      {/* Aro exterior: un realce fino que atrapa la luz cenital y da lectura
          de "instrumento" en vez de disco liso. El torus nace en el plano XY,
          por eso lo tumbamos -90° en X */}
      <mesh
        material={material}
        position={[0, PLATE_HEIGHT / 2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[PLATE_RADIUS * 0.92, 0.022, 8, 48]} />
      </mesh>
    </group>
  )
}
