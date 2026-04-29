"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/context/LocaleContext";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface Producto {
  id: number;
  nombre: string;
  subtitulo: string;
  imagen: string;
  notas: { vista: string; nariz: string; boca: string };
  anotaciones: { texto: string; posicion: string }[];
}

interface Slide {
  id: number;
  imagen: string;
  circulos: { imagen: string; etiqueta?: string }[];
}

// ─── DATOS ────────────────────────────────────────────────────────────────────

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
      { texto: "Su transparencia total simboliza la honestidad y pureza del destilado.", posicion: "top-6 left-0" },
      { texto: "Una mujer naciendo del maguey personifica la unión sagrada entre mujer y tierra.", posicion: "top-6 right-0 text-right" },
      { texto: "Los tonos verdes y agaves representan el respeto al ciclo biológico.", posicion: "bottom-6 left-0" },
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

const STATS = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1A5D3B" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    num: "1,248",
    label: "Productores registrados",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1A5D3B" strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    num: "156",
    label: "Comunidades participantes",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1A5D3B" strokeWidth="1.5">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    num: "8,732",
    label: "Productos trazables",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1A5D3B" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    num: "24",
    label: "Países alcanzados",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1A5D3B" strokeWidth="1.5">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    num: "$18.6 M",
    label: "Ingresos generados para comunidades",
  },
];

const SOBRE_TEXTOS = [
  "Descubre el auténtico sabor del mezcal, un destilado artesanal nacido del corazón del agave.",
  "Elaborado con procesos tradicionales que respetan la tierra y el tiempo, cada botella guarda carácter y tradición.",
  "Sus notas ahumadas y matices únicos lo convierten en una experiencia inigualable.",
  "Perfecto para celebrar, compartir y disfrutar momentos especiales.",
];

