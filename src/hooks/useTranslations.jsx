"ise"
import Cookies from "js-cookie";
import translations from "@/utils/translations";

const useTranslations = () => {
  const locale = Cookies.get("locale") || "en"; // Asegura un valor predeterminado para 'locale'
  const t = (key) => {
    // Verifica si el objeto de traducciones para el 'locale' actual existe y contiene la clave buscada
    if (translations[locale] && key in translations[locale]) {
      return translations[locale][key];
    }
    // Retorna la clave si no se encuentra la traducción
    return key;
  };
  
  return { t };
};

export default useTranslations;
