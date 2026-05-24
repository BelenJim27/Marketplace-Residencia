"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { CheckCircle2, FileText, CreditCard, Building2, User, ArrowRight } from "lucide-react";
import { Suspense } from "react";

/* ── Biodiversity stripe stages ──────────────────────────────────────────── */
const STAGES = [
  { id: 1, color: "#6B8A5C" },
  { id: 2, color: "#2F4A2A" },
  { id: 3, color: "#A4623A" },
  { id: 4, color: "#3B3328" },
  { id: 5, color: "#E6DCC1" },
  { id: 6, color: "#B06A3B" },
  { id: 7, color: "#C89B4A" },
];

const REQ_COLORS = ["#6B8A5C", "#A4623A", "#B06A3B", "#C89B4A"];
const BEN_COLORS = ["#6B8A5C", "#A4623A", "#3B3328", "#B06A3B"];

/* ── Component ───────────────────────────────────────────────────────────── */

function ProductorLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isProductor, isAdmin, user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const isVenderFlow = searchParams.get("vender") === "true";

  if (isAuthenticated && isProductor && !isAdmin) {
    router.push("/dashboard/productor");
    return null;
  }

  if (isAuthenticated && isAdmin) {
    router.push("/Administrador/dashboard");
    return null;
  }

  const requisitos = [
    /*{
      titulo: "Identificación Oficial",
      descripcion: "INE o IFE vigente para verificar tu identidad",
      icono: User,
    },
    {
      titulo: "RFC",
      descripcion: "Registro Federal de Contribuyentes vigente",
      icono: FileText,
    },
    {
      titulo: "Cuenta Bancaria",
      descripcion: "Cuenta CLABE para recibir tus pagos",
      icono: Building2,
    },
    {
      titulo: "Método de Pago",
      descripcion: "Tarjeta de crédito o débito para cobros",
      icono: CreditCard,
    }, */
    {
      titulo: "Certificación de Origen",
      descripcion: "Certificado que avale la calidad de tus productos",
      icono: FileText,
    },
  ];

  const beneficios = [
    "Amplio alcance de clientes interesados en productos locales",
    "Herramientas para gestionar tu tienda y productos",
    "Pagos seguros directamente a tu cuenta bancaria",
    "Soporte y capacitación para mejorar tus ventas",
  ];

  /* palette */
  const C = {
    page:    isDark ? "#0B1610" : "#F5F0E6",
    card:    isDark ? "#142018" : "#FBFAF5",
    section: isDark ? "#1A2C1E" : "#F5F0E6",
    border:  isDark ? "rgba(200,169,122,0.18)" : "#E8E0CB",
    heading: isDark ? "#F4F0E3" : "#1C1A14",
    body:    isDark ? "rgba(244,240,227,0.70)" : "#3A352A",
    muted:   isDark ? "rgba(244,240,227,0.45)" : "#6B6354",
    rule:    isDark ? "rgba(200,169,122,0.14)" : "#E8E0CB",
    copper:  "#C97A3E",
    green:   "#2E4A33",
    cream:   "#F4F0E3",
    amber:   "#C89B4A",
    tierra:  "#A4623A",
  };

  const SERIF = "'Cormorant Garamond', Georgia, serif";
  const SANS  = "'Manrope', 'DM Sans', sans-serif";
  const MONO  = "ui-monospace, 'SF Mono', Menlo, monospace";

  return (
    <>
      <style>{`
        @media (max-width: 680px) {
          .unirse-grid { grid-template-columns: 1fr !important; }
          .unirse-left { min-height: 280px !important; }
        }
      `}</style>

      <div style={{ fontFamily: SANS, color: C.heading, padding: "56px 0 48px" }}>

        {/* ── Split card ──────────────────────────────────────────────── */}
        <div
          className="unirse-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "clamp(260px, 38%, 420px) 1fr",
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: "16px",
            overflow: "hidden",
            maxWidth: "1080px",
            margin: "0 auto",
            minHeight: "620px",
          }}
        >

          {/* ══ LEFT — imagery panel ════════════════════════════════════ */}
          <div
            className="unirse-left"
            style={{ position: "relative", overflow: "hidden", background: C.green, minHeight: "500px" }}
          >
            {/* Photo */}
            <img
              src="/fotos/persona.jpeg"
              alt="Maestra mezcalera"
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "cover", objectPosition: "center top",
              }}
            />

            {/* Gradient overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, rgba(15,30,15,0.40) 0%, rgba(15,30,15,0.15) 35%, rgba(15,30,15,0.80) 100%)",
            }} />

            {/* Biodiversity stripe */}
            <div style={{
              position: "absolute", top: 28, bottom: 28, left: 18,
              display: "flex", flexDirection: "column", gap: 5, zIndex: 2,
            }}>
              {STAGES.map((s) => (
                <span key={s.id} style={{
                  flex: 1, width: 4, borderRadius: "2px",
                  background: s.color,
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.18)",
                }} />
              ))}
            </div>

            {/* Top label */}
            <div style={{
              position: "absolute", top: 18, right: 18, zIndex: 2,
              fontFamily: MONO, fontSize: "10px", letterSpacing: "0.16em",
              textTransform: "uppercase", color: "rgba(244,240,227,0.68)",
              background: "rgba(0,0,0,0.28)", padding: "4px 9px",
              border: "1px solid rgba(244,240,227,0.18)",
            }}>
              Tierra Agaves · 2026
            </div>

            {/* Editorial block */}
            <div style={{ position: "absolute", left: 36, right: 24, bottom: 30, zIndex: 2 }}>
              <div style={{
                fontFamily: SANS, fontSize: "10px", letterSpacing: "0.26em",
                textTransform: "uppercase", color: C.amber,
                fontWeight: 700, marginBottom: "12px",
              }}>
                Guardianas del Mezcal · Productores
              </div>
              <blockquote style={{
                fontFamily: SERIF, fontStyle: "italic", fontWeight: 400,
                fontSize: "clamp(22px, 3vw, 32px)", lineHeight: 1.15,
                margin: 0, color: C.cream,
              }}>
                "Cada botella es un mapa<br />de su tierra."
              </blockquote>
              <cite style={{
                display: "block", marginTop: "12px",
                fontFamily: SANS, fontSize: "12px", letterSpacing: "0.05em",
                color: "rgba(244,240,227,0.68)", fontStyle: "normal",
              }}>
                — Maestra mezcalera, Matatlán, Oaxaca
              </cite>
            </div>
          </div>

          {/* ══ RIGHT — content panel ═══════════════════════════════════ */}
          <div style={{
            padding: "clamp(28px, 5%, 52px)",
            display: "flex", flexDirection: "column",
            background: C.card, overflowY: "auto",
          }}>

            {/* Kicker */}
            <p style={{
              fontFamily: SANS, color: C.tierra, fontSize: "10.5px",
              fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase",
              margin: "0 0 14px",
            }}>
              Programa de Productores
            </p>

            {/* Heading */}
            <h1 style={{
              fontFamily: SERIF, fontWeight: 500,
              fontSize: "clamp(30px, 4vw, 48px)", lineHeight: 1.05,
              letterSpacing: "-0.005em", margin: "0 0 14px", color: C.heading,
            }}>
              Conviértete en<br />
              <em style={{ fontStyle: "italic", color: C.green }}>Productor</em>
            </h1>

            {/* Lede */}
            <p style={{
              fontFamily: SANS, fontSize: "14px", lineHeight: 1.65,
              color: C.body, margin: "0 0 28px", maxWidth: "460px",
            }}>
              Únete a nuestra comunidad de productores locales y llega a miles de clientes que valoran productos auténticos. Comparte tu pasión por lo artesanal.
            </p>

            {/* ── Requisitos ── */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "12px" }}>
                <p style={{ fontFamily: SERIF, fontSize: "17px", color: C.heading, fontWeight: 500, margin: 0 }}>
                  Requisitos para vender
                </p>
                <span style={{ fontFamily: MONO, fontSize: "11px", color: C.muted }}>
                  {requisitos.length} documento{requisitos.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {requisitos.map((req, index) => (
                  <div key={index} style={{
                    display: "grid", gridTemplateColumns: "24px 1fr auto",
                    gap: "14px", alignItems: "center",
                    padding: "12px 0",
                    borderBottom: `1px solid ${C.rule}`,
                  }}>
                    <span style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: REQ_COLORS[index] ?? C.copper,
                      marginLeft: "8px", flexShrink: 0,
                      display: "inline-block",
                    }} />
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: C.heading, margin: "0 0 2px" }}>
                        {req.titulo}
                      </p>
                      <p style={{ fontFamily: SANS, fontSize: "11.5px", color: C.muted, margin: 0, lineHeight: 1.5 }}>
                        {req.descripcion}
                      </p>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: "11px", color: C.muted, whiteSpace: "nowrap" }}>
                      requerido
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Beneficios grid ── */}
            <div style={{
              background: C.section,
              border: `1px solid ${C.rule}`,
              padding: "16px 20px",
              marginBottom: "28px",
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "10px 18px",
            }}>
              {beneficios.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "9px" }}>
                  <CheckCircle2 style={{
                    width: "12px", height: "12px",
                    color: BEN_COLORS[i % BEN_COLORS.length],
                    flexShrink: 0, marginTop: "2px",
                  }} />
                  <p style={{ fontFamily: SANS, fontSize: "12px", color: C.body, margin: 0, lineHeight: 1.5 }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>

            {/* ── CTAs ── */}
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Link
                  href={isVenderFlow ? "/auth/sign-up?vender=true" : "/auth/sign-up"}
                  style={{
                    flex: 1, display: "flex", alignItems: "center",
                    justifyContent: "center", gap: "10px",
                    background: C.heading, color: C.cream,
                    padding: "14px 22px", textDecoration: "none",
                    fontFamily: SANS, fontSize: "13px", fontWeight: 600,
                    letterSpacing: "0.04em", minWidth: "130px",
                  }}
                >
                  Crear cuenta
                  <ArrowRight style={{ width: "13px", height: "13px" }} />
                </Link>
                <Link
                  href={isVenderFlow ? "/auth/sign-in?vender=true" : "/auth/sign-in"}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "transparent", color: C.heading,
                    border: `1px solid ${isDark ? "rgba(244,240,227,0.28)" : "#1C1A14"}`,
                    padding: "13px 22px", textDecoration: "none",
                    fontFamily: SANS, fontSize: "13px", fontWeight: 500,
                    letterSpacing: "0.04em",
                  }}
                >
                  {isVenderFlow ? "Iniciar sesión" : "Ya tengo cuenta"}
                </Link>
              </div>

              {!isVenderFlow && (
                <p style={{ fontFamily: SANS, color: C.muted, fontSize: "12px", textAlign: "center", margin: 0 }}>
                  ¿Ya tienes una cuenta?{" "}
                  <Link href="/auth/sign-in" style={{ color: C.copper, textDecoration: "underline", textUnderlineOffset: "2px" }}>
                    Inicia sesión
                  </Link>{" "}
                  para completar tu solicitud.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProductorLandingPage() {
  return (
    <Suspense>
      <ProductorLandingContent />
    </Suspense>
  );
}
