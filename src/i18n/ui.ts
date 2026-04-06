import type { Locale } from "./config";

type Messages = {
  article: {
    backToList: string;
    dateUnavailable: string;
    minRead: string;
    relatedDescription: string;
    relatedFallbackExcerpt: string;
    relatedTitle: string;
    tocLabel: string;
    tocTitle: string;
  };
  articles: {
    backHome: string;
    empty: string;
    fallbackExcerpt: string;
    readMore: string;
    seoDescription: string;
    seoTitle: string;
    title: string;
    untitledDate: string;
  };
  books: {
    backHome: string;
    backToList: string;
    empty: string;
    fallbackExcerpt: string;
    pages: string;
    readMore: string;
    seoDescription: string;
    seoTitle: string;
    title: string;
    untitledDate: string;
  };
  home: {
    articlesTitle: string;
    booksTitle: string;
    bio: string;
    empty: string;
    fallbackExcerpt: string;
    seeMore: string;
    seoDescription: string;
    seoTitle: string;
    socialTitle: string;
  };
  languageSwitcher: {
    label: string;
  };
  themeToggle: {
    label: string;
  };
};

export const messages: Record<Locale, Messages> = {
  es: {
    article: {
      backToList: "Volver al listado",
      dateUnavailable: "Sin fecha",
      minRead: "min de lectura",
      relatedDescription: "Una selección de lecturas recientes para seguir explorando.",
      relatedFallbackExcerpt: "Sin descripción",
      relatedTitle: "Artículos relacionados",
      tocLabel: "Índice del artículo",
      tocTitle: "Índice",
    },
    articles: {
      backHome: "Volver al inicio",
      empty: "Todavía no hay artículos para este idioma. Añade archivos .md en articles/es/ o articles/en/ según corresponda.",
      fallbackExcerpt: "Sin descripción",
      readMore: "leer artículo completo",
      seoDescription: "Ideas, notas y aprendizajes de Damián Panes.",
      seoTitle: "Artículos | Damián Panes",
      title: "Ideas, notas y aprendizajes",
      untitledDate: "Sin fecha",
    },
    books: {
      backHome: "Volver al inicio",
      backToList: "Volver a libros",
      empty: "Todavía no hay libros cargados.",
      fallbackExcerpt: "Sin descripción",
      pages: "págs.",
      readMore: "leer reseña",
      seoDescription: "Libros que leo: resúmenes y reseñas de Damián Panes.",
      seoTitle: "Libros | Damián Panes",
      title: "Libros que leo",
      untitledDate: "Sin fecha",
    },
    home: {
      articlesTitle: "Artículos",
      booksTitle: "Libros",
      bio: "Me gusta el helado de pasas al ron, tengo 5 veces repetidas el mismo par de zapatillas pero aparte de eso me gusta mucho programar y crear empresas, principalmente solucionar problemas.",
      empty: "Aún no hay artículos cargados para este idioma.",
      fallbackExcerpt: "Sin descripción breve.",
      seeMore: "ver más",
      seoDescription: "Sitio personal de Damián Panes con artículos y notas.",
      seoTitle: "Damián Panes",
      socialTitle: "Redes Sociales",
    },
    languageSwitcher: {
      label: "Idioma",
    },
    themeToggle: {
      label: "Cambiar tema",
    },
  },
  en: {
    article: {
      backToList: "Back to articles",
      dateUnavailable: "No date",
      minRead: "min read",
      relatedDescription: "A small set of recent reads to keep exploring.",
      relatedFallbackExcerpt: "No short description.",
      relatedTitle: "Related articles",
      tocLabel: "Article outline",
      tocTitle: "Outline",
    },
    articles: {
      backHome: "Back to home",
      empty: "There are no articles for this language yet. Add .md files to articles/es/ or articles/en/ as needed.",
      fallbackExcerpt: "No short description.",
      readMore: "read full article",
      seoDescription: "Ideas, notes, and lessons from Damián Panes.",
      seoTitle: "Articles | Damián Panes",
      title: "Ideas, notes, and lessons",
      untitledDate: "No date",
    },
    books: {
      backHome: "Back to home",
      backToList: "Back to books",
      empty: "No books loaded yet.",
      fallbackExcerpt: "No short description.",
      pages: "pages",
      readMore: "read review",
      seoDescription: "Books I read: summaries and reviews by Damián Panes.",
      seoTitle: "Books | Damián Panes",
      title: "Books I read",
      untitledDate: "No date",
    },
    home: {
      articlesTitle: "Articles",
      booksTitle: "Books",
      bio: "I like rum raisin ice cream, I own the same pair of sneakers five times over, and beyond that I mostly like building software, companies, and solving problems.",
      empty: "There are no articles for this language yet.",
      fallbackExcerpt: "No short description.",
      seeMore: "see more",
      seoDescription: "Personal site of Damián Panes with articles and notes.",
      seoTitle: "Damián Panes",
      socialTitle: "Socials",
    },
    languageSwitcher: {
      label: "Language",
    },
    themeToggle: {
      label: "Toggle theme",
    },
  },
};

export const getMessages = (locale: Locale): Messages => messages[locale];
