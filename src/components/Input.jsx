function Input({ placeholder, type }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className="p-4 bg-black/65 font-Kumbh rounded-lg text-white/75 border-white/35 border"
    />
  );
}

export default Input;
