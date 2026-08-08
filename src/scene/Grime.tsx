import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createRandom, randomRange } from '../lib/random'
import { BOX, PLATE_RADIUS } from '../lib/boxLayout'
import { PALETTE } from '../lib/palette'
import { getConcretionTextures } from '../lib/textures'
import { useMechanismStore } from '../lib/useMechanismStore'

/** Superficie de la caja sobre la que se asienta la concreción */
export type GrimeSurface = 'body' | 'lid'

interface Blob {
  position: [number, number, number]
  /** Escala del elipsoide: aplanado contra la superficie que cubre */
  scale: [number, number, number]
  rotation: [number, number, number]
  /**
   * Umbral de limpieza a partir del cual esta mancha desaparece.
   * Repartidos por todo el rango 0-1, así cada click retira una tanda.
   */
  threshold: number
  tint: number
}

const BODY_COUNT = 14
const LID_COUNT = 10

/**
 * El Raycaster de three no comprueba `visible`, así que una mancha ya
 * retirada seguiría capturando clicks e impidiendo abrir la tapa. Al
 * ocultarla le sustituimos su raycast por esta función vacía.
 */
const noopRaycast = () => {}

/**
 * Genera las manchas de una superficie. Semilla distinta por superficie para
 * que cuerpo y tapa no acaben con patrones espejo.
 */
function createBlobs(surface: GrimeSurface): Blob[] {
  const isBody = surface === 'body'
  const rng = createRandom(isBody ? 4531 : 8807)
  const count = isBody ? BODY_COUNT : LID_COUNT
  const blobs: Blob[] = []

  for (let i = 0; i < count; i++) {
    let position: [number, number, number]
    let rotation: [number, number, number]
    let scale: [number, number, number]

    if (isBody) {
      // Repartimos entre las cuatro caras laterales del cuerpo
      const face = Math.floor(rng() * 4)
      const along = randomRange(rng, -0.42, 0.42)
      const height = randomRange(rng, 0.1, BOX.bodyHeight - 0.1)
      const radius = randomRange(rng, 0.14, 0.32)
      // Aplanado: la mancha se pega a la cara, no sobresale como una bola
      const flat = radius * randomRange(rng, 0.3, 0.5)

      switch (face) {
        case 0: // cara +Z (frontal)
          position = [BOX.width * along, height, BOX.depth / 2]
          scale = [radius, radius * 0.8, flat]
          break
        case 1: // cara -Z (trasera)
          position = [BOX.width * along, height, -BOX.depth / 2]
          scale = [radius, radius * 0.8, flat]
          break
        case 2: // cara +X (lateral derecho)
          position = [BOX.width / 2, height, BOX.depth * along]
          scale = [flat, radius * 0.8, radius]
          break
        default: // cara -X (lateral izquierdo)
          position = [-BOX.width / 2, height, BOX.depth * along]
          scale = [flat, radius * 0.8, radius]
      }

      rotation = [0, randomRange(rng, 0, Math.PI), randomRange(rng, -0.4, 0.4)]
    } else {
      // Sobre la tapa: coordenadas locales al grupo de la bisagra
      const radius = randomRange(rng, 0.13, 0.3)
      const x = randomRange(rng, -BOX.width / 2 + 0.1, BOX.width / 2 - 0.1)
      const z = randomRange(rng, 0.12, BOX.depth - 0.12)

      // Las manchas que caen sobre la placa de bronce se apoyan más alto
      const overPlate = Math.hypot(x, z - BOX.depth / 2) < PLATE_RADIUS
      const y = overPlate ? BOX.lidHeight + 0.06 : BOX.lidHeight

      position = [x, y, z]
      scale = [radius, radius * randomRange(rng, 0.3, 0.5), radius * 0.85]
      rotation = [randomRange(rng, -0.3, 0.3), randomRange(rng, 0, Math.PI), 0]
    }

    blobs.push({
      position,
      scale,
      rotation,
      // Escalonamos los umbrales para que ninguna tanda quede vacía
      threshold: (i + 0.5) / count,
      tint: randomRange(rng, -0.12, 0.12),
    })
  }

  return blobs
}

/**
 * Concreción marina (coral, sedimento calcificado) que cubre la caja.
 *
 * Cada mancha se desvanece y encoge cuando el nivel de limpieza supera su
 * umbral, de modo que los cuatro clicks van descubriendo el objeto por
 * tandas en vez de todo a la vez.
 */
export function Grime({ surface }: { surface: GrimeSurface }) {
  const blobs = useMemo(() => createBlobs(surface), [surface])
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])
  const textures = useMemo(() => getConcretionTextures(), [])

  useFrame((_, delta) => {
    const cleanLevel = useMechanismStore.getState().cleanLevel

    blobs.forEach((blob, i) => {
      const mesh = meshRefs.current[i]
      if (!mesh) return

      const target = cleanLevel >= blob.threshold ? 0 : 1
      const material = mesh.material as THREE.MeshStandardMaterial

      material.opacity = THREE.MathUtils.damp(material.opacity, target, 4, delta)

      // Encoge a la vez que se desvanece: se lee como material desprendiéndose
      const factor = THREE.MathUtils.damp(mesh.userData.factor ?? 1, target, 4, delta)
      mesh.userData.factor = factor
      mesh.scale.set(
        blob.scale[0] * factor,
        blob.scale[1] * factor,
        blob.scale[2] * factor,
      )

      mesh.visible = material.opacity > 0.01
      mesh.raycast = mesh.visible ? THREE.Mesh.prototype.raycast : noopRaycast
    })
  })

  return (
    <group>
      {blobs.map((blob, i) => (
        <mesh
          key={i}
          ref={(node) => {
            meshRefs.current[i] = node
          }}
          position={blob.position}
          rotation={blob.rotation}
          scale={blob.scale}
          castShadow
        >
          {/* Esfera de segmentos medios: el grumo lo dan la escala no uniforme
              y el mapa de normales, no la geometría */}
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial
            map={textures.map}
            normalMap={textures.normalMap}
            normalScale={new THREE.Vector2(1.6, 1.6)}
            color={new THREE.Color(PALETTE.grime).offsetHSL(blob.tint * 0.3, 0, blob.tint)}
            roughness={1}
            metalness={0}
            transparent
            opacity={1}
          />
        </mesh>
      ))}
    </group>
  )
}
