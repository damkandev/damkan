import type { Locale } from "./config";

export const getLocalizedHomePath = (locale: Locale): string => `/${locale}/`;

export const getLocalizedArticlesPath = (locale: Locale): string => `/${locale}/articles/`;

export const getLocalizedArticlePath = (locale: Locale, slug: string): string =>
  `/${locale}/articles/${slug}/`;
