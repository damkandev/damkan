export const SUPPORTED_LOCALES = ["es", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

export const PREFERRED_LOCALE_STORAGE_KEY = "preferredLocale";

export const isLocale = (value: string | undefined): value is Locale =>
  Boolean(value && SUPPORTED_LOCALES.includes(value as Locale));

export const normalizeLocale = (value: string | undefined | null): Locale =>
  isLocale(value ?? undefined) ? value : DEFAULT_LOCALE;

export const getLocaleTag = (locale: Locale): string => {
  switch (locale) {
    case "en":
      return "en-US";
    case "es":
    default:
      return "es-CL";
  }
};

export const getOgLocale = (locale: Locale): string => {
  switch (locale) {
    case "en":
      return "en_US";
    case "es":
    default:
      return "es_CL";
  }
};
