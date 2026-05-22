"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ProductoMasVendido {
  id: number;
  nombre: string;
  imagen: string;
  descripcion: string;
  cantidad: number;
}

export function useMasVendidos(top = 4) {
  const [productos, setProductos] = useState<ProductoMasVendido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.estadisticas.topProductos(top) as ProductoMasVendido[];
        setProductos(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar productos");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [top]);

  return { productos, loading, error };
}
