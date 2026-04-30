"use client";

import { useEffect, useState } from "react";

// Ajusta esta URL a la de tu API (revisa tu .env de Next.js)
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface EstadisticasLanding {
  totalProductores: number;
  totalProductos: number;
  totalRegiones: number;
  ingresosTotales: number;
  ingresosFormateado: string;
}

interface UseLandingStatsResult {
  stats: EstadisticasLanding | null;
  loading: boolean;
  error: string | null;
}

export function useLandingStats(): UseLandingStatsResult {
  const [stats, setStats] = useState<EstadisticasLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_URL}/estadisticas/landing`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json() as Promise<EstadisticasLanding>;
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError("No se pudieron cargar las estadísticas.");
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { stats, loading, error };
}