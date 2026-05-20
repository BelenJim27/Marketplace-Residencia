"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/context/LocaleContext";
import { useLandingStats } from "@/hooks/useLandingStats";
import { useMasVendidos } from "@/hooks/useMasVendidos";

// ─── HOOK: detecta dark mode ──────────────────────────────────────────────────
function useDarkMode(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => {
      const htmlClass = document.documentElement.classList.contains("dark");
      const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(htmlClass || sysDark);
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", check);
    return () => { obs.disconnect(); mq.removeEventListener("change", check); };
  }, []);
  return dark;
}

// ─── HOOK: detecta ancho de ventana ──────────────────────────────────────────
function useWindowWidth(): number {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
}

// ─── COLORES DE TEXTO según el modo ──────────────────────────────────────────
const TEXT_COLORS = {
  light: { dark: "#1F3A2E", mid: "#3D6B3F", italic: "#2a0f02", annotation: "#3d1800" },
  dark:  { dark: "#FFFFFF", mid: "#D8E8D8", italic: "#F0C84A", annotation: "#F0C84A" },
};

const PALETTE = {
  light: {
    bgBase:      "#F4F0E3",
    bgAccent:    "#2E4A33",
    heading:     "#1F3A2E",
    body:        "rgba(31,58,46,0.8)",
    pullQuote:   "#3D6B3F",
    skeletonBg:  "rgba(31,58,46,0.08)",
    ctaBtnBg:    "#1F3A2E",
  },
  dark: {
    bgBase:      "#0D1A10",
    bgAccent:    "#162218",
    heading:     "#F4F0E3",
    body:        "rgba(244,240,227,0.82)",
    pullQuote:   "#A8C26B",
    skeletonBg:  "rgba(244,240,227,0.08)",
    ctaBtnBg:    "#2E4A33",
  },
};

// ─── TIPOS ────────────────────────────────────────────────────────────────────

const STATS_CONFIG = [
  {
    key: "totalProductores" as const,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: "Productores registrados",
  },
  {
    key: "totalRegiones" as const,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    label: "Comunidades participantes",
  },
  {
    key: "totalProductos" as const,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    label: "Productos trazables",
  },
  {
    key: "ingresosFormateado" as const,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    label: "Ingresos generados para comunidades",
  },
];


const BOTTLE_CARDS = [
  { imagen: "/fotos/28.1.png", nombre: "Tobalá",      tipo: "Agave silvestre" },
  { imagen: "/fotos/29.1.png", nombre: "Espadín",     tipo: "Agave cultivado" },
  { imagen: "/fotos/30.1.png", nombre: "Madrecuixe",  tipo: "Agave silvestre" },
  { imagen: "/fotos/31.1.png", nombre: "Tepeztate",   tipo: "Agave silvestre" },
];

