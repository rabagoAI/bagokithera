import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SUN_POSITION } from '../lib/boxLayout'
import { PALETTE } from '../lib/palette'

/** Largo del cono de luz */
const LENGTH = 16
/** Cuánto sobresale el haz por debajo de la caja, para que no se corte en seco */
const OVERSHOOT = 1.5

/**
 * Rayo de sol filtrado desde la superficie: un cono translúcido con mezcla
 * aditiva que sugiere el volumen de luz sin necesidad de post-procesado.
 *
 * No ilumina nada — de eso se encarga la directionalLight de Scene. Esto es
 * puramente el "polvo iluminado" que hace visible el haz, así que su eje se
 * calcula a partir de SUN_POSITION para que caiga justo sobre la caja y en
 * la misma dirección que la luz real.
 */
export function SunShaft() {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  const { position, quaternion } = useMemo(() => {
    // Dirección que va de la caja (el origen) hacia la luz
    const toSun = new THREE.Vector3(...SUN_POSITION).normalize()

    // El cilindro nace con su eje en Y: lo giramos para alinearlo con el haz
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      toSun,
    )

    // Centrado sobre el eje de modo que el extremo inferior quede algo por
    // debajo de la caja y el superior se pierda hacia la superficie
    const position = toSun.clone().multiplyScalar(LENGTH / 2 - OVERSHOOT)

    return { position, quaternion }
  }, [])

  useFrame((state) => {
    if (!materialRef.current) return
    // Parpadeo lento, como el de la luz atravesando el oleaje
    const t = state.clock.elapsedTime
    materialRef.current.opacity = 0.05 + Math.sin(t * 0.4) * 0.012 + Math.sin(t * 1.3) * 0.006
  })

  return (
    <mesh position={position} quaternion={quaternion} renderOrder={-1}>
      {/* Cono abierto hacia arriba, sin tapas. Estrecho a propósito: si se
          ensancha demasiado, la cámara acaba dentro del volumen y el haz se
          lee como un plano diagonal cruzando la pantalla */}
      <cylinderGeometry args={[2.4, 1.0, LENGTH, 32, 1, true]} />
      <meshBasicMaterial
        ref={materialRef}
        color={PALETTE.sunlight}
        transparent
        opacity={0.05}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
