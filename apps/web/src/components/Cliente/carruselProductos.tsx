"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "@/context/LocaleContext";

interface Producto {
  id: number;
  nombre: string;
  subtitulo: string;
  imagen: string;
  notas: { vista: string; nariz: string; boca: string };
  anotaciones: { texto: string; posicion: string }[];
}

const PRODUCTOS: Producto[] = [
  {
    id: 1,
    nombre: "Tobalá",
    subtitulo: "La expresión más pura de la naturaleza, custodiada por manos expertas que entienden el tiempo del agave.",
    imagen: "/fotos/28.1.png",
    notas: {
      vista: "Cristalino y brillante",
      nariz: "Herbal, notas de tierra y frutas dulces.",
      boca: "Cuerpo sedoso, ahumado sutil y final cítrico.",
    },
    anotaciones: [
      { texto: "Su transparencia total simboliza la honestidad y pureza del destilado, presentándolo sin filtros ni artificios.", posicion: "top-6 left-0" },
      { texto: "Una mujer naciendo del maguey personifica la unión sagrada entre mujer y tierra, guardianas de la sabiduría ancestral.", posicion: "top-6 right-0 text-right" },
      { texto: "Los tonos verdes y agaves en las esquinas representan el respeto al ciclo biológico y la biodiversidad oaxaqueña.", posicion: "bottom-6 left-0" },
    ],
  },
  {
    id: 2,
    nombre: "Espadín",
    subtitulo: "El alma del mezcal oaxaqueño, destilado con dedicación generación tras generación.",
    imagen: "/fotos/29.1.png",
    notas: {
      vista: "Dorado tenue con reflejos plateados",
      nariz: "Ahumado intenso, cítrico y mineral.",
      boca: "Robusto, especiado y largo retrogusto.",
    },
    anotaciones: [
      { texto: "El agave espadín es el más cultivado en Oaxaca, base de la cultura mezcalera.", posicion: "top-6 left-0" },
      { texto: "Cada piña tarda entre 7 y 10 años en madurar antes de ser cosechada.", posicion: "top-6 right-0 text-right" },
      { texto: "El tostado en horno cónico de tierra le otorga su carácter ahumado único.", posicion: "bottom-6 left-0" },
    ],
  },
  {
    id: 3,
    nombre: "Madrecuixe",
    subtitulo: "Un mezcal silvestre de carácter indomable, con la fiereza del agave en su estado más puro.",
    imagen: "/fotos/30.1.png",
    notas: {
      vista: "Transparente con destellos verdes",
      nariz: "Vegetal, herbal y notas de maguey fresco.",
      boca: "Seco, mineral y persistente con final floral.",
    },
    anotaciones: [
      { texto: "El madrecuixe silvestre tarda hasta 15 años en madurar en las montañas oaxaqueñas.", posicion: "top-6 left-0" },
      { texto: "Su cosecha es manual y selectiva, respetando la regeneración natural del agave.", posicion: "top-6 right-0 text-right" },
      { texto: "Producción limitada que refleja el compromiso con la sustentabilidad y la tradición.", posicion: "bottom-6 left-0" },
    ],
  },
];

const INTERVAL = 30000;

