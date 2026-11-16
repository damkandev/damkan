// GEO: resumen del sitio para LLMs (llmstxt.org), con cada artículo en texto completo
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { articlePath, copy } from "../lib/site";

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL("https://dapan.es");
  const articles = (await getCollection("articles")).sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );
  const list = (locale: "es" | "en") =>
    articles
      .filter((a) => a.data.locale === locale)
      .map((a) => `- [${a.data.title}](${new URL(articlePath(locale, a.data.slug), base)}): ${a.data.excerpt}`)
      .join("\n");
  const full = articles
    .map((a) => `## ${a.data.title}\n\nURL: ${new URL(articlePath(a.data.locale, a.data.slug), base)}\nPublicado: ${a.data.publishedAt.toISOString().slice(0, 10)}\n\n${a.body?.trim()}`)
    .join("\n\n---\n\n");

  const body = `# Damián Panes

> ${copy.es.description}

${copy.es.bio}

Redes: [LinkedIn](https://www.linkedin.com/in/damianpanes/), [GitHub](https://github.com/damkandev), [Instagram](https://www.instagram.com/damian.panes/)

## Artículos (español)

${list("es")}

## Articles (English)

${list("en")}

# Texto completo

${full}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
