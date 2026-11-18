// Tablero isométrico infinito en 1 bit (estilo Obra Dinn), de noche, con un foco al centro. Seis piezas, una por sección,
// que se repiten cada 12 casillas. Al tumbar una (click o arrastre, con física) todo lo demás se apaga y al lado se escribe su
// sección; en Artículos cada título abre el artículo en una columna a la derecha, con su dirección de siempre en la barra.
// Viene del prototipo aprobado el 2026-11-16 (prototipo/tablero/, fuera de git). Las secciones y el artículo abierto los deja
// el servidor en el HTML (components/Tablero.astro); de ahí se leen.
// Cuadros fijos para revisar, solo en dev: ?t=1 (reposo) · &trap=1 (compuerta abierta) · &bun=2 (el conejo a los 2 s de su llegada) · &dive=3 (el túnel a los 3 s) · &room=3 (el coloso a los 3 s de su video; con &raw=1, sin trama; con &sim=20, la mente a los 20 s de su ciclo; con &at=0,4,1.5, parado en x = 0, z = 4 y con rumbo 1,5 rad) · &q=1&n=0 (la n-ésima pieza más cercana, tumbada) · &size=390x844
import { track } from "./analytics";

const Q = new URLSearchParams(import.meta.env.DEV ? location.search : "");
const cv = document.getElementById("c");
if (Q.has("size")) { const [sw, sh] = Q.get("size").split("x"); cv.style.width = sw + "px"; cv.style.height = sh + "px"; } // Chrome headless no baja de 500 px de ancho
const gl = cv.getContext("webgl", { antialias: false, preserveDrawingBuffer: true });
if (!gl) throw new Error("tablero: sin WebGL"); // Tablero.astro lo atrapa y deja el texto plano

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FIXED = Q.has("t") ? +Q.get("t") : null;
const INTRO = !RM && FIXED == null; // el foco se abre al cargar; los cuadros fijos parten ya encendidos
// en pantallas angostas la celda baja a 2 px: con 3 no cabe un párrafo legible
const cellFor = () => ((Q.has("size") ? parseInt(Q.get("size")) : innerWidth) < 700 ? 2 : 3);
let CELL = cellFor();

// ---------- matemática mínima (matrices en columnas, como WebGL)
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mix = (a, b, k) => a + (b - a) * k;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
function mul4(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
function lookAt(e, c) {
  const z = norm(sub(e, c)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]);
}
// rotación eje-ángulo, 3×3 en columnas
function rot(ax, an) {
  const [x, y, z] = ax, c = Math.cos(an), s = Math.sin(an), t = 1 - c;
  return [t * x * x + c, t * x * y + s * z, t * x * z - s * y, t * x * y - s * z, t * y * y + c, t * y * z + s * x, t * x * z + s * y, t * y * z - s * x, t * z * z + c];
}
const mul3 = (a, b) => { const o = []; for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2]; return o; };
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- mallas: [x,y,z, nx,ny,nz] por vértice, triángulos sueltos. Unidad = una casilla
// perfil [radio, altura]; un punto repetido marca una arista viva
function lathe(pts, seg = 48) {
  const segN = (a, b) => { const dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy); return l < 1e-6 ? null : [dy / l, -dr / l]; };
  const nr = pts.map((p, i) => {
    const a = i > 0 ? segN(pts[i - 1], p) : null, b = i < pts.length - 1 ? segN(p, pts[i + 1]) : null;
    const x = (a ? a[0] : 0) + (b ? b[0] : 0), y = (a ? a[1] : 0) + (b ? b[1] : 0), l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  });
  const v = [];
  const vert = (i, k) => { const a = k / seg * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a); v.push(pts[i][0] * c, pts[i][1], pts[i][0] * s, nr[i][0] * c, nr[i][1], nr[i][0] * s); };
  for (let i = 0; i < pts.length - 1; i++) {
    if (!segN(pts[i], pts[i + 1])) continue;
    for (let k = 0; k < seg; k++) { vert(i, k); vert(i + 1, k); vert(i + 1, k + 1); vert(i, k); vert(i + 1, k + 1); vert(i, k + 1); }
  }
  return v;
}
// arco de círculo en el plano del perfil (grados) y curva cuadrática
const arc = (cx, cy, r, a0, a1, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
const curve = (p0, p1, p2, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; });
// secciones elípticas apiladas: [altura, x del lomo, x del frente, semiancho en Z]
function loft(sec, seg = 32) {
  const P = (i, k) => { const s = sec[Math.max(0, Math.min(sec.length - 1, i))], a = k / seg * 2 * Math.PI; return [(s[1] + s[2]) / 2 + (s[2] - s[1]) / 2 * Math.cos(a), s[0], s[3] * Math.sin(a)]; };
  const v = [], vert = (i, k) => {
    const p = P(i, k), s = sec[i];
    let n = norm(cross(sub(P(i, k + 1), P(i, k - 1)), sub(P(i + 1, k), P(i - 1, k))));
    if (dot(n, [p[0] - (s[1] + s[2]) / 2, 0, p[2]]) < 0) n = n.map((x) => -x);
    v.push(...p, ...n);
  };
  for (let i = 0; i < sec.length - 1; i++) for (let k = 0; k < seg; k++) { vert(i, k); vert(i + 1, k); vert(i + 1, k + 1); vert(i, k); vert(i + 1, k + 1); vert(i, k + 1); }
  return v;
}
// Catmull-Rom sobre puntos de cualquier dimensión
function smooth(p, n = 4) {
  const out = [];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)];
    for (let j = 0; j < n; j++) { const t = j / n; out.push(b.map((_, k) => .5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t * t * t))); }
  }
  out.push(p[p.length - 1]);
  return out;
}
function box(cx, cy, cz, sx, sy, sz) {
  const v = [];
  for (let ax = 0; ax < 3; ax++) for (const sg of [-1, 1]) {
    const n = [0, 0, 0]; n[ax] = sg;
    const u = [0, 0, 0], w = [0, 0, 0]; u[(ax + 1) % 3] = 1; w[(ax + 2) % 3] = 1;
    const h = [sx / 2, sy / 2, sz / 2], P = (a, b) => [0, 1, 2].map((k) => [cx, cy, cz][k] + (n[k] + u[k] * a + w[k] * b) * h[k]);
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) v.push(...P(a, b), ...n);
  }
  return v;
}
// gira (3×3) y traslada una malla
function place(v, R, t) {
  const o = [];
  for (let i = 0; i < v.length; i += 3) {
    const isN = i % 6 === 3, x = v[i], y = v[i + 1], z = v[i + 2];
    o.push(R[0] * x + R[3] * y + R[6] * z + (isN ? 0 : t[0]), R[1] * x + R[4] * y + R[7] * z + (isN ? 0 : t[1]), R[2] * x + R[5] * y + R[8] * z + (isN ? 0 : t[2]));
  }
  return o;
}
// deja cada triángulo en sentido antihorario visto desde afuera (según sus normales)
function wind(v) {
  for (let i = 0; i < v.length; i += 18) {
    const a = v.slice(i, i + 3), b = v.slice(i + 6, i + 9), c = v.slice(i + 12, i + 15);
    const fn = cross(sub(b, a), sub(c, a)), n = [v[i + 3] + v[i + 9] + v[i + 15], v[i + 4] + v[i + 10] + v[i + 16], v[i + 5] + v[i + 11] + v[i + 17]];
    if (dot(fn, n) < 0) for (let k = 0; k < 6; k++) { const t = v[i + 6 + k]; v[i + 6 + k] = v[i + 12 + k]; v[i + 12 + k] = t; }
  }
  return v;
}

// pie torneado común: zócalo, escalón y toro. R = radio del zócalo; termina en [R*.72, .18]
const foot = (R) => [[0, 0], [R, 0], [R, 0], [R, .055], [R * .95, .075], [R * .95, .075], [R * .88, .08], [R * .88, .08], ...arc(R * .82, .115, .035 + R * .06, -80, 80, 6), [R * .8, .155], [R * .8, .155], [R * .72, .18]];
const collar = (r, y, R) => [[r, y], [r, y], [R * .92, y + .02], [R, y + .04], [R * .92, y + .06], [r * 1.05, y + .075], [r * 1.05, y + .075]];
const MESH = {
  pawn: lathe([...foot(.27), ...curve([.19, .18], [.085, .24], [.08, .43]), ...collar(.08, .43, .165), [.075, .52], ...arc(0, .68, .15, -62, 90, 12)]),
  rook: lathe([...foot(.33), ...curve([.238, .18], [.185, .25], [.18, .5]), [.172, .7], [.172, .7], [.23, .735], [.255, .75], [.255, .75], [.265, .78], [.265, 1], [.265, 1], [.2, 1], [.2, 1], [.2, .88], [.2, .88], [0, .88]]),
  bishop: lathe([...foot(.32), ...curve([.23, .18], [.1, .27], [.085, .63]), ...collar(.085, .63, .19), [.09, .72], [.13, .74], [.09, .76], [.09, .76], ...curve([.09, .76], [.2, .83], [.15, .99]), ...curve([.15, .99], [.1, 1.11], [.035, 1.19]), ...arc(0, 1.24, .052, -48, 90, 8)]),
  queen: lathe([...foot(.36), ...curve([.26, .18], [.11, .3], [.095, .86]), ...collar(.095, .86, .22), [.1, .95], [.15, .975], [.1, 1], [.1, 1], ...curve([.1, 1], [.115, 1.2], [.245, 1.34]), [.245, 1.34], [.2, 1.34], [.2, 1.34], [.19, 1.27], ...curve([.19, 1.27], [.16, 1.37], [.05, 1.39]), ...arc(0, 1.44, .06, -56, 90, 8)]),
  king: [
    ...lathe([...foot(.37), ...curve([.266, .18], [.115, .32], [.1, .93]), ...collar(.1, .93, .23), [.105, 1.02], [.155, 1.045], [.105, 1.07], [.105, 1.07], ...curve([.105, 1.07], [.12, 1.27], [.24, 1.43]), [.24, 1.43], [.24, 1.46], [.24, 1.46], [.2, 1.48], ...curve([.2, 1.48], [.16, 1.57], [.06, 1.58]), [.05, 1.6], [.05, 1.6], [.05, 1.63], [.05, 1.63], [0, 1.63]]),
    ...wind([...box(0, 1.74, 0, .075, .26, .06), ...box(0, 1.76, 0, .22, .07, .06)]),
  ],
  knight: wind([
    ...lathe([...foot(.33), [.2, .2], [.22, .235], [.2, .27], [.2, .27], [0, .28]]),
    // cuello y cabeza: el perfil lateral manda (lomo y frente por altura); mira hacia +X
    ...loft(smooth([[.22, -.2, .2, .2], [.32, -.2, .22, .17], [.42, -.21, .21, .15], [.52, -.21, .18, .14], [.62, -.2, .14, .13], [.7, -.18, .13, .12], [.76, -.16, .17, .118], [.8, -.14, .33, .112], [.86, -.11, .41, .105], [.92, -.08, .39, .1], [.98, -.04, .31, .095], [1.04, 0, .21, .088], [1.09, .03, .14, .07], [1.12, .06, .1, .02]], 4)),
    // orejas
    ...place(lathe([[.042, 0], [.042, 0], [0, .14]], 12), mul3(rot([0, 0, 1], -.2), rot([1, 0, 0], .22)), [.05, 1.05, .05]),
    ...place(lathe([[.042, 0], [.042, 0], [0, .14]], 12), mul3(rot([0, 0, 1], -.2), rot([1, 0, 0], -.22)), [.05, 1.05, -.05]),
  ]),
  // conejo sentado, mirando hacia +X: lomo y frente por altura como el caballo, orejas planas echadas atrás y la cola
  bunny: wind([
    ...loft(smooth([[0, -.2, .12, .09], [.04, -.26, .16, .13], [.1, -.28, .17, .15], [.18, -.27, .15, .145], [.25, -.22, .12, .125], [.31, -.15, .11, .1], [.35, -.08, .17, .09], [.4, -.06, .22, .088], [.45, -.05, .21, .08], [.49, -.03, .15, .06], [.515, 0, .07, .025]], 3)),
    ...[1, -1].flatMap((s) => place(loft(smooth([[0, -.02, .02, .03], [.08, -.025, .025, .055], [.18, -.02, .02, .05], [.26, -.01, .01, .025], [.29, -.002, .002, .003]], 3), 12), mul3(rot([0, 0, 1], .35), rot([1, 0, 0], s * .25)), [.0, .45, s * .035])),
    ...place(lathe(arc(0, 0, .055, -90, 90, 6), 12), [1, 0, 0, 0, 1, 0, 0, 0, 1], [-.28, .15, 0]),
  ]),
  // compuerta: la tapa, con la bisagra sobre el eje Z (x = 0, y = 0) y los tablones hacia +X; dos bisagras y la manilla.
  // ponytail: bisagras de caja y no de cilindro; a 3 px por celda no se distinguen
  lid: wind([...box(.38, .03, 0, .76, .06, .76), ...box(0, .045, -.2, .09, .09, .16), ...box(0, .045, .2, .09, .09, .16), ...box(.62, .075, 0, .05, .03, .18)]),
  // el pozo bajo la compuerta: las cuatro paredes de una caja vistas por dentro, sin tapa ni fondo (el fondo no alcanza a verse: queda negro)
  pit: wind(box(0, .3, 0, .72, .6, .72).filter((_, i) => i < 72 || i >= 144).map((v, i) => (i % 6 > 2 ? -v : v))),
  top: [-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, -1, 1, 0, 1, -1, 0, 1].reduce((v, _, i, a) => (i % 3 ? v : [...v, a[i], a[i + 1], a[i + 2], 0, 1, 0]), []),
};
const KIND = { pawn: 0, rook: 1, knight: 2, bishop: 3, queen: 4, king: 5 };
const TALL = { pawn: .83, rook: 1, knight: 1.15, bishop: 1.29, queen: 1.5, king: 1.87 };

// ---------- WebGL: la escena se rasteriza a resolución de celda y cada punto queda en negro o blanco puro
const VS = `
attribute vec3 aPos, aNor;
uniform mat4 uVP, uM;
uniform float uProj, uPlaneY, uOut, uWob, uTime;
uniform vec3 uLightP;
varying vec3 vW, vN, vLoc;
void main() {
  vec4 w = uM * vec4(aPos, 1.0);
  vLoc = aPos;
  vN = (uM * vec4(aNor, 0.0)).xyz;
  // sombra: el vértice se proyecta sobre el suelo desde el foco, que está sobre el centro de la pantalla
  if (uProj > 0.5) w.xyz = uLightP + (w.xyz - uLightP) * (uLightP.y - uPlaneY) / (uLightP.y - w.y);
  // reflejo en el piso mojado: la malla espejada bajo el suelo se corre de lado en ondas, más mientras más hondo
  if (uWob > 0.0) w.xyz += vec3(0.7071, 0.0, -0.7071) * sin(w.y * 11.0 + uTime * 1.6) * uWob * min(1.0, -w.y * 3.0);
  // contorno: la malla inflada a lo largo de la normal, de la que solo se dibujan las caras traseras
  if (uOut > 0.0) w.xyz += normalize(vN) * uOut;
  vW = w.xyz;
  gl_Position = uVP * w;
}`;
const FS = `
precision highp float;
varying vec3 vW, vN, vLoc;
uniform vec3 uEye, uFillD, uLightP;
uniform float uMode, uKind, uAlb, uSh, uGround, uHot, uDim, uSel, uProj, uTime;
uniform vec2 uPan;
uniform vec3 uHover; // casilla bajo el puntero (x, y) y si hay puntero
uniform vec4 uPud;   // brillo del piso mojado bajo la pieza elegida: centro (x, z), intensidad 0..1, semilargo
uniform vec4 uSpot;  // foco: centro (x, z), radio de luz plena, radio donde se apaga
uniform vec3 uTrap;  // compuerta: centro de su casilla (x, z) y cada cuántas casillas se repite
uniform float uSpotK; // cuánto se estira el foco hacia el fondo (en pantallas verticales, para que en pantalla sea un círculo)
uniform sampler2D uNoise;
// cuánta luz del foco llega a un punto del suelo: 1 en el centro, casi nada afuera (queda un resto de noche)
float spot(vec2 xz) {
  vec2 q = xz - uSpot.xy;
  float k = smoothstep(uSpot.w, uSpot.z, length(vec2(dot(q, vec2(0.7071, -0.7071)), dot(q, vec2(-0.7071, -0.7071)) / uSpotK)));
  return 0.035 + 0.965 * pow(k, 1.4);
}
float hash1(float n) { return fract(sin(n) * 43758.5453); }
float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash1(i), hash1(i + 1.0), f); }
// forma de la luz en el piso mojado (1 al centro, 0 afuera), en ejes de pantalla: a lo ancho y hacia la cámara
float wet(vec2 xz, out float a, out float f) {
  vec2 q = xz - uPud.xy;
  a = dot(q, vec2(0.7071, -0.7071)); f = dot(q, vec2(-0.7071, -0.7071));
  // lejos del centro se corta en cero a mano: con exponentes muy grandes exp() no devolvía cero limpio y dejaba puntos sueltos arriba
  float x = pow(abs(a) / uPud.w, 3.0) + (f * f) / (f < 0.0 ? 0.55 : 0.12);
  return x < 12.0 ? exp(-x) : 0.0;
}
// 2×2 de Bayer con la coordenada reducida a 0/1 antes de operar: la versión con fract(x/2 + y²·0,75) perdía precisión
// en las filas altas de un canvas grande y encendía puntos sueltos sobre negro
float bayer2(vec2 a) { a = mod(floor(a), 2.0); return a.x * 0.5 + a.y * 0.75 - a.x * a.y; }
float bayer8(vec2 a) { return bayer2(0.25 * a) * 0.0625 + bayer2(0.5 * a) * 0.25 + bayer2(a); }
// uKind: 0 a 5 las piezas · 6 la tapa de la compuerta · 7 las paredes de su pozo · 8 el conejo
// uMode: 0 pieza · 5 suelo (y las sombras sobre él) · 6 contorno · 7 reflejo de la pieza elegida
void main() {
  float v;
  // uPan: lo que la cámara se ha corrido, en celdas. Sumarlo deja la trama pegada al mundo y no a la pantalla
  vec2 dc = gl_FragCoord.xy + uPan;
  float bn = texture2D(uNoise, dc / 64.0).r * 0.992 + 0.004;
  // al elegir una pieza, las demás y todas las sombras se deshacen punto a punto (no solo se oscurecen: taparían a la elegida)
  bool obj = uMode < 0.5 || (uMode > 5.5 && uMode < 6.5), shadow = uMode > 4.5 && uMode < 5.5 && uProj > 0.5;
  if (uDim > 0.0 && (shadow || (obj && uSel < 0.5)) && bn < uDim) discard;
  vec3 V = normalize(uEye - vW);
  if (uMode > 6.5) {
    // reflejo de la pieza: se apaga con la profundidad y se corta en franjas, como en agua quieta.
    // Al levantar la pieza se deshace punto a punto: con v en 0 pintaba negro opaco sobre el damero y se cortaba de golpe
    if (bn >= uDim) discard;
    v = uDim * exp(vW.y * 0.8) * (0.3 + 0.7 * step(0.38, fract(-vW.y * 6.5 + uTime * 0.25)));
    // solo se refleja donde el piso está iluminado: se mide en el punto del suelo que queda detrás de este píxel
    float ra, rf;
    v *= clamp(wet((vW - V * (vW.y / V.y)).xz, ra, rf) * 2.2, 0.0, 1.0);
  } else if (uMode > 5.5) {
    v = 0.0;
  } else if (uMode < 0.5) {
    // pieza: los cortes (almenas, mitra, corona) se hacen descartando; adentro se ve la cara interior, oscura
    float r = length(vLoc.xz), a = atan(vLoc.z, vLoc.x), y = vLoc.y;
    if (uKind == 1.0 && y > 0.91 && r > 0.17 && fract(a * 0.95493 + 0.5) < 0.36) discard;
    if (uKind == 3.0 && vLoc.x > 0.0 && y < 1.17 && abs((y - 1.0) - vLoc.x * 0.8) < 0.02) discard;
    if (uKind == 4.0 && r > 0.19 && y > 1.275 + 0.045 * cos(a * 9.0)) discard;
    vec3 N = normalize(vN);
    float back = 0.0;
    if (!gl_FrontFacing) { N = -N; back = 1.0; }
    vec3 Ld = normalize(uLightP - vW);
    float dif = max(dot(N, Ld), 0.0);
    float fill = max(dot(N, uFillD), 0.0);
    float spec = pow(max(dot(N, normalize(Ld + V)), 0.0), 48.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float ao = mix(1.0, 0.45 + 0.55 * smoothstep(-0.02, 0.32, y), uGround);
    v = uAlb * (0.16 + 0.84 * dif + 0.22 * fill) * ao + spec * 0.55 + fres * mix(0.55, 0.12, uAlb);
    if (uKind == 6.0 && abs(fract(vLoc.z * 4.0) - 0.5) < 0.09) v *= 0.15; // juntas entre los tablones de la tapa
    if (uKind == 7.0) v *= smoothstep(0.3, 0.6, vLoc.y);                       // el pozo se pierde en negro hacia abajo
    if (uKind == 2.0 && length(vec3(vLoc.x - 0.2, vLoc.y - 0.94, abs(vLoc.z) - 0.095)) < 0.022) v *= 0.15;
    if (uKind == 8.0 && length(vec3(vLoc.x - 0.13, vLoc.y - 0.43, abs(vLoc.z) - 0.078)) < 0.025) v *= 0.15;
    // 1 bit: se estira el contraste para que luz y sombra queden planas y la trama viva solo en el medio tono;
    // las piezas oscuras llevan una línea clara en el borde para no perderse sobre las casillas negras
    v = clamp((v - 0.08) / 0.52, 0.0, 1.0);
    if (uAlb < 0.5 && 1.0 - max(dot(N, V), 0.0) > 0.52) v = 1.0;
    v = v * (1.0 + 0.3 * uHot) + 0.14 * uHot;
    if (back > 0.5) v *= 0.3;
    // al elegir una pieza todo se apaga y ella queda en blanco pleno, con una línea de tinta donde la forma se da vuelta
    v = uSel > 0.5 ? mix(v * spot(vW.xz), 1.0 - step(0.8, 1.0 - max(dot(N, V), 0.0)), uDim) : v * spot(vW.xz) * (1.0 - uDim);
    if (uKind == 8.0) v *= smoothstep(-0.4, 0.0, vW.y); // el conejo se pierde en lo negro del pozo
  } else {
    // suelo: el damero sigue sin bordes; un degradé dentro de cada casilla hace aparecer la trama
    // compuerta: el suelo (y las sombras sobre él) se abre en un hueco; lo cubre la tapa o deja ver el pozo
    vec2 tq = abs(mod(vW.xz - uTrap.xy + 0.5 * uTrap.z, uTrap.z) - 0.5 * uTrap.z);
    float tm = max(tq.x, tq.y);
    if (tm < 0.36) discard;
    vec2 cc = floor(vW.xz + 4.0), fc = fract(vW.xz + 4.0);
    float tone = mod(cc.x + cc.y, 2.0) < 0.5 ? 0.99 : 0.04;
    // la casilla bajo el puntero responde: la clara queda blanca lisa, la oscura se levanta a media trama
    if (uHover.z > 0.5 && cc == uHover.xy) { tone = max(tone, 0.4) * 1.25; fc = vec2(0.0); }
    tone -= 0.16 * (fc.x + fc.y) * 0.5 * tone;
    // su casilla es el marco de piedra: en tinta, el labio del hueco y las juntas entre los bloques
    if (tm < 0.5 && (tm < 0.4 || min(tq.x, tq.y) < 0.025 || tq.y > 0.36 && tq.y < 0.4)) tone = 0.0;
    v = tone * uSh * spot(vW.xz) * (1.0 - uDim);
    if (uPud.z > 0.0) {
      // piso mojado: la luz de la pieza se derrama sin borde, más larga hacia la cámara y rota en vetas verticales que tiemblan
      float a, f, g = wet(vW.xz, a, f);
      v = max(v, uPud.z * 0.5 * g * (0.12 + 0.88 * n1(a * 9.0 + 2.5 * n1(f * 1.6 + uTime * 0.35))));
    }
  }
  // umbral: ruido azul en las piezas (punteado orgánico), Bayer en el suelo y las sombras
  float th = uMode < 0.5 ? bn : bayer8(dc) + 1.0 / 128.0;
  gl_FragColor = vec4(step(th, clamp(v, 0.0, 1.0)) > 0.5 ? vec3(200.0, 255.0, 232.0) / 255.0 : vec3(12.0, 12.0, 14.0) / 255.0, 1.0);
}`;
const prog = gl.createProgram();
for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("shader: " + gl.getShaderInfoLog(s));
  gl.attachShader(prog, s);
}
gl.bindAttribLocation(prog, 0, "aPos"); gl.bindAttribLocation(prog, 1, "aNor");
gl.linkProgram(prog); gl.useProgram(prog);
const U = new Proxy({}, { get: (c, n) => c[n] ??= gl.getUniformLocation(prog, n) });
const BUF = {};
for (const k in MESH) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(MESH[k]), gl.STATIC_DRAW); BUF[k] = { b, n: MESH[k].length / 6 }; }
gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1);
function draw(mesh, M, set) {
  const m = BUF[mesh];
  gl.bindBuffer(gl.ARRAY_BUFFER, m.b);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  gl.uniformMatrix4fv(U.uM, false, M);
  for (const k in set) gl.uniform1f(U[k], set[k]);
  gl.drawArrays(gl.TRIANGLES, 0, m.n);
}
// ruido azul 64×64 para el umbral: ruido blanco al que se le quita lo grave y se reordena, varias veces
// ponytail: aproximación barata; void-and-cluster de verdad si se llegan a notar grumos
function blueNoise(n = 64) {
  const N = n * n, r = mulberry32(9);
  let a = Float32Array.from({ length: N }, r);
  for (let it = 0; it < 14; it++) {
    const hp = new Float32Array(N);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let b = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) b += a[((y + dy + n) % n) * n + (x + dx + n) % n] * (2 - Math.abs(dx)) * (2 - Math.abs(dy)) / 16;
      hp[y * n + x] = a[y * n + x] - b;
    }
    const order = Array.from(hp.keys()).sort((p, q) => hp[p] - hp[q]);
    a = new Float32Array(N);
    order.forEach((k, rank) => { a[k] = rank / (N - 1); });
  }
  return Uint8Array.from(a, (v) => Math.round(v * 255));
}
gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
const NOISE = blueNoise();
gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 64, 64, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, NOISE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.uniform1i(U.uNoise, 1);
// luz de relleno de las piezas: la contraria a la luz de día del prototipo, algo levantada
const L = norm([-.954, .85, .318]);
gl.uniform3fv(U.uFillD, norm([-L[0], .25, -L[2]]));
gl.clearColor(12 / 255, 12 / 255, 14 / 255, 1);

