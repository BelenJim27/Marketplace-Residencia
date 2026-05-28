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

export default function InventarioUI() {  // ← export default
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
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C5CFB0] border-t-[#3D6B3F]" />
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
        <h1 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Dashboard Administrador</h1>
        <p className="text-sm text-[#3D6B3F]/70 mt-0.5">Resumen general del sistema</p>
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
          <h2 className="text-lg font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Análisis y Estadísticas</h2>
          <span className="h-px flex-1 bg-[#C5CFB0]" />
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
    default: "text-[#1F3A2E]",
    green:   "text-[#3D6B3F]",
    blue:    "text-[#3D6B3F]",
    orange:  "text-[#C97A3E]",
    purple:  "text-[#1F3A2E]",
  };

  return (
    <div className="bg-[#F4F0E3] rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)] p-6 hover:shadow-[0_8px_24px_rgba(61,107,63,0.15)] hover:-translate-y-0.5 transition-all duration-200">
      <p className="text-sm font-semibold text-[#3D6B3F]/70 uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className={`text-2xl font-bold [font-family:'DM_Sans',sans-serif] ${valueColors[color]}`}>{value}</p>
    </div>
  );
}