"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, Info } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";
import { useLocale } from "@/context/LocaleContext";

export default function CarritoPage() {
  const router = useRouter();
  const { items, precioTotal, actualizarCantidad, eliminarProducto } = useCarrito();
  const { t, convertPrice } = useLocale();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-12 md:px-8">
        <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white" style={{ fontFamily: 'var(--font-family-store)' }}>
          {t("cart_title")}
        </h1>

        <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-white p-12 text-center shadow-md dark:bg-gray-dark">
          <ShoppingBag className="h-16 w-16 text-gray-300" />
          <p className="text-gray-600 dark:text-gray-400">{t("cart_empty_state")}</p>
          <Link
            href="/cliente/producto"
            className="mt-4 rounded-lg bg-[#3D6B3F] px-6 py-2 text-white transition-colors hover:bg-[#1F3A2E]"
          >
            {t("cart_continue_shopping")}
          </Link>
        </div>
      </main>
    );
  }

  const subtotal = precioTotal;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="mb-8 text-4xl font-bold text-dark dark:text-white" style={{ fontFamily: 'var(--font-family-store)' }}>
        {t("cart_title")}
      </h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Products Table */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white shadow-md dark:bg-gray-dark">
            {/* Table Header */}
            <div className="hidden border-b border-gray-200 px-6 py-4 dark:border-gray-700 lg:grid lg:grid-cols-5 lg:gap-4">
              <div className="col-span-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                {t("cart_table_product")}
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {t("cart_table_quantity")}
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {t("cart_table_total")}
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {t("cart_table_action")}
              </div>
            </div>

            {/* Products */}
            {items.map((item) => (
              <div
                key={item.id_producto}
                className="border-b border-gray-200 px-4 py-4 last:border-b-0 dark:border-gray-700 md:px-6 lg:grid lg:grid-cols-5 lg:gap-4 lg:items-center"
              >
                {/* Product Image and Info */}
                <Link
                  href={`/cliente/producto/${item.id_producto}`}
                  className="col-span-2 mb-4 flex gap-3 lg:mb-0"
                >
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                    {item.producto_imagenes?.[0] ? (
                      <Image
                        src={item.producto_imagenes[0].url}
                        alt={item.nombre}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : item.imagen_principal_url ? (
                      <Image
                        src={item.imagen_principal_url}
                        alt={item.nombre}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        {t("cart_no_image")}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="font-medium text-gray-900 dark:text-white hover:text-green-600">
                      {item.nombre}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {convertPrice(Number(item.precio_base))} {t("cart_price_unit")}
                    </p>
                  </div>
                </Link>

                {/* Quantity */}
                <div className="mb-4 flex items-center gap-2 lg:mb-0 lg:justify-center">
                  <button
                    onClick={() =>
                      actualizarCantidad(item.id_producto, Math.max(item.cantidad - 1, 1))
                    }
                    className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.cantidad}</span>
                  <button
                    onClick={() =>
                      actualizarCantidad(item.id_producto, item.cantidad + 1)
                    }
                    className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Total */}
                <div className="mb-4 text-right lg:mb-0 lg:text-center">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {convertPrice(Number(item.precio_base) * item.cantidad)}
                  </p>
                </div>

                {/* Delete Button */}
                <div className="flex justify-end lg:justify-center">
                  <button
                    onClick={() => eliminarProducto(item.id_producto)}
                    className="flex h-7 w-7 items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push("/cliente/producto")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#3D6B3F] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1F3A2E]"
          >
            {t("cart_continue_button")}
          </button>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 rounded-lg bg-white p-6 shadow-md dark:bg-gray-dark">
            <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
              {t("cart_summary_title")}
            </h2>

            {/* Pricing Breakdown */}
            <div className="space-y-3 border-b border-gray-200 pb-4 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  {t("cart_summary_subtotal")} ({items.length} {items.length === 1 ? "producto" : "productos"})
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {convertPrice(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  {t("cart_summary_shipping")}
                  <Info size={14} className="text-gray-400" />
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {t("cart_summary_calculated_later")}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  {t("cart_summary_tax")}
                  <Info size={14} className="text-gray-400" />
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {t("cart_summary_calculated_later")}
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between border-b border-gray-200 py-4 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">{t("cart_summary_subtotal")}</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {convertPrice(subtotal)}
              </span>
            </div>

            {/* Info Note */}
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              {t("cart_price_note")}
            </p>

            {/* Checkout Button */}
            <button
              onClick={() => router.push("/tienda/checkout")}
              className="mt-6 w-full rounded-lg bg-[#3D6B3F] py-3 font-semibold text-white transition-colors hover:bg-[#1F3A2E]"
            >
              {t("cart_checkout_button")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}