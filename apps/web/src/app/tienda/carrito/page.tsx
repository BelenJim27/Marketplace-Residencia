"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useCarrito } from "@/context/CarritoContext";
import { formatPrice } from "@/lib/format-number";

export default function CarritoPage() {
  const router = useRouter();
  const { items, cantidadTotal, precioTotal, actualizarCantidad, eliminarProducto } = useCarrito();
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountPercent] = useState(0);
  const [includeWarranty, setIncludeWarranty] = useState(false);

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-12 md:px-8">
        <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white">
          Shopping Cart
        </h1>

        <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-white p-12 text-center shadow-md dark:bg-gray-dark">
          <ShoppingBag className="h-16 w-16 text-gray-300" />
          <p className="text-gray-600 dark:text-gray-400">Your cart is empty</p>
          <Link
            href="/cliente/producto"
            className="mt-4 rounded-lg bg-black px-6 py-2 text-white transition-colors hover:bg-gray-800"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  const subtotal = precioTotal;
  const discountAmount = discountApplied ? (subtotal * discountPercent) / 100 : 0;
  const deliveryFee = 50;
  const warrantyFee = includeWarranty ? 50 : 0;
  const total = subtotal - discountAmount + deliveryFee + warrantyFee;

  const handleApplyDiscount = () => {
    if (discountCode.length > 0) {
      setDiscountApplied(true);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="mb-8 text-4xl font-bold text-dark dark:text-white">
        Shopping Cart
      </h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Products Table */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white shadow-md dark:bg-gray-dark">
            {/* Table Header */}
            <div className="hidden border-b border-gray-200 px-6 py-4 dark:border-gray-700 lg:grid lg:grid-cols-5 lg:gap-4">
              <div className="col-span-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                PRODUCT CODE
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                QUANTITY
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                TOTAL
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                ACTION
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
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="font-medium text-gray-900 dark:text-white hover:text-green-600">
                      {item.nombre}
                    </h3>
                    <p className="text-xs text-gray-500">
                      ${formatPrice(Number(item.precio_base), { showCurrency: false })} each
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

          <button
            onClick={() => router.push("/cliente/producto")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-black px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            ← Continue Shopping
          </button>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 rounded-lg bg-white p-6 shadow-md dark:bg-gray-dark">
            <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
              Order Summary
            </h2>

            {/* Discount Input */}
            <div className="mb-6 flex gap-2">
              <input
                type="text"
                placeholder="Discount voucher"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleApplyDiscount}
                className="rounded-full bg-gray-200 px-4 py-2 text-xs font-medium text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                Apply
              </button>
            </div>

            {/* Pricing Breakdown */}
            <div className="space-y-3 border-b border-gray-200 pb-4 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Sub Total</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${formatPrice(subtotal, { showCurrency: false })}USD
                </span>
              </div>

              {discountApplied && discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    Discount({discountPercent}%)
                  </span>
                  <span className="font-medium text-red-500">
                    -${formatPrice(discountAmount, { showCurrency: false })}USD
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Delivery fee</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${formatPrice(deliveryFee, { showCurrency: false })}USD
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between border-b border-gray-200 py-4 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">Total</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                ${formatPrice(total, { showCurrency: false })}USD
              </span>
            </div>

            {/* Warranty Checkbox */}
            <div className="my-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="warranty"
                checked={includeWarranty}
                onChange={(e) => setIncludeWarranty(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="warranty" className="text-xs text-gray-600 dark:text-gray-300">
                90 Day Limited Warranty against manufacturing defects
              </label>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => router.push("/tienda/checkout")}
              className="w-full rounded-lg bg-black py-3 font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Checkout Now
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}