// ---------- el túnel bajo la compuerta: otro programa, un solo triángulo que cubre la pantalla. Un tubo que se tuerce y respira,
// en la misma trama de 1 bit del tablero (menta sobre negro), con luces de colores: cada punto es negro, menta o el color puro
// de una luz. Parte en negro (se entra por el hueco), acelera, y al final la niebla se lo traga hasta el negro absoluto
const TUNNEL = 9; // segundos
const TFS = `
precision highp float;
uniform vec2 uRes;
uniform float uT, uLen;
float bayer2(vec2 a) { a = mod(floor(a), 2.0); return a.x * 0.5 + a.y * 0.75 - a.x * a.y; }
float bayer8(vec2 a) { return bayer2(0.25 * a) * 0.0625 + bayer2(0.5 * a) * 0.25 + bayer2(a); }
float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
vec2 h2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
vec3 hue(float h) { return mix(clamp(abs(fract(h + vec3(0.0, 0.6667, 0.3333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0), vec3(1.0), 0.12); }
// por dónde va el eje del tubo, de lado, según lo avanzado
vec2 path(float s) { return vec2(sin(s * 0.21) * 2.2 + sin(s * 0.47) * 0.8, cos(s * 0.17) * 1.8 + sin(s * 0.39) * 0.7); }
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uT, trav = 2.2 * t + 0.4 * t * t; // lo avanzado: cada vez más rápido
  // a qué profundidad está la pared que se ve en este punto: el tubo se dobla, así que su centro en pantalla depende de la
  // profundidad, y la profundidad de la distancia a ese centro; se resuelve en tres vueltas
  vec2 c = vec2(0.0); float z = 1.0, a = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 q = p - c; a = atan(q.y, q.x);
    z = min(60.0, 0.3 * (1.0 + 0.1 * sin(a * 3.0 + trav * 0.8) + 0.06 * sin(a * 5.0 - trav * 1.3)) / max(length(q), 1e-3));
    c = 0.3 * (path(trav + z) - path(trav)) / z;
  }
  float s = trav + z;
  a += s * 0.16 + 0.5 * sin(s * 0.4); // la pared va torcida
  float au = fract(a / 6.28318);
  // la pared: costillas que ondulan a lo largo y pliegues a lo ancho, como tela estirada
  float rib = smoothstep(0.35, 0.95, 0.5 + 0.5 * sin(s * 6.0 + 1.2 * sin(au * 18.85 + s * 0.7)));
  float fold = 0.5 + 0.5 * sin(au * 18.85 - s * 0.5);
  float thread = smoothstep(0.75, 1.0, 0.5 + 0.5 * sin(au * 62.83 + 2.0 * sin(s * 0.9)));
  // cerca de la cámara la pared pasa estirada y muy rápido: ahí se apaga, para que las luces no inunden la pantalla de golpe
  float near = smoothstep(0.25, 1.1, z);
  float base = (0.03 + 0.85 * rib * (0.55 + 0.45 * fold) + 0.35 * thread) * mix(0.3, 1.0, near);
  // luces: lámparas repartidas por la pared (una por celda, no todas), cada una de su color, que laten despacio; y cada tanto un
  // aro entero encendido. No son manchas: alumbran. Lo que tienen cerca (costillas e hilos) se enciende de su color y el aire
  // alrededor queda con un resplandor. L = cuánta luz llega aquí; lc = de qué color pinta este punto: una de las luces que le
  // llegan, sorteada por la trama según cuánto aporta cada una (así dos luces vecinas se funden punto a punto)
  vec2 cell = vec2(au * 7.0, s * 0.55), id0 = floor(cell);
  float L = 0.0; vec3 lc = vec3(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = id0 + vec2(float(i), float(j)), idw = vec2(mod(id.x, 7.0), id.y), rnd = h2(idw);
    vec2 d = (cell - id - (0.25 + 0.5 * h2(idw + 7.0))) * vec2(0.9, 1.8); // en unidades de pared
    float w = step(0.45, rnd.x) * (exp(-dot(d, d) * 3.0) + exp(-dot(d, d) * 40.0)) * (0.7 + 0.3 * sin(t * 2.5 + rnd.y * 6.28));
    L += w;
    if (bayer8(gl_FragCoord.xy + 5.0 * vec2(float(i) + 2.0, 3.0 * float(j) + 4.0)) + 1.0 / 128.0 < w / max(L, 1e-4)) lc = hue(rnd.y);
  }
  float n = floor(s / 3.5), rd = (fract(s / 3.5) - 0.5) * 3.5, ring = step(0.35, h1(n)) * exp(-rd * rd * 5.0) * 0.8;
  L += ring;
  if (bayer8(gl_FragCoord.xy + vec2(1.0, 6.0)) + 1.0 / 128.0 < ring / max(L, 1e-4)) lc = hue(h1(n + 3.0));
  L *= near;
  float amb = base * 0.4, lit = base * 1.8 * L + 0.2 * L;
  // niebla: lo lejano se pierde en negro. Al entrar todo parte apagado; al final la niebla se cierra hasta tapar la pantalla
  float e = clamp((t - (uLen - 2.6)) / 2.6, 0.0, 1.0);
  float v = (amb + lit) * exp(-z * (0.26 + 45.0 * e * e * e)) * smoothstep(0.0, 1.4, t) * (1.0 - smoothstep(uLen - 0.5, uLen - 0.1, t));
  float th = bayer8(gl_FragCoord.xy) + 1.0 / 128.0, th2 = bayer8(gl_FragCoord.xy + vec2(3.0, 5.0)) + 1.0 / 128.0;
  vec3 dark = mix(vec3(12.0, 12.0, 14.0) / 255.0, vec3(0.0), smoothstep(0.0, 2.0, t)); // del negro del sitio al negro absoluto
  gl_FragColor = vec4(v > th ? (lit / (amb + lit + 1e-4) > th2 ? lc : vec3(200.0, 255.0, 232.0) / 255.0) : dark, 1.0);
}`;
// ---------- el vacío al fondo del túnel: "Mente de Damián". Un escenario 3D en la oscuridad: el piso es el damero del tablero, que
// sigue ahí adentro, y sobre él está sentado el coloso que fuma, enorme, como un cartel parado en el piso (su imagen, un video en
// bucle con el humo encima, la arma lib/coloso.js). El piso lo refleja, como el piso mojado del tablero.
// el mismo piso. A la izquierda, Damián: una silueta sentada en su escritorio, contra la luz
// de su pantalla y su lámpara, que habla cuando el coloso termina. Arriba, en el techo que no se ve, la trampilla abierta por la que
// se entró: un cuadrado de luz que deja caer un haz tenue, y por donde se sale. De vez en cuando tiembla, y del tablero, que está arriba, caen piezas de
// ajedrez (esas las dibuja drawFallers con las mallas del tablero; aquí solo se oscurece el piso debajo de ellas). La cámara está abajo,
// a sus pies; con el puntero da una vuelta corta alrededor de él y gira. Todo pasa por la trama; cada punto queda negro o de un color puro
const RFS = `
precision highp float;
uniform vec2 uRes, uCam, uShake; // uCam: giro con el puntero (x, de lado; y, hacia arriba), en radianes; uShake: el temblor corre el cartel del coloso
uniform float uT, uQuake, uHatch, uTalk, uDuck, uType; // uQuake: fuerza del temblor (0 a 1); uHatch: cuánto alumbra la trampilla; uTalk: Damián está
// hablando (0 a 1); uDuck: se encoge porque le cayó algo; uType: está tecleando (0 a 1)
uniform sampler2D uTex;
uniform vec4 uPc[8]; // la sombra de cada pieza en el piso: x, z, radio, cuánto (0 a 1)
const float FLOOR = -1.4, CZ = 8.5, CW = 13.0, CB = -2.54; // el piso (la cámara va 1,4 sobre él); el cartel del coloso: plano z = CZ, CW de ancho, su borde de abajo (sus pies, al 8,8 % del alto, quedan en el piso)
const float CEIL = 11.0, HX = -2.2, HZ = 4.2, HW = 1.2;   // la trampilla: altura del techo, centro y medio lado (los mismos en VOID, en JS)
const vec3 DO = vec3(-5.8, FLOOR, 6.2); const float DY = -1.45, DS = 2.0; // Damián: dónde está (bajo su silla), hacia dónde mira (hacia la izquierda, al vacío: de perfil) y su tamaño. Los mismos en VOID.D, en JS
const vec3 RED = vec3(1.0, 0.16, 0.3), MINT = vec3(0.784, 1.0, 0.91);
float sdBox(vec3 p, vec3 b) { vec3 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0); }
float sdCaps(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r; }
vec2 U(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
// Damián en su escritorio, en sus propias medidas (de pie mediría 1,8; sentado mirando hacia +z). Devuelve distancia y material:
// 1 él y su silla · 2 el escritorio · 3 la pantalla (encendida) · 4 el foco de la lámpara (encendido) · 5 teclado y fierros de la lámpara
vec2 desk(vec3 q) {
  vec3 m = vec3(abs(q.x), q.y, q.z);
  // cuando le cae algo se encoge: el torso se dobla y la cabeza baja hacia la pantalla
  float b = sdCaps(q, vec3(0.0, 0.56, -0.04), vec3(0.0, 1.0 - 0.1 * uDuck, 0.1 + 0.12 * uDuck), 0.17); // torso, algo echado hacia la pantalla
  b = min(b, length(q - vec3(0.0, 1.22 - 0.16 * uDuck, 0.17 + 0.16 * uDuck)) - 0.115);              // cabeza
  b = min(b, sdCaps(m, vec3(0.11, 0.52, 0.0), vec3(0.13, 0.5, 0.42), 0.075));     // muslos
  b = min(b, sdCaps(m, vec3(0.13, 0.5, 0.42), vec3(0.14, 0.05, 0.46), 0.06));     // canillas
  b = min(b, sdCaps(m, vec3(0.2, 0.97, 0.06), vec3(0.24, 0.79, 0.32), 0.055));    // brazos
  // antebrazos, sobre el escritorio; al teclear, cada mano sube y baja a su ritmo
  b = min(b, sdCaps(q, vec3(0.24, 0.79, 0.32), vec3(0.14, 0.8 + 0.03 * uType * max(0.0, sin(uT * 31.0)), 0.56), 0.05));
  b = min(b, sdCaps(q, vec3(-0.24, 0.79, 0.32), vec3(-0.14, 0.8 + 0.03 * uType * max(0.0, sin(uT * 26.0 + 1.7)), 0.56), 0.05));
  b = min(b, min(sdBox(q - vec3(0.0, 0.45, 0.0), vec3(0.24, 0.025, 0.22)), sdBox(q - vec3(0.0, 0.75, -0.23), vec3(0.22, 0.27, 0.025)))); // silla
  b = min(b, sdCaps(q, vec3(0.0, 0.05, 0.0), vec3(0.0, 0.44, 0.0), 0.03));
  vec2 r = vec2(b, 1.0);
  float dk = min(sdBox(q - vec3(0.0, 0.76, 0.72), vec3(0.75, 0.025, 0.36)), sdBox(vec3(abs(q.x) - 0.7, q.y - 0.37, abs(q.z - 0.72) - 0.31), vec3(0.025, 0.37, 0.025)));
  r = U(r, vec2(dk, 2.0));
  vec3 sq = q - vec3(0.0, 0.91, 0.79); sq.yz = mat2(0.97, 0.26, -0.26, 0.97) * sq.yz; // la pantalla del portátil, echada atrás
  r = U(r, vec2(sdBox(sq, vec3(0.17, 0.12, 0.006)), 3.0));
  r = U(r, vec2(min(sdBox(q - vec3(0.0, 0.79, 0.66), vec3(0.17, 0.008, 0.12)), min(sdCaps(q, vec3(0.6, 0.78, 0.92), vec3(0.6, 1.14, 0.86), 0.015), sdCaps(q, vec3(0.6, 1.14, 0.86), vec3(0.55, 1.1, 0.8), 0.015))), 5.0));
  r = U(r, vec2(length(q - vec3(0.55, 1.1, 0.8)) - 0.055, 4.0));
  return r;
}
float bayer2(vec2 a) { a = mod(floor(a), 2.0); return a.x * 0.5 + a.y * 0.75 - a.x * a.y; }
float bayer8(vec2 a) { return bayer2(0.25 * a) * 0.0625 + bayer2(0.5 * a) * 0.25 + bayer2(a); }
vec3 img(vec2 q) { return q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0 ? vec3(0.0) : texture2D(uTex, vec2(q.x, 1.0 - q.y)).rgb; }
vec2 cardQ(vec3 p) { return vec2((p.x - uShake.x) / CW + 0.5, (p.y - uShake.y - CB) / CW); }
// lo que se ve del coloso en un punto del cartel, con su resplandor; a = cuánto tapa (su fondo negro es transparente)
vec3 card(vec2 q, out float a) {
  vec3 c = img(q), g = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float an = float(i) * 0.7854;
    vec3 s1 = img(q + vec2(cos(an), sin(an)) * 0.0035), s2 = img(q + vec2(cos(an + 0.39), sin(an + 0.39)) * 0.011);
    g += s1 * s1 + 0.8 * s2 * s2;
  }
  a = smoothstep(0.03, 0.09, max(c.r, max(c.g, c.b)));
  c += g / 8.0 * 0.75;
  // los rellenos del video son oscuros: con esta curva casi se apagan, y solo las líneas y su halo llegan a encenderse
  float m = max(c.r, max(c.g, c.b));
  return c / max(m, 1e-3) * pow(clamp((m - 0.16) / 0.8, 0.0, 1.0), 3.0);
}
void main() {
  // la cámara: a los pies del coloso, mirando hacia arriba; con el puntero da una vuelta corta a su alrededor y gira hacia ese lado.
  // En pantallas angostas el lente se abre para que entre más. drawFallers arma la misma cámara para las piezas: si se cambia aquí, allá también
  float asp = uRes.x / uRes.y, foc = mix(0.55, 0.8, smoothstep(0.5, 1.4, asp)), oa = uCam.x * 0.5, yw = uCam.x * 1.1, p = 0.3 + uCam.y;
  vec3 eye = vec3(-CZ * sin(oa), 0.0, CZ - CZ * cos(oa)), rd = vec3((gl_FragCoord.xy - 0.5 * uRes) / uRes.y, foc);
  rd.yz = vec2(rd.y * cos(p) + rd.z * sin(p), rd.z * cos(p) - rd.y * sin(p));
  rd.xz = vec2(rd.x * cos(yw) + rd.z * sin(yw), rd.z * cos(yw) - rd.x * sin(yw));
  rd = normalize(rd);
  vec3 c = vec3(0.0);
  float tc = rd.z > 0.0 ? (CZ - eye.z) / rd.z : 1e9, tf = rd.y < 0.0 ? (FLOOR - eye.y) / rd.y : 1e9;

  // Damián: el rayo se lleva a sus medidas (girado y achicado) y avanza dentro de su caja hasta tocarlo. Él y su silla son una
  // silueta: casi negros, con el borde encendido por la luz que tiene delante (su pantalla y su lámpara). El escritorio recibe esa luz.
  // Si el rayo lo roza sin tocarlo, ese punto es su contorno: una línea menta, como un dibujo, que lo recorta contra el negro
  float td = 1e9, edgeT = -1.0, pa = 1.0 / (uRes.y * foc); vec3 dcol = vec3(0.0); // pa: lo que mide una celda a distancia 1
  {
    float cs = cos(DY), sn = sin(DY);
    vec3 q0 = eye - DO, ro = vec3(q0.x * cs - q0.z * sn, q0.y, q0.x * sn + q0.z * cs) / DS, rl = vec3(rd.x * cs - rd.z * sn, rd.y, rd.x * sn + rd.z * cs) + 1e-6;
    vec3 b1 = (vec3(-0.85, 0.0, -0.35) - ro) / rl, b2 = (vec3(0.85, 1.4, 1.15) - ro) / rl, bn = min(b1, b2), bx = max(b1, b2);
    float t = max(max(bn.x, bn.y), max(bn.z, 0.0)), tE = min(bx.x, min(bx.y, bx.z));
    for (int i = 0; i < 72; i++) {
      if (t > tE) break;
      vec2 h = desk(ro + rl * t);
      if (h.x < 1.3 * t * pa && edgeT < 0.0) edgeT = t;
      if (h.x < 0.002) {
        vec3 q = ro + rl * t; vec2 e = vec2(0.003, -0.003);
        vec3 n = normalize(e.xyy * desk(q + e.xyy).x + e.yyx * desk(q + e.yyx).x + e.yxy * desk(q + e.yxy).x + e.xxx * desk(q + e.xxx).x);
        vec3 ls = vec3(0.0, 0.91, 0.79) - q, ll = vec3(0.55, 1.1, 0.8) - q;
        float scr = 0.75 + 0.25 * max(uTalk, uType) * (0.6 + 0.4 * sin(uT * 23.0)); // la pantalla titila un poco cuando habla o teclea
        float lit = scr * max(dot(n, normalize(ls)), 0.0) / (1.0 + dot(ls, ls) * 6.0) + max(dot(n, normalize(ll)), 0.0) / (1.0 + dot(ll, ll) * 4.0);
        float rim = pow(1.0 - abs(dot(n, rl)), 3.0);
        dcol = h.y < 1.5 ? MINT * (0.03 + 0.35 * lit + 0.75 * rim * smoothstep(0.3, 1.3, q.y)) : h.y < 2.5 ? MINT * (0.08 + 0.9 * lit) : h.y < 3.5 ? MINT * scr : h.y < 4.5 ? MINT : MINT * (0.1 + 0.5 * lit);
        td = t * DS;
        break;
      }
      t += h.x;
    }
    if (td > 1e8 && edgeT > 0.0) { td = edgeT * DS; dcol = MINT * 0.85; }
  }

  // el resplandor de su pantalla y su lámpara en el aire: así su silueta se recorta contra la luz (donde él la tapa, no hay)
  vec3 dglow = vec3(0.0);
  {
    float cs = cos(DY), sn = sin(DY);
    vec3 sw = DO + vec3(0.0 * cs + 0.79 * sn, 0.91, -0.0 * sn + 0.79 * cs) * DS, lw = DO + vec3(0.55 * cs + 0.8 * sn, 1.1, -0.55 * sn + 0.8 * cs) * DS;
    float a1 = max(dot(sw - eye, rd), 0.0), a2 = max(dot(lw - eye, rd), 0.0);
    vec3 e1 = eye + rd * a1 - sw, e2 = eye + rd * a2 - lw;
    float k = DS * DS;
    if (a1 < td) dglow += MINT * (0.3 * exp(-dot(e1, e1) / (0.05 * k)) + 0.18 * exp(-dot(e1, e1) / (1.4 * k))) * (0.8 + 0.2 * uTalk);
    if (a2 < td) dglow += MINT * (0.35 * exp(-dot(e2, e2) / (0.03 * k)) + 0.12 * exp(-dot(e2, e2) / (0.4 * k)));
  }

  // el coloso: tapa lo de atrás solo donde hay dibujo (su fondo negro es transparente); bajo el piso no se ve
  float ca = 0.0; vec3 cc = vec3(0.0);
  if (tc < 1e8 && eye.y + rd.y * tc > FLOOR) cc = card(cardQ(eye + rd * tc), ca);

  // el piso: el damero, oscuro. Lo alumbra el coloso (rojo, un charco ancho a sus pies), y
  // refleja al coloso como agua quieta, en franjas que tiemblan. Con el temblor, la luz corre en ondas desde sus pies
  vec3 fc = vec3(0.0);
  if (tf < 1e8) {
    vec3 P = eye + rd * tf;
    // casillas de 2 de lado; las claras reciben la luz, las oscuras casi nada. La luz roja es un charco ancho al pie del coloso, y queda
    // un resto tenue para que el damero se adivine hacia la oscuridad
    float sq = mod(floor(P.x * 0.5 + 0.5) + floor(P.z * 0.5), 2.0) < 0.5 ? 1.0 : 0.07, d = length((P.xz - vec2(0.0, CZ - 1.5)) * vec2(0.55, 1.0));
    fc = sq * RED * (0.62 * exp(-d * d / 22.0) + 0.05) * (1.0 + 0.9 * uQuake * sin(d * 2.6 - uT * 14.0)) * exp(-tf * 0.035);
    if (P.z < CZ) {
      vec3 rr = rd * vec3(1.0, -1.0, 1.0); float t3 = (CZ - P.z) / rr.z, ra;
      vec3 Q = P + rr * t3; Q.x += 0.05 * sin(Q.y * 9.0 + uT * 1.6);
      if (Q.y > FLOOR) fc += card(cardQ(Q), ra) * 0.32 * (0.35 + 0.65 * step(0.4, fract(P.z * 3.0 + uT * 0.3)));
    }
    // la luz del escritorio de Damián en el piso, y el cuadro de luz que cae por la trampilla
    vec2 dl = P.xz - (DO.xz + vec2(cos(DY), -sin(DY)) * 0.4 + vec2(sin(DY), cos(DY)) * 1.0);
    fc += sq * MINT * 0.3 * exp(-dot(dl, dl) / 1.4);
    vec2 hp = abs(P.xz - vec2(HX, HZ)) - HW;
    fc += sq * MINT * 0.35 * uHatch * smoothstep(0.6, -0.4, max(hp.x, hp.y));
    // la sombra de cada pieza: más chica y más oscura mientras más cerca del piso
    for (int i = 0; i < 8; i++) { vec2 e = P.xz - uPc[i].xy; fc *= 1.0 - 0.92 * uPc[i].w * exp(-dot(e, e) / (uPc[i].z * uPc[i].z)); }
  }

  // lo más cercano: Damián, después el coloso (o lo que deja ver detrás), y el piso
  float near = min(td, min(tc, tf));
  if (td <= near) c = dcol;
  else if (tc < tf && tc < 1e8) c = mix(tf < 1e8 ? fc : vec3(0.0), cc, ca) + cc * (1.0 - ca);
  else if (tf < 1e8) c = fc;
  c += dglow;
  // la trampilla, arriba: un cuadrado de luz (el tablero de allá arriba) en un marco de piedra, en un techo que no se ve
  if (rd.y > 0.0) {
    float th = (CEIL - eye.y) / rd.y;
    if (th < near) {
      vec2 hq = abs(eye.xz + rd.xz * th - vec2(HX, HZ));
      float mx = max(hq.x, hq.y);
      if (mx < HW) c = MINT * uHatch * (0.5 + 0.5 * (1.0 - mx / HW));
      else if (mx < HW + 0.35) c = MINT * (0.08 + 0.7 * uHatch * exp(-(mx - HW) * 10.0)) * step(0.06, fract((hq.x + hq.y) * 2.2));
    }
  }
  // el haz que cae por ella: se suma donde el rayo pasa cerca de su eje, antes de chocar con algo
  vec2 ax = vec2(HX, HZ) - eye.xz; float ts = dot(ax, rd.xz) / max(dot(rd.xz, rd.xz), 1e-5), hy = eye.y + rd.y * ts;
  if (ts > 0.0 && ts < near && hy > FLOOR && hy < CEIL) { vec2 dd = eye.xz + rd.xz * ts - vec2(HX, HZ); c += MINT * 0.07 * uHatch * exp(-dot(dd, dd) / (HW * HW * 0.7)) * (0.4 + 0.6 * (hy - FLOOR) / (CEIL - FLOOR)); }
  c *= smoothstep(0.0, 3.0, uT);
  float m = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(m > bayer8(gl_FragCoord.xy) + 1.0 / 128.0 ? c / max(m, 1e-3) : vec3(0.0), 1.0);
}`;
// un programa que pinta la pantalla entera con un solo triángulo
function screenProg(fs) {
  const pr = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }"], [gl.FRAGMENT_SHADER, fs]]) {
    const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error("shader de pantalla: " + gl.getShaderInfoLog(sh));
    gl.attachShader(pr, sh);
  }
  gl.bindAttribLocation(pr, 0, "p"); gl.linkProgram(pr);
  return { pr, u: new Proxy({}, { get: (c, n) => c[n] ??= gl.getUniformLocation(pr, n) }) };
}
const TUN = screenProg(TFS), ROOM = screenProg(RFS);
const tquad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tquad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
// el canvas a resolución de celda
function fit() {
  const w = Math.max(1, Math.ceil(cv.clientWidth / CELL)), h = Math.max(1, Math.ceil(cv.clientHeight / CELL));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  gl.viewport(0, 0, w, h);
  return [w, h];
}
// t = segundos dentro del túnel o del vacío
function drawScreen(S, t, cam = [0, 0]) {
  const [w, h] = fit();
  gl.useProgram(S.pr); gl.disable(gl.DEPTH_TEST);
  gl.bindBuffer(gl.ARRAY_BUFFER, tquad); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(S.u.uRes, w, h); gl.uniform1f(S.u.uT, t); gl.uniform1f(S.u.uLen, TUNNEL); gl.uniform1i(S.u.uTex, 2); gl.uniform2f(S.u.uCam, cam[0], cam[1]); // uLen solo lo tiene el túnel; uTex y uCam, el vacío
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.useProgram(prog);
}
// el vacío: el módulo que arma la imagen, su canvas (cuadrado, fijo) y la textura por la que llega al shader. t = segundos desde
// que empezó a verse; dt = segundos desde el cuadro anterior (0 = el humo no avanza); cam = giro de la cámara. Devuelve false
// mientras el video no tenga un cuadro que mostrar
let coloso = null;
const roomCv = Object.assign(document.createElement("canvas"), { width: 1024, height: 1024 }), roomG = roomCv.getContext("2d"), roomTex = gl.createTexture();
gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, roomTex);
for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
const loadColoso = () => import("./coloso.js").then((m) => { coloso = m; });
// ---------- el temblor y las piezas que caen al vacío. Cada 10 a 20 s (el primero a los 7 s de aparecer el coloso) tiembla: la
// cámara se sacude, el coloso se corre y la luz del piso corre en ondas. Y del tablero, que está arriba, caen unas piezas de ajedrez:
// dan vueltas en el aire, golpean el piso, rebotan y quedan tiradas (algunas de pie). Con el temblor siguiente las que están en el piso
// saltan. Caben 8: cuando cae una más, la más vieja se deshace punto a punto. Sin animaciones no tiembla ni cae nada
const VOID = { FLOOR: -1.4, CZ: 8.5, CEIL: 11, HX: -2.2, HZ: 4.2, HW: 1.2, D: [-5.8, 6.2, -1.45, 2] }, PS = 1.5, GRAV_V = 16; // las medidas del shader (RFS); D: Damián (x, z, rumbo, tamaño); PS: tamaño de las piezas; GRAV_V: gravedad
const QLEN = 2.6; // segundos que dura un temblor
let quake = { next: 7, t: -99, hit: -99 }, fallers = [], ouch = null; // ouch: la última vez que a Damián le cayó una pieza { at, text }
// un punto de Damián (en sus medidas: sentado mirando hacia +z) llevado al mundo
const damianAt = (x, y, z) => { const [dx, dz, dy, ds] = VOID.D, c = Math.cos(dy), s = Math.sin(dy); return [dx + (x * c + z * s) * ds, VOID.FLOOR + y * ds, dz + (-x * s + z * c) * ds]; }; // next: cuándo toca el próximo; t: cuándo empezó el último; hit: el último golpe contra el piso
// dónde pueden caer: delante del coloso, lejos de la cámara
const dropAt = () => [mix(-2.6, 2.4, Math.random()), mix(6.4, 8, Math.random())]; // a la izquierda está Damián // más cerca, la cámara (que mira hacia arriba) no ve el piso
function dropPieces(t) {
  // las que ya están en el piso saltan con el remezón
  for (const o of fallers) if (o.mode === "ground") { o.mode = "air"; o.vy = 2 + Math.random() * 2.5; o.w = (Math.random() - .5) * 4; }
  // a veces una cae justo sobre la cabeza de Damián (con &aim=1, solo en dev, la primera siempre)
  const n = 2 + Math.floor(Math.random() * 3), aim = Q.has("aim") ? 0 : Math.random() < .4 ? Math.floor(Math.random() * n) : -1, head = damianAt(0, 1.22, .17);
  for (let i = 0; i < n; i++) {
    const [x, z] = i === aim ? [head[0] + (Math.random() - .5) * .3, head[2] + (Math.random() - .5) * .3] : dropAt(), kinds = Object.keys(BASE), mesh = kinds[Math.floor(Math.random() * kinds.length)], a = Math.random() * 6.283;
    fallers.push({ mesh, white: Math.random() < .5, x, z, y: 11 + i * 3.5 + Math.random() * 2, vy: 0, vx: 0, vz: 0, yaw: Math.random() * 6.283, d: [Math.cos(a), Math.sin(a)], th: Math.random() * 6.283, w: (Math.random() < .5 ? -1 : 1) * (2 + Math.random() * 3), mode: "air", bounced: false, die: null });
  }
  // las que sobran, de la más vieja a la más nueva, se deshacen
  fallers.slice(0, Math.max(0, fallers.length - 8)).forEach((o) => { o.die ??= t; });
}
// una pieza ladeada th hacia d gira sobre el canto de su pie (como las del tablero, ver fallen); en el piso se la levanta lo justo
// para que nada se hunda
function fallerM(o) {
  const b = BASE[o.mesh], Rf = rot([o.d[1], 0, -o.d[0]], o.th), v = [o.d[0] * b, 0, o.d[1] * b];
  const R = mul3(Rf, rot([0, 1, 0], o.yaw)).map((k) => k * PS), lift = o.mode === "ground" ? liftAt(o.rest.hull, o.th) : 0;
  return model(R, [o.x + (v[0] - (Rf[0] * v[0] + Rf[6] * v[2])) * PS, VOID.FLOOR + o.y + (-(Rf[1] * v[0] + Rf[7] * v[2]) + lift) * PS, o.z + (v[2] - (Rf[2] * v[0] + Rf[8] * v[2])) * PS]);
}
function stepFallers(t, dt) {
  if (RM) return;
  if (t >= quake.next) { quake.t = t; quake.next = t + 10 + Math.random() * 10; dropPieces(t); sfx("temblor"); }
  for (const o of fallers) {
    if (o.mode === "air") {
      o.vy -= GRAV_V * dt; o.y += o.vy * dt; o.th += o.w * dt; o.x += o.vx * dt; o.z += o.vz * dt;
      // ¿le cayó en la cabeza a Damián? Rebota hacia afuera y él se queja
      const head = damianAt(0, 1.22, .17), hx = o.x - head[0], hz = o.z - head[2];
      if (!o.hitD && o.vy < 0 && hx * hx + hz * hz < .45 && VOID.FLOOR + o.y < head[1] + .3 && VOID.FLOOR + o.y > head[1] - .6) {
        const l = Math.hypot(hx, hz) || 1, away = [hx / l * .6 + .8, hz / l * .6 - .3]; // hacia afuera de él y del escritorio
        o.hitD = true; o.vy = 3 + Math.random() * 1.5; o.vx = away[0] * 2.2; o.vz = away[1] * 2.2; o.w *= -1.4; quake.hit = t;
        ouch = { at: t, text: OUCH[Math.floor(Math.random() * OUCH.length)] }; sfx("cabezazo");
      }
      if (o.y <= 0 && o.vy < 0) {
        o.y = 0; o.vx = o.vz = 0; quake.hit = t;
        // el golpe contra el piso (uno de tres, con el tono algo corrido); los que vienen después de un rebote, más chicos
        if (o.bounced || o.vy > -7) sfx("rebota", Math.min(1, -o.vy / 6), .9 + Math.random() * .2); else sfx("cae" + (1 + Math.floor(Math.random() * 3)), 1, .9 + Math.random() * .2);
        // golpe fuerte: rebota una vez, sigue dando vueltas; si no, queda en el piso, ladeada hacia donde iba (o de pie, si cayó casi derecha)
        if (o.vy < -7 && !o.bounced) { o.vy *= -.22; o.w *= .5; o.bounced = true; continue; }
        let th = ((o.th % 6.283) + 6.283) % 6.283; if (th > Math.PI) { th = 6.283 - th; o.d = [-o.d[0], -o.d[1]]; }
        o.rest = restAt(o.mesh, o.yaw, 1, o.d);
        o.th = Math.min(th, o.rest.r); o.goal = th < .5 && Math.random() < .5 ? 0 : o.rest.r; o.w = 0; o.mode = "ground";
      }
    } else if (o.mode === "ground") {
      // se asienta: un resorte la lleva a su ángulo final, con un par de bamboleos; el suelo la frena
      o.w += (70 * (o.goal - o.th) - 9 * o.w) * dt; o.th += o.w * dt;
      if (o.th > o.rest.r) { o.th = o.rest.r; o.w *= -.3; }
      if (o.th < 0) { o.th = -o.th; o.w = -o.w; }
    }
  }
  fallers = fallers.filter((o) => o.die == null || t - o.die < 1);
}
// la sacudida del temblor (y un golpecito cada vez que una pieza toca el piso), para la cámara y para el cartel del coloso
function shake(t) {
  const q = t - quake.t, env = q < 0 || q > QLEN ? 0 : Math.min(1, q / .15) * Math.pow(1 - q / QLEN, 1.5), hit = Math.exp(-(t - quake.hit) * 9);
  return { env, cam: [env * (.022 * Math.sin(q * 47) + .012 * Math.sin(q * 83 + 1)), env * (.02 * Math.sin(q * 59 + 2) + .01 * Math.sin(q * 97)) + hit * .006 * Math.cos((t - quake.hit) * 60)], card: [env * .09 * Math.sin(q * 31), env * .05 * Math.sin(q * 43 + 1)] };
}
// las piezas, con las mallas y el shader del tablero, sobre lo que dejó el vacío. La cámara es la misma del shader del vacío; como el
// vacío mira hacia +z con +x a la derecha (al revés que lookAt), la proyección va espejada y las caras cambian de sentido
function drawFallers(t, cam) {
  const w = cv.width, h = cv.height, asp = w / h, foc = mix(.55, .8, sstep(.5, 1.4, asp)), oa = cam[0] * .5, yw = cam[0] * 1.1, p = .3 + cam[1];
  const eye = [-VOID.CZ * Math.sin(oa), 0, VOID.CZ - VOID.CZ * Math.cos(oa)], dir = [Math.cos(p) * Math.sin(yw), Math.sin(p), Math.cos(p) * Math.cos(yw)];
  const f = 2 * foc, n = .1, far = 120, P = new Float32Array([-f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + n) / (n - far), -1, 0, 0, 2 * far * n / (n - far), 0]);
  gl.uniformMatrix4fv(U.uVP, false, mul4(P, lookAt(eye, [eye[0] + dir[0], eye[1] + dir[1], eye[2] + dir[2]])));
  gl.uniform3fv(U.uEye, eye); gl.uniform3f(U.uLightP, -2, 9, VOID.CZ - 4); gl.uniform4f(U.uSpot, 0, 0, 1e3, 2e3); gl.uniform1f(U.uSpotK, 1);
  gl.uniform4f(U.uPud, 0, 0, 0, 0); gl.uniform3f(U.uHover, 0, 0, 0); gl.uniform2f(U.uPan, 0, 0); gl.uniform1f(U.uTime, t);
  gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.frontFace(gl.CW);
  const items = fallers.map((o) => ({ mesh: o.mesh, M: fallerM(o), dim: o.die == null ? 0 : clamp01(t - o.die), set: { uKind: KIND[o.mesh], uAlb: o.white ? .93 : .24, uGround: 1, uSel: 0, uHot: 0 } }));
  gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
  for (const it of items) draw(it.mesh, it.M, { uMode: 6, uProj: 0, uOut: .045, uSel: 0, uDim: it.dim });
  gl.disable(gl.CULL_FACE); gl.uniform1f(U.uOut, 0);
  for (const it of items) draw(it.mesh, it.M, { uMode: 0, uProj: 0, uDim: it.dim, ...it.set });
  gl.uniform1f(U.uDim, 0); gl.frontFace(gl.CCW); gl.disable(gl.DEPTH_TEST);
}
let talk = 0; // Damián habla (0 a 1, suavizado)
// Damián teclea de a ratos, cuando no está hablando: cada 5 a 13 s, una racha de 1,5 a 3,5 s. Sus manos se mueven (uType) y suena el
// teclado, a la izquierda o a la derecha según dónde quede él en la pantalla. typing: { next, until, voice }; type: suavizado (0 a 1)
let typing = { next: 4, until: 0, voice: null }, type = 0;
function stopTyping() { if (typing.voice) { const { src, gain } = typing.voice, n = actx.currentTime; gain.gain.setTargetAtTime(0, n, .03); src.stop(n + .15); typing.voice = null; } }
function stepTyping(t, dt) {
  if (RM) return;
  const busy = talk > .1 || (ouch && t - ouch.at < 1.9);
  if (typing.voice && (t >= typing.until || busy)) { stopTyping(); typing.next = t + 5 + Math.random() * 8; }
  else if (!typing.voice && t >= typing.next && !busy && t > 3) {
    const at = voidToHud(damianAt(0, .8, .6)), pan = at ? Math.max(-1, Math.min(1, at[0] / hudCv.width * 2 - 1)) * .8 : -.8;
    typing.voice = sfx("teclado", 1, 1, false, Math.random() * 2.5, pan);
    if (typing.voice) typing.until = t + 1.5 + Math.random() * 2; else typing.next = t + 2; // si el audio no está, lo intenta después
  }
  type += ((typing.voice ? 1 : 0) - type) * Math.min(1, dt * 10);
}
// ¿el puntero está sobre la trampilla de arriba? Se tira el mismo rayo del shader del vacío (RFS) desde ese punto de la pantalla
function overHatch(cx, cy) {
  if (!dive?.lastCam) return false;
  const rc = cv.getBoundingClientRect(), foc = mix(.55, .8, sstep(.5, 1.4, rc.width / rc.height)), [c0, c1] = dive.lastCam, oa = c0 * .5, yw = c0 * 1.1, p = .3 + c1;
  let x = (cx - rc.left - rc.width / 2) / rc.height, y = (rc.height / 2 - (cy - rc.top)) / rc.height, z = foc;
  [y, z] = [y * Math.cos(p) + z * Math.sin(p), z * Math.cos(p) - y * Math.sin(p)];
  [x, z] = [x * Math.cos(yw) + z * Math.sin(yw), z * Math.cos(yw) - x * Math.sin(yw)];
  if (y <= 0) return false;
  const t = VOID.CEIL / y, ex = -VOID.CZ * Math.sin(oa), ez = VOID.CZ - VOID.CZ * Math.cos(oa); // el ojo va en y = 0
  return Math.max(Math.abs(ex + x * t - VOID.HX), Math.abs(ez + z * t - VOID.HZ)) < VOID.HW + .25;
}
function drawRoom(t, dt, cam = [0, 0]) {
  if (!coloso || !coloso.ready()) return false; // todavía no llega: sigue el negro del final del túnel
  coloso.frame(roomG, 1024, 1024, dt);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, roomTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, roomCv);
  if (dt > 0) { stepFallers(t, dt); stepTyping(t, dt); }
  const sh = shake(t), c = [cam[0] + sh.cam[0], cam[1] + sh.cam[1]];
  // la sombra de cada pieza en el piso (las primeras 8): bajo su centro; crece y se aclara mientras más alto va
  const pc = new Float32Array(32);
  fallers.slice(0, 8).forEach((o, i) => {
    const lean = o.mode === "ground" ? Math.sin(o.th) * TALL[o.mesh] * .5 * PS : 0;
    pc.set([o.x + o.d[0] * lean, o.z + o.d[1] * lean, (BASE[o.mesh] + .1 + lean * .6) * PS + o.y * .15, Math.exp(-o.y * .25) * (o.die == null ? 1 : 1 - clamp01(t - o.die))], i * 4);
  });
  // cuánto alumbra la trampilla (más desde que Damián dice que se sale por arriba) y si él está hablando
  const tc = talkClock(), now = SUBS.find(([a, b]) => tc >= a && tc < b + .6), last = SUBS[SUBS.length - 1];
  talk += ((now && now[3] ? 1 : 0) - talk) * Math.min(1, dt * 6);
  gl.useProgram(ROOM.pr); gl.uniform4fv(ROOM.u["uPc[0]"], pc); gl.uniform1f(ROOM.u.uQuake, sh.env); gl.uniform2f(ROOM.u.uShake, ...sh.card);
  if (dive && !dive.lit && tc >= last[0] + .4) { dive.lit = true; sfx("luz"); } // se enciende cuando él la nombra
  gl.uniform1f(ROOM.u.uHatch, .07 + .93 * sstep(last[0] + .4, last[0] + 1.6, tc)); gl.uniform1f(ROOM.u.uTalk, talk); gl.uniform1f(ROOM.u.uType, type); // la trampilla, casi apagada hasta que él dice que se sale por arriba
  gl.uniform1f(ROOM.u.uDuck, ouch ? Math.sin(Math.PI * Math.min(1, Math.max(0, t - ouch.at) / 1.1)) : 0);
  if (dive) dive.lastCam = c;
  drawScreen(ROOM, t, c);
  if (fallers.length) drawFallers(t, c);
  return true;
}

