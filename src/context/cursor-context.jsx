"use client";

import { createContext, useContext, useEffect, useState } from "react";

const CursorContext = createContext({
  isEnabled: true,
  toggleCursor: () => {},
});

export function CursorProvider({ children }) {
  // Inicializamos con true para evitar flickering en el first render, luego synchronizamos con localStorage
  const [isEnabled, setIsEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedValue = localStorage.getItem("smooth-cursor-enabled");
    if (storedValue !== null) {
      setIsEnabled(storedValue === "true");
    }
  }, []);

  const toggleCursor = () => {
    setIsEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("smooth-cursor-enabled", String(newValue));
      return newValue;
    });
  };

  return (
    <CursorContext.Provider value={{ isEnabled, toggleCursor }}>
      {children}
    </CursorContext.Provider>
  );
}

export const useCursor = () => useContext(CursorContext);
