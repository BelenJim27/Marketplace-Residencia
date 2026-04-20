"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

export type DashboardPeriod = "semana" | "mes" | "año";

export type VentasRow = {
  x: string;
  y: number;
};

export type VentasAnalytics = {
  periodo: string;
  resumen: {
    pedidos: number;
    productosVendidos: number;
    ingresos: number;
  };
  ventas: VentasRow[];
  productos: { x: string; y: number; monto: number }[];
  rawRows: Array<{
    fecha: string;
    producto: string;
    cantidad: number;
    monto: number;
    tienda: string;
    status: string;
  }>;
};

const PERIOD_MAP: Record<DashboardPeriod, "week" | "month" | "year"> = {
  semana: "week",
  mes: "month",
  año: "year",
};

export function useVentasData(periodo: DashboardPeriod) {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<VentasAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    const token = getCookie("token") ?? "";

    if (!user?.id_productor || !token) {
      setIsLoading(false);
      setError("No fue posible identificar el productor autenticado.");
      setData(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = (await api.pedidos.getAnalytics(token, PERIOD_MAP[periodo])) as VentasAnalytics;
        if (!cancelled) setData(response);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar las ventas",
          );
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
