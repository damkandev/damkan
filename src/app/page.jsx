import Ventana from "@/components/Ventana";
import Toast from "@/components/Toast";
import CardVentana from "@/components/CardVentana";
export default function Home() {
  return (
    <main className="p-8 flex flex-col items-center">
      <Ventana />
      <Toast />
      <div className="grid md:grid-cols-2 gap-4 md:gap-2 md:w-[50rem]">
        <CardVentana>
          <p className="text-verde font-JetBrains-Bold text-2xl mb-2">
            README.MD
          </p>
          <p className="text-white font-JetBrains-Regular mb-4">
            Actualmente ya no programo tanto, solo por hobbie.
          </p>
          <p className="text-white font-JetBrains-Regular">
            Actualmente soy CEO y fundador de Gran Menú a tiempo completo.
          </p>
        </CardVentana>
        <CardVentana>
          <p className=" text-celeste font-JetBrains-Bold text-2xl mb-2">EXP</p>
          <ul className="text-white font-JetBrains-Regular">
            <li>
              2022 - 2024 = <span className="text-verde">Gran Menú</span>
            </li>
            <li>
              2023 - 2024 = <span className="text-amarillo">MTSClub</span>
            </li>
            <li>
              2022 - 2023 = <span className="text-verde">Froglabs</span>
            </li>
            <li>
              2021 - 2022 = <span className="text-celeste">Ukader</span>
            </li>
            <li>
              2019 - 2021 = <span className="text-morado">NMO</span>
            </li>
          </ul>
        </CardVentana>
      </div>
    </main>
  );
}
