const normalizeString = (input) => {
  return input
    .trim() // Elimina los espacios al inicio y al final
    .normalize("NFD") // Normaliza la cadena para separar los caracteres y sus tildes
    .replace(/[\u0300-\u036f]/g, "") // Elimina las tildes
    .toLowerCase(); // Convierte todo a minúsculas
};

export default normalizeString;
