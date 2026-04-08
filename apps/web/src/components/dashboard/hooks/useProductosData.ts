"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { DashboardPeriod, VentasAnalytics } from "./useVentasData";

const PERIOD_MAP: Record<DashboardPeriod, "week" | "month" | "year"> = {
  semana: "week",
  mes: "month",
  año: "year",
};

export function useProductosData(periodo: DashboardPeriod) {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<VentasAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (authLoading || !user?.id_productor) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = (await api.pedidos.getAnalytics(user.id_productor as number, PERIOD_MAP[periodo])) as VentasAnalytics;
        if (!cancelled) setData(response);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "No fue posible cargar los productos");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id_productor, periodo, retryToken]);

  return {
    data,
    isLoading,
    error,
    refetch: () => setRetryToken((value) => value + 1),
  };
}
