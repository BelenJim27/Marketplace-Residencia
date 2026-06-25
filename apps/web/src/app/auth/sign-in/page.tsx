"use client";

import React from "react";
import Signin from "@/components/Administrator/Auth/Signin";
import GoogleSigninButton from "@/components/Administrator/Auth/GoogleSigninButton";
import SigninWithPassword from "@/components/Administrator/Auth/SigninWithPassword";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { getPostLoginUrl } from "@/lib/get-post-login-url";
import { TiendaHeader } from "@/components/Administrator/Store/tienda-header";
import {
  UserCircle, Users, Tag, LayoutGrid, ShieldCheck,
} from "lucide-react";
import { useLocale } from "@/context/LocaleContext";

const WIZARD_STEPS = [
  { n: 0, label: "Cuenta",      eyebrow: "00", Icon: UserCircle,  hint: "Acceso" },
  { n: 1, label: "Asociación",  eyebrow: "01", Icon: Users,       hint: "Tu membresía" },
  { n: 2, label: "Tu Marca",    eyebrow: "02", Icon: Tag,         hint: "Identidad" },
  { n: 3, label: "Categorías",  eyebrow: "03", Icon: LayoutGrid,  hint: "Productos" },
  { n: 4, label: "Certificado", eyebrow: "04", Icon: ShieldCheck, hint: "Verificación" },
];

