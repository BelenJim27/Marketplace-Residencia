"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Slide {
  id: number;
  imagen: string;
  circulos: { imagen: string; etiqueta?: string }[];
}

const SLIDES: Slide[] = [
  {
    id: 1,
    imagen: "/fotos/28.1.png",
    circulos: [
      { imagen: "/fotos/5.jpg" },
      { imagen: "/fotos/20.jpeg", etiqueta: "Maestro mezcalero" },
      { imagen: "/fotos/22.jpeg" },
    ],
  },
  {
    id: 2,
    imagen: "/fotos/29.1.png",
    circulos: [
      { imagen: "/fotos/15.jpg" },
      { imagen: "/fotos/24.jpeg" },
      { imagen: "/fotos/22.jpeg" },
    ],
  },
  {
    id: 3,
    imagen: "/fotos/30.1.png",
    circulos: [
      { imagen: "/fotos/16.jpg" },
      { imagen: "/fotos/22.jpeg" },
      { imagen: "/fotos/20.jpeg" },
    ],
  },
  {
    id: 4,
    imagen: "/fotos/31.1.png",
    circulos: [
      { imagen: "/fotos/22.jpeg" },
      { imagen: "/fotos/20.jpeg" },
      { imagen: "/fotos/15.jpg" },
    ],
  },
];

const INTERVAL = 5000;

export default function ConoceMas() {
  const [actual, setActual] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const slide = SLIDES[actual];

  const startProgress = () => {
    if (progressRef.current) {
      progressRef.current.style.transition = "none";
      progressRef.current.style.width = "0%";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (progressRef.current) {
            progressRef.current.style.transition = `width ${INTERVAL}ms linear`;
            progressRef.current.style.width = "100%";
          }
        });
      });
    }
  };

  const handleGo = (idx: number) => {
    const next = (idx + SLIDES.length) % SLIDES.length;
    setVisible(false);
    setTimeout(() => {
      setActual(next);
      setVisible(true);
    }, 300);
    if (timerRef.current) clearInterval(timerRef.current);
    startProgress();
    timerRef.current = setInterval(() => {
      handleGo(next + 1);
    }, INTERVAL);
  };

  useEffect(() => {
    startProgress();
    timerRef.current = setInterval(() => {
      setActual((prev) => {
        const next = (prev + 1) % SLIDES.length;
        setVisible(false);
        setTimeout(() => setVisible(true), 300);
        return next;
      });
      startProgress();
    }, INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <section
      className="w-full py-20 px-6"
      style={{ background: "rgba(60, 28, 8, 0.50)" }}
    >
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-center text-4xl mb-12"
          style={{ fontFamily: "Georgia, serif", color: "#e8c060", fontStyle: "italic" }}
        >
          Conoce más de nuestros productos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative rounded-3xl overflow-hidden h-80 md:h-96 shadow-lg group"
            style={{ boxShadow: "0 8px 40px rgba(200,100,20,0.25)" }}>
            <img
              src={slide.imagen}
              alt={`Slide ${actual + 1}`}
              className="w-full h-full object-contain"
              style={{
                opacity: visible ? 1 : 0,
                transition: "opacity 0.3s ease",
                background: "rgba(92, 48, 24, 0.4)",
              }}
            />

            <button
              onClick={() => handleGo(actual - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
              style={{ background: "rgba(50,22,5,0.85)", border: "1.5px solid #c8a97a", color: "#e8c060" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              onClick={() => handleGo(actual + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
              style={{ background: "rgba(50,22,5,0.85)", border: "1.5px solid #c8a97a", color: "#e8c060" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>

            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "rgba(200,169,122,0.2)" }}>
              <div ref={progressRef} style={{ height: "100%", background: "#c8a97a", width: "0%" }} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-6 flex-wrap">
              {slide.circulos.map((item, i) => (
                <div
                  key={`${actual}-${i}`}
                  className="flex flex-col items-center gap-2"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateY(0)" : "translateY(8px)",
                    transition: `opacity 0.35s ease ${i * 0.07}s, transform 0.35s ease ${i * 0.07}s`,
                  }}
                >
                  <div className="w-36 h-36 rounded-full overflow-hidden flex-shrink-0"
                    style={{ border: "3px solid rgba(200,169,122,0.5)", boxShadow: "0 4px 20px rgba(200,100,20,0.3)" }}>
                    <img src={item.imagen} alt={item.etiqueta || `Imagen ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                  {item.etiqueta && (
                    <p className="text-sm italic text-center" style={{ fontFamily: "Georgia, serif", color: "#d4b080" }}>
                      {item.etiqueta}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex gap-2 items-center">
                {SLIDES.map((_: Slide, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleGo(i)}
                    className="h-2 rounded-full border-none"
                    style={{
                      width: i === actual ? "24px" : "8px",
                      background: i === actual ? "#e8a030" : "rgba(200,169,122,0.35)",
                      transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </div>

              <button
                className="px-8 py-3 rounded-full font-semibold transition-all hover:opacity-90"
                style={{
                  background: "rgba(139,105,20,0.9)",
                  color: "#f5e8c0",
                  fontFamily: "Georgia, serif",
                  border: "1px solid #c8a97a",
                  boxShadow: "0 4px 20px rgba(200,100,20,0.3)",
                }}
                onClick={() => router.push("/productos")}
              >
                Ver más
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}