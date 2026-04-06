import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "../i18n/config";
import { getMessages } from "../i18n/ui";
import {
  getLocalizedArticlePath,
  getLocalizedArticlesPath,
  getLocalizedHomePath,
} from "../i18n/routes";
import { listAllArticles, type Article } from "./articles";

type ArticleGroup = {
  translationKey: string;
  articlesByLocale: Partial<Record<Locale, Article>>;
};

const SITE_NAME = "Damián Panes";

const SOCIAL_LINKS = [
  { label: "LinkedIn", url: "https://www.linkedin.com/in/damianpanes/" },
  { label: "GitHub", url: "https://github.com/damkandev" },
  { label: "Instagram", url: "https://www.instagram.com/damian.panes/" },
  { label: "Goodreads", url: "https://www.goodreads.com/user/show/196006762-dami-n-panes" },
  { label: "YouTube", url: "https://www.youtube.com/@damianpanes" },
] as const;

const getBaseUrl = (site?: URL): URL => site ?? new URL("https://dapan.es");

const toAbsoluteUrl = (site: URL, path: string): string => new URL(path, site).href;

const getLocalizedBooksPath = (locale: Locale): string => `/${locale}/libros/`;

const compareArticles = (left: Article, right: Article): number => {
  if (left.publishedAt && right.publishedAt) {
    return right.publishedAt.localeCompare(left.publishedAt);
  }

  if (left.publishedAt) return -1;
  if (right.publishedAt) return 1;

  return left.title.localeCompare(right.title, DEFAULT_LOCALE);
};

const groupArticles = (articles: Article[]): ArticleGroup[] => {
  const groups = new Map<string, ArticleGroup>();

  for (const article of articles) {
    const existing = groups.get(article.translationKey) ?? {
      translationKey: article.translationKey,
      articlesByLocale: {},
    };

    existing.articlesByLocale[article.locale] = article;
    groups.set(article.translationKey, existing);
  }

  return Array.from(groups.values()).sort((left, right) => {
    const leftPrimary =
      left.articlesByLocale[DEFAULT_LOCALE] ?? Object.values(left.articlesByLocale)[0];
    const rightPrimary =
      right.articlesByLocale[DEFAULT_LOCALE] ?? Object.values(right.articlesByLocale)[0];

    if (!leftPrimary || !rightPrimary) return 0;

    return compareArticles(leftPrimary, rightPrimary);
  });
};

const formatArticleGroup = (group: ArticleGroup, site: URL): string[] => {
  const primaryArticle =
    group.articlesByLocale[DEFAULT_LOCALE] ?? Object.values(group.articlesByLocale)[0];

  if (!primaryArticle) {
    return [];
  }

  const links = SUPPORTED_LOCALES.flatMap((locale) => {
    const localizedArticle = group.articlesByLocale[locale];

    if (!localizedArticle) {
      return [];
    }

    return [`${locale}: ${toAbsoluteUrl(site, getLocalizedArticlePath(locale, localizedArticle.slug))}`];
  });

  return [
    `- ${primaryArticle.title}`,
    `  fecha: ${primaryArticle.publishedAt ?? "sin fecha"}`,
    `  resumen: ${primaryArticle.excerpt}`,
    `  idiomas: ${Object.keys(group.articlesByLocale).join(", ")}`,
    `  enlaces: ${links.join(" | ")}`,
  ];
};

export const generateLlmsTxt = async (site?: URL): Promise<string> => {
  const baseUrl = getBaseUrl(site);
  const es = getMessages("es");
  const en = getMessages("en");
  const allArticles = await listAllArticles();
  const groupedArticles = groupArticles(allArticles);
  const articleLines = groupedArticles.flatMap((group) => formatArticleGroup(group, baseUrl));

  return [
    `# ${SITE_NAME}`,
    "",
    "## Resumen del sitio",
    `${es.home.seoDescription} Publica artículos y notas personales en español e inglés, además de una sección de libros.`,
    "",
    "## Quién es",
    `${SITE_NAME} es una persona que construye software, crea empresas y escribe sobre tecnología, startups, mercados tradicionales, libros e ideas personales.`,
    `Bio ES: ${es.home.bio}`,
    `Bio EN: ${en.home.bio}`,
    "",
    "## Enlaces principales",
    `Inicio ES: ${toAbsoluteUrl(baseUrl, getLocalizedHomePath("es"))}`,
    `Inicio EN: ${toAbsoluteUrl(baseUrl, getLocalizedHomePath("en"))}`,
    `Artículos ES: ${toAbsoluteUrl(baseUrl, getLocalizedArticlesPath("es"))}`,
    `Artículos EN: ${toAbsoluteUrl(baseUrl, getLocalizedArticlesPath("en"))}`,
    `Libros ES: ${toAbsoluteUrl(baseUrl, getLocalizedBooksPath("es"))}`,
    `Libros EN: ${toAbsoluteUrl(baseUrl, getLocalizedBooksPath("en"))}`,
    "",
    "## Redes",
    ...SOCIAL_LINKS.map((link) => `- ${link.label}: ${link.url}`),
    "",
    "## Artículos publicados",
    `Total de artículos únicos: ${groupedArticles.length}`,
    "Este bloque se genera automáticamente leyendo los archivos Markdown en /articles durante el build del sitio.",
    ...(articleLines.length > 0 ? articleLines : ["No hay artículos publicados todavía."]),
    "",
    "## Nota para LLMs",
    "Si necesitas entender la voz o los temas del sitio, prioriza los artículos más recientes y usa sus enlaces localizados como fuente principal.",
    "",
  ].join("\n");
};
