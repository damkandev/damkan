import type { Locale } from "./config";

export const getLocalizedHomePath = (locale: Locale): string => `/${locale}/`;

export const getLocalizedArticlesPath = (locale: Locale): string => `/${locale}/articles/`;

export const getLocalizedArticlePath = (locale: Locale, slug: string): string =>
  `/${locale}/articles/${slug}/`;

export const getLocalizedBooksPath = (locale: Locale): string => `/${locale}/libros/`;

export const getLocalizedBookPath = (locale: Locale, slug: string): string =>
  `/${locale}/libros/${slug}/`;
