import "./globals.css";
import "@fontsource/google-sans-code";
import { SmoothCursor } from "@/components/ui/smooth-cursor"

export const metadata = {
  title: "Damián Panes",
  description: "Me gusta la parte de producto de las empresas, no me gusta usar traje solo crocs.",
  icons: {
    icon: '/favicon.svg',
  },
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
