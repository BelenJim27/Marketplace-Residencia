"use client";

import Image from "next/image";
import Link from "next/link";
import {Minus, Plus, Trash2, ShoppingBag, ArrowRight} from "lucide-react";
import {useCarrito} from "@/context/CarritoContext";

export default function CarritoPage() {
  const {items, cantidadTotal, precioTotal, actualizarCantidad, eliminarProducto} = useCarrito();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
        <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white">
          Carrito de Compras
        </h1>

        <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-dark">
          <ShoppingBag className="h-16 w-16 text-gray-300" />
          <p className="text-gray-500">Tu carrito está vacío</p>
          <Link
            href="/Cliente/producto"
            className="mt-4 flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
          >
            Ver productos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
      <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white">
        Carrito de Compras
      </h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white shadow-md dark:bg-gray-dark">
            {items.map((item) => (
              <div
                key={item.id_producto}
                className="flex gap-4 border-b border-gray-200 p-4 last:border-b-0 dark:border-gray-700"
              >
                <Link
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
                      {item.nombre}
                    </Link>
                    <p className="text-sm text-gray-500">
                      ${Number(item.precio_base).toFixed(2)} each
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          actualizarCantidad(item.id_producto, item.cantidad - 1)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center">{item.cantidad}</span>
                      <button
                        onClick={() =>
                          actualizarCantidad(item.id_producto, item.cantidad + 1)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => eliminarProducto(item.id_producto)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">
                    ${(Number(item.precio_base) * item.cantidad).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/Cliente/producto"
            className="mt-4 flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
          >
            <ArrowRight size={16} className="rotate-180" />
            Continuar comprando
          </Link>
        </div>

        <div>
          <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Resumen del pedido
            </h2>

            <div className="space-y-2 border-b border-gray-200 pb-4 dark:border-gray-700">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Subtotal ({cantidadTotal} items)</span>
                <span>${precioTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Envío</span>
                <span>Calculado al pagar</span>
              </div>
            </div>

            <div className="flex justify-between py-4">
              <span className="font-semibold text-gray-900 dark:text-white">Total</span>
              <span className="text-xl font-bold text-green-600">
                ${precioTotal.toFixed(2)}
              </span>
            </div>

            <button className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700">
              Proceder al pago
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}