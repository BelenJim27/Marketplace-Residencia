"use client";

import Link from "next/link";
import Image from "next/image";
import { SignUpForm } from "./_components/sign-up-form";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTheme } from "next-themes";

/* ── Wizard steps ─────────────────────────────────────────────────────────── */
const STEPS = [
  { n: 1, title: "Cuenta",     subtitle: "Datos de acceso" },
  { n: 2, title: "Solicitud",  subtitle: "Datos de productor" },
  { n: 3, title: "Verificación", subtitle: "Documentos e identidad" },
];

/* ── Step indicator ───────────────────────────────────────────────────────── */
function StepItem({
  n, title, subtitle, state, isLast,
}: {
  n: number; title: string; subtitle: string;
  state: "done" | "active" | "pending"; isLast: boolean;
}) {
  const GREEN = "#2E4A33";
  const COPPER = "#C97A3E";

  const dotBg =
    state === "done"    ? GREEN :
    state === "active"  ? "#fff" :
    "transparent";
  const dotColor =
    state === "done"    ? "#fff" :
    state === "active"  ? GREEN :
    "rgba(120,120,120,0.6)";
  const dotBorder =
    state === "done"    ? GREEN :
    state === "active"  ? GREEN :
    "rgba(180,170,150,0.5)";

  return (
    <li style={{ display: "flex", gap: "12px", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
      {/* connector line */}
      {!isLast && (
        <div style={{
          position: "absolute", left: "15px", top: "32px", bottom: "-22px",
          width: "2px",
          background: state === "done" ? GREEN : "rgba(180,170,150,0.35)",
        }} />
      )}
      {/* dot */}
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
        display: "grid", placeItems: "center",
        fontWeight: 800, fontSize: "13px",
        background: dotBg, color: dotColor,
        border: `2px solid ${dotBorder}`,
        transition: "all 0.2s",
      }}>
        {state === "done" ? "✓" : n}
      </div>
      {/* text */}
      <div style={{ paddingTop: "4px" }}>
        <div style={{
          fontSize: "13.5px", fontWeight: 700,
          color: state === "pending" ? "rgba(120,120,120,0.7)" : "inherit",
        }}>
          {title}
        </div>
        <div style={{ fontSize: "12px", color: "rgba(120,120,120,0.7)", marginTop: "2px" }}>
          {subtitle}
        </div>
      </div>
    </li>
  );
}

