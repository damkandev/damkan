import Image from "next/image";
import Redes from "./Redes";
export default function Ventana() {
  return (
    <div className="md:w-[50rem]">
      <div className="top border border-borde-gris p-2">
        <Image
          src="/images/icon-dark.png"
          alt="Icono de Damkan"
          className="w-4"
          height={120}
          width={120}
        />
      </div>
      <div>
        <div className="top border border-borde-gris p-4 mt-3">
          <h1 className="font-JetBrains-Bold text-verde text-[2.3rem]">
            Damián Panes
          </h1>
          <p className="font-JetBrains-Regular text-white my-2 mb-6">
            UI & UX Designer | FullStack Developer |{" "}
            <span className="text-amarillo">Entrepreneur</span>
          </p>
          <Redes />
        </div>
      </div>
    </div>
  );
}
