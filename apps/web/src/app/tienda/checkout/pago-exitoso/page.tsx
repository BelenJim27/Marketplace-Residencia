"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState } from "react";
import Link from "next/link";
import { CheckCircle, ShoppingBag, Package, FileText } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

function PagoExitosoContent() {
  const searchParams = useSearchParams();
  const pedidoId = searchParams.get("pedido");
  const { limpiarCarrito } = useCarrito();
  const { token } = useAuth();
  const [facturaEstado, setFacturaEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");

  useEffect(() => {
    limpiarCarrito();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Procesar solicitud de factura si fue guardada antes del pago
  useEffect(() => {
    if (!pedidoId || !token) return;

    const raw = localStorage.getItem("checkout_factura");
    if (!raw) return;

    let facturaData: any;
    try {
      facturaData = JSON.parse(raw);
    } catch {
      localStorage.removeItem("checkout_factura");
      return;
    }

    // Verificar que corresponde a este pedido y que se solicitó factura
    if (!facturaData.solicitarFactura || String(facturaData.pedidoId) !== String(pedidoId)) {
      localStorage.removeItem("checkout_factura");
      return;
    }

    setFacturaEstado("enviando");

    const payload: any = { estado: "pendiente" };
    if (facturaData.rfc) payload.rfc_receptor = facturaData.rfc;
    if (facturaData.uso_cfdi) payload.uso_cfdi = facturaData.uso_cfdi;
    if (facturaData.regimen_fiscal) payload.regimen_fiscal = facturaData.regimen_fiscal;

    api.pedidos
      .addFactura(token, pedidoId, payload)
      .then(() => {
        setFacturaEstado("ok");
        localStorage.removeItem("checkout_factura");
      })
      .catch(() => {
        setFacturaEstado("error");
        localStorage.removeItem("checkout_factura");
      });
  }, [pedidoId, token]);

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

        <p className="mb-4 text-gray-500 dark:text-gray-400">
          Tu pedido está siendo procesado. Recibirás una confirmación con el detalle de tu compra en tu correo electrónico.
        </p>

        {/* Estado de factura */}
        {facturaEstado === "enviando" && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <FileText size={16} className="shrink-0" />
            Registrando solicitud de factura…
          </div>
        )}
        {facturaEstado === "ok" && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle size={16} className="shrink-0" />
            Solicitud de factura registrada. La recibirás en 24–48 hrs hábiles.
          </div>
        )}
        {facturaEstado === "error" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            No se pudo registrar la solicitud de factura. Contáctanos para gestionarla.
          </div>
        )}

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