// ---------- el contenido: lo que el servidor dejó en .secciones, en el idioma de la página
const scene = document.querySelector(".tablero");
// pieza → [título, párrafo, [[título, dirección], ...]] (la lista solo la tienen los artículos)
const DEST = {};
for (const s of scene.querySelectorAll(".secciones [data-pieza]")) {
  DEST[s.dataset.pieza] = [s.querySelector("h2").textContent, s.querySelector("p")?.textContent ?? "", Array.from(s.querySelectorAll("li a"), (a) => [a.textContent, a.getAttribute("href")])];
}
const HINT = scene.dataset.pista, HINT_BACK = scene.dataset.pistaVolver, HOME = scene.dataset.inicio, HOME_TITLE = scene.dataset.titulo;

const BASE = { pawn: .27, rook: .33, knight: .33, bishop: .32, queen: .36, king: .37 };
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// pieza tomada: th = cuánto está volcada (0 de pie, restOf(...).r tumbada), w = su velocidad, side = hacia qué lado de la pantalla.
// modo: "drag" la lleva el puntero · "fall" cae sola · "rise" vuelve a pararse · "down" quedó en el suelo (downT = segundos ahí)
// cómo queda apoyada una pieza: se mira su perfil hacia el lado en que cae (u = distancia desde el canto del pie hacia ese lado, y = altura).
// Rueda sobre el canto del pie; cuando otro punto toca el suelo pasa a rodar sobre él (el borde de arriba del pie, después la cabeza),
// hasta que su centro queda entre los dos apoyos. Así la cabeza llega al suelo en vez de quedar en el aire. Devuelve el ángulo
// y la envolvente del perfil, con la que fallen() levanta la pieza para que nada se hunda en el suelo
function restAt(mesh, yaw, side, d = [ISO.r[0] * side, ISO.r[2] * side]) { // d: hacia dónde cae, en el suelo (por omisión, a un lado de la pantalla del tablero)
  const m = MESH[mesh], R = rot([0, 1, 0], yaw), b = BASE[mesh];
  const pts = []; let cu = 0, cy = 0;
  for (let i = 0; i < m.length; i += 6) {
    const x = m[i], y = m[i + 1], z = m[i + 2], u = (R[0] * x + R[6] * z) * d[0] + (R[2] * x + R[8] * z) * d[1] - b;
    pts.push([u, y]); cu += u; cy += y;
  }
  cu /= pts.length; cy /= pts.length; // centro: promedio de los vértices, alcanza para decidir si sigue rodando
  // envolvente convexa (cadena monótona): pocos puntos para recorrer en cada cuadro
  pts.sort((a, c) => a[0] - c[0] || a[1] - c[1]);
  const cross = (o, a, c) => (a[0] - o[0]) * (c[1] - o[1]) - (a[1] - o[1]) * (c[0] - o[0]), hull = [];
  for (const list of [pts, pts.slice().reverse()]) { const h = []; for (const q of list) { while (h.length > 1 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); } h.pop(); hull.push(...h); }
  let piv = [0, 0], th = 0;
  for (let step = 0; step < 12; step++) {
    let next = null, best = Math.PI * 1.5;
    for (const q of hull) {
      const du = q[0] - piv[0], dy = q[1] - piv[1];
      if (Math.hypot(du, dy) < 1e-3) continue;
      let a = Math.atan2(dy, du); if (a < th - 1e-4) a += 2 * Math.PI;
      if (a > th + 1e-4 && a < best) { best = a; next = q; }
    }
    if (!next) break;
    th = best;
    // ¿el centro quedó antes del nuevo apoyo (visto en el suelo)? entonces se queda ahí
    const along = (q) => q[0] * Math.cos(th) + q[1] * Math.sin(th);
    if (along([cu, cy]) <= along(next) + 1e-4) break;
    piv = next;
  }
  return { r: th, hull };
}
// cuánto hay que subir la pieza, inclinada th sobre el canto del pie, para que ningún punto quede bajo el suelo
const liftAt = (hull, th) => { let l = 0; for (const [u, y] of hull) l = Math.max(l, u * Math.sin(th) - y * Math.cos(th)); return l; };
// el caballo no es redondo: mientras cae gira sobre su eje hasta que la cabeza mira hacia el suelo (el giro que lo deja más tumbado
// sobre ella), en vez de quedar de lado con la cabeza al aire. Las demás piezas no giran
const REST = new Map();
function restOf(p, side) {
  const key = p.mesh + "|" + p.yaw + "|" + side;
  if (!REST.has(key)) {
    let yaw = p.yaw, best = restAt(p.mesh, yaw, side);
    if (p.mesh === "knight") for (let k = 0; k < 36; k++) { const y = p.yaw + (k / 36) * 2 * Math.PI - Math.PI, ry = restAt(p.mesh, y, side); if (ry.r < best.r) { best = ry; yaw = y; } }
    REST.set(key, { r: best.r, hull: best.hull, yaw });
  }
  return REST.get(key);
}
let sel = null, shown = [], view = { x: 0, z: 0, R: 0 };
const rotulo = document.getElementById("rotulo"), pxLabel = rotulo.querySelector("canvas"), bodyEl = rotulo.querySelector(".cuerpo"), listEl = rotulo.querySelector(".lista"), srLabel = rotulo.querySelector(".sr");
const labelFont = () => `700 ${cv.clientWidth < cv.clientHeight ? 17 : 19}px "Lora Variable", Lora, Georgia, serif`; // el tamaño va en celdas
const fontReady = document.fonts.load(labelFont());
let stops = [0];
// largo del conjunto en casillas: de la base de la pieza al final del texto. La luz del piso y el encuadre se ajustan a eso
const isTall = () => cv.clientWidth < cv.clientHeight;
const blockW = () => Math.max(pxLabel.width, body ? bodyEl.offsetWidth / CELL : 0); // ancho del bloque de texto, en celdas
// a cuántas casillas de la pieza, hacia la derecha de la pantalla, parte el texto: pasada su punta si cayó para ese lado, pasado su pie si cayó al otro
const anchorOf = (s) => (s.side > 0 ? BASE[s.p.mesh] + TALL[s.p.mesh] : BASE[s.p.mesh]) + .3;
const GAP = 56, MARGIN = 48; // px entre la lista y el artículo, y al borde de la pantalla
// ancho de la columna del artículo: lo que sobra después de la pieza y el bloque, entre 280 y 460 px (0 si la sección no tiene lista)
const artW = (s) => (listEl.children.length ? Math.max(280, Math.min(460, cv.clientWidth - 2 * MARGIN - (2 * BASE[s.p.mesh] + TALL[s.p.mesh] + .3) * (cv.clientHeight / viewH()) - blockW() * CELL - GAP)) : 0);
// el texto se dibuja chico (una celda = un píxel), se pasa a 1 bit y el navegador lo agranda sin suavizar
const bitmaps = new Map();
function textBitmap(text, cells, dark) {
  const key = cells + (dark ? "n" : "b") + text;
  if (bitmaps.has(key)) return bitmaps.get(key);
  const c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true }), font = `${cells < 16 ? 600 : 700} ${cells}px "Lora Variable", Lora, Georgia, serif`; // chico va menos grueso: no se le tapan los ojos a las letras
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 2, h = Math.ceil(cells * 1.4), ink = dark ? [12, 12, 14] : [200, 255, 232];
  c.width = w; c.height = h;
  g.font = font; g.fillStyle = "#fff"; g.fillText(text, 1, Math.round(cells * 1.05));
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const on = d[i + 3] > (cells < 16 ? 135 : 110); d[i] = ink[0]; d[i + 1] = ink[1]; d[i + 2] = ink[2]; d[i + 3] = on ? 255 : 0; }
  g.putImageData(im, 0, 0);
  c.stops = Array.from(text, (_, i) => Math.round(g.measureText(text.slice(0, i)).width) + 1).concat(w); // dónde termina cada letra, en celdas
  bitmaps.set(key, c);
  return c;
}
fontReady.then(() => { bitmaps.clear(); wake(); }); // lo dibujado con la fuente de respaldo se rehace
function drawLabel(text) {
  const bm = textBitmap(text, parseInt(labelFont().slice(4)));
  pxLabel.width = bm.width; pxLabel.height = bm.height;
  pxLabel.getContext("2d").drawImage(bm, 0, 0);
  stops = bm.stops;
  pxLabel.style.width = bm.width * CELL + "px"; pxLabel.style.height = bm.height * CELL + "px";
}
// ---------- respuesta al puntero: qué pieza toca, dónde está sobre el suelo, y la capa de nombres y pistas
const hover = { p: null, np: null, t0: 0, on: false, sx: 0, sy: 0 }; // sx, sy: puntero en px desde el centro (y hacia arriba); np: la última pieza tocada, que termina su cabeceo aunque el puntero ya se haya ido
let light = { x: 0, z: 0, ox: 0, oz: 0, k: 1 }, panned = false, nowT = 0;
// cuántas veces ha visto la pista para volver (entre visitas): sale solo las dos primeras. Cuenta cuando aparece, no cuando la
// pieza cae: si la levanta antes de que salga, no gastó ninguna
const FALLS_KEY = "tablero-pista-volver";
let falls = 0;
try { falls = +localStorage.getItem(FALLS_KEY) || 0; } catch {}
// distancia al centro del foco, en casillas, con el mismo estiramiento que usa el shader
const fromLight = (p) => { const dx = p.x - light.x, dz = p.z - light.z; return Math.hypot(dx * ISO.r[0] + dz * ISO.r[2], (dx * ISO.f[0] + dz * ISO.f[2]) / light.k); };
const fizz = document.createElement("canvas"), fizzG = fizz.getContext("2d"), fizzIm = fizzG.createImageData(64, 64); fizz.width = fizz.height = 64;
const hudCv = document.getElementById("hud"), hudG = hudCv.getContext("2d");
function drawHud(target, R) {
  if (hudCv.width !== cv.width || hudCv.height !== cv.height) { hudCv.width = cv.width; hudCv.height = cv.height; }
  hudCv.style.width = cv.width * CELL + "px"; hudCv.style.height = cv.height * CELL + "px";
  hudG.clearRect(0, 0, hudCv.width, hudCv.height);
  if (dive) return; // entrando al hueco no hay nombres ni pistas
  // con una pieza en juego los nombres se van deshaciendo al mismo ritmo que las demás piezas
  const dim = sel ? sstep(.3, 1.5, sel.th) : 0;
  const ppc = cv.height / viewH(), sinP = Math.sin(ISO.pitch), cosP = Math.cos(ISO.pitch), cx = cv.width / 2, cy = cv.height / 2, small = cv.width < cv.height ? 11 : 13;
  // placa: texto sobre fondo liso (nunca directo sobre la trama); la de la pieza tocada va invertida
  const plate = (text, x, y, hot) => {
    const bm = textBitmap(text, small, hot), px = Math.max(3, Math.min(hudCv.width - bm.width - 3, Math.round(x - bm.width / 2))), py = Math.round(y - bm.height); // nunca cortada por el borde
    hudG.fillStyle = hot ? "rgb(200,255,232)" : "rgb(12,12,14)"; hudG.fillRect(px - 3, py - 1, bm.width + 6, bm.height + 2);
    hudG.drawImage(bm, px, py);
  };
  if (dim < 1) drawNames(target, R, dim, plate, ppc, sinP, cosP, cx, cy, small);
  // pista para volver: con la pieza en el suelo y el texto ya escrito, si se queda quieta un rato, una placa sobre ella dice que
  // se levanta. Solo las dos primeras veces que la ve
  if (sel && sel.mode === "down" && sel.downT > typeEnd() + 2 && (sel.hint || falls < 2)) {
    if (!sel.hint) { sel.hint = true; falls++; try { localStorage.setItem(FALLS_KEY, String(falls)); } catch {} }
    const p = sel.p, b = BASE[p.mesh], H = TALL[p.mesh], ex = p.x - target[0], ez = p.z - target[2];
    let x = cx + (ex * ISO.r[0] + ez * ISO.r[2] + sel.side * (b + H / 2)) * ppc;
    const y = cy - ((ex * ISO.f[0] + ez * ISO.f[2]) * sinP + 2 * b * cosP + b * sinP) * ppc - 3;
    // en horizontal el texto va a un lado de la pieza: la placa no se le mete encima
    if (!isTall()) {
      const w = textBitmap(HINT_BACK, small, false).width, hr = hudCv.getBoundingClientRect(), rr = rotulo.getBoundingClientRect();
      const l = (rr.left - hr.left) / CELL - 4, r = (rr.right - hr.left) / CELL + 4; // el texto, en celdas del hud, con un margen
      if ((l + r) / 2 > x) x = Math.min(x, l - w / 2); else x = Math.max(x, r + w / 2);
    }
    plate(HINT_BACK, x, y, false);
  }
}
function drawNames(target, R, dim, plate, ppc, sinP, cosP, cx, cy, small) {
  // nombre de cada pieza que está bien dentro de la luz
  for (const p of shown) {
    if ((sel && p === sel.p) || (fromLight(p) > R * .8 && p !== hover.p)) continue;
    const ex = p.x - target[0], ez = p.z - target[2], x = cx + (ex * ISO.r[0] + ez * ISO.r[2]) * ppc;
    if (x < 0 || x > hudCv.width) continue; // la pieza quedó fuera de la pantalla: su nombre también
    plate(DEST[p.mesh][0], x, cy - ((ex * ISO.f[0] + ez * ISO.f[2]) * sinP + TALL[p.mesh] * cosP) * ppc - 3, !sel && p === hover.p);
  }
  // pista: arrastrar, hasta que lo haga una vez
  if (!panned) plate(HINT, cx, cv.height - small * 1.6, false);
  if (dim > 0) {
    for (let i = 0; i < 4096; i++) fizzIm.data[i * 4 + 3] = NOISE[i] < dim * 255 ? 255 : 0;
    fizzG.putImageData(fizzIm, 0, 0);
    hudG.globalCompositeOperation = "destination-out"; hudG.fillStyle = hudG.createPattern(fizz, "repeat"); hudG.fillRect(0, 0, hudCv.width, hudCv.height);
    hudG.globalCompositeOperation = "source-over";
  }
}
// scroll con un artículo abierto: no hay caja con barra; la rueda sube y baja el texto del artículo, y la pieza, el título y la lista
// se quedan donde están para que todo siga a la vista. readY = px bajados
// readTo = px bajados que se piden; readY los alcanza con una curva (rate = qué tan rápido, por segundo) en vez de saltar
let readY = 0, readTo = 0, readRate = 14;
function scrollBy(d, rate = 14) {
  const top = new DOMMatrix(rotulo.style.transform).m42 + artEl.offsetTop; // dónde parte el artículo en pantalla
  readTo = art ? Math.max(0, Math.min(Math.max(0, top + artEl.offsetHeight + 72 - cv.clientHeight), readTo + d)) : 0;
  if (d) readRate = rate;
}
// dt en segundos; sin dt llega de inmediato (cuadros fijos)
function stepScroll(dt) {
  scrollBy(0);
  readY = dt == null ? readTo : readY + (readTo - readY) * (1 - Math.exp(-dt * readRate));
  artEl.style.transform = `translateY(${-readY}px)`;
}
// dónde se para la cámara con una pieza en el suelo: centra pieza + texto a lo ancho y deja lugar al texto que cuelga hacia abajo
function goalOf(s) {
  const p = s.p, b = BASE[p.mesh], H = TALL[p.mesh], ppu = cv.clientHeight / viewH(), cy = cv.clientHeight / 2;
  const pr = p.x * ISO.r[0] + p.z * ISO.r[2], pf = p.x * ISO.f[0] + p.z * ISO.f[2]; // la pieza en ejes de pantalla, en casillas
  const reading = art && !art.out;
  let ar, up;
  if (isTall()) {
    // vertical: pieza centrada arriba y bloque debajo; con un artículo abierto el bloque sube hasta arriba
    ar = pr + s.side * H / 2; up = reading ? cy + 1.25 * ppu - 36 : .26 * cv.clientHeight;
  } else {
    // horizontal: se centra lo que hay a la vista: pieza + bloque, y también el artículo cuando hay uno abierto.
    // Al abrir o cerrar, el conjunto se desliza lo justo para volver a quedar centrado, siempre con todo en pantalla
    const w = reading ? artW(s) : 0, left = pr - (s.side > 0 ? b : b + H), right = pr + anchorOf(s) + (blockW() * CELL + (w ? GAP + w : 0)) / ppu;
    ar = (left + right) / 2;
    up = body ? (bodyEl.offsetHeight + listEl.offsetHeight) * .35 : 0;
  }
  const af = pf - up / ppu / Math.sin(ISO.pitch);
  return [ISO.r[0] * ar + ISO.f[0] * af, ISO.r[2] * ar + ISO.f[2] * af];
}
// texto de la sección: párrafo y, si tiene, lista de links. Es texto normal del navegador que se escribe de corrido:
// primero el párrafo y después cada ítem. Lo que falta por escribir ya ocupa su lugar (invisible) para que nada salte
let body = "", parts = [];
const TYPE_TITLE = .045, TYPE_BODY = .012; // segundos por letra
const typeEnd = () => .3 + (stops.length - 1) * TYPE_TITLE + parts.reduce((n, q) => n + q.text.length, 0) * TYPE_BODY; // cuándo termina de escribirse todo
// los links de la lista que se abren al lado, dentro del tablero: los artículos. Los demás (redes, proyectos, /seabell) son links normales
const isArticle = (a) => a.host === location.host && a.pathname.includes("/articles/");
// ancho del bloque: con artículos va más angosto, porque al lado tiene que caber el que se abra. Se recalcula al cambiar la ventana
function fitBody() {
  bodyEl.style.width = listEl.style.width = (isTall() ? cv.clientWidth - 48 : Array.from(listEl.querySelectorAll("a")).some(isArticle) ? Math.min(440, cv.clientWidth * .3) : Math.min(600, cv.clientWidth * .42)) + "px";
}
function setBody(text, items = []) {
  body = text;
  bodyEl.style.display = text ? "" : "none";
  bodyEl.setAttribute("aria-label", text); // el lector de pantalla lo recibe entero, no letra por letra
  listEl.replaceChildren(...items.map(([title, href]) => {
    const li = document.createElement("li"), a = document.createElement("a");
    a.href = href; a.setAttribute("aria-label", title);
    if (a.host !== location.host) { a.target = "_blank"; a.rel = "noopener noreferrer"; } // redes y proyectos: se abren aparte
    a.append(document.createElement("span"), document.createElement("span"));
    li.append(a); return li;
  }));
  fitBody();
  parts = [{ text, el: bodyEl }, ...items.map(([title], i) => ({ text: title, el: listEl.children[i].firstChild }))].map((q) => ({ ...q, k: -1 }));
  typeBody(0);
}
function typeBody(n) {
  for (const q of parts) {
    const k = Math.min(q.text.length, Math.max(0, n)); n -= q.text.length;
    if (k === q.k) continue;
    q.k = k; q.el.children[0].textContent = q.text.slice(0, k); q.el.children[1].textContent = q.text.slice(k);
    q.el.classList.toggle("listo", k === q.text.length); // un link se puede clickear cuando terminó de escribirse
  }
}
// ---------- artículo abierto: una columna a la derecha de la lista, a la altura de su título. t = segundos abierto (para escribir el título y soltar el texto)
let art = null;
const artEl = document.getElementById("articulo"), artTitle = artEl.querySelector("h1"), artText = artEl.querySelector(".texto"), artBack = artEl.querySelector(".volver");
let artLink = null, wanted = null;
// ---------- dirección de cada artículo: la de siempre (/<idioma>/articles/<slug>/). Abrirlo la pone en la barra, cerrarlo vuelve a la
// del inicio, atrás y adelante funcionan, y entrar directo a esa dirección abre la página con el artículo ya abierto
const flat = (path) => path.replace(/\/$/, "");
const route = () => flat(location.pathname);
const setRoute = (path) => { if (route() !== flat(path)) { history.pushState(null, "", path); track("pageview"); } };
const leaveRoute = () => { if (art) setRoute(HOME); document.title = HOME_TITLE; };
// artículos ya cargados, por dirección. El de la página llega en el HTML; los demás se piden a su propia página (estática) y se
// saca de ahí el artículo. loads guarda la petición para no repetirla (se adelanta al pasar el puntero por un título)
const pages = new Map(), loads = new Map();
if (artEl.dataset.ruta) pages.set(flat(artEl.dataset.ruta), { title: artTitle.textContent, html: artText.innerHTML, doc: document.title });
function load(href) {
  const k = flat(href);
  if (!loads.has(k)) loads.set(k, fetch(href).then((r) => { if (!r.ok) throw new Error(href + ": " + r.status); return r.text(); }).then((t) => {
    const d = new DOMParser().parseFromString(t, "text/html"), a = d.getElementById("articulo");
    const page = { title: a.querySelector("h1").textContent, html: a.querySelector(".texto").innerHTML, doc: d.title };
    pages.set(k, page); return page;
  }).catch((e) => { loads.delete(k); throw e; }));
  return loads.get(k);
}
function openArticle(link) {
  if (artLink === link) { closeArticle(); return; } // el mismo título otra vez: se cierra
  const href = link.getAttribute("href"), a = pages.get(flat(href));
  if (!a) {
    // todavía no está: se abre al llegar, si para entonces sigue siendo lo último que se pidió; si falla, se navega a su página
    wanted = link;
    load(href).then(() => { if (wanted === link && link.isConnected) openArticle(link); }, () => { if (wanted === link) location.href = href; });
    return;
  }
  wanted = null;
  art = { title: a.title, t: 0 }; readY = readTo = 0; rotulo.classList.remove("saliendo");
  artText.innerHTML = a.html; // HTML de los .md del propio repo, renderizado por Astro
  prepareTyping();
  artTitle.setAttribute("aria-label", a.title); artTitle.children[0].textContent = ""; artTitle.children[1].textContent = a.title;
  if (artLink) artLink.classList.remove("activo");
  artLink = link; link.classList.add("activo"); listEl.classList.add("abierta");
  rotulo.classList.add("leyendo");
  setRoute(href); document.title = a.doc;
  wake();
}
// cerrar: los títulos vuelven a encenderse, el artículo se desvanece y la vista se recentra; recién después se quita
function closeArticle() {
  wanted = null;
  if (!art || art.out) return;
  const leaving = art; art.out = true; leaveRoute();
  if (artLink) artLink.classList.remove("activo"); artLink = null; listEl.classList.remove("abierta"); rotulo.classList.add("saliendo");
  setTimeout(() => { if (art === leaving) dropArticle(); }, 240);
}
const dropArticle = () => { leaveRoute(); art = null; if (artLink) artLink.classList.remove("activo"); artLink = null; listEl.classList.remove("abierta"); rotulo.classList.remove("leyendo", "saliendo"); };
artBack.addEventListener("click", closeArticle);
// el "Volver" del artículo en pantalla angosta: placa invertida en 1 bit, del mismo tamaño que los nombres de las piezas en vertical
function drawBack() {
  const bm = textBitmap(artBack.getAttribute("aria-label"), 11, true), c = artBack.firstElementChild;
  c.width = bm.width + 6; c.height = bm.height + 2;
  const g = c.getContext("2d"); g.fillStyle = "rgb(200,255,232)"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bm, 3, 1);
  c.style.width = c.width * CELL + "px"; c.style.height = c.height * CELL + "px";
}
drawBack(); fontReady.then(drawBack);
// la copia de una pieza más cercana al centro; si ninguna está en pantalla (se alejó mucho), la cámara salta a la más cercana
function nearest(kind) {
  const near = () => shown.filter((q) => q.mesh === kind).sort((m, n) => Math.hypot(m.x - view.x, m.z - view.z) - Math.hypot(n.x - view.x, n.z - view.z))[0];
  if (!near()) {
    const [, px, pz] = SET.find((s) => s[0] === kind);
    cam.x = px + Math.round((view.x - px) / PERIOD) * PERIOD; cam.z = pz + Math.round((view.z - pz) / PERIOD) * PERIOD;
    frame(nowT);
  }
  return near();
}
// deja la escena como dice la dirección: en la de un artículo, su pieza ya tumbada con el texto escrito (quien llega por un link viene a leer)
// y el artículo abierto; en cualquier otra, sin artículo
function syncRoute() {
  if (dive) exitDive();
  const path = route(), kind = Object.keys(DEST).find((k) => DEST[k][2].some(([, href]) => flat(href) === path));
  if (!kind) { closeArticle(); return; }
  if (!sel || sel.p.mesh !== kind || sel.mode !== "down") {
    const p = sel && sel.p.mesh === kind ? sel.p : nearest(kind);
    take(p); Object.assign(sel, { side: roomSide(p), th: restOf(p, roomSide(p)).r, mode: "down", downT: 1e3, lit: 1 });
  }
  const link = Array.from(listEl.querySelectorAll("a")).find((a) => flat(a.getAttribute("href")) === path);
  if (link && artLink !== link) { openArticle(link); [cam.x, cam.z] = goalOf(sel); }
}
addEventListener("popstate", syncRoute);
// un título de la lista abre su artículo al lado, sin salir de la página (con Cmd/Ctrl/Shift sigue siendo un link normal).
// Los demás links se siguen normal (los de otros sitios llevan target y se abren en otra pestaña)
listEl.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a || !isArticle(a) || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
  e.preventDefault(); openArticle(a);
});
listEl.addEventListener("pointerover", (e) => { const a = e.target.closest("a"); if (a && isArticle(a)) load(a.getAttribute("href")).catch(() => {}); });
// el artículo se escribe letra por letra como los demás textos, solo que mucho más rápido. Cada trozo de texto se parte en
// lo escrito y lo que falta (invisible pero ocupando su lugar, así nada salta); imágenes y citas esperan a que les toque
let artParts = [], artWait = [], artAt = 0;
function prepareTyping() {
  artParts = []; artWait = []; artAt = 0;
  let n = 0;
  const walker = document.createTreeWalker(artText, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.nodeType === 1) { if (node.matches("img, blockquote, hr")) { node.classList.add("espera"); artWait.push({ el: node, at: n }); } continue; }
    if (!node.data.trim()) continue;
    const done = document.createElement("span"), rest = document.createElement("span");
    rest.className = "falta"; rest.textContent = node.data;
    artParts.push({ text: node.data, done, rest, from: n }); n += node.data.length;
    node.replaceWith(done, rest);
  }
}
function stepArticle(dt) {
  if (!art || art.out) return;
  art.t += RM ? 1e3 : dt;
  const nt = Math.min(art.title.length, Math.floor(art.t / .028));
  if (artTitle.children[0].textContent.length !== nt) { artTitle.children[0].textContent = art.title.slice(0, nt); artTitle.children[1].textContent = art.title.slice(nt); }
  const n = Math.floor(Math.max(0, art.t - art.title.length * .028 - .08) * 1400); // letras por segundo
  for (; artAt < artParts.length; artAt++) {
    const q = artParts[artAt], k = Math.min(q.text.length, n - q.from);
    if (k <= 0) break;
    q.done.textContent = q.text.slice(0, k); q.rest.textContent = q.text.slice(k);
    if (k < q.text.length) break;
  }
  while (artWait.length && artWait[0].at <= n) artWait.shift().el.classList.remove("espera");
}
function take(p) {
  sel = { p, side: 1, th: 0, w: 0, mode: "drag", downT: 0, lit: 0 }; readY = readTo = 0;
  const text = DEST[p.mesh][0];
  srLabel.textContent = text;
  drawLabel(text); fontReady.then(() => drawLabel(text));
  setBody(DEST[p.mesh][1], DEST[p.mesh][2]);
}
const dirOf = (s) => [ISO.r[0] * s.side, 0, ISO.r[2] * s.side];
const roomSide = (p) => ((p.x - view.x) * ISO.r[0] + (p.z - view.z) * ISO.r[2] < 0 ? 1 : -1); // el lado con más pantalla
// ángulo desde el que cae sola: cuando el peso queda por fuera del canto del pie
const tipOf = (p) => Math.atan(BASE[p.mesh] / (TALL[p.mesh] * .45));
// un empujón hacia el lado con más espacio: así cae con un click, o desde el teclado
const push = (p) => { take(p); Object.assign(sel, { side: roomSide(p), th: .05, w: 2.4, mode: "fall" }); };
// la pieza gira sobre el canto del pie del lado hacia el que se inclina
function fallen(s) {
  const p = s.p, d = dirOf(s), b = BASE[p.mesh];
  const Rf = rot([d[2], 0, -d[0]], s.th), v = [d[0] * b, 0, d[2] * b];
  const rs = restOf(p, s.side), yaw = p.yaw + (rs.yaw - p.yaw) * sstep(0, rs.r, s.th); // el caballo se va girando mientras cae
  return model(mul3(Rf, rot([0, 1, 0], yaw)), [p.x + v[0] - (Rf[0] * v[0] + Rf[6] * v[2]), -(Rf[1] * v[0] + Rf[7] * v[2]) + liftAt(rs.hull, s.th), p.z + v[2] - (Rf[2] * v[0] + Rf[8] * v[2])]);
}
// física de la pieza suelta. Devuelve false cuando ya volvió a quedar de pie
function stepPiece(s, dt) {
  if (s.mode === "fall") s.w += 24 * Math.sin(Math.max(s.th, .06)) * dt;  // la gravedad la acelera más mientras más inclinada va
  else if (s.mode === "rise") s.w += (-70 * s.th - 9 * s.w) * dt;         // resorte amortiguado hacia la vertical: se bambolea y se asienta
  if (s.mode === "fall" || s.mode === "rise") {
    s.th += s.w * dt;
    if (s.th < 0) { s.th = -s.th; s.w = -s.w; s.side = -s.side; }         // pasó por la vertical: se mece sobre el otro canto
    const rest = restOf(s.p, s.side).r; if (s.th >= rest) { s.th = rest; if (s.w > 1.5) s.w *= -.28; else { s.w = 0; s.mode = "down"; } } // rebota al tocar el suelo y se queda
    if (s.mode === "rise" && s.th < .01 && Math.abs(s.w) < .15) return false;
  }
  // downT es el reloj que escribe el texto: corre con la pieza en el suelo y, al levantarla, retrocede rápido (el texto se borra
  // hacia atrás en un cuarto de segundo en vez de cortarse). lit: la luz del piso mojado, que sube y baja igual de gradual
  const end = typeEnd();
  s.downT = s.mode === "down" ? (RM ? 1e3 : s.downT + dt) : Math.max(0, Math.min(s.downT, end) - dt * end / .25);
  s.lit = clamp01(s.lit + dt / (s.mode === "down" ? .9 : -.25));
  return true;
}
// qué pieza iluminada hay bajo el puntero. ponytail: prueba contra una cápsula en pantalla, no contra la malla; buffer de ids si falla en los bordes
function pick(cx, cy) {
  const rc = cv.getBoundingClientRect(), ppu = rc.height / viewH(), sinP = Math.sin(ISO.pitch), cosP = Math.cos(ISO.pitch);
  const px = cx - rc.left - rc.width / 2, py = -(cy - rc.top - rc.height / 2);
  let best = null, low = Infinity;
  for (const p of shown) {
    const dx = p.x - view.x, dz = p.z - view.z;
    if (fromLight(p) > view.R * .9) continue;
    const sx = (dx * ISO.r[0] + dz * ISO.r[2]) * ppu, sy = (dx * ISO.f[0] + dz * ISO.f[2]) * sinP * ppu, rad = BASE[p.mesh] * ppu;
    if (Math.abs(px - sx) < rad && py > sy - rad * sinP && py < sy + TALL[p.mesh] * cosP * ppu && sy < low) { low = sy; best = p; }
  }
  return best;
}
// ¿el puntero está sobre la pieza caída? (rectángulo en pantalla: del pie a la punta, del suelo a su grosor)
function overFallen(cx, cy) {
  if (!sel || sel.mode !== "down") return false;
  const rc = cv.getBoundingClientRect(), ppu = rc.height / viewH(), sinP = Math.sin(ISO.pitch), cosP = Math.cos(ISO.pitch);
  const p = sel.p, b = BASE[p.mesh], dx = p.x - view.x, dz = p.z - view.z;
  const along = ((cx - rc.left - rc.width / 2) / ppu - (dx * ISO.r[0] + dz * ISO.r[2])) * sel.side;
  const up = -(cy - rc.top - rc.height / 2) / ppu - (dx * ISO.f[0] + dz * ISO.f[2]) * sinP;
  return along > b - .15 && along < b + TALL[p.mesh] + .15 && up > -b * .6 && up < 2 * b * cosP + b * sinP;
}
// el grupo: tipo, posición (en casillas desde su centro), si es blanca y hacia dónde mira. Puestas sueltas, sin orden de partida,
// y separadas para que en pantalla ninguna tape el nombre de otra
const SET = [["king", .68, .68, 1, .4], ["queen", .9, -2.04, 0, 2.1], ["bishop", -2.38, .34, 1, 4], ["rook", -1.02, 3.06, 0, 1], ["knight", 2.54, 1.07, 1, 5.2], ["pawn", 3.34, -1.07, 0, 0]].map(([k, x, z, w, y]) => [k, Math.floor(x) + .5, Math.floor(z) + .5, w, y]); // cada pieza al centro de su casilla (los bordes caen en los enteros)
// cada cuánto se repite el grupo, en casillas: más que el ancho de la luz, así nunca se ven dos copias de una pieza a la vez
const PERIOD = 12;
const cache = new Map();
// la compuerta: una casilla clara y libre a la izquierda del rey, que se repite con el grupo. a = ángulo de la tapa (0 cerrada,
// OPEN apoyada en su tope, algo pasada la vertical), w = su velocidad, hold = el puntero que la lleva
const TRAP = [-.5, 1.5], OPEN = 1.85, TRAP_G = 30;
const trap = { a: Q.has("trap") ? OPEN : 0, w: 0, hold: null }; // &trap=1 (solo en dev): cuadro fijo con la compuerta abierta
const LID = { uKind: 6, uAlb: .93, uGround: 0, uSel: 0, uHot: 0 }, PIT = { uMode: 0, uProj: 0, uKind: 7, uAlb: .93, uGround: 1, uSel: 0, uHot: 0 };
gl.uniform3f(U.uTrap, TRAP[0], TRAP[1], PERIOD);
const trapMoving = () => !!trap.hold || trap.w !== 0 || (trap.a !== 0 && trap.a !== OPEN);
// suelta, la tapa es un tablón con bisagra: su peso la cierra antes de la vertical y la echa hacia atrás pasada ella;
// contra el marco o contra el tope rebota una vez y se queda
function stepTrap(dt) {
  if (trap.hold) return;
  if (RM) { trap.a = trap.a > Math.PI / 2 ? OPEN : 0; trap.w = 0; return; }
  trap.w += (-TRAP_G * Math.cos(trap.a) - .6 * trap.w) * dt; trap.a += trap.w * dt;
  if (trap.a <= 0) { trap.a = 0; if (trap.w < -1.5) sfx("cierra", Math.min(1, -trap.w / 9)); trap.w = trap.w < -1.5 ? -trap.w * .35 : 0; }
  if (trap.a >= OPEN) { trap.a = OPEN; trap.w = trap.w > 1.5 ? -trap.w * .35 : 0; }
}
// un toque sin arrastre: el envión justo para que pase la vertical y caiga al otro lado
// ---------- el conejo: al cargar y cada tanto llega a saltos a la compuerta más cercana, la abre con el hocico (si está cerrada),
// se tira de cabeza al hueco y la tapa se cierra tras él. No sale con movimiento reducido ni en los cuadros fijos
// D: de dónde viene, visto desde el hueco: desde el fondo, saliendo de lo oscuro por detrás de la reina y pasando tras el rey, con la luz de frente
const BUN = { SCALE: .9, HOP: .3, H: .16, PAUSE: .7, STOP: 4, N: 10, FROM: 5.4, EDGE: .56, D: [0, 0, -1], EVERY: [40, 70] };
const BUNNY = { uKind: 8, uAlb: .93, uGround: 0, uSel: 0, uHot: 0 };
let bun = null, bunNext = INTRO ? 1.6 : Infinity;
const hopStart = (i) => i * BUN.HOP + (i >= BUN.STOP ? BUN.PAUSE : 0); // salta unas veces, se queda mirando y sigue
function stepBun(T, dt, busy) {
  if (!bun) {
    if (T < bunNext || busy) return;
    const hx = TRAP[0] + Math.round((view.x - TRAP[0]) / PERIOD) * PERIOD, hz = TRAP[1] + Math.round((view.z - TRAP[1]) / PERIOD) * PERIOD;
    bun = { t: 0, h: [hx, hz], kicked: false, opened: false, pose: null };
  }
  const { D, HOP, N, EDGE } = BUN, at = (k) => [bun.h[0] + D[0] * k, bun.h[1] + D[2] * k], tE = hopStart(N - 1) + HOP, L = (BUN.FROM - EDGE) / N;
  const gate = bun.t >= tE + .6 && !bun.jumped; // no se tira hasta que la tapa esté abierta; si se la cierran, la vuelve a abrir
  if (gate && trap.a < 1.5) { if (!trap.hold && !trapMoving()) { trap.w = 1.25 * Math.sqrt(2 * TRAP_G); bun.opened = true; } }
  else { bun.jumped ||= gate; bun.t += dt; }
  const t = bun.t;
  let k, y = 0, tilt = 0;
  if (t < tE) {
    let i = N - 1; while (hopStart(i) > t) i--;
    const u = Math.min(1, (t - hopStart(i)) / HOP);
    k = BUN.FROM - L * (i + u); y = 4 * BUN.H * u * (1 - u); tilt = .35 * Math.sin(2 * Math.PI * u);
  } else if (t < tE + .6) {
    k = EDGE; tilt = .04 * Math.sin(t * 40) * (t < tE + .3); // olfatea
    if (t >= tE + .1 && !bun.kicked) { bun.kicked = true; if (trap.a < 1 && !trap.hold) { trap.w = 1.25 * Math.sqrt(2 * TRAP_G); bun.opened = true; } }
  } else {
    const j = t - tE - .6;
    k = EDGE * (1 - Math.min(1, j / .47)); y = 2.12 * j - 4.5 * j * j; tilt = j < .2 ? .3 : Math.max(-1.4, -.3 - (j - .2) * 3);
    if (j > 1.2) { if (bun.opened && !trap.hold && trap.a > 1) trap.w = -4; bun = null; bunNext = T + mix(...BUN.EVERY, Math.random()); return; }
  }
  const [x, z] = at(k);
  bun.pose = y < -.85 ? null : { x, y, z, tilt };
}
const kickTrap = () => { if (RM) trap.a = trap.a > 1 ? 0 : OPEN; else trap.w = trap.a > 1 ? -4 : 1.25 * Math.sqrt(2 * TRAP_G); };
const wrap = (v) => v - Math.round(v / PERIOD) * PERIOD; // a la copia más cercana
// el hueco que hay en un punto de la pantalla (px desde el centro, y hacia arriba): su centro, o null
function holeAt(sx, sy) {
  const u = cv.clientHeight / viewH(), a = sx / u, b = sy / (u * Math.sin(ISO.pitch));
  const gx = view.x + ISO.r[0] * a + ISO.f[0] * b, gz = view.z + ISO.r[2] * a + ISO.f[2] * b, x = wrap(gx - TRAP[0]), z = wrap(gz - TRAP[1]);
  return Math.max(Math.abs(x), Math.abs(z)) < .36 ? [gx - x, gz - z] : null;
}
// ---------- entrar al hueco: un toque sobre él y la cámara se pone encima (deja la isométrica y mira derecho hacia abajo), baja
// hasta que el negro del pozo llena la pantalla, y ahí sigue el túnel hasta el negro, del que sale el coloso que fuma. Ahí se puede caminar (stepDive); se sale con un toque corto o Escape;
// Escape sale en cualquier momento. t = segundos desde el toque; cam0 y zoom0 = cómo estaba la cámara, para volver
const PITCH = Math.PI / 6, DIVE = 1.5; // DIVE: segundos que tarda en ponerse encima y entrar
let dive = null, lightT0 = 0; // lightT0: desde cuándo se abre el foco (al cargar y al volver del vacío)
// las teclas apretadas: mueven la cámara del tablero y, en el vacío, a quien camina. Cada una, [de lado, hacia adelante]
const keys = new Set(), KEY = { ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, 1], w: [0, 1], ArrowDown: [0, -1], s: [0, -1] };
// ---------- sonido del vacío: cuando aparece el coloso entra un tramo de la canción del video (una vez, con fundidos), y mientras
// se va entra otra canción, bajito y en bucle. Al salir se apaga todo. El navegador solo deja sonar audio después de un gesto: el
// contexto se crea (o se despierta) en el toque sobre la compuerta, y los dos archivos se piden ahí, para que lleguen durante el túnel
const SONG = "/tablero/coloso.m4a", DRIFT = "/tablero/fondo.m4a", FADE = 2.5, VOL = .7, LOW = .2; // VOL, LOW: volumen del tramo y del fondo (los dos vienen fuertes)
let actx = null, bufs = null, voices = [], lapTimer = 0, songT0 = null; // songT0: cuándo empezó el tramo (reloj del audio), para los subtítulos // bufs: los dos decodificados (promesa); voices: lo que suena ahora [{ src, gain }]
// ---------- efectos de sonido, en 8 bits (generados por Damián con ElevenLabs, en public/tablero/sfx). Cada uno con su volumen, para
// que suenen parejos entre sí (vienen grabados a niveles muy distintos). Se piden la primera vez que se toca la compuerta: con ese
// gesto el navegador ya deja sonar audio
const SFX = { abre: ["trampilla-abre", .6], cierra: ["trampilla-cierra", .7], aire: ["hueco-aire", .5], bajada: ["bajada", .3], tunel: ["tunel", 2], llegada: ["llegada", .85], temblor: ["temblor", .75], cae1: ["pieza-cae-1", .6], cae2: ["pieza-cae-2", 1.6], cae3: ["pieza-cae-3", .75], rebota: ["pieza-rebota", .5], cabezazo: ["cabezazo", .9], luz: ["trampilla-luz", .9], salida: ["salida", .9], teclado: ["teclado", 1.1] };
const SFX_VOL = .55, sfxBuf = {};
let sfxAsked = false, sfxLate = null, airVoice = null; // airVoice: el viento del hueco, que suena mientras la cámara se acerca a él
function wakeAudio(load = true) {
  // iOS: el audio de la página respeta el modo silencio del teléfono (suena solo con él apagado). Al tocar la compuerta o entrar al
  // hueco se pide sonar como un video, aunque esté en silencio; con un toque cualquiera no, para no cortarle la música a nadie de entrada
  if (load) try { if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback"; } catch {}
  try { actx ??= new (window.AudioContext || window.webkitAudioContext)(); } catch { return false; } // sin Web Audio: sin sonido
  if (actx.state !== "running") {
    // lo que se pidió mientras estaba trabado (la tapa abierta arrastrándola, antes de soltar el dedo) suena apenas se destraba
    actx.resume().then(() => { const q = sfxLate; sfxLate = null; if (q && performance.now() - q.t < 1500) sfx(...q.args); }).catch(() => {});
    // iOS: el contexto recién se destraba si dentro del mismo gesto suena algo; un cuadro de silencio alcanza
    const src = actx.createBufferSource(); src.buffer = actx.createBuffer(1, 1, 22050); src.connect(actx.destination); src.start(0);
  }
  if (load && !sfxAsked) { sfxAsked = true; for (const [k, [f]] of Object.entries(SFX)) fetch(`/tablero/sfx/${f}.mp3`).then((r) => r.arrayBuffer()).then((b) => actx.decodeAudioData(b)).then((b) => { sfxBuf[k] = b; }).catch(() => {}); }
  return true;
}
// iOS no cuenta el pointerdown del dedo como gesto que deje sonar audio (sí el touchend y el click): si se espera a tocar la
// compuerta, la tapa ya se abrió en silencio cuando el contexto se destraba. Se destraba con el primer toque en cualquier parte
// (sin bajar los efectos todavía), y cada toque lo vuelve a despertar si iOS lo interrumpió (una llamada, la app en segundo plano)
for (const type of ["touchend", "click", "keydown"]) addEventListener(type, () => { if (!actx || actx.state !== "running") wakeAudio(false); }, { capture: true, passive: true });
// un efecto, una vez. vol: 0 a 1 sobre su volumen; rate: velocidad (y tono); from: desde qué segundo del archivo; pan: -1 izquierda a
// 1 derecha. Si todavía no llega o no hay audio, no suena
function sfx(k, vol = 1, rate = 1, loop = false, from = 0, pan = 0) {
  if (actx && actx.state !== "running" && !loop) sfxLate = { args: [k, vol, rate, loop, from, pan], t: performance.now() };
  if (!actx || actx.state !== "running" || !sfxBuf[k]) return null;
  const src = actx.createBufferSource(), gain = actx.createGain(), panner = actx.createStereoPanner ? actx.createStereoPanner() : null;
  src.buffer = sfxBuf[k]; src.playbackRate.value = rate; src.loop = loop;
  gain.gain.value = SFX[k][1] * SFX_VOL * vol;
  if (panner) { panner.pan.value = pan; src.connect(gain).connect(panner).connect(actx.destination); } else src.connect(gain).connect(actx.destination);
  src.start(0, from);
  return { src, gain, panner };
}
function wakeSound() {
  if (!wakeAudio()) return;
  const get = (url) => fetch(url).then((r) => r.arrayBuffer()).then((b) => actx.decodeAudioData(b));
  bufs ??= Promise.all([get(SONG), get(DRIFT)]).catch((e) => { bufs = null; console.error(e); });
}
// una voz: buf desde t0 hasta el volumen vol con un fundido de fadeIn segundos; con out, se va en un fundido que termina ahí
function voice(buf, t0, vol, fadeIn, out) {
  const src = actx.createBufferSource(), gain = actx.createGain(), v = { src, gain };
  src.buffer = buf; src.connect(gain).connect(actx.destination);
  gain.gain.setValueAtTime(0, t0); gain.gain.linearRampToValueAtTime(vol, t0 + fadeIn);
  if (out) { gain.gain.setValueAtTime(vol, out - FADE); gain.gain.linearRampToValueAtTime(0, out); }
  src.onended = () => { voices = voices.filter((x) => x !== v); };
  src.start(t0); voices.push(v);
}
function playSound() {
  const d = dive;
  bufs?.then((b) => {
    if (!b || dive !== d || voices.length) return; // salió (o volvió a entrar) mientras llegaba
    const [song, drift] = b, t0 = actx.currentTime + .05, end = t0 + song.duration;
    voice(song, t0, VOL, FADE, end); songT0 = t0;
    // el fondo: cada vuelta empieza 4 s antes de que termine la anterior (su final ya baja solo) y entra con un fundido, así no se
    // nota el corte. La vuelta siguiente se agenda cuando empieza esta
    const lap = (t) => { if (dive !== d) return; voice(drift, t, LOW, 3); lapTimer = setTimeout(() => lap(t + drift.duration - 4), Math.max(0, t - actx.currentTime) * 1000); };
    lap(end - FADE);
  });
}
function stopSound() {
  clearTimeout(lapTimer); songT0 = null;
  if (!actx) return;
  const t = actx.currentTime;
  for (const { src, gain } of voices) { gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0, t + .8); src.stop(t + .85); }
  voices = [];
}
// ---------- subtítulos de lo que dice el coloso en el tramo: [desde, hasta (s, sobre el tramo), texto]. En la página en español van
// traducidos. Se dibujan como los nombres de las piezas: letras en 1 bit sobre la rejilla de celdas, en una placa oscura; cada línea
// se escribe letra por letra y al terminar se borra hacia atrás. Siguen al reloj del audio (o, sin sonido, al de la llegada)
const SUBS = {
  en: [[0, 5.2, "We can do great things together, you and I."], [8.6, 10.9, "I like you."], [11.3, 14.9, "Unfortunately, I'm a little chained up at the moment."], [15, 19.2, "And I can't help you realize your true potential."], [21.5, 23.8, "But you can change."]],
  es: [[0, 5.2, "Podemos hacer grandes cosas juntos, tú y yo."], [8.6, 10.9, "Me caes bien."], [11.3, 14.9, "Por desgracia, ahora mismo estoy algo encadenado."], [15, 19.2, "Y no puedo ayudarte a alcanzar tu verdadero potencial."], [21.5, 23.8, "Pero tú puedes cambiar."]],
}[document.documentElement.lang === "es" ? "es" : "en"];
// después, Damián, desde su escritorio. Cada línea dura lo que se tarda en leerla, con una pausa entre una y otra; van en su cuadro
// (ver damianBox). OUCH: lo que dice cuando le cae una pieza encima
const OUCH = document.documentElement.lang === "es" ? ["¡Auch!", "¡Oye! Cuidado.", "Siempre me cae algo encima.", "Ya, ya… entendí."] : ["Ouch!", "Hey! Watch it.", "Something always lands on me.", "Okay, okay… I get it."];
{
  const lines = document.documentElement.lang === "es"
    ? ["¿Cómo llegaste acá?", "Supongo que igual que yo: estabas sobrepensando.", "Acá vengo a veces cuando necesito relajarme.", "Yo sé, es un poco caótico; te encierras en tu mente.", "Esta es mi mente.", "Puedes estar el tiempo que quieras, solo ten cuidado de mentirte a ti mismo.", "Si quieres salir, puedes mirar arriba."]
    : ["How did you get here?", "Same as me, I guess: you were overthinking.", "I come here sometimes when I need to unwind.", "I know, it's a bit chaotic; you lock yourself inside your mind.", "This is my mind.", "You can stay as long as you like, just be careful about lying to yourself.", "If you want to leave, you can look up."];
  let a = 26;
  for (const l of lines) { const d = 1.4 + l.length * .055; SUBS.push([a, a + d, l, true]); a += d + .9; }
}
// el reloj de los diálogos: el del tramo de audio (así calzan con la voz); sin sonido, el de la llegada al vacío
const talkClock = () => (songT0 != null && actx ? actx.currentTime - songT0 : dive?.room0 != null ? dive.t - dive.room0 : -1);
// una línea partida en renglones que quepan en maxW celdas
function wrapRows(text, size, maxW) {
  const rows = [];
  for (const w of text.split(" ")) { const tryRow = rows.length ? rows[rows.length - 1] + " " + w : w; if (rows.length && textBitmap(tryRow, size).width > maxW) rows.push(w); else if (rows.length) rows[rows.length - 1] = tryRow; else rows.push(w); }
  return rows;
}
// un punto del vacío en la HUD (en celdas), con la misma cámara del shader (RFS); null si queda detrás
function voidToHud([X, Y, Z]) {
  if (!dive?.lastCam) return null;
  const w = hudCv.width, h = hudCv.height, foc = mix(.55, .8, sstep(.5, 1.4, w / h)), [c0, c1] = dive.lastCam, oa = c0 * .5, yw = c0 * 1.1, p = .3 + c1;
  const x0 = X + VOID.CZ * Math.sin(oa), z0 = Z - (VOID.CZ - VOID.CZ * Math.cos(oa));
  const x1 = x0 * Math.cos(yw) - z0 * Math.sin(yw), z1 = x0 * Math.sin(yw) + z0 * Math.cos(yw), y2 = Y * Math.cos(p) - z1 * Math.sin(p), z2 = Y * Math.sin(p) + z1 * Math.cos(p);
  return z2 < .1 ? null : [w / 2 + x1 / z2 * foc * h, h / 2 - y2 / z2 * foc * h];
}
// pitido de cada letra, como en los juegos de antes: una onda cuadrada cortísima, bajita. Solo si el audio ya anda
function blip() {
  if (!actx || actx.state !== "running") return;
  const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
  o.type = "square"; o.frequency.value = 520 + Math.random() * 160;
  g.gain.setValueAtTime(.022, t); g.gain.exponentialRampToValueAtTime(.0005, t + .05);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + .06);
}
// ---------- el cuadro de Damián, como de juego arcade, sobre su cabeza (sin salirse de la pantalla): se abre de golpe desde el centro,
// con doble borde y su nombre en una placa; cada letra aparece con un pitido y salta una celda; mientras escribe va un bloque al final,
// y cuando termina parpadea un triangulito. Al acabar la línea el cuadro se cierra. el = segundos desde que empezó; dur = cuánto dura
const TOUCH = matchMedia("(pointer: coarse)").matches, LOOK = document.documentElement.lang === "es" ? "Arrastra para mirar" : "Drag to look around";
const NAME = "DAMIÁN", INK = "rgb(12,12,14)", MINTC = "rgb(200,255,232)";
let blipKey = null, blipN = 0; // la línea que suena y cuántas letras ya pitaron
function damianBox(text, el, dur, rate = .04) {
  const size = cv.width < cv.height ? 11 : 13, PAD = 6, lh = Math.round(size * 1.45), rows = wrapRows(text, size, Math.min(hudCv.width - 24, Math.max(150, hudCv.width * .4)) - 2 * PAD);
  const bms = rows.map((r) => textBitmap(r, size)), W = Math.max(...bms.map((b) => b.width)) + 2 * PAD, H = rows.length * lh + 2 * PAD;
  const open = sstep(0, .12, el) * (1 - sstep(dur, dur + .14, el));
  if (open <= 0) return;
  const at = voidToHud(damianAt(0, 1.75, .1)), x = Math.round(Math.min(hudCv.width - W - 4, Math.max(4, at ? at[0] - W / 2 : 4))), y = Math.round(Math.min(hudCv.height - H - 4, Math.max(16, at ? at[1] - H - 8 : 16)));
  const w = Math.max(4, Math.round(W * open)), bx = x + Math.round((W - w) / 2);
  hudG.fillStyle = INK; hudG.fillRect(bx - 3, y - 3, w + 6, H + 6);
  hudG.fillStyle = MINTC; hudG.fillRect(bx - 3, y - 3, w + 6, 1); hudG.fillRect(bx - 3, y + H + 2, w + 6, 1); hudG.fillRect(bx - 3, y - 3, 1, H + 6); hudG.fillRect(bx + w + 2, y - 3, 1, H + 6);
  hudG.fillRect(bx - 1, y - 1, w + 2, 1); hudG.fillRect(bx - 1, y + H, w + 2, 1); hudG.fillRect(bx - 1, y - 1, 1, H + 2); hudG.fillRect(bx + w, y - 1, 1, H + 2);
  if (open < 1) return;
  const nb = textBitmap(NAME, 9, true); hudG.fillRect(x + 4, y - 3 - nb.height + 2, nb.width + 4, nb.height); hudG.drawImage(nb, x + 6, y - 3 - nb.height + 2);
  // las letras: rate segundos cada una; la recién aparecida va una celda más arriba
  const key = text + dur, n = Math.max(0, Math.floor((el - .14) / rate)), total = rows.reduce((k, r) => k + r.length, 0);
  if (key !== blipKey) { blipKey = key; blipN = 0; }
  if (n > blipN && n <= total) { blipN = n; if (text[Math.min(text.length - 1, n - 1)] !== " ") blip(); }
  let left = n, cx = x + PAD, cy = y + PAD;
  rows.forEach((row, r) => {
    const bm = bms[r], k = Math.min(row.length, left), ry = y + PAD + r * lh;
    left -= row.length + 1;
    if (k <= 0) return;
    const fresh = k < row.length || left === -1 ? (el - .14) / rate - (n - 1) < 1.5 : false;
    hudG.drawImage(bm, 0, 0, bm.stops[k - (fresh ? 1 : 0)], bm.height, x + PAD, ry, bm.stops[k - (fresh ? 1 : 0)], bm.height);
    if (fresh) { const s0 = bm.stops[k - 1], s1 = bm.stops[k]; hudG.drawImage(bm, s0, 0, s1 - s0, bm.height, x + PAD + s0, ry - 1, s1 - s0, bm.height); }
    cx = x + PAD + bm.stops[k]; cy = ry;
  });
  if (n < total) { hudG.fillStyle = MINTC; hudG.fillRect(cx + 1, cy + 3, Math.round(size * .45), size); }
  else if (Math.floor(el * 2.5) % 2) { hudG.fillStyle = MINTC; const tx = x + W - PAD - 4, ty = y + H - PAD - 1; for (let i = 0; i < 3; i++) hudG.fillRect(tx - 2 + i, ty - 3 + i, 5 - 2 * i, 1); }
}
function drawSubs() {
  if (hudCv.width !== cv.width || hudCv.height !== cv.height) { hudCv.width = cv.width; hudCv.height = cv.height; }
  hudCv.style.width = cv.width * CELL + "px"; hudCv.style.height = cv.height * CELL + "px";
  hudG.clearRect(0, 0, hudCv.width, hudCv.height);
  const rt = dive.t - dive.room0;
  // en pantallas táctiles: cómo se mira, arriba, hasta el primer arrastre
  if (TOUCH && !dive.looked && rt > 3) { const bm = textBitmap(LOOK, 11); hudG.fillStyle = INK; hudG.fillRect(Math.round((hudCv.width - bm.width) / 2) - 3, 7, bm.width + 6, bm.height + 2); hudG.drawImage(bm, Math.round((hudCv.width - bm.width) / 2), 8); }
  // si le acaba de caer una pieza, su queja tapa lo que estuviera diciendo
  if (ouch && rt - ouch.at < 1.9) { damianBox(ouch.text, rt - ouch.at, 1.75, .03); return; }
  const c = talkClock(), line = c < 0 ? null : SUBS.find(([a, b]) => c >= a && c < b + .6);
  if (!line) return;
  const [a, b, text, mine] = line;
  if (mine) { damianBox(text, c - a, b - a + .45); return; }
  // lo del coloso, abajo al centro: cada letra a 30 ms y, pasado el final, se borra hacia atrás en 0,6 s
  const size = cv.width < cv.height ? 11 : 13;
  let n = Math.floor((c - a) / .03);
  if (c > b) n = Math.min(n, Math.floor(text.length * (1 - (c - b) / .6)));
  if (n <= 0) return;
  const rows = wrapRows(text, size, hudCv.width - 16);
  let left = n, y = hudCv.height - size * 2.2 - (rows.length - 1) * size * 1.5;
  for (const row of rows) {
    const k = Math.min(row.length, left); left -= row.length + 1;
    if (k > 0) {
      const bm = textBitmap(row, size), x = Math.round((hudCv.width - bm.width) / 2), cw = bm.stops[k], py = Math.round(y - bm.height);
      hudG.fillStyle = INK; hudG.fillRect(x - 3, py - 1, cw + 6, bm.height + 2);
      hudG.drawImage(bm, 0, 0, cw, bm.height, x, py, cw, bm.height);
    }
    y += size * 1.5;
  }
}
// con la pestaña oculta no suena
document.addEventListener("visibilitychange", () => { if (actx && voices.length) document.hidden ? actx.suspend() : actx.resume(); });
function startDive(hole) {
  dive = { t: RM ? 1e3 : 0, hole, cam0: [cam.x, cam.z], zoom0: zoom, there: false, px: 0, py: 0, sx: 0, sy: 0, vx: 0, vy: 0 }; // px, py = hacia dónde se mira (-1 a 1); sx, sy = lo mismo, suavizado; vx, vy = impulso del dedo. Sin animaciones: directo al vacío
  hover.p = null; cam.vx = cam.vz = 0; cv.style.cursor = "default";
  if (!coloso) loadColoso().catch(console.error); // el coloso (módulo y video) se pide ahora: hay todo el túnel para que llegue
  wakeSound(); sfx("bajada");
  if (airVoice) { airVoice.src.stop(); airVoice = null; }
}
function exitDive() {
  const { hole, cam0, zoom0 } = dive;
  coloso?.stop(); stopSound(); stopTyping(); typing = { next: 4, until: 0, voice: null }; sfx("salida"); fallers = []; quake = { next: 7, t: -99, hit: -99 }; ouch = null;
  dive.tunnel?.src.stop();
  dive = null; ISO.pitch = PITCH; zoom = 1; lightT0 = (performance.now() - t0) / 1000;
  hover.on = false; // el puntero no se siguió durante el viaje: hasta que se mueva no se sabe dónde está
  cam.x = hole[0] - (hole[0] - cam0[0]) * zoom0; cam.z = hole[1] - (hole[1] - cam0[1]) * zoom0; // donde estaba antes de acercarse al hueco
  cv.style.cursor = "grab"; wake();
}
function stepDive(dt, T) {
  dive.t += dt;
  if (dive.t < DIVE) {
    // primero se centra y se pone encima; el descenso parte lento y se dispara al final (el zoom crece de forma exponencial)
    const k = dive.t / DIVE, c = outCubic(k);
    cam.x = mix(dive.cam0[0], dive.hole[0], c); cam.z = mix(dive.cam0[1], dive.hole[1], c);
    ISO.pitch = mix(PITCH, 1.553, sstep(0, .7, k)); // 89°: a 90° justos la cámara no tiene "arriba"
    zoom = dive.zoom0 * Math.pow(24 / dive.zoom0, Math.pow(k, 2.4));
    frame(T);
  } else if (dive.t < DIVE + TUNNEL) {
    // el sonido del túnel dura 7 s y se corta seco: un poco más lento (y más grave) dura los 9 s del túnel y se corta con él
    dive.tunnel ??= sfx("tunel", 1, 7.05 / TUNNEL) || 0;
    drawScreen(TUN, dive.t - DIVE);
  }
  else {
    // el vacío: el video parte cuando ya hay un cuadro que mostrar (room0 = ese momento). La cámara sigue al puntero con retardo:
    // hacia los lados gira hasta unos 30°, hacia abajo unos 12° y hacia arriba unos 45° (hasta ver la trampilla). Sin animaciones, todo quieto
    dive.there = true;
    if (dive.room0 == null) { if (!drawRoom(0, 0)) return; dive.room0 = dive.t; if (!RM) coloso.start(); playSound(); sfx("llegada"); return; }
    if (!dive.drag && (dive.vx || dive.vy)) {
      dive.px = Math.max(-1, Math.min(1, dive.px + dive.vx * dt)); dive.py = Math.max(-1, Math.min(1, dive.py + dive.vy * dt));
      const f = Math.exp(-dt * 4); dive.vx *= f; dive.vy *= f; if (Math.hypot(dive.vx, dive.vy) < .01) dive.vx = dive.vy = 0;
    }
    const k = 1 - Math.exp(-dt * (dive.touch ? 10 : 3.5)); dive.sx += (dive.px - dive.sx) * k; dive.sy += (dive.py - dive.sy) * k;
    drawRoom(dive.t - dive.room0, RM ? 0 : dt, RM ? [0, 0] : [dive.sx * .52, dive.sy * (dive.sy > 0 ? .8 : .21)]); // hacia arriba se mira mucho más: allá está la salida
    drawSubs();
  }
}
// ¿el mouse está sobre el hueco abierto? Devuelve el centro de ese hueco. Se mira el último lugar conocido del puntero y no un evento:
// la tapa puede abrirse bajo un puntero quieto. ponytail: solo con mouse; con el dedo no hay hover, falta decidir el gesto
const ZOOM = 2;
function overHole() {
  return !hover.on || sel || trap.hold || trap.a < 1 ? null : holeAt(hover.sx, hover.sy);
}
// ¿el puntero está sobre la compuerta (y dentro de la luz)? Devuelve dónde la toma: el puntero visto desde la bisagra, en ejes de
// pantalla y en casillas (null si no la toca). Se sigue el rayo desde el suelo hacia la cámara, (.612, .5, .612) por unidad, hasta
// el plano de la tapa en su ángulo de ahora (l = a qué distancia de la bisagra lo corta). El hueco a la vista no la toma: ahí se arrastra el tablero
function trapAt(cx, cy) {
  const rc = cv.getBoundingClientRect(), u = rc.height / viewH(), sinP = Math.sin(ISO.pitch), a = (cx - rc.left - rc.width / 2) / u, b = -(cy - rc.top - rc.height / 2) / (u * sinP);
  const gx = view.x + ISO.r[0] * a + ISO.f[0] * b, gz = view.z + ISO.r[2] * a + ISO.f[2] * b;
  if (fromLight({ x: gx, z: gz }) > view.R * .9) return null;
  const x = wrap(gx - TRAP[0]), z = wrap(gz - TRAP[1]), c = Math.cos(trap.a), sn = Math.sin(trap.a);
  const l = (x + .38) / (c - 1.224 * sn);
  return l > 0 && l < .76 && Math.abs(z + 1.224 * l * sn) < .38 ? [l * c * ISO.r[0], l * (c * ISO.f[0] * sinP + sn * Math.cos(ISO.pitch))] : null;
}
// el ángulo de tapa que deja un punto suyo justo bajo el puntero: q se descompone en lo que avanza por el suelo (eje X del mundo)
// y lo que sube. Va de -90° a 270° para que no salte al pasar por detrás de la bisagra
const trapAngle = (qx, qy) => { const c = qx / ISO.r[0], a = Math.atan2((qy - c * ISO.f[0] * Math.sin(ISO.pitch)) / Math.cos(ISO.pitch), c); return a < -Math.PI / 2 ? a + 2 * Math.PI : a; };
// piezas dentro del rectángulo de pantalla (semiejes a y b sobre los ejes de pantalla r y f, en casillas)
function visible(t, a, b, r, f) {
  const out = [], ext = .7072 * (a + b) + 6;
  for (let m = Math.floor((t[0] - ext) / PERIOD); m <= Math.ceil((t[0] + ext) / PERIOD); m++) for (let n = Math.floor((t[2] - ext) / PERIOD); n <= Math.ceil((t[2] + ext) / PERIOD); n++) {
    SET.forEach(([kind, px, pz, white, yaw], k) => {
      const x = px + m * PERIOD, z = pz + n * PERIOD, dx = x - t[0], dz = z - t[2];
      if (Math.abs(dx * r[0] + dz * r[2]) > a || Math.abs(dx * f[0] + dz * f[2]) > b) return;
      const key = m + "," + n + "," + k;
      if (!cache.has(key)) {
        if (cache.size > 5000) cache.clear(); // ponytail: se vacía entera al llenarse
        cache.set(key, { mesh: kind, x, z, yaw, M: model(rot([0, 1, 0], yaw), [x, 0, z]), set: { uKind: KIND[kind], uAlb: white ? .93 : .24, uGround: 1, uSel: 0, uHot: 0 } });
      }
      out.push(cache.get(key));
    });
  }
  return out;
}
const ISO = { yaw: Math.PI / 4, pitch: PITCH, r: [Math.SQRT1_2, 0, -Math.SQRT1_2], f: [-Math.SQRT1_2, 0, -Math.SQRT1_2] };
const cam = { x: 0, z: 0, vx: 0, vz: 0 };
let zoom = 1; // cuánto se ha acercado la cámara (sube con el mouse sobre el hueco de la compuerta)
const viewH = () => (cv.clientWidth < cv.clientHeight ? 7.5 : 5.6) / zoom; // casillas de alto que entran en pantalla
const ortho = (hw, hh, n, f) => new Float32Array([1 / hw, 0, 0, 0, 0, 1 / hh, 0, 0, 0, 0, -2 / (f - n), 0, 0, 0, -(f + n) / (f - n), 1]);
// matriz de modelo: R (3×3, puede venir escalada) girando en torno a un pivote a altura c, y traslación p
const model = (R, p, c = 0) => new Float32Array([R[0], R[1], R[2], 0, R[3], R[4], R[5], 0, R[6], R[7], R[8], 0, p[0] - c * R[3], p[1] + c - c * R[4], p[2] - c * R[5], 1]);
const scaleM = (sx, sy, sz, p) => new Float32Array([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, p[0], p[1], p[2], 1]);
const outCubic = (x) => 1 - Math.pow(1 - x, 3);

