import Link from "next/link";
import DecryptedText from '@/components/DecryptedText';
import { Highlighter } from "@/components/ui/highlighter"
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
      <div className="font-google-sans-code w-full max-w-2xl border border-foreground p-4 md:p-8">
        <div className="my-4 font-bold text-xl md:text-2xl">
          <DecryptedText text="Damian Panes" animateOn="both" revealDirection="start" speed={50} />
        </div>
        <p className="my-4">Me gusta el helado de pasas al ron, tengo 5 veces repetidas el mismo par de zapatillas pero aparte de eso me gusta mucho programar y crear empresas, principalmente solucionar problemas.</p>
        <p className="my-4">Problemas que encuentro mientras viajo en micro (transporte publico) me gusta observar el mundo, por que asi pienso afuera de mi comodidad.</p>
        <p className="my-4">Llevo emprendiendo <Highlighter action="highlight" color="#E6BE3C">desde que tengo 14 años</Highlighter>, pero al inicio empece programando hacks para jueguitos, me divertía era genial romper algunas cosas y obtener ventaja injusta, pero luego descubrí que era mas entretenido solucionar problemas para muchas personas.</p>
        <p className="my-4">Si te interesa mi historia puedes dar <Link href="/blog/historia"><Highlighter action="underline" color="#E6BE3C">click acá</Highlighter></Link> y si quieres hablar conmigo abajo estan mis redes sociales.</p>
      </div>
      <div className="flex gap-2">
        <Link href="/blog" className="font-google-sans-code hover:underline decoration-[#E6BE3C] decoration-2 underline-offset-4">[Blog]</Link>
        <Link href="https://linkedin.com/in/damianpanes" className="font-google-sans-code hover:underline decoration-[#E6BE3C] decoration-2 underline-offset-4">[Linkedin]</Link>
        <Link href="https://github.com/damkandev" className="font-google-sans-code hover:underline decoration-[#E6BE3C] decoration-2 underline-offset-4">[Github]</Link>
      </div>
    </div>
  );
}
