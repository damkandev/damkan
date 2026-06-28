import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import {
  estimateReadingTimeMinutes,
  extractMarkdownHeadings,
  summarizeMarkdown,
  type MarkdownHeading,
} from "../lib/markdown";
import { DEFAULT_LOCALE, type Locale, isLocale } from "../i18n/config";
import {
  createHeadingId,
  defineArticle,
  slugifyArticleValue,
  type ArticleDefinition,
  type ArticleSourceKind,
} from "./articleDefinition";

export type Article = {
  id: string;
  locale: Locale;
  translationKey: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string | null;
  updatedAt: string | null;
  readingTimeMinutes: number;
  headings: MarkdownHeading[];
  seoTitle: string;
  seoDescription: string;
  ogImage: string | null;
  sourceKind: ArticleSourceKind;
  markdownContent: string | null;
  bodyComponent: AstroComponentFactory | null;
  wordCount: number;
};

type ArticleFrontmatter = {
  translationKey?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string | null;
  draft?: boolean;
};

type MarkdownArticleFileDescriptor = {
  fileName: string;
  locale: Locale;
  relativePath: string;
};

type AstroArticleModule = {
  article?: ArticleDefinition;
  default: AstroComponentFactory;
};

const ARTICLES_DIRECTORY = path.join(process.cwd(), "src/content/articles");
const ASTRO_ARTICLES_GLOB = import.meta.glob<AstroArticleModule>("../content/articles/**/*.astro");
const ASTRO_ARTICLE_SOURCE_GLOB = import.meta.glob<string>("../content/articles/**/*.astro", {
  query: "?raw",
  import: "default",
});

let articleCache: Promise<Article[]> | null = null;

