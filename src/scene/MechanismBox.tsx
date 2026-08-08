import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { getWoodTextures } from '../lib/textures'
import {
  BOX,
  HINGE_POSITION,
  LID_OPEN_ANGLE,
  PLATE_POSITION,
} from '../lib/boxLayout'
import { PALETTE } from '../lib/palette'
import { useMechanismStore } from '../lib/useMechanismStore'
import { enableXray } from '../lib/xray'
import { BronzePlate } from './BronzePlate'
import { GearTrain } from './GearTrain'
import { Grime } from './Grime'

const woodColor = new THREE.Color(PALETTE.wood)
const woodCleanColor = new THREE.Color(PALETTE.woodClean)
const targetColor = new THREE.Color()

/** Alto libre de las paredes, por encima del fondo de la caja */
const WALL_HEIGHT = BOX.bodyHeight - BOX.wallThickness
/** Centro vertical de las paredes */
const WALL_CENTER_Y = BOX.wallThickness + WALL_HEIGHT / 2
/** Fondo de las paredes laterales, ya descontadas la frontal y la trasera */
const SIDE_DEPTH = BOX.depth - BOX.wallThickness * 2

/**
 * La caja del mecanismo: cuerpo hueco de madera con la placa de bronce en su
 * cara frontal, y tapa abisagrada por el borde trasero.
 *
 * El cuerpo son cuatro paredes y un fondo, no un bloque macizo: al abrir la
 * tapa hay que ver un interior de verdad, y en la Fase 2 los engranajes van
 * dentro.
 *
 * Interacción:
 * - Mientras queda concreción, cualquier click sobre la caja limpia una tanda.
 * - Una vez limpia, el click sobre la tapa la abre sobre su bisagra.
 */
export function MechanismBox() {
  const hingeRef = useRef<THREE.Group>(null)
  // El hover va en un ref, no en estado: un re-render de React reaplicaría las
  // props declarativas sobre los materiales que estamos animando por useFrame
  const hovered = useRef(false)

  const clean = useMechanismStore((s) => s.clean)
  const openLid = useMechanismStore((s) => s.openLid)

  /**
   * Un único material de madera para las seis piezas (cinco del cuerpo más la
   * tapa). Compartirlo mantiene la limpieza sincronizada en todas ellas y
   * ahorra media docena de materiales equivalentes.
   */
  const wood = useMemo(() => {
    const source = getWoodTextures()
    const map = source.map.clone()
    const roughnessMap = source.roughnessMap!.clone()
    const normalMap = source.normalMap!.clone()

    // Sin repetir: la textura lleva dos nudos dibujados y con repeat 2 salían
    // cuatro por cara, idénticos y en retícula, delatando el tileado
    for (const texture of [map, roughnessMap, normalMap]) {
      texture.repeat.set(1, 1)
      texture.needsUpdate = true
    }

    return new THREE.MeshStandardMaterial({
      map,
      roughnessMap,
      normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      color: woodColor.clone(),
      roughness: 0.95,
      metalness: 0.05,
      emissive: new THREE.Color(PALETTE.woodGlow),
      emissiveIntensity: 0,
    })
  }, [])

  /** La madera también se desmaterializa en modo rayos-X, o no se vería nada */
  const xray = useMemo(
    () => enableXray(wood, { coreOpacity: 0.08, edgeOpacity: 0.5, glow: 1.1 }),
    [wood],
  )

  useEffect(
    () => () => {
      wood.map?.dispose()
      wood.roughnessMap?.dispose()
      wood.normalMap?.dispose()
      wood.dispose()
    },
    [wood],
  )

  useFrame((_, delta) => {
    const { cleanLevel, lidOpen, xrayMode } = useMechanismStore.getState()

    xray.set(THREE.MathUtils.damp(xray.get(), xrayMode ? 1 : 0, 5, delta))

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
    targetColor.copy(woodColor).lerp(woodCleanColor, cleanLevel)
    wood.color.lerp(targetColor, 1 - Math.exp(-4 * delta))

    wood.emissiveIntensity = THREE.MathUtils.damp(
      wood.emissiveIntensity,
      hovered.current ? 0.16 : 0,
      8,
      delta,
    )
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
    <group onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
      {/* --- Cuerpo hueco ---
          El onClick va en el grupo, no en cada mesh: así los clicks sobre las
          paredes y sobre las manchas de concreción burbujean todos hasta aquí */}
      <group onClick={handleBodyClick}>
        {/* Fondo */}
        <mesh position={[0, BOX.wallThickness / 2, 0]} material={wood} castShadow receiveShadow>
          <boxGeometry args={[BOX.width, BOX.wallThickness, BOX.depth]} />
        </mesh>

        {/* Pared trasera */}
        <mesh
          position={[0, WALL_CENTER_Y, -BOX.depth / 2 + BOX.wallThickness / 2]}
          material={wood}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BOX.width, WALL_HEIGHT, BOX.wallThickness]} />
        </mesh>

        {/* Pared frontal: es la que sostiene la placa de bronce */}
        <mesh
          position={[0, WALL_CENTER_Y, BOX.depth / 2 - BOX.wallThickness / 2]}
          material={wood}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BOX.width, WALL_HEIGHT, BOX.wallThickness]} />
        </mesh>

        {/* Paredes laterales, encajadas entre las dos anteriores */}
        <mesh
          position={[-BOX.width / 2 + BOX.wallThickness / 2, WALL_CENTER_Y, 0]}
          material={wood}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BOX.wallThickness, WALL_HEIGHT, SIDE_DEPTH]} />
        </mesh>
        <mesh
          position={[BOX.width / 2 - BOX.wallThickness / 2, WALL_CENTER_Y, 0]}
          material={wood}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BOX.wallThickness, WALL_HEIGHT, SIDE_DEPTH]} />
        </mesh>

        {/* Placa de bronce, apoyada en la cara frontal. El cilindro nace con
            su eje en Y, así que lo tumbamos para que mire hacia +Z */}
        <group position={PLATE_POSITION} rotation={[Math.PI / 2, 0, 0]}>
          <BronzePlate />
        </group>

        {/* Concreción sobre las caras del cuerpo */}
        <Grime surface="body" />
      </group>

      {/* El mecanismo, dentro de la caja */}
      <GearTrain />

      {/* --- Tapa abisagrada ---
          El grupo se sitúa en el eje de la bisagra (borde trasero superior);
          todo lo que cuelga de él gira como una tapa real */}
      <group ref={hingeRef} position={HINGE_POSITION} onClick={handleLidClick}>
        <mesh
          position={[0, BOX.lidHeight / 2, BOX.depth / 2]}
          material={wood}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BOX.width, BOX.lidHeight, BOX.depth]} />
        </mesh>

        {/* Concreción sobre la tapa */}
        <Grime surface="lid" />
      </group>
    </group>
  )
}
