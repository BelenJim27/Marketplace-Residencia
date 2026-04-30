"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format-number";

interface ProductoCard {
  id_producto: string;
  nombre: string;
  precio_base: string;
  moneda_base: string;
  imagen_principal_url?: string;
  promedio_calificacion: number;
  total_resenas: number;
}

function MiniStars({ promedio }: { promedio: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={11}
          className={n <= Math.round(promedio) ? "fill-amber-400 text-amber-400" : "text-gray-200"}
        />
      ))}
      <span className="text-xs text-gray-400 ml-1">{promedio > 0 ? promedio.toFixed(1) : ""}</span>
    </div>
  );
}

function ProductoMiniCard({ producto }: { producto: ProductoCard }) {
  return (
    <Link
      href={`/Cliente/producto/${producto.id_producto}`}
      className="flex flex-col rounded-lg overflow-hidden border border-gray-100 hover:shadow-md transition-shadow bg-white"
    >
      <div className="relative aspect-square bg-gray-50">
        {producto.imagen_principal_url ? (
          <Image
            src={producto.imagen_principal_url}
            alt={producto.nombre}
            fill
            sizes="(max-width: 768px) 50vw, 200px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300 text-xs">Sin imagen</div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p
          className="text-sm font-medium line-clamp-2 leading-tight"
          style={{ color: "var(--bio-color-titulo, #5c3d1e)", fontFamily: "var(--bio-fuente-titulo, Georgia, serif)" }}
        >
          {producto.nombre}
        </p>
        {producto.total_resenas > 0 && <MiniStars promedio={producto.promedio_calificacion} />}
        <p className="text-sm font-bold" style={{ color: "var(--bio-color-precio, #8b6914)" }}>
          ${formatPrice(Number(producto.precio_base), { showCurrency: false })}
        </p>
      </div>
    </Link>
  );
}

// ─── Productos similares ──────────────────────────────────────────────────────

export function ProductosSimilares({ productoId }: { productoId: string }) {
  const [productos, setProductos] = useState<ProductoCard[]>([]);

  useEffect(() => {
    api.resenas.getSimilares(productoId, 6).then((data) => {
      setProductos((data as ProductoCard[]) ?? []);
    });
  }, [productoId]);

  if (!productos.length) return null;

  return (
    <section className="space-y-4">
      <h3
        className="text-xl font-bold"
        style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
      >
        Productos similares
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {productos.map((p) => (
          <ProductoMiniCard key={p.id_producto} producto={p} />
        ))}
      </div>
    </section>
  );
}

// ─── También compraron ────────────────────────────────────────────────────────

export function TambienCompraron({ productoId }: { productoId: string }) {
  const [productos, setProductos] = useState<ProductoCard[]>([]);

  useEffect(() => {
    api.resenas.getTambienCompraron(productoId, 6).then((data) => {
      setProductos((data as ProductoCard[]) ?? []);
    });
  }, [productoId]);

  if (!productos.length) return null;

  return (
    <section className="space-y-4">
      <h3
        className="text-xl font-bold"
        style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
      >
        Clientes también compraron
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {productos.map((p) => (
          <ProductoMiniCard key={p.id_producto} producto={p} />
        ))}
      </div>
    </section>
  );
}