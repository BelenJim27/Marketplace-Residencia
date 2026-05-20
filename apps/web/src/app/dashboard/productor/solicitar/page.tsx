"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  UploadIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Users,
  Tag,
  LayoutGrid,
  ShieldCheck,
} from "lucide-react";

/* ─── interfaces ─────────────────────────────────────────────────────────── */

interface Region {
  id_region: number;
  nombre: string;
  estado_prov?: string;
}

interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
  id_padre?: number | null;
}

interface Solicitud {
  id_productor: number;
  estado: string;
  motivo_rechazo?: string;
  rfc?: string;
  razon_social?: string;
}

/* ─── category icons ─────────────────────────────────────────────────────── */

const CATEGORIA_ICONS: Record<string, string> = {
  Bebidas: "🥃",
  "Mezcal artesanal": "🫙",
  "Mezcal Ancestral": "🏺",
  Alimentos: "🌽",
  Textiles: "🧵",
  Artesanías: "🏺",
  "Cosméticos y Bienestar": "🌿",
  "Arte y Cultura": "🎨",
};

/* ─── step definitions ───────────────────────────────────────────────────── */

const STEP_DEFS = [
  { n: 1, eyebrow: "01", label: "Asociación",  Icon: Users       },
  { n: 2, eyebrow: "02", label: "Tu Marca",    Icon: Tag         },
  { n: 3, eyebrow: "03", label: "Categorías",  Icon: LayoutGrid  },
  { n: 4, eyebrow: "04", label: "Certificado", Icon: ShieldCheck },
];

/* ─── main component ─────────────────────────────────────────────────────── */

