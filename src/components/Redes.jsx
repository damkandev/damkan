import Image from "next/image";
import Link from "next/link";
export default function Redes() {
  return (
    <div className="flex">
      <Link href="https://www.instagram.com/damian.panes" target="_blank">
        <Image
          src="/icons/instagram.png"
          alt="Icono de Instagram"
          className="mr-2 w-8"
          height={120}
          width={120}
        />
      </Link>
      <Link href="https://github.com/damkandev" target="_blank">
        <Image
          src="/icons/github.png"
          alt="Icono de Github"
          className="mr-2 w-8"
          height={120}
          width={120}
        />
      </Link>
      <Link href="https://granmenu.me" target="_blank">
        <Image
          src="/icons/granmenu.png"
          alt="Icono de Gran Menú"
          className="mr-2 w-8"
          height={120}
          width={120}
        />
      </Link>
      <Link href="https://www.linkedin.com/in/damkanlat/" target="_blank">
        <Image
          src="/icons/linkedin.png"
          alt="Icono de Linkedin"
          className="mr-2 w-8"
          height={120}
          width={120}
        />
      </Link>
    </div>
  );
}
