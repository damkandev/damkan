import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import MusicPlayer from "@/components/MusicPlayer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "dapan.es",
    template: "%s | dapan.es",
  },
  description: "me gustan las crocs y las pasas al ron, tengo 20 duh.",
  keywords: ["portfolio", "startups", "rodar", "kerokero", "damian", "dapan"],
  authors: [{ name: "Damian" }],
  creator: "Damian",
  metadataBase: new URL("https://dapan.es"),
  openGraph: {
    title: "dapan.es",
    description: "me gustan las crocs y las pasas al ron, tengo 20 duh.",
    url: "https://dapan.es",
    siteName: "dapan.es",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "dapan.es logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "dapan.es",
    description: "me gustan las crocs y las pasas al ron, tengo 20 duh.",
    images: ["/icon.png"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${jetbrainsMono.variable} antialiased notranslate`}
      >
        <div className="crt-overlay fixed inset-0" />
        <div className="fixed top-4 left-4 right-4 z-100 block lg:hidden">
          <div
            className="bg-black/80 border border-[#CFFF33] p-3 text-[#CFFF33] font-mono text-xs"
            style={{ textShadow: "0 0 5px #CFFF33" }}
          >
            <span className="animate-pulse">▸</span> para una mejor experiencia, visualízalo desde tu computadora.
          </div>
        </div>
        {children}
        <MusicPlayer />
      </body>
    </html>
  );
}