export default function SolicitarPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user: contextUser } = useAuth();
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const user = session?.user || contextUser;
  const isDark = resolvedTheme === "dark";

  /* palette */
  const C = {
    bg:          isDark ? "#0B1610" : "#F4F0E3",
    card:        isDark ? "#142018" : "#FFFFFF",
    section:     isDark ? "#1A2C1E" : "#F7F4EC",
    border:      isDark ? "rgba(200,169,122,0.18)" : "rgba(46,74,51,0.13)",
    heading:     isDark ? "#F4F0E3" : "#1F3A2E",
    body:        isDark ? "rgba(244,240,227,0.68)" : "rgba(31,58,46,0.68)",
    label:       isDark ? "rgba(244,240,227,0.88)" : "#2E4A33",
    inputBg:     isDark ? "#0D1A10" : "#FFFFFF",
    inputBorder: isDark ? "rgba(200,169,122,0.22)" : "rgba(46,74,51,0.18)",
    inputText:   isDark ? "#F4F0E3" : "#1F3A2E",
    copper:      "#C97A3E",
    green:       "#2E4A33",
    cream:       "#F4F0E3",
    errorBg:     isDark ? "rgba(239,68,68,0.10)" : "#FEF2F2",
    errorText:   isDark ? "#F87171" : "#B91C1C",
    successBg:   isDark ? "rgba(34,197,94,0.10)" : "#F0FDF4",
    successText: isDark ? "#4ADE80" : "#15803D",
  };

  const SERIF = "'Cormorant Garamond', Georgia, serif";
  const SANS  = "'Manrope', 'DM Sans', sans-serif";
  const MONO  = "ui-monospace, 'SF Mono', Menlo, monospace";

  /* ── state ──────────────────────────────────────────────────────────────── */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loadingSolicitud, setLoadingSolicitud] = useState(true);
  const [solicitudActual, setSolicitudActual] = useState<Solicitud | null>(null);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [asociaciones, setAsociaciones] = useState<string[]>([]);
  const [certificadoUrl, setCertificadoUrl] = useState("");
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [noElegible, setNoElegible] = useState(false);
  const [expandidas, setExpandidas] = useState<number[]>([]);
  const [touched, setTouched] = useState({ nombre_marca: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    rfc: "",
    razon_social: "",
    direccion_calle: "",
    direccion_cp: "",
    direccion_ciudad: "",
    direccion_estado: "",
    datos_bancarios: "",
    id_region: null as number | null,
    produccion_calle: "",
    produccion_ciudad: "",
    produccion_estado: "",
    produccion_cp: "",
    produccion_referencia: "",
    categorias_ids: [] as number[],
    asociacion: "",
    nombre_marca: "",
  });

  /* ── derived validation ─────────────────────────────────────────────────── */
  const showErr = {
    asociacion:   submitAttempted && !formData.asociacion,
    nombre_marca: (touched.nombre_marca || submitAttempted) && !formData.nombre_marca.trim(),
    categorias:   submitAttempted && formData.categorias_ids.length === 0,
  };

  const stepsDone = [
    !!formData.asociacion,
    !!formData.nombre_marca.trim(),
    formData.categorias_ids.length > 0,
    !!certificadoUrl,
  ];

  const getInputBorder = (field: string, hasError: boolean) => {
    if (hasError) return C.errorText;
    if (focusedField === field) return C.copper;
    return C.inputBorder;
  };

  /* ── hierarchy helpers ──────────────────────────────────────────────────── */
  const categoriasRaiz  = categorias.filter((c) => !c.id_padre);
  const subcategoriasDe = (idPadre: number) => categorias.filter((c) => c.id_padre === idPadre);
  const tieneHijas      = (id: number) => subcategoriasDe(id).length > 0;

  const toggleExpandida = (id: number) =>
    setExpandidas((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleCategoriaToggle = (id: number) =>
    setFormData((prev) => ({
      ...prev,
      categorias_ids: prev.categorias_ids.includes(id)
        ? prev.categorias_ids.filter((c) => c !== id)
        : [...prev.categorias_ids, id],
    }));

  const todasLasHojas = categorias
    .filter((c) => !tieneHijas(c.id_categoria))
    .map((c) => c.id_categoria);

  const handleTodasCategorias = () => {
    const todasSeleccionadas = todasLasHojas.every((id) => formData.categorias_ids.includes(id));
    setFormData((prev) => ({ ...prev, categorias_ids: todasSeleccionadas ? [] : todasLasHojas }));
    if (!todasLasHojas.every((id) => formData.categorias_ids.includes(id))) {
      setExpandidas(categorias.filter(tieneHijas.bind(null, 0) as any).map((c) => c.id_categoria));
    }
  };

  const todasSeleccionadas =
    todasLasHojas.length > 0 &&
    todasLasHojas.every((id) => formData.categorias_ids.includes(id));

  /* ── init ───────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/auth/sign-in");
      return;
    }

    const initializePage = async () => {
      try {
        const [regionesData, categoriasData, asociacionesData] = await Promise.all([
          api.productores.getRegiones(),
          api.categorias.getAll(),
          api.configuracion.getAsociaciones(),
        ]);
        setRegiones(regionesData as Region[]);
        setCategorias(categoriasData as Categoria[]);
        setAsociaciones(Array.isArray(asociacionesData) ? asociacionesData : []);

        let token = getCookie("token") || (session as any)?.accessToken;
        if (!token) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          token = getCookie("token") || (session as any)?.accessToken;
        }
        console.warn("🔑 Token disponible:", token ? "sí" : "no", token?.substring(0, 20) + "...");

        if (token) {
          const userId = (user as any)?.id_usuario || (user as any)?.id;
          if (userId) {
            try {
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/pedidos?id_usuario=${userId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const text = await res.text();
              const pedidos = text ? JSON.parse(text) : [];
              if (Array.isArray(pedidos) && pedidos.length > 0) {
                const tienePedidos = pedidos.some((p: any) => String(p.id_usuario) === String(userId));
                if (tienePedidos) { setNoElegible(true); setLoadingSolicitud(false); return; }
              }
            } catch (error) {
              console.error("Error silencioso en verificación de pedidos:", error);
            }

            try {
              const solicitud = await api.productores.getMiSolicitud(token) as any;
              if (solicitud && solicitud.id_productor) setSolicitudActual(solicitud as Solicitud);
            } catch (err: any) {
              const isAuthError =
                err?.message?.includes("401") ||
                err?.message?.includes("Unauthorized") ||
                err?.message?.includes("Token");
              if (isAuthError) console.warn("Token inválido o expirado. El usuario puede crear una nueva solicitud.");
              else if (!err?.message?.includes("JSON") && !err?.message?.includes("404"))
                console.error("Error al obtener solicitud:", err);
            }
          }
        }
      } catch (err) {
        console.error("Error crítico al inicializar página:", err);
        setError("Hubo un problema al cargar la información inicial.");
      } finally {
        setLoadingSolicitud(false);
      }
    };

    initializePage();
  }, [isAuthenticated, authLoading, router, session, user]);

  /* ── form handlers ──────────────────────────────────────────────────────── */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertificadoFile(file);
    setUploading(true);
    setError("");
    try {
      const token = (session as any)?.accessToken || getCookie("token");
      if (!token) { setError("Error: No se detectó sesión."); return; }
      const formDataUpload = new FormData();
      formDataUpload.append("archivo", file);
      formDataUpload.append("entidad_tipo", "productor_certificado");
      formDataUpload.append("tipo", "certificado");
      const result = await api.archivos.upload(token, formDataUpload);
      setCertificadoUrl((result as any).url || `/${(result as any).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el certificado");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setIsSubmitting(true);
    setError("");
    if (!formData.asociacion) {
      setError("Selecciona la asociación a la que perteneces");
      setIsSubmitting(false);
      return;
    }
    if (!formData.nombre_marca.trim()) {
      setError("Escribe el nombre de tu marca");
      setIsSubmitting(false);
      return;
    }
    if (formData.categorias_ids.length === 0) {
      setError("Selecciona al menos una categoría de productos");
      setIsSubmitting(false);
      return;
    }
    try {
      const token = (session as any)?.accessToken || getCookie("token");
      if (!token) { setError("Error: No se detectó sesión."); return; }
      if (!certificadoUrl) throw new Error("Sube el certificado primero");
      await api.productores.solicitar(token, {
        rfc: formData.rfc || undefined,
        razon_social: formData.razon_social || undefined,
        datos_bancarios: formData.datos_bancarios || undefined,
        asociacion: formData.asociacion || undefined,
        nombre_marca: formData.nombre_marca || undefined,
        direccion_fiscal: formData.direccion_calle || formData.direccion_ciudad ? {
          linea_1: formData.direccion_calle || undefined,
          ciudad: formData.direccion_ciudad || undefined,
          estado: formData.direccion_estado || undefined,
          codigo_postal: formData.direccion_cp || undefined,
          pais_iso2: "MX",
        } : undefined,
        direccion_produccion: formData.produccion_calle || formData.produccion_ciudad ? {
          linea_1: formData.produccion_calle || undefined,
          ciudad: formData.produccion_ciudad || undefined,
          estado: formData.produccion_estado || undefined,
          codigo_postal: formData.produccion_cp || undefined,
          referencia: formData.produccion_referencia || undefined,
          pais_iso2: "MX",
        } : undefined,
        id_region: formData.id_region ?? undefined,
        // @ts-ignore
        categorias_ids: formData.categorias_ids,
      } as any);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── animation + keyframe styles ───────────────────────────────────────── */
  const animStyles = (
    <style>{`
      @keyframes _spin { to { transform: rotate(360deg); } }
      ._spin { animation: _spin 1s linear infinite; }
      @keyframes _fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      ._s1 { animation: _fadeUp 0.45s ease both; animation-delay: 0.05s; }
      ._s2 { animation: _fadeUp 0.45s ease both; animation-delay: 0.15s; }
      ._s3 { animation: _fadeUp 0.45s ease both; animation-delay: 0.25s; }
      ._s4 { animation: _fadeUp 0.45s ease both; animation-delay: 0.35s; }
    `}</style>
  );

  /* ── status card ────────────────────────────────────────────────────────── */
  const StatusCard = ({
    iconBg, icon, title, message, children,
  }: {
    iconBg: string;
    icon: React.ReactNode;
    title: string;
    message?: string;
    children?: React.ReactNode;
  }) => (
    <div style={{ maxWidth: "520px", margin: "0 auto", padding: "48px 16px" }}>
      {animStyles}
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${C.copper}, #e8c060 50%, ${C.copper})`, borderRadius: "2px 2px 0 0" }} />
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderTop: "none",
        borderRadius: "0 0 16px 16px", padding: "48px 40px", textAlign: "center",
        boxShadow: isDark ? "0 8px 40px rgba(0,0,0,0.4)" : "0 8px 40px rgba(31,58,46,0.06)",
      }}>
        <div style={{
          width: "68px", height: "68px", borderRadius: "50%", background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
        }}>
          {icon}
        </div>
        <h2 style={{ fontFamily: SERIF, color: C.heading, fontSize: "30px", fontWeight: 400, margin: "0 0 12px", lineHeight: 1.15 }}>
          {title}
        </h2>
        {message && (
          <p style={{ fontFamily: SANS, color: C.body, fontSize: "14px", lineHeight: 1.75, margin: "0 0 28px" }}>
            {message}
          </p>
        )}
        {children}
      </div>
    </div>
  );

  const PrimaryBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      style={{
        background: C.green, color: C.cream, border: "none", borderRadius: "8px",
        padding: "12px 28px", fontFamily: SANS, fontSize: "13px", fontWeight: 600,
        letterSpacing: "0.04em", cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  const SecondaryBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      style={{
        background: "transparent", color: C.label, border: `1px solid ${C.inputBorder}`,
        borderRadius: "8px", padding: "12px 24px", fontFamily: SANS, fontSize: "13px",
        fontWeight: 500, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  /* ── loading ────────────────────────────────────────────────────────────── */
  if (authLoading || loadingSolicitud) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "320px", gap: "16px" }}>
        {animStyles}
        <div className="_spin" style={{ width: "40px", height: "40px", borderRadius: "50%", border: `2px solid ${C.border}`, borderTopColor: C.copper }} />
        <p style={{ fontFamily: SANS, color: C.body, fontSize: "13px" }}>Cargando...</p>
      </div>
    );
  }

  /* ── no elegible ────────────────────────────────────────────────────────── */
  if (noElegible) {
    return (
      <StatusCard
        icon={<AlertCircle style={{ width: "30px", height: "30px", color: "#D97706" }} />}
        iconBg="rgba(217,119,6,0.12)"
        title="No disponible con esta cuenta"
        message="Esta cuenta ya realizó pedidos como cliente. Para vender en Tierra Agaves necesitas crear una cuenta nueva dedicada a tu actividad como productor."
      >
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <SecondaryBtn onClick={() => router.push("/producto")} label="Volver a la tienda" />
          <PrimaryBtn onClick={() => router.push("/auth/sign-up?vender=true")} label="Crear cuenta nueva" />
        </div>
      </StatusCard>
    );
  }

  /* ── solicitud existente ────────────────────────────────────────────────── */
  if (solicitudActual) {
    if (solicitudActual.estado === "pendiente") {
      return (
        <StatusCard
          icon={<Loader2 className="_spin" style={{ width: "30px", height: "30px", color: C.copper }} />}
          iconBg="rgba(201,122,62,0.12)"
          title="Solicitud en revisión"
          message="Tu solicitud para ser productor está siendo revisada por un administrador. Te notificaremos cuando haya una respuesta."
        >
          <PrimaryBtn onClick={() => router.push("/producto")} label="Volver a la tienda" />
        </StatusCard>
      );
    }

    if (solicitudActual.estado === "aprobado") {
      return (
        <StatusCard
          icon={<CheckCircle2 style={{ width: "30px", height: "30px", color: "#15803D" }} />}
          iconBg="rgba(21,128,61,0.12)"
          title="¡Ya eres Productor!"
          message="Tu solicitud fue aprobada. Ahora puedes publicar y vender tus productos en la plataforma."
        >
          <PrimaryBtn onClick={() => router.push("/dashboard/productor")} label="Ir a mi dashboard" />
        </StatusCard>
      );
    }

    if (solicitudActual.estado === "rechazado") {
      return (
        <StatusCard
          icon={<AlertCircle style={{ width: "30px", height: "30px", color: "#B91C1C" }} />}
          iconBg="rgba(185,28,28,0.12)"
          title="Solicitud rechazada"
          message="Tu solicitud fue rechazada por el siguiente motivo:"
        >
          <div style={{
            background: C.errorBg, border: `1px solid rgba(185,28,28,0.18)`,
            borderRadius: "8px", padding: "14px 16px", marginBottom: "24px", textAlign: "left",
          }}>
            <p style={{ fontFamily: SANS, color: C.errorText, fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
              {solicitudActual.motivo_rechazo || "No especificado"}
            </p>
          </div>
          <PrimaryBtn
            onClick={() => {
              setSolicitudActual(null);
              setFormData({
                rfc: "", razon_social: "", direccion_calle: "", direccion_cp: "",
                direccion_ciudad: "", direccion_estado: "", datos_bancarios: "",
                id_region: null, produccion_calle: "", produccion_ciudad: "",
                produccion_estado: "", produccion_cp: "", produccion_referencia: "",
                categorias_ids: [], asociacion: "", nombre_marca: "",
              });
            }}
            label="Intentar de nuevo"
          />
        </StatusCard>
      );
    }
  }

  /* ── success ────────────────────────────────────────────────────────────── */
  if (success) {
    return (
      <StatusCard
        icon={<CheckCircle2 style={{ width: "30px", height: "30px", color: "#15803D" }} />}
        iconBg="rgba(21,128,61,0.12)"
        title="Solicitud enviada"
        message="Tu solicitud ha sido enviada exitosamente. Un administrador la revisará pronto y te notificaremos por correo."
      >
        <PrimaryBtn onClick={() => router.push("/producto")} label="Volver a la tienda" />
      </StatusCard>
    );
  }

  /* ── section title ──────────────────────────────────────────────────────── */
  const SectionTitle = ({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) => (
    <div style={{ marginBottom: "20px" }}>
      <p style={{ fontFamily: MONO, color: C.copper, fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 6px" }}>
        {eyebrow}
      </p>
      <h3 style={{ fontFamily: SERIF, color: C.heading, fontSize: "22px", fontWeight: 400, margin: "0 0 8px", lineHeight: 1.2 }}>
        {title}
      </h3>
      {desc && (
        <p style={{ fontFamily: SANS, color: C.body, fontSize: "13px", lineHeight: 1.7, margin: 0 }}>
          {desc}
        </p>
      )}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: C.inputBg,
    border: `1px solid ${C.inputBorder}`,
    borderRadius: "8px",
    padding: "12px 16px",
    color: C.inputText,
    fontFamily: SANS,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  /* ── inline error label ─────────────────────────────────────────────────── */
  const ErrMsg = ({ msg }: { msg: string }) => (
    <p style={{ fontFamily: SANS, color: C.errorText, fontSize: "11.5px", marginTop: "7px", display: "flex", alignItems: "center", gap: "5px" }}>
      <AlertCircle style={{ width: "11px", height: "11px", flexShrink: 0 }} />
      {msg}
    </p>
  );

  /* ── main form ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "0 16px 56px" }}>
      {animStyles}

      {/* ── Editorial header ───────────────────────────────────────────── */}
      <div style={{
        background: C.green, borderRadius: "16px 16px 0 0",
        padding: "44px 44px 42px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: "-50px", top: "-50px", width: "220px", height: "220px", borderRadius: "50%", border: "1px solid rgba(244,240,227,0.06)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: "20px", top: "20px", width: "130px", height: "130px", borderRadius: "50%", border: "1px solid rgba(244,240,227,0.06)", pointerEvents: "none" }} />

        <p style={{ fontFamily: MONO, color: C.copper, fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 16px" }}>
          Guardianas del Mezcal · Programa de Productores
        </p>
        <h1 style={{ fontFamily: SERIF, color: C.cream, fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 400, lineHeight: 1.12, margin: "0 0 16px" }}>
          Únete como<br />Productor
        </h1>
        <p style={{ fontFamily: SANS, color: "rgba(244,240,227,0.65)", fontSize: "14px", lineHeight: 1.75, maxWidth: "420px", margin: 0 }}>
          Completa el proceso para publicar y vender tus productos artesanales en nuestra plataforma.
        </p>
      </div>

      {/* ── Gold stripe ────────────────────────────────────────────────── */}
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${C.copper}, #e8c060 50%, ${C.copper})` }} />

      {/* ── Step progress track ────────────────────────────────────────── */}
      <div style={{
        background: C.card,
        borderLeft: `1px solid ${C.border}`,
        borderRight: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        padding: "22px 44px",
        display: "flex",
        alignItems: "center",
      }}>
        {STEP_DEFS.map((step, i) => {
          const done = stepsDone[i];
          const StepIcon = step.Icon;
          return (
            <React.Fragment key={step.n}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? C.green : (isDark ? "rgba(200,169,122,0.07)" : "rgba(46,74,51,0.05)"),
                  border: `2px solid ${done ? C.green : C.border}`,
                  transition: "all 0.35s ease",
                  flexShrink: 0,
                }}>
                  {done
                    ? <Check style={{ width: "13px", height: "13px", color: C.cream }} strokeWidth={2.5} />
                    : <StepIcon style={{ width: "14px", height: "14px", color: C.body }} />
                  }
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontFamily: MONO, fontSize: "9px", color: C.copper, letterSpacing: "0.16em", fontWeight: 700 }}>
                    {step.eyebrow}
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: "11.5px", color: done ? C.heading : C.body, fontWeight: done ? 600 : 400, transition: "color 0.3s" }}>
                    {step.label}
                  </span>
                </div>
              </div>
              {i < STEP_DEFS.length - 1 && (
                <div style={{
                  flex: 1, height: "2px", margin: "0 14px",
                  background: done
                    ? `linear-gradient(90deg, ${C.green}, ${stepsDone[i + 1] ? C.green : C.border})`
                    : C.border,
                  transition: "background 0.35s ease",
                  borderRadius: "1px",
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Form card ──────────────────────────────────────────────────── */}
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderTop: "none",
        borderRadius: "0 0 16px 16px",
        padding: "40px 44px",
      }}>

        {/* Error banner */}
        {error && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "10px",
            background: C.errorBg, border: `1px solid rgba(185,28,28,0.2)`,
            borderRadius: "8px", padding: "14px 16px", marginBottom: "32px",
          }}>
            <AlertCircle style={{ width: "15px", height: "15px", color: C.errorText, flexShrink: 0, marginTop: "1px" }} />
            <span style={{ fontFamily: SANS, color: C.errorText, fontSize: "13px", lineHeight: 1.5 }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "40px" }}>

          {/* ── 01 Asociación ──────────────────────────────────────────── */}
          <div className="_s1" style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: "40px" }}>
            <SectionTitle
              eyebrow="01 · Requisito"
              title="Tu Asociación"
              desc="Selecciona la asociación de mezcaleros a la que perteneces."
            />
            {asociaciones.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 0" }}>
                <Loader2 className="_spin" style={{ width: "15px", height: "15px", color: C.copper }} />
                <span style={{ fontFamily: SANS, color: C.body, fontSize: "13px" }}>Cargando asociaciones...</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {asociaciones.map((asoc) => {
                  const selected = formData.asociacion === asoc;
                  return (
                    <button
                      key={asoc}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, asociacion: asoc }))}
                      style={{
                        display: "flex", alignItems: "center", gap: "14px",
                        background: selected
                          ? (isDark ? "rgba(201,122,62,0.12)" : "rgba(46,74,51,0.05)")
                          : C.section,
                        border: `1.5px solid ${selected ? C.copper : (showErr.asociacion ? C.errorText : C.inputBorder)}`,
                        borderRadius: "10px", padding: "14px 16px",
                        cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                      }}
                    >
                      <span style={{
                        width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${selected ? C.copper : C.inputBorder}`,
                        background: selected ? C.copper : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s",
                      }}>
                        {selected && <Check style={{ width: "10px", height: "10px", color: "#fff" }} strokeWidth={3} />}
                      </span>
                      <span style={{ fontFamily: SANS, color: selected ? (isDark ? C.cream : C.green) : C.label, fontSize: "14px", fontWeight: selected ? 600 : 400 }}>
                        {asoc}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {showErr.asociacion && <ErrMsg msg="Selecciona la asociación a la que perteneces" />}
          </div>

          {/* ── 02 Nombre de Marca ─────────────────────────────────────── */}
          <div className="_s2" style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: "40px" }}>
            <SectionTitle
              eyebrow="02 · Identidad"
              title="Nombre de tu Marca"
              desc="Este nombre aparecerá como tu tienda en la plataforma."
            />
            <input
              type="text"
              name="nombre_marca"
              value={formData.nombre_marca}
              onChange={handleInputChange}
              maxLength={150}
              placeholder="Ej: Mezcal Don Cosme"
              style={{ ...inputStyle, borderColor: getInputBorder("nombre_marca", showErr.nombre_marca) }}
              onFocus={() => setFocusedField("nombre_marca")}
              onBlur={() => { setFocusedField(null); setTouched((t) => ({ ...t, nombre_marca: true })); }}
            />
            {showErr.nombre_marca && <ErrMsg msg="Escribe el nombre de tu marca" />}
          </div>

          {/* ── 03 Categorías ──────────────────────────────────────────── */}
          <div className="_s3" style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: "40px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
              <SectionTitle
                eyebrow="03 · Oferta"
                title="Categorías de Productos"
                desc="Selecciona las categorías que vas a ofrecer. Puedes elegir varias."
              />
              <button
                type="button"
                onClick={handleTodasCategorias}
                disabled={categorias.length === 0}
                style={{
                  fontFamily: SANS, fontSize: "12px", fontWeight: 600, color: C.copper,
                  background: "none", border: "none", cursor: "pointer", padding: "0",
                  flexShrink: 0, opacity: categorias.length === 0 ? 0.4 : 1,
                  textDecoration: "underline", textUnderlineOffset: "2px", marginTop: "20px",
                }}
              >
                {todasSeleccionadas ? "Deseleccionar todas" : "Seleccionar todas"}
              </button>
            </div>

            {categorias.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "20px 0" }}>
                <Loader2 className="_spin" style={{ width: "15px", height: "15px", color: C.copper }} />
                <span style={{ fontFamily: SANS, color: C.body, fontSize: "13px" }}>Cargando categorías...</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {categoriasRaiz.map((cat) => {
                  const hijas = subcategoriasDe(cat.id_categoria);
                  const expandida = expandidas.includes(cat.id_categoria);
                  const emoji = CATEGORIA_ICONS[cat.nombre] ?? "📦";

                  if (hijas.length > 0) {
                    const algunaHijaSeleccionada = hijas.some((h) =>
                      formData.categorias_ids.includes(h.id_categoria)
                    );
                    return (
                      <div key={cat.id_categoria} style={{
                        border: `1.5px solid ${algunaHijaSeleccionada ? C.copper : (showErr.categorias ? C.errorText : C.inputBorder)}`,
                        borderRadius: "10px", overflow: "hidden", transition: "border-color 0.2s",
                      }}>
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: algunaHijaSeleccionada
                            ? (isDark ? "rgba(201,122,62,0.10)" : "rgba(201,122,62,0.05)")
                            : C.section,
                        }}>
                          <button
                            type="button"
                            onClick={() => handleCategoriaToggle(cat.id_categoria)}
                            style={{
                              display: "flex", alignItems: "center", gap: "12px",
                              background: "none", border: "none", cursor: "pointer",
                              padding: "14px 16px", flex: 1, textAlign: "left",
                            }}
                          >
                            <span style={{
                              width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                              border: `2px solid ${formData.categorias_ids.includes(cat.id_categoria) ? C.copper : C.inputBorder}`,
                              background: formData.categorias_ids.includes(cat.id_categoria) ? C.copper : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {formData.categorias_ids.includes(cat.id_categoria) && (
                                <Check style={{ width: "10px", height: "10px", color: "#fff" }} strokeWidth={3} />
                              )}
                            </span>
                            <span style={{ fontSize: "20px", lineHeight: 1 }}>{emoji}</span>
                            <span style={{ fontFamily: SANS, color: algunaHijaSeleccionada ? (isDark ? C.cream : C.green) : C.label, fontSize: "14px", fontWeight: algunaHijaSeleccionada ? 600 : 400 }}>
                              {cat.nombre}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleExpandida(cat.id_categoria)}
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              padding: "14px 16px", display: "flex", alignItems: "center", gap: "6px",
                            }}
                          >
                            <span style={{ fontFamily: SANS, color: C.body, fontSize: "11px" }}>{hijas.length} tipos</span>
                            {expandida
                              ? <ChevronUp style={{ width: "14px", height: "14px", color: C.body }} />
                              : <ChevronDown style={{ width: "14px", height: "14px", color: C.body }} />}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const selected = formData.categorias_ids.includes(cat.id_categoria);
                  return (
                    <button
                      key={cat.id_categoria}
                      type="button"
                      onClick={() => handleCategoriaToggle(cat.id_categoria)}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        background: selected
                          ? (isDark ? "rgba(201,122,62,0.10)" : "rgba(201,122,62,0.05)")
                          : C.section,
                        border: `1.5px solid ${selected ? C.copper : (showErr.categorias ? C.errorText : C.inputBorder)}`,
                        borderRadius: "10px", padding: "14px 16px",
                        cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                      }}
                    >
                      <span style={{
                        width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${selected ? C.copper : C.inputBorder}`,
                        background: selected ? C.copper : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {selected && <Check style={{ width: "10px", height: "10px", color: "#fff" }} strokeWidth={3} />}
                      </span>
                      <span style={{ fontSize: "20px", lineHeight: 1 }}>{emoji}</span>
                      <span style={{ fontFamily: SANS, color: selected ? (isDark ? C.cream : C.green) : C.label, fontSize: "14px", fontWeight: selected ? 600 : 400 }}>
                        {cat.nombre}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {showErr.categorias
              ? <ErrMsg msg="Selecciona al menos una categoría" />
              : formData.categorias_ids.length > 0 && (
                <p style={{ fontFamily: SANS, fontSize: "11.5px", color: C.successText, marginTop: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <CheckCircle2 style={{ width: "11px", height: "11px" }} />
                  {formData.categorias_ids.length} categoría{formData.categorias_ids.length > 1 ? "s" : ""} seleccionada{formData.categorias_ids.length > 1 ? "s" : ""}
                </p>
              )
            }
          </div>

          {/* ── 04 Certificado ─────────────────────────────────────────── */}
          <div className="_s4">
            <SectionTitle
              eyebrow="04 · Verificación"
              title="Certificado de Origen"
              desc="Sube tu certificado en formato PDF, JPG o PNG (máx. 10 MB)."
            />

            {certificadoUrl ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: C.successBg, border: `1px solid rgba(21,128,61,0.2)`,
                borderRadius: "10px", padding: "16px 20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 style={{ width: "18px", height: "18px", color: C.successText }} />
                  <span style={{ fontFamily: SANS, color: C.successText, fontSize: "13px", fontWeight: 600 }}>
                    Certificado subido correctamente
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setCertificadoUrl(""); setCertificadoFile(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SANS, color: C.errorText, fontSize: "12px" }}
                >
                  Eliminar
                </button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input
                  type="file"
                  id="certificado"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", zIndex: 1, width: "100%", height: "100%" }}
                />
                <label htmlFor="certificado" style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: "8px", padding: "44px 24px",
                  cursor: "pointer", border: `1.5px dashed ${C.inputBorder}`,
                  borderRadius: "12px", background: C.section, transition: "border-color 0.2s",
                }}>
                  {uploading ? (
                    <>
                      <Loader2 className="_spin" style={{ width: "28px", height: "28px", color: C.copper }} />
                      <p style={{ fontFamily: SANS, color: C.body, fontSize: "13px", margin: 0 }}>Subiendo archivo...</p>
                    </>
                  ) : (
                    <>
                      <UploadIcon style={{ width: "28px", height: "28px", color: C.copper }} />
                      <p style={{ fontFamily: SANS, color: C.label, fontSize: "14px", margin: 0 }}>
                        <span style={{ color: C.copper, fontWeight: 600 }}>Haz clic para subir</span> o arrastra aquí
                      </p>
                      <p style={{ fontFamily: SANS, color: C.body, fontSize: "11px", margin: 0 }}>PDF, JPG, PNG · máx. 10 MB</p>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>

          {/* ── Submit ─────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "8px", borderTop: `1px solid ${C.border}` }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                background: "transparent", border: `1px solid ${C.inputBorder}`,
                borderRadius: "8px", padding: "12px 24px",
                fontFamily: SANS, fontSize: "13px", fontWeight: 500, color: C.label,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !certificadoUrl || uploading}
              style={{
                background: (isSubmitting || !certificadoUrl || uploading) ? "rgba(46,74,51,0.45)" : C.green,
                color: C.cream, border: "none", borderRadius: "8px",
                padding: "12px 28px", fontFamily: SANS, fontSize: "13px",
                fontWeight: 600, letterSpacing: "0.04em",
                cursor: (isSubmitting || !certificadoUrl || uploading) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: "8px", transition: "background 0.2s",
              }}
            >
              {isSubmitting ? (
                <><Loader2 className="_spin" style={{ width: "15px", height: "15px" }} />Enviando...</>
              ) : uploading ? (
                <><Loader2 className="_spin" style={{ width: "15px", height: "15px" }} />Subiendo...</>
              ) : (
                "Enviar Solicitud"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
