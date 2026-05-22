"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { formatPrice } from "@/lib/format-number";

interface Pedido {
  id?: number;
  id_pedido?: number;
  estado?: string;
  total?: string;
  moneda?: string;
  creado_en?: string;
  detalle_pedido?: Array<{ id_producto: number; cantidad: number; precio_compra: string }>;
}

const ESTADO_COLORES: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  pagado: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  enviado: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  entregado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelado: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function MisComprasPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setCargando(false);
      return;
    }

    const token = getCookie("token") || "";
    api.pedidos
      .getMisCompras(token)
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        lista.sort((a: Pedido, b: Pedido) => {
          const dateA = new Date(a.creado_en || 0).getTime();
          const dateB = new Date(b.creado_en || 0).getTime();
          return dateB - dateA;
        });
        setPedidos(lista);
      })
      .catch(() => setPedidos([]))
      .finally(() => setCargando(false));
  }, [isAuthenticated, authLoading]);

  if (cargando) {
    return (
      <main className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8">
        <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white">Mis Compras</h1>
        <div className="flex min-h-[200px] items-center justify-center">
          <p className="text-gray-600 dark:text-gray-400">Cargando pedidos...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8">
        <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white">Mis Compras</h1>
        <div className="rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-dark">
          <p className="mb-4 text-gray-600 dark:text-gray-400">Inicia sesión para ver tu historial de compras.</p>
          <Link href="/auth/sign-in" className="inline-block rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900">
            Iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8">
      <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white">Mis Compras</h1>

      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-10 text-center shadow-md dark:bg-gray-dark">
          <ShoppingBag className="h-14 w-14 text-gray-400 dark:text-gray-600" aria-hidden="true" />
          <p className="text-gray-600 dark:text-gray-400">Aún no tienes compras.</p>
          <Link href="/cliente/producto" className="inline-block rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900">
            Explorar mezcales
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido) => {
            const id = pedido.id || pedido.id_pedido;
            const estado = pedido.estado || "pendiente";
            const colorClase = ESTADO_COLORES[estado] || ESTADO_COLORES.pendiente;
            const fecha = pedido.creado_en
              ? new Date(pedido.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })
              : "—";
            const total = pedido.total
              ? `$${formatPrice(Number(pedido.total), { showCurrency: false })} ${pedido.moneda || "MXN"}`
              : "—";
            const numItems = pedido.detalle_pedido?.length ?? 0;

            return (
              <Link
                key={id}
                href={`/tienda/compras/${id}`}
                className="flex items-center justify-between rounded-lg bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:bg-gray-dark dark:focus-visible:ring-offset-gray-900"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
                    <Package className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Pedido #{id}</p>
                    <p className="text-sm text-gray-500">
                      {fecha} · {numItems > 0 ? `${numItems} ${numItems === 1 ? 'producto' : 'productos'}` : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-green-600">{total}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorClase}`}>
                      {estado}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}