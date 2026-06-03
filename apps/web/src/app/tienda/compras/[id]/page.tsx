"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Package, CheckCircle, Clock, Truck,
  MapPin, Copy, RefreshCw, AlertCircle, Star, ShieldCheck,
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
}

interface Pedido {
  id?: number;
  id_pedido?: number;
  estado?: string;
  total?: string;
  moneda?: string;
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
export default function DetallePedidoPage() {
  const params = useParams();
  const router = useRouter();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;
    api.pedidos
      .getOne(id)
      .then((data) => {
        setPedido(data as Pedido);
        if ((data as Pedido).envios?.[0]?.id_envio) {
          fetchTracking((data as Pedido).envios![0].id_envio);
        }
      })
      .catch(() => setError("No se pudo cargar el pedido."))
      .finally(() => setCargando(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchTracking = async (idEnvio: any) => {
    setTrackingLoading(true);
    try {
      const token = getCookie("token") || "";
      const res = await api.envios.getTracking(String(idEnvio), token);
      setTracking(res);
    } catch {
      setTracking(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const copiarTracking = () => {
    if (tracking?.numero_rastreo) {
      navigator.clipboard.writeText(tracking.numero_rastreo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (cargando) return <Skeleton />;

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
  const fecha = pedido.creado_en
    ? new Date(pedido.creado_en).toLocaleDateString("es-MX", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "—";
  const envio = pedido.envios?.[0];
  const direccion = pedido.direccion_envio_snapshot;
  const timelineTotal = TIMELINE.length - 1;

  return (
    <main style={{ maxWidth: "860px", margin: "0 auto", padding: "36px 20px 80px" }}>
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
              <span style={{ fontFamily: "monospace", color: C.copper }}>#{id}</span>
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

      {/* ── Body grid ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Products + Summary */}
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

          {/* Cost summary */}
          {(() => {
            const items = pedido.detalle_pedido ?? [];
            const subtotal = items.reduce(
              (acc, item) => acc + Number(item.precio_compra) * item.cantidad,
              0,
            );
            const costoEnvio = Number(envio?.costo_envio ?? 0);
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
        </div>

        {/* Right column */}
        <div className="fade" style={{ animationDelay: "180ms", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Address */}
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

          {/* Envío details */}
          {envio && (
            <Card accentColor={C.copper}>
              <SectionTitle>Información de envío</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {envio.numero_rastreo && (
                  <div>
                    <p style={{ marginBottom: "6px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: C.copper }}>
                      Número de rastreo
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "700", color: C.greenDark }}>
                        {envio.numero_rastreo}
                      </span>
                      <button
                        onClick={copiarTracking}
                        aria-label={copied ? "Número copiado" : "Copiar número de rastreo"}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          height: "30px", width: "30px", borderRadius: "7px",
                          background: C.cream, color: C.copper,
                          border: `1px solid ${C.border}`, cursor: "pointer",
                          transition: "all 160ms ease",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = C.copper; e.currentTarget.style.color = C.white; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = C.cream; e.currentTarget.style.color = C.copper; }}
                      >
                        <Copy size={13} />
                      </button>
                      {copied && (
                        <span style={{ fontSize: "11px", fontWeight: "600", color: C.green }} role="status">
                          ¡Copiado!
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {envio.costo_envio && (
                  <div>
                    <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: C.copper }}>
                      Costo de envío
                    </p>
                    <p style={{ fontFamily: "monospace", fontSize: "15px", fontWeight: "700", color: C.greenDark, margin: 0 }}>
                      ${formatPrice(Number(envio.costo_envio), { showCurrency: false })}{" "}
                      <span style={{ fontSize: "11px", fontWeight: "400", color: C.muted }}>MXN</span>
                    </p>
                  </div>
                )}

                {envio.fecha_entrega_estimada && (
                  <div>
                    <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: C.copper }}>
                      Entrega estimada
                    </p>
                    <p style={{ fontSize: "15px", fontWeight: "600", color: C.greenDark, margin: 0 }}>
                      {new Date(envio.fecha_entrega_estimada).toLocaleDateString("es-MX", {
                        day: "2-digit", month: "long",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Tracking events */}
          <Card accentColor={C.green}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <SectionTitle>Seguimiento</SectionTitle>
              {envio?.id_envio && (
                <button
                  onClick={() => fetchTracking(envio.id_envio)}
                  disabled={trackingLoading}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    borderRadius: "6px", background: C.cream, color: C.copper,
                    padding: "7px 12px", fontSize: "11px", fontWeight: "700",
                    border: `1px solid ${C.border}`, cursor: trackingLoading ? "not-allowed" : "pointer",
                    opacity: trackingLoading ? 0.5 : 1, transition: "all 160ms ease",
                  }}
                  onMouseEnter={(e) => { if (!trackingLoading) { e.currentTarget.style.background = C.copper; e.currentTarget.style.color = C.white; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.cream; e.currentTarget.style.color = C.copper; }}
                >
                  <RefreshCw size={12} style={{ animation: trackingLoading ? "spin 1s linear infinite" : "none" }} />
                  {trackingLoading ? "Actualizando…" : "Actualizar"}
                </button>
              )}
            </div>

            {tracking?.estado_actual && (
              <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.4px", textTransform: "uppercase", color: C.muted }}>Estado:</span>
                <span style={{
                  display: "inline-block", borderRadius: "999px", padding: "3px 10px",
                  fontSize: "11px", fontWeight: "700",
                  background: ESTADO_BADGE[tracking.estado_actual]?.bg ?? "rgba(100,100,100,0.08)",
                  color: ESTADO_BADGE[tracking.estado_actual]?.text ?? "#666",
                  border: "1px solid rgba(201,122,62,0.15)",
                }}>
                  {ESTADO_BADGE[tracking.estado_actual]?.label ?? tracking.estado_actual}
                </span>
                {tracking.fecha_entrega_estimada && (
                  <span style={{ fontSize: "12px", color: C.muted }}>
                    · Entrega est.{" "}
                    {new Date(tracking.fecha_entrega_estimada).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>
            )}

            {trackingLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: "44px", borderRadius: "8px", background: C.cream, animation: "skPulse 1.6s ease infinite" }} />
                ))}
              </div>
            ) : !envio ? (
              <p style={{ fontSize: "14px", color: C.muted, margin: 0 }}>
                Aún no hay información de envío para este pedido.
              </p>
            ) : !envio.numero_rastreo ? (
              <p style={{ fontSize: "14px", color: C.muted, margin: 0 }}>
                La guía de envío aún no ha sido generada. Recibirás una notificación cuando esté lista.
              </p>
            ) : tracking?.eventos && tracking.eventos.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {tracking.eventos.map((evento: any, idx: number) => (
                  <div key={idx} style={{ display: "flex", gap: "12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        marginTop: "3px", height: "10px", width: "10px", flexShrink: 0,
                        borderRadius: "50%", border: `2px solid ${C.white}`,
                        background: idx === 0 ? C.copper : C.border,
                        boxShadow: idx === 0 ? `0 0 0 2px ${C.copper}50` : "none",
                      }} />
                      {idx < tracking.eventos.length - 1 && (
                        <div style={{ width: "2px", flex: 1, background: C.border, minHeight: "28px", marginTop: "4px" }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: idx === tracking.eventos.length - 1 ? 0 : "16px" }}>
                      <p style={{
                        fontSize: "14px", fontWeight: "600",
                        color: idx === 0 ? C.greenDark : C.muted, margin: 0,
                      }}>
                        {evento.descripcion}
                      </p>
                      <div style={{ marginTop: "3px", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: C.muted, flexWrap: "wrap" }}>
                        <span>
                          {new Date(evento.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                          {" · "}
                          {new Date(evento.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {evento.ubicacion && (
                          <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                            <MapPin size={11} />
                            {evento.ubicacion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "14px", color: C.muted, margin: 0 }}>
                Guía generada. Los eventos de rastreo aparecerán aquí en cuanto el paquete sea recolectado.
              </p>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
