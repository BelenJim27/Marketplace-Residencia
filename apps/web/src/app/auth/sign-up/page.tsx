"use client";

import Link from "next/link";
import Image from "next/image";
import { SignUpForm } from "./_components/sign-up-form";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTheme } from "next-themes";
import { TiendaHeader } from "@/components/Administrator/Store/tienda-header";

const FEATURES = [
  "Productores artesanales verificados",
  "Envíos a todo México y el mundo",
  "Variedad única de agaves oaxaqueños",
];

/* ── Main content ─────────────────────────────────────────────────────────── */
function SignUpContent() {
  const searchParams = useSearchParams();
  const isVenderFlow = searchParams.get("vender") === "true";
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  /* ── Vender flow: wizard layout con TiendaHeader ── */
  if (isVenderFlow) {
    const C = {
      page:    isDark ? "#0B1610" : "#FAF6EC",
      card:    isDark ? "#142018" : "#FFFFFF",
      border:  isDark ? "rgba(200,169,122,0.18)" : "rgba(46,74,51,0.12)",
      heading: isDark ? "#F4F0E3" : "#1C1A14",
      muted:   isDark ? "rgba(244,240,227,0.45)" : "#6B6354",
      green:   "#2E4A33",
      copper:  "#C97A3E",
    };

    const SERIF = "'Cormorant Garamond', Georgia, serif";
    const SANS  = "'Manrope', 'DM Sans', sans-serif";
    const MONO  = "ui-monospace, 'SF Mono', Menlo, monospace";

    return (
      <div style={{ minHeight: "100vh", background: C.page, fontFamily: SANS, color: C.heading }}>
        <TiendaHeader />
        <div
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            padding: "88px 24px 64px",
          }}
        >

          {/* ── Form card ────────────────────────────────────── */}
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
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: 500, margin: 0, color: C.heading }}>
                Datos de acceso
              </h3>
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

  /* ── Regular sign-up ── */
  return (
    <div className="p-4 md:p-6 2xl:p-10">
    <div className="overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-gray-dark min-h-[calc(100vh-8rem)]">
      <div className="flex min-h-[calc(100vh-8rem)]">
        {/* Left: Form */}
        <div className="flex w-full flex-col justify-center lg:w-[45%] p-8 sm:p-12 xl:p-16">
          <div className="mb-8">
            <div className="mb-4">
              <Image
                src="/images/logo/agavea.png"
                alt="AGAVEA"
                width={180}
                height={72}
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-dark dark:text-white">
              Crea tu cuenta
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Regístrate para comenzar a comprar.
            </p>
          </div>

          <SignUpForm />

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/auth/sign-in"
              className="font-semibold text-green-600 underline underline-offset-2 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            >
              Inicia sesión
            </Link>
          </p>
        </div>

        {/* Right: Hero — mismo que sign-in */}
        <div className="hidden lg:block lg:w-[55%] relative">
          <Image
            src="/images/login/gemmi.png"
            alt="Mezcal Oaxaca"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
          <div className="absolute inset-0 flex flex-col justify-end p-12 pb-16">
            <p className="text-green-300 text-xs font-semibold tracking-widest uppercase mb-3">
              Marketplace Artesanal
            </p>
            <h2 className="text-5xl font-bold text-white leading-tight mb-4">
              Mezcal Oaxaqueño<br />
              <span className="text-green-400">del corazón</span><br />
              de México
            </h2>
            <p className="text-white/60 text-base max-w-xs leading-relaxed mb-8">
              Conectamos productores artesanales con amantes del buen mezcal en todo el mundo.
            </p>
            <div className="flex flex-col gap-2.5">
              {FEATURES.map((feat) => (
                <div key={feat} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500/25 text-green-300 text-xs font-bold">
                    ✓
                  </span>
                  <span className="text-white/75 text-sm">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}
