const ARTICLES_INDEX_PATH = "/articles";

export const getLegacyBlogIndexRedirect = (): string => ARTICLES_INDEX_PATH;

export const getLegacyBlogSlugRedirect = (slug?: string): string => {
  if (!slug) {
    return ARTICLES_INDEX_PATH;
  }

  return `${ARTICLES_INDEX_PATH}/${slug}`;
};
