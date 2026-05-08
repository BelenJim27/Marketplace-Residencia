"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, MapPin, Copy } from "lucide-react";
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

const ESTADOS_TIMELINE = [
  { key: "pendiente", label: "Pedido recibido", icon: <Clock size={16} /> },
  { key: "pagado", label: "Pago confirmado", icon: <CheckCircle size={16} /> },
  { key: "preparando", label: "Preparando", icon: <Package size={16} /> },
  { key: "enviado", label: "En camino", icon: <Truck size={16} /> },
  { key: "entregado", label: "Entregado", icon: <CheckCircle size={16} /> },
];

const ESTADO_INDEX: Record<string, number> = {
  pendiente: 0,
  pagado: 1,
  preparando: 2,
  enviado: 3,
  entregado: 4,
};

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
        // Fetch tracking info if envio exists
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

  if (cargando) {
    return (
      <main className="mx-auto max-w-screen-lg px-4 py-8 md:px-8">
        <p className="text-gray-400">Cargando pedido...</p>
      </main>
    );
  }

  if (error || !pedido) {
    return (
      <main className="mx-auto max-w-screen-lg px-4 py-8 md:px-8">
        <p className="mb-4 text-red-500">{error || "Pedido no encontrado."}</p>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-green-600 hover:underline">
          <ArrowLeft size={16} /> Volver
        </button>
      </main>
    );
  }

  const id = pedido.id || pedido.id_pedido;
  const estado = pedido.estado || "pendiente";
  const estadoIndex = ESTADO_INDEX[estado] ?? 0;
  const fecha = pedido.creado_en
    ? new Date(pedido.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
  const envio = pedido.envios?.[0];
  const direccion = pedido.direccion_envio_snapshot;

  return (
    <main className="mx-auto max-w-screen-lg px-4 py-8 md:px-8">
      <Link href="/tienda/compras" className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-green-600">
        <ArrowLeft size={16} />
        Mis Compras
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Pedido #{id}</h1>
          <p className="text-sm text-gray-500">{fecha}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-600">
            ${formatPrice(Number(pedido.total || 0), { showCurrency: false })} {pedido.moneda || "MXN"}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-dark">
        <h2 className="mb-5 font-semibold text-gray-900 dark:text-white">Estado del pedido</h2>
        <div className="flex items-start gap-0">
          {ESTADOS_TIMELINE.map((etapa, idx) => {
            const completado = idx <= estadoIndex;
            const actual = idx === estadoIndex;
            return (
              <div key={etapa.key} className="flex flex-1 flex-col items-center">
                <div className="flex items-center w-full">
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 mx-auto
                    ${completado ? "border-green-600 bg-green-600 text-white" : "border-gray-300 text-gray-400"}`}>
                    {etapa.icon}
                  </div>
                  {idx < ESTADOS_TIMELINE.length - 1 && (
                    <div className={`h-0.5 flex-1 ${idx < estadoIndex ? "bg-green-600" : "bg-gray-200"}`} style={{ marginLeft: "-50%", marginRight: "-50%" }} />
                  )}
                </div>
                <p className={`mt-2 hidden text-center text-xs sm:block ${actual ? "font-semibold text-green-600" : completado ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}`}>
                  {etapa.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Productos */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-dark">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Productos</h2>
          {pedido.detalle_pedido && pedido.detalle_pedido.length > 0 ? (
            <div className="space-y-3">
              {pedido.detalle_pedido.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-0 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                      <Package size={16} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Producto #{item.id_producto}</p>
                      <p className="text-xs text-gray-500">x{item.cantidad}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${formatPrice(Number(item.precio_compra) * item.cantidad, { showCurrency: false })} {item.moneda_compra || "MXN"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Sin detalles de productos.</p>
          )}
        </div>

        {/* Info de envío */}
        <div className="space-y-4">
          {direccion && (
            <div className="rounded-lg bg-white p-5 shadow-sm dark:bg-gray-dark">
              <div className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <MapPin size={16} className="text-green-600" />
                Dirección de envío
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
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
              {direccion.referencia && <p className="mt-1 text-xs text-gray-400">{direccion.referencia}</p>}
            </div>
          )}

          {envio && (
            <>
              <div className="rounded-lg bg-white p-5 shadow-sm dark:bg-gray-dark">
                <div className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <Truck size={16} className="text-green-600" />
                  Información de envío
                </div>
                {envio.numero_rastreo && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500">Número de rastreo</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{envio.numero_rastreo}</p>
                      <button
                        onClick={copiarTracking}
                        className="p-1 text-gray-400 hover:text-green-600 transition"
                        title="Copiar"
                      >
                        <Copy size={14} />
                      </button>
                      {copied && <span className="text-xs text-green-600">¡Copiado!</span>}
                    </div>
                  </div>
                )}
                {envio.costo_envio && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500">Costo de envío</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">${formatPrice(Number(envio.costo_envio), { showCurrency: false })} MXN</p>
                  </div>
                )}
                {envio.fecha_entrega_estimada && (
                  <div>
                    <p className="text-xs text-gray-500">Entrega estimada</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {new Date(envio.fecha_entrega_estimada).toLocaleDateString("es-MX", { day: "2-digit", month: "long" })}
                    </p>
                  </div>
                )}
              </div>

              {tracking && (
                <div className="rounded-lg bg-white p-5 shadow-sm dark:bg-gray-dark">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                      <Package size={16} className="text-blue-600" />
                      Estado de entrega
                    </div>
                    <button
                      onClick={() => envio?.id_envio && fetchTracking(envio.id_envio)}
                      disabled={trackingLoading}
                      className="text-xs text-gray-500 hover:text-blue-600 disabled:opacity-50"
                    >
                      {trackingLoading ? "Actualizando..." : "Actualizar"}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {tracking.eventos && tracking.eventos.length > 0 ? (
                      tracking.eventos.map((evento: any, idx: number) => (
                        <div key={idx} className="flex gap-3 text-sm">
                          <div className="flex flex-col items-center">
                            <div className="h-2 w-2 rounded-full bg-green-600" />
                            {idx < tracking.eventos.length - 1 && <div className="h-8 w-0.5 bg-gray-200" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{evento.descripcion}</p>
                            <p className="text-xs text-gray-500">{new Date(evento.fecha).toLocaleDateString("es-MX")}</p>
                            {evento.ubicacion && <p className="text-xs text-gray-600">{evento.ubicacion}</p>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Sin información de seguimiento disponible.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
