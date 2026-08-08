import * as THREE from 'three'
import { createRandom } from './random'

/**
 * Texturas procedurales dibujadas con canvas 2D.
 *
 * Todo se genera en tiempo de carga a partir de una semilla fija: no hay
 * assets externos y el resultado es idéntico en cada recarga. Cada generador
 * devuelve el color y los mapas de rugosidad/normales que le correspondan,
 * derivados del mismo campo de altura para que el relieve sea coherente.
 */

// ---------------------------------------------------------------------------
// Ruido base
// ---------------------------------------------------------------------------

const smooth = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Campo de ruido fractal (value noise) normalizado a 0-1.
 *
 * La rejilla se indexa con módulo, así que el resultado es tileable y las
 * texturas se pueden repetir sin costuras visibles.
 */
function makeNoiseField(
  seed: number,
  size: number,
  baseGrid: number,
  octaves: number,
): Float32Array {
  const field = new Float32Array(size * size)
  let amplitude = 1
  let total = 0
  let grid = baseGrid

  for (let o = 0; o < octaves; o++) {
    const rng = createRandom(seed + o * 7919)
    const lattice = new Float32Array(grid * grid)
    for (let i = 0; i < lattice.length; i++) lattice[i] = rng()

    for (let y = 0; y < size; y++) {
      const fy = (y / size) * grid
      const y0 = Math.floor(fy)
      const ty = smooth(fy - y0)
      const ry0 = y0 % grid
      const ry1 = (y0 + 1) % grid

      for (let x = 0; x < size; x++) {
        const fx = (x / size) * grid
        const x0 = Math.floor(fx)
        const tx = smooth(fx - x0)
        const rx0 = x0 % grid
        const rx1 = (x0 + 1) % grid

        const top = lerp(lattice[ry0 * grid + rx0], lattice[ry0 * grid + rx1], tx)
        const bottom = lerp(lattice[ry1 * grid + rx0], lattice[ry1 * grid + rx1], tx)
        field[y * size + x] += lerp(top, bottom, ty) * amplitude
      }
    }

    total += amplitude
    amplitude *= 0.5
    grid *= 2
  }

  for (let i = 0; i < field.length; i++) field[i] /= total
  return field
}

/**
 * Convierte un campo de altura en un mapa de normales por diferencias
 * centradas (Sobel simplificado). Devuelve una DataTexture RGB.
 */
