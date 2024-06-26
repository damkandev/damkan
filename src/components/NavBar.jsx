"use client";
import Image from "next/image";
import Link from "next/link";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { useLenis } from "@studio-freight/react-lenis";

function NavBar() {
  return (
    <>
      <nav className="flex justify-between p-10">
        <Image src="/icons/logo.svg" height={20} width={20}></Image>
        <ul className="flex text-white">
          <li className="mx-2 opacity-70 hover:opacity-100">
            <Link href="#hero">{"About Me"}</Link>
          </li>
          <li className="mx-2 opacity-70 hover:opacity-100">
            <Link href="#work">{"Work"}</Link>
          </li>
          <li className="mx-2 opacity-70 hover:opacity-100">
            <Link href="#projects">{"Projects"}</Link>
          </li>
          <li className="mx-2 opacity-70 hover:opacity-100">
            <Link href="/posts" target="_blank">
              {"Blog"}
            </Link>
          </li>
          <li className="mx-2 opacity-70 hover:opacity-100">
            <Link href="#contact">{"Contact"}</Link>
          </li>
        </ul>
      </nav>
    </>
  );
}

export default NavBar;
