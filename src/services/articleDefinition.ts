import GithubSlugger from "github-slugger";

export type ArticleSourceKind = "markdown" | "astro";

export type ArticleDefinition = {
  translationKey?: string;
  title: string;
  slug?: string;
  excerpt?: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string | null;
  draft?: boolean;
};

export const defineArticle = (article: ArticleDefinition): ArticleDefinition => article;

export const slugifyArticleValue = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const createHeadingId = (value: string) => {
  const slugger = new GithubSlugger();
  return slugger.slug(value);
};
