// Tablero isométrico infinito en 1 bit (estilo Obra Dinn), de noche, con un foco al centro. Seis piezas, una por sección,
// que se repiten cada 12 casillas. Al tumbar una (click o arrastre, con física) todo lo demás se apaga y al lado se escribe su
// sección; en Artículos cada título abre el artículo en una columna a la derecha, con su dirección de siempre en la barra.
// Viene del prototipo aprobado el 2026-11-16 (prototipo/tablero/, fuera de git). Las secciones y el artículo abierto los deja
// el servidor en el HTML (components/Tablero.astro); de ahí se leen.
// Cuadros fijos para revisar, solo en dev: ?t=1 (reposo) · &q=1&n=0 (la n-ésima pieza más cercana, tumbada) · &size=390x844
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
    if (uKind == 2.0 && length(vec3(vLoc.x - 0.2, vLoc.y - 0.94, abs(vLoc.z) - 0.095)) < 0.022) v *= 0.15;
    // 1 bit: se estira el contraste para que luz y sombra queden planas y la trama viva solo en el medio tono;
    // las piezas oscuras llevan una línea clara en el borde para no perderse sobre las casillas negras
    v = clamp((v - 0.08) / 0.52, 0.0, 1.0);
    if (uAlb < 0.5 && 1.0 - max(dot(N, V), 0.0) > 0.52) v = 1.0;
    v = v * (1.0 + 0.3 * uHot) + 0.14 * uHot;
    if (back > 0.5) v *= 0.3;
    // al elegir una pieza todo se apaga y ella queda en blanco pleno, con una línea de tinta donde la forma se da vuelta
    v = uSel > 0.5 ? mix(v * spot(vW.xz), 1.0 - step(0.8, 1.0 - max(dot(N, V), 0.0)), uDim) : v * spot(vW.xz) * (1.0 - uDim);
  } else {
    // suelo: el damero sigue sin bordes; un degradé dentro de cada casilla hace aparecer la trama
    vec2 cc = floor(vW.xz + 4.0), fc = fract(vW.xz + 4.0);
    float tone = mod(cc.x + cc.y, 2.0) < 0.5 ? 0.99 : 0.04;
    // la casilla bajo el puntero responde: la clara queda blanca lisa, la oscura se levanta a media trama
    if (uHover.z > 0.5 && cc == uHover.xy) { tone = max(tone, 0.4) * 1.25; fc = vec2(0.0); }
    tone -= 0.16 * (fc.x + fc.y) * 0.5 * tone;
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

// ---------- el contenido: lo que el servidor dejó en .secciones, en el idioma de la página
const scene = document.querySelector(".tablero");
// pieza → [título, párrafo, [[título, dirección], ...]] (la lista solo la tienen los artículos)
const DEST = {};
for (const s of scene.querySelectorAll(".secciones [data-pieza]")) {
  DEST[s.dataset.pieza] = [s.querySelector("h2").textContent, s.querySelector("p")?.textContent ?? "", Array.from(s.querySelectorAll("li a"), (a) => [a.textContent, a.getAttribute("href")])];
}
const HINT = scene.dataset.pista, HOME = scene.dataset.inicio, HOME_TITLE = scene.dataset.titulo;

const BASE = { pawn: .27, rook: .33, knight: .33, bishop: .32, queen: .36, king: .37 };
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// pieza tomada: th = cuánto está volcada (0 de pie, restOf(...).r tumbada), w = su velocidad, side = hacia qué lado de la pantalla.
// modo: "drag" la lleva el puntero · "fall" cae sola · "rise" vuelve a pararse · "down" quedó en el suelo (downT = segundos ahí)
// cómo queda apoyada una pieza: se mira su perfil hacia el lado en que cae (u = distancia desde el canto del pie hacia ese lado, y = altura).
// Rueda sobre el canto del pie; cuando otro punto toca el suelo pasa a rodar sobre él (el borde de arriba del pie, después la cabeza),
// hasta que su centro queda entre los dos apoyos. Así la cabeza llega al suelo en vez de quedar en el aire. Devuelve el ángulo
// y la envolvente del perfil, con la que fallen() levanta la pieza para que nada se hunda en el suelo
function restAt(mesh, yaw, side) {
  const m = MESH[mesh], R = rot([0, 1, 0], yaw), d = [ISO.r[0] * side, ISO.r[2] * side], b = BASE[mesh];
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
// distancia al centro del foco, en casillas, con el mismo estiramiento que usa el shader
const fromLight = (p) => { const dx = p.x - light.x, dz = p.z - light.z; return Math.hypot(dx * ISO.r[0] + dz * ISO.r[2], (dx * ISO.f[0] + dz * ISO.f[2]) / light.k); };
const fizz = document.createElement("canvas"), fizzG = fizz.getContext("2d"), fizzIm = fizzG.createImageData(64, 64); fizz.width = fizz.height = 64;
const hudCv = document.getElementById("hud"), hudG = hudCv.getContext("2d");
function drawHud(target, R) {
  if (hudCv.width !== cv.width || hudCv.height !== cv.height) { hudCv.width = cv.width; hudCv.height = cv.height; }
  hudCv.style.width = cv.width * CELL + "px"; hudCv.style.height = cv.height * CELL + "px";
  hudG.clearRect(0, 0, hudCv.width, hudCv.height);
  // con una pieza en juego los nombres se van deshaciendo al mismo ritmo que las demás piezas
  const dim = sel ? sstep(.3, 1.5, sel.th) : 0;
  if (dim >= 1) return;
  const ppc = cv.height / viewH(), sinP = Math.sin(ISO.pitch), cosP = Math.cos(ISO.pitch), cx = cv.width / 2, cy = cv.height / 2, small = cv.width < cv.height ? 11 : 13;
  // placa: texto sobre fondo liso (nunca directo sobre la trama); la de la pieza tocada va invertida
  const plate = (text, x, y, hot) => {
    const bm = textBitmap(text, small, hot), px = Math.max(3, Math.min(hudCv.width - bm.width - 3, Math.round(x - bm.width / 2))), py = Math.round(y - bm.height); // nunca cortada por el borde
    hudG.fillStyle = hot ? "rgb(200,255,232)" : "rgb(12,12,14)"; hudG.fillRect(px - 3, py - 1, bm.width + 6, bm.height + 2);
    hudG.drawImage(bm, px, py);
  };
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
const ISO = { yaw: Math.PI / 4, pitch: Math.PI / 6, r: [Math.SQRT1_2, 0, -Math.SQRT1_2], f: [-Math.SQRT1_2, 0, -Math.SQRT1_2] };
const cam = { x: 0, z: 0, vx: 0, vz: 0 };
const viewH = () => (cv.clientWidth < cv.clientHeight ? 7.5 : 5.6); // casillas de alto que entran en pantalla
const ortho = (hw, hh, n, f) => new Float32Array([1 / hw, 0, 0, 0, 0, 1 / hh, 0, 0, 0, 0, -2 / (f - n), 0, 0, 0, -(f + n) / (f - n), 1]);
// matriz de modelo: R (3×3, puede venir escalada) girando en torno a un pivote a altura c, y traslación p
const model = (R, p, c = 0) => new Float32Array([R[0], R[1], R[2], 0, R[3], R[4], R[5], 0, R[6], R[7], R[8], 0, p[0] - c * R[3], p[1] + c - c * R[4], p[2] - c * R[5], 1]);
const scaleM = (sx, sy, sz, p) => new Float32Array([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, p[0], p[1], p[2], 1]);
const outCubic = (x) => 1 - Math.pow(1 - x, 3);

// T: segundos desde que cargó la página
function frame(T) {
  const w = Math.max(1, Math.ceil(cv.clientWidth / CELL)), h = Math.max(1, Math.ceil(cv.clientHeight / CELL));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  gl.viewport(0, 0, w, h);
  gl.uniform1f(U.uTime, T);
  const asp = w / h;
  // isométrica 2:1 (30° de picado, 45° de giro): proyección ortogonal, sin horizonte; la cámara se desliza sobre el plano
  // la cámara avanza de a celdas enteras de pantalla: así el mundo y la trama se mueven juntos y los puntos no nadan
  const ppc = h / viewH(), sinP = Math.sin(ISO.pitch);
  const sx = Math.round((cam.x * ISO.r[0] + cam.z * ISO.r[2]) * ppc), sy = Math.round((cam.x * ISO.f[0] + cam.z * ISO.f[2]) * sinP * ppc);
  const a = sx / ppc, b = sy / (ppc * sinP), target = [ISO.r[0] * a + ISO.f[0] * b, 0, ISO.r[2] * a + ISO.f[2] * b];
  gl.uniform2f(U.uPan, ((sx % 64) + 64) % 64, ((sy % 64) + 64) % 64); // módulo 64: múltiplo de la matriz Bayer y del ruido
  // foco sobre el centro de la pantalla: el círculo cabe en el lado más corto (en el suelo, el alto de pantalla rinde el doble)
  // al cargar, el foco se abre desde el centro en un segundo en vez de aparecer ya encendido
  const R = Math.max(2.8, Math.min(viewH() * asp, viewH() / sinP) * .52) * (INTRO ? Math.max(.02, outCubic(clamp01(T))) : 1); // en vertical se deja salir por los lados antes que achicarlo
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

  gl.enable(gl.DEPTH_TEST);
  draw("top", scaleM(900, 1, 900, [target[0], 0, target[2]]), { uMode: 5, uSh: 1, uProj: 0 });
  // sombras: sin profundidad, cada una escribe el suelo ya oscurecido (no se suman donde se pisan)
  gl.disable(gl.DEPTH_TEST);
  for (const it of items) draw(it.mesh, it.M, { uMode: 5, uSh: .4, uProj: 1, uPlaneY: 0, uSel: 0 });
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
  if (sel) { queued = kind; closeArticle(); sel.mode = "rise"; } else push(nearest(kind));
  wake();
});

if (FIXED != null) {
  fontReady.finally(() => {
    frame(FIXED);
    if (Q.has("q")) { const p = shown.slice().sort((m, n) => Math.hypot(m.x - view.x, m.z - view.z) - Math.hypot(n.x - view.x, n.z - view.z))[+(Q.get("n") || 0)]; take(p); Object.assign(sel, { side: roomSide(p), th: restOf(p, roomSide(p)).r, mode: "down", downT: 1e3, lit: 1 }); }
    syncRoute(); stepArticle(99);
    if (sel) [cam.x, cam.z] = goalOf(sel);
    frame(FIXED); frame(FIXED);
  });
} else {
  const keys = new Set();
  const KEY = { ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, 1], w: [0, 1], ArrowDown: [0, -1], s: [0, -1] };
  let prev = t0, drag = null;
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
    cam.vx = cam.vz = 0;
    try { cv.setPointerCapture(e.pointerId); } catch {}
    // con un artículo abierto, cualquier toque fuera de él lo cierra (la columna y la lista están encima del canvas, no llegan aquí)
    if (art && !art.out) { tapOut = { x: e.clientX, y: e.clientY }; return; } // se decide al soltar: un toque quieto cierra, un arrastre no
    // con una pieza en el suelo solo responde ella: se vuelve al tablero levantándola
    // un toque en cualquier otra parte termina de escribir el texto de una vez
    if (sel) { if (overFallen(e.clientX, e.clientY)) startHold(e); else if (sel.mode === "down") sel.downT += 99; return; }
    const p = pick(e.clientX, e.clientY);
    if (p) { take(p); startHold(e); return; }
    drag = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now() }; cv.style.cursor = "grabbing";
  });
  addEventListener("keydown", (e) => { if (e.key !== "Escape") return; if (art && !art.out) closeArticle(); else if (sel && sel.mode === "down") sel.mode = "rise"; }); // primero cierra el artículo, después levanta la pieza
  cv.addEventListener("pointermove", (e) => {
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
      cv.style.cursor = sel ? (overFallen(e.clientX, e.clientY) ? "pointer" : "default") : p ? "pointer" : "grab";
      return;
    }
    hover.p = null; panned = true;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now(), dt = Math.max(1, now - drag.t) / 1000, x0 = cam.x, z0 = cam.z;
    pan(dx, dy);
    // velocidad promediada (~50 ms): un evento suelto no decide el envión al soltar
    const av = Math.min(1, dt / .05); cam.vx += ((cam.x - x0) / dt - cam.vx) * av; cam.vz += ((cam.z - z0) / dt - cam.vz) * av;
    drag = { x: e.clientX, y: e.clientY, moved: drag.moved + Math.abs(dx) + Math.abs(dy), t: now };
  });
  let tapOut = null;
  const end = (e) => {
    const slop = e.pointerType === "mouse" ? 5 : 14; // un toque con el dedo siempre se mueve algo: más holgura antes de contarlo como arrastre
    if (tapOut) { if (art && Math.hypot(e.clientX - tapOut.x, e.clientY - tapOut.y) < slop) closeArticle(); tapOut = null; return; }
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
    if (performance.now() - drag.t > 80) cam.vx = cam.vz = 0; // soltó quieto: sin inercia
    drag = null; cv.style.cursor = "grab";
  };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", (e) => { if (hold) hold.moved = 99; tapOut = null; end(e); }); // la pieza tomada se suelta donde va, no queda pegada al puntero
  cv.addEventListener("pointerleave", () => { hover.on = false; hover.p = null; });
  // scroll del artículo abierto, con la rueda, el teclado o el dedo
  const reading = () => !!art;
  // la rueda: con un artículo abierto lo recorre (el trackpad casi directo, la rueda de mouse con una curva); sin nada abierto mueve el tablero
  addEventListener("wheel", (e) => {
    const k = e.deltaMode === 1 ? 32 : 1;
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
    if (sel || drag || cam.vx || cam.vz || T < 1.2 || T < wakeUntil) frame(T);
  };
  requestAnimationFrame(loop);
  requestAnimationFrame(syncRoute); // después del primer cuadro, que es el que sabe qué piezas hay a la vista
}
