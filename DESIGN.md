# DESIGN.md — damkan (dapan.es)

## 1. Qué es esto

Sitio personal de Damián (dapan.es), construido con **Astro 6** en modo `output: 'static'`.
Sirve tres tipos de contenido, todo bilingüe (`es` / `en`):

- **Home** (`/[lang]/`)
- **Artículos** (`/[lang]/articles/`)
- **Libros recomendados** (`/[lang]/libros/`)

Más rutas legacy de redirección y un endpoint `llms.txt` para agentes/LLMs.

## 2. Stack

- **Astro 6** — SSG, `output: 'static'`, deploy en Vercel (`@vercel/analytics`)
- **Tailwind CSS 4** vía `@tailwindcss/vite`
- **Convex** — backend configurado (schema + funciones) pero **no integrado en el frontend todavía** (ver §6)
- **unified / remark / rehype** — pipeline de markdown a HTML
- **Lenis** — smooth scroll
- **Mermaid** — diagramas dentro de artículos
- **Playwright** — testing (instalado, sin specs visibles en `src`)

## 3. Internacionalización (i18n)

`src/i18n/config.ts`:
- Locales soportados: `es` (default), `en`
- Helpers: `isLocale`, `normalizeLocale`, `getLocaleTag`, `getOgLocale`

`src/i18n/routes.ts` centraliza la construcción de paths localizados:
- `getLocalizedHomePath`, `getLocalizedArticlesPath`, `getLocalizedArticlePath`,
  `getLocalizedBooksPath`, `getLocalizedBookPath`

Todas las páginas viven bajo `src/pages/[lang]/...` y usan `getStaticPaths` para generar
`es`/`en`. `PreferredLocaleRedirect.astro` + `LanguageSwitcher.astro` manejan la detección
y el cambio de idioma en cliente (localStorage con `PREFERRED_LOCALE_STORAGE_KEY`).

Rutas legacy (`/articles/[slug]`, `/blog/[slug]`, `/articles/index`) existen para
redirigir tráfico viejo hacia las rutas localizadas (`src/services/blogRedirects.ts`,
`listLegacyArticleSlugRoutes`).

## 4. Contenido: Artículos

Dos fuentes posibles para un mismo artículo, unificadas por `src/services/articles.ts`:

### 4.1 Markdown (`/articles` en la raíz del repo)

```
articles/<slug>.md            -> locale "es" (default)
articles/en/<slug>.md         -> locale "en"
```

Frontmatter soportado (parser custom, no usa Zod/content collections):
`translationKey`, `title`, `slug`, `excerpt`, `publishedAt`, `updatedAt`,
`seoTitle`, `seoDescription`, `ogImage`, `draft`.

### 4.2 Astro components (`src/content/articles/<translationKey>/{es,en}.astro`)

Cada archivo exporta:
- `article: ArticleDefinition` (definido con `defineArticle()` en `articleDefinition.ts`)
- `default` → el componente Astro con el cuerpo

El cuerpo usa `<ArticleHeading as="h2" id="..." text="...">` (componente propio) en vez
de `<h2>` planos, para que `articles.ts` pueda extraer el índice (`headings`) parseando
el código fuente con regex — **no hay renderizado real para extraer la TOC**, se hace
parsing de texto (`extractAstroHeadings`, `extractAstroText`).

### 4.3 Unificación (`src/services/articles.ts`)

- `translationKey` vincula la versión `es` y `en` del mismo artículo (`findArticleTranslations`)
- `slug` es el identificador de URL por idioma, se normaliza con `slugifyArticleValue`
- `id = "<locale>:<slug>"`
- Artículos con `draft: true` o sin `slug`/`translationKey` válidos se descartan
- Orden: por `publishedAt` desc, fallback alfabético por `title`
- Todo se cachea en memoria (`articleCache`, una sola carga por proceso)

**Diferencia clave entre fuentes**: markdown trae `markdownContent` (se renderiza a HTML
en la página vía `renderMarkdownToHtml`), Astro trae `bodyComponent` (se renderiza
directo como componente). `ArticleView.astro` decide cuál usar según `sourceKind`.

## 5. Contenido: Libros

`src/services/books.ts` replica el mismo patrón que artículos pero más simple:
solo markdown, en `/books` (raíz del repo), mismo esquema `<slug>.md` / `<locale>/<slug>.md`.
Campos extra: `author`, `isbn`, `pages`, `coverImage` (con fallback a
`covers.openlibrary.org` si hay ISBN pero no `coverImage`).

No tiene cache en memoria como `articles.ts` (se recalcula cada `listAllBooks()`).

