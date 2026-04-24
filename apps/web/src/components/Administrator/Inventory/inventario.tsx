"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { AdminCharts } from "../dashboard/AdminCharts";


type Stats = {
  totalUsuarios: number;
  totalProductores: number;
  totalPedidos: number;
  totalIngresos: number;
  pedidosPendientes: number;
  productoresActivos: number;
};

export function AdminDashboard() {
  const { loading: authLoading } = useAuth();
  const token = getCookie("token");

  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [stats, setStats]   = useState<Stats | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const statsRes = await api.admin.getStats(token ?? undefined);
        if (!cancelled) setStats(statsRes as Stats);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Error al cargar el dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [authLoading, token]);

  const productoresInactivos = useMemo(() => {
    if (!stats) return 0;
    return Math.max(0, stats.totalProductores - stats.productoresActivos);
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 p-4">Error: {error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Administrador</h1>
        <p className="text-sm text-gray-400 dark:text-dark-6 mt-0.5">Resumen general del sistema</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="TOTAL USUARIOS"          value={stats?.totalUsuarios ?? 0}        color="default" />
        <StatCard label="TOTAL PRODUCTORES"       value={stats?.totalProductores ?? 0}     color="default" />
        <StatCard label="PRODUCTORES ACTIVOS"     value={stats?.productoresActivos ?? 0}   color="green"   />
        <StatCard label="PRODUCTORES INACTIVOS"   value={productoresInactivos}             color="orange"  />
      </div>

      {/* Gráficas */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Análisis y Estadísticas</h2>
          <span className="h-px flex-1 bg-gray-100 dark:bg-dark-3" />
        </div>
        <AdminCharts />
      </div>
    </div>
  );
}

type StatColor = "default" | "green" | "blue" | "orange" | "purple";

function StatCard({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: number | string;
  color?: StatColor;
}) {
  const valueColors: Record<StatColor, string> = {
    default: "text-gray-800 dark:text-white",
    green:   "text-green-500",
    blue:    "text-blue-500",
    orange:  "text-orange-400",
    purple:  "text-purple-500",
  };

  return (
    <div className="bg-white dark:bg-dark-2 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-3 p-6 hover:shadow-md transition-shadow">
      <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-dark-6 uppercase mb-3">
        {label}
      </p>
      <p className={`text-4xl font-bold ${valueColors[color]}`}>{value}</p>
    </div>
  );
}