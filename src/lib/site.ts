export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];

export const isLocale = (value: string | undefined): value is Locale =>
  locales.includes(value as Locale);

export const copy = {
  es: {
    title: "Damián Panes | Programador y fundador",
    description: "Sitio personal de Damián Panes, programador y fundador chileno. Artículos sobre startups, software, mercados tradicionales, libros e ideas.",
    bio: "Me gusta el helado de pasas al ron, tengo cinco veces repetido el mismo par de zapatillas, pero aparte de eso me gusta mucho programar y crear empresas, principalmente solucionar problemas.",
    testimonials: "Testimonios de quienes han entrado a esta página o leído mi LinkedIn.",
    articlesIntro: "Naturalmente me aburro mucho y desinstalé todas mis redes sociales, así que en las micros o cuando no puedo dormir escribo artículos para mi blog.",
    socials: "Por si algún día revivo en redes sociales y subo algo interesante y no te lo quieres perder, puedes seguirme en cualquiera de ellas... Pero si te tengo que recomendar algo, mejor desinstálalas.",
    readMore: "Leer más >>",
    back: "<< Volver al inicio",
    light: "CLARO",
    dark: "OSCURO",
  },
  en: {
    title: "Damián Panes | Programmer and founder",
    description: "The personal site of Damián Panes, a Chilean programmer and founder. Articles about startups, software, traditional markets, books, and ideas.",
    bio: "I like rum raisin ice cream, I own the same pair of sneakers five times over, and beyond that I mostly like programming, building companies, and solving problems.",
    testimonials: "Testimonials from people who visited this page or read my LinkedIn.",
    articlesIntro: "I get bored easily and deleted all my social media, so I write blog posts on the bus or whenever I can't sleep.",
    socials: "If I ever come back to social media and post something interesting you don't want to miss, you can follow me on any of these... Though if I had to recommend something, delete them instead.",
    readMore: "Read more >>",
    back: "<< Back home",
    light: "LIGHT",
    dark: "DARK",
  },
} as const;

export const homePath = (locale: Locale) => `/${locale}/`;
export const articlePath = (locale: Locale, slug: string) => `/${locale}/articles/${slug}/`;
