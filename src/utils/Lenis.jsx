"use client";
import Lenis from "@studio-freight/lenis";
import { useEffect, useRef } from "react";

const SmoothScroll = ({ children }) => {
  const ref = useRef(null);

  useEffect(() => {
    let lenis;
    if (ref.current) {
      lenis = new Lenis({
        lerp: 0.1,
        // Otras opciones de configuración...
      });

      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };

      requestAnimationFrame(raf);
    }

    return () => {
      if (lenis) {
        lenis.destroy();
      }
    };
  }, []);

  return <div ref={ref}>{children}</div>;
};

export default SmoothScroll;
