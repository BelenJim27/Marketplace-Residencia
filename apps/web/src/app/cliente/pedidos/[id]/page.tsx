"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

interface TrackingEvento {
  descripcion: string;
  estado: string;
  fecha: string;
  ubicacion: string;
}

interface TrackingData {
  numero_rastreo: string | null;
  estado_actual: string;
  fecha_entrega_estimada: string | null;
  fecha_entrega_real: string | null;
  eventos: TrackingEvento[];
}

interface PedidoResumen {
  id_pedido: number;
  estado: string;
  total: string | number;
  moneda: string;
  fecha_creacion: string;
  envios?: Array<{ id_envio: number; numero_rastreo: string | null; estado: string; transportistas?: { nombre: string } }>;
}

const ESTADO_LABELS: Record<string, string> = {
  preparando: 'Preparando',
  recogido: 'Recogido',
  en_transito: 'En tránsito',
  en_reparto: 'En reparto',
  entregado: 'Entregado',
  retrasado: 'Retrasado',
  fallido: 'Problema en entrega',
  devuelto: 'Devuelto',
};

const ESTADO_COLOR: Record<string, string> = {
  preparando: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  recogido: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  en_transito: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  en_reparto: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  entregado: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  retrasado: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  fallido: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  devuelto: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

function EstadoBadge({ estado }: { estado: string }) {
  const label = ESTADO_LABELS[estado] ?? estado;
  const color = ESTADO_COLOR[estado] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

const PASOS = [
  { key: 'pagado',        label: 'Pagado' },
  { key: 'preparando',    label: 'Preparando' },
  { key: 'paqueteria',    label: 'En paquetería' },
  { key: 'en_camino',     label: 'En camino' },
  { key: 'por_llegar',    label: 'Por llegar' },
  { key: 'entregado',     label: 'Entregado' },
] as const;

function calcularPasoActivo(pedidoEstado: string, envioEstado?: string): number {
  const e = envioEstado ?? '';
  if (e === 'entregado' || pedidoEstado === 'entregado') return 5;
  if (e === 'en_reparto') return 4;
  if (e === 'en_transito') return 3;
  if (e === 'recogido' || pedidoEstado === 'enviado') return 2;
  if (['preparando', 'confirmado'].includes(pedidoEstado)) return 1;
  return 0; // pagado
}

function OrderStepper({ pedidoEstado, envioEstado }: { pedidoEstado: string; envioEstado?: string }) {
  const pasoActivo = calcularPasoActivo(pedidoEstado, envioEstado);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm mb-4">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Estado del pedido</h2>
      <div className="flex items-start">
        {PASOS.map((paso, idx) => {
          const completado = idx < pasoActivo;
          const activo = idx === pasoActivo;
          const pendiente = idx > pasoActivo;
          return (
            <div key={paso.key} className="flex-1 flex flex-col items-center relative">
              {/* Línea conectora izquierda */}
              {idx > 0 && (
                <div
                  className={`absolute top-4 right-1/2 left-0 h-0.5 ${completado || activo ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                  style={{ transform: 'translateY(-50%)' }}
                />
              )}
              {/* Círculo */}
              <div
                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                  completado
                    ? 'bg-amber-500 border-amber-500'
                    : activo
                    ? 'bg-white dark:bg-gray-800 border-amber-500'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
              >
                {completado ? (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={`w-2.5 h-2.5 rounded-full ${activo ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                )}
              </div>
              {/* Label */}
              <p className={`mt-2 text-center text-xs leading-tight ${
                completado || activo ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {paso.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RastreoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [pedido, setPedido] = useState<PedidoResumen | null>(null);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loadingPedido, setLoadingPedido] = useState(true);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    const fetchPedido = async () => {
      setLoadingPedido(true);
      setError(null);
      try {
        const token = getCookie('token') || '';
        const data = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/pedidos/${id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ).then((r) => {
          if (!r.ok) throw new Error(`Error ${r.status}`);
          return r.json();
        });
        setPedido(data);

        const envio = data?.envios?.[0];
        if (envio?.id_envio) {
          setLoadingTracking(true);
          try {
            const trackData = await api.envios.getTracking(String(envio.id_envio), token);
            setTracking(trackData as TrackingData);
          } catch {
            // Tracking no disponible aún — no es error fatal
          } finally {
            setLoadingTracking(false);
          }
        }
      } catch (err: any) {
        setError(err?.message ?? 'No se pudo cargar el pedido.');
      } finally {
        setLoadingPedido(false);
      }
    };

    fetchPedido();
  }, [id, user, authLoading, router]);

  if (authLoading || loadingPedido) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">{error}</div>
        <button onClick={() => router.back()} className="mt-4 text-sm text-amber-700 dark:text-amber-400 hover:underline">
          ← Regresar
        </button>
      </div>
    );
  }

  if (!pedido) return null;

  const envio = pedido.envios?.[0];
  const carrierId = envio?.transportistas?.nombre ?? '';
  // Mostrar eventos más reciente primero
  const eventosOrdenados = tracking ? [...tracking.eventos].reverse() : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="text-sm text-amber-700 dark:text-amber-400 hover:underline mb-4 flex items-center gap-1">
        ← Mis pedidos
      </button>

      {/* Cabecera pedido */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-4 shadow-sm">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Pedido #{pedido.id_pedido}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {pedido.fecha_creacion ? new Date(pedido.fecha_creacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </p>
          </div>
          <EstadoBadge estado={pedido.estado} />
        </div>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Total: <span className="font-medium text-gray-900 dark:text-white">
            {Number(pedido.total).toLocaleString('es-MX', { style: 'currency', currency: pedido.moneda ?? 'MXN' })}
          </span>
        </div>
      </div>

      {/* Stepper de ciclo de vida */}
      <OrderStepper pedidoEstado={pedido.estado} envioEstado={envio?.estado} />

      {/* Detalle del envío */}
      {!envio ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-sm text-gray-500 dark:text-gray-400 text-center">
          Aún no hay envío registrado para este pedido.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Rastreo de envío</h2>

          <div className="flex flex-wrap gap-4 text-sm mb-5">
            {envio.numero_rastreo && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Número de rastreo</span>
                <p className="font-mono font-medium text-gray-900 dark:text-white">{envio.numero_rastreo}</p>
              </div>
            )}
            {carrierId && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Carrier</span>
                <p className="font-medium text-gray-900 dark:text-white">{carrierId}</p>
              </div>
            )}
            {tracking?.fecha_entrega_estimada && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Entrega estimada</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(tracking.fecha_entrega_estimada).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            )}
            {tracking?.estado_actual && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Estado</span>
                <div className="mt-0.5"><EstadoBadge estado={tracking.estado_actual} /></div>
              </div>
            )}
          </div>

          {loadingTracking ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-4">
              <div className="animate-spin h-4 w-4 rounded-full border-2 border-amber-400 border-t-transparent" />
              Consultando estado del envío…
            </div>
          ) : eventosOrdenados.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {envio.numero_rastreo
                ? 'Aún no hay eventos de rastreo disponibles. Intenta de nuevo más tarde.'
                : 'La guía de envío aún no ha sido generada por el productor.'}
            </p>
          ) : (
            <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2 space-y-5">
              {eventosOrdenados.map((evento, idx) => (
                <li key={idx} className="ml-5">
                  <span className={`absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full ring-4 ring-white dark:ring-gray-800 ${idx === 0 ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 dark:text-white">{evento.descripcion}</p>
                    {evento.ubicacion && (
                      <p className="text-gray-500 dark:text-gray-400">{evento.ubicacion}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {new Date(evento.fecha).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
