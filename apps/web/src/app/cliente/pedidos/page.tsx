"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";

interface MiPedido {
  id_pedido: number;
  estado: string;
  total: string | number;
  moneda: string;
  fecha_creacion: string;
  envios?: Array<{ numero_rastreo: string | null; estado: string }>;
}

const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  preparando: 'bg-yellow-100 text-yellow-800',
  enviado: 'bg-blue-100 text-blue-800',
  en_transito: 'bg-blue-100 text-blue-800',
  entregado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
};

export default function MisPedidosPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [pedidos, setPedidos] = useState<MiPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    const fetchPedidos = async () => {
      try {
        const token = getCookie('token') || '';
        const data = await api.pedidos.getMisCompras(token);
        setPedidos(Array.isArray(data) ? data : (data as any).pedidos ?? []);
      } catch (err: any) {
        setError(err?.message ?? 'No se pudieron cargar tus pedidos.');
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis pedidos</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">{error}</div>
      )}

      {pedidos.length === 0 && !error && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Aún no tienes pedidos.</p>
          <Link href="/tienda" className="mt-4 inline-block text-amber-700 hover:underline text-sm">
            Explorar productos →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {pedidos.map((pedido) => {
          const envio = pedido.envios?.[0];
          const estadoBadgeColor = ESTADO_COLOR[pedido.estado] ?? 'bg-gray-100 text-gray-700';

          return (
            <Link
              key={pedido.id_pedido}
              href={`/cliente/pedidos/${pedido.id_pedido}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-amber-300 hover:shadow transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">Pedido #{pedido.id_pedido}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {pedido.fecha_creacion
                      ? new Date(pedido.fecha_creacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
                      : ''}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${estadoBadgeColor}`}>
                  {pedido.estado}
                </span>
              </div>
              <div className="mt-2 flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  {Number(pedido.total).toLocaleString('es-MX', { style: 'currency', currency: pedido.moneda ?? 'MXN' })}
                </span>
                {envio?.numero_rastreo && (
                  <span className="text-xs text-blue-600 font-mono">{envio.numero_rastreo}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
