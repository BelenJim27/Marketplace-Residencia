"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

import {
  ArrowLeft, Package, CheckCircle, Clock, Truck,
  MapPin, Copy, RefreshCw, AlertCircle, Star, ShieldCheck,
  FileText, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format-number";
import { getCookie } from "@/lib/cookies";

interface DetallePedido {
  id_producto: number;
  cantidad: number;
  precio_compra: string;
  moneda_compra?: string;
  impuesto?: string;
  productos?: {
    nombre: string;
    imagen_principal_url?: string;
    producto_imagenes?: Array<{ url: string }>;
  };
}

interface Envio {
  id_envio?: number;
  numero_rastreo?: string;
  estado?: string;
  costo_envio?: string;
  fecha_entrega_estimada?: string;
  transportistas?: { nombre: string };
}

interface Pedido {
  id?: number;
  id_pedido?: number;
  estado?: string;
  total?: string;
  moneda?: string;
  fecha_creacion?: string;
  creado_en?: string;
  direccion_envio_snapshot?: Record<string, string>;
  detalle_pedido?: DetallePedido[];
  envios?: Envio[];
}

const C = {
  green: "#3D6B3F",
  greenDark: "#2A4A2C",
  copper: "#C97A3E",
  amber: "#A8C26B",
  cream: "#F4F0E3",
  white: "#FFFFFF",
  text: "#2A2622",
  muted: "#9A9590",
  border: "rgba(61,107,63,0.12)",
};

/* ── Timeline ─────────────────────────────────────────────────────────────── */
const TIMELINE = [
  { key: "pendiente",  label: "Recibido",  icon: Clock        },
  { key: "pagado",     label: "Pagado",    icon: CheckCircle  },
  { key: "preparando", label: "Preparando",icon: Package      },
  { key: "enviado",    label: "Enviado",   icon: Truck        },
  { key: "entregado",  label: "Entregado", icon: Star         },
];

const ESTADO_INDEX: Record<string, number> = {
  pendiente: 0, pagado: 1, preparando: 2, enviado: 3, entregado: 4, cancelado: 0,
};

const ESTADO_BADGE: Record<string, { label: string; bg: string; text: string; dot: string; pulse: boolean }> = {
  pendiente:   { label: "Pendiente",           bg: "rgba(201,122,62,0.08)",  text: "#C97A3E", dot: "#C97A3E",  pulse: true  },
  pagado:      { label: "Pagado",              bg: "rgba(61,107,63,0.08)",   text: "#3D6B3F", dot: "#3D6B3F",  pulse: false },
  preparando:  { label: "Preparando",          bg: "rgba(168,194,107,0.10)", text: "#5E8A2E", dot: "#A8C26B",  pulse: true  },
  enviado:     { label: "Enviado",             bg: "rgba(59,130,246,0.08)",  text: "#2563EB", dot: "#3B82F6",  pulse: true  },
  entregado:   { label: "Entregado",           bg: "rgba(61,107,63,0.10)",   text: "#3D6B3F", dot: "#3D6B3F",  pulse: false },
  cancelado:   { label: "Cancelado",           bg: "rgba(100,100,100,0.08)", text: "#666",    dot: "#999",     pulse: false },
  recogido:    { label: "Recogido",            bg: "rgba(59,130,246,0.08)",  text: "#2563EB", dot: "#3B82F6",  pulse: true  },
  en_transito: { label: "En tránsito",         bg: "rgba(59,130,246,0.08)",  text: "#2563EB", dot: "#3B82F6",  pulse: true  },
  en_reparto:  { label: "En reparto",          bg: "rgba(99,102,241,0.08)",  text: "#6366F1", dot: "#6366F1",  pulse: true  },
  retrasado:   { label: "Retrasado",           bg: "rgba(245,158,11,0.08)",  text: "#D97706", dot: "#D97706",  pulse: true  },
  fallido:     { label: "Problema en entrega", bg: "rgba(239,68,68,0.08)",   text: "#DC2626", dot: "#DC2626",  pulse: false },
  devuelto:    { label: "Devuelto",            bg: "rgba(100,100,100,0.08)", text: "#666",    dot: "#999",     pulse: false },
};

/* ── Card ────────────────────────────────────────────────────────────────── */
function Card({ children, accentColor }: { children: React.ReactNode; accentColor?: string }) {
  return (
    <div style={{
      overflow: "hidden", borderRadius: "14px",
      background: C.white,
      boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      border: `1px solid ${C.border}`,
    }}>
      {accentColor && (
        <div style={{ height: "3px", background: `linear-gradient(90deg, ${accentColor}, rgba(42,74,44,0.08))` }} />
      )}
      <div style={{ padding: "22px" }}>{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      marginBottom: "16px", fontSize: "11px", fontWeight: "700",
      letterSpacing: "0.6px", textTransform: "uppercase", color: C.copper,
    }}>
      {children}
    </p>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <main style={{ maxWidth: "860px", margin: "0 auto", padding: "36px 20px 80px" }}>
      <style>{`@keyframes skPulse{0%,100%{opacity:1}50%{opacity:.4}}.sk{animation:skPulse 1.6s ease infinite}`}</style>
      <div className="sk" style={{ height: "14px", width: "80px", borderRadius: "6px", background: C.cream, marginBottom: "32px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "28px", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className="sk" style={{ height: "28px", width: "200px", borderRadius: "8px", background: C.cream }} />
          <div className="sk" style={{ height: "14px", width: "120px", borderRadius: "6px", background: C.cream }} />
        </div>
        <div className="sk" style={{ height: "40px", width: "110px", borderRadius: "10px", background: C.cream }} />
      </div>
      <div className="sk" style={{ height: "100px", borderRadius: "14px", background: C.cream, marginBottom: "20px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="sk" style={{ height: "180px", borderRadius: "14px", background: C.cream }} />
        <div className="sk" style={{ height: "180px", borderRadius: "14px", background: C.cream }} />
      </div>
    </main>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
function DetallePedidoContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const numeroPedido = searchParams.get("n");
  const { token: authToken } = useAuth();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingMap, setTrackingMap] = useState<Record<number, any>>({});
  const [trackingLoadingIds, setTrackingLoadingIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Factura CFDI — modal
  const [mostrarFactura, setMostrarFactura] = useState(false);
  const [facturaRfc, setFacturaRfc] = useState("");
  const [facturaPersona, setFacturaPersona] = useState<"fisica" | "moral">("fisica");
  const [facturaRegimen, setFacturaRegimen] = useState("");
  const [facturaUsoCfdi, setFacturaUsoCfdi] = useState("");
  const [facturaNombre, setFacturaNombre] = useState("");
  const [facturaApPaterno, setFacturaApPaterno] = useState("");
  const [facturaApMaterno, setFacturaApMaterno] = useState("");
  const [facturaCp, setFacturaCp] = useState("");
  const [facturaEmail, setFacturaEmail] = useState("");
  const [facturaEnviando, setFacturaEnviando] = useState(false);
  const [facturaEstado, setFacturaEstado] = useState<"idle" | "ok" | "error">("idle");
  const [facturaError, setFacturaError] = useState("");
  const [toastFactura, setToastFactura] = useState(false);

  const handleSolicitarFactura = async () => {
    const token = authToken || getCookie("token");
    const pedidoId = String(params.id);
    if (!pedidoId || !token) {
      setFacturaError("No se pudo identificar la sesión. Recarga la página.");
      setFacturaEstado("error");
      return;
    }
    if (!facturaRfc || !facturaEmail || !facturaRegimen || !facturaUsoCfdi) {
      setFacturaError("Completa todos los campos obligatorios (*).");
      setFacturaEstado("error");
      return;
    }
    setFacturaEnviando(true);
    setFacturaError("");
    try {
      const razonSocial = facturaPersona === "moral"
        ? facturaNombre
        : [facturaNombre, facturaApPaterno, facturaApMaterno].filter(Boolean).join(" ");
      const payload: Record<string, string> = {
        estado: "pendiente",
        rfc_receptor: facturaRfc,
        nombre_razon_social: razonSocial,
        uso_cfdi: facturaUsoCfdi,
        regimen_fiscal: facturaRegimen,
        email_factura: facturaEmail,
        tipo_persona: facturaPersona,
        codigo_postal: facturaCp,
      };
      await api.pedidos.addFactura(token, pedidoId, payload);
      setFacturaEstado("ok");
      // Cerrar modal y mostrar toast de éxito
      setTimeout(() => {
        setMostrarFactura(false);
        setToastFactura(true);
        setTimeout(() => setToastFactura(false), 5000);
      }, 800);
    } catch (e: any) {
      setFacturaEstado("error");
      setFacturaError(e?.message ?? "No se pudo registrar. Inténtalo de nuevo.");
    } finally {
      setFacturaEnviando(false);
    }
  };

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;
    api.pedidos
      .getOne(id)
      .then((data) => {
        setPedido(data as Pedido);
        const enviosConId = (data as Pedido).envios?.filter(e => e.id_envio) ?? [];
        enviosConId.forEach(e => e.id_envio && fetchTracking(e.id_envio));
      })
      .catch(() => setError("No se pudo cargar el pedido."))
      .finally(() => setCargando(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    document.body.style.overflow = mostrarFactura ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mostrarFactura]);

  const fetchTracking = async (idEnvio: number) => {
    setTrackingLoadingIds(prev => new Set(prev).add(idEnvio));
    try {
      const token = getCookie("token") || "";
      const res = await api.envios.getTracking(String(idEnvio), token);
      setTrackingMap(prev => ({ ...prev, [idEnvio]: res }));
    } catch {
      // no-op — sección queda sin eventos pero visible
    } finally {
      setTrackingLoadingIds(prev => { const s = new Set(prev); s.delete(idEnvio); return s; });
    }
  };

  const copiarTracking = (numero: string, idEnvio: number) => {
    navigator.clipboard.writeText(numero);
    setCopiedId(idEnvio);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (cargando) return <Skeleton />;

  // Estilos compartidos del modal de factura
  const labelStyle: React.CSSProperties = { fontSize: "12px", fontWeight: "600", color: C.muted, display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.4px" };
  const inputStyle: React.CSSProperties = { width: "100%", borderRadius: "8px", border: `1px solid ${C.border}`, padding: "10px 13px", fontSize: "14px", boxSizing: "border-box", outline: "none", transition: "border-color 160ms ease" };
  const selectStyle: React.CSSProperties = { ...inputStyle, background: C.white, cursor: "pointer" };

  // ── Modal de factura ──────────────────────────────────────────────────────
  const ModalFactura = mostrarFactura ? (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px", overflow: "hidden",
        animation: "fadeUp .2s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setMostrarFactura(false); }}
    >
      <div style={{
        background: C.white, borderRadius: "16px", width: "100%", maxWidth: "520px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        maxHeight: "calc(100vh - 48px)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: `1px solid ${C.border}`,
          background: `linear-gradient(135deg, ${C.greenDark}, ${C.green})`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={20} style={{ color: C.white }} />
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: C.white, fontFamily: "var(--font-family-store)" }}>
              Generar factura
            </h2>
          </div>
          <button
            onClick={() => setMostrarFactura(false)}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px", cursor: "pointer", padding: "6px 8px", color: C.white, display: "flex", alignItems: "center" }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto", flex: 1 }}>

          {/* Sección 1 — Datos del ticket */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", background: C.greenDark,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: "800", color: C.white, flexShrink: 0,
              }}>1</div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: C.greenDark }}>Datos del ticket</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={labelStyle}>Código de facturación</label>
                <input readOnly value={String(params.id)}
                  style={{ ...inputStyle, background: "#f9fafb", color: C.muted, fontFamily: "monospace", cursor: "default" }} />
              </div>
              <div>
                <label style={labelStyle}>Monto por facturar</label>
                <input readOnly value={pedido ? `$${Number(pedido.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—"}
                  style={{ ...inputStyle, background: "#f9fafb", color: C.muted, cursor: "default" }} />
              </div>
            </div>
          </section>

          {/* Sección 2 — Datos fiscales */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", background: C.greenDark,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: "800", color: C.white, flexShrink: 0,
              }}>2</div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: C.greenDark }}>Datos fiscales</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={labelStyle}>RFC *</label>
                <input
                  type="text" value={facturaRfc} placeholder="XAXX010101000"
                  onChange={(e) => setFacturaRfc(e.target.value.toUpperCase().slice(0, 13))}
                  style={{ ...inputStyle, fontFamily: "monospace" }}
                />
              </div>
              <div>
                <label style={labelStyle}>Persona *</label>
                <div style={{ display: "flex", gap: "20px", marginTop: "4px" }}>
                  {(["fisica", "moral"] as const).map((tipo) => (
                    <label key={tipo} style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", fontSize: "14px", color: C.text }}>
                      <input
                        type="radio" name="persona" value={tipo}
                        checked={facturaPersona === tipo}
                        onChange={() => setFacturaPersona(tipo)}
                        style={{ accentColor: C.green, width: "16px", height: "16px" }}
                      />
                      {tipo === "fisica" ? "Física" : "Moral"}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Régimen fiscal *</label>
                <select value={facturaRegimen} onChange={(e) => setFacturaRegimen(e.target.value)} style={selectStyle}>
                  <option value="">Selecciona régimen fiscal</option>
                  <option value="601">601 - General de Ley Personas Morales</option>
                  <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                  <option value="605">605 - Sueldos y Salarios</option>
                  <option value="606">606 - Arrendamiento</option>
                  <option value="608">608 - Demás ingresos</option>
                  <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                  <option value="616">616 - Sin obligaciones fiscales</option>
                  <option value="621">621 - Incorporación Fiscal</option>
                  <option value="622">622 - Actividades Agrícolas, Ganaderas, Silvícolas</option>
                  <option value="625">625 - Régimen de Plataformas Tecnológicas</option>
                  <option value="626">626 - Régimen Simplificado de Confianza</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Uso de CFDI *</label>
                <select value={facturaUsoCfdi} onChange={(e) => setFacturaUsoCfdi(e.target.value)} style={selectStyle}>
                  <option value="">Selecciona uso de CFDI</option>
                  <option value="G01">G01 - Adquisición de mercancias</option>
                  <option value="G02">G02 - Devoluciones, descuentos o bonificaciones</option>
                  <option value="G03">G03 - Gastos en general</option>
                  <option value="D01">D01 - Honorarios médicos y gastos hospitalarios</option>
                  <option value="D03">D03 - Gastos funerales</option>
                  <option value="D04">D04 - Donativos</option>
                  <option value="D10">D10 - Pagos por servicios educativos</option>
                  <option value="I01">I01 - Construcciones</option>
                  <option value="I03">I03 - Equipo de transporte</option>
                  <option value="I04">I04 - Equipo de cómputo y accesorios</option>
                  <option value="S01">S01 - Sin efectos fiscales</option>
                  <option value="CP01">CP01 - Pagos</option>
                  <option value="P01">P01 - Por definir</option>
                </select>
              </div>
            </div>
          </section>

          {/* Sección 3 — Datos personales */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", background: C.greenDark,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: "800", color: C.white, flexShrink: 0,
              }}>3</div>
              <span style={{ fontSize: "15px", fontWeight: "700", color: C.greenDark }}>Datos personales</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {facturaPersona === "fisica" ? (
                <>
                  <div>
                    <label style={labelStyle}>Nombre(s) *</label>
                    <input type="text" value={facturaNombre} placeholder="Nombre(s)" onChange={(e) => setFacturaNombre(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Apellido paterno *</label>
                    <input type="text" value={facturaApPaterno} placeholder="Apellido paterno" onChange={(e) => setFacturaApPaterno(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Apellido materno</label>
                    <input type="text" value={facturaApMaterno} placeholder="Apellido materno" onChange={(e) => setFacturaApMaterno(e.target.value)} style={inputStyle} />
                  </div>
                </>
              ) : (
                <div>
                  <label style={labelStyle}>Razón social *</label>
                  <input type="text" value={facturaNombre} placeholder="Razón social" onChange={(e) => setFacturaNombre(e.target.value)} style={inputStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>C.P. *</label>
                <input type="text" value={facturaCp} placeholder="Código postal" maxLength={5}
                  onChange={(e) => setFacturaCp(e.target.value.replace(/\D/g, "").slice(0, 5))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Correo electrónico *</label>
                <input type="email" value={facturaEmail} placeholder="tu@correo.com" onChange={(e) => setFacturaEmail(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </section>

          {facturaEstado === "error" && (
            <p style={{ fontSize: "13px", color: "#DC2626", margin: 0, padding: "10px 14px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca" }}>
              {facturaError}
            </p>
          )}

          {/* Botones */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setMostrarFactura(false)}
              style={{
                flex: "0 0 auto", borderRadius: "8px", background: "transparent",
                border: `1px solid ${C.border}`, color: C.muted,
                padding: "12px 18px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSolicitarFactura}
              disabled={facturaEnviando}
              style={{
                flex: 1, borderRadius: "8px",
                background: facturaEnviando ? C.muted : C.green,
                color: C.white, padding: "12px", fontSize: "14px", fontWeight: "700",
                border: "none", cursor: facturaEnviando ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                transition: "background 160ms ease",
              }}
            >
              {facturaEnviando
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Enviando…</>
                : <><FileText size={15} /> Generar factura</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;


  if (error || !pedido) {
    return (
      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "36px 20px" }}>
        <Card accentColor="#E74C3C">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <AlertCircle size={20} style={{ color: "#E74C3C", flexShrink: 0 }} />
            <p style={{ fontSize: "14px", fontWeight: "500", color: C.text, margin: 0 }}>
              {error || "Pedido no encontrado."}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            style={{
              marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "8px",
              borderRadius: "8px", padding: "9px 14px", fontSize: "14px", fontWeight: "600",
              color: C.green, background: "transparent", border: `1px solid ${C.green}`,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
        </Card>
      </main>
    );
  }

  const id = pedido.id || pedido.id_pedido;
  const estado = pedido.estado || "pendiente";
  const estadoIndex = ESTADO_INDEX[estado] ?? 0;
  const badge = ESTADO_BADGE[estado] ?? ESTADO_BADGE.pendiente;
  const fecha = (pedido.fecha_creacion || pedido.creado_en)
    ? new Date(pedido.fecha_creacion || pedido.creado_en!).toLocaleDateString("es-MX", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "—";
  const enviosConGuia  = pedido.envios?.filter(e =>  e.numero_rastreo) ?? [];
  const enviosSinGuia  = pedido.envios?.filter(e => !e.numero_rastreo) ?? [];
  const hasPendingEnvio = enviosSinGuia.length > 0;
  const direccion = pedido.direccion_envio_snapshot;
  const timelineTotal = TIMELINE.length - 1;

  return (
    <>
    <div style={{ position: "relative" }}>

      {/* ── 5 Agaves lado izquierdo ─────────────────────────────── */}
      <div aria-hidden style={{ position: "absolute", top: "20%", left: 0, width: 110, height: 110, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/agavenuevo.png" alt="" width={110} height={110} style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", top: "32%", left: 0, width: 110, height: 110, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/agavenuevo.png" alt="" width={110} height={110} style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", top: "44%", left: 0, width: 110, height: 110, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/agavenuevo.png" alt="" width={110} height={110} style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", top: "56%", left: 0, width: 110, height: 110, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/agavenuevo.png" alt="" width={110} height={110} style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      {/* ── 4 Agaves lado derecho ───────────────────────────────── */}
      <div aria-hidden style={{ position: "absolute", top: "20%", right: 0, width: 110, height: 110, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/agavenuevo.png" alt="" width={110} height={110} style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", top: "32%", right: 0, width: 110, height: 110, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/agavenuevo.png" alt="" width={110} height={110} style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", top: "44%", right: 0, width: 110, height: 110, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/agavenuevo.png" alt="" width={110} height={110} style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", top: "56%", right: 0, width: 110, height: 110, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/agavenuevo.png" alt="" width={110} height={110} style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>

      {/* ── 3 Murciélagos al nivel del título ───────────────────── */}
      <div aria-hidden style={{ position: "absolute", top: "-65px", left: "2%", width: 150, height: 150, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/murcielago.png" alt="" width={150} height={150}
          style={{ opacity: 0.60, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", top: "-90px", left: "50%", transform: "translateX(-50%)", width: 170, height: 170, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/murcielago.png" alt="" width={170} height={170}
          style={{ opacity: 0.60, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", top: "-62px", right: "2%", width: 145, height: 145, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/murcielago.png" alt="" width={145} height={145}
          style={{ opacity: 0.55, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>

      {/* ── Quiote izquierdo ────────────────────────────────────── */}
      <div aria-hidden style={{ position: "absolute", bottom: 0, left: 0, width: 240, height: "130vh", zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/quiote.png" alt="" fill
          style={{ opacity: 0.55, mixBlendMode: "multiply", objectFit: "contain", objectPosition: "bottom center" }} />
      </div>

      {/* ── Quiote derecho ──────────────────────────────────────── */}
      <div aria-hidden style={{ position: "absolute", bottom: 0, right: 0, width: 240, height: "130vh", zIndex: 2, pointerEvents: "none", transform: "scaleX(-1)" }}>
        <Image src="/fotos/quiote.png" alt="" fill
          style={{ opacity: 0.55, mixBlendMode: "multiply", objectFit: "contain", objectPosition: "bottom center" }} />
      </div>

      {/* ── 5 Mezcalll en la parte inferior ─────────────────────── */}
      <div aria-hidden style={{ position: "absolute", bottom: 0, left: "21%", width: 115, height: 115, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/mezcalll.png" alt="" width={115} height={115}
          style={{ opacity: 0.50, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", bottom: 0, left: "33%", width: 135, height: 135, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/mezcalll.png" alt="" width={135} height={135}
          style={{ opacity: 0.50, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 125, height: 125, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/mezcalll.png" alt="" width={125} height={125}
          style={{ opacity: 0.50, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", bottom: 0, right: "33%", width: 120, height: 120, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/mezcalll.png" alt="" width={120} height={120}
          style={{ opacity: 0.50, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", bottom: 0, right: "21%", width: 110, height: 110, zIndex: 2, pointerEvents: "none" }}>
        <Image src="/fotos/mezcalll.png" alt="" width={110} height={110}
          style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
      </div>

    <main style={{ position: "relative", zIndex: 1, maxWidth: "860px", margin: "0 auto", padding: "36px 20px 180px" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(.65);opacity:.5} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .fade { animation: fadeUp .4s ease both; }
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>

      {/* Back link */}
      <Link
        href="/tienda/compras"
        style={{
          display: "inline-flex", alignItems: "center", gap: "7px",
          marginBottom: "28px", fontSize: "14px", fontWeight: "600",
          color: C.copper, textDecoration: "none",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = C.green; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = C.copper; }}
      >
        <ArrowLeft size={14} />
        Mis Compras
      </Link>

      {/* ── Header ── */}
      <div
        className="fade"
        style={{
          display: "flex", flexWrap: "wrap", alignItems: "flex-start",
          justifyContent: "space-between", gap: "16px",
          borderBottom: `1px solid ${C.border}`, paddingBottom: "24px", marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h1 style={{
              fontFamily: "var(--font-family-store)",
              fontSize: "clamp(20px, 4vw, 26px)",
              fontWeight: "700", color: C.greenDark, margin: 0,
            }}>
              Pedido{" "}
              <span style={{ fontFamily: "monospace", color: C.copper }}>#{numeroPedido ?? id}</span>
            </h1>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              borderRadius: "999px", padding: "5px 12px",
              fontSize: "11px", fontWeight: "700",
              background: badge.bg, color: badge.text,
              border: "1px solid rgba(201,122,62,0.2)",
            }}>
              <span style={{
                height: "6px", width: "6px", borderRadius: "50%", background: badge.dot,
                animation: badge.pulse ? "dotPulse 2s ease infinite" : "none",
              }} />
              {badge.label}
            </span>
          </div>
          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: C.muted }}>
            <Clock size={12} />
            {fecha}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: C.copper, margin: "0 0 2px 0" }}>Total</p>
          <p style={{ fontFamily: "monospace", fontSize: "26px", fontWeight: "700", color: C.greenDark, margin: 0, lineHeight: 1 }}>
            ${formatPrice(Number(pedido.total || 0), { showCurrency: false })}
            <span style={{ marginLeft: "6px", fontSize: "13px", fontWeight: "400", color: C.muted }}>
              {pedido.moneda || "MXN"}
            </span>
          </p>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="fade" style={{ marginBottom: "20px", animationDelay: "60ms" }}>
        <Card accentColor={C.copper}>
          <SectionTitle>Estado del pedido</SectionTitle>
          <div style={{ position: "relative", display: "flex", alignItems: "flex-start", padding: "0 8px" }}>
            {/* Track background */}
            <div style={{
              position: "absolute", left: "28px", right: "28px", top: "16px",
              height: "2px", background: C.border, borderRadius: "2px",
            }} />
            {/* Track fill */}
            <div style={{
              position: "absolute", left: "28px", top: "16px",
              height: "2px", borderRadius: "2px",
              background: `linear-gradient(90deg, ${C.copper}, ${C.amber})`,
              transition: "width 700ms cubic-bezier(.4,0,.2,1)",
              width: estadoIndex === 0
                ? "0%"
                : `calc(${(estadoIndex / timelineTotal) * 100}% - 0px)`,
            }} />

            {TIMELINE.map((step, idx) => {
              const Icon = step.icon;
              const done   = idx <= estadoIndex;
              const active = idx === estadoIndex;
              return (
                <div key={step.key} style={{
                  position: "relative", zIndex: 1, flex: 1,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    height: "32px", width: "32px", borderRadius: "50%",
                    border: `2px solid ${done ? C.copper : C.border}`,
                    background: done ? C.copper : C.white,
                    color: done ? C.white : C.muted,
                    transition: "all 300ms ease",
                    transform: active ? "scale(1.15)" : "scale(1)",
                    boxShadow: active ? `0 0 0 4px rgba(201,122,62,0.15)` : "none",
                  }}>
                    <Icon size={13} />
                  </div>
                  <p
                    className="hidden sm:block"
                    style={{
                      textAlign: "center", fontSize: "11px", fontWeight: "600",
                      color: active ? C.copper : done ? C.green : C.muted,
                      margin: 0,
                    }}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Sección de envío y tracking ── */}
      {(pedido.estado === "pagado" || pedido.estado === "preparando" || pedido.estado === "enviado" || pedido.estado === "entregado") && (
        <div className="fade" style={{ marginBottom: "20px", animationDelay: "90ms" }}>
          <Card accentColor={C.amber}>
            <SectionTitle>Seguimiento de envío</SectionTitle>

            {/* Sin ningún envío creado todavía */}
            {(pedido.envios?.length ?? 0) === 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px",
                borderRadius: "8px", background: "rgba(201,122,62,0.06)", border: `1px solid rgba(201,122,62,0.15)`,
                marginBottom: "16px",
              }}>
                <Clock size={14} style={{ color: C.copper, flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: C.copper }}>Estamos procesando tu pedido, pronto recibirás el número de guía.</span>
              </div>
            )}

            {/* Envíos pendientes de guía (primer envío o paquetes adicionales en pedido multiproductor) */}
            {hasPendingEnvio && (
              <div style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px",
                borderRadius: "8px", background: "rgba(201,122,62,0.06)", border: `1px solid rgba(201,122,62,0.15)`,
                marginBottom: "16px",
              }}>
                <Loader2 size={14} style={{ color: C.copper, animation: "spin 1s linear infinite", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: C.copper }}>
                  {enviosConGuia.length > 0
                    ? `Preparando ${enviosSinGuia.length} paquete${enviosSinGuia.length > 1 ? "s" : ""} adicional${enviosSinGuia.length > 1 ? "es" : ""}...`
                    : "Preparando tu envío..."}
                </span>
              </div>
            )}

            {/* Una tarjeta de tracking por cada envío con guía */}
            {enviosConGuia.map((envio, envioIdx) => {
              const id = envio.id_envio!;
              const trk = trackingMap[id];
              const isLoading = trackingLoadingIds.has(id);
              const isCopied = copiedId === id;
              return (
                <div key={id} style={{ marginBottom: envioIdx < enviosConGuia.length - 1 ? "20px" : "0" }}>
                  {/* Separador entre paquetes */}
                  {envioIdx > 0 && (
                    <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: "16px" }} />
                  )}
                  {enviosConGuia.length > 1 && (
                    <p style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: C.muted, margin: "0 0 10px 0" }}>
                      Paquete {envioIdx + 1}
                    </p>
                  )}

                  {/* Número de guía + estado */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      height: "38px", width: "38px", flexShrink: 0, borderRadius: "10px",
                      background: `linear-gradient(135deg, rgba(168,194,107,0.10), rgba(201,122,62,0.04))`,
                      border: `1px solid ${C.border}`,
                    }}>
                      <Truck size={16} style={{ color: C.amber }} />
                    </div>
                    <div>
                      <p style={{ fontSize: "12px", color: C.muted, margin: 0 }}>Número de guía</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <p style={{ fontSize: "14px", fontWeight: "700", fontFamily: "monospace", color: C.text, margin: 0 }}>
                          {envio.numero_rastreo}
                        </p>
                        <button
                          onClick={() => copiarTracking(envio.numero_rastreo!, id)}
                          title="Copiar número de rastreo"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: isCopied ? C.green : C.muted }}
                        >
                          {isCopied ? <CheckCircle size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                      {(trk?.estado_actual || envio.estado) && (() => {
                        const est = trk?.estado_actual ?? envio.estado ?? '';
                        const badge = ESTADO_BADGE[est] ?? ESTADO_BADGE.en_transito;
                        return (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "5px",
                            fontSize: "11px", fontWeight: "700", padding: "3px 8px",
                            borderRadius: "999px", background: badge.bg, color: badge.text,
                            marginTop: "6px",
                          }}>
                            <span style={{
                              width: "6px", height: "6px", borderRadius: "50%",
                              background: badge.dot, flexShrink: 0,
                              animation: badge.pulse ? "pulse 1.5s ease-in-out infinite" : "none",
                            }} />
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Botón refrescar */}
                  <button
                    onClick={() => fetchTracking(id)}
                    disabled={isLoading}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
                      color: C.copper, background: "none", border: "none", cursor: "pointer",
                      padding: "4px 0", fontWeight: "600", opacity: isLoading ? 0.6 : 1,
                      marginBottom: "12px",
                    }}
                  >
                    <RefreshCw size={12} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
                    {isLoading ? "Actualizando..." : "Actualizar seguimiento"}
                  </button>

                  {/* Timeline de eventos */}
                  {trk?.eventos && trk.eventos.length > 0 && (
                    <div>
                      <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: C.muted, margin: "0 0 12px 0" }}>
                        Historial de eventos
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                        {(trk.eventos as Array<{ descripcion: string; estado: string; fecha: string; ubicacion?: string }>).map((evento, idx) => {
                          const badge = ESTADO_BADGE[evento.estado] ?? ESTADO_BADGE.en_transito;
                          const isLast = idx === trk.eventos.length - 1;
                          return (
                            <div key={idx} style={{ display: "flex", gap: "14px", position: "relative" }}>
                              {!isLast && (
                                <div style={{
                                  position: "absolute", left: "7px", top: "22px", bottom: 0,
                                  width: "1px", background: C.border,
                                }} />
                              )}
                              <div style={{
                                flexShrink: 0, width: "15px", height: "15px",
                                borderRadius: "50%", background: badge.dot,
                                marginTop: "4px", border: `2px solid ${C.white}`,
                                boxShadow: `0 0 0 1px ${badge.dot}`,
                              }} />
                              <div style={{ paddingBottom: "16px", flex: 1 }}>
                                <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: C.text }}>{evento.descripcion}</p>
                                <div style={{ display: "flex", gap: "10px", marginTop: "3px", flexWrap: "wrap" }}>
                                  {evento.ubicacion && (
                                    <span style={{ fontSize: "11px", color: C.muted, display: "flex", alignItems: "center", gap: "3px" }}>
                                      <MapPin size={10} /> {evento.ubicacion}
                                    </span>
                                  )}
                                  <span style={{ fontSize: "11px", color: C.muted }}>
                                    {new Date(evento.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fecha estimada de entrega */}
                  {trk?.fecha_entrega_estimada && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: "8px", marginTop: "12px",
                      padding: "10px 14px", borderRadius: "8px",
                      background: "rgba(61,107,63,0.06)", border: "1px solid rgba(61,107,63,0.15)",
                    }}>
                      <CheckCircle size={14} style={{ color: C.green, flexShrink: 0 }} />
                      <span style={{ fontSize: "13px", color: C.greenDark }}>
                        Entrega estimada: <strong>{new Date(trk.fecha_entrega_estimada).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* ── Sección unificada ── */}
      <div className="fade" style={{
        animationDelay: "120ms",
        background: C.white, borderRadius: "14px",
        border: `1px solid ${C.border}`,
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}>
        {/* Products */}
        <div style={{ padding: "22px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px", textTransform: "uppercase", color: C.copper, margin: 0 }}>
              Productos
            </p>
            {pedido.detalle_pedido && pedido.detalle_pedido.length > 0 && (
              <span style={{
                fontSize: "12px", fontWeight: "700", color: C.copper,
                background: "rgba(201,122,62,0.08)", border: "1px solid rgba(201,122,62,0.2)",
                borderRadius: "999px", padding: "2px 10px",
              }}>
                {pedido.detalle_pedido.length}
              </span>
            )}
          </div>
          {pedido.detalle_pedido && pedido.detalle_pedido.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {pedido.detalle_pedido.map((item, idx) => {
                const imgUrl = item.productos?.producto_imagenes?.[0]?.url
                  || item.productos?.imagen_principal_url
                  || null;
                const nombre = item.productos?.nombre || `Producto #${item.id_producto}`;
                const lineTotal = Number(item.precio_compra) * item.cantidad;
                return (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "14px 0",
                    borderBottom: idx < pedido.detalle_pedido!.length - 1 ? `1px solid ${C.border}` : "none",
                  }}>
                    <div style={{
                      position: "relative", height: "58px", width: "58px",
                      flexShrink: 0, borderRadius: "10px", overflow: "hidden",
                      background: C.cream, border: `1px solid ${C.border}`,
                    }}>
                      {imgUrl ? (
                        <Image src={imgUrl} alt={nombre} fill sizes="58px" className="object-cover" />
                      ) : (
                        <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
                          <Package size={20} style={{ color: C.border }} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: "600", color: C.greenDark, margin: "0 0 3px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {nombre}
                      </p>
                      <p style={{ fontSize: "12px", color: C.muted, margin: 0 }}>
                        {item.cantidad} × ${formatPrice(Number(item.precio_compra), { showCurrency: false })}
                      </p>
                    </div>
                    <p style={{ flexShrink: 0, fontFamily: "monospace", fontSize: "15px", fontWeight: "700", color: C.copper, margin: 0 }}>
                      ${formatPrice(lineTotal, { showCurrency: false })}
                      <span style={{ marginLeft: "4px", fontSize: "11px", fontWeight: "400", color: C.muted }}>{item.moneda_compra || "MXN"}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ padding: "16px 0", textAlign: "center", fontSize: "14px", color: C.muted, margin: 0 }}>
              Sin información de productos.
            </p>
          )}
        </div>

        {/* Resumen de costos */}
        {(() => {
          const items = pedido.detalle_pedido ?? [];
          const subtotal = items.reduce((acc, item) => acc + Number(item.precio_compra) * item.cantidad, 0);
          const costoEnvio = (pedido.envios ?? []).reduce((sum, e) => sum + Number(e.costo_envio ?? 0), 0);
          const total = Number(pedido.total ?? subtotal + costoEnvio);
          const moneda = pedido.moneda || "MXN";
          return (
            <div style={{ padding: "22px", borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px", textTransform: "uppercase", color: C.copper, margin: "0 0 16px 0" }}>
                Resumen de costos
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "14px", color: C.muted }}>Subtotal</span>
                  <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "600", color: C.text }}>${formatPrice(subtotal, { showCurrency: false })}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "14px", color: C.muted }}>Envío</span>
                  <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "600", color: costoEnvio === 0 ? C.green : C.text }}>
                    {costoEnvio === 0 ? "Gratis" : `$${formatPrice(costoEnvio, { showCurrency: false })}`}
                  </span>
                </div>
                <div style={{ height: "1px", background: C.border, margin: "4px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>Total</span>
                  <span style={{ fontFamily: "monospace", fontSize: "20px", fontWeight: "700", color: C.copper }}>
                    ${formatPrice(total, { showCurrency: false })}
                    <span style={{ marginLeft: "4px", fontSize: "12px", fontWeight: "400", color: C.muted }}>{moneda}</span>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <ShieldCheck size={13} style={{ color: C.border, flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", color: C.muted }}>Pago protegido · IVA incluido</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Dirección de envío */}
        {direccion && (
          <div style={{ padding: "22px", borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px", textTransform: "uppercase", color: C.copper, margin: "0 0 16px 0" }}>
              Dirección de envío
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "38px", width: "38px", flexShrink: 0, borderRadius: "10px",
                background: `linear-gradient(135deg, rgba(168,194,107,0.10), rgba(201,122,62,0.04))`,
                border: `1px solid ${C.border}`,
              }}>
                <MapPin size={16} style={{ color: C.amber }} />
              </div>
              <div>
                <p style={{ fontSize: "14px", color: C.greenDark, margin: 0, lineHeight: "1.6" }}>
                  {direccion.es_internacional ? (
                    <>{direccion.linea_1}{direccion.linea_2 && <span>, {direccion.linea_2}</span>}</>
                  ) : (
                    <>{direccion.calle} {direccion.numero}{direccion.colonia && <span>, {direccion.colonia}</span>}</>
                  )}
                </p>
                {direccion.referencia && (
                  <p style={{ marginTop: "4px", fontSize: "12px", color: C.muted, margin: 0 }}>{direccion.referencia}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Facturación */}
        <div style={{ padding: "22px" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px", textTransform: "uppercase", color: C.copper, margin: "0 0 16px 0" }}>
            Facturación
          </p>
          {facturaEstado === "ok" ? (
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              fontSize: "13px", color: C.green, fontWeight: "500",
              borderRadius: "8px", background: "rgba(61,107,63,0.06)",
              border: "1px solid rgba(61,107,63,0.2)", padding: "12px 14px",
            }}>
              <CheckCircle size={15} />
              Solicitud enviada. Revisa tu correo{facturaEmail && <strong> {facturaEmail}</strong>} (también en spam).
            </div>
          ) : (
            <button
              onClick={() => setMostrarFactura(true)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: "8px", borderRadius: "8px", background: "transparent",
                border: `1px solid ${C.border}`, color: C.green,
                padding: "11px 16px", fontSize: "13px", fontWeight: "600", cursor: "pointer",
                transition: "background 160ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(61,107,63,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <FileText size={15} />
              Solicitar factura (CFDI)
            </button>
          )}
        </div>
      </div>

      {/* ELIMINAR RESTO DEL GRID VIEJO - marcador */}
      <div style={{ display: "none" }}>
        {/* Left column: Productos + Dirección + Facturación */}
        <div className="fade" style={{ animationDelay: "120ms", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Products */}
          <Card accentColor={C.green}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px", textTransform: "uppercase", color: C.copper, margin: 0 }}>
                Productos
              </p>
              {pedido.detalle_pedido && pedido.detalle_pedido.length > 0 && (
                <span style={{
                  fontSize: "12px", fontWeight: "700", color: C.copper,
                  background: "rgba(201,122,62,0.08)", border: "1px solid rgba(201,122,62,0.2)",
                  borderRadius: "999px", padding: "2px 10px",
                }}>
                  {pedido.detalle_pedido.length}
                </span>
              )}
            </div>
            {pedido.detalle_pedido && pedido.detalle_pedido.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {pedido.detalle_pedido.map((item, idx) => {
                  const imgUrl = item.productos?.producto_imagenes?.[0]?.url
                    || item.productos?.imagen_principal_url
                    || null;
                  const nombre = item.productos?.nombre || `Producto #${item.id_producto}`;
                  const lineTotal = Number(item.precio_compra) * item.cantidad;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex", alignItems: "center", gap: "14px",
                        padding: "14px 0",
                        borderBottom: idx < pedido.detalle_pedido!.length - 1
                          ? `1px solid ${C.border}` : "none",
                      }}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        position: "relative", height: "58px", width: "58px",
                        flexShrink: 0, borderRadius: "10px", overflow: "hidden",
                        background: C.cream, border: `1px solid ${C.border}`,
                      }}>
                        {imgUrl ? (
                          <Image
                            src={imgUrl}
                            alt={nombre}
                            fill
                            sizes="58px"
                            className="object-cover"
                          />
                        ) : (
                          <div style={{
                            display: "flex", height: "100%",
                            alignItems: "center", justifyContent: "center",
                          }}>
                            <Package size={20} style={{ color: C.border }} />
                          </div>
                        )}
                      </div>

                      {/* Name + qty */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: "14px", fontWeight: "600", color: C.greenDark,
                          margin: "0 0 3px 0",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {nombre}
                        </p>
                        <p style={{ fontSize: "12px", color: C.muted, margin: 0 }}>
                          {item.cantidad} × ${formatPrice(Number(item.precio_compra), { showCurrency: false })}
                        </p>
                      </div>

                      {/* Line total */}
                      <p style={{
                        flexShrink: 0, fontFamily: "monospace",
                        fontSize: "15px", fontWeight: "700", color: C.copper, margin: 0,
                      }}>
                        ${formatPrice(lineTotal, { showCurrency: false })}
                        <span style={{ marginLeft: "4px", fontSize: "11px", fontWeight: "400", color: C.muted }}>
                          {item.moneda_compra || "MXN"}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ padding: "16px 0", textAlign: "center", fontSize: "14px", color: C.muted, margin: 0 }}>
                Sin información de productos.
              </p>
            )}
          </Card>

          {/* Dirección de envío */}
          {direccion && (
            <Card accentColor={C.amber}>
              <SectionTitle>Dirección de envío</SectionTitle>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  height: "38px", width: "38px", flexShrink: 0, borderRadius: "10px",
                  background: `linear-gradient(135deg, rgba(168,194,107,0.10), rgba(201,122,62,0.04))`,
                  border: `1px solid ${C.border}`,
                }}>
                  <MapPin size={16} style={{ color: C.amber }} />
                </div>
                <div>
                  <p style={{ fontSize: "14px", color: C.greenDark, margin: 0, lineHeight: "1.6" }}>
                    {direccion.es_internacional ? (
                      <>
                        {direccion.linea_1}
                        {direccion.linea_2 && <span>, {direccion.linea_2}</span>}
                      </>
                    ) : (
                      <>
                        {direccion.calle} {direccion.numero}
                        {direccion.colonia && <span>, {direccion.colonia}</span>}
                      </>
                    )}
                  </p>
                  {direccion.referencia && (
                    <p style={{ marginTop: "4px", fontSize: "12px", color: C.muted, margin: 0 }}>
                      {direccion.referencia}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

        </div>

        {/* Right column: Resumen de costos + Facturación */}
        <div className="fade" style={{ animationDelay: "180ms", display: "flex", flexDirection: "column", gap: "16px" }}>
          {(() => {
            const items = pedido.detalle_pedido ?? [];
            const subtotal = items.reduce(
              (acc, item) => acc + Number(item.precio_compra) * item.cantidad,
              0,
            );
            const costoEnvio = (pedido.envios ?? []).reduce((sum, e) => sum + Number(e.costo_envio ?? 0), 0);
            const total = Number(pedido.total ?? subtotal + costoEnvio);
            const moneda = pedido.moneda || "MXN";
            return (
              <Card accentColor={C.copper}>
                <SectionTitle>Resumen de costos</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", color: C.muted }}>Subtotal</span>
                    <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "600", color: C.text }}>
                      ${formatPrice(subtotal, { showCurrency: false })}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", color: C.muted }}>Envío</span>
                    <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "600", color: costoEnvio === 0 ? C.green : C.text }}>
                      {costoEnvio === 0 ? "Gratis" : `$${formatPrice(costoEnvio, { showCurrency: false })}`}
                    </span>
                  </div>
                  <div style={{ height: "1px", background: C.border }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>Total</span>
                    <span style={{ fontFamily: "monospace", fontSize: "20px", fontWeight: "700", color: C.copper }}>
                      ${formatPrice(total, { showCurrency: false })}
                      <span style={{ marginLeft: "4px", fontSize: "12px", fontWeight: "400", color: C.muted }}>{moneda}</span>
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
                    <ShieldCheck size={13} style={{ color: C.border, flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: C.muted }}>Pago protegido · IVA incluido</span>
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* Factura CFDI */}
          <Card accentColor={C.copper}>
            <SectionTitle>Facturación</SectionTitle>
            {facturaEstado === "ok" ? (
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                fontSize: "13px", color: C.green, fontWeight: "500",
                borderRadius: "8px", background: "rgba(61,107,63,0.06)",
                border: "1px solid rgba(61,107,63,0.2)", padding: "12px 14px",
              }}>
                <CheckCircle size={15} />
                Solicitud enviada. Revisa tu correo{facturaEmail && <strong> {facturaEmail}</strong>} (también en spam).
              </div>
            ) : (
              <button
                onClick={() => setMostrarFactura(true)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  gap: "8px", borderRadius: "8px", background: "transparent",
                  border: `1px solid ${C.border}`, color: C.green,
                  padding: "11px 16px", fontSize: "13px", fontWeight: "600", cursor: "pointer",
                  transition: "background 160ms ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(61,107,63,0.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <FileText size={15} />
                Solicitar factura (CFDI)
              </button>
            )}
          </Card>
        </div>
      </div>
    </main>
    </div>
    {ModalFactura}

    {/* Toast de factura enviada */}
    {toastFactura && (
      <div style={{
        position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
        zIndex: 200, background: C.green, color: C.white,
        borderRadius: "12px", padding: "14px 22px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        display: "flex", alignItems: "center", gap: "10px",
        fontSize: "14px", fontWeight: "600",
        animation: "fadeUp .3s ease",
        whiteSpace: "nowrap",
      }}>
        <CheckCircle size={18} />
        ¡Factura enviada! Revisa tu correo{facturaEmail ? ` (${facturaEmail})` : ""}.
        <button
          onClick={() => setToastFactura(false)}
          style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "6px", cursor: "pointer", padding: "2px 8px", color: C.white, marginLeft: "6px", fontSize: "13px" }}
        >
          ✕
        </button>
      </div>
    )}
    </>
  );
}

export default function DetallePedidoPage() {
  return (
    <Suspense>
      <DetallePedidoContent />
    </Suspense>
  );
}
