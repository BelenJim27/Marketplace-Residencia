"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import Link from "next/link";
import { CheckCircle, ShoppingBag, Package } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";

function PagoExitosoContent() {
  const searchParams = useSearchParams();
  const pedidoId = searchParams.get("pedido");
  const { limpiarCarrito } = useCarrito();

  useEffect(() => {
    limpiarCarrito();
  // Solo se ejecuta al montar — limpiarCarrito es estable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto max-w-screen-sm px-4 py-16 text-center">
      <div className="rounded-2xl bg-white p-10 shadow-lg dark:bg-gray-dark">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          ¡Pago exitoso!
        </h1>

        {pedidoId && (
          <p className="mb-1 text-sm font-medium text-green-600">
            Pedido #{pedidoId}
          </p>
        )}

        <p className="mb-8 text-gray-500 dark:text-gray-400">
          Tu pedido está siendo procesado. Recibirás una confirmación en breve.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/tienda/compras"
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
          >
            <Package size={18} />
            Ver mis compras
          </Link>
          <Link
            href="/cliente/producto"
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ShoppingBag size={18} />
            Seguir comprando
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PagoExitosoPage() {
  return (
    <Suspense>
      <PagoExitosoContent />
    </Suspense>
  );
}
