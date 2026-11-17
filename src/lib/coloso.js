// El coloso que fuma, al fondo del túnel de la compuerta (lo carga lib/tablero.js al entrar al hueco). Es un video en bucle sobre negro
// (public/tablero/coloso.mp4, 6 s, 24 cuadros por segundo; lo generó Damián a partir del dibujo en líneas de prototipo/coloso) y, encima,
// el humo, que se dibuja aquí y va sincronizado con el video. Todo en color pleno y sin trama: la trama, el resplandor y la entrada
// desde el negro los pone el shader de tablero.js sobre este canvas.
// Tiempos del video: el puro está en la boca hasta los 2,25 s; la mano lo aparta y lo sube (3 a 3,6 s arriba, junto a la cabeza) y
// lo devuelve a la boca a los 4,5 s. Mientras está afuera, el coloso suelta el humo.

export const video = Object.assign(document.createElement("video"), { src: "/tablero/coloso.mp4", muted: true, loop: true, playsInline: true, preload: "auto" });
export const ready = () => video.readyState >= 2;
export const start = () => video.play().catch(() => {}); // sin sonido y después de un toque: los navegadores lo dejan
export function stop() { video.pause(); video.currentTime = 0; parts.length = 0; owed = [0, 0]; }

// dónde está la brasa en cada momento: su lugar en el cuadro (0 a 1), medido en el video cada 3 cuadros (1/8 s)
const EMBER = [[0.568, 0.290], [0.569, 0.291], [0.569, 0.290], [0.568, 0.290], [0.569, 0.290], [0.569, 0.290], [0.569, 0.290], [0.569, 0.290], [0.569, 0.290], [0.569, 0.290], [0.569, 0.291], [0.569, 0.290], [0.568, 0.290], [0.569, 0.290], [0.569, 0.291], [0.569, 0.291], [0.569, 0.291], [0.567, 0.294], [0.566, 0.296], [0.532, 0.257], [0.496, 0.228], [0.418, 0.179], [0.368, 0.165], [0.333, 0.150], [0.324, 0.149], [0.324, 0.149], [0.324, 0.149], [0.324, 0.149], [0.324, 0.149], [0.344, 0.153], [0.363, 0.156], [0.410, 0.171], [0.462, 0.186], [0.528, 0.230], [0.550, 0.249], [0.567, 0.283], [0.569, 0.291], [0.568, 0.291], [0.568, 0.291], [0.568, 0.291], [0.569, 0.291], [0.569, 0.291], [0.568, 0.291], [0.568, 0.291], [0.568, 0.290], [0.568, 0.290], [0.569, 0.290], [0.568, 0.290], [0.568, 0.290]];
const MOUTH = [.505, .272];
const mix = (a, b, k) => a + (b - a) * k, sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function ember(tv) { const u = tv * 8, i = Math.max(0, Math.min(EMBER.length - 2, Math.floor(u))), k = Math.min(1, u - i); return [mix(EMBER[i][0], EMBER[i + 1][0], k), mix(EMBER[i][1], EMBER[i + 1][1], k)]; }
// cuánto suelta el humo (0 a 1): empieza apenas el puro sale de la boca y se agota antes de que vuelva
const exhale = (tv) => sstep(2.5, 2.8, tv) * (1 - sstep(3.3, 3.9, tv));
// cuánto aspira: dos chupadas con el puro en la boca, antes de apartarlo. La brasa se aviva con ellas
const puff = (tv) => Math.max(sstep(1.1, 1.35, tv) * (1 - sstep(1.5, 1.8, tv)), sstep(1.8, 2, tv) * (1 - sstep(2.15, 2.4, tv)));

