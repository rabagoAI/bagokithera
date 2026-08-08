# Antikythera — Prompt para Claude Code

## Cómo usar este documento
1. Crea el repo/carpeta del proyecto y pega el bloque **CLAUDE.md** en un archivo `CLAUDE.md` en la raíz (contexto persistente para todas las sesiones).
2. En tu primera sesión de Claude Code, pega el bloque **PROMPT DE ARRANQUE (Fase 1)** tal cual como primer mensaje.
3. No le pegues las Fases 2-4 todavía — están en este documento como referencia para ti, para ir dándoselas sesión a sesión una vez cerrada y revisada la anterior. Esto evita diffs gigantes y mantiene el coste de tokens bajo.

---

## CLAUDE.md (contexto persistente del proyecto)

```markdown
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
  (Caja, PlacaFrontal, Engranaje, Pecio, Ceniza/partículas).
- Lógica de física de engranajes (ratios de transmisión) en `src/lib/gears.ts`,
  separada de los componentes visuales — debe ser testeable sin renderizar.
- UI 2D (paneles, sliders) en `src/ui/`, siempre con Tailwind, sin CSS-in-JS.
- Nada de assets pesados de terceros sin preguntar antes — generamos
  geometría procedural (ExtrudeGeometry, TorusGeometry) en vez de importar
  modelos GLTF externos, salvo que se acuerde lo contrario.
- Commits pequeños y frecuentes, uno por hito funcional (no por archivo).

## Roadmap (referencia — no construir todo de golpe)
- Fase 1: Escena del pecio + caja exterior interactiva
- Fase 2: Engranajes internos + transmisión + modo rayos-X
- Fase 3: Cielo griego + selector de fecha + detector de eclipses
- Fase 4: Hotspots narrativos + modo exploración del pecio + pulido visual

## Estado actual
(Claude Code: actualiza esta sección al final de cada sesión con un resumen
de 2-3 líneas de lo que se completó, para que la siguiente sesión tenga
contexto sin releer todo el código.)
```

---

## PROMPT DE ARRANQUE (Fase 1)

```
Vamos a construir la Fase 1 de "Antikythera", según el CLAUDE.md de este
proyecto. Léelo primero si no lo tienes ya en contexto.

Objetivo de esta sesión: una escena inmersiva de pecio submarino con una
caja de madera/bronce que el usuario puede abrir. Al final debo poder
arrancar `npm run dev` y ver:

1. Setup del proyecto
   - Vite + React + TypeScript, con @react-three/fiber, @react-three/drei
     y Tailwind ya configurados.
   - Estructura de carpetas según CLAUDE.md (src/scene, src/lib, src/ui).

2. Escena base del pecio
   - Fondo submarino: color de niebla azulado (THREE.Fog o fogExp2), luz
     ambiental tenue + una luz direccional cenital tipo "rayo de sol filtrado".
   - Partículas de sedimento flotando lentamente (un sistema de puntos
     simple, no necesita ser sofisticado).
   - Cámara con OrbitControls limitados (no dejar que el usuario se meta
     bajo el "suelo" del pecio).

3. La caja del mecanismo
   - Un objeto central: caja de madera (BoxGeometry, material rugoso
     marrón oscuro) con una "placa" circular de bronce oxidado encima
     (CylinderGeometry bajo, MeshStandardMaterial con roughness alto y
     metalness ~0.4, color óxido/verde-marrón).
   - Cubre parte de la caja con manchas de "coral/sedimento" (puedes
     simularlo con una textura procedural simple o geometría irregular
     superpuesta, sin necesidad de shaders complejos todavía).

4. Interacción
   - Click en la caja → efecto de "limpieza" progresiva (puede ser tan
     simple como una animación de opacidad/color que revela el bronce
     limpio debajo de la suciedad).
   - Click en la tapa (una vez limpia) → animación de apertura tipo bisagra
     (rotación animada con useFrame o react-spring/drei's animation helpers).

5. UI mínima
   - Un panel Tailwind superpuesto (esquina inferior) con una sola
     instrucción: "Haz click en la caja para empezar a limpiarla".

No implementes engranajes, rayos-X, ni el selector de fecha todavía —
eso es de la Fase 2 y 3. Si algo del CLAUDE.md es ambiguo, dime tu
interpretación antes de generar mucho código, no asumas en silencio.

Al terminar, actualiza la sección "Estado actual" del CLAUDE.md con un
resumen de 2-3 líneas.
```

---

## Fases siguientes (para cuando cierres la Fase 1)

**Fase 2 — Engranajes y transmisión** (dáselo como prompt nuevo, en sesión aparte):
- 3-4 engranajes con geometría de dientes (ExtrudeGeometry o torus segmentado)
- Lógica de ratios en `src/lib/gears.ts` (ej. ratio 223:64 del ciclo saros)
- Manivela controlada por slider, sincronización automática de engranajes
- Modo rayos-X: uniform de shader que interpola entre textura difusa y
  wireframe emisivo verde

**Fase 3 — Simulación astronómica**:
- Esfera de cielo con estrellas como partículas
- Selector de fecha histórica (200 a.C.–100 d.C.)
- JSON estático con 10-15 eclipses documentados (Five Millennium Canon de la NASA)
- Indicador visual cuando la fecha coincide con un eclipse

**Fase 4 — Narrativa y pulido**:
- Hotspots con hover → notas tipo "este engranaje no debería existir..."
- Modo exploración del pecio (ánforas, estatuas, carga del barco)
- Post-procesado (profundidad de campo, burbujas), intro cinematográfica

---

## Notas de coste
Tienes ~$5 en créditos de API — si usas Claude Code vía suscripción Pro esto
no aplica, pero si en algún momento generas assets o texto vía API (por
ejemplo, para redactar las notas narrativas de la Fase 4), pídeselo a Claude
Code en un solo batch en vez de iterativamente para no gastar de más.
