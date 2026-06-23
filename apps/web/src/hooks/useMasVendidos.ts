"use client";

import { useEffect, useState } from "react";
import { landingApi } from "@/lib/landing-api";
import type { ProductoMasVendido } from "@/lib/landing-api";

export function useMasVendidos(top = 4) {
  const [productos, setProductos] = useState<ProductoMasVendido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await landingApi.topProductos(top, controller.signal);
        setProductos(Array.isArray(data) ? data : []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error al cargar productos");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [top]);

  return { productos, loading, error };
}
