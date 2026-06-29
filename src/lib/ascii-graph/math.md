# Matemáticas del grafo ASCII

Todas las estrategias parten del mismo dato: una lista de nodos `{x, y, vx, vy}`
y aristas `{a, b}`. Lo único que cambia es cómo se actualiza `x, y` cada frame.

## 1. Verlet (constraints)

Integración basada en posición, sin velocidad explícita: la velocidad implícita
es la diferencia entre la posición actual y la anterior.

    nuevoX = x + (x - prevX) * DAMPING
    nuevoY = y + (y - prevY) * DAMPING + GRAVEDAD * dt²

- DAMPING ≈ 0.98 (fricción del aire)
- GRAVEDAD ≈ 400 px/s² constante hacia abajo

Las aristas se resuelven como restricciones de distancia, en 4 pasadas de
relajación por frame:

    dist = |B - A|
    diff = (dist - restLength) / dist
    correccion = 0.5 * diff
    A += (B - A) * correccion
    B -= (B - A) * correccion

Arrastrar un nodo (`fixed = true`) hace que la restricción tire de sus vecinos
automáticamente — no hace falta código extra para el efecto "cuerda".

## 2. Force-directed (Hooke + Coulomb)

Acumulación de fuerzas con integración de Euler explícita.

Repulsión entre todos los pares de nodos (como cargas eléctricas):

    F = K / dist²        (K ≈ 8000)

Resorte de Hooke por cada arista:

    F = springK * (dist - restLength)        (springK ≈ 0.05)

Gravedad: fuerza constante hacia abajo (≈30).

Integración con damping alto (≈0.9) para evitar que las fuerzas sin
restricción dura oscilen sin control:

    v = (v + F * dt) * DAMPING
    x = x + v * dt

## 3. Drag propagation

Sin simulación continua — la más simple de las tres hechas a mano.

Al arrastrar un nodo, sus vecinos a 1-3 saltos (BFS) se acercan por
interpolación lineal hacia una posición a `restLength` de distancia:

    target = nodoArrastrado - normalize(dir) * restLength
    vecino = lerp(vecino, target, EASE * HOP_DECAY^salto)

- EASE ≈ 0.08, HOP_DECAY ≈ 0.7

"Gravedad" aquí es solo un lerp suave de todo nodo libre hacia un Y objetivo
(un atractor, no una aceleración real).

## 4. matter-js

Motor de física real (rigid body + constraints), usado solo para extraer
posiciones — nunca se llama a su renderer propio.

- Cada nodo es un `Bodies.circle` con `frictionAir` y `restitution`.
- Cada arista es un `Constraint` (resorte/cuerda nativo de matter-js).
- Gravedad: `{ x: 0, y: 0 }` — los nodos flotan en el espacio en vez de caer.

Parámetros ajustables (todos en `strategies/matter-js.ts`):

    FRICTION_AIR = 0.03        — fricción del aire por step
    WALL_RESTITUTION = 0.6     — energía conservada al chocar con una pared
    CONSTRAINT_STIFFNESS = 0.3 — qué tanto tira un edge de sus dos nodos
    MAX_SPEED = 6              — clamp duro de velocidad (red de seguridad)

Sin damping ni pérdida de energía, cada ajuste manual (mover un nodo a mano)
inyecta energía que nunca se disipa — por eso `FRICTION_AIR` y
`WALL_RESTITUTION` no pueden ser 0 / 1: el sistema necesita perder algo de
energía en cada bote o cada arrastre, si no la velocidad crece sin límite.

## 5. d3-force

Misma idea que force-directed, pero con la librería d3:

    forceManyBody().strength(-120)              — repulsión tipo Coulomb
    forceLink(links).distance(L).strength(0.3)  — resorte por arista
    forceY(targetY).strength(0.02)              — "gravedad" como atractor en Y

d3 no tiene una gravedad de aceleración constante nativa, así que se simula
con `forceY` empujando todo hacia una altura objetivo.

## Distancia de reposo según tamaño de nodo

Para que la "cuerda" ASCII no quede oculta detrás de cajas grandes que se
superponen, `restLength` escala con el tamaño del nodo:

    restLength = max(80, tamañoNodo * 1.6)

## Renderer: líneas ASCII

Las líneas no son SVG ni canvas: son `<span>` de texto posicionados en una
grilla, reusados frame a frame (pool), para no recrear DOM constantemente.

1. Cada arista convierte los centros de sus dos nodos a coordenadas de grilla:

       col = round(x / CELL_W)
       row = round(y / CELL_H)

2. Un algoritmo DDA (Digital Differential Analyzer) recorre la línea entre
   ambos puntos, celda por celda:

       pasos = max(|colB - colA|, |rowB - rowA|)
       para cada paso i: t = i / pasos
         col = round(lerp(colA, colB, t))
         row = round(lerp(rowA, rowB, t))

3. El glyph (`-`, `|`, `/`, `\`) se elige según el ángulo de la línea,
   corrigiendo por la relación de aspecto de la celda (las celdas no son
   cuadradas: 8px de ancho × 14px de alto):

       angulo = atan2(dRow * (CELL_W / CELL_H), dCol)

   Se divide el círculo en 4 sectores de 45°. Si dos aristas distintas tocan
   la misma celda en el mismo frame con glyphs distintos, se dibuja `+`
   (cruce).

4. Solo se tocan las celdas que están realmente en el trazo de cada línea —
   nunca se recorre la grilla completa del contenedor. Si los dos extremos de
   una arista no cambiaron de celda desde el frame anterior, esa arista se
   salta por completo (dirty-check).
