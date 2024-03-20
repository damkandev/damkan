import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen  items-center justify-between mx-[40dvw]">
      <h1>Página en construcción... </h1>
      <Image src='/faces/sad_face.png' height={30} width={30} alt="Carita triste"></Image>
    </main>
  );
}