/* ── Main content ─────────────────────────────────────────────────────────── */
function SignUpContent() {
  const searchParams = useSearchParams();
  const isVenderFlow = searchParams.get("vender") === "true";
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  /* ── Vender flow: wizard layout ── */
  if (isVenderFlow) {
    const C = {
      page:    isDark ? "#0B1610" : "#FAF6EC",
      card:    isDark ? "#142018" : "#FFFFFF",
      border:  isDark ? "rgba(200,169,122,0.18)" : "rgba(46,74,51,0.12)",
      heading: isDark ? "#F4F0E3" : "#1C1A14",
      body:    isDark ? "rgba(244,240,227,0.68)" : "#3A352A",
      muted:   isDark ? "rgba(244,240,227,0.45)" : "#6B6354",
      green:   "#2E4A33",
      copper:  "#C97A3E",
      cream:   "#F4F0E3",
      secureBg:    isDark ? "rgba(46,74,51,0.20)" : "rgba(46,74,51,0.07)",
      secureBorder: isDark ? "rgba(46,74,51,0.45)" : "rgba(46,74,51,0.22)",
    };

    const SERIF = "'Cormorant Garamond', Georgia, serif";
    const SANS  = "'Manrope', 'DM Sans', sans-serif";
    const MONO  = "ui-monospace, 'SF Mono', Menlo, monospace";

    return (
      <div style={{ minHeight: "100vh", background: C.page, fontFamily: SANS, color: C.heading }}>
        <style>{`
          @media (max-width: 768px) {
            .signup-wizard-grid { grid-template-columns: 1fr !important; }
            .signup-wizard-aside { display: none !important; }
          }
        `}</style>

        <div
          className="signup-wizard-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: "0",
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "48px 24px 48px",
            alignItems: "start",
          }}
        >

          {/* ── Left: steps sidebar ─────────────────────────────────── */}
          <aside
            className="signup-wizard-aside"
            style={{ paddingRight: "48px", position: "sticky", top: "80px" }}
          >
            {/* Eyebrow */}
            <p style={{
              fontFamily: MONO, fontSize: "11px", letterSpacing: "0.14em",
              color: C.copper, fontWeight: 600, textTransform: "uppercase",
              margin: "0 0 20px",
            }}>
              Solicitud · 3 pasos
            </p>

            {/* Heading */}
            <h2 style={{
              fontFamily: SERIF, fontWeight: 500, fontSize: "28px",
              lineHeight: 1.15, letterSpacing: "-0.3px",
              margin: "0 0 10px", color: C.heading,
            }}>
              Crea tu cuenta para solicitar ser productor
            </h2>

            <p style={{
              fontSize: "13.5px", lineHeight: 1.6, color: C.muted,
              margin: "0 0 32px",
            }}>
              Toma alrededor de 3 minutos. Una vez registrado podrás completar tu solicitud.
            </p>

            {/* Steps */}
            <ol style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: "22px" }}>
              {STEPS.map((s, i) => (
                <StepItem
                  key={s.n}
                  n={s.n}
                  title={s.title}
                  subtitle={s.subtitle}
                  state={s.n === 1 ? "active" : "pending"}
                  isLast={i === STEPS.length - 1}
                />
              ))}
            </ol>

            {/* Security note */}
            <div style={{
              padding: "14px 16px", borderRadius: "12px",
              background: C.secureBg, border: `1px solid ${C.secureBorder}`,
              fontSize: "12.5px", color: isDark ? "rgba(200,220,200,0.85)" : "#2F4A2A",
              lineHeight: 1.55,
            }}>
              <strong>Tus datos están seguros.</strong> Nunca compartimos tu información sin tu permiso.
            </div>
          </aside>

          {/* ── Right: form card ────────────────────────────────────── */}
          <section style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: "20px",
            padding: "clamp(28px, 5%, 44px)",
            boxShadow: isDark
              ? "0 4px 40px rgba(0,0,0,0.35)"
              : "0 2px 4px rgba(11,26,43,0.05), 0 20px 50px rgba(11,26,43,0.08)",
          }}>
            {/* Card header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
              <h3 style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: 500, margin: 0, color: C.heading }}>
                Datos de acceso
              </h3>
              <span style={{ fontFamily: MONO, fontSize: "11px", color: C.muted }}>
                1 / 3
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: "5px", background: isDark ? "rgba(200,169,122,0.15)" : "#EDE8D8", borderRadius: "99px", overflow: "hidden", marginBottom: "28px" }}>
              <div style={{ height: "100%", width: "33%", background: C.green, borderRadius: "99px", transition: "width 0.35s ease" }} />
            </div>

            {/* Form */}
            <SignUpForm />

            {/* Footer link */}
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: C.muted, margin: 0 }}>
                ¿Ya tienes una cuenta?{" "}
                <Link
                  href="/auth/sign-in?vender=true"
                  style={{ color: C.copper, textDecoration: "underline", textUnderlineOffset: "2px", fontWeight: 600 }}
                >
                  Iniciar sesión
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  /* ── Regular sign-up (sin cambios) ── */
  return (
    <>
      <Breadcrumb pageName="Crear Cuenta" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="flex flex-col lg:flex-row items-center">
          <div className="w-full lg:w-1/2 order-2 lg:order-1">
            <div className="w-full p-4 sm:p-12.5 xl:p-15">
              <div className="mb-6 text-center sm:text-left">
                <h1 className="mb-4 text-2xl font-bold text-dark dark:text-white">
                  Crear Cuenta
                </h1>
                <p className="text-gray-500">
                  Regístrate para comenzar a comprar
                </p>
              </div>

              <SignUpForm />

              <div className="mt-6 text-center">
                <p>
                  ¿Ya tienes una cuenta?{" "}
                  <Link href="/auth/sign-in" className="text-green-600 hover:underline">
                    Ingresar
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Right side image */}
          <div className="w-full lg:w-1/2 relative min-h-[200px] sm:min-h-[300px] lg:min-h-[800px] order-1 lg:order-2">
            <Image
              src="/images/login/gemmi.png"
              alt="Login Image"
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 sm:p-10">
              <p className="mb-2 sm:mb-3 text-lg sm:text-xl font-medium text-white">
                Únete a nuestra tienda
              </p>
              <h1 className="mb-3 sm:mb-4 text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                ¡Bienvenido!
              </h1>
              <p className="w-full max-w-[280px] sm:max-w-[375px] text-sm sm:text-base font-medium text-white dark:text-dark-6">
                Crea una cuenta para acceder a todos nuestros productos
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}
