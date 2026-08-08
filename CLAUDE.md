# Proyecto: Antikythera — Experiencia 3D Interactiva

## Visión
Recreación interactiva en 3D del Mecanismo de Anticitera (computador analógico
griego del s. II a.C.). El usuario "bucea" hasta el pecio, abre la caja de
madera, ve los engranajes internos, gira una manivela para simular el
mecanismo, activa un modo rayos-X, y predice eclipses históricos ajustando
una fecha. Estética: pecio submarino, bronce oxidado, luz crepuscular azulada.

## Stack
- React + Vite + TypeScript
- @react-three/fiber + @react-three/drei (Three.js declarativo)
- Tailwind para la UI superpuesta (paneles, sliders, selector de fecha)
- Zustand para el estado global de la escena (fase del mecanismo, fecha
  seleccionada, modo rayos-X activo/inactivo)
- Sin backend por ahora — datos de eclipses en un JSON estático local

## Convenciones
- Componentes 3D en `src/scene/`, un componente por elemento significativo
  (caja, placa frontal, engranaje, pecio, partículas de sedimento).
- Nombres de ficheros, componentes y variables en inglés; comentarios y
  textos de UI en español.
- Lógica de física de engranajes (ratios de transmisión) en `src/lib/gears.ts`,
  separada de los componentes visuales — debe ser testeable sin renderizar.
- UI 2D (paneles, sliders) en `src/ui/`, siempre con Tailwind, sin CSS-in-JS.
- Nada de assets pesados de terceros sin preguntar antes — generamos
  geometría procedural (ExtrudeGeometry, TorusGeometry) en vez de importar
  modelos GLTF externos, salvo que se acuerde lo contrario.
- Animaciones con `useFrame` + `MathUtils.damp` sobre valores objetivo,
  sin react-spring.
- Commits pequeños y frecuentes, uno por hito funcional (no por archivo).

## Roadmap (referencia — no construir todo de golpe)
- Fase 1: Escena del pecio + caja exterior interactiva
- Fase 2: Engranajes internos + transmisión + modo rayos-X
- Fase 3: Cielo griego + selector de fecha + detector de eclipses
- Fase 4: Hotspots narrativos + modo exploración del pecio + pulido visual

El detalle de las fases 2-4 está en `docs/roadmap-fases.md`. No implementar
por adelantado: cada fase se aborda en su propia sesión.

## Estado actual
**Fase 1 completada.** Escena del pecio funcionando: fondo marino con relieve,
niebla exponencial azulada, luz cenital + haz volumétrico, sedimento en
suspensión (900 puntos) y OrbitControls limitados por encima del horizonte.
La caja de madera con placa de bronce se limpia en 4 clicks (la concreción se
desvanece por tandas, el bronce interpola de pátina verde a dorado) y, una vez
limpia, la tapa se abre sobre su bisagra. Estado en Zustand
(`src/lib/useMechanismStore.ts`), UI de instrucciones en `src/ui/HintPanel.tsx`.

Segunda pasada: texturas procedurales en `src/lib/textures.ts` (madera con
veta y nudos, pátina del bronce, arena del fondo, concreción), todas dibujadas
con canvas 2D y con sus mapas de rugosidad/normales derivados del mismo campo
de altura. Iluminación y niebla recalibradas para que el relieve se aprecie.

Tercera pasada: el cuerpo es ahora hueco (cuatro paredes y un fondo, con
`BOX.wallThickness`) y la placa de bronce vive en la cara frontal, donde sigue
visible con la tapa abierta. Añadido un mapa de entorno procedural.

**Fase 1 cerrada.** Repo publicado en `github.com/rabagoAI/bagokithera` (remoto
por SSH). Rama principal `main`.

### Trampas de materiales, ya pagadas dos veces
- Los colores de material **multiplican** al mapa de color, así que los tintes
  de `palette.ts` van claros. Con tonos oscuros el producto dejaba la caja
  completamente negra.
- Un material con `metalness` alto **no tiene componente difusa**: sin mapa de
  entorno se renderiza casi negro, y con él refleja el azul del agua tintado
  por su color base (dorado + azul = verde oliva). Por eso el bronce limpio se
  queda en `metalness` ~0.52 y no más.
- Verificar siempre con captura antes de dar algo por bueno: `tsc` y el build
  pasan igual de limpios con la caja renderizándose en negro.
- **No usar uniforms propios con `onBeforeCompile`.** three llama al hook
  varias veces por material y reutiliza programas según su cache key; por ese
  camino la tabla de uniforms que acaba usando el render deja de ser la que
  uno tiene en la mano (medido: objeto local a 1.0, uniform del material a 0).
  El control se transporta en `opacity`, que three sube siempre. Ver la
  explicación larga en `src/lib/xray.ts`.

**Fase 2 completada.** Tren de 4 engranajes con dientes reales
(`ExtrudeGeometry` de un perfil trapezoidal) dentro de la caja, manivela
sobre el eje de la rueda motriz, slider y modo rayos-X con realce Fresnel.
La lógica de ratios vive en `src/lib/gears.ts`, sin dependencias de three, y
tiene 14 tests (`npm test`, vitest) que cubren los signos de giro, las
distancias entre centros y que el tren quepa dentro de la caja.

Pendiente para Fase 3: el tren es una cadena simple, así que sus ruedas
intermedias son «locas» y no multiplican el ratio. Para los ciclos reales
(saros 223:64, metónico 235:19, ya documentados en `HISTORIC_RATIOS`) hacen
falta ejes compuestos: dos ruedas de distinto tamaño solidarias sobre un
mismo eje.
