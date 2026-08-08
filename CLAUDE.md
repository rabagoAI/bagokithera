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

Ojo con los tintes de `palette.ts`: los colores de material **multiplican** al
mapa de color, así que van claros. Con tonos oscuros el producto de ambos
dejaba la caja completamente negra.

Pendiente para Fase 2: `src/lib/gears.ts` está sin crear; el interior de la
caja está vacío (se ve el hueco al abrir la tapa); la placa de bronce queda
fuera de vista al abrir la tapa, porque va montada sobre ella.