const grain = { zoom: 1, sx: 0, sy: 0, x: 0, y: 0 }; // la trama: zoom y lugar de la cámara (en celdas) del último cuadro, y lo descontado
// T: segundos desde que cargó la página
function frame(T) {
  const [w, h] = fit();
  gl.uniform1f(U.uTime, T);
  const asp = w / h;
  // isométrica 2:1 (30° de picado, 45° de giro): proyección ortogonal, sin horizonte; la cámara se desliza sobre el plano
  // la cámara avanza de a celdas enteras de pantalla: así el mundo y la trama se mueven juntos y los puntos no nadan
  const ppc = h / viewH(), sinP = Math.sin(ISO.pitch);
  const sx = Math.round((cam.x * ISO.r[0] + cam.z * ISO.r[2]) * ppc), sy = Math.round((cam.x * ISO.f[0] + cam.z * ISO.f[2]) * sinP * ppc);
  const a = sx / ppc, b = sy / (ppc * sinP), target = [ISO.r[0] * a + ISO.f[0] * b, 0, ISO.r[2] * a + ISO.f[2] * b];
  // mientras cambia el zoom no hay cómo pegar la trama al mundo (el mundo cambia de tamaño bajo ella): lo que la cámara se corre
  // en esos cuadros se descuenta, y la trama se queda quieta en pantalla en vez de barrerse
  if (zoom !== grain.zoom) { grain.x += sx - grain.sx; grain.y += sy - grain.sy; grain.zoom = zoom; }
  grain.sx = sx; grain.sy = sy;
  gl.uniform2f(U.uPan, (((sx - grain.x) % 64) + 64) % 64, (((sy - grain.y) % 64) + 64) % 64); // módulo 64: múltiplo de la matriz Bayer y del ruido
  // foco sobre el centro de la pantalla: el círculo cabe en el lado más corto (en el suelo, el alto de pantalla rinde el doble)
  // al cargar, el foco se abre desde el centro en un segundo en vez de aparecer ya encendido
  const R = Math.max(2.8, Math.min(viewH() * asp, viewH() / sinP) * .52) * (INTRO ? Math.max(.02, outCubic(clamp01(T - lightT0))) : 1); // en vertical se deja salir por los lados antes que achicarlo
  // el foco se corre hacia el puntero (un tercio del camino, hasta 1,3 casillas): mover el mouse ya cambia luces y sombras
  const lk = FIXED != null ? .12 : 1 - Math.exp(-Math.min(.05, Math.max(0, T - nowT)) * 7.7); // .12 por cuadro a 60 Hz, medido en tiempo
  nowT = T;
  const pw = hover.on && !sel ? [hover.sx / (ppc * CELL), hover.sy / (ppc * CELL * sinP)] : null; // puntero sobre el suelo, en ejes de pantalla
  let gx = 0, gz = 0;
  if (pw) { const k = Math.min(.33, 1.3 / (Math.hypot(pw[0], pw[1]) || 1)); gx = (ISO.r[0] * pw[0] + ISO.f[0] * pw[1]) * k; gz = (ISO.r[2] * pw[0] + ISO.f[2] * pw[1]) * k; }
  light.ox += (gx - light.ox) * lk; light.oz += (gz - light.oz) * lk;
  light.x = target[0] + light.ox; light.z = target[2] + light.oz;
  gl.uniform3f(U.uLightP, light.x, 5, light.z); gl.uniform4f(U.uSpot, light.x, light.z, R * .38, R);
  // en vertical, el círculo del suelo se veía como un óvalo ancho que se salía por los lados y dejaba una franja: se estira hacia
  // el fondo lo que el isométrico lo aplasta (1/sen 30° = 2), y en pantalla queda redondo
  light.k = asp < 1 ? 1 / sinP : 1; gl.uniform1f(U.uSpotK, light.k);
  if (pw) gl.uniform3f(U.uHover, Math.floor(target[0] + ISO.r[0] * pw[0] + ISO.f[0] * pw[1] + 4), Math.floor(target[2] + ISO.r[2] * pw[0] + ISO.f[2] * pw[1] + 4), 1);
  else gl.uniform3f(U.uHover, 0, 0, 0);
  view = { x: target[0], z: target[2], R };
  gl.uniform1f(U.uDim, sel ? sstep(.3, 1.5, sel.th) : 0); // se va apagando a medida que la pieza se inclina
  if (sel) {
    const p = sel.p, d = dirOf(sel), b = BASE[p.mesh], H = TALL[p.mesh];
    // la luz del piso queda solo bajo la pieza: el texto va sobre negro liso
    const half = (b + H) / 2;
    gl.uniform4f(U.uPud, p.x + d[0] * half - ISO.f[0] * .2, p.z + d[2] * half - ISO.f[2] * .2, sstep(0, 1, sel.lit), half * .8);
    const ppu = cv.clientHeight / viewH(), snap = (v) => Math.round(v / CELL) * CELL, bw = blockW() * CELL; // snap: calzado con la rejilla del canvas
    const scr = (k) => { const wx = p.x + d[0] * k - target[0], wz = p.z + d[2] * k - target[2]; return [cv.clientWidth / 2 + (wx * ISO.r[0] + wz * ISO.r[2]) * ppu, cv.clientHeight / 2 - (wx * ISO.f[0] + wz * ISO.f[2]) * sinP * ppu]; };
    rotulo.classList.toggle("angosto", isTall());
    if (isTall()) {
      // en vertical no cabe al lado: el bloque va centrado bajo la pieza
      const [mx, my] = scr((b + H) / 2);
      rotulo.style.transform = `translate(${snap(Math.max(24, mx - bw / 2))}px, ${snap(my + 1.25 * ppu)}px)`;
      artEl.style.left = artEl.style.top = "0"; artEl.style.width = bodyEl.style.width;
    } else {
      // a la derecha de la pieza; el título queda a la altura de su eje
      const k = anchorOf(sel), wx = p.x + ISO.r[0] * k - target[0], wz = p.z + ISO.r[2] * k - target[2];
      const lx = cv.clientWidth / 2 + (wx * ISO.r[0] + wz * ISO.r[2]) * ppu, ly = cv.clientHeight / 2 - (wx * ISO.f[0] + wz * ISO.f[2]) * sinP * ppu;
      rotulo.style.transform = `translate(${snap(lx)}px, ${snap(ly - b * Math.cos(ISO.pitch) * ppu - pxLabel.height * CELL / 2)}px)`;
      // la columna del artículo: pasada la lista y con su título a la altura del título elegido
      artEl.style.left = bw + GAP + "px"; artEl.style.width = artW(sel) + "px";
      if (artLink) { const rr = rotulo.getBoundingClientRect(), lr = artLink.getBoundingClientRect(); artEl.style.top = Math.round(lr.top - rr.top + lr.height / 2 - 18) + "px"; }
    }
    // se escribe: primero el título, desde que la pieza queda en el suelo, y después el texto, más rápido
    const n = Math.max(0, Math.min(stops.length - 1, Math.floor((sel.downT - .2) / TYPE_TITLE)));
    pxLabel.style.clipPath = `inset(0 ${(pxLabel.width - stops[n]) * CELL}px 0 0)`;
    typeBody(Math.max(0, Math.floor((sel.downT - .3 - (stops.length - 1) * TYPE_TITLE) / TYPE_BODY)));
  } else { gl.uniform4f(U.uPud, 0, 0, 0, 0); pxLabel.style.clipPath = ""; if (body) setBody(""); }
  const yaw = ISO.yaw, pitch = ISO.pitch, dist = 150;
  const eye = [target[0] + dist * Math.sin(yaw) * Math.cos(pitch), dist * Math.sin(pitch), target[2] + dist * Math.cos(yaw) * Math.cos(pitch)];
  gl.uniformMatrix4fv(U.uVP, false, mul4(ortho(viewH() * asp / 2, viewH() / 2, 1, 400), lookAt(eye, target)));
  gl.uniform3fv(U.uEye, eye);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  shown = visible(target, viewH() * asp / 2 + 2.5, viewH() + 7, ISO.r, ISO.f);
  drawHud(target, R);
  // la pieza bajo el puntero se enciende y da un par de cabeceos, como si la hubieran tocado
  const nudge = (p) => { const u = T - hover.t0, a = .1 * Math.sin(u * 13) * Math.exp(-u * 4); return { mesh: p.mesh, M: fallen({ p, side: a < 0 ? -1 : 1, th: Math.abs(a) }), set: { ...p.set, uHot: hover.p === p ? 1 : 0 } }; };
  const items = shown.map((p) => (sel && sel.p === p ? { mesh: p.mesh, M: fallen(sel), set: { ...p.set, uSel: 1, uGround: 0 }, sel: 1 } : !sel && (hover.p === p || (hover.np === p && T - hover.t0 < 1.5)) ? nudge(p) : p));
  // la compuerta: las cuatro copias que rodean a la cámara (dentro de la luz nunca hay más de una). La tapa va con las piezas: sombra, contorno y trama
  const pits = [];
  for (const m of [0, 1]) for (const n of [0, 1]) {
    const x = TRAP[0] + (Math.floor((target[0] - TRAP[0]) / PERIOD) + m) * PERIOD, z = TRAP[1] + (Math.floor((target[2] - TRAP[1]) / PERIOD) + n) * PERIOD;
    items.push({ mesh: "lid", M: model(rot([0, 0, 1], trap.a), [x - .38, 0, z]), set: LID }); pits.push([x, z]);
  }
  const bp = bun?.pose;
  if (bp) items.push({ mesh: "bunny", M: model(mul3(rot([0, 1, 0], Math.atan2(BUN.D[2], -BUN.D[0])), rot([0, 0, 1], bp.tilt)).map((v) => v * BUN.SCALE), [bp.x, bp.y, bp.z]), set: BUNNY, noShadow: bp.y < -.02 });

  gl.enable(gl.DEPTH_TEST);
  draw("top", scaleM(900, 1, 900, [target[0], 0, target[2]]), { uMode: 5, uSh: 1, uProj: 0 });
  // sombras: sin profundidad, cada una escribe el suelo ya oscurecido (no se suman donde se pisan)
  gl.disable(gl.DEPTH_TEST);
  for (const it of items) if (!it.noShadow) draw(it.mesh, it.M, { uMode: 5, uSh: .4, uProj: 1, uPlaneY: 0, uSel: 0 });
  // reflejo de la elegida: la misma malla espejada (y estirada) bajo el suelo, dibujada sobre el piso
  for (const it of items) if (it.sel) {
    const M = it.M.slice(); for (const k of [1, 5, 9, 13]) M[k] *= -1.4;
    draw(it.mesh, M, { uMode: 7, uProj: 0, uWob: .07 });
    gl.uniform1f(U.uWob, 0);
  }
  gl.enable(gl.DEPTH_TEST);
  // contorno de tinta: las caras traseras de la malla inflada
  gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
  for (const it of items) if (!it.sel) draw(it.mesh, it.M, { uMode: 6, uProj: 0, uOut: .03, uSel: 0 });
  gl.disable(gl.CULL_FACE); gl.uniform1f(U.uOut, 0);
  for (const it of items) draw(it.mesh, it.M, { uMode: 0, uProj: 0, ...it.set });
  for (const [x, z] of pits) draw("pit", scaleM(1, 1, 1, [x, -.6, z]), PIT);
}

