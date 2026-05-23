"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Package, CheckCircle, Clock,
  MapPin, Copy, RefreshCw, AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format-number";
import { getCookie } from "@/lib/cookies";

interface DetallePedido {
  id_producto: number;
  cantidad: number;
  precio_compra: string;
  moneda_compra?: string;
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

const COLOR_PALETTE = {
  green: "#2E4A33",
  copper: "#C97A3E",
  amber: "#C89B4A",
  cream: "#F4F0E3",
  white: "#FFFFFF",
  border: "rgba(46,74,51,0.12)",
};

/* ── Timeline config ─────────────────────────────────────────────────────── */
const TIMELINE = [
  { key: "pendiente", label: "Pedido recibido",  icon: Clock },
  { key: "pagado",    label: "Pago confirmado",  icon: CheckCircle },
];

const ESTADO_INDEX: Record<string, number> = {
  pendiente: 0, pagado: 1, preparando: 1, enviado: 1, entregado: 1,
};

const ESTADO_BADGE: Record<string, { label: string; bg: string; text: string; dot: string; pulse: boolean }> = {
  pendiente:  { label: "Pendiente",  bg: "rgba(201,122,62,0.08)", text: "#C97A3E", dot: "#C97A3E",  pulse: true  },
  pagado:     { label: "Pagado",     bg: "rgba(46,74,51,0.08)", text: "#2E4A33", dot: "#2E4A33",    pulse: false },
  preparando: { label: "Preparando", bg: "rgba(200,155,74,0.08)", text: "#C89B4A", dot: "#C89B4A", pulse: true  },
  enviado:    { label: "Enviado",    bg: "rgba(46,74,51,0.08)", text: "#2E4A33", dot: "#2E4A33", pulse: true  },
  entregado:  { label: "Entregado", bg: "rgba(46,74,51,0.08)", text: "#2E4A33", dot: "#2E4A33", pulse: false },
  cancelado:  { label: "Cancelado", bg: "rgba(100,100,100,0.08)", text: "#666666", dot: "#999999",   pulse: false },
};

/* ── Section card wrapper ────────────────────────────────────────────────── */
function Card({
  children,
  className = "",
  accentColor,
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}) {
  return (
    <div style={{ overflow: "hidden", borderRadius: "12px", background: `linear-gradient(135deg, ${COLOR_PALETTE.white} 0%, ${COLOR_PALETTE.cream}04 100%)`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${COLOR_PALETTE.border}`, ...((className?.split(' ') || []).reduce((acc, cls) => acc, {})) }}>
      {accentColor && <div style={{ height: "2px", width: "100%", background: `linear-gradient(90deg, ${accentColor} 0%, rgba(46,74,51,0.1) 100%)` }} />}
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ marginBottom: "16px", fontSize: "12px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: COLOR_PALETTE.copper }}>
      {children}
    </p>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <main className="mx-auto max-w-screen-lg px-4 py-10 md:px-8">
      <div className="mb-8 h-4 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-gray-700" />
      <div className="mb-6 flex justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
          <div className="h-4 w-28 animate-pulse rounded-full bg-gray-100 dark:bg-gray-700" />
        </div>
        <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
      </div>
      <div className="mb-6 h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-700" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-700" />
        <div className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-700" />
      </div>
    </main>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
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
      <main className="mx-auto max-w-screen-lg px-4 py-10 md:px-8">
        <Card accentColor="#E74C3C">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <AlertCircle size={20} style={{ color: "#E74C3C" }} />
            <p style={{ fontSize: "14px", fontWeight: "500", color: COLOR_PALETTE.green, margin: 0 }}>
              {error || "Pedido no encontrado."}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            style={{ marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "8px", borderRadius: "6px", padding: "8px 12px", fontSize: "14px", fontWeight: "600", color: COLOR_PALETTE.green, background: "transparent", border: `1px solid ${COLOR_PALETTE.green}`, transition: "all 200ms ease", cursor: "pointer", textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = COLOR_PALETTE.green; e.currentTarget.style.color = COLOR_PALETTE.white; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = COLOR_PALETTE.green; }}
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

  return (
    <main className="mx-auto max-w-screen-lg px-4 py-10 md:px-8">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeSlideUp 0.35s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .fade-in { animation: none; opacity: 1; }
        }
      `}</style>

      {/* Back */}
      <Link
        href="/tienda/compras"
        style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "28px", fontSize: "14px", fontWeight: "500", color: COLOR_PALETTE.copper, textDecoration: "none", transition: "color 200ms ease" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = COLOR_PALETTE.green; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = COLOR_PALETTE.copper; }}
      >
        <ArrowLeft size={14} style={{ transition: "transform 200ms ease" }} />
        Mis Compras
      </Link>

      {/* ── Header ── */}
      <div className="fade-in mb-6" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", borderBottom: `1px solid ${COLOR_PALETTE.border}`, paddingBottom: "24px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.5px", color: COLOR_PALETTE.green, margin: 0 }}>
              Pedido <span style={{ fontFamily: "monospace", color: COLOR_PALETTE.copper }}>#{id}</span>
            </h1>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", borderRadius: "20px", padding: "6px 12px", fontSize: "11px", fontWeight: "700", background: badge.bg, color: badge.text, border: `1px solid rgba(201,122,62,0.2)` }}>
              <span style={{ height: "6px", width: "6px", borderRadius: "50%", background: badge.dot, animation: badge.pulse ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none" }} />
              {badge.label}
            </span>
          </div>
          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#999999" }}>
            <Clock size={12} />
            {fecha}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: COLOR_PALETTE.copper, margin: 0 }}>Total</p>
          <p style={{ fontFamily: "monospace", fontSize: "24px", fontWeight: "700", letterSpacing: "-0.5px", color: COLOR_PALETTE.green, margin: 0 }}>
            ${formatPrice(Number(pedido.total || 0), { showCurrency: false })}
            <span style={{ marginLeft: "6px", fontSize: "14px", fontWeight: "400", color: "#999999" }}>
              {pedido.moneda || "MXN"}
            </span>
          </p>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="fade-in mb-6" style={{ animationDelay: "60ms" }}>
        <Card accentColor={COLOR_PALETTE.copper}>
          <SectionTitle>Estado del pedido</SectionTitle>
          <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingLeft: "16px", paddingRight: "16px" }}>
            {/* Connector track */}
            <div style={{ position: "absolute", left: 0, right: 0, top: "16px", marginLeft: "32px", marginRight: "32px", height: "1px", background: COLOR_PALETTE.border }} />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "16px",
                height: "1px",
                background: `linear-gradient(90deg, ${COLOR_PALETTE.copper} 0%, ${COLOR_PALETTE.amber} 100%)`,
                transition: "width 700ms ease",
                marginLeft: "32px",
                width: estadoIndex === 0
                  ? "0%"
                  : `calc(${(estadoIndex / (TIMELINE.length - 1)) * 100}% - 0px)`,
              }}
            />
            {TIMELINE.map((step, idx) => {
              const Icon = step.icon;
              const done = idx <= estadoIndex;
              const active = idx === estadoIndex;
              return (
                <div key={step.key} style={{ position: "relative", zIndex: 10, display: "flex", flex: 1, flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "32px",
                      width: "32px",
                      borderRadius: "50%",
                      border: `2px solid ${done ? COLOR_PALETTE.copper : COLOR_PALETTE.border}`,
                      background: done ? COLOR_PALETTE.copper : COLOR_PALETTE.white,
                      color: done ? COLOR_PALETTE.white : "#999999",
                      transition: "all 300ms ease",
                      transform: active ? "scale(1.1)" : "scale(1)",
                      boxShadow: active ? `0 0 0 4px ${COLOR_PALETTE.cream}` : "none",
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: active ? COLOR_PALETTE.copper : done ? COLOR_PALETTE.green : "#999999",
                      display: "none",
                    }}
                    className="hidden sm:block"
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
        {/* Products */}
        <div className="fade-in" style={{ animationDelay: "120ms" }}>
          <Card accentColor={COLOR_PALETTE.green}>
            <SectionTitle>Productos</SectionTitle>
            {pedido.detalle_pedido && pedido.detalle_pedido.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {pedido.detalle_pedido.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: idx < pedido.detalle_pedido!.length - 1 ? `1px solid ${COLOR_PALETTE.border}` : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40px", width: "40px", flexShrink: 0, borderRadius: "8px", background: `linear-gradient(135deg, rgba(46,74,51,0.08), rgba(201,122,62,0.04))`, border: `1px solid ${COLOR_PALETTE.border}` }}>
                      <Package size={18} style={{ color: COLOR_PALETTE.green }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: "600", color: COLOR_PALETTE.green, margin: "0 0 2px 0" }}>
                        Producto <span style={{ fontFamily: "monospace", color: COLOR_PALETTE.copper }}>#{item.id_producto}</span>
                      </p>
                      <p style={{ fontSize: "13px", color: "#999999", margin: 0 }}>
                        {item.cantidad} {item.cantidad === 1 ? "unidad" : "unidades"}
                      </p>
                    </div>
                    <p style={{ flexShrink: 0, fontFamily: "monospace", fontSize: "14px", fontWeight: "700", color: COLOR_PALETTE.copper, margin: 0 }}>
                      ${formatPrice(Number(item.precio_compra) * item.cantidad, { showCurrency: false })}
                      <span style={{ marginLeft: "6px", fontSize: "11px", fontWeight: "400", color: "#999999" }}>
                        {item.moneda_compra || "MXN"}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ padding: "16px", textAlign: "center", fontSize: "14px", color: "#999999", margin: 0 }}>Sin información de productos.</p>
            )}
          </Card>
        </div>

        {/* Shipping info */}
        <div className="fade-in" style={{ animationDelay: "180ms", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Address */}
          {direccion && (
            <Card accentColor={COLOR_PALETTE.amber}>
              <SectionTitle>Dirección de envío</SectionTitle>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "36px", width: "36px", flexShrink: 0, borderRadius: "8px", background: `linear-gradient(135deg, rgba(200,155,74,0.08), rgba(201,122,62,0.04))`, border: `1px solid ${COLOR_PALETTE.border}` }}>
                  <MapPin size={16} style={{ color: COLOR_PALETTE.amber }} />
                </div>
                <div>
                  <p style={{ fontSize: "14px", color: COLOR_PALETTE.green, margin: 0 }}>
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
                    <p style={{ marginTop: "6px", fontSize: "12px", color: "#999999", margin: 0 }}>{direccion.referencia}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Envío details */}
          {envio && (
            <Card accentColor={COLOR_PALETTE.copper}>
              <SectionTitle>Información de envío</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {envio.numero_rastreo && (
                  <div>
                    <p style={{ marginBottom: "6px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: COLOR_PALETTE.copper, margin: 0 }}>
                      Número de rastreo
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "700", color: COLOR_PALETTE.green }}>
                        {envio.numero_rastreo}
                      </span>
                      <button
                        onClick={copiarTracking}
                        aria-label={copied ? "Número copiado al portapapeles" : "Copiar número de rastreo"}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "32px", width: "32px", borderRadius: "6px", background: COLOR_PALETTE.cream, color: COLOR_PALETTE.copper, border: `1px solid ${COLOR_PALETTE.border}`, transition: "all 200ms ease", cursor: "pointer" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = COLOR_PALETTE.copper; e.currentTarget.style.color = COLOR_PALETTE.white; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = COLOR_PALETTE.cream; e.currentTarget.style.color = COLOR_PALETTE.copper; }}
                        title="Copiar número de rastreo"
                      >
                        <Copy size={14} />
                      </button>
                      {copied && (
                        <span style={{ fontSize: "11px", fontWeight: "600", color: COLOR_PALETTE.green }} role="status" aria-live="polite">
                          ¡Copiado!
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {envio.costo_envio && (
                  <div>
                    <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: COLOR_PALETTE.copper, margin: 0 }}>
                      Costo de envío
                    </p>
                    <p style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "700", color: COLOR_PALETTE.green, margin: 0 }}>
                      ${formatPrice(Number(envio.costo_envio), { showCurrency: false })}{" "}
                      <span style={{ fontSize: "11px", fontWeight: "400", color: "#999999" }}>MXN</span>
                    </p>
                  </div>
                )}

                {envio.fecha_entrega_estimada && (
                  <div>
                    <p style={{ marginBottom: "4px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: COLOR_PALETTE.copper, margin: 0 }}>
                      Entrega estimada
                    </p>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: COLOR_PALETTE.green, margin: 0 }}>
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
          {trackingLoading ? (
            <Card accentColor={COLOR_PALETTE.green}>
              <SectionTitle>Seguimiento</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: "48px", borderRadius: "8px", background: COLOR_PALETTE.border, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                ))}
              </div>
            </Card>
          ) : tracking ? (
            <Card accentColor={COLOR_PALETTE.green}>
              <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <SectionTitle>Seguimiento</SectionTitle>
                <button
                  onClick={() => envio?.id_envio && fetchTracking(envio.id_envio)}
                  disabled={trackingLoading}
                  aria-label={trackingLoading ? "Actualizando información de seguimiento" : "Actualizar información de seguimiento"}
                  style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "6px", background: COLOR_PALETTE.cream, color: COLOR_PALETTE.copper, padding: "8px 12px", fontSize: "11px", fontWeight: "700", border: `1px solid ${COLOR_PALETTE.border}`, transition: "all 200ms ease", cursor: "pointer", opacity: trackingLoading ? 0.5 : 1 }}
                  onMouseEnter={(e) => { if (!trackingLoading) { e.currentTarget.style.background = COLOR_PALETTE.copper; e.currentTarget.style.color = COLOR_PALETTE.white; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = COLOR_PALETTE.cream; e.currentTarget.style.color = COLOR_PALETTE.copper; }}
                >
                  <RefreshCw size={12} style={{ animation: trackingLoading ? "spin 1s linear infinite" : "none" }} />
                  {trackingLoading ? "Actualizando…" : "Actualizar"}
                </button>
              </div>

              {tracking.eventos && tracking.eventos.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  {tracking.eventos.map((evento: any, idx: number) => (
                    <div key={idx} style={{ display: "flex", gap: "12px" }}>
                      {/* Dot + line */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ marginTop: "2px", height: "10px", width: "10px", flexShrink: 0, borderRadius: "50%", border: `2px solid ${COLOR_PALETTE.white}`, background: idx === 0 ? COLOR_PALETTE.copper : COLOR_PALETTE.border, boxShadow: idx === 0 ? `0 0 0 2px ${COLOR_PALETTE.copper}40` : "none" }} />
                        {idx < tracking.eventos.length - 1 && (
                          <div style={{ marginTop: "4px", width: "2px", flex: 1, background: COLOR_PALETTE.border, minHeight: "32px" }} />
                        )}
                      </div>
                      {/* Content */}
                      <div style={{ paddingBottom: idx === tracking.eventos.length - 1 ? 0 : "16px" }}>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: idx === 0 ? COLOR_PALETTE.green : "#999999", margin: 0 }}>
                          {evento.descripcion}
                        </p>
                        <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#999999" }}>
                          <span>{new Date(evento.fecha).toLocaleDateString("es-MX")}</span>
                          {evento.ubicacion && (
                            <>
                              <span>·</span>
                              <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                <MapPin size={11} />
                                {evento.ubicacion}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ padding: "8px", fontSize: "14px", color: "#999999", margin: 0 }}>
                  Sin información de seguimiento disponible.
                </p>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}
