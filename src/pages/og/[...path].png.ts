// Imagen OG por página, generada en el build con el look del tablero: /og/es.png (home) y /og/es/<slug>.png (artículos).
// Todo va en 1 bit sobre una rejilla de celdas de 4 px, como la escena. Los fondos ya vienen tramados (src/assets/og-*.png, a 1 px por
// celda; se sacan con prototipo/tablero/og-fondos.mjs) y los títulos se dibujan a un cuarto de tamaño, se pasan a blanco o negro y se
// agrandan sin suavizar, igual que el título de una sección. El texto corrido va en Lora normal, como en el sitio.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { readFile } from "node:fs/promises";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { locales } from "../../lib/site";

export const prerender = true;

interface Props { title: string; sub?: string }

export async function getStaticPaths() {
  const articles = await getCollection("articles");
  return [
    // home: el tablero, con el nombre como la placa de la pieza tocada
    ...locales.map((l) => ({ params: { path: l }, props: { title: "Damián Panes" } })),
    // artículo: la reina tumbada con su reflejo y, al lado, el título y la bajada
    ...articles.map((a) => ({
      params: { path: `${a.data.locale}/${a.data.slug}` },
      props: { title: a.data.title, sub: a.data.excerpt },
    })),
  ];
}

const W = 1200, H = 632, CELL = 4, INK = "#f6f5f0", NIGHT = "#0c0c0e"; // 632 = 158 celdas; la imagen final se corta en 630
const file = (p: string) => readFile(`${process.cwd()}/${p}`);
const assets = Promise.all([
  ...[400, 600, 700].map((w) => file(`node_modules/@fontsource/lora/files/lora-latin-${w}-normal.woff`)),
  file("src/assets/og-tablero.png"),
  file("src/assets/og-reina.png"),
]);

type Layer = "celdas" | "liso";
const el = (type: string, style: object, children?: unknown) => ({ type, props: { style, children } });
// la página se arma dos veces con la misma caja: en cada pasada solo se ve el texto de esa capa y el otro ocupa su lugar sin verse
const page = ({ title, sub }: Props, layer: Layer) => {
  const on = (l: Layer) => (l === layer ? 1 : 0);
  // una placa centrada a lo ancho, como las de los nombres de las piezas
  const plate = (at: object, style: object, text: string) => el("div", { position: "absolute", left: 0, width: W, display: "flex", justifyContent: "center", ...at }, [el("div", style, text)]);
  return sub === undefined
    ? el("div", { width: W, height: H, display: "flex", fontFamily: "Lora", opacity: on("celdas") }, [
        plate({ top: 40 }, { fontSize: 64, fontWeight: 700, lineHeight: 1.3, padding: "0 24px", background: INK, color: NIGHT }, title),
        plate({ bottom: 28 }, { fontSize: 48, fontWeight: 700, lineHeight: 1.3, padding: "0 20px", background: NIGHT, color: INK }, "dapan.es"),
      ])
    : el("div", { width: W, height: H, display: "flex", fontFamily: "Lora", color: INK }, [
        el("div", { marginLeft: 540, width: 580, height: H, display: "flex", flexDirection: "column", justifyContent: "center" }, [
          el("div", { fontSize: title.length > 36 ? 56 : 64, fontWeight: 700, lineHeight: 1.15, opacity: on("celdas") }, title),
          el("div", { marginTop: 28, fontSize: 28, lineHeight: 1.45, opacity: on("liso") }, sub),
        ]),
        el("div", { position: "absolute", left: 540, bottom: 56, fontSize: 26, opacity: on("liso") }, "dapan.es"),
      ]);
};
// a blanco o negro, sin grises: primero a gris (así los tres canales deciden lo mismo y no quedan bordes de color),
// después cada canal salta al tono de la tinta o al de la noche, y la transparencia a todo o nada
const step = (c: number) => `${(parseInt(NIGHT.slice(c, c + 2), 16) / 255).toFixed(3)} ${(parseInt(INK.slice(c, c + 2), 16) / 255).toFixed(3)}`;
const BITS = `<filter id="bits" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer>`
  + `<feFuncR type="discrete" tableValues="${step(1)}"/><feFuncG type="discrete" tableValues="${step(3)}"/><feFuncB type="discrete" tableValues="${step(5)}"/>`
  + `<feFuncA type="discrete" tableValues="0 0 0 1 1 1 1"/></feComponentTransfer></filter>`;
const png = (buf: Buffer | Uint8Array) => `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;

export const GET: APIRoute = async ({ props }) => {
  const [lora400, lora600, lora700, tablero, reina] = await assets;
  const fonts = [[lora400, 400], [lora600, 600], [lora700, 700]].map(([data, weight]) => ({ name: "Lora", data, weight })) as Parameters<typeof satori>[1]["fonts"];
  const draw = (layer: Layer) => satori(page(props as Props, layer) as Parameters<typeof satori>[0], { width: W, height: H, fonts });
  // capa de celdas: se dibuja a una celda por píxel con el filtro puesto
  const celdas = new Resvg((await draw("celdas")).replace(/^<svg[^>]*>/, (open) => `${open}${BITS}<g filter="url(#bits)">`).replace(/<\/svg>\s*$/, "</g></svg>"), { fitTo: { mode: "width", value: W / CELL } }).render().asPng();
  const liso = `data:image/svg+xml;base64,${Buffer.from(await draw("liso")).toString("base64")}`;
  const crisp = (href: string) => `<image xlink:href="${href}" width="${W}" height="${H}" image-rendering="optimizeSpeed"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="630" viewBox="0 0 ${W} 630">`
    + `<rect width="${W}" height="630" fill="${NIGHT}"/>${crisp(png(props.sub === undefined ? tablero : reina))}${crisp(png(celdas))}`
    + `<image xlink:href="${liso}" width="${W}" height="${H}"/></svg>`;
  return new Response(new Resvg(svg).render().asPng(), { headers: { "Content-Type": "image/png" } });
};
