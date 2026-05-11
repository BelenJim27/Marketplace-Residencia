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
      className="flex flex-col rounded-lg overflow-hidden border border-gray-100 hover:shadow-md transition-shadow bg-white active:scale-95 transition-transform"
    >
      <div className="relative aspect-square bg-gray-50">
        {producto.imagen_principal_url ? (
          <Image
            src={producto.imagen_principal_url}
            alt={producto.nombre}
            fill
            sizes="(max-width: 480px) 45vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300 text-xs">Sin imagen</div>
        )}
      </div>
      <div className="p-2 sm:p-3 space-y-1">
        <p
          className="text-xs sm:text-sm font-medium line-clamp-2 leading-tight"
          style={{ color: "var(--bio-color-titulo, #5c3d1e)", fontFamily: "var(--bio-fuente-titulo, Georgia, serif)" }}
        >
          {producto.nombre}
        </p>
        {producto.total_resenas > 0 && <MiniStars promedio={producto.promedio_calificacion} />}
        <p className="text-xs sm:text-sm font-bold" style={{ color: "var(--bio-color-precio, #8b6914)" }}>
          ${formatPrice(Number(producto.precio_base), { showCurrency: false })}
        </p>
      </div>
    </Link>
  );
}

// ─── Sección genérica con scroll horizontal en móvil ─────────────────────────

function SeccionProductos({
  titulo,
  productos,
}: {
  titulo: string;
  productos: ProductoCard[];
}) {
  if (!productos.length) return null;

  return (
    <section className="space-y-3">
      <h3
        className="text-lg sm:text-xl font-bold"
        style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
      >
        {titulo}
      </h3>

      {/* Scroll horizontal en móvil, grid en sm+ */}
      <div className="sm:hidden flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
        {productos.map((p) => (
          <div key={p.id_producto} className="w-36 shrink-0 snap-start">
            <ProductoMiniCard producto={p} />
          </div>
        ))}
      </div>

      <div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {productos.map((p) => (
          <ProductoMiniCard key={p.id_producto} producto={p} />
        ))}
      </div>
    </section>
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

  return <SeccionProductos titulo="Productos similares" productos={productos} />;
}

// ─── También compraron ────────────────────────────────────────────────────────

export function TambienCompraron({ productoId }: { productoId: string }) {
  const [productos, setProductos] = useState<ProductoCard[]>([]);

  useEffect(() => {
    api.resenas.getTambienCompraron(productoId, 6).then((data) => {
      setProductos((data as ProductoCard[]) ?? []);
    });
  }, [productoId]);

  return <SeccionProductos titulo="Clientes también compraron" productos={productos} />;
}