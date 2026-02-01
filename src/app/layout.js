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
  title: "dapan.es",
  description: "Portfolio personal estilo terminal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <div className="crt-overlay fixed inset-0" />
        <div className="fixed top-4 left-4 right-4 z-[100] block lg:hidden">
          <div
            className="bg-black/80 border border-[#CFFF33] p-3 text-[#CFFF33] font-mono text-xs"
            style={{ textShadow: "0 0 5px #CFFF33" }}
          >
            <span className="animate-pulse">▸</span> para una mejor experiencia, visualízalo desde tu celular
          </div>
        </div>
        {children}
        <MusicPlayer />
      </body>
    </html>
  );
}
