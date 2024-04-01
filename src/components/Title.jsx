function Title({ accent, texto }) {
  const parts = texto.split(new RegExp(`(${accent})`, "gi"));

  return (
    <p className="text-7xl font-Nohemi text-white">
      {parts.map((part, index) =>
        part.toLowerCase() === accent.toLowerCase() ? (
          <span
            key={index}
            className="bg-gradient-to-r from-title-gradient-100 to-title-gradient-200 text-transparent bg-clip-text font-bold"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </p>
  );
}

export default Title;
