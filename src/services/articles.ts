import {
  estimateReadingTimeMinutes,
  extractMarkdownHeadings,
  summarizeMarkdown,
  type MarkdownHeading,
} from "../lib/markdown";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  publishedAt: string | null;
  readingTimeMinutes: number;
  headings: MarkdownHeading[];
  seoTitle: string;
  seoDescription: string;
  ogImage: string | null;
};

type ArticleFrontmatter = {
  title?: string;
  slug?: string;
  excerpt?: string;
  publishedAt?: string | null;
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

const toArticle = async (fileName: string): Promise<Article | null> => {
  const filePath = path.join(ARTICLES_DIRECTORY, fileName);
  const fileContents = await readFile(filePath, "utf8");
  const { frontmatter, content } = parseMarkdownFile(fileContents);
  const fileSlug = fileName.replace(/\.md$/i, "");
  const slug = slugify(frontmatter.slug || fileSlug);

  if (!slug) {
    return null;
  }

  const title = frontmatter.title?.trim() || fileSlug.replace(/-/g, " ");
  const excerpt = frontmatter.excerpt?.trim() || summarizeMarkdown(content, 180);
  const publishedAt =
    typeof frontmatter.publishedAt === "string" && frontmatter.publishedAt.trim()
      ? frontmatter.publishedAt.trim()
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
    id: slug,
    title,
    slug,
    excerpt,
    content,
    publishedAt,
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

export const listArticles = async (): Promise<Article[]> => {
  const entries = await readArticlesDirectory();
  const articles = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && isMarkdownFile(entry.name))
      .map((entry) => toArticle(entry.name)),
  );

  return articles
    .filter((article): article is Article => Boolean(article))
    .sort((left, right) => {
      if (left.publishedAt && right.publishedAt) {
        return right.publishedAt.localeCompare(left.publishedAt);
      }

      if (left.publishedAt) return -1;
      if (right.publishedAt) return 1;

      return left.title.localeCompare(right.title, "es");
    });
};

export const fetchArticleBySlug = async (slug: string): Promise<Article | null> => {
  const articles = await listArticles();
  return articles.find((article) => article.slug === slug) ?? null;
};