## 6. Convex (estado actual)

Hay un schema (`convex/schema.ts`, tabla `posts`) y funciones (`convex/posts.ts`)
generados/configurados, pero **nada en `src/` importa `convex/react` ni usa
`ConvexClient`**. Es infraestructura preparada pero todavía no conectada al sitio —
el contenido real hoy sale 100% de archivos markdown/astro en disco.

Si se retoma esta integración, leer primero `convex/_generated/ai/guidelines.md`
(instrucción ya presente en `CLAUDE.md`).

## 7. Pipeline de Markdown (`src/lib/markdown.ts`)

`renderMarkdownToHtml`: `remark-parse` → `remark-breaks` → `remark-gfm` →
`remark-rehype` → `rehype-sanitize` (schema extendido con `figure`/`figcaption`) →
`rehype-mermaid` (estrategia `pre-mermaid`) → `rehype-highlight` → plugins propios:

- `rehypeCodeCopyButton`: envuelve bloques `<pre>` en `.code-block` con botón de copiar
- `rehypeSlug` + `extractMarkdownHeadings`: ids de headings para anclas/TOC
- `rehypeExternalLinks`: links externos (`http(s)://`) → `target="_blank" rel="noopener noreferrer"`
- `rehypeArticleImages`: párrafos que son solo una imagen → `<figure>` + `<figcaption>` (usa el `alt`)

`estimateReadingTimeMinutes` (220 wpm) y `summarizeMarkdown` (excerpt truncado con `…`)
se usan tanto para artículos como para libros.

## 8. Componentes clave

- `ArticleView.astro` — renderiza un artículo (markdown → HTML o componente Astro)
- `ArticleHead.astro` — meta tags / SEO / OG por artículo
- `ArticleHeading.astro` — heading con id estable, usado en artículos tipo Astro
- `ArticleTableOfContents.astro` — TOC generada desde `headings`
- `ArticleRelated.astro` — sugerencias de otros artículos
- `ArticleEnhancements.astro` — JS de cliente (copiar código, etc.)
- `LanguageSwitcher.astro` / `PreferredLocaleRedirect.astro` — manejo de idioma
- `ThemeToggle.astro` — dark/light mode
- `Lenis.astro` — smooth scroll
- `Favicons.astro`, `VercelAnalytics.astro` — infra/meta

## 9. Endpoints especiales

- `src/pages/llms.txt.ts` → genera `llms.txt` usando `src/services/llms.ts`
  (probablemente un índice de contenido para agentes/LLMs, en línea con `site: 'https://dapan.es'`)

## 10. Sistema visual / UI

No hay un design system formal (ni tokens en `tailwind.config`, ni componentes UI
reutilizables) — el estilo se logra repitiendo las mismas clases utilitarias de
Tailwind a mano en cada `.astro`. Para mantener coherencia visual, cualquier pantalla
o componente nuevo debe seguir estos patrones existentes:

### 10.1 Paleta de colores

No están definidos como tokens de Tailwind (`theme.colors`), son **hardcodeados como
hex/rgba directamente en las clases** (`bg-[#FFFCFC]`, `text-[#24221D]`, etc.). Reusar
siempre estos mismos valores, no inventar nuevos:

| Uso                      | Light                          | Dark                            |
|---------------------------|---------------------------------|------------------------------------|
| Fondo de página (`body`)  | `#FFFCFC`                       | `#1c1a16`                          |
| Texto principal           | `#24221D`                       | `#f0ede6`                          |
| Bordes sutiles             | `border-black/10`                | `border-white/10`                  |
| Bordes hover/activos       | `border-black/30`                | `border-white/30`                  |
| Texto secundario/meta      | `text-black/40` / `text-black/70`| `text-white/40` / `text-white/70` |

Para el **cuerpo de artículos** (markdown renderizado) hay un set separado de variables
CSS en `src/styles/global.css` (`--ab-*`: `--ab-text`, `--ab-link`, `--ab-strong`,
`--ab-blockquote-*`, `--ab-code-*`, `--ab-pre-*`, `--ab-mermaid-bg`, `--ab-border*`,
`--ab-th-*`, `--ab-toc-active`), redefinidas dentro de `.dark`. Esto existe porque el
HTML de markdown no puede llevar clases `dark:` de Tailwind directamente — cualquier
nuevo estilo para contenido de artículo va en estas variables, no como utilidades sueltas.

### 10.2 Dark mode

