"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { api } from "@/lib/api";

interface Agregado {
  promedio: number;
  total: number;
  distribucion: { estrellas: number; cantidad: number }[];
}

interface Props {
  productoId: string;
}

export default function RatingAgregado({ productoId }: Props) {
  const [datos, setDatos] = useState<Agregado | null>(null);

  useEffect(() => {
    api.resenas.getAgregado(productoId).then((d) => setDatos(d as Agregado));
  }, [productoId]);

  if (!datos || datos.total === 0) return null;

  return (
    <div
      className="rounded-lg p-4 flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start"
      style={{ backgroundColor: "#f0ebe0", border: "1px solid #e8dcc8" }}
    >
      {/* Promedio grande */}
      <div className="text-center shrink-0">
        <p
          className="text-5xl font-bold"
          style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
        >
          {datos.promedio.toFixed(1)}
        </p>
        <div className="flex gap-0.5 justify-center mt-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={14}
              className={n <= Math.round(datos.promedio) ? "fill-amber-400 text-amber-400" : "text-gray-300"}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">{datos.total} reseña{datos.total !== 1 ? "s" : ""}</p>
      </div>

      {/* Barras por estrella */}
      <div className="w-full flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((estrella) => {
          const entry = datos.distribucion.find((d) => d.estrellas === estrella);
          const cantidad = entry?.cantidad ?? 0;
          const pct = datos.total > 0 ? (cantidad / datos.total) * 100 : 0;
          return (
            <div key={estrella} className="flex items-center gap-2 text-xs">
              <span className="w-2 text-gray-500 shrink-0">{estrella}</span>
              <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
              <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: "var(--bio-color-precio, #8b6914)" }}
                />
              </div>
              <span className="w-4 text-right text-gray-400 shrink-0">{cantidad}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}