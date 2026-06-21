"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useLocale } from "@/context/LocaleContext";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import {
  AlertCircle, CheckCircle2, Loader2, UploadIcon,
  Check, ChevronDown, ChevronUp, Users, Tag,
  LayoutGrid, ShieldCheck, ArrowRight, ArrowLeft,
  MapPin, Building2, FileText, X, UserCircle,
  Wine, FlaskConical, Landmark, UtensilsCrossed,
  Scissors, Hammer, Leaf, Palette, Package,
} from "lucide-react";
import SigninWithPassword from "@/components/Administrator/Auth/SigninWithPassword";
import { SignUpForm } from "@/app/auth/sign-up/_components/sign-up-form";

/* ─── Interfaces ─────────────────────────────────────────────────────────── */
interface Region    { id_region: number; nombre: string; estado_prov?: string; }
interface Categoria { id_categoria: number; nombre: string; descripcion?: string; id_padre?: number | null; }
interface Solicitud { id_productor: number; estado: string; motivo_rechazo?: string; }

/* ─── Category icons ─────────────────────────────────────────────────────── */
const CAT_ICONS: Record<string, React.ElementType> = {
  Bebidas:                Wine,
  "Mezcal artesanal":     FlaskConical,
  "Mezcal Ancestral":     Landmark,
  Alimentos:              UtensilsCrossed,
  Textiles:               Scissors,
  Artesanías:             Hammer,
  "Cosméticos y Bienestar": Leaf,
  "Arte y Cultura":       Palette,
};

/* ─── Steps ──────────────────────────────────────────────────────────────── */
const STEPS = [
  { n: 1, label: "Asociación",  eyebrow: "01", Icon: Users,       hint: "Tu membresía" },
  { n: 2, label: "Tu Marca",    eyebrow: "02", Icon: Tag,         hint: "Identidad" },
  { n: 3, label: "Categorías",  eyebrow: "03", Icon: LayoutGrid,  hint: "Productos" },
  { n: 4, label: "Certificado", eyebrow: "04", Icon: ShieldCheck, hint: "Verificación" },
];

