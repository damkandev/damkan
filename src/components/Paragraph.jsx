function Paragraph({ text, width }) {
  return (
    <p className={`text-white/60 text-lg mb-7 font-Kumbh ${width}`}>{text}</p>
  );
}

export default Paragraph;
