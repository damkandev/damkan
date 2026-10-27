// Utilidades del rediseño "tejido": todo lo dibujado se ve como punto cruz.
// Una grilla de colores (una celda = una puntada) se pinta a resolución de puntada, cada puntada con un leve
// temblor de lana, y encima va la "tela" de una puntada (brillo en diagonal y sombra abajo/derecha).

export type RGB = readonly [number, number, number];

export const LANA: RGB = [27, 28, 34];
export const HUESO: RGB = [239, 230, 210];
export const TINTA: RGB = [20, 20, 24];
export const NARANJO: RGB = [224, 112, 40];
export const SOL: RGB = [242, 193, 74];
export const VIDRIO: RGB = [52, 64, 143];
export const AZUL: RGB = [91, 120, 201];
export const GRIS: RGB = [120, 118, 124];

/** Tamaño de puntada por defecto, en px CSS. */
export const PUNTADA = 5;

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** La tela de una puntada de T px de dispositivo, como patrón repetible. */
export function tela(ctx: CanvasRenderingContext2D, T: number): CanvasPattern {
  const c = document.createElement("canvas");
  c.width = c.height = T;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, T, T);
  gr.addColorStop(0, "rgba(255,255,255,.16)");
  gr.addColorStop(0.5, "rgba(255,255,255,0)");
  gr.addColorStop(1, "rgba(0,0,0,.28)");
  g.fillStyle = gr;
  g.fillRect(0, 0, T, T);
  const e = Math.max(1, Math.round(T * 0.14));
  g.fillStyle = "rgba(0,0,0,.38)";
  g.fillRect(0, T - e, T, e);
  g.fillStyle = "rgba(0,0,0,.2)";
  g.fillRect(T - e, 0, e, T - e);
  g.strokeStyle = "rgba(255,255,255,.07)";
  g.lineWidth = Math.max(1, T * 0.12);
  g.beginPath();
  g.moveTo(T * 0.15, T * 0.85);
  g.lineTo(T * 0.85, T * 0.15);
  g.stroke();
  return ctx.createPattern(c, "repeat")!;
}

/** Temblor de una puntada: ±7% y las filas impares un poco más oscuras. */
export const temblor = (y: number) => (0.92 + Math.random() * 0.14) * (y & 1 ? 0.95 : 1);

/** Lado en px de dispositivo de una puntada de S px CSS. */
export const ladoPuntada = (S: number) => Math.max(2, Math.round(S * (window.devicePixelRatio || 1)));

/**
 * Teje una grilla de cols×rows puntadas en `cv`. `cell(x, y)` devuelve el color de cada puntada o null (vacío).
 * Ajusta el tamaño del canvas (atributos y estilo) y devuelve el mismo canvas.
 */
export function tejer(
  cv: HTMLCanvasElement,
  cols: number,
  rows: number,
  cell: (x: number, y: number) => RGB | null | undefined,
  S = PUNTADA,
): HTMLCanvasElement {
  const dpr = window.devicePixelRatio || 1, T = ladoPuntada(S);
  const small = document.createElement("canvas");
  small.width = cols;
  small.height = rows;
  const sctx = small.getContext("2d")!, img = sctx.createImageData(cols, rows), d = img.data;
  for (let y = 0, i = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++, i++) {
      const c = cell(x, y);
      if (!c) continue;
      const m = temblor(y), q = i * 4;
      d[q] = c[0] * m; d[q + 1] = c[1] * m; d[q + 2] = c[2] * m; d[q + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  cv.width = cols * T;
  cv.height = rows * T;
  cv.style.width = (cols * T) / dpr + "px";
  cv.style.height = (rows * T) / dpr + "px";
  const ctx = cv.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, cv.width, cv.height);
  // la tela sólo sobre lo tejido: lo vacío queda transparente
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = tela(ctx, T);
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.globalCompositeOperation = "source-over";
  return cv;
}

/** La micro de perfil, mirando a la derecha: o contorno, c carrocería, w ventana, r franja, k rueda, g llanta, h foco. */
export const MICRO = [
  "..ooooooooooooooooooooo..",
  ".occcccccccccccccccccccoo",
  ".ocwwwcwwwcwwwcwwwcwwwwco",
  ".ocwwwcwwwcwwwcwwwcwwwwco",
  ".occcccccccccccccccccccco",
  ".orrrrrrrrrrrrrrrrrrrrrro",
  ".occcccccccccccccccccccho",
  ".occcccccccccccccccccccco",
  "..oookkkooooooooookkkooo.",
  "....kgk..........kgk.....",
  "....kkk..........kkk.....",
] as const;

export const PINTURA_MICRO: Record<string, RGB> = { o: TINTA, c: HUESO, w: VIDRIO, r: NARANJO, k: TINTA, g: GRIS, h: SOL };

/** Celda de la micro; `girando` tapa las llantas (para alternar cuadros mientras anda). */
export const celdaMicro = (x: number, y: number, girando = false): RGB | null => {
  const ch = MICRO[y]?.[x];
  if (!ch || ch === ".") return null;
  return PINTURA_MICRO[girando && ch === "g" ? "k" : ch];
};

/** Clave de sessionStorage: el Home la deja al llevar la micro a un artículo, y el artículo la usa para la llegada. */
export const LLEGADA_KEY = "tejido:llegada";
