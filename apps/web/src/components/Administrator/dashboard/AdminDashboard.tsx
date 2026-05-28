"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { AdminCharts } from "./AdminCharts";

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#C5CFB0] border-t-[#3D6B3F]" />
        <p className="text-sm text-[#3D6B3F]/70">Cargando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 dark:border-red-900/30 dark:bg-red-950/20">
        <svg className="h-5 w-5 flex-shrink-0 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F3A2E] [font-family:'Playfair_Display',serif]">
            Dashboard Administrador
          </h1>
          <p className="text-sm text-[#3D6B3F]/70 mt-1">
            Resumen general del sistema
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 rounded-full bg-[#F4F0E3] border border-[#C5CFB0] px-4 py-2 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <svg
            className="h-4 w-4 text-[#3D6B3F]"
            fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span className="text-xs font-medium text-[#1F3A2E] capitalize">
            {today}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="TOTAL USUARIOS"        value={stats?.totalUsuarios ?? 0}      color="default" />
        <StatCard label="TOTAL PRODUCTORES"     value={stats?.totalProductores ?? 0}   color="blue"    />
        <StatCard label="PRODUCTORES ACTIVOS"   value={stats?.productoresActivos ?? 0} color="green"   />
        <StatCard label="PRODUCTORES INACTIVOS" value={productoresInactivos}           color="orange"  />
      </div>

      {/* Gráficas */}
      <div>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-base font-semibold text-[#1F3A2E] whitespace-nowrap [font-family:'Playfair_Display',serif]">
            Análisis y Estadísticas
          </h2>
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
  const iconBgCls: Record<StatColor, string> = {
    default: "bg-[#1F3A2E]/10 text-[#1F3A2E]",
    green:   "bg-[#A8C26B]/20 text-[#3D6B3F]",
    blue:    "bg-[#3D6B3F]/15 text-[#3D6B3F]",
    orange:  "bg-[#C97A3E]/15 text-[#C97A3E]",
    purple:  "bg-[#1F3A2E]/10 text-[#1F3A2E]",
  };

  const badgeCls: Record<StatColor, string> = {
    default: "bg-[#1F3A2E]/10 text-[#1F3A2E]",
    green:   "bg-[#A8C26B]/20 text-[#3D6B3F]",
    blue:    "bg-[#3D6B3F]/15 text-[#3D6B3F]",
    orange:  "bg-[#C97A3E]/15 text-[#C97A3E]",
    purple:  "bg-[#1F3A2E]/10 text-[#1F3A2E]",
  };

  const dotCls: Record<StatColor, string> = {
    default: "bg-[#1F3A2E]",
    green:   "bg-[#A8C26B]",
    blue:    "bg-[#3D6B3F]",
    orange:  "bg-[#C97A3E]",
    purple:  "bg-[#1F3A2E]",
  };

  const accentCls: Record<StatColor, string> = {
    default: "bg-[#1F3A2E]",
    green:   "bg-[#A8C26B]",
    blue:    "bg-[#3D6B3F]",
    orange:  "bg-[#C97A3E]",
    purple:  "bg-[#1F3A2E]",
  };

  const badgeLabel: Record<StatColor, string> = {
    default: "Total",
    green:   "Activos",
    blue:    "Registro",
    orange:  "Inactivos",
    purple:  "Premium",
  };

  const icons: Record<StatColor, React.ReactNode> = {
    default: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    green: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    blue: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
      </svg>
    ),
    orange: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    purple: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const displayValue =
    typeof value === "number" ? value.toLocaleString("es-MX") : value;

  return (
    <div className="group relative bg-[#F4F0E3] rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)] hover:shadow-[0_8px_24px_rgba(61,107,63,0.15)] hover:-translate-y-0.5 transition-all duration-200 p-5 overflow-hidden">
      {/* Accent line bottom */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-0.5 ${accentCls[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
      />

      {/* Icon + badge */}
      <div className="flex items-center justify-between mb-4">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${iconBgCls[color]}`}>
          {icons[color]}
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeCls[color]}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dotCls[color]}`} />
          {badgeLabel[color]}
        </span>
      </div>

      {/* Value */}
      <p className="text-3xl font-bold tabular-nums tracking-tight text-[#1F3A2E] [font-family:'DM_Sans',sans-serif]">
        {displayValue}
      </p>

      {/* Label */}
      <p className="text-xs font-medium uppercase tracking-wider text-[#3D6B3F]/70 mt-1">
        {label}
      </p>
    </div>
  );
}
