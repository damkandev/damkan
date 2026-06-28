# Artículos híbridos

Los artículos markdown existentes siguen viviendo en `articles/`.

Para un artículo más elaborado en Astro, crea un archivo en:

- `src/content/articles/<translation-key>/<locale>.astro`

Ejemplo:

- `src/content/articles/mi-articulo/es.astro`
- `src/content/articles/mi-articulo/en.astro`

Cada archivo debe exportar `article` y renderizar solo el cuerpo izquierdo.
El layout, SEO, switcher de idioma, relacionados e índice lateral se inyectan solos.

```astro
---
import ArticleHeading from "../../../components/articles/ArticleHeading.astro";
import { defineArticle } from "../../../services/articleDefinition";

export const article = defineArticle({
  title: "Mi artículo",
  excerpt: "Resumen corto",
  publishedAt: "2026-04-05",
  seoTitle: "Mi artículo",
  seoDescription: "Resumen corto",
});
---

<ArticleHeading as="h2" text="Primera sección" />
<p>Contenido...</p>

<ArticleHeading as="h2" text="Otra sección" />
<p>Más contenido...</p>
```

Usa `ArticleHeading` para que el índice se genere automáticamente y los anchors coincidan.