function SignInContent() {
  const searchParams = useSearchParams();
  const isVenderFlow = searchParams.get("vender") === "true";
  const { isAuthenticated, loading, user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;

    const redirectUrl = searchParams.get("redirect");
    const permisos = user?.permisos ?? [];

    router.replace(getPostLoginUrl(permisos, user?.id_productor, { isVenderFlow, redirectUrl }));
  }, [isAuthenticated, loading, isVenderFlow, user, router, searchParams]);

  /* ── Vender flow: wizard layout igual que sign-up ── */
  if (isVenderFlow) {
    const C = {
      bg:         isDark ? "#0B1610" : "#F4F0E3",
      card:       isDark ? "#111D14" : "#FFFFFF",
      section:    isDark ? "#162319" : "#F8F5EE",
      border:     isDark ? "rgba(200,169,122,0.16)" : "rgba(46,74,51,0.12)",
      heading:    isDark ? "#F4F0E3" : "#1F3A2E",
      body:       isDark ? "rgba(244,240,227,0.65)" : "rgba(31,58,46,0.65)",
      copper:     "#C97A3E",
      green:      "#2E4A33",
      cream:      "#F4F0E3",
      amber:      "#C89B4A",
      stepActive: "#C97A3E",
      stepFuture: isDark ? "rgba(200,169,122,0.18)" : "rgba(46,74,51,0.10)",
      stepLine:   isDark ? "rgba(200,169,122,0.14)" : "rgba(46,74,51,0.12)",
    };
    const SERIF = "'Cormorant Garamond', Georgia, serif";
    const SANS  = "'Manrope', 'DM Sans', sans-serif";
    const MONO  = "ui-monospace, 'SF Mono', Menlo, monospace";

    return (
      <div style={{ fontFamily: SANS }}>
        <TiendaHeader />
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 16px 48px" }}>

          {/* ── Dark green header ─────────────────────────────── */}
          <div style={{
            background: C.green, borderRadius: "16px 16px 0 0",
            padding: "clamp(16px,3vw,24px) clamp(20px,4vw,36px)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position:"absolute", right:"-40px", top:"-40px", width:"200px", height:"200px", borderRadius:"50%", border:"1px solid rgba(244,240,227,0.05)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", right:"30px", top:"30px", width:"110px", height:"110px", borderRadius:"50%", border:"1px solid rgba(244,240,227,0.05)", pointerEvents:"none" }} />
            <p style={{ fontFamily:MONO, color:C.copper, fontSize:"10px", fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase", margin:"0 0 8px" }}>
              Guardianas del Mezcal · Programa de Productores
            </p>
            <h1 style={{ fontFamily:SERIF, color:C.cream, fontSize:"clamp(20px,3.5vw,30px)", fontWeight:400, lineHeight:1.12, margin:"0 0 6px" }}>
              Únete como Productor
            </h1>
            <p style={{ fontFamily:SANS, color:"rgba(244,240,227,0.60)", fontSize:"13px", lineHeight:1.6, maxWidth:"500px", margin:0 }}>
              Completa los 4 pasos para publicar y vender tus productos artesanales.
            </p>
          </div>

          {/* ── Gold stripe ───────────────────────────────────── */}
          <div style={{ height:"3px", background:`linear-gradient(90deg,${C.copper},${C.amber} 50%,${C.copper})` }} />

          {/* ── Step indicator ────────────────────────────────── */}
          <div style={{ background:C.card, borderLeft:`1px solid ${C.border}`, borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:"12px clamp(16px,4vw,32px)" }}>
            <style>{`
              @media (max-width: 520px) {
                .si-step-label { display: none !important; }
                .si-step-hint  { display: none !important; }
              }
            `}</style>
            <div style={{ display:"flex", alignItems:"center" }}>
              {WIZARD_STEPS.map((s, i) => {
                const active = s.n === 0;
                const Icon = s.Icon;
                return (
                  <React.Fragment key={s.n}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
                      <div style={{
                        width:"36px", height:"36px", borderRadius:"50%", flexShrink:0,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        background: active ? C.stepActive : C.stepFuture,
                        border:`2px solid ${active ? C.stepActive : C.border}`,
                        boxShadow: active ? `0 0 0 3px ${isDark ? "rgba(201,122,62,0.18)" : "rgba(201,122,62,0.12)"}` : "none",
                      }}>
                        <Icon style={{ width:"14px", height:"14px", color: active ? C.cream : C.body }} />
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", lineHeight:1 }}>
                        <span className="si-step-label" style={{ fontFamily:SANS, fontSize:"12px", fontWeight: active ? 700 : 400, color: active ? C.copper : C.body }}>
                          {s.label}
                        </span>
                        <span className="si-step-hint" style={{ fontFamily:MONO, fontSize:"9px", color: active ? C.copper : C.body, letterSpacing:"0.12em", marginTop:"2px", opacity: active ? 1 : 0.5 }}>
                          {s.eyebrow} · {s.hint}
                        </span>
                      </div>
                    </div>
                    {i < WIZARD_STEPS.length - 1 && (
                      <div style={{ flex:1, height:"2px", margin:"0 10px", background:C.stepLine, borderRadius:"1px" }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <p style={{ fontFamily:MONO, fontSize:"10px", color:C.body, margin:"8px 0 0", letterSpacing:"0.12em" }}>
              PASO 0 DE 4 — CUENTA
            </p>
          </div>

          {/* ── Card body (form + imagen lado a lado) ─────────── */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 16px 16px", overflow:"hidden", display:"flex", minHeight:"420px" }}>

            {/* Columna izquierda: formulario */}
            <div style={{ flex:1, padding:"clamp(20px,3vw,32px)", overflowY:"auto" }}>
              <div style={{ marginBottom:"20px" }}>
                <p style={{ fontFamily:MONO, color:C.copper, fontSize:"10px", fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase", margin:"0 0 6px" }}>
                  00 · Acceso
                </p>
                <h2 style={{ fontFamily:SERIF, color:C.heading, fontSize:"clamp(18px,3vw,22px)", fontWeight:400, margin:"0 0 4px", lineHeight:1.15 }}>
                  Inicia sesión
                </h2>
                <p style={{ fontFamily:SANS, color:C.body, fontSize:"13px", lineHeight:1.6, margin:0 }}>
                  Inicia sesión para continuar con tu solicitud como productor.
                </p>
              </div>

              <GoogleSigninButton text="Continuar" redirectUrl="/dashboard/productor/solicitar" />

              <div style={{ margin:"20px 0", display:"flex", alignItems:"center", gap:"12px" }}>
                <span style={{ flex:1, height:"1px", background:C.border }} />
                <span style={{ fontFamily:SANS, fontSize:"11px", fontWeight:500, letterSpacing:"0.10em", textTransform:"uppercase", color:C.body, whiteSpace:"nowrap" }}>
                  O con correo electrónico
                </span>
                <span style={{ flex:1, height:"1px", background:C.border }} />
              </div>

              <SigninWithPassword isVenderFlow={true} />

              <div style={{ marginTop:"16px", textAlign:"center" }}>
                <p style={{ fontFamily:SANS, fontSize:"13px", color:C.body, margin:0 }}>
                  ¿No tienes cuenta?{" "}
                  <Link
                    href="/auth/sign-up?vender=true"
                    style={{ color:C.copper, textDecoration:"underline", textUnderlineOffset:"2px", fontWeight:600 }}
                  >
                    Crear cuenta
                  </Link>
                </p>
              </div>
            </div>

            {/* Columna derecha: imagen hero */}
            <div className="hidden lg:block" style={{ width:"38%", flexShrink:0, position:"relative" }}>
              <Image
                src="/images/login/gemmi.png"
                alt="Mezcal Oaxaca"
                fill
                priority
                className="object-cover"
              />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, rgba(0,0,0,0.55), rgba(0,0,0,0.18))" }} />
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", justifyContent:"flex-end", padding:"clamp(16px,3vw,28px)", paddingBottom:"clamp(20px,3vw,32px)" }}>
                <p style={{ color:"#86efac", fontSize:"10px", fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", margin:"0 0 8px" }}>
                  Marketplace Artesanal
                </p>
                <h3 style={{ color:"white", fontFamily:SERIF, fontSize:"clamp(18px,2.5vw,26px)", fontWeight:400, lineHeight:1.2, margin:"0 0 8px" }}>
                  Mezcal Oaxaqueño<br />
                  <span style={{ color:"#4ade80" }}>del corazón</span><br />
                  de México
                </h3>
                <p style={{ color:"rgba(255,255,255,0.6)", fontSize:"12px", lineHeight:1.6, margin:"0 0 14px", maxWidth:"200px" }}>
                  {t("Conectamos productores artesanales con amantes del buen mezcal en todo el mundo.")}
                </p>
                {(["Productores verificados", "Envíos a todo México", "Agaves oaxaqueños"] as const).map((f) => (
                  <div key={f} style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
                    <span style={{ width:"16px", height:"16px", borderRadius:"50%", background:"rgba(74,222,128,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"9px", color:"#86efac", fontWeight:700 }}>✓</span>
                    <span style={{ color:"rgba(255,255,255,0.75)", fontSize:"12px" }}>{t(f)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-gray-dark min-h-[calc(100vh-5rem)]">
      <div className="flex min-h-[calc(100vh-5rem)]">
        {/* Left: Form */}
        <div className="flex w-full flex-col justify-center lg:w-[45%] p-8 sm:p-12 xl:p-16">
          <Signin />
        </div>

        {/* Right: Hero */}
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
              {t("Marketplace Artesanal")}
            </p>
            <h2 className="text-5xl font-bold text-white leading-tight mb-4">
              Mezcal Oaxaqueño<br />
              <span className="text-green-400">del corazón</span><br />
              de México
            </h2>
            <p className="text-white/60 text-base max-w-xs leading-relaxed mb-8">
              {t("Conectamos productores artesanales con amantes del buen mezcal en todo el mundo.")}
            </p>
            <div className="flex flex-col gap-2.5">
              {([
                "Productores artesanales verificados",
                "Envíos a todo México y el mundo",
                "Variedad única de agaves oaxaqueños",
              ] as const).map((feat) => (
                <div key={feat} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500/25 text-green-300 text-xs font-bold">
                    ✓
                  </span>
                  <span className="text-white/75 text-sm">{t(feat)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
