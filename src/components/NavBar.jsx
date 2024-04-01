"use client";
import Image from "next/image";
import Link from "next/link";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";

function NavBar() {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    // Actualiza el estado basado en la cookie solo después del montaje del componente
    const cookieLang = Cookies.get("locale") || "en";
    setLanguage(cookieLang);

    // Esto se ejecutará solo una vez, cuando el componente se monte
  }, []);

  useEffect(() => {
    // Solo actualiza la cookie cuando el idioma cambie después del montaje inicial
    if (language) Cookies.set("locale", language, { expires: 365 });
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prevLanguage) => (prevLanguage === "en" ? "es" : "en"));
  };
  return (
    <>
      <nav className="flex justify-between p-10">
        <Image src="/icons/logo.svg" height={20} width={20}></Image>
        <ul className="flex text-white">
          <li className="mx-2 opacity-70 hover:opacity-100">
            <Link href="/" target="_blank">
              About Me
            </Link>
          </li>
          <li className="mx-2 opacity-70 hover:opacity-100">
            <Link href="/" target="_blank">
              Projects
            </Link>
          </li>
          <li className="mx-2 opacity-70 hover:opacity-100">
            <Link href="/" target="_blank">
              Blog
            </Link>
          </li>
          <li className="mx-2 opacity-70 hover:opacity-100">
            <Link href="/" target="_blank">
              Contact
            </Link>
          </li>
          <li className="mx-2 opacity-70 hover:opacity-100">
            <button onClick={toggleLanguage}>
              {language === "en" ? "Español" : "English"}
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

export default NavBar;
