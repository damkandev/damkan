/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors:{
        "borde-gris":"#817F82",
        "rosa":"#FFC0CB",
        "naranja":"#FC9867",
        "amarillo":"#FFD866",
        "verde":"#A9DC76",
        "morado":"#AB9DF2",
        "celeste":"#78DCE8",
        "naranja-gradient-inicial":"#FC9867",
        "naranja-gradient-final":"#FB8966",
      },
      fontFamily:{
        "JetBrains-Bold":"JetBrains Bold",
        "JetBrains-Regular":"JetBrains Regular",
      }
    },
  },
  plugins: [],
};
