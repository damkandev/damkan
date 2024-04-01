import Cookies from "js-cookie";
import translations from "@/utils/translations";
const useTranslations = () => {
  const locale = Cookies.get("locale");
  const t = (key) => translations[locale][key] || key;
  return { t };
};

export default useTranslations;