const PROD_INTERVAL = 30000;
const SLIDE_INTERVAL = 5000;

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function LandingPageOaxaca() {
  const { t } = useLocale();
  const router = useRouter();

  const [prodActual, setProdActual] = useState(0);
  const [prodVisible, setProdVisible] = useState(true);
  const [imageHover, setImageHover] = useState(false);
  const [sectionHover, setSectionHover] = useState(false);
  const prodProgressRef = useRef<HTMLDivElement | null>(null);
  const prodTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [slideActual, setSlideActual] = useState(0);
  const [slideVisible, setSlideVisible] = useState(true);
  const slideProgressRef = useRef<HTMLDivElement | null>(null);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement | null>(null);

  const producto = PRODUCTOS[prodActual];
  const slide = SLIDES[slideActual];

  const startProdProgress = () => {
    if (prodProgressRef.current) {
      prodProgressRef.current.style.transition = "none";
      prodProgressRef.current.style.width = "0%";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (prodProgressRef.current) {
            prodProgressRef.current.style.transition = `width ${PROD_INTERVAL}ms linear`;
            prodProgressRef.current.style.width = "100%";
          }
        });
      });
    }
  };

  const handleProdGo = (idx: number) => {
    setProdVisible(false);
    setImageHover(false);
    setTimeout(() => {
      setProdActual((idx + PRODUCTOS.length) % PRODUCTOS.length);
      setProdVisible(true);
    }, 250);
    if (prodTimerRef.current) clearInterval(prodTimerRef.current);
    startProdProgress();
    prodTimerRef.current = setInterval(() => handleProdGo(idx + 1), PROD_INTERVAL);
  };

  useEffect(() => {
    startProdProgress();
    prodTimerRef.current = setInterval(() => {
      setProdActual((prev) => {
        const next = (prev + 1) % PRODUCTOS.length;
        setProdVisible(false);
        setTimeout(() => setProdVisible(true), 250);
        return next;
      });
      startProdProgress();
    }, PROD_INTERVAL);
    return () => { if (prodTimerRef.current) clearInterval(prodTimerRef.current); };
  }, []);

  const startSlideProgress = () => {
    if (slideProgressRef.current) {
      slideProgressRef.current.style.transition = "none";
      slideProgressRef.current.style.width = "0%";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (slideProgressRef.current) {
            slideProgressRef.current.style.transition = `width ${SLIDE_INTERVAL}ms linear`;
            slideProgressRef.current.style.width = "100%";
          }
        });
      });
    }
  };

  const handleSlideGo = (idx: number) => {
    const next = (idx + SLIDES.length) % SLIDES.length;
    setSlideVisible(false);
    setTimeout(() => { setSlideActual(next); setSlideVisible(true); }, 300);
    if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    startSlideProgress();
    slideTimerRef.current = setInterval(() => handleSlideGo(next + 1), SLIDE_INTERVAL);
  };

  useEffect(() => {
    startSlideProgress();
    slideTimerRef.current = setInterval(() => {
      setSlideActual((prev) => {
        const next = (prev + 1) % SLIDES.length;
        setSlideVisible(false);
        setTimeout(() => setSlideVisible(true), 300);
        return next;
      });
      startSlideProgress();
    }, SLIDE_INTERVAL);
    return () => { if (slideTimerRef.current) clearInterval(slideTimerRef.current); };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.1 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <main
      className="text-[#1A241E] font-sans"
      style={{ background: "#F9F8F4", overflowY: "auto" }}
    >
      {/* ══════════════════════════════════════════════════
    SECCIÓN 1 — HERO VIDEO (100vh)
══════════════════════════════════════════════════ */}
      <div
        style={{
          position: "relative",
          height: "100vh",
          minHeight: "620px",
          overflow: "hidden",
        }}
      >
        <video
          src="/fotos/25.mp4"
          autoPlay muted loop playsInline
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(20,8,2,0.93) 38%, rgba(20,8,2,0.25) 100%)",
          }}
        />
        <div
          style={{
            position: "relative", zIndex: 10, color: "#fff",
            height: "100%", display: "flex", flexDirection: "column",
            justifyContent: "flex-end", padding: "48px 56px",
            maxWidth: "560px",
          }}
        >
          <span style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "#C8A97A", marginBottom: "14px" }}>
            {t("Trazabilidad · Origen · Identidad")}
          </span>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "40px", fontWeight: 700, lineHeight: 1.2, margin: "0 0 14px" }}>
            {t("Oaxaca auténtico,")}<br />{t("trazable y justo")}
          </h1>
          <p style={{ fontSize: "13px", lineHeight: 1.7, opacity: 0.75, maxWidth: "320px", margin: "0 0 20px" }}>
            {t("Conectamos el origen, la tradición y el talento de nuestras comunidades con el mundo.")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
            {[
              { icon: "✓", label: "Trazabilidad completa" },
              { icon: "⚖", label: "Comercio justo" },
              { icon: "🛡", label: "Protección cultural" },
            ].map((p) => (
              <div
                key={p.label}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  fontSize: "11px", borderRadius: "999px", padding: "5px 12px",
                  background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <span>{p.icon}</span><span>{t(p.label)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push("/Cliente/producto")}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              fontSize: "13px", fontWeight: 600, padding: "12px 22px",
              borderRadius: "8px", background: "#C8A97A", color: "#1A241E",
              border: "none", cursor: "pointer", width: "fit-content",
            }}
          >
            {t("Explorar productos")}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
      {/* ══════════════════════════════════════════════════
    SECCIÓN 2 — SOBRE EL MEZCAL
══════════════════════════════════════════════════ */}
      <div
        style={{
          background: "#fff",
          borderTop: "1px solid #E5E5E1",
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          minHeight: "320px",
        }}
      >
        {/* Texto */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px 48px",
            gap: "12px",
            borderRight: "1px solid #E5E5E1",
          }}
        >
          <div style={{ height: "2px", width: "32px", background: "#C8A97A", borderRadius: "2px" }} />
          <p style={{ fontFamily: "Georgia, serif", fontSize: "13px", fontStyle: "italic", lineHeight: 1.75, color: "#3c1c08", margin: 0 }}>
            {t("Descubre el auténtico sabor del mezcal, un destilado artesanal nacido del corazón del agave.")}
          </p>
          {SOBRE_TEXTOS.slice(1).map((texto, i) => (
            <p key={i} style={{ fontSize: "11px", lineHeight: 1.65, color: "#5C6B5E", margin: 0 }}>
              {t(texto)}
            </p>
          ))}
          <p style={{
            fontFamily: "Georgia, serif", fontSize: "11px", fontStyle: "italic",
            color: "#C8A97A", paddingTop: "12px",
            borderTop: "1px solid #E5E5E1", margin: 0,
          }}>
            &ldquo;El alma de Oaxaca en cada gota&rdquo;
          </p>
        </div>

        {/* Mosaico */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "6px",
            padding: "16px",
            alignItems: "stretch",
          }}
        >
          {/* Foto grande — 2 filas */}
          <div style={{
            gridColumn: "1/2", gridRow: "1/3",
            borderRadius: "10px", overflow: "hidden",
          }}>
            <img
              src="/fotos/22.jpeg" alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>

          {/* Fila 1 */}
          <div style={{ gridColumn: "2/3", gridRow: "1/2", borderRadius: "10px", overflow: "hidden", aspectRatio: "4/3" }}>
            <img src="/fotos/24.jpeg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <div style={{ gridColumn: "3/4", gridRow: "1/2", borderRadius: "10px", overflow: "hidden", aspectRatio: "4/3" }}>
            <img src="/fotos/16.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>

          {/* Fila 2 */}
          <div style={{ gridColumn: "2/3", gridRow: "2/3", borderRadius: "10px", overflow: "hidden", aspectRatio: "4/3" }}>
            <img src="/fotos/20.jpeg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <div style={{ gridColumn: "3/4", gridRow: "2/3", borderRadius: "10px", overflow: "hidden", aspectRatio: "4/3" }}>
            <img src="/fotos/15.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </div>
      </div>
      {/* ══════════════════════════════════════════════════
    SECCIÓN 3 — CARRUSEL PRODUCTOS
══════════════════════════════════════════════════ */}
      <div
        style={{
          background: "#F9F8F4",
          borderTop: "1px solid #E5E5E1",
          padding: "56px 80px",
          display: "flex",
          alignItems: "center",
          gap: "56px",
          position: "relative",
          minHeight: "280px",
        }}
        onMouseEnter={() => setSectionHover(true)}
        onMouseLeave={() => setSectionHover(false)}
      >
        {/* Flechas izq/der */}
        {(["left", "right"] as const).map((dir) => (
          <button
            key={dir}
            onClick={() => handleProdGo(dir === "left" ? prodActual - 1 : prodActual + 1)}
            style={{
              position: "absolute", top: "50%", transform: "translateY(-50%)",
              [dir]: "24px", zIndex: 20,
              width: "34px", height: "34px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(26,93,59,0.1)", border: "1px solid #1A5D3B",
              color: "#1A5D3B", cursor: "pointer",
              opacity: sectionHover ? 1 : 0, transition: "opacity 0.2s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {dir === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 6 15 12 9 18" />}
            </svg>
          </button>
        ))}

        {/* Imagen botella */}
        <div
          style={{
            position: "relative", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0, width: "200px",
          }}
          onMouseEnter={() => setImageHover(true)}
          onMouseLeave={() => setImageHover(false)}
        >
          <div style={{
            position: "absolute", width: "160px", height: "160px",
            borderRadius: "50%", background: "rgba(26,93,59,0.07)",
          }} />
          {producto.anotaciones.map((a, i) => (
            <p
              key={i}
              className={`absolute text-[9px] leading-snug italic max-w-[80px] ${a.posicion}`}
              style={{
                fontFamily: "Georgia, serif", color: "#5c2a0a",
                opacity: imageHover && prodVisible ? 1 : 0,
                transition: `opacity 0.35s ease ${i * 0.08}s`,
              }}
            >
              {t(a.texto)}
            </p>
          ))}
          <div
            style={{
              position: "relative", zIndex: 10,
              width: "140px", height: "140px", borderRadius: "50%", overflow: "hidden",
              boxShadow: "0 8px 32px rgba(139,69,19,0.2)",
              opacity: prodVisible ? 1 : 0, transition: "opacity 0.3s",
            }}
          >
            <img src={producto.imagen} alt={t(producto.nombre)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        {/* Info producto */}
        <div
          style={{
            display: "flex", flexDirection: "column", gap: "12px", flex: 1,
            opacity: prodVisible ? 1 : 0, transition: "opacity 0.3s",
          }}
        >
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "32px", fontWeight: 700, color: "#1A241E", margin: 0 }}>
            {t(producto.nombre)}
          </h2>
          <p
            style={{
              fontSize: "13px", fontStyle: "italic", lineHeight: 1.6,
              fontFamily: "Georgia, serif", color: "#5C6B5E",
              borderLeft: "2px solid #C8A97A", paddingLeft: "14px", margin: 0,
            }}
          >
            &ldquo;{t(producto.subtitulo)}&rdquo;
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#1A5D3B", margin: 0 }}>
              {t("Notas de cata")}
            </p>
            {(
              [
                ["Vista", producto.notas.vista],
                ["Nariz", producto.notas.nariz],
                ["Boca", producto.notas.boca],
              ] as [string, string][]
            ).map(([key, val]) => (
              <p key={key} style={{ fontSize: "13px", paddingBottom: "6px", borderBottom: "1px solid #E5E5E1", color: "#1A241E", margin: 0 }}>
                <span style={{ fontWeight: 700, color: "#C8A97A" }}>{t(key)}: </span>{t(val)}
              </p>
            ))}
          </div>
          {/* Dots + progress */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {PRODUCTOS.map((_, i) => (
              <button
                key={i}
                onClick={() => handleProdGo(i)}
                style={{
                  height: "6px", borderRadius: "999px", border: "none", cursor: "pointer",
                  width: i === prodActual ? "20px" : "6px",
                  background: i === prodActual ? "#1A5D3B" : "rgba(26,93,59,0.25)",
                  transition: "all 0.3s",
                }}
              />
            ))}

          </div>
          <div style={{ height: "2px", borderRadius: "999px", overflow: "hidden", background: "rgba(26,93,59,0.12)", maxWidth: "300px" }}>
            <div ref={prodProgressRef} style={{ height: "100%", background: "#1A5D3B", width: "0%" }} />
          </div>
        </div>
      </div>
      {/* ══════════════════════════════════════════════════
          BLOQUE 2 — CONOCE MÁS DE NUESTROS PRODUCTOS
      ══════════════════════════════════════════════════ */}
      <div
        style={{
          background: "#fff",
          borderTop: "1px solid #E5E5E1",
          marginTop: "10px",
          padding: "40px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#1A5D3B", marginBottom: "24px" }}>
          {t("Conoce más de nuestros productos")}
        </p>

        <div style={{ display: "flex", gap: "24px", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: "700px" }}>
          {/* Imagen principal con controles */}
          <div
            style={{
              position: "relative", borderRadius: "14px", overflow: "hidden", flexShrink: 0,
              width: "160px", height: "160px", boxShadow: "0 4px 20px rgba(200,100,20,0.2)",
            }}
          >
            <img
              src={slide.imagen}
              alt={`Slide ${slideActual + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: slideVisible ? 1 : 0, transition: "opacity 0.3s" }}
            />
            <button
              onClick={() => handleSlideGo(slideActual - 1)}
              style={{
                position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)",
                width: "24px", height: "24px", borderRadius: "50%", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(26,36,30,0.6)", color: "#fff",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              onClick={() => handleSlideGo(slideActual + 1)}
              style={{
                position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)",
                width: "24px", height: "24px", borderRadius: "50%", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(26,36,30,0.6)", color: "#fff",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 6 15 12 9 18" /></svg>
            </button>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "rgba(200,169,122,0.2)" }}>
              <div ref={slideProgressRef} style={{ height: "100%", background: "#C8A97A", width: "0%" }} />
            </div>
          </div>

          {/* Círculos centrados */}
          <div style={{ display: "flex", gap: "20px", justifyContent: "center", flex: 1 }}>
            {slide.circulos.map((item, i) => (
              <div
                key={`${slideActual}-${i}`}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                  opacity: slideVisible ? 1 : 0, transition: `opacity 0.35s ease ${i * 0.07}s`,
                }}
              >
                <div
                  style={{
                    width: "72px", height: "72px", borderRadius: "50%", overflow: "hidden",
                    border: "2px solid rgba(200,169,122,0.5)", boxShadow: "0 2px 12px rgba(200,100,20,0.2)",
                  }}
                >
                  <img src={item.imagen} alt={item.etiqueta ?? `Imagen ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                {item.etiqueta && (
                  <p style={{ fontSize: "10px", fontStyle: "italic", textAlign: "center", fontFamily: "Georgia, serif", color: "#5C6B5E", maxWidth: "70px", margin: 0 }}>
                    {t(item.etiqueta)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dots + botón */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px", marginTop: "20px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => handleSlideGo(i)}
                style={{
                  height: "6px", borderRadius: "999px", border: "none", cursor: "pointer",
                  width: i === slideActual ? "16px" : "6px",
                  background: i === slideActual ? "#C8A97A" : "rgba(200,169,122,0.3)",
                  transition: "all 0.3s",
                }}
              />
            ))}
          </div>
          <button
            onClick={() => router.push("/Cliente/producto")}
            style={{
              fontSize: "11px", fontWeight: 600, padding: "8px 20px", borderRadius: "999px",
              background: "#1A5D3B", color: "#fff", border: "none", cursor: "pointer",
            }}
          >
            {t("Ver más")}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          BLOQUE 3 — STATS
      ══════════════════════════════════════════════════ */}
      <div
        ref={statsRef}
        style={{
          background: "#F9F8F4",
          borderTop: "1px solid #E5E5E1",
          marginTop: "10px",
          padding: "40px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <p style={{ fontSize: "18px", fontWeight: 700, color: "#1A241E", fontFamily: "Georgia, serif", margin: 0, marginBottom: "8px" }}>
            {t("Impacto que construimos juntos")}
          </p>
          <p style={{ fontSize: "12px", color: "#5C6B5E", fontStyle: "italic", fontFamily: "Georgia, serif", margin: 0 }}>
            {t("Cada compra transforma vidas y preserva nuestra herencia cultural.")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", width: "100%", maxWidth: "900px" }}>
          {STATS.map((stat, i) => (
            <div
              key={i}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
                gap: "10px", padding: "20px 14px",
                borderRadius: "14px",
                background: "#fff",
                border: "1px solid #E5E5E1",
                opacity: statsVisible ? 1 : 0,
                transform: statsVisible ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.45s ease ${i * 70}ms, transform 0.45s ease ${i * 70}ms`,
              }}
            >
              <div
                style={{
                  padding: "10px", borderRadius: "12px",
                  background: "rgba(26,93,59,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {stat.icon}
              </div>
              <div>
                <p style={{ fontSize: "22px", fontWeight: 700, color: "#1A241E", fontFamily: "Georgia, serif", margin: 0, lineHeight: 1.1 }}>
                  {stat.num}
                </p>
                <p style={{ fontSize: "11px", lineHeight: 1.4, color: "#5C6B5E", margin: 0, marginTop: "4px" }}>
                  {t(stat.label)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          BLOQUE 4 — FOOTER
      ══════════════════════════════════════════════════ */}
      <div style={{ padding: "32px 28px 24px", background: "#1A241E", marginTop: "10px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 700, fontStyle: "italic", fontFamily: "Georgia, serif", color: "#e8c060", marginBottom: "8px" }}>
              {t("Guardianas del Mezcal")}
            </p>
            <p style={{ fontSize: "11px", lineHeight: 1.65, opacity: 0.6, color: "#D1D5D2", margin: 0 }}>
              {t("Honrando la tierra, el fuego y las manos que transforman el agave.")}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#C8A97A", marginBottom: "8px" }}>
              {t("Explorar")}
            </p>
            {["Maestras mezcaleras", "Historia", "Nuestro proceso"].map((item) => (
              <a key={item} href="#" style={{ display: "block", fontSize: "11px", opacity: 0.6, color: "#D1D5D2", textDecoration: "none", marginBottom: "4px" }}>
                {t(item)}
              </a>
            ))}
          </div>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#C8A97A", marginBottom: "8px" }}>
              {t("Contacto")}
            </p>
            {["guardianasdemezcal@gmail.com", "9512578906", "Santa Maria Zaquilán, Oaxaca"].map((item) => (
              <p key={item} style={{ fontSize: "11px", opacity: 0.6, color: "#D1D5D2", margin: 0, marginBottom: "4px" }}>{t(item)}</p>
            ))}
          </div>
        </div>
        <p style={{ fontSize: "10px", textAlign: "center", opacity: 0.4, marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(200,169,122,0.1)", color: "#D1D5D2", margin: "20px 0 0" }}>
          2026 © {t("Guardianas de mezcal. Todos los derechos reservados.")}
        </p>
      </div>

    </main>
  );
}