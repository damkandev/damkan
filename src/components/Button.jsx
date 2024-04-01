import Link from "next/link";

function Button({ rounded, type, href, text, target }) {
  const bgClass =
    type === "white"
      ? "bg-white text-black hover:bg-white/75 transition-colors"
      : "bg-black/75 text-white border-white/25 border hover:text-white/75 transition-colors";

  const widthClass = !rounded ? "w-full" : "";
  const roundedClass = rounded ? "rounded-full" : "rounded-lg";

  return (
    <Link
      href={href}
      className={`${bgClass} ${roundedClass} ${widthClass} font-Kumbh py-4 px-8 mr-4 inline-block text-center`}
      target={target}
    >
      {text}
    </Link>
  );
}

export default Button;
