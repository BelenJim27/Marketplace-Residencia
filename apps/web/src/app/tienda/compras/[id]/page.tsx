"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Package, Truck, CheckCircle, Clock,
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

/* ── Timeline config ─────────────────────────────────────────────────────── */
const TIMELINE = [
  { key: "pendiente", label: "Pedido recibido",  icon: Clock },
  { key: "pagado",    label: "Pago confirmado",  icon: CheckCircle },
];

const ESTADO_INDEX: Record<string, number> = {
  pendiente: 0, pagado: 1, preparando: 1, enviado: 1, entregado: 1,
};

const ESTADO_BADGE: Record<string, { label: string; classes: string; dot: string; pulse: boolean }> = {
  pendiente:  { label: "Pendiente",  classes: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700/50",  dot: "bg-amber-400",  pulse: true  },
  pagado:     { label: "Pagado",     classes: "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:ring-sky-700/50",               dot: "bg-sky-400",    pulse: false },
  preparando: { label: "Preparando", classes: "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:ring-orange-700/50", dot: "bg-orange-400", pulse: true  },
  enviado:    { label: "Enviado",    classes: "bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:ring-violet-700/50", dot: "bg-violet-500", pulse: true  },
  entregado:  { label: "Entregado", classes: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700/50", dot: "bg-emerald-500", pulse: false },
  cancelado:  { label: "Cancelado", classes: "bg-rose-50 text-rose-600 ring-1 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:ring-rose-700/50",           dot: "bg-rose-400",   pulse: false },
};

/* ── Section card wrapper ────────────────────────────────────────────────── */
function Card({
  children,
  className = "",
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-dark ${className}`}>
      {accent && <div className={`h-0.5 w-full ${accent}`} />}
      <div className="p-5">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[13px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
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
    } catch (err) {
      console.error("Error fetching tracking:", err);
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
        <Card accent="bg-rose-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {error || "Pedido no encontrado."}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-green-600 hover:text-green-700"
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
        .fade-in { animation: fadeSlideUp 0.35s ease both; }
      `}</style>

      {/* Back */}
      <Link
        href="/tienda/compras"
        className="group mb-7 inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-green-600 dark:hover:text-green-400"
      >
        <ArrowLeft
          size={14}
          className="transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        Mis Compras
      </Link>

      {/* ── Header ── */}
      <div className="fade-in mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-6 dark:border-gray-700/60">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Pedido{" "}
              <span className="font-mono text-green-600 dark:text-green-400">#{id}</span>
            </h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${badge.classes}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot} ${badge.pulse ? "animate-pulse" : ""}`} />
              {badge.label}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-400">
            <Clock size={12} />
            {fecha}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Total</p>
          <p className="font-mono text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            ${formatPrice(Number(pedido.total || 0), { showCurrency: false })}
            <span className="ml-1.5 text-sm font-normal text-gray-400">
              {pedido.moneda || "MXN"}
            </span>
          </p>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="fade-in mb-6" style={{ animationDelay: "60ms" }}>
        <Card accent="bg-gradient-to-r from-green-400 to-emerald-500">
          <SectionTitle>Estado del pedido</SectionTitle>
          <div className="relative flex items-start justify-between px-2">
            {/* Connector track */}
            <div className="absolute left-0 right-0 top-4 mx-[2rem] h-0.5 bg-gray-100 dark:bg-gray-700" />
            <div
              className="absolute left-0 top-4 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
              style={{
                marginLeft: "2rem",
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
                <div key={step.key} className="relative z-10 flex flex-1 flex-col items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300
                      ${done
                        ? "border-green-500 bg-green-500 text-white shadow-md shadow-green-200 dark:shadow-none"
                        : "border-gray-200 bg-white text-gray-300 dark:border-gray-600 dark:bg-gray-800"
                      } ${active ? "scale-110 ring-2 ring-green-300 ring-offset-2 dark:ring-green-700 dark:ring-offset-gray-dark" : ""}`}
                  >
                    <Icon size={14} />
                  </div>
                  <p
                    className={`hidden text-center text-[11px] font-semibold sm:block
                      ${active ? "text-green-600 dark:text-green-400" : done ? "text-gray-600 dark:text-gray-300" : "text-gray-300 dark:text-gray-600"}`}
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
          <Card accent="bg-gradient-to-r from-green-400 to-emerald-400">
            <SectionTitle>Productos</SectionTitle>
            {pedido.detalle_pedido && pedido.detalle_pedido.length > 0 ? (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {pedido.detalle_pedido.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/20">
                      <Package size={15} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        Producto{" "}
                        <span className="font-mono text-green-600 dark:text-green-400">
                          #{item.id_producto}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.cantidad} {item.cantidad === 1 ? "unidad" : "unidades"}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-sm font-bold text-gray-900 dark:text-white">
                      ${formatPrice(Number(item.precio_compra) * item.cantidad, { showCurrency: false })}
                      <span className="ml-1 text-[10px] font-normal text-gray-400">
                        {item.moneda_compra || "MXN"}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">Sin detalles de productos.</p>
            )}
          </Card>
        </div>

        {/* Shipping info */}
        <div className="fade-in space-y-4" style={{ animationDelay: "180ms" }}>
          {/* Address */}
          {direccion && (
            <Card accent="bg-gradient-to-r from-sky-400 to-blue-400">
              <SectionTitle>Dirección de envío</SectionTitle>
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/20">
                  <MapPin size={15} className="text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
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
                    <p className="mt-1 text-xs text-gray-400">{direccion.referencia}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Envío details */}
          {envio && (
            <Card accent="bg-gradient-to-r from-violet-400 to-purple-400">
              <SectionTitle>Información de envío</SectionTitle>
              <div className="space-y-3.5">
                {envio.numero_rastreo && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Número de rastreo
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                        {envio.numero_rastreo}
                      </span>
                      <button
                        onClick={copiarTracking}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-50 text-gray-400 transition hover:bg-green-50 hover:text-green-600 dark:bg-gray-700 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                        title="Copiar número de rastreo"
                      >
                        <Copy size={12} />
                      </button>
                      {copied && (
                        <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">
                          ¡Copiado!
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {envio.costo_envio && (
                  <div>
                    <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Costo de envío
                    </p>
                    <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                      ${formatPrice(Number(envio.costo_envio), { showCurrency: false })}{" "}
                      <span className="text-[11px] font-normal text-gray-400">MXN</span>
                    </p>
                  </div>
                )}

                {envio.fecha_entrega_estimada && (
                  <div>
                    <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Entrega estimada
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
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
          {tracking && (
            <Card accent="bg-gradient-to-r from-emerald-400 to-teal-400">
              <div className="mb-4 flex items-center justify-between">
                <SectionTitle>Seguimiento</SectionTitle>
                <button
                  onClick={() => envio?.id_envio && fetchTracking(envio.id_envio)}
                  disabled={trackingLoading}
                  className="mb-4 flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 transition hover:bg-green-50 hover:text-green-600 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                >
                  <RefreshCw size={11} className={trackingLoading ? "animate-spin" : ""} />
                  {trackingLoading ? "Actualizando…" : "Actualizar"}
                </button>
              </div>

              {tracking.eventos && tracking.eventos.length > 0 ? (
                <div className="space-y-0">
                  {tracking.eventos.map((evento: any, idx: number) => (
                    <div key={idx} className="flex gap-3">
                      {/* Dot + line */}
                      <div className="flex flex-col items-center">
                        <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white ring-2 dark:border-gray-dark ${idx === 0 ? "bg-green-500 ring-green-400" : "bg-gray-200 ring-gray-200 dark:bg-gray-600 dark:ring-gray-600"}`} />
                        {idx < tracking.eventos.length - 1 && (
                          <div className="mt-1 w-0.5 flex-1 bg-gray-100 dark:bg-gray-700" style={{ minHeight: "2rem" }} />
                        )}
                      </div>
                      {/* Content */}
                      <div className={`pb-4 ${idx === tracking.eventos.length - 1 ? "pb-0" : ""}`}>
                        <p className={`text-sm font-semibold ${idx === 0 ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                          {evento.descripcion}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
                          <span>{new Date(evento.fecha).toLocaleDateString("es-MX")}</span>
                          {evento.ubicacion && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin size={10} />
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
                <p className="py-2 text-sm text-gray-400">
                  Sin información de seguimiento disponible.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
