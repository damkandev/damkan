"use client";
import React, { useState } from "react";
import Countdown from "@/components/countdown";
import Image from "next/image";
import normalizeString from "@/utils/normalizeString";

const nameList = [
  "damian panes",
  "matias neira",
  "benjamin ulloa",
  "felipe figueroa",
  "nicolas troncoso",
  "diego mardones",
  "mauricio alarcon",
  "martin ramirez",
  "jean suazo",
  "samu",
  "eso tilin",
  "tilin panes",
  "bill gates",
  "elon musk",
  "jeff bezos",
  "mark zuckerberg",
  "cristobal orellana",
]; // Lista de nombres en minúsculas y sin tildes

function Page() {
  const [inputValue, setInputValue] = useState("");
  const [showGif, setShowGif] = useState(false);
  const [gifType, setGifType] = useState(""); // 'success' or 'fail'

  const handleButtonClick = () => {
    const normalizedInput = normalizeString(inputValue);
    if (nameList.includes(normalizedInput)) {
      setGifType("success");
    } else {
      setGifType("fail");
    }
    setShowGif(true);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center bg-white h-screen text-center font-ComicNeue py-96">
        <p className="mt-24 text-2xl md:text-4xl md:mb-4">
          ¿Estás en la lista?
        </p>
        <h1 className="text-7xl mb-8">de mi Cumpleaños</h1>
        <Image
          src="/faces/damianimagen_cartoon.png"
          alt="Imagen de Damián como una caricatura antigua"
          className="mb-12"
          width={180}
          height={180}
        />
        <Countdown targetDate="2024-09-16T00:00:00" />
        <div className="my-6">
          <input
            type="text"
            className="py-4 border border-1 rounded-md mr-4 px-4"
            placeholder="Nombre Apellido"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button
            onClick={handleButtonClick}
            className="py-4 px-8 rounded-lg bg-black text-white"
          >
            Buscar
          </button>
        </div>
        {showGif && (
          <div className="mt-8">
            {gifType === "success" ? (
              <div>
                <Image
                  src="/gifs/dancecat.gif"
                  alt="Success"
                  className="rounded-lg "
                  width={200}
                  height={200}
                />
                <p className="mb-24">¡Si estas invitado!</p>
              </div>
            ) : (
              <div>
                <Image
                  src="/gifs/sadcat.gif"
                  alt="Success"
                  className="rounded-lg "
                  width={200}
                  height={200}
                />
                <p className="mb-24">No estas invitado... :(</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default Page;
