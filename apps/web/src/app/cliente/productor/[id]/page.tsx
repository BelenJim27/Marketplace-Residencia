"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { AdminCharts } from "@/components/Administrator/dashboard/AdminCharts";

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
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, [authLoading, token]);

  const productoresInactivos = useMemo(() => {
    if (!stats) return 0;
    return Math.max(0, stats.totalProductores - stats.productoresActivos);
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 dark:border-red-900/30 dark:bg-red-950/20">
        <span className="text-red-500">⚠</span>
        <p className="text-sm font-medium text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Resumen general del sistema
            </p>
          </div>
          {/* Fecha actual */}
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
            </svg>
            {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total usuarios"
            value={stats?.totalUsuarios ?? 0}
            color="default"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
          />
          <StatCard
            label="Total productores"
            value={stats?.totalProductores ?? 0}
            color="blue"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            }
          />
          <StatCard
            label="Productores activos"
            value={stats?.productoresActivos ?? 0}
            color="green"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Productores inactivos"
            value={productoresInactivos}
            color="orange"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            }
          />
        </div>

        {/* Divider + section header */}
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Análisis y estadísticas
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Datos actualizados en tiempo real
            </p>
          </div>
          <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
        </div>

        {/* Charts */}
        <div className="rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
          <AdminCharts />
        </div>

      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type StatColor = "default" | "green" | "blue" | "orange" | "purple";

const colorConfig: Record<
  StatColor,
  { value: string; icon: string; badge: string; dot: string }
> = {
  default: {
    value: "text-gray-900 dark:text-white",
    icon: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    badge: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    dot: "bg-gray-400",
  },
  green: {
    value: "text-emerald-600 dark:text-emerald-400",
    icon: "bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-400",
    badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-400",
  },
  blue: {
    value: "text-blue-600 dark:text-blue-400",
    icon: "bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400",
    badge: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-400",
  },
  orange: {
    value: "text-orange-500 dark:text-orange-400",
    icon: "bg-orange-50 text-orange-400 dark:bg-orange-900/30 dark:text-orange-400",
    badge: "bg-orange-50 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400",
    dot: "bg-orange-400",
  },
  purple: {
    value: "text-purple-600 dark:text-purple-400",
    icon: "bg-purple-50 text-purple-500 dark:bg-purple-900/30 dark:text-purple-400",
    badge: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    dot: "bg-purple-400",
  },
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color = "default",
  icon,
}: {
  label: string;
  value: number | string;
  color?: StatColor;
  icon?: React.ReactNode;
}) {
  const c = colorConfig[color];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:border-gray-800 dark:bg-gray-900">
      {/* Top row: icon + dot indicator */}
      <div className="flex items-center justify-between mb-4">
        {icon ? (
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.icon}`}>
            {icon}
          </div>
        ) : (
          <div className={`h-2 w-2 rounded-full ${c.dot}`} />
        )}
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.badge}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
          Activo
        </span>
      </div>

      {/* Value */}
      <p className={`text-3xl font-bold tabular-nums tracking-tight ${c.value}`}>
        {typeof value === "number" ? value.toLocaleString("es-MX") : value}
      </p>

      {/* Label */}
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </p>

      {/* Subtle bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${c.dot} opacity-0 transition-opacity duration-200 group-hover:opacity-100`} />
    </div>
  );
}