function heightToNormalMap(
  height: Float32Array,
  size: number,
  strength: number,
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  const at = (x: number, y: number) =>
    height[((y + size) % size) * size + ((x + size) % size)]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength

      // Normal = normalize(-dx, -dy, 1), remapeada al rango 0-255
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      data[i] = ((-dx / len) * 0.5 + 0.5) * 255
      data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      data[i + 2] = (1 / len) * 0.5 * 255 + 127.5
      data[i + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.needsUpdate = true
  return texture
}

/** Envuelve un canvas ya dibujado en una textura lista para usar */
function canvasToTexture(canvas: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  texture.anisotropy = 4
  return texture
}

function makeCanvas(size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  return { canvas, ctx: canvas.getContext('2d')! }
}

/** Escribe un Float32Array 0-1 como imagen en escala de grises */
function fieldToCanvas(field: Float32Array, size: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size)
  const image = ctx.createImageData(size, size)
  for (let i = 0; i < field.length; i++) {
    const v = Math.max(0, Math.min(255, field[i] * 255))
    image.data[i * 4] = v
    image.data[i * 4 + 1] = v
    image.data[i * 4 + 2] = v
    image.data[i * 4 + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

export interface MaterialTextures {
  map: THREE.Texture
  roughnessMap?: THREE.Texture
  normalMap?: THREE.Texture
}

// ---------------------------------------------------------------------------
// Madera
// ---------------------------------------------------------------------------

const SIZE = 512

/**
 * Madera empapada: vetas longitudinales deformadas por ruido, con algún nudo
 * y oscurecimiento irregular por el agua.
 */
function buildWood(): MaterialTextures {
  const { canvas, ctx } = makeCanvas(SIZE)
  const warp = makeNoiseField(3301, SIZE, 4, 4)
  const blotch = makeNoiseField(5501, SIZE, 6, 4)
  const height = new Float32Array(SIZE * SIZE)

  const image = ctx.createImageData(SIZE, SIZE)

  // Dos nudos colocados a mano, deterministas
  const knots = [
    { x: 0.28, y: 0.34, r: 0.055 },
    { x: 0.74, y: 0.68, r: 0.04 },
  ]

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const u = x / SIZE
      const v = y / SIZE

      // Las vetas corren en horizontal y ondulan según el ruido de deformación.
      // Frecuencia contenida: con muchos anillos por cara, la madera se leía
      // como un tejido rayado en vez de como tabla
      let grain = v * 11 + (warp[i] - 0.5) * 5

      // Cerca de un nudo las vetas se cierran en anillos a su alrededor
      for (const knot of knots) {
        const d = Math.hypot(u - knot.x, v - knot.y)
        if (d < knot.r * 6) {
          const pull = Math.exp(-(d * d) / (knot.r * knot.r * 2))
          grain += pull * 14
        }
      }

      // Perfil de veta: bandas finas y oscuras sobre fondo más claro
      const ring = Math.abs(Math.sin(grain * Math.PI))
      const fibre = Math.pow(ring, 0.45)

      // Manchas de humedad de baja frecuencia
      const damp = blotch[i]

      // Marrón oscuro empapado; la veta baja el brillo, la humedad lo apaga más
      const shade = 0.56 + fibre * 0.44
      const wet = 0.76 + damp * 0.24

      let r = 132 * shade * wet
      let g = 94 * shade * wet
      let b = 62 * shade * wet

      // Alguna fibra suelta más clara, para romper la regularidad
      if (ring > 0.93) {
        r += 26
        g += 19
        b += 12
      }

      // Núcleo del nudo: casi negro
      for (const knot of knots) {
        const d = Math.hypot(u - knot.x, v - knot.y)
        if (d < knot.r) {
          const core = 1 - d / knot.r
          r *= 1 - core * 0.75
          g *= 1 - core * 0.75
          b *= 1 - core * 0.75
        }
      }

      const p = i * 4
      image.data[p] = r
      image.data[p + 1] = g
      image.data[p + 2] = b
      image.data[p + 3] = 255

      // La veta hundida es el relieve; la humedad casi no aporta altura
      height[i] = fibre * 0.85 + damp * 0.15
    }
  }

  ctx.putImageData(image, 0, 0)

  // La madera mojada brilla algo más en las zonas hundidas de la veta
  const roughness = new Float32Array(SIZE * SIZE)
  for (let i = 0; i < roughness.length; i++) {
    roughness[i] = 0.72 + height[i] * 0.28
  }

  return {
    map: canvasToTexture(canvas, true),
    roughnessMap: canvasToTexture(fieldToCanvas(roughness, SIZE), false),
    normalMap: heightToNormalMap(height, SIZE, 2.2),
  }
}

// ---------------------------------------------------------------------------
// Bronce con pátina
// ---------------------------------------------------------------------------

/**
 * Pátina del bronce: costra verdosa irregular con el metal asomando por las
 * zonas altas. El color base lo pone el material (que interpola al limpiar);
 * aquí aportamos la variación y el relieve.
 */
function buildPatina(): MaterialTextures {
  const { canvas, ctx } = makeCanvas(SIZE)
  const coarse = makeNoiseField(9107, SIZE, 5, 5)
  const fine = makeNoiseField(2213, SIZE, 24, 3)
  const height = new Float32Array(SIZE * SIZE)
  const image = ctx.createImageData(SIZE, SIZE)

  for (let i = 0; i < SIZE * SIZE; i++) {
    // Costra: el ruido grueso decide dónde se acumula la pátina
    const crust = smooth(Math.max(0, Math.min(1, (coarse[i] - 0.34) * 2.4)))
    const speck = fine[i]

    // Blanco = el material se ve tal cual; oscuro = zona picada y apagada
    const value = 0.55 + (1 - crust) * 0.4 + (speck - 0.5) * 0.22
    const v = Math.max(0, Math.min(1, value))

    // Un punto de verde extra en la costra, para que no sea solo luminancia
    const p = i * 4
    image.data[p] = v * 236
    image.data[p + 1] = v * 255
    image.data[p + 2] = v * 226
    image.data[p + 3] = 255

    height[i] = crust * 0.8 + speck * 0.2
  }

  ctx.putImageData(image, 0, 0)

  // La costra es mate; el metal expuesto, mucho más pulido
  const roughness = new Float32Array(SIZE * SIZE)
  for (let i = 0; i < roughness.length; i++) {
    roughness[i] = 0.35 + height[i] * 0.6
  }

  return {
    map: canvasToTexture(canvas, true),
    roughnessMap: canvasToTexture(fieldToCanvas(roughness, SIZE), false),
    normalMap: heightToNormalMap(height, SIZE, 3.4),
  }
}

// ---------------------------------------------------------------------------
// Arena del fondo marino
// ---------------------------------------------------------------------------

/**
 * Sedimento del fondo: grano fino sobre ondulaciones suaves, con motas
 * oscuras de conchas y restos.
 */
function buildSand(): MaterialTextures {
  const { canvas, ctx } = makeCanvas(SIZE)
  const ripples = makeNoiseField(1201, SIZE, 3, 2)
  const grain = makeNoiseField(4409, SIZE, 40, 3)
  const debris = makeNoiseField(6607, SIZE, 16, 2)
  const height = new Float32Array(SIZE * SIZE)
  const image = ctx.createImageData(SIZE, SIZE)

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x

      // Ondulaciones de arena: dos senos en direcciones distintas, deformados
      // por ruido. Cruzarlos rompe el patrón de bandas paralelas, que con una
      // sola dirección delataba el tileado a simple vista
      const warp = (ripples[i] - 0.5) * 9
      const rippleA = Math.sin((x / SIZE) * Math.PI * 10 + warp)
      const rippleB = Math.sin(((x * 0.45 + y * 0.9) / SIZE) * Math.PI * 7 - warp * 0.6)
      const ripple = (rippleA * 0.6 + rippleB * 0.4) * 0.5 + 0.5

      const value = 0.55 + ripple * 0.13 + (grain[i] - 0.5) * 0.26
      const v = Math.max(0, Math.min(1, value))

      // Motas oscuras dispersas: umbral alto y oscurecimiento suave, para que
      // se lean como restos y no como manchas de aceite
      const speck = debris[i] > 0.88 ? 0.74 : 1

      // Gris verdoso frío, el tono del limo del Egeo
      const p = i * 4
      image.data[p] = v * 150 * speck
      image.data[p + 1] = v * 168 * speck
      image.data[p + 2] = v * 156 * speck
      image.data[p + 3] = 255

      height[i] = ripple * 0.6 + grain[i] * 0.4
    }
  }

  ctx.putImageData(image, 0, 0)

  return {
    map: canvasToTexture(canvas, true),
    normalMap: heightToNormalMap(height, SIZE, 2.6),
  }
}

