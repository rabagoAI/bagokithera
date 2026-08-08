import { useMemo } from 'react'
import * as THREE from 'three'
import { createRandom, randomRange } from '../lib/random'
import { PALETTE } from '../lib/palette'
import { getSandTextures } from '../lib/textures'

/** Ancho del plano. Generoso a propósito: con 60 se veía su borde recto
    recortado contra la niebla, delatando el final del suelo */
const SIZE = 110
const SEGMENTS = 64
/** Cuántas veces se repite la textura de arena a lo largo del plano */
const TEXTURE_REPEAT = 22

/**
 * Fondo marino: un plano grande con los vértices desplazados en vertical
 * para que no se lea como una superficie perfectamente lisa. El relieve es
 * suave y determinista (semilla fija) — no pretende ser terreno realista,
 * solo evitar el aspecto de "suelo de estudio".
 */
export function Seabed() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
    const rng = createRandom(1901) // año del hallazgo del pecio
    const position = geo.attributes.position

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const distance = Math.hypot(x, y)

      // Ondulación de fondo, más dos octavas de ruido fino
      const dunes = Math.sin(x * 0.18) * Math.cos(y * 0.22) * 0.45
      const detail = randomRange(rng, -0.12, 0.12)

      // Aplanamos el centro para que la caja se apoye en terreno estable
      const flatten = THREE.MathUtils.smoothstep(distance, 1.6, 5.0)

      position.setZ(i, (dunes + detail) * flatten)
    }

    geo.computeVertexNormals()
    return geo
  }, [])

  // Clonamos para poder fijar un repeat propio sin alterar la textura cacheada
  const { map, normalMap } = useMemo(() => {
    const source = getSandTextures()
    const map = source.map.clone()
    const normalMap = source.normalMap!.clone()

    for (const texture of [map, normalMap]) {
      texture.repeat.set(TEXTURE_REPEAT, TEXTURE_REPEAT)
      texture.needsUpdate = true
    }

    return { map, normalMap }
  }, [])

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.02, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        map={map}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(1.4, 1.4)}
        color={PALETTE.silt}
        roughness={0.95}
        metalness={0}
      />
    </mesh>
  )
}