const TRAZA_STEPS = [
  { paso: "01", titulo: "Recolección", desc: "Agave silvestre cosechado a mano en su punto óptimo de madurez, respetando el ciclo natural.", fecha: "12 MAR 2024", done: true },
  { paso: "02", titulo: "Cocción", desc: "Las piñas se cuecen en horno cónico de tierra durante 4 días bajo piedras volcánicas.", fecha: "18 MAR 2024", done: true },
  { paso: "03", titulo: "Molienda", desc: "Machacado con tahona de piedra jalada por animal. Sin atajos industriales.", fecha: "22 MAR 2024", done: true },
  { paso: "04", titulo: "Fermentación", desc: "Fermentación natural en tinas de madera durante 8 días con levaduras silvestres.", fecha: "26 MAR 2024", done: true },
  { paso: "05", titulo: "Destilación", desc: "Doble destilación en alambique de cobre por manos artesanas. Ajuste a 47° alc.", fecha: "03 ABR 2024", done: true },
];

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function LandingPageOaxaca() {
  const { t } = useLocale();
  const router = useRouter();
  const { stats: landingStats, loading: statsLoading } = useLandingStats();
  const isDark = useDarkMode();
  const C = isDark ? TEXT_COLORS.dark : TEXT_COLORS.light;
  const P = isDark ? PALETTE.dark : PALETTE.light;
  const winWidth = useWindowWidth();

  // ─── Más vendidos ─────────────────────────────────────────────────────────
  const { productos: masVendidos, loading: loadingVendidos } = useMasVendidos(5);

  // Breakpoints
  const isMobile = winWidth < 640;
  const isTablet = winWidth >= 640 && winWidth < 1024;

  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement | null>(null);

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
      className="font-sans"
      style={{
        background: P.bgBase,
        color: C.dark,
        overflowY: "auto",
      }}
    >

      {/* ══════════════════════════════════════════════════
          SECCIÓN 1 — HERO VIDEO
      ══════════════════════════════════════════════════ */}
      <div style={{
        position: "relative",
        height: isMobile ? "100svh" : "72vh",
        minHeight: isMobile ? "580px" : "480px",
        overflow: "hidden",
      }}>
        <video
          src="/fotos/videohero.mp4"
          autoPlay muted loop playsInline
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Franja decorativa lateral */}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: "3px",
          background: "linear-gradient(to bottom, transparent, #C97A3E 40%, #C97A3E 60%, transparent)",
        }} />

        <div style={{
          position: "relative", zIndex: 10, color: "#fff",
          height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "flex-end",
          padding: isMobile ? "32px 28px" : isTablet ? "44px 44px" : "56px 72px",
          maxWidth: isMobile ? "100%" : "700px",
        }}>
          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "28px", height: "1px", background: "#C97A3E" }} />
            <span style={{
              fontSize: "13px", letterSpacing: "0.25em", textTransform: "uppercase",
              color: "#A8C26B", fontWeight: 700,
              textShadow: "0 1px 8px rgba(0,0,0,0.9)",
            }}>
              {t("Trazabilidad · Origen · Identidad")}
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: isMobile ? "36px" : isTablet ? "44px" : "56px",
            fontWeight: 700, lineHeight: 1.15,
            margin: "0 0 16px", color: "#ffffff",
            letterSpacing: "-0.01em",
            textShadow: "0 2px 16px rgba(0,0,0,0.85)",
          }}>
            {t("Oaxaca auténtico,")}<br />
            <span style={{ color: "#A8C26B", textShadow: "0 2px 16px rgba(0,0,0,0.85)" }}>{t("trazable y justo")}</span>
          </h1>

          <p style={{
            fontSize: isMobile ? "14px" : "15px",
            lineHeight: 1.75, color: "rgba(255,255,255,0.95)",
            maxWidth: "420px", margin: "0 0 24px",
            fontFamily: "'DM Sans', sans-serif",
            textShadow: "0 1px 10px rgba(0,0,0,0.8)",
          }}>
            {t("Conectamos el origen, la tradición y el talento de nuestras comunidades con el mundo.")}
          </p>

          {/* Badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px" }}>
            {[
              { icon: "✓", label: "Trazabilidad completa" },
              { icon: "⚖", label: "Comercio justo" },
              { icon: "🛡", label: "Protección cultural" },
            ].map((p) => (
              <div key={p.label} style={{
                display: "flex", alignItems: "center", gap: "6px",
                fontSize: "13px", fontWeight: 500, borderRadius: "999px",
                padding: "5px 14px",
                background: "rgba(201,122,62,0.15)",
                border: "1px solid rgba(201,122,62,0.4)",
                color: "#ffffff",
                letterSpacing: "0.02em",
                textShadow: "0 1px 6px rgba(0,0,0,0.7)",
              }}>
                <span>{p.icon}</span><span>{t(p.label)}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <button
              onClick={() => router.push("/producto")}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                fontSize: "14px", fontWeight: 600,
                padding: isMobile ? "12px 22px" : "14px 28px",
                borderRadius: "6px",
                background: "#C97A3E", color: "#1F3A2E",
                border: "none", cursor: "pointer",
                letterSpacing: "0.03em",
              }}
            >
              {t("Explorar productos")}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button
              onClick={() => router.push("/dashboard/productor/solicitar")}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                fontSize: "14px", fontWeight: 600,
                padding: isMobile ? "12px 22px" : "14px 28px",
                borderRadius: "6px",
                background: "transparent", color: "#C5CFB0",
                border: "1px solid rgba(197,207,176,0.35)", cursor: "pointer",
                letterSpacing: "0.03em",
              }}
            >
              {t("Ser productor")}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Ticker strip ─────────────────────────────────────────── */}
      <div style={{
        background: "#C97A3E", overflow: "hidden",
        height: "36px", display: "flex", alignItems: "center",
      }}>
        <div style={{
          display: "flex", gap: "0",
          animation: "ticker 28s linear infinite",
          whiteSpace: "nowrap",
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} style={{
              fontSize: "13px", fontWeight: 700, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "#1F3A2E", padding: "0 28px",
            }}>
              {t("Mezcal artesanal")} &nbsp;·&nbsp; {t("Trazabilidad completa")} &nbsp;·&nbsp; {t("Comercio justo")} &nbsp;·&nbsp; {t("Oaxaca, México")}
            </span>
          ))}
        </div>
        <style>{`
          @keyframes ticker {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
        `}</style>
      </div>

      {/* ══════════════════════════════════════════════════
          SECCIÓN 2 — SOBRE EL MEZCAL
      ══════════════════════════════════════════════════ */}
      <div style={{
        background: P.bgBase,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "space-between",
        gap: isMobile ? "0" : "48px",
        padding: isMobile ? "48px 28px" : isTablet ? "48px 40px" : "48px 64px",
      }}>
        {/* ── Panel texto ── */}
        <div style={{
          display: "flex", flexDirection: "column",
          flex: isMobile ? "none" : "0 0 auto",
          maxWidth: isMobile ? "100%" : "420px",
          gap: "22px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "2px", background: "#C97A3E", borderRadius: "1px" }} />
            <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "#C97A3E" }}>
              {t("Nuestra historia")}
            </span>
          </div>

          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: isMobile ? "32px" : isTablet ? "38px" : "46px",
            fontWeight: 700, lineHeight: 1.15,
            color: P.heading, margin: 0,
          }}>
            {t("El alma del")} <em style={{ color: "#C97A3E" }}>{t("agave")}</em>
          </h2>

          {/* Pull-quote */}
          <div style={{ borderLeft: "3px solid #C97A3E", paddingLeft: "20px" }}>
            <p style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: isMobile ? "15px" : "17px",
              fontStyle: "italic", lineHeight: 1.8,
              color: P.pullQuote, margin: 0,
            }}>
              &ldquo;{t("Descubre el auténtico sabor del mezcal, un destilado artesanal nacido del corazón del agave.")}&rdquo;
            </p>
          </div>

          <p style={{ fontSize: "15px", lineHeight: 1.85, color: P.body, margin: 0 }}>
            {t("Elaborado con procesos tradicionales que respetan la tierra y el tiempo, cada botella guarda carácter y tradición. Sus notas ahumadas y matices únicos lo convierten en una experiencia inigualable.")}
          </p>

          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            paddingTop: "20px", borderTop: "1px solid rgba(201,122,62,0.2)",
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#C97A3E", flexShrink: 0 }} />
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "14px", fontStyle: "italic", color: "#C97A3E" }}>
              &ldquo;{t("El alma de Oaxaca en cada gota")}&rdquo;
            </span>
          </div>
        </div>

        {/* ── Panel fotos — 5 imágenes ── */}
        {isMobile ? (
          /* MÓVIL: 2 columnas, 3 filas */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {/* 16.jpg — fila 1 completa */}
            <div style={{ gridColumn: "1/3", height: "150px", overflow: "hidden", borderRadius: "10px" }}>
              <img src="/fotos/16.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            {/* 24.jpeg */}
            <div style={{ height: "120px", overflow: "hidden", borderRadius: "10px" }}>
              <img src="/fotos/24.jpeg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            {/* 5.jpg */}
            <div style={{ height: "120px", overflow: "hidden", borderRadius: "10px" }}>
              <img src="/fotos/5.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            {/* 22.jpeg */}
            <div style={{ height: "150px", overflow: "hidden", borderRadius: "10px", position: "relative" }}>
              <img src="/fotos/22.jpeg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(31,58,46,0.5) 20%, transparent 55%)" }} />
              <span style={{ position: "absolute", bottom: "10px", left: "10px", fontSize: "12px", color: "#F4F0E3", fontWeight: 600, letterSpacing: "0.06em" }}>
                {t("Proceso artesanal")}
              </span>
            </div>
            {/* 20.jpeg */}
            <div style={{ height: "150px", overflow: "hidden", borderRadius: "10px", position: "relative" }}>
              <img src="/fotos/20.jpeg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "#C97A3E" }} />
            </div>
          </div>
        ) : (
          /* DESKTOP: 3fr izquierda + 2fr derecha, total 330px alto */
          <div style={{
            display: "grid",
            gridTemplateColumns: "3fr 2fr",
            gap: "10px",
            height: "330px",
            maxWidth: "576px",
            width: "100%",
          }}>

            {/* ── Izquierda: fila top 110px + 5.jpg 210px ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px", height: "110px" }}>
                <div style={{ overflow: "hidden", borderRadius: "12px" }}>
                  <img src="/fotos/16.jpg" alt="Paisaje"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ overflow: "hidden", borderRadius: "12px" }}>
                  <img src="/fotos/24.jpeg" alt="Piñas"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              </div>
              <div style={{ height: "210px", overflow: "hidden", borderRadius: "12px" }}>
                <img src="/fotos/5.jpg" alt="Valle"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            </div>

            {/* ── Derecha: 22.jpeg 220px + 20.jpeg 100px ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ height: "220px", overflow: "hidden", borderRadius: "12px", position: "relative" }}>
                <img src="/fotos/22.jpeg" alt="Proceso artesanal"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(31,58,46,0.55) 20%, transparent 50%)",
                }} />
                <div style={{ position: "absolute", bottom: "12px", left: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#C97A3E", flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", color: "#F4F0E3", fontWeight: 600, letterSpacing: "0.07em", textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
                    {t("Proceso artesanal")}
                  </span>
                </div>
              </div>
              <div style={{ height: "100px", overflow: "hidden", borderRadius: "12px", position: "relative" }}>
                <img src="/fotos/20.jpeg" alt="Piñas con humo"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "#C97A3E" }} />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          BLOQUE 3 — STATS (oscuro)
      ══════════════════════════════════════════════════ */}
      <div ref={statsRef} style={{
        background: P.bgAccent,
        padding: isMobile ? "48px 24px" : "72px 40px",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Eyebrow + título */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? "32px" : "48px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{ width: "24px", height: "1px", background: "#C97A3E" }} />
            <span style={{
              fontSize: "13px", fontWeight: 700, letterSpacing: "0.22em",
              textTransform: "uppercase", color: "#C97A3E",
            }}>
              {t("Nuestro impacto")}
            </span>
            <div style={{ width: "24px", height: "1px", background: "#C97A3E" }} />
          </div>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: isMobile ? "24px" : "32px",
            fontWeight: 700, color: "#F4F0E3",
            margin: "0 0 10px", lineHeight: 1.2,
          }}>
            {t("Impacto que construimos juntos")}
          </h2>
          <p style={{
            fontSize: isMobile ? "13px" : "15px",
            color: "rgba(244,240,227,0.9)", fontStyle: "italic",
            fontFamily: "'Playfair Display', Georgia, serif", margin: 0,
          }}>
            {t("Cada compra transforma vidas y preserva nuestra herencia cultural.")}
          </p>
        </div>

        {/* Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: isMobile ? "12px" : "16px",
          width: "100%",
          maxWidth: "960px",
        }}>
          {STATS_CONFIG.map((stat, i) => {
            const valor = landingStats ? String(landingStats[stat.key] ?? "—") : "…";
            return (
              <div key={i} style={{
                display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
                gap: "14px", padding: isMobile ? "20px 14px" : "28px 20px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(244,240,227,0.25)",
                opacity: statsVisible ? 1 : 0,
                transform: statsVisible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`,
              }}>
                <div style={{
                  width: "52px", height: "52px", borderRadius: "50%",
                  border: "1px solid rgba(244,240,227,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#F4F0E3",
                }}>
                  {stat.icon}
                </div>
                <div>
                  <p style={{
                    fontSize: isMobile ? "28px" : "34px",
                    fontWeight: 700, color: "#C97A3E",
                    fontFamily: "'Playfair Display', Georgia, serif",
                    margin: 0, lineHeight: 1.1,
                  }}>
                    {statsLoading ? "…" : valor}
                  </p>
                  <p style={{ fontSize: "14px", lineHeight: 1.5, color: "rgba(244,240,227,0.9)", margin: 0, marginTop: "6px" }}>
                    {t(stat.label)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TRAZABILIDAD — timeline
      ══════════════════════════════════════════════════ */}
      <div style={{ background: P.bgAccent, padding: isMobile ? "48px 20px" : "72px 40px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? "32px" : "48px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "24px", height: "1px", background: "#C97A3E" }} />
              <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C97A3E" }}>
                {t("Cada botella, una historia")}
              </span>
              <div style={{ width: "24px", height: "1px", background: "#C97A3E" }} />
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: isMobile ? "24px" : "32px", fontWeight: 700, color: "#F4F0E3", margin: "0 0 12px", lineHeight: 1.2 }}>
              {t("Escanea, descubre,")} <em style={{ color: "#F4D5A8" }}>{t("confía")}</em>
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(244,240,227,0.9)", lineHeight: 1.7, maxWidth: "500px", margin: "0 auto" }}>
              {t("Cada producto trae un código QR único. Verás el productor, la comunidad, el lote y cuánto del precio vuelve al artesano.")}
            </p>
          </div>

          {/* Layout: imagen + timeline */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "320px 1fr",
            gap: isMobile ? "32px" : "56px",
            alignItems: "start",
          }}>
            {/* Botella card */}
            <div style={{ borderRadius: "16px", overflow: "hidden", position: "relative" }}>
              <img src="/fotos/28.1.png" alt="Tobalá" style={{ width: "100%", height: isMobile ? "240px" : "360px", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(31,58,46,0.88) 30%, transparent 60%)" }} />
              <div style={{ position: "absolute", bottom: "16px", left: "16px", right: "16px" }}>
                <p style={{ fontSize: "12px", color: "#C97A3E", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 2px" }}>LOTE · TBL-2024-0073</p>
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "20px", fontWeight: 700, color: "#F4F0E3", margin: "0 0 2px" }}>Tobalá Cerro Quiniño</p>
                <p style={{ fontSize: "13px", color: "rgba(244,240,227,0.85)", margin: 0 }}>750ml · 47° alc · Botella 73 de 400</p>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {TRAZA_STEPS.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: "16px", paddingBottom: i < TRAZA_STEPS.length - 1 ? "24px" : "0" }}>
                  {/* Línea + dot */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                      background: step.done ? "#C97A3E" : "rgba(201,122,62,0.15)",
                      border: step.done ? "none" : "1px solid rgba(201,122,62,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {step.done ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1F3A2E" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#C97A3E", boxShadow: "0 0 8px #C97A3E" }} />
                      )}
                    </div>
                    {i < TRAZA_STEPS.length - 1 && (
                      <div style={{ width: "1px", flex: 1, background: step.done ? "rgba(201,122,62,0.4)" : "rgba(201,122,62,0.15)", minHeight: "24px" }} />
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ paddingTop: "4px", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <div>
                        <span style={{ fontSize: "12px", color: "#C97A3E", fontWeight: 700, letterSpacing: "0.1em" }}>PASO {step.paso}</span>
                        {!step.done && <span style={{ marginLeft: "8px", fontSize: "12px", color: "#C97A3E", fontWeight: 700, letterSpacing: "0.08em" }}>· ACTUAL</span>}
                      </div>
                      <span style={{ fontSize: "13px", color: "rgba(244,240,227,0.75)", letterSpacing: "0.05em" }}>{step.fecha}</span>
                    </div>
                    <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "15px", fontWeight: 600, color: "#F4F0E3", margin: "0 0 3px" }}>{t(step.titulo)}</p>
                    <p style={{ fontSize: "14px", color: "rgba(244,240,227,0.85)", lineHeight: 1.5, margin: 0 }}>{t(step.desc)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: isMobile ? "32px" : "48px" }}>
            <button onClick={() => router.push("/producto")} style={{
              display: "flex", alignItems: "center", gap: "8px",
              fontSize: "14px", fontWeight: 600, padding: "13px 28px", borderRadius: "6px",
              background: "#C97A3E", color: "#1F3A2E",
              border: "none", cursor: "pointer", letterSpacing: "0.03em",
            }}>
              {t("Ver trazabilidad por botella")}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SECCIÓN PRODUCTOS DESTACADOS
      ══════════════════════════════════════════════════ */}
      <div style={{ background: P.bgBase, padding: isMobile ? "48px 20px" : "72px 48px" }}>
        <style>{`
          .categorias-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
          }
          @media (max-width: 1023px) {
            .categorias-grid { grid-template-columns: repeat(2, 1fr); }
          }
          @media (max-width: 639px) {
            .categorias-grid { grid-template-columns: 1fr; }
          }
          .categoria-card {
            position: relative;
            height: 380px;
            border-radius: 16px;
            overflow: hidden;
            cursor: pointer;
          }
          .categoria-card img {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            object-fit: cover;
            transition: transform 0.4s ease;
          }
          .categoria-card:hover img { transform: scale(1.1); }
          .card-overlay {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.28) 50%, transparent 100%);
            pointer-events: none;
          }
          .card-content {
            position: absolute;
            bottom: 0; left: 0;
            width: 100%;
            padding: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            box-sizing: border-box;
          }
          .card-count {
            display: block;
            color: #A8C26B;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 4px;
          }
          .card-title {
            color: #ffffff;
            font-size: 26px;
            font-family: 'Playfair Display', Georgia, serif;
            font-weight: 700;
            margin: 0;
            line-height: 1.2;
          }
          .card-btn {
            width: 48px; height: 48px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.3);
            background-color: rgba(255,255,255,0.1);
            backdrop-filter: blur(4px);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: background-color 0.3s ease;
            cursor: pointer;
          }
          .categoria-card:hover .card-btn { background-color: rgba(255,255,255,0.3); }
        `}</style>

        {/* Encabezado */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? "32px" : "48px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "24px", height: "1px", background: "#C97A3E" }} />
            <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C97A3E" }}>
              {t("Explora")}
            </span>
            <div style={{ width: "24px", height: "1px", background: "#C97A3E" }} />
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: isMobile ? "24px" : "32px", fontWeight: 700, color: P.heading, margin: "0 0 10px", lineHeight: 1.2 }}>
            {t("Productos destacados")}
          </h2>
          <p style={{ fontSize: "15px", color: P.body, lineHeight: 1.6, maxWidth: "480px", margin: "0 auto" }}>
            {t("Descubre nuestra selección de mezcales, cada uno con su propia historia.")}
          </p>
        </div>

        {loadingVendidos ? (
          <div className="categorias-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ height: "380px", borderRadius: "16px", background: P.skeletonBg, animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : (
          <div className="categorias-grid">
            {Array.from({ length: 4 }, (_, i) => {
              const prod = masVendidos[i];
              const fb   = BOTTLE_CARDS[i];
              return (
                <div
                  key={i}
                  className="categoria-card"
                  onClick={() => router.push("/producto")}
                >
                  <img
                    src={prod?.imagen || fb.imagen}
                    alt={prod?.nombre ?? fb.nombre}
                    onError={(e) => { const img = e.target as HTMLImageElement; if (!img.dataset.err) { img.dataset.err = "1"; img.src = fb.imagen; } }}
                  />
                  <div className="card-overlay" />
                  <div className="card-content">
                    <div>
                      <span className="card-count">{fb.tipo}</span>
                      <h3 className="card-title">{prod?.nombre ?? fb.nombre}</h3>
                    </div>
                    <button className="card-btn" aria-label="Ver productos">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "40px" }}>
          <button
            onClick={() => router.push("/producto")}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              fontSize: "14px", fontWeight: 600, padding: "13px 32px",
              borderRadius: "6px", background: P.ctaBtnBg, color: "#F4F0E3",
              border: "none", cursor: "pointer", letterSpacing: "0.03em",
            }}
          >
            {t("Ver todos los productos")}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>


          </main>
  );
}