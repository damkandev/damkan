// Pencil geometry. Nothing here is drawn freehand: every wobble comes out of a
// seeded generator, so a shape sketched at build time and the same shape laid
// out in the browser come from one implementation and stay identical between
// builds.

export const round = (value: number) => Math.round(value * 100) / 100;

export const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

// Catmull-Rom through the jittered samples, so the wobble lands as a soft curve
// instead of a chain of creases.
export const curveThrough = (points: number[][]) => {
  let d = `M${round(points[0][0])} ${round(points[0][1])}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const before = points[index - 1] ?? points[index];
    const from = points[index];
    const to = points[index + 1];
    const after = points[index + 2] ?? to;
    d += ` C${round(from[0] + (to[0] - before[0]) / 6)} ${round(from[1] + (to[1] - before[1]) / 6)}`;
    d += ` ${round(to[0] - (after[0] - from[0]) / 6)} ${round(to[1] - (after[1] - from[1]) / 6)}`;
    d += ` ${round(to[0])} ${round(to[1])}`;
  }
  return d;
};

// Two lobes into a point, each control handle nudged so no two hearts match.
export const sketchHeart = ({
  x,
  y,
  size,
  seed,
}: {
  x: number;
  y: number;
  size: number;
  seed: number;
}) => {
  const random = seeded(seed);
  const shake = (amount = 1.1) => (random() - 0.5) * amount;
  const top = y + size * 0.28;
  const tip = y + size;
  return [
    `M${round(x + shake())} ${round(top + shake())}`,
    `C${round(x - size * 0.5 + shake())} ${round(y - size * 0.26 + shake())}`,
    `${round(x - size * 0.56 + shake())} ${round(y + size * 0.4 + shake())}`,
    `${round(x + shake(0.6))} ${round(tip + shake(0.6))}`,
    `C${round(x + size * 0.56 + shake())} ${round(y + size * 0.4 + shake())}`,
    `${round(x + size * 0.5 + shake())} ${round(y - size * 0.26 + shake())}`,
    `${round(x + shake())} ${round(top + shake())}`,
  ].join(" ");
};

// --- The day grid at the end of the letter ---------------------------------
// One square per day we have been together. There are hundreds of them and one
// more every morning, so they are sketched in the browser rather than shipped
// in the page, and every square is drawn centred on 0,0 inside this box: the
// grid only has to translate, turn and scale them into place.
export const DAY_BOX = 10;

export type DayKind = "talk" | "call" | "meet" | "moment";

export const sketchSquare = (seed: number) => {
  const random = seeded(seed);
  const shake = (amount = 1.15) => (random() - 0.5) * amount;
  const half = DAY_BOX / 2;
  const points: number[][] = [];
  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    points.push([x1 + shake(), y1 + shake()]);
    points.push([(x1 + x2) / 2 + shake(), (y1 + y2) / 2 + shake()]);
  };
  edge(-half, -half, half, -half);
  edge(half, -half, half, half);
  edge(half, half, -half, half);
  edge(-half, half, -half, -half);
  // Overshoot past the first corner, the way a hand closes a box it drew in one
  // go without lifting the pencil.
  points.push([-half + shake(), -half + shake()]);
  points.push([-half + 2.4 + shake(), -half + 0.5 + shake()]);
  return curveThrough(points);
};

const sketchArc = ({
  cx,
  cy,
  radius,
  from,
  to,
  seed,
  wobble = 0.55,
}: {
  cx: number;
  cy: number;
  radius: number;
  from: number;
  to: number;
  seed: number;
  wobble?: number;
}) => {
  const random = seeded(seed);
  const points: number[][] = [];
  for (let index = 0; index <= 5; index += 1) {
    const angle = from + ((to - from) * index) / 5;
    const distance = radius + (random() - 0.5) * wobble;
    points.push([cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance]);
  }
  return curveThrough(points);
};

// A day we called each other: two little waves leaving the bottom corner.
const sketchCall = (seed: number) => [
  sketchArc({ cx: -2.6, cy: 2.6, radius: 3.2, from: -Math.PI / 2, to: 0, seed }),
  sketchArc({ cx: -2.6, cy: 2.6, radius: 5.4, from: -Math.PI / 2, to: 0, seed: seed + 11 }),
];

// A day worth keeping: a four-pointed spark, two strokes crossing off-centre.
const sketchSpark = (seed: number) => {
  const random = seeded(seed);
  const shake = (amount = 0.55) => (random() - 0.5) * amount;
  return [
    curveThrough([
      [shake(), -3.5 + shake()],
      [0.45 + shake(0.8), shake()],
      [shake(), 3.5 + shake()],
    ]),
    curveThrough([
      [-3.5 + shake(), shake()],
      [shake(), -0.45 + shake(0.8)],
      [3.5 + shake(), shake()],
    ]),
  ];
};

// Days we saw each other get a filled heart, drawn with the same helper as the
// hearts in the chat thread. An ordinary day of talking is just the square.
export const dayMarks = (kind: DayKind, seed: number) => {
  if (kind === "call") return sketchCall(seed + 3);
  if (kind === "meet") return [sketchHeart({ x: 0, y: -1.9, size: 4.4, seed: seed + 5 })];
  if (kind === "moment") return sketchSpark(seed + 7);
  return [];
};

// Real days get pinned here as we remember them — day 1 is the 30th of June,
// the day we started talking — and the rest are dealt out by a seeded roll, so
// the heart has texture instead of a pattern and comes out the same every time
// the page is opened.
const pinnedDays: Record<number, DayKind> = { 1: "meet" };

export const dayKinds = (count: number): DayKind[] => {
  const roll = seeded(9317);
  return Array.from({ length: count }, (_unused, index) => {
    const chance = roll();
    return (
      pinnedDays[index + 1] ??
      (chance < 0.7 ? "talk" : chance < 0.82 ? "call" : chance < 0.92 ? "meet" : "moment")
    );
  });
};

export const daySeed = (index: number) => 4600 + index * 211;

// --- El bigote y los labios ------------------------------------------------
// Las dos piezas se dibujan centradas en 0,0 dentro de una caja de 40 x 24, así
// que salen del mismo tamaño aparente sin que el CSS tenga que compensar nada.

// Un bigote de manillar. No se dibujan sus bordes: se dibuja el eje por el que
// pasaría el pelo y un grosor que va afinándose hacia la punta, y el contorno
// sale de separar ese eje hacia los dos lados. Así el ala se estrecha de verdad
// y el rizo del final nace del cuerpo en vez de quedarse pegado como un bulto.
const MUSTACHE_SPINE = [
  [-14.2, -3.2],
  [-16, -6.3],
  [-20.6, -5.5],
  [-21.4, -2.9],
  [-19, 0.2],
  [-15.4, 1],
  [-10.4, 0.6],
  [-5.6, 0],
  [-2.2, -0.3],
  [0, 0.7],
];

// La muesca de en medio no se dibuja: sale de que el grosor caiga de golpe en
// los dos últimos puntos, ya pegados al centro. Si el eje bajara en pico, el
// bigote entero se doblaría en uve y dejaría de parecer un bigote.
const MUSTACHE_WIDTH = [0.3, 0.8, 1.2, 1.7, 2.3, 3.6, 5.4, 5.8, 4.6, 2.6];

const mirrorX = (points: number[][]) => points.map(([x, y]) => [-x, y]);

// El temblor se aplica una sola vez y de ahí salen tanto el contorno como el
// recorte, para que el negro no se asome nunca por fuera de la línea.
const shakePoints = (points: number[][], seed: number, amount = 0.7) => {
  const random = seeded(seed);
  return points.map(([x, y]) => [x + (random() - 0.5) * amount, y + (random() - 0.5) * amount]);
};

// Separa un eje hacia sus dos lados siguiendo la normal en cada punto.
const ribbon = (spine: number[][], widths: number[]) => {
  const left: number[][] = [];
  const right: number[][] = [];
  spine.forEach(([x, y], index) => {
    const before = spine[index - 1] ?? spine[index];
    const after = spine[index + 1] ?? spine[index];
    const tx = after[0] - before[0];
    const ty = after[1] - before[1];
    const length = Math.hypot(tx, ty) || 1;
    const nx = -ty / length;
    const ny = tx / length;
    left.push([x + nx * widths[index], y + ny * widths[index]]);
    right.push([x - nx * widths[index], y - ny * widths[index]]);
  });
  return { left, right };
};

const mustacheEdges = (seed: number) => {
  const spine = shakePoints(
    [...MUSTACHE_SPINE, ...mirrorX(MUSTACHE_SPINE).reverse().slice(1)],
    seed + 3,
    0.5,
  );
  const widths = [...MUSTACHE_WIDTH, ...[...MUSTACHE_WIDTH].reverse().slice(1)];
  return ribbon(spine, widths);
};

export const sketchMustacheShape = (seed: number) => {
  const { left, right } = mustacheEdges(seed);
  return `${curveThrough([...left, ...[...right].reverse()])} Z`;
};

export const sketchMustache = (seed: number) => {
  const { left, right } = mustacheEdges(seed);
  const half = Math.ceil(left.length / 2);
  return {
    // Tres trazos, no uno: se ve armarse un ala, después la otra, y al final el
    // borde de abajo que las cierra.
    outline: [
      curveThrough(left.slice(0, half + 1)),
      curveThrough(left.slice(half - 1)),
      curveThrough(right),
    ],
    // El relleno: barridas de lápiz de arriba abajo, cada una pasándose de largo
    // porque el recorte ya las corta en el borde.
    fill: Array.from({ length: 11 }, (_unused, index) => {
      const random = seeded(seed + 137 + index * 41);
      const shake = (amount = 1.2) => (random() - 0.5) * amount;
      const y = -13 + index * 2;
      const side = index % 2 === 0 ? 1 : -1;
      return curveThrough([
        [side * (-25 + shake()), y + shake()],
        [side * shake(2.5), y - 0.8 + shake()],
        [side * (25 + shake()), y + shake()],
      ]);
    }),
  };
};

// Los labios: primero el arco de Cupido, luego el borde de abajo, y la línea
// donde se juntan al final, que es la que da el gesto.
const LIP_SEEDS = { top: 5, bottom: 19, seam: 37 };

const lipTop = (seed: number) => {
  const random = seeded(seed + LIP_SEEDS.top);
  const shake = (amount = 0.5) => (random() - 0.5) * amount;
  return [
    [-11.4 + shake(), 0.6 + shake()],
    [-8.2 + shake(), -3.4 + shake()],
    [-4.6 + shake(), -4.6 + shake()],
    // La muesca del centro, el punto que baja entre los dos lóbulos.
    [shake(0.4), -2.5 + shake()],
    [4.6 + shake(), -4.6 + shake()],
    [8.2 + shake(), -3.4 + shake()],
    [11.4 + shake(), 0.6 + shake()],
  ];
};

const lipBottom = (seed: number) => {
  const random = seeded(seed + LIP_SEEDS.bottom);
  const shake = (amount = 0.5) => (random() - 0.5) * amount;
  return [
    [11.4 + shake(), 0.6 + shake()],
    [8.4 + shake(), 5.2 + shake()],
    [4.2 + shake(), 7.6 + shake()],
    [shake(0.5), 8.2 + shake()],
    [-4.2 + shake(), 7.6 + shake()],
    [-8.4 + shake(), 5.2 + shake()],
    [-11.4 + shake(), 0.6 + shake()],
  ];
};

const lipSeam = (seed: number) => {
  const random = seeded(seed + LIP_SEEDS.seam);
  const shake = (amount = 0.45) => (random() - 0.5) * amount;
  return [
    [-11.4 + shake(), 0.6 + shake()],
    [-5.8 + shake(), 1.9 + shake()],
    [shake(0.5), 1.4 + shake()],
    [5.8 + shake(), 1.9 + shake()],
    [11.4 + shake(), 0.6 + shake()],
  ];
};

// La silueta cerrada que recorta el color. Sale de los mismos puntos que el
// contorno, así que el pintado nunca se asoma por fuera de la línea.
export const sketchLipsShape = (seed: number) =>
  `${curveThrough([...lipTop(seed), ...lipBottom(seed).slice(1)])} Z`;

export const sketchLips = (seed: number) => ({
  outline: [curveThrough(lipTop(seed)), curveThrough(lipBottom(seed)), curveThrough(lipSeam(seed))],
  // El pintado: siete barridos casi horizontales, de arriba abajo, cada uno
  // más allá del borde porque el recorte ya se encarga de cortarlos. Es un
  // labial pasando, no un relleno.
  fill: Array.from({ length: 7 }, (_unused, index) => {
    const random = seeded(seed + 101 + index * 29);
    const shake = (amount = 1.1) => (random() - 0.5) * amount;
    const y = -4.2 + index * 2.1;
    const side = index % 2 === 0 ? 1 : -1;
    return curveThrough([
      [side * (-13.5 + shake()), y + shake()],
      [side * shake(2), y - 0.7 + shake()],
      [side * (13.5 + shake()), y + shake()],
    ]);
  }),
});

// El "+" de en medio: dos trazos de lápiz, no un signo tipográfico, para que
// se dibuje con todo lo demás.
export const sketchPlus = (seed: number) => {
  const stroke = (points: number[][], strokeSeed: number) => {
    const random = seeded(strokeSeed);
    const shake = (amount = 0.55) => (random() - 0.5) * amount;
    return curveThrough(points.map(([x, y]) => [x + shake(), y + shake()]));
  };
  return [
    stroke([[-5.2, 0], [0, -0.4], [5.2, 0]], seed + 7),
    stroke([[0, -5.2], [0.4, 0], [0, 5.2]], seed + 23),
  ];
};

// --- Las dos reglas --------------------------------------------------------
// Las dos cosas de las que no se habla, dibujadas como señales de prohibido:
// unos audífonos con cable por la tecnología y una urna de voto por la
// política. Cada pieza va centrada en 0,0 dentro de una caja de 40 x 40, así
// que las dos señales salen iguales de tamaño sin que el CSS compense nada.

const penLine = (points: number[][], seed: number, amount = 0.6) =>
  curveThrough(shakePoints(points, seed, amount));

const BAN_RADIUS = 15.5;

// El aro y su barra. El radio respira a lo largo de la vuelta y el trazo se
// pasa de largo al cerrar, como cuando se rodea algo de un solo gesto; la barra
// entra y sale un poco del aro porque la mano no se para justo en el borde.
export const sketchBan = (seed: number) => {
  const random = seeded(seed);
  const steps = 26;
  const drift = (random() - 0.5) * 0.9;
  const start = (-Math.PI * 3) / 4;
  const points: number[][] = [];
  for (let index = 0; index <= steps + 2; index += 1) {
    const angle = start + (Math.PI * 2 * index) / steps;
    const distance = BAN_RADIUS + (random() - 0.5) * 1.1;
    points.push([Math.cos(angle) * distance + drift, Math.sin(angle) * distance - drift * 0.7]);
  }
  const reach = (BAN_RADIUS + 0.7) * Math.SQRT1_2;
  return {
    ring: curveThrough(points),
    slash: penLine([[-reach, -reach], [0, 0.3], [reach, reach]], seed + 61, 0.75),
  };
};

// Una almohadilla: un rectángulo largo de esquinas redondeadas, cerrado a mano.
const earcup = (x: number, seed: number) => {
  const half = 2;
  const top = -1.4;
  const bottom = 5.4;
  const middle = (top + bottom) / 2;
  return penLine(
    [
      [x - half, top],
      [x - half - 0.5, middle],
      [x - half, bottom],
      [x, bottom + 0.9],
      [x + half, bottom],
      [x + half + 0.5, middle],
      [x + half, top],
      [x, top - 0.9],
      [x - half, top],
    ],
    seed,
    0.45,
  );
};

export const sketchHeadphones = (seed: number) => {
  const band: number[][] = [];
  for (let index = 0; index <= 9; index += 1) {
    const angle = Math.PI + (Math.PI * index) / 9;
    band.push([Math.cos(angle) * 8.4, Math.sin(angle) * 8.4 + 0.4]);
  }
  return [
    penLine(band, seed + 5, 0.5),
    earcup(-8.4, seed + 17),
    earcup(8.4, seed + 29),
    // El cable, que es lo que los hace ser estos audífonos y no otros: sale de
    // la almohadilla derecha, hace su curva y termina en la clavija.
    penLine([[8.4, 5.8], [9.7, 8.4], [7.2, 10], [4.6, 10.8], [3.9, 11.7]], seed + 41, 0.45),
    penLine([[3, 12], [5, 11.5]], seed + 53, 0.3),
  ];
};

export const sketchBallot = (seed: number) => {
  const left = -8.2;
  const right = 8.2;
  const top = 2.2;
  const bottom = 11.2;
  const middle = (top + bottom) / 2;
  return [
    // La urna.
    penLine(
      [
        [left, top],
        [left - 0.4, middle],
        [left + 0.3, bottom],
        [0, bottom + 0.6],
        [right - 0.3, bottom],
        [right + 0.4, middle],
        [right, top],
        [0, top - 0.7],
        [left, top],
      ],
      seed + 7,
      0.5,
    ),
    // La ranura, por dentro del borde de arriba: fuera se confundiría con la
    // línea de la caja y la urna dejaría de parecer una urna.
    penLine([[-3.5, top + 1.9], [0, top + 1.7], [3.5, top + 1.9]], seed + 19, 0.28),
    // La papeleta, doblada y a punto de entrar: se queda justo encima de la
    // ranura, que es lo que hace que la caja se lea como una urna.
    penLine([[-1.9, -1], [-4.2, -9.5], [1.2, -10.7], [3.3, -2.2], [-1.9, -1]], seed + 31, 0.45),
    penLine([[-1.9, -6.2], [-0.9, -5], [1.1, -7.8]], seed + 43, 0.35),
  ];
};
