import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE } from '../lib/palette'
import { BOX, SUN_POSITION } from '../lib/boxLayout'
import { MechanismBox } from './MechanismBox'
import { Seabed } from './Seabed'
import { Sediment } from './Sediment'
import { SunShaft } from './SunShaft'

/** Punto al que mira la cámara: el centro de la caja */
const TARGET: [number, number, number] = [0, BOX.bodyHeight * 0.5, 0]

export function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [3.4, 2.4, 4.6], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.15
        // Mismo color que la niebla: así el horizonte se funde sin corte duro
        scene.background = new THREE.Color(PALETTE.deep)
      }}
    >
      {/* Niebla exponencial. Calibrada para que el fondo marino cercano se
          lea con nitidez pero el borde del plano quede disuelto a lo lejos */}
      <fogExp2 attach="fog" args={[PALETTE.deep, 0.045]} />

      {/* Luz ambiental fría: lo poco que llega difuso a esta profundidad */}
      <ambientLight intensity={0.55} color="#4a7f9e" />

      {/* Rayo de sol filtrado desde la superficie, ligeramente inclinado.
          Es la luz que define el relieve de las texturas, de ahí que venga
          bastante rasante en vez de totalmente cenital */}
      <directionalLight
        position={SUN_POSITION}
        intensity={3.4}
        color={PALETTE.sunlight}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-far={30}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />

      {/* Relleno frío desde abajo: evita que las caras en sombra queden negras */}
      <hemisphereLight args={['#5d9ec0', '#16241f', 0.85]} />

      {/* Acento rasante desde el lado opuesto: separa la silueta de la caja
          del fondo y hace legible la veta en las caras que quedan a contraluz */}
      <pointLight position={[-3.2, 1.8, -2.4]} intensity={7} distance={12} color="#78b4d6" />

      <SunShaft />
      <Seabed />
      <Sediment />
      <MechanismBox />

      <OrbitControls
        target={TARGET}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={2.2}
        maxDistance={11}
        /* Tope justo por encima del horizonte: impide bajar bajo el fondo marino */
        maxPolarAngle={Math.PI / 2 - 0.06}
        minPolarAngle={0.25}
        rotateSpeed={0.6}
        zoomSpeed={0.7}
      />
    </Canvas>
  )
}
