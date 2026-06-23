"use client";

import { useEffect, useState } from "react";
import { landingApi } from "@/lib/landing-api";
import type { EstadisticasLanding } from "@/lib/landing-api";

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

    landingApi.estadisticas(controller.signal)
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