// ---------------------------------------------------------------------------
// Concreción marina
// ---------------------------------------------------------------------------

/** Costra de coral y sedimento calcificado: grumosa y muy irregular */
function buildConcretion(): MaterialTextures {
  const { canvas, ctx } = makeCanvas(256)
  const lumps = makeNoiseField(7703, 256, 8, 4)
  const pores = makeNoiseField(3313, 256, 32, 2)
  const height = new Float32Array(256 * 256)
  const image = ctx.createImageData(256, 256)

  for (let i = 0; i < 256 * 256; i++) {
    const lump = lumps[i]
    const pore = pores[i]
    const v = Math.max(0, Math.min(1, 0.45 + lump * 0.45 + (pore - 0.5) * 0.25))

    const p = i * 4
    image.data[p] = v * 190
    image.data[p + 1] = v * 198
    image.data[p + 2] = v * 172
    image.data[p + 3] = 255

    height[i] = lump * 0.7 + pore * 0.3
  }

  ctx.putImageData(image, 0, 0)

  return {
    map: canvasToTexture(canvas, true),
    normalMap: heightToNormalMap(height, 256, 4.5),
  }
}

// ---------------------------------------------------------------------------
// Caché
// ---------------------------------------------------------------------------

/**
 * Generar las texturas cuesta unos milisegundos, así que las construimos una
 * sola vez y las reutilizamos. Perezoso, para no pagarlo si el módulo se
 * importa desde un test que no renderiza.
 */
function once<T>(build: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= build())
}

export const getWoodTextures = once(buildWood)
export const getPatinaTextures = once(buildPatina)
export const getSandTextures = once(buildSand)
export const getConcretionTextures = once(buildConcretion)
