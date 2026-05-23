"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, Info } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";
import { formatPrice } from "@/lib/format-number";

export default function CarritoPage() {
  const router = useRouter();
  const { items, precioTotal, actualizarCantidad, eliminarProducto } = useCarrito();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-12 md:px-8">
        <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white">
          Mi Carrito
        </h1>

        <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-white p-12 text-center shadow-md dark:bg-gray-dark">
          <ShoppingBag className="h-16 w-16 text-gray-300" />
          <p className="text-gray-600 dark:text-gray-400">Tu carrito está vacío</p>
          <Link
<<<<<<< HEAD
            href="/Cliente/producto"
            className="mt-4 flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
=======
            href="/cliente/producto"
            className="mt-4 rounded-lg bg-black px-6 py-2 text-white transition-colors hover:bg-gray-800"
>>>>>>> f4cb150a1c2c48f30cbd77acc51acea025d91efc
          >
            Seguir comprando
          </Link>
        </div>
      </main>
    );
  }

  const subtotal = precioTotal;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="mb-8 text-4xl font-bold text-dark dark:text-white">
        Mi Carrito
      </h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Products Table */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white shadow-md dark:bg-gray-dark">
            {/* Table Header */}
            <div className="hidden border-b border-gray-200 px-6 py-4 dark:border-gray-700 lg:grid lg:grid-cols-5 lg:gap-4">
              <div className="col-span-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                PRODUCTO
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                CANTIDAD
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                TOTAL
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                ACCIÓN
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
<<<<<<< HEAD
                  href={`/Cliente/producto/${item.id_producto}`}
                  className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-gray-100"
                >
                  {item.producto_imagenes?.[0] ? (
                    <Image
                      src={item.producto_imagenes[0].url}
                      alt={item.nombre}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : item.imagen_principal_url ? (
                    <Image
                      src={item.imagen_principal_url}
                      alt={item.nombre}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      Sin imagen
                    </div>
                  )}
                </Link>

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link
                      href={`/Cliente/producto/${item.id_producto}`}
                      className="font-medium text-gray-900 hover:text-green-600 dark:text-white"
                    >
=======
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
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="font-medium text-gray-900 dark:text-white hover:text-green-600">
>>>>>>> f4cb150a1c2c48f30cbd77acc51acea025d91efc
                      {item.nombre}
                    </h3>
                    <p className="text-xs text-gray-500">
                      ${formatPrice(Number(item.precio_base), { showCurrency: false })} MXN c/u
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
                    ${formatPrice(Number(item.precio_base) * item.cantidad, { showCurrency: false })}
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

<<<<<<< HEAD
          <Link
            href="/Cliente/producto"
            className="mt-4 flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
=======
          <button
            onClick={() => router.push("/cliente/producto")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-black px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
>>>>>>> f4cb150a1c2c48f30cbd77acc51acea025d91efc
          >
            ← Seguir comprando
          </button>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 rounded-lg bg-white p-6 shadow-md dark:bg-gray-dark">
            <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
              Resumen del Pedido
            </h2>

            {/* Pricing Breakdown */}
            <div className="space-y-3 border-b border-gray-200 pb-4 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  Subtotal ({items.length} {items.length === 1 ? "producto" : "productos"})
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${formatPrice(subtotal, { showCurrency: false })} MXN
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  Envío
                  <Info size={14} className="text-gray-400" />
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Se calcula en el siguiente paso
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  IVA
                  <Info size={14} className="text-gray-400" />
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Se calcula en el siguiente paso
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between border-b border-gray-200 py-4 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">Subtotal</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                ${formatPrice(subtotal, { showCurrency: false })} MXN
              </span>
            </div>

            {/* Info Note */}
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              * El precio final incluirá envío e IVA según tu dirección de entrega.
            </p>

            {/* Checkout Button */}
            <button
              onClick={() => router.push("/tienda/checkout")}
              className="mt-6 w-full rounded-lg bg-black py-3 font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Proceder al Pago
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}