export default function CarruselProductos() {
  const [actual, setActual] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(true);
  const [sectionHover, setSectionHover] = useState<boolean>(false);
  const [imageHover, setImageHover] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // Extraemos la función de traducción
  const { t } = useLocale();

  const producto = PRODUCTOS[actual];

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
    setVisible(false);
    setImageHover(false);
    setTimeout(() => {
      setActual((idx + PRODUCTOS.length) % PRODUCTOS.length);
      setVisible(true);
    }, 250);
    if (timerRef.current) clearInterval(timerRef.current);
    startProgress();
    timerRef.current = setInterval(() => {
      handleGo(idx + 1);
    }, INTERVAL);
  };

  useEffect(() => {
    startProgress();
    timerRef.current = setInterval(() => {
      setActual((prev) => {
        const next = (prev + 1) % PRODUCTOS.length;
        setVisible(false);
        setTimeout(() => setVisible(true), 250);
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
      id="productos"
      className="w-full py-20 px-8 relative"
      style={{ background: "transparent" }}
      onMouseEnter={() => setSectionHover(true)}
      onMouseLeave={() => setSectionHover(false)}
    >
      {(["left", "right"] as const).map((dir) => (
        <button
          key={dir}
          onClick={() => handleGo(dir === "left" ? actual - 1 : actual + 1)}
          className="absolute top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 text-[#8b4513]"
          style={{
            ...(dir === "left" ? { left: "12px" } : { right: "12px" }),
            border: "1.5px solid #8b4513",
            background: "rgba(139,69,19,0.12)",
            opacity: sectionHover ? 1 : 0,
            backdropFilter: "blur(4px)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {dir === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 6 15 12 9 18" />}
          </svg>
        </button>
      ))}

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div
          className="relative h-[460px] flex items-center justify-center"
          onMouseEnter={() => setImageHover(true)}
          onMouseLeave={() => setImageHover(false)}
        >
          <div className="absolute w-72 h-72 rounded-full" style={{ background: "rgba(139, 69, 19, 0.08)" }} />

          {producto.anotaciones.map((a, i) => (
            <p
              key={i}
              className={`absolute ${a.posicion} text-xs leading-snug z-10 max-w-[150px] italic text-[#5c2a0a] dark:text-[#c8a97a] transition-colors duration-300`}
              style={{
                fontFamily: "Georgia, serif",
                opacity: imageHover && visible ? 1 : 0,
                transform: imageHover ? "translateY(0)" : "translateY(6px)",
                transition: `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`,
              }}
            >
              {t(a.texto)}
            </p>
          ))}

          <div
            className="relative z-20 w-56 h-56 rounded-full overflow-hidden cursor-pointer"
            style={{
              boxShadow: "0 8px 40px rgba(139,69,19,0.25)",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          >
            <img src={producto.imagen} alt={t(producto.nombre)} className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="space-y-5" style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}>
          <h2
            className="font-bold leading-none text-[#5c2a0a] dark:text-white transition-colors duration-300"
            style={{ fontFamily: "Georgia, serif", fontSize: "clamp(42px,6vw,64px)" }}
          >
            {t(producto.nombre)}
          </h2>

          <p
            className="text-lg leading-relaxed italic text-[#7a4020] dark:text-[#c8a97a] transition-colors duration-300"
            style={{
              fontFamily: "Georgia, serif",
              borderLeft: "2px solid #8b4513",
              paddingLeft: "14px",
            }}
          >
            &ldquo;{t(producto.subtitulo)}&rdquo;
          </p>

          <div className="pt-2 space-y-2">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-[#8b4513] dark:text-[#c8a97a] transition-colors duration-300">

              {t("Notas de cata")}
            </h3>
            {(
              [
                ["Vista", producto.notas.vista],
                ["Nariz", producto.notas.nariz],
                ["Boca", producto.notas.boca],
              ] as [string, string][]
            ).map(([key, val]) => (
              <p
                key={key}
                className="text-sm pb-2 text-[#5c3018] dark:text-white/80 transition-colors duration-300"
                style={{ borderBottom: "1px solid rgba(139,69,19,0.2)" }}
              >
                <span className="font-bold text-[#8b4513] dark:text-[#c8a97a] transition-colors duration-300">
                  {t(key)}:{" "}
                </span>
                {t(val)}
              </p>
            ))}
          </div>

          <div className="flex gap-2 items-center pt-2">
            {PRODUCTOS.map((_: Producto, i: number) => (
              <button
                key={i}
                onClick={() => handleGo(i)}
                className="h-2 rounded-full border-none"
                style={{
                  width: i === actual ? "24px" : "8px",
                  background: i === actual ? "#8b4513" : "rgba(139,69,19,0.3)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>

          <div className="h-px rounded-full overflow-hidden" style={{ background: "rgba(139,69,19,0.15)" }}>
            <div ref={progressRef} style={{ height: "100%", background: "#8b4513", width: "0%" }} />
          </div>
        </div>
      </div>
    </section>
  );
}