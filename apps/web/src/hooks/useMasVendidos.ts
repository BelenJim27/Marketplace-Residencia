"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ProductItem } from "@/types/producer";

interface ProductoMasVendido {
  nombre: string;
  subtitulo: string;
  imagen: string;
  totalVendido: number;
  notas: { vista: string; nariz: string; boca: string };
  anotaciones: { texto: string; posicion: string }[];
}

const FALLBACK_NOTAS = {
  vista: "Cristalino y brillante",
  nariz: "Herbal, notas de tierra y frutas dulces.",
  boca: "Cuerpo sedoso y final persistente.",
};

const FALLBACK_ANOTACIONES = [
  { texto: "Producto artesanal elaborado con tradición oaxaqueña.", posicion: "top-6 left-0" },
  { texto: "Destilado con dedicación generación tras generación.", posicion: "top-6 right-0 text-right" },
  { texto: "Producción limitada que respeta el ciclo natural.", posicion: "bottom-6 left-0" },
];

const IMAGEN_FALLBACK = "/fotos/28.1.png";

export function useMasVendidos(top = 3) {
  const [productos, setProductos] = useState<ProductoMasVendido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Traer analytics (no requiere token, usa el de la sesión pública)
        //    y todos los productos para cruzar imágenes
        const [analyticsRaw, todosLosProductos] = await Promise.all([
          api.pedidos.getAnalytics("", "year") as Promise<{
            productos: { x: string; y: number; monto: number }[];
          }>,
          api.productos.getAll() as Promise<ProductItem[]>,
        ]);

        // 2. Crear un mapa nombre → producto para búsqueda rápida
        const productoMap = new Map<string, ProductItem>(
          todosLosProductos.map((p) => [p.nombre.toLowerCase().trim(), p])
        );

        // 3. Cruzar top N más vendidos con sus imágenes reales
        const topProductos: ProductoMasVendido[] = analyticsRaw.productos
          .slice(0, top)
          .map((ventaItem) => {
            const match = productoMap.get(ventaItem.x.toLowerCase().trim());
            const imagen =
              match?.imagen_url ?? match?.imagen_principal_url ?? IMAGEN_FALLBACK;

            return {
              nombre: ventaItem.x,
              subtitulo: match?.descripcion
                ? match.descripcion.slice(0, 120) + (match.descripcion.length > 120 ? "…" : "")
                : `Con ${ventaItem.y} unidades vendidas, uno de los favoritos de nuestra comunidad.`,
              imagen,
              totalVendido: ventaItem.y,
              notas: FALLBACK_NOTAS,
              anotaciones: FALLBACK_ANOTACIONES,
            };
          });

        setProductos(topProductos);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar productos más vendidos"
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [top]);

  return { productos, loading, error };
}