"use client";

import Link from "next/link";
import { XCircle, RefreshCw, ShoppingCart } from "lucide-react";

export default function PagoFallidoPage() {
  return (
    <main className="mx-auto max-w-screen-sm px-4 py-16 text-center">
      <div className="rounded-2xl bg-white p-10 shadow-lg dark:bg-gray-dark">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          Pago fallido
        </h1>

        <p className="mb-8 text-gray-500 dark:text-gray-400">
          Hubo un problema al procesar tu pago. Tu carrito sigue intacto, puedes intentarlo de nuevo.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/tienda/checkout"
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
          >
            <RefreshCw size={18} />
            Intentar de nuevo
          </Link>
          <Link
            href="/tienda/carrito"
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ShoppingCart size={18} />
            Ver carrito
          </Link>
        </div>
      </div>
    </main>
  );
}