// ---------- el bucle. Dibuja solo mientras algo se mueve: con una pieza en juego, arrastrando, con inercia, o hasta 2 s
// después del último gesto (lo que tardan en asentarse el foco que sigue al puntero y el cabeceo de la pieza tocada)
const t0 = performance.now();
let wakeUntil = 0;
function wake() { wakeUntil = (performance.now() - t0) / 1000 + 2; }
for (const type of ["pointerdown", "pointermove", "pointerup", "wheel", "keydown", "resize", "popstate"]) addEventListener(type, wake, { capture: true, passive: true });
// al cambiar la ventana cambian la celda y los anchos del bloque de texto
addEventListener("resize", () => { CELL = cellFor(); drawBack(); if (sel) { drawLabel(DEST[sel.p.mesh][0]); fitBody(); } });

// teclado: un menú con las seis secciones, oculto hasta recibir foco (Tab). Elegir una tumba su pieza; si había otra en el suelo,
// primero se levanta esa y después cae la nueva
let queued = null;
document.querySelector(".tablero .piezas").addEventListener("click", (e) => {
  const kind = e.target.closest("button")?.dataset.pieza;
  if (!kind || (sel && sel.p.mesh === kind)) return;
  if (dive) exitDive();
  if (sel) { queued = kind; closeArticle(); sel.mode = "rise"; } else push(nearest(kind));
  wake();
});

