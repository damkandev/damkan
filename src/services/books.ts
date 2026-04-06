import {
  estimateReadingTimeMinutes,
  extractMarkdownHeadings,
  summarizeMarkdown,
  type MarkdownHeading,
} from "../lib/markdown";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_LOCALE, type Locale, isLocale } from "../i18n/config";

export type Book = {
  id: string;
  locale: Locale;
  translationKey: string;
  title: string;
  author: string;
  slug: string;
  excerpt: string;
  content: string;
  publishedAt: string | null;
  readingTimeMinutes: number;
  headings: MarkdownHeading[];
  seoTitle: string;
  seoDescription: string;
  coverImage: string | null;
  isbn: string | null;
  pages: number | null;
};

type BookFrontmatter = {
  translationKey?: string;
  title?: string;
  author?: string;
  slug?: string;
  excerpt?: string;
  publishedAt?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  coverImage?: string | null;
  isbn?: string | null;
  pages?: number | null;
  draft?: boolean;
};

const BOOKS_DIRECTORY = path.join(process.cwd(), "books");

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const parseFrontmatterValue = (value: string): string | boolean | number | null => {
  const normalized = value.trim();

  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (normalized === "null") return null;

  const num = Number(normalized);
  if (!isNaN(num) && normalized !== "") return num;

  return normalized.replace(/^["']|["']$/g, "");
};

const parseMarkdownFile = (source: string) => {
  const normalizedSource = source.replace(/\r\n/g, "\n");

  if (!normalizedSource.startsWith("---\n")) {
    return { frontmatter: {} as BookFrontmatter, content: source.trim() };
  }

  const endIndex = normalizedSource.indexOf("\n---\n", 4);

  if (endIndex === -1) {
    return { frontmatter: {} as BookFrontmatter, content: source.trim() };
  }

  const rawFrontmatter = normalizedSource.slice(4, endIndex);
  const content = normalizedSource.slice(endIndex + 5).trim();
  const frontmatter: BookFrontmatter = {};

  for (const line of rawFrontmatter.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim() as keyof BookFrontmatter;
    const value = line.slice(separatorIndex + 1);
    frontmatter[key] = parseFrontmatterValue(value) as never;
  }

  return { frontmatter, content };
};

const isMarkdownFile = (fileName: string) => fileName.toLowerCase().endsWith(".md");

type BookFileDescriptor = {
  fileName: string;
  locale: Locale;
  relativePath: string;
};

const getBooksDirectory = async () => {
  try {
    return await readdir(BOOKS_DIRECTORY, { withFileTypes: true });
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException;
    if (maybeError.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const getBookFiles = async (): Promise<BookFileDescriptor[]> => {
  const entries = await getBooksDirectory();
  const bookFiles: BookFileDescriptor[] = [];

  for (const entry of entries) {
    if (entry.isFile() && isMarkdownFile(entry.name)) {
      bookFiles.push({
        fileName: entry.name,
        locale: DEFAULT_LOCALE,
        relativePath: entry.name,
      });
      continue;
    }

    if (!entry.isDirectory() || !isLocale(entry.name)) {
      continue;
    }

    const localeEntries = await readdir(path.join(BOOKS_DIRECTORY, entry.name), {
      withFileTypes: true,
    });

    for (const localeEntry of localeEntries) {
      if (!localeEntry.isFile() || !isMarkdownFile(localeEntry.name)) {
        continue;
      }

      bookFiles.push({
        fileName: localeEntry.name,
        locale: entry.name,
        relativePath: path.join(entry.name, localeEntry.name),
      });
    }
  }

  return bookFiles;
};

const toBook = async ({
  fileName,
  locale,
  relativePath,
}: BookFileDescriptor): Promise<Book | null> => {
  const filePath = path.join(BOOKS_DIRECTORY, relativePath);
  const fileContents = await readFile(filePath, "utf8");
  const { frontmatter, content } = parseMarkdownFile(fileContents);
  const fileSlug = fileName.replace(/\.md$/i, "");
  const slug = slugify(frontmatter.slug || fileSlug);
  const translationKey = slugify(frontmatter.translationKey || fileSlug);

  if (!slug || !translationKey) {
    return null;
  }

  if (frontmatter.draft) {
    return null;
  }

  const title = frontmatter.title?.trim() || fileSlug.replace(/-/g, " ");
  const author = frontmatter.author?.trim() || "";
  const excerpt = frontmatter.excerpt?.trim() || summarizeMarkdown(content, 180);
  const publishedAt =
    typeof frontmatter.publishedAt === "string" && frontmatter.publishedAt.trim()
      ? frontmatter.publishedAt.trim()
      : null;
  const seoTitle = frontmatter.seoTitle?.trim() || title;
  const seoDescription = frontmatter.seoDescription?.trim() || excerpt;
  const isbn =
    frontmatter.isbn != null && String(frontmatter.isbn).trim()
      ? String(frontmatter.isbn).trim()
      : null;
  const coverImage =
    typeof frontmatter.coverImage === "string" && frontmatter.coverImage.trim()
      ? frontmatter.coverImage.trim()
      : isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        : null;
  const pages =
    typeof frontmatter.pages === "number" && frontmatter.pages > 0 ? frontmatter.pages : null;

  return {
    id: `${locale}:${slug}`,
    locale,
    translationKey,
    title,
    author,
    slug,
    excerpt,
    content,
    publishedAt,
    readingTimeMinutes: estimateReadingTimeMinutes(content),
    headings: extractMarkdownHeadings(content),
    seoTitle,
    seoDescription,
    coverImage,
    isbn,
    pages,
  };
};

const sortBooks = (books: Book[], locale: Locale): Book[] =>
  books.sort((left, right) => {
    if (left.publishedAt && right.publishedAt) {
      return right.publishedAt.localeCompare(left.publishedAt);
    }

    if (left.publishedAt) return -1;
    if (right.publishedAt) return 1;

    return left.title.localeCompare(right.title, locale);
  });

export const listAllBooks = async (): Promise<Book[]> => {
  const bookFiles = await getBookFiles();
  const books = await Promise.all(bookFiles.map((file) => toBook(file)));

  return books.filter((book): book is Book => Boolean(book));
};

export const listBooks = async (locale: Locale): Promise<Book[]> => {
  const books = await listAllBooks();

  return sortBooks(
    books.filter((book) => book.locale === locale),
    locale,
  );
};

export const fetchBookBySlug = async (locale: Locale, slug: string): Promise<Book | null> => {
  const books = await listBooks(locale);
  return books.find((book) => book.slug === slug) ?? null;
};

export const findBookTranslations = async (
  translationKey: string,
): Promise<Partial<Record<Locale, Book>>> => {
  const books = await listAllBooks();

  return books.reduce<Partial<Record<Locale, Book>>>((translations, book) => {
    if (book.translationKey === translationKey) {
      translations[book.locale] = book;
    }

    return translations;
  }, {});
};
