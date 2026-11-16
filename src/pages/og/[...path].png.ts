// Imagen OG por página, generada en el build con la paleta tejido: /og/es.png (home) y /og/es/<slug>.png (artículos)
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { readFile } from "node:fs/promises";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { copy, locales } from "../../lib/site";

export const prerender = true;

export async function getStaticPaths() {
  const articles = await getCollection("articles");
  return [
    ...locales.map((l) => ({ params: { path: l }, props: { title: "Damián Panes", sub: copy[l].description } })),
    ...articles.map((a) => ({
      params: { path: `${a.data.locale}/${a.data.slug}` },
      props: { title: a.data.title, sub: a.data.excerpt },
    })),
  ];
}

const font = (p: string) => readFile(`${process.cwd()}/node_modules/${p}`);
const fonts = Promise.all([
  font("@fontsource/lora/files/lora-latin-600-normal.woff"),
  font("@fontsource/open-sans/files/open-sans-latin-400-normal.woff"),
]);

export const GET: APIRoute = async ({ props }) => {
  const [lora, sans] = await fonts;
  const el = (type: string, style: object, children: unknown) => ({ type, props: { style, children } });
  const svg = await satori(
    el("div", {
      width: 1200, height: 630, display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: "80px", background: "#1b1c22", color: "#efe6d2",
    }, [
      el("div", { display: "flex", flexDirection: "column", gap: "28px", width: 1040 }, [
        el("div", { fontFamily: "Lora", fontSize: props.title.length > 40 ? 64 : 80, lineHeight: 1.1 }, props.title),
        el("div", { fontFamily: "Open Sans", fontSize: 30, lineHeight: 1.45, color: "#b9b2a3" }, props.sub),
      ]),
      el("div", { position: "absolute", left: 80, bottom: 70, fontFamily: "Open Sans", fontSize: 26, color: "#8a8478" }, "dapan.es"),
    ]),
    {
      width: 1200, height: 630,
      fonts: [{ name: "Lora", data: lora, weight: 600 }, { name: "Open Sans", data: sans, weight: 400 }],
    },
  );
  return new Response(new Resvg(svg).render().asPng(), { headers: { "Content-Type": "image/png" } });
};