const parseFrontmatterValue = (value: string): string | boolean | null => {
  const normalized = value.trim();

  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (normalized === "null") return null;

  return normalized.replace(/^["']|["']$/g, "");
};

const parseMarkdownFile = (source: string) => {
  const normalizedSource = source.replace(/\r\n/g, "\n");

  if (!normalizedSource.startsWith("---\n")) {
    return { frontmatter: {} as ArticleFrontmatter, content: source.trim() };
  }

  const endIndex = normalizedSource.indexOf("\n---\n", 4);

  if (endIndex === -1) {
    return { frontmatter: {} as ArticleFrontmatter, content: source.trim() };
  }

  const rawFrontmatter = normalizedSource.slice(4, endIndex);
  const content = normalizedSource.slice(endIndex + 5).trim();
  const frontmatter: ArticleFrontmatter = {};

  for (const line of rawFrontmatter.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim() as keyof ArticleFrontmatter;
    const value = line.slice(separatorIndex + 1);
    frontmatter[key] = parseFrontmatterValue(value) as never;
  }

  return { frontmatter, content };
};

const isMarkdownFile = (fileName: string) => fileName.toLowerCase().endsWith(".md");

const stripAstroFrontmatter = (source: string) => {
  const normalizedSource = source.replace(/\r\n/g, "\n");

  if (!normalizedSource.startsWith("---\n")) {
    return normalizedSource;
  }

  const endIndex = normalizedSource.indexOf("\n---\n", 4);
  return endIndex === -1 ? normalizedSource : normalizedSource.slice(endIndex + 5);
};

const stripInlineMarkup = (source: string) =>
  source
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const extractAstroText = (source: string) =>
  stripInlineMarkup(stripAstroFrontmatter(source).replace(/```[\s\S]*?```/g, " "));

const extractAstroHeadings = (source: string): MarkdownHeading[] => {
  const normalized = stripAstroFrontmatter(source);
  const headings: MarkdownHeading[] = [];
  const componentHeadingPattern =
    /<ArticleHeading\b([^>]*)>([\s\S]*?)<\/ArticleHeading>|<ArticleHeading\b([^>]*)\/>/g;
  const nativeHeadingPattern = /<h([1-3])\b([^>]*)>([\s\S]*?)<\/h\1>/g;
  const extractAttribute = (attributes: string, name: string) => {
    const attributeMatch = attributes.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`));
    return attributeMatch?.[1]?.trim();
  };

  for (const match of normalized.matchAll(componentHeadingPattern)) {
    const attributes = match[1] ?? match[3] ?? "";
    const content = match[2] ?? "";

    const explicitLevel = extractAttribute(attributes, "as");
    const textFromAttribute = extractAttribute(attributes, "text");
    const text = textFromAttribute || stripInlineMarkup(content);
    const level = Number(explicitLevel?.replace("h", "") || 2);

    if (!text || ![1, 2, 3].includes(level)) {
      continue;
    }

    const depth = level as MarkdownHeading["depth"];
    const id = extractAttribute(attributes, "id") || createHeadingId(text);

    headings.push({ depth, id, text });
  }

  for (const match of normalized.matchAll(nativeHeadingPattern)) {
    const level = Number(match[1]);
    const attributes = match[2] ?? "";
    const content = match[3] ?? "";
    const text = stripInlineMarkup(content);
    const explicitId = extractAttribute(attributes, "id");

    if (!text || !explicitId || ![1, 2, 3].includes(level)) {
      continue;
    }

    headings.push({
      depth: level as MarkdownHeading["depth"],
      id: explicitId,
      text,
    });
  }

  return headings;
};

const buildArticle = ({
  locale,
  sourceKind,
  fileSlug,
  frontmatter,
  titleFallback,
  excerptFallbackSource,
  headings,
  markdownContent,
  bodyComponent,
  wordCount,
}: {
  locale: Locale;
  sourceKind: ArticleSourceKind;
  fileSlug: string;
  frontmatter: ArticleFrontmatter | ArticleDefinition;
  titleFallback: string;
  excerptFallbackSource: string;
  headings: MarkdownHeading[];
  markdownContent: string | null;
  bodyComponent: AstroComponentFactory | null;
  wordCount: number;
}): Article | null => {
  const slug = slugifyArticleValue(frontmatter.slug || fileSlug);
  const translationKey = slugifyArticleValue(frontmatter.translationKey || fileSlug);

  if (!slug || !translationKey) {
    return null;
  }

  if (frontmatter.draft) {
    return null;
  }

  const title = frontmatter.title?.trim() || titleFallback;
  const excerpt = frontmatter.excerpt?.trim() || summarizeMarkdown(excerptFallbackSource, 180);
  const publishedAt =
    typeof frontmatter.publishedAt === "string" && frontmatter.publishedAt.trim()
      ? frontmatter.publishedAt.trim()
      : null;
  const updatedAt =
    typeof frontmatter.updatedAt === "string" && frontmatter.updatedAt.trim()
      ? frontmatter.updatedAt.trim()
      : null;
  const seoTitle = frontmatter.seoTitle?.trim() || title;
  const seoDescription = frontmatter.seoDescription?.trim() || excerpt;
  const ogImage =
    typeof frontmatter.ogImage === "string" && frontmatter.ogImage.trim()
      ? frontmatter.ogImage.trim()
      : null;

  return {
    id: `${locale}:${slug}`,
    locale,
    translationKey,
    title,
    slug,
    excerpt,
    publishedAt,
    updatedAt,
    readingTimeMinutes: estimateReadingTimeMinutes(excerptFallbackSource),
    headings,
    seoTitle,
    seoDescription,
    ogImage,
    sourceKind,
    markdownContent,
    bodyComponent,
    wordCount,
  };
};

const readArticlesDirectory = async () => {
  try {
    return await readdir(ARTICLES_DIRECTORY, { withFileTypes: true });
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException;
    if (maybeError.code === "ENOENT") {
      return [];
    }

    throw error;
  }
};

const getMarkdownArticleFiles = async (): Promise<MarkdownArticleFileDescriptor[]> => {
  const entries = await readArticlesDirectory();
  const articleFiles: MarkdownArticleFileDescriptor[] = [];

  for (const entry of entries) {
    if (entry.isFile() && isMarkdownFile(entry.name)) {
      articleFiles.push({
        fileName: entry.name,
        locale: DEFAULT_LOCALE,
        relativePath: entry.name,
      });
      continue;
    }

    if (!entry.isDirectory() || !isLocale(entry.name)) {
      continue;
    }

    const localeEntries = await readdir(path.join(ARTICLES_DIRECTORY, entry.name), {
      withFileTypes: true,
    });

    for (const localeEntry of localeEntries) {
      if (!localeEntry.isFile() || !isMarkdownFile(localeEntry.name)) {
        continue;
      }

      articleFiles.push({
        fileName: localeEntry.name,
        locale: entry.name,
        relativePath: path.join(entry.name, localeEntry.name),
      });
    }
  }

  return articleFiles;
};

const toMarkdownArticle = async ({
  fileName,
  locale,
  relativePath,
}: MarkdownArticleFileDescriptor): Promise<Article | null> => {
  const filePath = path.join(ARTICLES_DIRECTORY, relativePath);
  const fileContents = await readFile(filePath, "utf8");
  const { frontmatter, content } = parseMarkdownFile(fileContents);
  const fileSlug = fileName.replace(/\.md$/i, "");

  return buildArticle({
    locale,
    sourceKind: "markdown",
    fileSlug,
    frontmatter,
    titleFallback: fileSlug.replace(/-/g, " "),
    excerptFallbackSource: content,
    headings: extractMarkdownHeadings(content),
    markdownContent: content,
    bodyComponent: null,
    wordCount: content.split(/\s+/).filter(Boolean).length,
  });
};

const getAstroArticleContext = (modulePath: string) => {
  const segments = modulePath.split("/");
  const fileName = segments.at(-1) ?? "";
  const localeSegment = fileName.replace(/\.astro$/i, "");
  const translationKeySegment = segments.at(-2) ?? "";

  if (!isLocale(localeSegment) || !translationKeySegment) {
    return null;
  }

  return {
    locale: localeSegment,
    translationKey: translationKeySegment,
  };
};

const toAstroArticle = async ([modulePath, loadModule]: [
  string,
  () => Promise<AstroArticleModule>,
]): Promise<Article | null> => {
  const context = getAstroArticleContext(modulePath);

  if (!context) {
    return null;
  }

  const loadSource = ASTRO_ARTICLE_SOURCE_GLOB[modulePath];

  if (!loadSource) {
    return null;
  }

  const [module, source] = await Promise.all([loadModule(), loadSource()]);
  const frontmatter = defineArticle({
    translationKey: context.translationKey,
    ...(module.article ?? {}),
  });
  const plainText = extractAstroText(source);
  const fileSlug = frontmatter.slug || context.translationKey;

  return buildArticle({
    locale: context.locale,
    sourceKind: "astro",
    fileSlug,
    frontmatter,
    titleFallback: context.translationKey.replace(/-/g, " "),
    excerptFallbackSource: plainText,
    headings: extractAstroHeadings(source),
    markdownContent: null,
    bodyComponent: module.default,
    wordCount: plainText.split(/\s+/).filter(Boolean).length,
  });
};

const sortArticles = (articles: Article[], locale: Locale): Article[] =>
  articles.sort((left, right) => {
    if (left.publishedAt && right.publishedAt) {
      return right.publishedAt.localeCompare(left.publishedAt);
    }

    if (left.publishedAt) return -1;
    if (right.publishedAt) return 1;

    return left.title.localeCompare(right.title, locale);
  });

const loadArticles = async (): Promise<Article[]> => {
  const markdownFiles = await getMarkdownArticleFiles();
  const [markdownArticles, astroArticles] = await Promise.all([
    Promise.all(markdownFiles.map((file) => toMarkdownArticle(file))),
    Promise.all(Object.entries(ASTRO_ARTICLES_GLOB).map((entry) => toAstroArticle(entry))),
  ]);

  return [...markdownArticles, ...astroArticles].filter(
    (article): article is Article => Boolean(article),
  );
};

export const listAllArticles = async (): Promise<Article[]> => {
  articleCache ??= loadArticles();
  return articleCache;
};

export const listArticles = async (locale: Locale): Promise<Article[]> => {
  const articles = await listAllArticles();

  return sortArticles(
    articles.filter((article) => article.locale === locale),
    locale,
  );
};

export const fetchArticleBySlug = async (
  locale: Locale,
  slug: string,
): Promise<Article | null> => {
  const articles = await listArticles(locale);
  return articles.find((article) => article.slug === slug) ?? null;
};

export const findArticleTranslations = async (
  translationKey: string,
): Promise<Partial<Record<Locale, Article>>> => {
  const articles = await listAllArticles();

  return articles.reduce<Partial<Record<Locale, Article>>>((translations, article) => {
    if (article.translationKey === translationKey) {
      translations[article.locale] = article;
    }

    return translations;
  }, {});
};

export const listLegacyArticleSlugRoutes = async (): Promise<
  Array<{
    slug: string;
    routesByLocale: Partial<Record<Locale, string>>;
  }>
> => {
  const articles = await listAllArticles();
  const routesBySlug = new Map<string, Partial<Record<Locale, string>>>();

  for (const article of articles) {
    const routes = routesBySlug.get(article.slug) ?? {};
    routes[article.locale] = `/${article.locale}/articles/${article.slug}/`;
    routesBySlug.set(article.slug, routes);
  }

  return Array.from(routesBySlug.entries()).map(([slug, routesByLocale]) => ({
    slug,
    routesByLocale,
  }));
};