- Se activa agregando la clase `.dark` al `<html>`.
- Persistencia en `localStorage["theme"]` (`"dark" | "light"`), con fallback a
  `prefers-color-scheme`. El script inline en el `<head>` (ver `index.astro`) corre
  **antes** del paint para evitar flash de tema incorrecto — replicar ese mismo script
  en cualquier página nueva que renderice `<html>`/`<body>` propio.
- Tailwind está configurado con `@variant dark (&:where(.dark, .dark *))` en
  `global.css`, por eso `dark:` funciona vía clase y no vía `prefers-color-scheme` nativo.
- Toggle en `ThemeToggle.astro`: alterna `.dark`, sincroniza dos íconos SVG (luna/sol)
  mostrando uno con `.hidden`.

### 10.3 Tipografía

- Fuente única: **Lora** (serif), cargada como `@font-face` local
  (`/fonts/lora-latin.woff2`), pesos 400 y 600 — no agregar otras familias ni cargar
  Google Fonts por CDN.
- Escala usada consistentemente:
  - `text-4xl` / `sm:text-4xl md:text-5xl` → `<h1>` de página/artículo
  - `text-2xl` → `<h2>` de sección
  - `text-xl` → `<h3>` / subtítulos
  - `text-lg` / `sm:text-lg` → texto destacado (bio, excerpt)
  - `text-base` → cuerpo
  - `text-sm` → metadatos (fecha, tiempo de lectura, labels)
- `font-semibold` para títulos y links destacados; `font-medium` para títulos de card.
- `leading-relaxed` / `leading-tight` según el caso (cuerpo vs. headings grandes).

### 10.4 Layout y espaciado

- Contenedor principal: `mx-auto w-full max-w-3xl` (home) o `max-w-6xl` con grid
  `lg:grid-cols-[minmax(0,44rem)_16rem]` para páginas de artículo (contenido + TOC lateral).
- Padding de página: `p-8` (home) / `px-4 py-5 sm:px-6 sm:py-8 lg:px-8` (artículo).
- Espaciado entre secciones: `gap-4` / `space-y-4` (bloques grandes), `gap-5 sm:gap-6`
  (artículo), `gap-2` / `gap-3` (listas/cards).
- Sin `border-radius` en ningún lado — estética intencionalmente **cuadrada/minimalista**.
  No introducir `rounded-*` salvo que se decida cambiar el lenguaje visual global.
- Bordes de `2px` (`border-2`) para cards clickeables (artículos, portadas de libros);
  `border` (1px) para elementos chrome (toggle de tema, language switcher, separadores).

### 10.5 Elementos flotantes / chrome

- `ThemeToggle` y `LanguageSwitcher` son `fixed top-4 right-*` con
  `bg-[...]/80 backdrop-blur-sm`, `z-50`, mismo set de bordes que el resto. Cualquier
  control global nuevo (chrome de UI) debería seguir este mismo patrón: fixed,
  semitransparente con blur, paleta light/dark idéntica a estos dos componentes.
- Estado activo (ej. idioma actual en `LanguageSwitcher`) se marca invirtiendo
  fondo/texto: `bg-[#24221D] text-[#FFFCFC]` (y su inverso en dark).

### 10.6 Interacciones

- Transiciones genéricas con `transition` / `transition-colors`.
- Hover sobre bordes: de `/10` a `/30` de opacidad (no cambia el color base, solo opacidad).
- Hover sobre texto/links: opacidad reducida (`hover:text-black/30` /
  `hover:text-black/40`) o `hover:underline` para links inline dentro del cuerpo.
- `group` + `group-hover` no se usa actualmente más allá de la card de libro — si se
  agregan más cards con hover en hijos, seguir ese mismo patrón (`class="group"` en el
  link, hijos reaccionan con `group-hover:`).

## 11. Decisiones de diseño a tener en cuenta

- **No usa Astro Content Collections** para artículos/libros — son loaders custom
  (`import.meta.glob` + lectura de FS) por la necesidad de mezclar markdown y `.astro`
  bajo el mismo modelo `Article`/`Book` con traducción por `translationKey`.
- **Parsing de frontmatter manual** (no gray-matter/Zod) — simple line-by-line, soporta
  `string | boolean | number | null`.
- **TOC de artículos Astro vía regex sobre el source**, no vía render real — frágil si
  se cambia el formato de `<ArticleHeading>` o de los `<h1-3>` nativos; cualquier cambio
  ahí debe actualizar `extractAstroHeadings`.
- **Cache de artículos es de proceso** (`articleCache` a nivel módulo) — válido para
  build estático, pero si se pasa a SSR hay que revisar invalidación.