if (FIXED != null) {
  fontReady.finally(() => {
    frame(FIXED);
    if (Q.has("q")) { const p = shown.slice().sort((m, n) => Math.hypot(m.x - view.x, m.z - view.z) - Math.hypot(n.x - view.x, n.z - view.z))[+(Q.get("n") || 0)]; take(p); Object.assign(sel, { side: roomSide(p), th: restOf(p, roomSide(p)).r, mode: "down", downT: 1e3, lit: 1 }); }
    syncRoute(); stepArticle(99);
    if (sel) [cam.x, cam.z] = goalOf(sel);
    if (Q.has("bun")) { bunNext = 0; for (let i = 0, n = +Q.get("bun") * 60; i < n; i++) { stepBun(i / 60, 1 / 60, false); if (trapMoving()) stepTrap(1 / 60); } }
    frame(FIXED); frame(FIXED);
    if (Q.has("dive")) { hudG.clearRect(0, 0, hudCv.width, hudCv.height); drawScreen(TUN, +Q.get("dive")); }
    if (Q.has("room")) loadColoso().then(() => new Promise((r) => (coloso.ready() ? r() : coloso.video.addEventListener("loadeddata", r, { once: true })))).then(() => coloso.still(+Q.get("room"))).then(() => { hudG.clearRect(0, 0, hudCv.width, hudCv.height); if (Q.has("sim")) for (let i = 0, n = +Q.get("sim") * 60; i < n; i++) stepFallers(i / 60, 1 / 60); drawRoom(Q.has("sim") ? +Q.get("sim") : 99, 0, [+(Q.get("yaw") || 0), +(Q.get("pitch") || 0)]); if (Q.has("raw")) document.body.append(Object.assign(roomCv, { style: "position:fixed;inset:0;width:100vw;height:100vh;z-index:9" })); }); // &raw=1: la imagen sin trama; &sim=9: el mundo avanzado esos segundos (temblores y piezas)
  });
} else {
  let prev = t0, drag = null, zoomAt = [0, 0];
  // arrastrar mueve el plano bajo el dedo (con inercia al soltar); flechas o WASD lo recorren
  const ppu = () => cv.clientHeight / viewH(), sinP = Math.sin(ISO.pitch);
  const pan = (dx, dy) => { const a = -dx / ppu(), b = dy / (ppu() * sinP); cam.x += ISO.r[0] * a + ISO.f[0] * b; cam.z += ISO.r[2] * a + ISO.f[2] * b; };
  cv.style.cursor = "grab"; cv.style.touchAction = "none";
  // hold: el puntero lleva la pieza. Su movimiento a través del eje de la pieza la gira, como empujar una palanca de largo L
  let hold = null;
  const cosP = Math.cos(ISO.pitch);
  const startHold = (e) => {
    const rc = cv.getBoundingClientRect(), p = sel.p, H = TALL[p.mesh], dx = p.x - view.x, dz = p.z - view.z;
    const x = (e.clientX - rc.left - rc.width / 2) / ppu() - (dx * ISO.r[0] + dz * ISO.r[2]), y = -(e.clientY - rc.top - rc.height / 2) / ppu() - (dx * ISO.f[0] + dz * ISO.f[2]) * sinP;
    const L = Math.max(.4 * H, Math.min(H, sel.mode === "down" ? x * sel.side : y / cosP)); // de dónde la tomó: más arriba, más palanca
    hold = { x: e.clientX, y: e.clientY, L, moved: 0, t: performance.now(), wasDown: sel.mode === "down" };
    sel.mode = "drag"; sel.w = 0; cv.style.cursor = "grabbing";
  };
  cv.addEventListener("pointerdown", (e) => {
    if (dive) {
      dive.down = dive.there ? [e.clientX, e.clientY] : null; // del vacío se sale tocando la trampilla de arriba (se decide al soltar); antes, el viaje no se interrumpe
      if (e.pointerType !== "mouse") { dive.touch = true; dive.drag = { x: e.clientX, y: e.clientY, px: dive.px, py: dive.py, t: performance.now() }; dive.vx = dive.vy = 0; }
      return;
    }
    cam.vx = cam.vz = 0;
    try { cv.setPointerCapture(e.pointerId); } catch {}
    // con un artículo abierto, cualquier toque fuera de él lo cierra (la columna y la lista están encima del canvas, no llegan aquí)
    if (art && !art.out) { tapOut = { x: e.clientX, y: e.clientY }; return; } // se decide al soltar: un toque quieto cierra, un arrastre no
    // con una pieza en el suelo solo responde ella: se vuelve al tablero levantándola
    // un toque en cualquier otra parte termina de escribir el texto de una vez
    if (sel) { if (overFallen(e.clientX, e.clientY)) startHold(e); else if (sel.mode === "down") sel.downT += 99; return; }
    const p = pick(e.clientX, e.clientY);
    if (p) { take(p); startHold(e); return; }
    // un toque quieto sobre el hueco abierto es entrar (se decide al soltar); arrastrar desde ahí mueve el tablero, como en cualquier casilla
    const rc = cv.getBoundingClientRect(), hole = trap.a > 1 ? holeAt(e.clientX - rc.left - rc.width / 2, -(e.clientY - rc.top - rc.height / 2)) : null;
    if (hole) { drag = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now(), hole }; return; }
    // la compuerta se toma igual que una pieza: el puntero lleva la tapa. hx, hy = la bisagra en pantalla; da = lo que va del ángulo
    // de la tapa al del puntero al tomarla (se mantiene, así no salta si no la tomó justo sobre ella)
    const q = trapAt(e.clientX, e.clientY);
    if (q) { wakeAudio(); trap.hold = { x: e.clientX, y: e.clientY, hx: e.clientX - q[0] * ppu(), hy: e.clientY + q[1] * ppu(), da: trap.a - trapAngle(...q), moved: 0, t: performance.now() }; trap.w = 0; cv.style.cursor = "grabbing"; return; }
    drag = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now() }; cv.style.cursor = "grabbing";
  });
  addEventListener("keydown", (e) => { if (e.key !== "Escape") return; if (dive) { exitDive(); return; } if (art && !art.out) closeArticle(); else if (sel && sel.mode === "down") sel.mode = "rise"; }); // primero cierra el artículo, después levanta la pieza
  cv.addEventListener("pointermove", (e) => {
    // en el vacío el puntero (o el dedo, arrastrando) gira la cámara
    if (dive) {
      const rc = cv.getBoundingClientRect();
      if (e.pointerType === "mouse") { dive.px = (e.clientX - rc.left) / rc.width * 2 - 1; dive.py = 1 - (e.clientY - rc.top) / rc.height * 2; cv.style.cursor = overHatch(e.clientX, e.clientY) ? "pointer" : "default"; return; }
      // con el dedo: lo que está bajo el dedo lo sigue (arrastrar a la izquierda mira a la derecha); el ancho de la pantalla da media vuelta
      // de la mirada. La velocidad (promediada) queda como impulso al soltar
      const d = dive.drag; if (!d) return;
      const now = performance.now(), dt = Math.max(1, now - d.t) / 1000, k = 2.2 / Math.min(rc.width, rc.height * 1.2);
      const px = Math.max(-1, Math.min(1, d.px - (e.clientX - d.x) * k)), py = Math.max(-1, Math.min(1, d.py + (e.clientY - d.y) * k));
      dive.vx = mix(dive.vx, (px - dive.px) / dt, .4); dive.vy = mix(dive.vy, (py - dive.py) / dt, .4);
      dive.px = px; dive.py = py; d.t = now; dive.looked = true;
      return;
    }
    if (trap.hold) {
      const h = trap.hold, now = performance.now(), dt = Math.max(1, now - h.t) / 1000, a0 = trap.a;
      trap.a = Math.max(0, Math.min(OPEN, trapAngle((e.clientX - h.hx) / ppu(), -(e.clientY - h.hy) / ppu()) + h.da));
      trap.w = mix(trap.w, (trap.a - a0) / dt, .5);
      trap.hold = { ...h, x: e.clientX, y: e.clientY, t: now, moved: h.moved + Math.abs(e.clientX - h.x) + Math.abs(e.clientY - h.y) };
      return;
    }
    if (hold) {
      const dx = (e.clientX - hold.x) / ppu(), dy = -(e.clientY - hold.y) / ppu(), now = performance.now(), dt = Math.max(1, now - hold.t) / 1000;
      const tau = sel.side * sel.th, nt = Math.max(-restOf(sel.p, -1).r, Math.min(restOf(sel.p, 1).r, tau + (dx * Math.cos(tau) - dy / cosP * Math.sin(tau)) / hold.L)), th0 = sel.th;
      sel.th = Math.abs(nt); if (nt) sel.side = Math.sign(nt);
      sel.w = mix(sel.w, (sel.th - th0) / dt, .5);
      hold = { ...hold, x: e.clientX, y: e.clientY, t: now, moved: hold.moved + Math.abs(e.clientX - hold.x) + Math.abs(e.clientY - hold.y) };
      return;
    }
    const rc = cv.getBoundingClientRect();
    hover.on = e.pointerType === "mouse"; hover.sx = e.clientX - rc.left - rc.width / 2; hover.sy = -(e.clientY - rc.top - rc.height / 2);
    if (!drag) {
      const p = sel ? null : pick(e.clientX, e.clientY);
      if (p !== hover.p) { hover.p = p; if (p) { hover.np = p; hover.t0 = nowT; } }
      cv.style.cursor = sel ? (overFallen(e.clientX, e.clientY) ? "pointer" : "default") : p || trapAt(e.clientX, e.clientY) ? "pointer" : "grab";
      return;
    }
    hover.p = null; panned = true;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now(), dt = Math.max(1, now - drag.t) / 1000, x0 = cam.x, z0 = cam.z;
    pan(dx, dy);
    // velocidad promediada (~50 ms): un evento suelto no decide el envión al soltar
    const av = Math.min(1, dt / .05); cam.vx += ((cam.x - x0) / dt - cam.vx) * av; cam.vz += ((cam.z - z0) / dt - cam.vz) * av;
    drag = { ...drag, x: e.clientX, y: e.clientY, moved: drag.moved + Math.abs(dx) + Math.abs(dy), t: now };
  });
  let tapOut = null;
  const end = (e) => {
    if (dive) { if (dive.drag && performance.now() - dive.drag.t > 90) dive.vx = dive.vy = 0; dive.drag = null; if (dive.down && Math.hypot(e.clientX - dive.down[0], e.clientY - dive.down[1]) < (e.pointerType === "mouse" ? 5 : 14) && overHatch(e.clientX, e.clientY)) exitDive(); else if (dive) dive.down = null; return; }
    const slop = e.pointerType === "mouse" ? 5 : 14; // un toque con el dedo siempre se mueve algo: más holgura antes de contarlo como arrastre
    if (tapOut) { if (art && Math.hypot(e.clientX - tapOut.x, e.clientY - tapOut.y) < slop) closeArticle(); tapOut = null; return; }
    if (trap.hold) {
      // un toque quieto le da el envión; arrastrada, al soltarla manda su peso (y la velocidad que traía, si no la soltó quieta)
      if (trap.hold.moved < slop) kickTrap(); else if (performance.now() - trap.hold.t > 120) trap.w = 0;
      trap.hold = null; cv.style.cursor = "grab";
      return;
    }
    if (hold) {
      if (hold.moved < slop) {
        // click sin arrastre: un empujón hacia el lado con más espacio, o levantarla si estaba en el suelo
        if (hold.wasDown) sel.mode = "rise"; else push(sel.p);
      } else {
        // al soltarla manda el equilibrio: pasado el punto de vuelco cae, antes de él vuelve a pararse
        if (performance.now() - hold.t > 120) sel.w = 0;
        sel.mode = sel.th > tipOf(sel.p) ? "fall" : "rise";
      }
      hold = null; cv.style.cursor = "grab";
      return;
    }
    if (!drag) return;
    if (drag.hole && drag.moved < slop) startDive(drag.hole);
    if (performance.now() - drag.t > 80) cam.vx = cam.vz = 0; // soltó quieto: sin inercia
    drag = null; cv.style.cursor = dive ? "default" : "grab";
  };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", (e) => { if (dive) { dive.down = dive.drag = null; dive.vx = dive.vy = 0; } if (hold) hold.moved = 99; if (trap.hold) trap.hold.moved = 99; tapOut = null; end(e); }); // la pieza tomada se suelta donde va, no queda pegada al puntero
  cv.addEventListener("pointerleave", () => { hover.on = false; hover.p = null; });
  // scroll del artículo abierto, con la rueda, el teclado o el dedo
  const reading = () => !!art;
  // la rueda: con un artículo abierto lo recorre (el trackpad casi directo, la rueda de mouse con una curva); sin nada abierto mueve el tablero
  addEventListener("wheel", (e) => {
    const k = e.deltaMode === 1 ? 32 : 1;
    if (dive) return;
    if (reading()) scrollBy(e.deltaY * k, e.deltaMode === 0 && Math.abs(e.deltaY) < 50 ? 30 : 12);
    else if (!sel && !drag && !e.ctrlKey) { pan(-e.deltaX * k, -e.deltaY * k); cam.vx = cam.vz = 0; hover.p = null; panned = true; }
  }, { passive: true });
  addEventListener("keydown", (e) => {
    const d = { ArrowDown: 80, ArrowUp: -80, PageDown: .85 * innerHeight, PageUp: -.85 * innerHeight, " ": .85 * innerHeight, Home: -1e9, End: 1e9 }[e.key];
    if (d && reading() && !e.target.closest("a, button")) { scrollBy(d); e.preventDefault(); }
  });
  // el dedo lleva el texto directo; al soltar sigue con la velocidad que traía y se frena solo
  let touch = null;
  addEventListener("touchstart", (e) => { touch = reading() ? { y: e.touches[0].clientY, t: e.timeStamp, v: 0 } : null; if (touch) readTo = readY; }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (!touch || hold) return;
    const y = e.touches[0].clientY, d = touch.y - y, dt = Math.max(1, e.timeStamp - touch.t) / 1000;
    scrollBy(d, 1e3); touch = { y, t: e.timeStamp, v: mix(touch.v, d / dt, .5) };
  }, { passive: true });
  addEventListener("touchend", (e) => { if (touch && e.timeStamp - touch.t < 80) scrollBy(touch.v / 3, 3); touch = null; }, { passive: true });
  // con Cmd/Ctrl/Alt no es para el tablero (Cmd+S, Cmd+D...): además macOS no avisa cuando se suelta esa tecla y la cámara quedaba andando sola.
  // Tampoco si el foco está en un link o botón (el menú de piezas, la lista): ahí las flechas son del navegador
  addEventListener("keydown", (e) => { if (KEY[e.key] && !e.metaKey && !e.ctrlKey && !e.altKey && !e.target.closest("a, button")) { keys.add(e.key); e.preventDefault(); } });
  addEventListener("keyup", (e) => keys.delete(e.key));
  addEventListener("blur", () => keys.clear()); // cambió de ventana con una tecla apretada
  // ?frames (solo en dev): reloj propio. P pausa/sigue, . avanza un cuadro (1/60 s)
  const FR = Q.has("frames"); let fPaused = false, fSteps = 0, fReal = t0, fNow = t0;
  const fTag = FR && document.body.appendChild(Object.assign(document.createElement("div"), { style: "position:fixed;top:8px;left:8px;z-index:99;padding:4px 8px;background:#000;color:#c8ffe8;font:12px monospace" }));
  let fCount = 0; const fShow = () => { if (fTag) fTag.textContent = (fPaused ? "pausa" : "▶") + " · cuadro " + fCount + " · P pausa · . avanza"; }; fShow();
  if (FR) addEventListener("keydown", (e) => { const k = e.key.toLowerCase(); if (k === "p") fPaused = !fPaused; else if (k === "." && fPaused) fSteps++; else return; e.stopPropagation(); e.preventDefault(); wake(); fShow(); }, { capture: true });
  const loop = (real) => {
    requestAnimationFrame(loop);
    let now = real;
    if (FR) { const d = real - fReal; fReal = real; if (!fPaused) fNow += d; else if (fSteps) { fNow += 1000 / 60; fSteps--; } else return; now = fNow; fCount++; if (fCount % 10 === 0 || fPaused) fShow(); }
    const dt = Math.min(.05, (now - prev) / 1000), T = (now - t0) / 1000; prev = now;
    if (dive) { stepDive(dt, T); return; }
    if (sel) {
      cam.vx = cam.vz = 0;
      if (!stepPiece(sel, dt)) { sel = null; if (queued) { push(nearest(queued)); queued = null; } }
      else {
        if (sel.mode === "down") { stepArticle(dt); stepScroll(dt); }
        else if (art) dropArticle(); // levantar la pieza cierra también el artículo
        // la cámara centra el conjunto pieza + texto; parte apenas la pieza empieza a caer, así caída y encuadre son un solo gesto
        if (sel.mode === "down" || sel.mode === "fall") {
          const g = goalOf(sel), k = 1 - Math.exp(-dt * 5);
          cam.x += (g[0] - cam.x) * k; cam.z += (g[1] - cam.z) * k;
        }
      }
    } else if (!drag) {
      let kx = 0, ky = 0;
      for (const k of keys) { kx += KEY[k][0]; ky += KEY[k][1]; }
      if (kx || ky) { panned = true; const n = 11 / Math.hypot(kx, ky); cam.vx = (ISO.r[0] * kx + ISO.f[0] * ky) * n; cam.vz = (ISO.r[2] * kx + ISO.f[2] * ky) * n; }
      cam.x += cam.vx * dt; cam.z += cam.vz * dt;
      const fr = Math.exp(-dt * (kx || ky ? 0 : 3.5)); cam.vx *= fr; cam.vz *= fr;
      if (Math.hypot(cam.vx, cam.vz) < .01) cam.vx = cam.vz = 0;
    }
    stepBun(T, dt, !!(sel || drag || trap.hold));
    const a0 = trap.a, tm = trapMoving(); if (tm) stepTrap(dt);
    if (a0 < 1.571 && trap.a >= 1.571) sfx("abre"); // la tapa pasa la vertical (sola o llevada por el puntero): chirría y cae abierta
    // con el mouse sobre el hueco abierto la cámara se acerca, y al salir vuelve. Se acerca en torno al hueco: en pantalla él no se
    // mueve de su lugar, así el puntero sigue encima mientras crece
    const hole = drag ? null : overHole(), zt = hole ? ZOOM : 1, zooming = zoom !== zt;
    if (hole) zoomAt = hole;
    if (zooming) {
      const z0 = zoom; zoom = RM || Math.abs(zt - zoom) < .002 ? zt : zoom + (zt - zoom) * (1 - Math.exp(-dt * 5));
      cam.x = zoomAt[0] - (zoomAt[0] - cam.x) * z0 / zoom; cam.z = zoomAt[1] - (zoomAt[1] - cam.z) * z0 / zoom;
    }
    // el viento que sube del hueco, tan fuerte como cerca esté la cámara
    const air = (zoom - 1) / (ZOOM - 1);
    if (air > .01 && !airVoice) airVoice = sfx("aire", 0, 1, true);
    if (airVoice) { airVoice.gain.gain.value = SFX.aire[1] * SFX_VOL * air; if (air <= .01) { airVoice.src.stop(); airVoice = null; } }
    if (sel || drag || cam.vx || cam.vz || T - lightT0 < 1.2 || T < wakeUntil || tm || zooming || bun) frame(T);
  };
  requestAnimationFrame(loop);
  requestAnimationFrame(syncRoute); // después del primer cuadro, que es el que sabe qué piezas hay a la vista
}