// ---------- humo: bocanadas blandas que nacen en la boca (al soltar el humo) y en la brasa (siempre, un hilo), suben y se deshacen.
// Las medidas van en lados del video (0 a 1), así no dependen del tamaño de la pantalla
const parts = []; let owed = [0, 0], seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
function step(tv, dt) {
  const e = ember(tv), ex = exhale(tv);
  // el hilo de la brasa
  for (owed[0] += dt * 22; owed[0] >= 1; owed[0]--) parts.push({ x: e[0] + .006 + (rnd() - .5) * .006, y: e[1] - .008, vx: .012 + (rnd() - .5) * .014, vy: -.055 - rnd() * .03, r: .008, gr: .02, life: 1.8 + rnd() * 1.2, a: .1, age: 0, k: rnd() * 6.28 });
  // la bocanada: sale hacia adelante y abajo, se frena, y sube
  for (owed[1] += dt * 60 * ex; owed[1] >= 1; owed[1]--) { const an = .4 + (rnd() - .5) * 1.3, sp = (.2 + rnd() * .26) * (.5 + .5 * ex); parts.push({ x: MOUTH[0] + (rnd() - .5) * .012, y: MOUTH[1] + (rnd() - .5) * .008, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, r: .016, gr: .05 + rnd() * .04, life: 2.8 + rnd() * 1.8, a: .1, age: 0, k: rnd() * 6.28 }); }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.age += dt;
    if (p.age > p.life) { parts.splice(i, 1); continue; }
    const drag = Math.exp(-dt * 1.7);
    p.vx = p.vx * drag + Math.sin(p.y * 38 + p.k + p.age * 1.4) * .05 * dt; // se frena y se ondula
    p.vy = mix(-.06, p.vy, Math.exp(-dt * 1.3));                             // y termina subiendo
    p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.gr * dt;
  }
}
// la mancha blanda con que se pinta cada bocanada
const puffCv = Object.assign(document.createElement("canvas"), { width: 64, height: 64 });
{ const c = puffCv.getContext("2d"), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,238,228,1)"); gr.addColorStop(.45, "rgba(255,226,214,.5)"); gr.addColorStop(1, "rgba(255,220,210,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }

// ---------- un cuadro: el video abajo al centro, ocupando el 80% del canvas, y el humo encima. dt = segundos desde el cuadro anterior
// (0 = no avanza el humo). El humo puede salirse del cuadro del video hacia el vacío
export function frame(g, w, h, dt) {
  const S = Math.min(w, h) * .8, ox = (w - S) / 2, oy = h - S - h * .04, tv = video.currentTime; // margen arriba y a los lados para el humo
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
  g.drawImage(video, ox, oy, S, S);
  if (dt > 0) step(tv, Math.min(dt, .05));
  g.globalCompositeOperation = "lighter";
  // la brasa alumbra más cuando aspira
  const e = ember(tv), pf = puff(tv), R = S * (.035 + .05 * pf), gr = g.createRadialGradient(ox + e[0] * S, oy + e[1] * S, 0, ox + e[0] * S, oy + e[1] * S, R);
  gr.addColorStop(0, `rgba(255,190,70,${.25 + .6 * pf})`); gr.addColorStop(1, "rgba(255,120,20,0)");
  g.fillStyle = gr; g.fillRect(ox + e[0] * S - R, oy + e[1] * S - R, 2 * R, 2 * R);
  for (const p of parts) {
    g.globalAlpha = p.a * Math.min(1, p.age / .22) * Math.pow(1 - p.age / p.life, 1.3);
    g.drawImage(puffCv, ox + (p.x - p.r) * S, oy + (p.y - p.r) * S, 2 * p.r * S, 2 * p.r * S);
  }
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
}
// cuadro fijo (para revisar, solo en dev): lleva el video al segundo T y deja el humo como estaría ahí, simulando los 4 s anteriores
export function still(T) {
  parts.length = 0; owed = [0, 0]; seed = 1;
  const d = video.duration || 6.04, tv = ((T % d) + d) % d;
  for (let k = 96; k > 0; k--) step((((tv - k / 24) % d) + d) % d, 1 / 24);
  return new Promise((res) => { video.addEventListener("seeked", res, { once: true }); video.currentTime = tv; });
}
