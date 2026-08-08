import * as THREE from 'three'

/**
 * Modo rayos-X: inyecta en un MeshStandardMaterial la mezcla hacia un aspecto
 * de radiografía verde, con realce Fresnel de los bordes.
 *
 * Se hace con onBeforeCompile, y no sustituyendo el material, porque así la
 * transición es continua: el objeto se desmaterializa poco a poco en vez de
 * cambiar de golpe.
 *
 * ## Por qué el control viaja en `opacity` y no en un uniform propio
 *
 * Lo natural sería declarar un `uniform float uXray` y escribir en el objeto
 * que se le pasa a `shader.uniforms`. En la práctica no es fiable: three
 * puede llamar a onBeforeCompile varias veces por material y reutilizar
 * programas ya compilados por su cache key, y en ese camino la tabla de
 * uniforms que acaba usando el render deja de ser la que uno tiene en la
 * mano. Medido en runtime: el objeto local llegaba a 1.0 mientras el uniform
 * del material seguía clavado en 0.
 *
 * `opacity` en cambio es una propiedad estándar, y three la sube al shader en
 * cada frame pase lo que pase con la compilación. Así que la usamos de
 * portador: opacity 1 es el aspecto normal, y según baja, sube la
 * radiografía. El alpha real lo fijamos nosotros al final del fragment.
 */

/** Opacidad mínima, con el modo al máximo. No llega a 0 para no perder el objeto */
const MIN_OPACITY = 0.05

export interface XrayHandle {
  /** Fija la intensidad del efecto, de 0 (normal) a 1 (radiografía) */
  set(value: number): void
  /** Última intensidad fijada */
  get(): number
}

export interface XrayOptions {
  /** Color de la radiografía */
  color?: THREE.ColorRepresentation
  /** Opacidad en el interior de la silueta, con el modo al máximo */
  coreOpacity?: number
  /** Opacidad en los bordes, donde el Fresnel realza el contorno */
  edgeOpacity?: number
  /** Cuánto brilla el material en modo rayos-X */
  glow?: number
}

export function enableXray(
  material: THREE.MeshStandardMaterial,
  options: XrayOptions = {},
): XrayHandle {
  const {
    color = '#6dffa8',
    coreOpacity = 0.22,
    edgeOpacity = 0.85,
    glow = 1.6,
  } = options

  // Necesario para que la caja pueda volverse translúcida y dejar ver el
  // mecanismo. Con depthWrite activo la geometría sigue ordenándose bien
  material.transparent = true
  material.opacity = 1

  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        const vec3 XRAY_COLOR = vec3(${new THREE.Color(color).r.toFixed(4)}, ${new THREE.Color(color).g.toFixed(4)}, ${new THREE.Color(color).b.toFixed(4)});
        const float XRAY_CORE = ${coreOpacity.toFixed(4)};
        const float XRAY_EDGE = ${edgeOpacity.toFixed(4)};
        const float XRAY_GLOW = ${glow.toFixed(4)};
        const float XRAY_MIN_OPACITY = ${MIN_OPACITY.toFixed(4)};`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>

        // La intensidad viaja en opacity: 1 = normal, MIN_OPACITY = radiografía
        float xrayAmount = clamp(
          (1.0 - opacity) / (1.0 - XRAY_MIN_OPACITY),
          0.0,
          1.0
        );

        if (xrayAmount > 0.001) {
          // Fresnel: cuanto más de canto se ve la superficie, más brilla.
          // Es lo que dibuja el contorno luminoso de una radiografía
          vec3 xrayNormal = normalize(vNormal);
          vec3 xrayView = normalize(vViewPosition);
          float facing = abs(dot(xrayNormal, xrayView));
          float fresnel = pow(1.0 - facing, 2.5);

          vec3 xrayRgb = XRAY_COLOR * mix(0.35, XRAY_GLOW, fresnel);
          float xrayAlpha = mix(XRAY_CORE, XRAY_EDGE, fresnel);

          gl_FragColor.rgb = mix(gl_FragColor.rgb, xrayRgb, xrayAmount);
          // El alpha que traía ya venía multiplicado por opacity, así que lo
          // reponemos en vez de mezclarlo
          gl_FragColor.a = mix(1.0, xrayAlpha, xrayAmount);
        }`,
      )
  }

  let current = 0

  return {
    set(value: number) {
      current = THREE.MathUtils.clamp(value, 0, 1)
      material.opacity = 1 - current * (1 - MIN_OPACITY)
    },
    get() {
      return current
    },
  }
}
