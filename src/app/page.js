'use client'
import Image from "next/image";
import { ReactTyped } from "react-typed";

export default function Home() {
  return (
    <main className="flex items-center justify-center h-screen">
      <p className="flex"><ReactTyped loop strings={["Página en construcción...", "Website under construction..."]} typeSpeed={40}/> <Image src='/faces/sad_face.png' className="ml-4" height={30} width={30} alt="Carita triste"></Image></p>
    </main>
  );
}
