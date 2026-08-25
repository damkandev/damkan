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
    pptxToPdf: {
      pageTitle: "PPTX a PDF",
      metaDescription:
        "Convierte presentaciones PPTX a un PDF limpio con solo el texto: sin fondos ni imágenes, conservando la jerarquía de títulos. Todo ocurre en tu navegador.",
      intro:
        "Sube una presentación .pptx y recibe un PDF con únicamente su texto: sin fondos, sin imágenes y sin decoración, pero manteniendo la jerarquía de títulos, subtítulos y viñetas.",
      chooseLabel: "Presentación (.pptx)",
      convert: "CONVERTIR >>",
      privacy:
        "El archivo se procesa por completo en tu navegador y nunca sale de tu computador.",
      settings: {
        font: "Fuente",
        size: "Tamaño",
        alignment: "Alineación",
        fonts: {
          helvetica: "Helvetica",
          times: "Times",
          courier: "Courier",
        },
        sizes: {
          small: "Pequeño",
          medium: "Medio",
          large: "Grande",
        },
        alignments: {
          left: "Izquierda",
          center: "Centro",
          right: "Derecha",
          justify: "Justificado",
        },
      },
      messages: {
        selected: "Archivo cargado:",
        processing: "Convirtiendo…",
        done: "PDF listo:",
        download: "[ DESCARGAR PDF ]",
        notPptx: "Ese archivo no es un .pptx. Los .ppt antiguos no son compatibles.",
        tooBig: "La presentación supera el máximo de 50 MB.",
        format: "No pude leer la presentación. ¿Está dañada?",
        empty: "No encontré texto para convertir en esa presentación.",
        unexpected: "Algo falló al convertir. Intenta de nuevo.",
      },
    },
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
    pptxToPdf: {
      pageTitle: "PPTX to PDF",
      metaDescription:
        "Turn PPTX presentations into a clean, text-only PDF: no backgrounds or images, keeping the title hierarchy. Everything happens in your browser.",
      intro:
        "Upload a .pptx deck and get a PDF with only its text: no backgrounds, images, or decoration, but keeping the hierarchy of titles, subtitles, and bullets.",
      chooseLabel: "Presentation (.pptx)",
      convert: "CONVERT >>",
      privacy:
        "Your file is processed entirely in your browser and never leaves your computer.",
      settings: {
        font: "Font",
        size: "Size",
        alignment: "Alignment",
        fonts: {
          helvetica: "Helvetica",
          times: "Times",
          courier: "Courier",
        },
        sizes: {
          small: "Small",
          medium: "Medium",
          large: "Large",
        },
        alignments: {
          left: "Left",
          center: "Center",
          right: "Right",
          justify: "Justify",
        },
      },
      messages: {
        selected: "File loaded:",
        processing: "Converting…",
        done: "PDF ready:",
        download: "[ DOWNLOAD PDF ]",
        notPptx: "That file is not a .pptx. Legacy .ppt files are not supported.",
        tooBig: "The presentation exceeds the 50 MB limit.",
        format: "I couldn't read the presentation. Is it corrupted?",
        empty: "I found no text to convert in that presentation.",
        unexpected: "Something went wrong. Please try again.",
      },
    },
  },
} as const;

export const homePath = (locale: Locale) => `/${locale}/`;
export const articlePath = (locale: Locale, slug: string) => `/${locale}/articles/${slug}/`;
