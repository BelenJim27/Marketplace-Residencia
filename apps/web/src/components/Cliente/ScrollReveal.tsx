// components/Cliente/ScrollReveal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/context/LocaleContext";
interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // Tiempo de espera antes de iniciar (ms)
  speed?: number; // Duración de la transición (ms)
}

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  speed = 700, // Valor por defecto: 0.7 segundos
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Al entrar en el 15% del viewport, se activa la visibilidad
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { 
        threshold: 0.15 
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.disconnect();
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        // Estado inicial (oculto) y final (visible)
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(48px)",
        
        // Aplicamos la velocidad (speed) y el retraso (delay) dinámicamente
        transition: `opacity ${speed}ms ease ${delay}ms, transform ${speed}ms ease ${delay}ms`,
        
        // Evita que el navegador parpadee al renderizar transformaciones
        willChange: "transform, opacity", 
      }}
    >
      {children}
    </div>
  );
}