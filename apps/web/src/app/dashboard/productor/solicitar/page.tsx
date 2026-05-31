"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import {
  AlertCircle, CheckCircle2, Loader2, UploadIcon,
  Check, ChevronDown, ChevronUp, Users, Tag,
  LayoutGrid, ShieldCheck, ArrowRight, ArrowLeft,
  MapPin, Building2, FileText, X,
  Wine, FlaskConical, Landmark, UtensilsCrossed,
  Scissors, Hammer, Leaf, Palette, Package,
} from "lucide-react";

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

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function SolicitarPage() {
  const router  = useRouter();
  const { isAuthenticated, loading: authLoading, user: contextUser } = useAuth();
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
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
  const [touched, setTouched]             = useState({ nombre_marca: false });
  const [attempted, setAttempted]         = useState(false);
  const [focusedField, setFocusedField]   = useState<string | null>(null);
  const [dragActive, setDragActive]       = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    rfc: "", razon_social: "", nombre_marca: "", asociacion: "",
    id_region: null as number | null,
    direccion_calle: "", direccion_cp: "", direccion_ciudad: "", direccion_estado: "",
    produccion_calle: "", produccion_cp: "", produccion_ciudad: "", produccion_estado: "",
    produccion_referencia: "",
    categorias_ids: [] as number[],
  });

  /* ── derived ──────────────────────────────────────────────────────────── */
  const stepValid = [
    !!form.asociacion,
    !!form.nombre_marca.trim(),
    form.categorias_ids.length > 0,
    !!certificadoUrl,
  ];
  const showErr = {
    asociacion:   step === 1 && attempted && !form.asociacion,
    nombre_marca: step === 2 && (touched.nombre_marca || attempted) && !form.nombre_marca.trim(),
    categorias:   step === 3 && attempted && form.categorias_ids.length === 0,
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
    if (!isAuthenticated) { router.push("/auth/sign-in"); return; }

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

        let token = getCookie("token") || (session as any)?.accessToken;
        if (!token) { await new Promise(r => setTimeout(r, 300)); token = getCookie("token") || (session as any)?.accessToken; }

        if (token) {
          const userId = (user as any)?.id_usuario || (user as any)?.id;
          if (userId) {
            try {
              const sol = await api.productores.getMiSolicitud(token) as any;
              if (sol?.id_productor) setSolicitudActual(sol as Solicitud);
            } catch { /* no solicitud */ }
          }
        }
      } catch (err) {
        setError("Error al cargar la información inicial.");
      } finally {
        setLoadingInit(false);
      }
    };
    init();
  }, [isAuthenticated, authLoading, router, session, user]);

  /* ── file upload ──────────────────────────────────────────────────────── */
  const uploadFile = async (file: File) => {
    if (file.size > 500 * 1024) { setError("El archivo debe pesar menos de 500 KB."); return; }
    setUploading(true); setError("");
    try {
      const token = (session as any)?.accessToken || getCookie("token");
      if (!token) { setError("No se detectó sesión."); return; }
      const fd = new FormData();
      fd.append("archivo", file);
      fd.append("entidad_tipo", "productor_certificado");
      fd.append("tipo", "certificado");
      const res = await api.archivos.upload(token, fd);
      setCertificadoUrl((res as any).url || `/${(res as any).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el certificado");
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
    if (!certificadoUrl) { setError("Sube el certificado primero"); return; }
    setIsSubmitting(true); setError("");
    try {
      const token = (session as any)?.accessToken || getCookie("token");
      if (!token) { setError("No se detectó sesión."); return; }
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
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud");
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
        <p style={{ fontFamily:SANS, color:C.body, fontSize:"13px" }}>Cargando...</p>
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
    <StatusCard icon={<AlertCircle style={{ width:"28px", height:"28px", color:"#D97706" }} />} iconBg="rgba(217,119,6,0.12)" title="No disponible con esta cuenta" message="Esta cuenta ya realizó pedidos como cliente. Para vender en Tierra Agaves necesitas crear una cuenta dedicada a tu actividad como productor.">
      <div style={{ display:"flex", gap:"12px", justifyContent:"center", flexWrap:"wrap" }}>
        <button onClick={() => router.push("/cliente/producto")} style={{ background:"transparent", border:`1px solid ${C.inputBorder}`, borderRadius:"8px", padding:"11px 22px", fontFamily:SANS, fontSize:"13px", cursor:"pointer", color:C.label }}>Volver a la tienda</button>
        <button onClick={() => router.push("/auth/sign-up?vender=true")} style={{ background:C.green, border:"none", borderRadius:"8px", padding:"11px 22px", fontFamily:SANS, fontSize:"13px", fontWeight:600, cursor:"pointer", color:C.cream }}>Crear cuenta nueva</button>
      </div>
    </StatusCard>
  );

  if (solicitudActual) {
    if (solicitudActual.estado === "pendiente") return (
      <StatusCard icon={<Loader2 className="_spin" style={{ width:"28px", height:"28px", color:C.copper }} />} iconBg="rgba(201,122,62,0.12)" title="Solicitud en revisión" message="Tu solicitud está siendo revisada por un administrador. Te notificaremos cuando haya una respuesta.">
        <button onClick={() => router.push("/cliente/producto")} style={{ background:C.green, border:"none", borderRadius:"8px", padding:"11px 24px", fontFamily:SANS, fontSize:"13px", fontWeight:600, cursor:"pointer", color:C.cream }}>Volver a la tienda</button>
      </StatusCard>
    );
    if (solicitudActual.estado === "aprobado") return (
      <StatusCard icon={<CheckCircle2 style={{ width:"28px", height:"28px", color:"#15803D" }} />} iconBg="rgba(21,128,61,0.12)" title="¡Ya eres Productor!" message="Tu solicitud fue aprobada. Ahora puedes publicar y vender tus productos en la plataforma.">
        <button onClick={() => router.push("/dashboard/productor")} style={{ background:C.green, border:"none", borderRadius:"8px", padding:"11px 24px", fontFamily:SANS, fontSize:"13px", fontWeight:600, cursor:"pointer", color:C.cream }}>Ir a mi dashboard</button>
      </StatusCard>
    );
    if (solicitudActual.estado === "rechazado") return (
      <StatusCard icon={<AlertCircle style={{ width:"28px", height:"28px", color:"#B91C1C" }} />} iconBg="rgba(185,28,28,0.12)" title="Solicitud rechazada" message="Tu solicitud fue rechazada por el siguiente motivo:">
        <div style={{ background:C.errorBg, border:`1px solid rgba(185,28,28,0.18)`, borderRadius:"8px", padding:"14px 16px", marginBottom:"24px", textAlign:"left" }}>
          <p style={{ fontFamily:SANS, color:C.error, fontSize:"13px", lineHeight:1.6, margin:0 }}>{solicitudActual.motivo_rechazo || "No especificado"}</p>
        </div>
        <button onClick={() => { setSolicitudActual(null); setStep(1); }} style={{ background:C.green, border:"none", borderRadius:"8px", padding:"11px 24px", fontFamily:SANS, fontSize:"13px", fontWeight:600, cursor:"pointer", color:C.cream }}>Intentar de nuevo</button>
      </StatusCard>
    );
  }

  if (success) return (
    <StatusCard icon={<CheckCircle2 style={{ width:"28px", height:"28px", color:"#15803D" }} />} iconBg="rgba(21,128,61,0.12)" title="Solicitud enviada" message="Tu solicitud ha sido enviada. Un administrador la revisará pronto y te notificaremos por correo.">
      <button onClick={() => router.push("/cliente/producto")} style={{ background:C.green, border:"none", borderRadius:"8px", padding:"11px 24px", fontFamily:SANS, fontSize:"13px", fontWeight:600, cursor:"pointer", color:C.cream }}>Volver a la tienda</button>
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
          Guardianas del Mezcal · Programa de Productores
        </p>
        <h1 style={{ fontFamily:SERIF, color:C.cream, fontSize:"clamp(20px,3.5vw,30px)", fontWeight:400, lineHeight:1.12, margin:"0 0 6px" }}>
          Únete como Productor
        </h1>
        <p style={{ fontFamily:SANS, color:"rgba(244,240,227,0.60)", fontSize:"13px", lineHeight:1.6, maxWidth:"500px", margin:0 }}>
          Completa los 4 pasos para publicar y vender tus productos artesanales.
        </p>
      </div>

      {/* ── Gold stripe ───────────────────────────────────────────────── */}
      <div style={{ height:"3px", background:`linear-gradient(90deg,${C.copper},${C.amber} 50%,${C.copper})` }} />

      {/* ── Step indicator ────────────────────────────────────────────── */}
      <div style={{ background:C.card, borderLeft:`1px solid ${C.border}`, borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:"12px clamp(16px,4vw,32px)" }}>
        <div style={{ display:"flex", alignItems:"center" }}>
          {STEPS.map((s, i) => {
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
                {i < STEPS.length - 1 && (
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
          PASO {step} DE {STEPS.length} — {STEPS[step - 1].label.toUpperCase()}
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

        {/* ══════════════ STEP 1 — Asociación ════════════════════════ */}
        {step === 1 && (
          <div>
            <StepHeader
              eyebrow="01 · Requisito" title="Tu Asociación"
              desc="Selecciona la asociación de mezcaleros a la que perteneces. Este dato es requerido para validar tu actividad como productor."
              C={C} SERIF={SERIF} SANS={SANS} MONO={MONO}
            />

            {asociaciones.length === 0 ? (
              <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"20px 0" }}>
                <Loader2 className="_spin" style={{ width:"16px", height:"16px", color:C.copper }} />
                <span style={{ fontFamily:SANS, color:C.body, fontSize:"13px" }}>Cargando asociaciones...</span>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {asociaciones.map(asoc => {
                  const sel = form.asociacion === asoc;
                  return (
                    <button key={asoc} type="button"
                      onClick={() => setField("asociacion", sel ? "" : asoc)}
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
            )}
            {showErr.asociacion && <ErrMsg msg="Selecciona la asociación a la que perteneces" C={C} SANS={SANS} />}
          </div>
        )}

        {/* ══════════════ STEP 2 — Tu Marca ══════════════════════════ */}
        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
            <StepHeader
              eyebrow="02 · Identidad" title="Información de tu Marca"
              desc="Estos datos identificarán tu tienda en la plataforma. Solo el nombre de marca es obligatorio."
              C={C} SERIF={SERIF} SANS={SANS} MONO={MONO}
            />

            {/* — Identidad principal — */}
            <Section title="Identidad" C={C} SERIF={SERIF} SANS={SANS}>
              {/* Nombre de marca */}
              <div>
                <Label text="Nombre de marca" required C={C} SANS={SANS} />
                <input
                  type="text" value={form.nombre_marca} maxLength={150}
                  placeholder="Ej: Mezcal Don Cosme"
                  style={inp("nombre_marca", showErr.nombre_marca)}
                  onFocus={() => setFocusedField("nombre_marca")}
                  onBlur={() => { setFocusedField(null); setTouched(t => ({ ...t, nombre_marca:true })); }}
                  onChange={e => setField("nombre_marca", e.target.value)}
                />
                {showErr.nombre_marca
                  ? <ErrMsg msg="Escribe el nombre de tu marca" C={C} SANS={SANS} />
                  : <FieldHint text={`${form.nombre_marca.length}/150 caracteres`} C={C} SANS={SANS} />
                }
              </div>

            </Section>

            {/* — Región — */}
            <Section title="Región de origen" C={C} SERIF={SERIF} SANS={SANS} subtitle="¿En qué comunidad o región produces tu mezcal?">
              <div>
                <Label text="Comunidad / Región" C={C} SANS={SANS} />
                <div style={{ position:"relative" }}>
                  <MapPin style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", width:"14px", height:"14px", color:C.copper, pointerEvents:"none" }} />
                  <select value={form.id_region ?? ""} onChange={e => setField("id_region", e.target.value ? Number(e.target.value) : null)}
                    style={{ ...inp("region"), paddingLeft:"36px", appearance:"none", cursor:"pointer" }}
                    onFocus={() => setFocusedField("region")} onBlur={() => setFocusedField(null)}>
                    <option value="">Selecciona una región...</option>
                    {regiones.map(r => (
                      <option key={r.id_region} value={r.id_region}>{r.nombre}{r.estado_prov ? ` — ${r.estado_prov}` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            {/* — Dirección de producción — */}
            <Section title="Dirección de producción" C={C} SERIF={SERIF} SANS={SANS} subtitle="Ubicación donde elaboras tus productos (opcional).">
              <div>
                <Label text="Calle y número" C={C} SANS={SANS} />
                <input type="text" value={form.produccion_calle} placeholder="Av. Principal 123"
                  style={inp("prod_calle")} onFocus={() => setFocusedField("prod_calle")} onBlur={() => setFocusedField(null)}
                  onChange={e => setField("produccion_calle", e.target.value)}
                />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:"14px" }}>
                <div>
                  <Label text="Ciudad" C={C} SANS={SANS} />
                  <input type="text" value={form.produccion_ciudad} placeholder="Matatlán"
                    style={inp("prod_ciudad")} onFocus={() => setFocusedField("prod_ciudad")} onBlur={() => setFocusedField(null)}
                    onChange={e => setField("produccion_ciudad", e.target.value)}
                  />
                </div>
                <div>
                  <Label text="Estado" C={C} SANS={SANS} />
                  <input type="text" value={form.produccion_estado} placeholder="Oaxaca"
                    style={inp("prod_estado")} onFocus={() => setFocusedField("prod_estado")} onBlur={() => setFocusedField(null)}
                    onChange={e => setField("produccion_estado", e.target.value)}
                  />
                </div>
                <div>
                  <Label text="C.P." C={C} SANS={SANS} />
                  <input type="text" value={form.produccion_cp} placeholder="70300" maxLength={5}
                    style={inp("prod_cp")} onFocus={() => setFocusedField("prod_cp")} onBlur={() => setFocusedField(null)}
                    onChange={e => setField("produccion_cp", e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>
              <div>
                <Label text="Referencia" C={C} SANS={SANS} />
                <input type="text" value={form.produccion_referencia} placeholder="Entre calles, puntos de referencia..."
                  style={inp("prod_ref")} onFocus={() => setFocusedField("prod_ref")} onBlur={() => setFocusedField(null)}
                  onChange={e => setField("produccion_referencia", e.target.value)}
                />
              </div>
            </Section>
          </div>
        )}

        {/* ══════════════ STEP 3 — Categorías ════════════════════════ */}
        {step === 3 && (
          <div>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"16px", marginBottom:"24px" }}>
              <StepHeader
                eyebrow="03 · Oferta" title="Categorías de Productos"
                desc="Selecciona las categorías de lo que vas a vender. Puedes elegir varias."
                C={C} SERIF={SERIF} SANS={SANS} MONO={MONO}
              />
              <button type="button" onClick={toggleAll} disabled={categorias.length === 0}
                style={{ fontFamily:SANS, fontSize:"12px", fontWeight:600, color:C.copper, background:"none", border:"none", cursor:"pointer", padding:0, flexShrink:0, whiteSpace:"nowrap", textDecoration:"underline", textUnderlineOffset:"2px", marginTop:"4px", opacity: categorias.length === 0 ? 0.4 : 1 }}>
                {allSel ? "Deseleccionar todas" : "Seleccionar todas"}
              </button>
            </div>

            {categorias.length === 0 ? (
              <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"24px 0" }}>
                <Loader2 className="_spin" style={{ width:"16px", height:"16px", color:C.copper }} />
                <span style={{ fontFamily:SANS, color:C.body, fontSize:"13px" }}>Cargando categorías...</span>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {catRaiz.map(cat => {
                  const hijas      = subDe(cat.id_categoria);
                  const expanded   = expandidas.includes(cat.id_categoria);
                  const CatIconEl  = CAT_ICONS[cat.nombre] ?? Package;

                  if (hijas.length > 0) {
                    const anyChild = form.categorias_ids.includes(cat.id_categoria) || hijas.some(h => form.categorias_ids.includes(h.id_categoria));
                    return (
                      <div key={cat.id_categoria} style={{ flex:"0 0 100%", border:`1.5px solid ${anyChild ? C.copper : showErr.categorias ? C.error : C.inputBorder}`, borderRadius:"10px", overflow:"hidden", transition:"border-color 0.2s" }}>
                        {/* parent row */}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background: anyChild ? (isDark ? "rgba(201,122,62,0.10)" : "rgba(201,122,62,0.05)") : C.section }}>
                          <button type="button" onClick={() => toggleCat(cat.id_categoria)}
                            style={{ display:"flex", alignItems:"center", gap:"10px", background:"none", border:"none", cursor:"pointer", padding:"9px 14px", flex:1, textAlign:"left" }}>
                            <Radio checked={form.categorias_ids.includes(cat.id_categoria)} C={C} />
                            <CatIcon Icon={CatIconEl} selected={anyChild} isDark={isDark} />
                            <span style={{ fontFamily:SANS, color: anyChild ? (isDark ? C.cream : C.green) : C.label, fontSize:"13.5px", fontWeight: anyChild ? 600 : 400 }}>
                              {cat.nombre}
                            </span>
                          </button>
                          <button type="button" onClick={() => toggleExpandida(cat.id_categoria)}
                            style={{ background:"none", border:"none", cursor:"pointer", padding:"9px 14px", display:"flex", alignItems:"center", gap:"5px", color:C.body }}>
                            <span style={{ fontFamily:SANS, fontSize:"11px" }}>{hijas.length} tipos</span>
                            {expanded ? <ChevronUp style={{ width:"12px", height:"12px" }} /> : <ChevronDown style={{ width:"12px", height:"12px" }} />}
                          </button>
                        </div>
                        {/* subcategories */}
                        {expanded && (
                          <div style={{ background: isDark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.02)", borderTop:`1px solid ${C.border}` }}>
                            {hijas.map(h => {
                              const hSel = form.categorias_ids.includes(h.id_categoria);
                              return (
                                <button key={h.id_categoria} type="button" onClick={() => toggleCat(h.id_categoria)}
                                  style={{ display:"flex", alignItems:"center", gap:"10px", background:"none", border:"none", borderBottom:`1px solid ${C.border}`, cursor:"pointer", padding:"8px 14px 8px 40px", width:"100%", textAlign:"left", transition:"background 0.15s",
                                    ...(hSel ? { background: isDark ? "rgba(201,122,62,0.06)" : "rgba(201,122,62,0.04)" } : {}),
                                  }}>
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
                      style={{ display:"flex", alignItems:"center", gap:"12px", background: sel ? (isDark ? "rgba(201,122,62,0.10)" : "rgba(201,122,62,0.05)") : C.section, border:`1.5px solid ${sel ? C.copper : showErr.categorias ? C.error : C.inputBorder}`, borderRadius:"10px", padding:"9px 14px", cursor:"pointer", textAlign:"left", transition:"all 0.2s", width:"100%" }}>
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

            {/* feedback */}
            <div style={{ marginTop:"14px" }}>
              {showErr.categorias
                ? <ErrMsg msg="Selecciona al menos una categoría" C={C} SANS={SANS} />
                : form.categorias_ids.length > 0 && (
                  <p style={{ fontFamily:SANS, color:C.success, fontSize:"12px", display:"flex", alignItems:"center", gap:"6px", margin:0 }}>
                    <CheckCircle2 style={{ width:"12px", height:"12px" }} />
                    {form.categorias_ids.length} categoría{form.categorias_ids.length > 1 ? "s" : ""} seleccionada{form.categorias_ids.length > 1 ? "s" : ""}
                  </p>
                )}
            </div>
          </div>
        )}

        {/* ══════════════ STEP 4 — Certificado ═══════════════════════ */}
        {step === 4 && (
          <div>
            <StepHeader
              eyebrow="04 · Verificación" title="Certificado de Origen"
              desc="Sube tu documento de verificación. Máximo 500 KB."
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
                    <p style={{ fontFamily:SANS, color:C.success, fontSize:"14px", fontWeight:600, margin:0 }}>Certificado subido correctamente</p>
                    <p style={{ fontFamily:SANS, color:C.body, fontSize:"12px", margin:"2px 0 0" }}>El archivo está listo para enviar</p>
                  </div>
                </div>
                <button type="button" onClick={() => setCertificadoUrl("")}
                  style={{ background:"none", border:`1px solid ${C.inputBorder}`, borderRadius:"6px", cursor:"pointer", fontFamily:SANS, color:C.error, fontSize:"12px", padding:"6px 12px" }}>
                  Cambiar
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
                    <p style={{ fontFamily:SANS, color:C.body, fontSize:"14px", margin:0 }}>Subiendo archivo...</p>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"10px" }}>
                    <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:`rgba(201,122,62,0.10)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <UploadIcon style={{ width:"22px", height:"22px", color:C.copper }} />
                    </div>
                    <p style={{ fontFamily:SANS, color:C.label, fontSize:"15px", margin:0 }}>
                      <span style={{ color:C.copper, fontWeight:700 }}>Haz clic para subir</span> o arrastra aquí
                    </p>
                    <p style={{ fontFamily:SANS, color:C.body, fontSize:"12px", margin:0 }}>PDF, JPG, PNG · máx. 500 KB</p>
                  </div>
                )}
              </div>
            )}

            {/* Summary before submit */}
            <div style={{ marginTop:"28px", background:C.section, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"20px 22px" }}>
              <p style={{ fontFamily:MONO, fontSize:"10px", color:C.copper, letterSpacing:"0.18em", textTransform:"uppercase", margin:"0 0 14px" }}>
                Resumen de tu solicitud
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {[
                  { label:"Asociación",  val: form.asociacion || "—",               ok: !!form.asociacion },
                  { label:"Marca",       val: form.nombre_marca || "—",             ok: !!form.nombre_marca },
                  { label:"Categorías",  val: form.categorias_ids.length > 0 ? `${form.categorias_ids.length} seleccionada${form.categorias_ids.length > 1 ? "s" : ""}` : "—", ok: form.categorias_ids.length > 0 },
                  { label:"Certificado", val: certificadoUrl ? "Subido" : "Pendiente", ok: !!certificadoUrl },
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

        {/* ── Navigation buttons ────────────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"24px", paddingTop:"16px", borderTop:`1px solid ${C.border}` }}>
          <button type="button" onClick={step === 1 ? () => router.back() : goPrev}
            style={{ display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1px solid ${C.inputBorder}`, borderRadius:"8px", padding:"11px 22px", fontFamily:SANS, fontSize:"13px", fontWeight:500, color:C.label, cursor:"pointer" }}>
            <ArrowLeft style={{ width:"14px", height:"14px" }} />
            {step === 1 ? "Cancelar" : "Anterior"}
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            {/* step dots */}
            {STEPS.map(s => (
              <div key={s.n} style={{ width: step === s.n ? "20px" : "6px", height:"6px", borderRadius:"3px", background: step === s.n ? C.copper : stepValid[s.n - 1] ? C.stepPast : C.border, transition:"all 0.3s ease" }} />
            ))}
          </div>

          {isLast ? (
            <button type="button" onClick={handleSubmit}
              disabled={isSubmitting || uploading || !certificadoUrl}
              style={{ display:"flex", alignItems:"center", gap:"8px", background:(isSubmitting || uploading || !certificadoUrl) ? "rgba(46,74,51,0.45)" : C.green, color:C.cream, border:"none", borderRadius:"8px", padding:"11px 26px", fontFamily:SANS, fontSize:"13px", fontWeight:600, letterSpacing:"0.04em", cursor:(isSubmitting || uploading || !certificadoUrl) ? "not-allowed" : "pointer", transition:"background 0.2s" }}>
              {isSubmitting
                ? <><Loader2 className="_spin" style={{ width:"14px", height:"14px" }} />Enviando...</>
                : "Enviar Solicitud"
              }
            </button>
          ) : (
            <button type="button" onClick={goNext}
              style={{ display:"flex", alignItems:"center", gap:"8px", background:C.green, color:C.cream, border:"none", borderRadius:"8px", padding:"11px 26px", fontFamily:SANS, fontSize:"13px", fontWeight:600, letterSpacing:"0.04em", cursor:"pointer" }}>
              Siguiente
              <ArrowRight style={{ width:"14px", height:"14px" }} />
            </button>
          )}
        </div>
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
