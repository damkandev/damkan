import "./globals.css";
import "@fontsource/google-sans-code/400.css";
import "@fontsource/google-sans-code/700.css";
import { SmoothCursor } from "@/components/ui/smooth-cursor"

export const metadata = {
  metadataBase: new URL('https://dapan.es'),
  title: {
    default: "Damián Panes",
    template: "%s | Damián Panes"
  },
  description: "Me gusta la parte de producto de las empresas, no me gusta usar traje solo crocs.",
  keywords: ["Damián Panes", "Producto", "Emprendimiento", "Programación", "Startups"],
  authors: [{ name: "Damián Panes", url: "https://dapan.es" }],
  creator: "Damián Panes",
  openGraph: {
    title: "Damián Panes",
    description: "Me gusta la parte de producto de las empresas, no me gusta usar traje solo crocs.",
    url: 'https://dapan.es',
    siteName: 'Damián Panes',
    locale: 'es_CL',
    type: 'website',

  },
  twitter: {
    card: 'summary_large_image',
    title: "Damián Panes",
    description: "Me gusta la parte de producto de las empresas, no me gusta usar traje solo crocs.",
    creator: "@damianPanes", // Assuming handle, can be updated
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className="antialiased cursor-none"
      >
        <SmoothCursor color="#574946" />
        {children}
      </body>
    </html>
  );
}