const ALL_STEPS = [
  { n: 0, label: "Cuenta", eyebrow: "00", Icon: UserCircle, hint: "Acceso" },
  ...STEPS,
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function SolicitarPage() {
  const router  = useRouter();
  const { isAuthenticated, loading: authLoading, user: contextUser } = useAuth();
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const { t } = useLocale();
  const isDark = resolvedTheme === "dark";
  const user   = session?.user || contextUser;

  /* ── palette ──────────────────────────────────────────────────────────── */
  const C = {
    bg:          isDark ? "#0B1610" : "#F4F0E3",
    card:        isDark ? "#111D14" : "#FFFFFF",
    section:     isDark ? "#162319" : "#F8F5EE",
    border:      isDark ? "rgba(200,169,122,0.16)" : "rgba(46,74,51,0.12)",
    heading:     isDark ? "#F4F0E3" : "#1F3A2E",
    body:        isDark ? "rgba(244,240,227,0.65)" : "rgba(31,58,46,0.65)",
    label:       isDark ? "rgba(244,240,227,0.85)" : "#2E4A33",
    inputBg:     isDark ? "#0D1A10" : "#FFFFFF",
    inputBorder: isDark ? "rgba(200,169,122,0.20)" : "rgba(46,74,51,0.16)",
    inputText:   isDark ? "#F4F0E3" : "#1F3A2E",
    copper:      "#C97A3E",
    green:       "#2E4A33",
    cream:       "#F4F0E3",
    amber:       "#C89B4A",
    error:       isDark ? "#F87171" : "#B91C1C",
    errorBg:     isDark ? "rgba(239,68,68,0.09)" : "#FEF2F2",
    success:     isDark ? "#4ADE80" : "#15803D",
    successBg:   isDark ? "rgba(34,197,94,0.09)" : "#F0FDF4",
    stepPast:    "#2E4A33",
    stepActive:  "#C97A3E",
    stepFuture:  isDark ? "rgba(200,169,122,0.18)" : "rgba(46,74,51,0.10)",
    stepLine:    isDark ? "rgba(200,169,122,0.14)" : "rgba(46,74,51,0.12)",
  };
  const SERIF = "'Cormorant Garamond', Georgia, serif";
  const SANS  = "'Manrope', 'DM Sans', sans-serif";
  const MONO  = "ui-monospace, 'SF Mono', Menlo, monospace";

  /* ── state ────────────────────────────────────────────────────────────── */
  const [step, setStep]                   = useState(1);
  const [authTab, setAuthTab]             = useState<"login" | "register">("login");
  const [mostrarOtras, setMostrarOtras]   = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState(false);
  const [loadingInit, setLoadingInit]     = useState(true);
  const [solicitudActual, setSolicitudActual] = useState<Solicitud | null>(null);
  const [regiones, setRegiones]           = useState<Region[]>([]);
  const [categorias, setCategorias]       = useState<Categoria[]>([]);
  const [asociaciones, setAsociaciones]   = useState<string[]>([]);
  const [certificadoUrl, setCertificadoUrl] = useState("");
  const [uploading, setUploading]         = useState(false);
  const [noElegible, setNoElegible]       = useState(false);
  const [expandidas, setExpandidas]       = useState<number[]>([]);
  const [touched, setTouched]             = useState({ nombre_marca: false, rfc: false, produccion_cp: false });
  const [attempted, setAttempted]         = useState(false);
  const [focusedField, setFocusedField]   = useState<string | null>(null);
  const [dragActive, setDragActive]       = useState(false);
  const [otraAsocInput, setOtraAsocInput] = useState("");
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    rfc: "", razon_social: "", nombre_marca: "", asociacion: "",
    id_region: null as number | null,
    direccion_calle: "", direccion_cp: "", direccion_ciudad: "", direccion_estado: "",
    produccion_calle: "", produccion_cp: "", produccion_ciudad: "", produccion_estado: "Oaxaca",
    produccion_referencia: "",
    categorias_ids: [] as number[],
  });

  /* ── derived ──────────────────────────────────────────────────────────── */
  const RFC_REGEX = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/i;
  const rfcValido = RFC_REGEX.test(form.rfc.trim());

  const isOaxacaCP = (cp: string) => {
    if (!cp || cp.length < 5) return true;
    const n = parseInt(cp, 10);
    return n >= 68000 && n <= 71999;
  };
  const cpProdOk = isOaxacaCP(form.produccion_cp);

  const stepValid = [
    !!form.asociacion,
    !!form.nombre_marca.trim() && !!form.rfc.trim() && rfcValido && cpProdOk,
    form.categorias_ids.length > 0,
    !!certificadoUrl,
  ];
  const showErr = {
    asociacion:    step === 1 && attempted && !form.asociacion,
    nombre_marca:  step === 2 && (touched.nombre_marca || attempted) && !form.nombre_marca.trim(),
    rfc:           step === 2 && (touched.rfc || attempted) && (!form.rfc.trim() || !rfcValido),
    produccion_cp: step === 2 && (touched.produccion_cp || attempted) && !cpProdOk,
    categorias:    step === 3 && attempted && form.categorias_ids.length === 0,
  };

  /* ── category helpers ─────────────────────────────────────────────────── */
  const catRaiz   = categorias.filter(c => !c.id_padre);
  const subDe     = (pid: number) => categorias.filter(c => c.id_padre === pid);
  const tieneHijas= (id: number) => subDe(id).length > 0;
  const allLeaves = categorias.filter(c => !tieneHijas(c.id_categoria)).map(c => c.id_categoria);
  const allSel    = allLeaves.length > 0 && allLeaves.every(id => form.categorias_ids.includes(id));

  const toggleCat = (id: number) =>
    setForm(p => ({ ...p, categorias_ids: p.categorias_ids.includes(id)
      ? p.categorias_ids.filter(c => c !== id)
      : [...p.categorias_ids, id] }));

  const toggleExpandida = (id: number) =>
    setExpandidas(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const toggleAll = () => {
    setForm(p => ({ ...p, categorias_ids: allSel ? [] : allLeaves }));
    if (!allSel) setExpandidas(catRaiz.map(c => c.id_categoria));
  };

  /* ── init ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      // Mostrar paso 0 de registro/login en lugar de redirigir
      setStep(0);
      setLoadingInit(false);
      return;
    }

    // Usuario autenticado: avanzar desde paso 0 si venía del auth step
    setStep(s => s === 0 ? 1 : s);

    const init = async () => {
      try {
        const [regs, cats, asocs] = await Promise.all([
          api.productores.getRegiones(),
          api.categorias.getAll(),
          api.configuracion.getAsociaciones(),
        ]);
        setRegiones(regs as Region[]);
        setCategorias(cats as Categoria[]);
        setAsociaciones(Array.isArray(asocs) ? asocs : []);

        const token = getCookie("token") || (session as any)?.accessToken || "";
        try {
          const sol = await api.productores.getMiSolicitud(token) as any;
          if (sol?.id_productor) setSolicitudActual(sol as Solicitud);
        } catch { /* no solicitud */ }
      } catch (err) {
        setError(t("Error al cargar la información inicial."));
      } finally {
        setLoadingInit(false);
      }
    };
    init();
  }, [isAuthenticated, authLoading, router, session, user]);

  /* ── file upload ──────────────────────────────────────────────────────── */
  const uploadFile = async (file: File) => {
    if (file.size > 500 * 1024) { setError(t("El archivo debe pesar menos de 500 KB.")); return; }
    setUploading(true); setError("");
    try {
      const token = (session as any)?.accessToken || getCookie("token") || "";
      const fd = new FormData();
      fd.append("archivo", file);
      fd.append("entidad_tipo", "productor_certificado");
      fd.append("tipo", "certificado");
      const res = await api.archivos.upload(token, fd);
      setCertificadoUrl((res as any).url || `/${(res as any).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Error al subir el certificado"));
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  /* ── navigation ───────────────────────────────────────────────────────── */
  const goNext = () => {
    if (!stepValid[step - 1]) { setAttempted(true); return; }
    setAttempted(false); setError("");
    setStep(s => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    setAttempted(false); setError("");
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── submit ───────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!certificadoUrl) { setError(t("Sube el certificado primero")); return; }
    setIsSubmitting(true); setError("");
    try {
      const token = (session as any)?.accessToken || getCookie("token") || "";
      await api.productores.solicitar(token, {
        rfc: form.rfc || undefined,
        razon_social: form.razon_social || undefined,
        asociacion: form.asociacion || undefined,
        nombre_marca: form.nombre_marca || undefined,
        id_region: form.id_region ?? undefined,
        categorias_ids: form.categorias_ids,
        certificado_url: certificadoUrl || undefined,
        direccion_fiscal: form.direccion_calle ? {
          linea_1: form.direccion_calle, ciudad: form.direccion_ciudad,
          estado: form.direccion_estado, codigo_postal: form.direccion_cp, pais_iso2: "MX",
        } : undefined,
        direccion_produccion: form.produccion_calle ? {
          linea_1: form.produccion_calle, ciudad: form.produccion_ciudad,
          estado: form.produccion_estado, codigo_postal: form.produccion_cp,
          referencia: form.produccion_referencia, pais_iso2: "MX",
        } : undefined,
      } as any);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Error al enviar la solicitud"));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── input helper ─────────────────────────────────────────────────────── */
  const inp = (field: string, hasErr = false): React.CSSProperties => ({
    width: "100%", background: C.inputBg, boxSizing: "border-box",
    border: `1px solid ${hasErr ? C.error : focusedField === field ? C.copper : C.inputBorder}`,
    borderRadius: "8px", padding: "11px 14px", color: C.inputText,
    fontFamily: SANS, fontSize: "14px", outline: "none", transition: "border-color 0.2s",
  });

  const setField = (name: string, value: any) => setForm(p => ({ ...p, [name]: value }));

  /* ═══════════════════════ STATUS SCREENS ════════════════════════════════ */
  const keyframes = `
    @keyframes _spin { to { transform: rotate(360deg); } }
    ._spin { animation: _spin 1s linear infinite; }
    @keyframes _fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    ._fu { animation: _fadeUp 0.35s ease both; }
  `;

  if (authLoading || loadingInit) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"320px", gap:"16px" }}>
        <style>{keyframes}</style>
        <div className="_spin" style={{ width:"36px", height:"36px", borderRadius:"50%", border:`2px solid ${C.border}`, borderTopColor:C.copper }} />
        <p style={{ fontFamily:SANS, color:C.body, fontSize:"13px" }}>{t("Cargando...")}</p>
      </div>
    );
  }

  const StatusCard = ({ icon, iconBg, title, message, children }: {
    icon: React.ReactNode; iconBg: string; title: string; message?: string; children?: React.ReactNode;
  }) => (
    <div style={{ maxWidth:"500px", margin:"40px auto", padding:"0 16px" }}>
      <style>{keyframes}</style>
      <div style={{ height:"3px", background:`linear-gradient(90deg,${C.copper},${C.amber},${C.copper})`, borderRadius:"2px 2px 0 0" }} />
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 16px 16px", padding:"48px 40px", textAlign:"center" }}>
        <div style={{ width:"64px", height:"64px", borderRadius:"50%", background:iconBg, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>{icon}</div>
        <h2 style={{ fontFamily:SERIF, color:C.heading, fontSize:"28px", fontWeight:400, margin:"0 0 12px", lineHeight:1.15 }}>{title}</h2>
        {message && <p style={{ fontFamily:SANS, color:C.body, fontSize:"14px", lineHeight:1.75, margin:"0 0 28px" }}>{message}</p>}
        {children}
      </div>
    </div>
  );

  if (noElegible) return (
    <StatusCard icon={<AlertCircle style={{ width:"28px", height:"28px", color:"#D97706" }} />} iconBg="rgba(217,119,6,0.12)" title={t("No disponible con esta cuenta")} message={t("Esta cuenta ya realizó pedidos como cliente. Para vender en Tierra Agaves necesitas crear una cuenta dedicada a tu actividad como productor.")}>
      <div style={{ display:"flex", gap:"12px", justifyContent:"center", flexWrap:"wrap" }}>
        <button onClick={() => router.push("/cliente/producto")} style={{ background:"transparent", border:`1px solid ${C.inputBorder}`, borderRadius:"8px", padding:"11px 22px", fontFamily:SANS, fontSize:"13px", cursor:"pointer", color:C.label }}>{t("Volver a la tienda")}</button>
        <button onClick={() => router.push("/auth/sign-up?vender=true")} style={{ background:C.green, border:"none", borderRadius:"8px", padding:"11px 22px", fontFamily:SANS, fontSize:"13px", fontWeight:600, cursor:"pointer", color:C.cream }}>{t("Crear cuenta nueva")}</button>
      </div>
    </StatusCard>
  );

  if (solicitudActual) {
    if (solicitudActual.estado === "pendiente") return (
      <StatusCard icon={<Loader2 className="_spin" style={{ width:"28px", height:"28px", color:C.copper }} />} iconBg="rgba(201,122,62,0.12)" title={t("Solicitud en revisión")} message={t("Tu solicitud está siendo revisada por un administrador. Te notificaremos cuando haya una respuesta.")}>
        <button onClick={() => router.push("/cliente/producto")} style={{ background:C.green, border:"none", borderRadius:"8px", padding:"11px 24px", fontFamily:SANS, fontSize:"13px", fontWeight:600, cursor:"pointer", color:C.cream }}>{t("Volver a la tienda")}</button>
      </StatusCard>
    );
    if (solicitudActual.estado === "aprobado") return (
      <StatusCard icon={<CheckCircle2 style={{ width:"28px", height:"28px", color:"#15803D" }} />} iconBg="rgba(21,128,61,0.12)" title={t("¡Ya eres Productor!")} message={t("Tu solicitud fue aprobada. Ahora puedes publicar y vender tus productos en la plataforma.")}>
        <button onClick={() => router.push("/dashboard/productor")} style={{ background:C.green, border:"none", borderRadius:"8px", padding:"11px 24px", fontFamily:SANS, fontSize:"13px", fontWeight:600, cursor:"pointer", color:C.cream }}>{t("Ir a mi dashboard")}</button>
      </StatusCard>
    );
    if (solicitudActual.estado === "rechazado") return (
      <StatusCard icon={<AlertCircle style={{ width:"28px", height:"28px", color:"#B91C1C" }} />} iconBg="rgba(185,28,28,0.12)" title={t("Solicitud rechazada")} message={t("Tu solicitud fue rechazada por el siguiente motivo:")}>
        <div style={{ background:C.errorBg, border:`1px solid rgba(185,28,28,0.18)`, borderRadius:"8px", padding:"14px 16px", marginBottom:"24px", textAlign:"left" }}>
          <p style={{ fontFamily:SANS, color:C.error, fontSize:"13px", lineHeight:1.6, margin:0 }}>{solicitudActual.motivo_rechazo || "No especificado"}</p>
        </div>
        <button onClick={() => { setSolicitudActual(null); setStep(1); }} style={{ background:C.green, border:"none", borderRadius:"8px", padding:"11px 24px", fontFamily:SANS, fontSize:"13px", fontWeight:600, cursor:"pointer", color:C.cream }}>{t("Intentar de nuevo")}</button>
      </StatusCard>
    );
  }

  if (success) return (
    <StatusCard icon={<CheckCircle2 style={{ width:"28px", height:"28px", color:"#15803D" }} />} iconBg="rgba(21,128,61,0.12)" title={t("Solicitud enviada")} message={t("Tu solicitud ha sido enviada. Un administrador la revisará pronto y te notificaremos por correo.")}>
      <button onClick={() => router.push("/cliente/producto")} style={{ background:C.green, border:"none", borderRadius:"8px", padding:"11px 24px", fontFamily:SANS, fontSize:"13px", fontWeight:600, cursor:"pointer", color:C.cream }}>{t("Volver a la tienda")}</button>
    </StatusCard>
  );

  /* ═══════════════════════ MAIN WIZARD ═══════════════════════════════════ */
  const isLast = step === 4;

  return (
    <div style={{ maxWidth:"1000px", margin:"0 auto", padding:"48px 16px 40px", fontFamily:SANS }}>
      <style>{keyframes + `
        select option { background: ${C.card}; color: ${C.inputText}; }
        input::placeholder, textarea::placeholder { color: ${isDark ? "rgba(244,240,227,0.28)" : "rgba(31,58,46,0.30)"}; }
        .step-card { animation: _fadeUp 0.35s ease both; }
        @media (max-width: 520px) {
          .step-label { display: none !important; }
          .step-hint  { display: none !important; }
        }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ background:C.green, borderRadius:"16px 16px 0 0", padding:"clamp(16px,3vw,24px) clamp(20px,4vw,36px)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:"-40px", top:"-40px", width:"200px", height:"200px", borderRadius:"50%", border:"1px solid rgba(244,240,227,0.05)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", right:"30px", top:"30px", width:"110px", height:"110px", borderRadius:"50%", border:"1px solid rgba(244,240,227,0.05)", pointerEvents:"none" }} />
        <p style={{ fontFamily:MONO, color:C.copper, fontSize:"10px", fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase", margin:"0 0 8px" }}>
          {t("Guardianas del Mezcal · Programa de Productores")}
        </p>
        <h1 style={{ fontFamily:SERIF, color:C.cream, fontSize:"clamp(20px,3.5vw,30px)", fontWeight:400, lineHeight:1.12, margin:"0 0 6px" }}>
          {t("Únete como Productor")}
        </h1>
        <p style={{ fontFamily:SANS, color:"rgba(244,240,227,0.60)", fontSize:"13px", lineHeight:1.6, maxWidth:"500px", margin:0 }}>
          {t("Completa los 4 pasos para publicar y vender tus productos artesanales.")}
        </p>
      </div>

      {/* ── Gold stripe ───────────────────────────────────────────────── */}
      <div style={{ height:"3px", background:`linear-gradient(90deg,${C.copper},${C.amber} 50%,${C.copper})` }} />

      {/* ── Step indicator ────────────────────────────────────────────── */}
      <div style={{ background:C.card, borderLeft:`1px solid ${C.border}`, borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:"12px clamp(16px,4vw,32px)" }}>
        <div style={{ display:"flex", alignItems:"center" }}>
          {ALL_STEPS.map((s, i) => {
            const past   = step > s.n;
            const active = step === s.n;
            const Icon   = s.Icon;
            return (
              <React.Fragment key={s.n}>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
                  {/* circle */}
                  <div style={{
                    width:"36px", height:"36px", borderRadius:"50%", flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background: past ? C.stepPast : active ? C.stepActive : C.stepFuture,
                    border: `2px solid ${past ? C.stepPast : active ? C.stepActive : C.border}`,
                    transition:"all 0.3s ease",
                    boxShadow: active ? `0 0 0 3px ${isDark ? "rgba(201,122,62,0.18)" : "rgba(201,122,62,0.12)"}` : "none",
                  }}>
                    {past
                      ? <Check style={{ width:"13px", height:"13px", color:C.cream }} strokeWidth={2.5} />
                      : <Icon style={{ width:"14px", height:"14px", color: active ? C.cream : C.body }} />
                    }
                  </div>
                  {/* labels */}
                  <div style={{ display:"flex", flexDirection:"column", lineHeight:1 }}>
                    <span className="step-label" style={{ fontFamily:SANS, fontSize:"12px", fontWeight: active ? 700 : past ? 600 : 400, color: active ? C.copper : past ? C.heading : C.body, transition:"color 0.3s" }}>
                      {s.label}
                    </span>
                    <span className="step-hint" style={{ fontFamily:MONO, fontSize:"9px", color: active ? C.copper : C.body, letterSpacing:"0.12em", marginTop:"2px", opacity: active || past ? 1 : 0.5 }}>
                      {s.eyebrow} · {s.hint}
                    </span>
                  </div>
                </div>
                {i < ALL_STEPS.length - 1 && (
                  <div style={{ flex:1, height:"2px", margin:"0 10px",
                    background: past ? `linear-gradient(90deg,${C.stepPast},${step > s.n + 1 ? C.stepPast : C.border})` : C.stepLine,
                    transition:"background 0.3s", borderRadius:"1px" }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step counter */}
        <p style={{ fontFamily:MONO, fontSize:"10px", color:C.body, margin:"8px 0 0", letterSpacing:"0.12em" }}>
          {step === 0
            ? `${t("PASO")} 0 ${t("DE")} ${ALL_STEPS.length - 1} — ${t("CUENTA").toUpperCase()}`
            : `${t("PASO")} ${step} ${t("DE")} ${STEPS.length} — ${t(STEPS[step - 1]?.label ?? "").toUpperCase()}`
          }
        </p>
      </div>

      {/* ── Card body ─────────────────────────────────────────────────── */}
      <div className="step-card" style={{ background:C.card, border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 16px 16px", padding:"clamp(20px,3vw,32px)" }}>

        {/* Global error */}
        {error && (
          <div style={{ display:"flex", alignItems:"flex-start", gap:"10px", background:C.errorBg, border:`1px solid rgba(185,28,28,0.2)`, borderRadius:"8px", padding:"13px 16px", marginBottom:"28px" }}>
            <AlertCircle style={{ width:"15px", height:"15px", color:C.error, flexShrink:0, marginTop:"1px" }} />
            <span style={{ fontFamily:SANS, color:C.error, fontSize:"13px", lineHeight:1.5, flex:1 }}>{error}</span>
            <button onClick={() => setError("")} style={{ background:"none", border:"none", cursor:"pointer", padding:0, color:C.error }}><X style={{ width:"14px", height:"14px" }} /></button>
          </div>
        )}

        {/* ══════════════ STEP 0 — Cuenta / Acceso ═══════════════════ */}
        {step === 0 && (
          <div>
            <StepHeader
              eyebrow={t("00 · Acceso")} title={t("Tu Cuenta")}
              desc={t("Para continuar necesitas una cuenta. Inicia sesión si ya tienes una, o regístrate gratis.")}
              C={C} SERIF={SERIF} SANS={SANS} MONO={MONO}
            />

            {/* Tabs login / registro */}
            <div style={{ display:"flex", gap:"6px", marginBottom:"24px", background:C.section, borderRadius:"10px", padding:"4px" }}>
              {(["login", "register"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAuthTab(tab)}
                  style={{
                    flex:1, padding:"9px 16px", borderRadius:"7px", border:"none",
                    fontFamily:SANS, fontSize:"13px", fontWeight:600, cursor:"pointer",
                    transition:"all 0.2s",
                    background: authTab === tab ? C.green : "transparent",
                    color:       authTab === tab ? C.cream : C.body,
                    boxShadow:   authTab === tab ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                  }}
                >
                  {tab === "login" ? t("Ya tengo cuenta") : t("Crear cuenta nueva")}
                </button>
              ))}
            </div>

            {authTab === "login" ? (
              <SigninWithPassword isVenderFlow={true} onSuccess={() => setStep(1)} />
            ) : (
              <div style={{ background:C.section, borderRadius:"12px", padding:"20px" }}>
                <SignUpForm isVenderFlow={true} onSuccess={() => setStep(1)} />
              </div>
            )}
          </div>
        )}

        {/* ══════════════ STEP 1 — Asociación ════════════════════════ */}
        {step === 1 && (
          <div>
            <StepHeader
              eyebrow={t("01 · Requisito")} title={t("Tu Asociación")}
              desc={t("Selecciona la asociación de mezcaleros a la que perteneces. Este dato es requerido para validar tu actividad como productor.")}
              C={C} SERIF={SERIF} SANS={SANS} MONO={MONO}
            />

            {asociaciones.length === 0 ? (
              <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"20px 0" }}>
                <Loader2 className="_spin" style={{ width:"16px", height:"16px", color:C.copper }} />
                <span style={{ fontFamily:SANS, color:C.body, fontSize:"13px" }}>{t("Cargando asociaciones...")}</span>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {asociaciones.map(asoc => {
                    const sel = form.asociacion === asoc;
                    return (
                      <button key={asoc} type="button"
                        onClick={() => { setField("asociacion", sel ? "" : asoc); setOtraAsocInput(""); }}
                        style={{
                          display:"flex", alignItems:"center", gap:"14px",
                          background: sel ? (isDark ? "rgba(201,122,62,0.10)" : "rgba(46,74,51,0.05)") : C.section,
                          border:`1.5px solid ${sel ? C.copper : showErr.asociacion ? C.error : C.inputBorder}`,
                          borderRadius:"10px", padding:"14px 16px", cursor:"pointer", textAlign:"left", transition:"all 0.2s",
                        }}>
                        <span style={{ width:"18px", height:"18px", borderRadius:"50%", flexShrink:0, border:`2px solid ${sel ? C.copper : C.inputBorder}`, background: sel ? C.copper : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
                          {sel && <Check style={{ width:"10px", height:"10px", color:"#fff" }} strokeWidth={3} />}
                        </span>
                        <span style={{ fontFamily:SANS, color: sel ? (isDark ? C.cream : C.green) : C.label, fontSize:"14px", fontWeight: sel ? 600 : 400 }}>
                          {asoc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ── Otra asociación ─────────────────────────────────────── */}
                <div style={{ display:"flex", alignItems:"center", gap:"12px", margin:"8px 0 4px" }}>
                  <div style={{ flex:1, height:"1px", background:C.border }} />
                  <span style={{ fontFamily:SANS, color:C.body, fontSize:"10px", letterSpacing:"0.10em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                    {t("¿No perteneces a ninguna de las anteriores?")}
                  </span>
                  <div style={{ flex:1, height:"1px", background:C.border }} />
                </div>

                <div style={{
                  border:`1.5px solid ${otraAsocInput.trim() ? C.copper : C.inputBorder}`,
                  borderRadius:"10px", padding:"16px", background: otraAsocInput.trim() ? (isDark ? "rgba(201,122,62,0.07)" : "rgba(46,74,51,0.04)") : C.section,
                  transition:"all 0.2s",
                }}>
                  <p style={{ fontFamily:SANS, color:C.body, fontSize:"12.5px", lineHeight:1.65, margin:"0 0 12px" }}>
                    {t("Si eres del estado de Oaxaca y perteneces a una asociación que no aparece en la lista, escríbela aquí. El administrador la valorará al revisar tu solicitud.")}
                  </p>
                  <input
                    type="text"
                    value={otraAsocInput}
                    placeholder={t("Ej: Asociación de Mezcaleros de la Sierra Sur")}
                    maxLength={150}
                    style={inp("otra_asoc")}
                    onFocus={() => setFocusedField("otra_asoc")}
                    onBlur={() => setFocusedField(null)}
                    onChange={e => {
                      const val = e.target.value;
                      setOtraAsocInput(val);
                      setField("asociacion", val.trim());
                    }}
                  />
                  <FieldHint text={`${otraAsocInput.length}/150 ${t("caracteres")}`} C={C} SANS={SANS} />
                </div>
              </>
            )}
            {showErr.asociacion && <ErrMsg msg={t("Selecciona la asociación a la que perteneces o escribe una nueva")} C={C} SANS={SANS} />}
          </div>
        )}

        {/* ══════════════ STEP 2 — Tu Marca ══════════════════════════ */}
        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
            <StepHeader
              eyebrow={t("02 · Identidad")} title={t("Información de tu Marca")}
              desc={t("Estos datos identificarán tu tienda en la plataforma. Solo el nombre de marca es obligatorio.")}
              C={C} SERIF={SERIF} SANS={SANS} MONO={MONO}
            />

            {/* — Identidad principal — */}
            <Section title={t("Identidad")} C={C} SERIF={SERIF} SANS={SANS}>
              {/* Nombre de marca */}
              <div>
                <Label text={t("Nombre de marca")} required C={C} SANS={SANS} />
                <input
                  type="text" value={form.nombre_marca} maxLength={150}
                  placeholder={t("Ej: Mezcal Don Cosme")}
                  style={inp("nombre_marca", showErr.nombre_marca)}
                  onFocus={() => setFocusedField("nombre_marca")}
                  onBlur={() => { setFocusedField(null); setTouched(t => ({ ...t, nombre_marca:true })); }}
                  onChange={e => setField("nombre_marca", e.target.value)}
                />
                {showErr.nombre_marca
                  ? <ErrMsg msg={t("Escribe el nombre de tu marca")} C={C} SANS={SANS} />
                  : <FieldHint text={`${form.nombre_marca.length}/150 ${t("caracteres")}`} C={C} SANS={SANS} />
                }
              </div>

              {/* RFC */}
              <div>
                <Label text={t("RFC")} required C={C} SANS={SANS} />
                <input
                  type="text" value={form.rfc} maxLength={13}
                  placeholder="XAXX010101000"
                  style={{ ...inp("rfc", showErr.rfc), fontFamily: MONO, letterSpacing: "0.08em", textTransform: "uppercase" }}
                  onFocus={() => setFocusedField("rfc")}
                  onBlur={() => { setFocusedField(null); setTouched(t => ({ ...t, rfc: true })); }}
                  onChange={e => setField("rfc", e.target.value.toUpperCase().replace(/[^A-ZÑ&0-9]/g, ""))}
                />
                {showErr.rfc
                  ? <ErrMsg msg={!form.rfc.trim() ? t("El RFC es obligatorio para envíos y facturación") : t("RFC inválido. Formato: XXXX000000XX0 (ej: XAXX010101000)")} C={C} SANS={SANS} />
                  : <FieldHint text={`${form.rfc.length}/13 · ${t("Personas físicas: 13 chars · Personas morales: 12 chars")}`} C={C} SANS={SANS} />
                }
              </div>

            </Section>

            {/* — Región — */}
            <Section title={t("Región de origen")} C={C} SERIF={SERIF} SANS={SANS} subtitle={t("¿En qué comunidad o región produces tu mezcal?")}>
              <div>
                <Label text={t("Comunidad / Región")} C={C} SANS={SANS} />
                <div style={{ position:"relative" }}>
                  <MapPin style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", width:"14px", height:"14px", color:C.copper, pointerEvents:"none" }} />
                  <select value={form.id_region ?? ""} onChange={e => setField("id_region", e.target.value ? Number(e.target.value) : null)}
                    style={{ ...inp("region"), paddingLeft:"36px", appearance:"none", cursor:"pointer" }}
                    onFocus={() => setFocusedField("region")} onBlur={() => setFocusedField(null)}>
                    <option value="">{t("Selecciona una región...")}</option>
                    {regiones.map(r => (
                      <option key={r.id_region} value={r.id_region}>{r.nombre}{r.estado_prov ? ` — ${r.estado_prov}` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            {/* — Dirección de producción — */}
            <Section title={t("Dirección de producción")} C={C} SERIF={SERIF} SANS={SANS} subtitle={t("Ubicación donde elaboras tus productos (opcional).")}>
              <div>
                <Label text={t("Calle y número")} C={C} SANS={SANS} />
                <input type="text" value={form.produccion_calle} placeholder={t("Av. Principal 123")}
                  style={inp("prod_calle")} onFocus={() => setFocusedField("prod_calle")} onBlur={() => setFocusedField(null)}
                  onChange={e => setField("produccion_calle", e.target.value)}
                />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:"14px" }}>
                <div>
                  <Label text={t("Ciudad")} C={C} SANS={SANS} />
                  <input type="text" value={form.produccion_ciudad} placeholder={t("Matatlán")}
                    style={inp("prod_ciudad")} onFocus={() => setFocusedField("prod_ciudad")} onBlur={() => setFocusedField(null)}
                    onChange={e => setField("produccion_ciudad", e.target.value)}
                  />
                </div>
                <div>
                  <Label text={t("Estado")} C={C} SANS={SANS} />
                  <div style={{ position:"relative" }}>
                    <input
                      type="text"
                      value="Oaxaca"
                      readOnly
                      style={{ ...inp("prod_estado"), background: isDark ? "rgba(46,74,51,0.18)" : "rgba(46,74,51,0.06)", color: C.green, fontWeight:600, cursor:"not-allowed", paddingRight:"32px" }}
                    />
                    <span style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", fontSize:"11px", color:C.copper, fontWeight:700, pointerEvents:"none" }}>
                      OAX
                    </span>
                  </div>
                </div>
                <div>
                  <Label text={t("C.P.")} C={C} SANS={SANS} />
                  <input
                    type="text"
                    value={form.produccion_cp}
                    placeholder="68000"
                    maxLength={5}
                    style={inp("prod_cp", showErr.produccion_cp)}
                    onFocus={() => setFocusedField("prod_cp")}
                    onBlur={() => { setFocusedField(null); setTouched(t => ({ ...t, produccion_cp: true })); }}
                    onChange={e => setField("produccion_cp", e.target.value.replace(/\D/g, ""))}
                  />
                  {showErr.produccion_cp && (
                    <ErrMsg msg={t("El C.P. debe corresponder al estado de Oaxaca (68000–71999)")} C={C} SANS={SANS} />
                  )}
                </div>
              </div>
              <div>
                <Label text={t("Referencia")} C={C} SANS={SANS} />
                <textarea
                  value={form.produccion_referencia}
                  placeholder={t("Entre calles, puntos de referencia...")}
                  maxLength={150}
                  rows={3}
                  style={{ ...inp("prod_ref"), resize: "vertical", minHeight: "80px" }}
                  onFocus={() => setFocusedField("prod_ref")}
                  onBlur={() => setFocusedField(null)}
                  onChange={e => setField("produccion_referencia", e.target.value)}
                />
                <FieldHint text={`${form.produccion_referencia.length}/150 ${t("caracteres")}`} C={C} SANS={SANS} />
              </div>
            </Section>
          </div>
        )}

        {/* ══════════════ STEP 3 — Categorías ════════════════════════ */}
        {step === 3 && (() => {
          const mezcal      = catRaiz.find(c => c.nombre.toLowerCase() === "mezcal" || c.nombre.toLowerCase() === "bebidas");
          const hijasMezcal = mezcal ? subDe(mezcal.id_categoria) : [];
          const otrosCats   = catRaiz.filter(c => c.id_categoria !== mezcal?.id_categoria);
          const anyMezcal   = (mezcal ? form.categorias_ids.includes(mezcal.id_categoria) : false) ||
                              hijasMezcal.some(h => form.categorias_ids.includes(h.id_categoria));
          const anyOtros    = otrosCats.some(c => {
            const hijas = subDe(c.id_categoria);
            return form.categorias_ids.includes(c.id_categoria) || hijas.some(h => form.categorias_ids.includes(h.id_categoria));
          });

          return (
            <div>
              <StepHeader
                eyebrow={t("03 · Oferta")} title={t("Categorías de Productos")}
                desc={t("Selecciona las categorías de lo que vas a vender. Puedes elegir varias.")}
                C={C} SERIF={SERIF} SANS={SANS} MONO={MONO}
              />

              {categorias.length === 0 ? (
                <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"24px 0" }}>
                  <Loader2 className="_spin" style={{ width:"16px", height:"16px", color:C.copper }} />
                  <span style={{ fontFamily:SANS, color:C.body, fontSize:"13px" }}>{t("Cargando categorías...")}</span>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

                  {/* ── Mezcal (primaria, siempre expandida) ────────────── */}
                  {mezcal && (
                    <div style={{ border:`1.5px solid ${anyMezcal ? C.copper : showErr.categorias ? C.error : C.inputBorder}`, borderRadius:"12px", overflow:"hidden", transition:"border-color 0.2s" }}>
                      {/* cabecera */}
                      <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 16px", background: anyMezcal ? (isDark ? "rgba(201,122,62,0.12)" : "rgba(46,74,51,0.06)") : C.section }}>
                        <CatIcon Icon={Wine} selected={anyMezcal} isDark={isDark} />
                        <div style={{ flex:1 }}>
                          <span style={{ fontFamily:SANS, color: anyMezcal ? (isDark ? C.cream : C.green) : C.label, fontSize:"14px", fontWeight:700 }}>
                            {mezcal.nombre}
                          </span>
                          <span style={{ fontFamily:SANS, color:C.body, fontSize:"11px", marginLeft:"8px" }}>
                            · {t("Categoría principal")}
                          </span>
                        </div>
                        {anyMezcal && (
                          <span style={{ fontFamily:SANS, color:C.copper, fontSize:"11px", fontWeight:600 }}>
                            {hijasMezcal.length > 0
                              ? `${hijasMezcal.filter(h => form.categorias_ids.includes(h.id_categoria)).length} ${t("selec.")}`
                              : t("seleccionado")
                            }
                          </span>
                        )}
                      </div>

                      {/* subcategorías (o selección directa si no hay hijas) */}
                      <div style={{ borderTop:`1px solid ${C.border}` }}>
                        {hijasMezcal.length > 0 ? (
                          hijasMezcal.map((h, idx) => {
                            const hSel = form.categorias_ids.includes(h.id_categoria);
                            return (
                              <button key={h.id_categoria} type="button" onClick={() => toggleCat(h.id_categoria)}
                                style={{
                                  display:"flex", alignItems:"center", gap:"12px",
                                  background: hSel ? (isDark ? "rgba(201,122,62,0.08)" : "rgba(46,74,51,0.05)") : "transparent",
                                  border:"none",
                                  borderBottom: idx < hijasMezcal.length - 1 ? `1px solid ${C.border}` : "none",
                                  cursor:"pointer", padding:"11px 16px 11px 20px", width:"100%", textAlign:"left",
                                  transition:"background 0.15s",
                                }}>
                                <div style={{
                                  width:"18px", height:"18px", borderRadius:"4px", flexShrink:0,
                                  border:`2px solid ${hSel ? C.copper : C.inputBorder}`,
                                  background: hSel ? C.copper : "transparent",
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  transition:"all 0.2s",
                                }}>
                                  {hSel && <Check style={{ width:"10px", height:"10px", color:"#fff" }} strokeWidth={3} />}
                                </div>
                                <span style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                                  <span style={{ fontFamily:SANS, color: hSel ? (isDark ? C.cream : C.green) : C.label, fontSize:"13.5px", fontWeight: hSel ? 600 : 400 }}>
                                    {h.nombre}
                                  </span>
                                  <span style={{ fontFamily:SANS, color:C.body, fontSize:"11px", opacity:0.7 }}>
                                    · {t("Subcategoría")}
                                  </span>
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          /* sin subcategorías: la categoría misma es seleccionable */
                          <button type="button" onClick={() => toggleCat(mezcal.id_categoria)}
                            style={{
                              display:"flex", alignItems:"center", gap:"12px",
                              background: form.categorias_ids.includes(mezcal.id_categoria) ? (isDark ? "rgba(201,122,62,0.08)" : "rgba(46,74,51,0.05)") : "transparent",
                              border:"none", cursor:"pointer", padding:"11px 16px 11px 20px", width:"100%", textAlign:"left",
                              transition:"background 0.15s",
                            }}>
                            <div style={{
                              width:"18px", height:"18px", borderRadius:"4px", flexShrink:0,
                              border:`2px solid ${form.categorias_ids.includes(mezcal.id_categoria) ? C.copper : C.inputBorder}`,
                              background: form.categorias_ids.includes(mezcal.id_categoria) ? C.copper : "transparent",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              transition:"all 0.2s",
                            }}>
                              {form.categorias_ids.includes(mezcal.id_categoria) && <Check style={{ width:"10px", height:"10px", color:"#fff" }} strokeWidth={3} />}
                            </div>
                            <span style={{ fontFamily:SANS, color: form.categorias_ids.includes(mezcal.id_categoria) ? (isDark ? C.cream : C.green) : C.label, fontSize:"13.5px", fontWeight: form.categorias_ids.includes(mezcal.id_categoria) ? 600 : 400 }}>
                              {mezcal.nombre}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Otras categorías (colapsable) ───────────────────── */}
                  {otrosCats.length > 0 && (
                    <div style={{ border:`1.5px solid ${anyOtros && mostrarOtras ? C.copper : C.inputBorder}`, borderRadius:"12px", overflow:"hidden", transition:"border-color 0.2s" }}>
                      {/* toggle header */}
                      <button type="button" onClick={() => setMostrarOtras(v => !v)}
                        style={{
                          width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                          background: anyOtros ? (isDark ? "rgba(201,122,62,0.08)" : "rgba(46,74,51,0.04)") : C.section,
                          border:"none", cursor:"pointer", padding:"12px 16px", textAlign:"left",
                        }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                          <Package style={{ width:"16px", height:"16px", color: anyOtros ? C.copper : C.body }} />
                          <span style={{ fontFamily:SANS, color: anyOtros ? (isDark ? C.cream : C.green) : C.label, fontSize:"14px", fontWeight:600 }}>
                            {t("Otras categorías")}
                          </span>
                          {anyOtros && (
                            <span style={{ fontFamily:SANS, color:C.copper, fontSize:"11px", fontWeight:600 }}>
                              · {t("tienes selecciones")}
                            </span>
                          )}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px", color:C.body }}>
                          <span style={{ fontFamily:SANS, fontSize:"11px", color:C.body }}>{otrosCats.length} {t("categorías")}</span>
                          {mostrarOtras
                            ? <ChevronUp style={{ width:"14px", height:"14px" }} />
                            : <ChevronDown style={{ width:"14px", height:"14px" }} />}
                        </div>
                      </button>

                      {/* contenido colapsable */}
                      {mostrarOtras && (
                        <div style={{ borderTop:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:"0" }}>
                          {otrosCats.map((cat, catIdx) => {
                            const hijas     = subDe(cat.id_categoria);
                            const expanded  = expandidas.includes(cat.id_categoria);
                            const CatIconEl = CAT_ICONS[cat.nombre] ?? Package;

                            if (hijas.length > 0) {
                              const anyChild = form.categorias_ids.includes(cat.id_categoria) || hijas.some(h => form.categorias_ids.includes(h.id_categoria));
                              return (
                                <div key={cat.id_categoria} style={{ borderBottom: catIdx < otrosCats.length - 1 ? `1px solid ${C.border}` : "none" }}>
                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background: anyChild ? (isDark ? "rgba(201,122,62,0.06)" : "rgba(201,122,62,0.03)") : "transparent" }}>
                                    <button type="button" onClick={() => toggleCat(cat.id_categoria)}
                                      style={{ display:"flex", alignItems:"center", gap:"10px", background:"none", border:"none", cursor:"pointer", padding:"10px 16px", flex:1, textAlign:"left" }}>
                                      <Radio checked={form.categorias_ids.includes(cat.id_categoria)} C={C} />
                                      <CatIcon Icon={CatIconEl} selected={anyChild} isDark={isDark} />
                                      <span style={{ fontFamily:SANS, color: anyChild ? (isDark ? C.cream : C.green) : C.label, fontSize:"13.5px", fontWeight: anyChild ? 600 : 400 }}>
                                        {cat.nombre}
                                      </span>
                                    </button>
                                    <button type="button" onClick={() => toggleExpandida(cat.id_categoria)}
                                      style={{ background:"none", border:"none", cursor:"pointer", padding:"10px 16px", display:"flex", alignItems:"center", gap:"5px", color:C.body }}>
                                      <span style={{ fontFamily:SANS, fontSize:"11px" }}>{hijas.length} {t("tipos")}</span>
                                      {expanded ? <ChevronUp style={{ width:"12px", height:"12px" }} /> : <ChevronDown style={{ width:"12px", height:"12px" }} />}
                                    </button>
                                  </div>
                                  {expanded && (
                                    <div style={{ background: isDark ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.02)", borderTop:`1px solid ${C.border}` }}>
                                      {hijas.map(h => {
                                        const hSel = form.categorias_ids.includes(h.id_categoria);
                                        return (
                                          <button key={h.id_categoria} type="button" onClick={() => toggleCat(h.id_categoria)}
                                            style={{ display:"flex", alignItems:"center", gap:"10px", background: hSel ? (isDark ? "rgba(201,122,62,0.06)" : "rgba(201,122,62,0.04)") : "none", border:"none", borderBottom:`1px solid ${C.border}`, cursor:"pointer", padding:"8px 16px 8px 44px", width:"100%", textAlign:"left", transition:"background 0.15s" }}>
                                            <Radio checked={hSel} C={C} size={14} />
                                            <span style={{ fontFamily:SANS, color: hSel ? (isDark ? C.cream : C.green) : C.body, fontSize:"13px", fontWeight: hSel ? 600 : 400 }}>
                                              {h.nombre}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            const sel = form.categorias_ids.includes(cat.id_categoria);
                            return (
                              <button key={cat.id_categoria} type="button" onClick={() => toggleCat(cat.id_categoria)}
                                style={{ display:"flex", alignItems:"center", gap:"12px", background: sel ? (isDark ? "rgba(201,122,62,0.08)" : "rgba(201,122,62,0.03)") : "transparent", border:"none", borderBottom: catIdx < otrosCats.length - 1 ? `1px solid ${C.border}` : "none", cursor:"pointer", padding:"10px 16px", textAlign:"left", transition:"all 0.2s", width:"100%" }}>
                                <Radio checked={sel} C={C} />
                                <CatIcon Icon={CatIconEl} selected={sel} isDark={isDark} />
                                <span style={{ fontFamily:SANS, color: sel ? (isDark ? C.cream : C.green) : C.label, fontSize:"14px", fontWeight: sel ? 600 : 400 }}>
                                  {cat.nombre}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* feedback */}
              <div style={{ marginTop:"14px" }}>
                {showErr.categorias
                  ? <ErrMsg msg={t("Selecciona al menos una categoría")} C={C} SANS={SANS} />
                  : form.categorias_ids.length > 0 && (
                    <p style={{ fontFamily:SANS, color:C.success, fontSize:"12px", display:"flex", alignItems:"center", gap:"6px", margin:0 }}>
                      <CheckCircle2 style={{ width:"12px", height:"12px" }} />
                      {form.categorias_ids.length} {form.categorias_ids.length === 1 ? t("categoría") : t("categorías")} seleccionada{form.categorias_ids.length > 1 ? "s" : ""}
                    </p>
                  )}
              </div>
            </div>
          );
        })()}

        {/* ══════════════ STEP 4 — Certificado ═══════════════════════ */}
        {step === 4 && (
          <div>
            <StepHeader
              eyebrow={t("04 · Verificación")} title={t("Certificado de Origen")}
              desc={t("Sube tu documento de verificación. Máximo 500 KB.")}
              C={C} SERIF={SERIF} SANS={SANS} MONO={MONO}
            />

            {certificadoUrl ? (
              /* success state */
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:C.successBg, border:`1px solid rgba(21,128,61,0.22)`, borderRadius:"12px", padding:"18px 20px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                  <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:"rgba(21,128,61,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <CheckCircle2 style={{ width:"18px", height:"18px", color:C.success }} />
                  </div>
                  <div>
                    <p style={{ fontFamily:SANS, color:C.success, fontSize:"14px", fontWeight:600, margin:0 }}>{t("Certificado subido correctamente")}</p>
                    <p style={{ fontFamily:SANS, color:C.body, fontSize:"12px", margin:"2px 0 0" }}>{t("El archivo está listo para enviar")}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setCertificadoUrl("")}
                  style={{ background:"none", border:`1px solid ${C.inputBorder}`, borderRadius:"6px", cursor:"pointer", fontFamily:SANS, color:C.error, fontSize:"12px", padding:"6px 12px" }}>
                  {t("Cambiar")}
                </button>
              </div>
            ) : (
              /* drop zone */
              <div
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border:`2px dashed ${dragActive ? C.copper : C.inputBorder}`,
                  borderRadius:"14px", background: dragActive ? (isDark ? "rgba(201,122,62,0.06)" : "rgba(201,122,62,0.03)") : C.section,
                  padding:"36px 24px", cursor:"pointer", textAlign:"center",
                  transition:"all 0.2s",
                }}>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} style={{ display:"none" }} />
                {uploading ? (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"14px" }}>
                    <Loader2 className="_spin" style={{ width:"32px", height:"32px", color:C.copper }} />
                    <p style={{ fontFamily:SANS, color:C.body, fontSize:"14px", margin:0 }}>{t("Subiendo archivo...")}</p>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"10px" }}>
                    <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:`rgba(201,122,62,0.10)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <UploadIcon style={{ width:"22px", height:"22px", color:C.copper }} />
                    </div>
                    <p style={{ fontFamily:SANS, color:C.label, fontSize:"15px", margin:0 }}>
                      <span style={{ color:C.copper, fontWeight:700 }}>{t("Haz clic para subir")}</span> {t("o arrastra aquí")}
                    </p>
                    <p style={{ fontFamily:SANS, color:C.body, fontSize:"12px", margin:0 }}>{t("PDF, JPG, PNG · máx. 500 KB")}</p>
                  </div>
                )}
              </div>
            )}

            {/* Summary before submit */}
            <div style={{ marginTop:"28px", background:C.section, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"20px 22px" }}>
              <p style={{ fontFamily:MONO, fontSize:"10px", color:C.copper, letterSpacing:"0.18em", textTransform:"uppercase", margin:"0 0 14px" }}>
                {t("Resumen de tu solicitud")}
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {[
                  { label:t("Asociación"),  val: form.asociacion || "—",               ok: !!form.asociacion },
                  { label:t("Marca"),       val: form.nombre_marca || "—",             ok: !!form.nombre_marca },
                  { label:t("Categorías"),  val: form.categorias_ids.length > 0 ? `${form.categorias_ids.length} seleccionada${form.categorias_ids.length > 1 ? "s" : ""}` : "—", ok: form.categorias_ids.length > 0 },
                  { label:t("Certificado"), val: certificadoUrl ? t("Subido") : t("Pendiente"), ok: !!certificadoUrl },
                ].map(row => (
                  <div key={row.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px" }}>
                    <span style={{ fontFamily:SANS, color:C.body, fontSize:"13px" }}>{row.label}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <span style={{ fontFamily:SANS, color: row.ok ? C.heading : C.body, fontSize:"13px", fontWeight: row.ok ? 600 : 400 }}>{row.val}</span>
                      {row.ok
                        ? <CheckCircle2 style={{ width:"13px", height:"13px", color:C.success, flexShrink:0 }} />
                        : <div style={{ width:"13px", height:"13px", borderRadius:"50%", border:`1.5px solid ${C.border}`, flexShrink:0 }} />
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation buttons (solo para pasos 1-4) ─────────────── */}
        {step > 0 && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"24px", paddingTop:"16px", borderTop:`1px solid ${C.border}` }}>
            <button type="button" onClick={step === 1 ? () => router.push("/cliente/producto") : goPrev}
              style={{ display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1px solid ${C.inputBorder}`, borderRadius:"8px", padding:"11px 22px", fontFamily:SANS, fontSize:"13px", fontWeight:500, color:C.label, cursor:"pointer" }}>
              <ArrowLeft style={{ width:"14px", height:"14px" }} />
              {step === 1 ? t("Cancelar") : t("Anterior")}
            </button>

            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              {/* step dots (solo pasos 1-4) */}
              {STEPS.map(s => (
                <div key={s.n} style={{ width: step === s.n ? "20px" : "6px", height:"6px", borderRadius:"3px", background: step === s.n ? C.copper : stepValid[s.n - 1] ? C.stepPast : C.border, transition:"all 0.3s ease" }} />
              ))}
            </div>

            {isLast ? (
              <button type="button" onClick={handleSubmit}
                disabled={isSubmitting || uploading || !certificadoUrl}
                style={{ display:"flex", alignItems:"center", gap:"8px", background:(isSubmitting || uploading || !certificadoUrl) ? "rgba(46,74,51,0.45)" : C.green, color:C.cream, border:"none", borderRadius:"8px", padding:"11px 26px", fontFamily:SANS, fontSize:"13px", fontWeight:600, letterSpacing:"0.04em", cursor:(isSubmitting || uploading || !certificadoUrl) ? "not-allowed" : "pointer", transition:"background 0.2s" }}>
                {isSubmitting
                  ? <><Loader2 className="_spin" style={{ width:"14px", height:"14px" }} />{t("Enviando...")}</>
                  : t("Enviar Solicitud")
                }
              </button>
            ) : (
              <button type="button" onClick={goNext}
                style={{ display:"flex", alignItems:"center", gap:"8px", background:C.green, color:C.cream, border:"none", borderRadius:"8px", padding:"11px 26px", fontFamily:SANS, fontSize:"13px", fontWeight:600, letterSpacing:"0.04em", cursor:"pointer" }}>
                {t("Siguiente")}
                <ArrowRight style={{ width:"14px", height:"14px" }} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tiny shared sub-components ─────────────────────────────────────────── */

function StepHeader({ eyebrow, title, desc, C, SERIF, SANS, MONO }: {
  eyebrow: string; title: string; desc?: string;
  C: any; SERIF: string; SANS: string; MONO: string;
}) {
  return (
    <div style={{ marginBottom:"16px" }}>
      <p style={{ fontFamily:MONO, color:C.copper, fontSize:"10px", fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase", margin:"0 0 6px" }}>{eyebrow}</p>
      <h2 style={{ fontFamily:SERIF, color:C.heading, fontSize:"clamp(18px,3vw,24px)", fontWeight:400, margin:"0 0 6px", lineHeight:1.15 }}>{title}</h2>
      {desc && <p style={{ fontFamily:SANS, color:C.body, fontSize:"13.5px", lineHeight:1.7, margin:0 }}>{desc}</p>}
    </div>
  );
}

function Section({ title, subtitle, children, C, SERIF, SANS }: {
  title: string; subtitle?: string; children: React.ReactNode;
  C: any; SERIF: string; SANS: string;
}) {
  return (
    <div style={{ border:`1px solid ${C.border}`, borderRadius:"12px", overflow:"hidden" }}>
      <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, background:C.section }}>
        <p style={{ fontFamily:SERIF, color:C.heading, fontSize:"15px", fontWeight:500, margin:"0 0 2px" }}>{title}</p>
        {subtitle && <p style={{ fontFamily:SANS, color:C.body, fontSize:"12px", margin:0 }}>{subtitle}</p>}
      </div>
      <div style={{ padding:"20px 18px", display:"flex", flexDirection:"column", gap:"16px" }}>
        {children}
      </div>
    </div>
  );
}

function Label({ text, required, C, SANS }: { text: string; required?: boolean; C: any; SANS: string }) {
  return (
    <p style={{ fontFamily:SANS, color:C.label, fontSize:"12.5px", fontWeight:600, margin:"0 0 6px", letterSpacing:"0.01em" }}>
      {text}{required && <span style={{ color:C.copper, marginLeft:"3px" }}>*</span>}
    </p>
  );
}

function ErrMsg({ msg, C, SANS }: { msg: string; C: any; SANS: string }) {
  return (
    <p style={{ fontFamily:SANS, color:C.error, fontSize:"11.5px", marginTop:"6px", display:"flex", alignItems:"center", gap:"5px", margin:"6px 0 0" }}>
      <AlertCircle style={{ width:"11px", height:"11px", flexShrink:0 }} />{msg}
    </p>
  );
}

function FieldHint({ text, C, SANS }: { text: string; C: any; SANS: string }) {
  return <p style={{ fontFamily:SANS, color:C.body, fontSize:"11px", margin:"5px 0 0", opacity:0.7 }}>{text}</p>;
}

function Radio({ checked, C, size = 16 }: { checked: boolean; C: any; size?: number }) {
  return (
    <span style={{ width:`${size}px`, height:`${size}px`, borderRadius:"50%", flexShrink:0, border:`2px solid ${checked ? C.copper : C.inputBorder}`, background: checked ? C.copper : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", }}>
      {checked && <Check style={{ width:`${size * 0.6}px`, height:`${size * 0.6}px`, color:"#fff" }} strokeWidth={3} />}
    </span>
  );
}

function CatIcon({ Icon, selected, isDark }: { Icon: React.ElementType; selected: boolean; isDark: boolean }) {
  return (
    <div style={{
      width: "34px", height: "34px", borderRadius: "8px", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: selected
        ? "rgba(201,122,62,0.14)"
        : isDark ? "rgba(46,74,51,0.30)" : "rgba(46,74,51,0.07)",
      border: `1px solid ${selected ? "rgba(201,122,62,0.30)" : "rgba(46,74,51,0.12)"}`,
      transition: "all 0.2s",
    }}>
      <Icon
        style={{
          width: "15px", height: "15px",
          color: selected ? "#C97A3E" : "#2E4A33",
          strokeWidth: 1.6,
          transition: "color 0.2s",
        }}
      />
    </div>
  );
}
