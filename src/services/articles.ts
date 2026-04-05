import {
  estimateReadingTimeMinutes,
  extractMarkdownHeadings,
  summarizeMarkdown,
  type MarkdownHeading,
} from "../lib/markdown";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_LOCALE, type Locale, isLocale } from "../i18n/config";

export type Article = {
  id: string;
  locale: Locale;
  translationKey: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  publishedAt: string | null;
  updatedAt: string | null;
  readingTimeMinutes: number;
  headings: MarkdownHeading[];
  seoTitle: string;
  seoDescription: string;
  ogImage: string | null;
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

const ARTICLES_DIRECTORY = path.join(process.cwd(), "articles");

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

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

type ArticleFileDescriptor = {
  fileName: string;
  locale: Locale;
  relativePath: string;
};

const getArticleFiles = async (): Promise<ArticleFileDescriptor[]> => {
  const entries = await readArticlesDirectory();
  const articleFiles: ArticleFileDescriptor[] = [];

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

const toArticle = async ({
  fileName,
  locale,
  relativePath,
}: ArticleFileDescriptor): Promise<Article | null> => {
  const filePath = path.join(ARTICLES_DIRECTORY, relativePath);
  const fileContents = await readFile(filePath, "utf8");
  const { frontmatter, content } = parseMarkdownFile(fileContents);
  const fileSlug = fileName.replace(/\.md$/i, "");
  const slug = slugify(frontmatter.slug || fileSlug);
  const translationKey = slugify(frontmatter.translationKey || fileSlug);

  if (!slug || !translationKey) {
    return null;
  }

  const title = frontmatter.title?.trim() || fileSlug.replace(/-/g, " ");
  const excerpt = frontmatter.excerpt?.trim() || summarizeMarkdown(content, 180);
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

  if (frontmatter.draft) {
    return null;
  }

  return {
    id: `${locale}:${slug}`,
    locale,
    translationKey,
    title,
    slug,
    excerpt,
    content,
    publishedAt,
    updatedAt,
    readingTimeMinutes: estimateReadingTimeMinutes(content),
    headings: extractMarkdownHeadings(content),
    seoTitle,
    seoDescription,
    ogImage,
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

const sortArticles = (articles: Article[], locale: Locale): Article[] =>
  articles.sort((left, right) => {
    if (left.publishedAt && right.publishedAt) {
      return right.publishedAt.localeCompare(left.publishedAt);
    }

    if (left.publishedAt) return -1;
    if (right.publishedAt) return 1;

    return left.title.localeCompare(right.title, locale);
  });

export const listAllArticles = async (): Promise<Article[]> => {
  const articleFiles = await getArticleFiles();
  const articles = await Promise.all(articleFiles.map((file) => toArticle(file)));

  return articles.filter((article): article is Article => Boolean(article));
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
