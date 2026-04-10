"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo } from "react";
import type { DashboardPeriod, VentasAnalytics } from "../hooks/useVentasData";

type Props = {
  periodo: DashboardPeriod;
  onPeriodoChange: (periodo: DashboardPeriod) => void;
  data: VentasAnalytics | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function VentasChart({ periodo, onPeriodoChange, data, isLoading, error, onRetry }: Props) {
  const chartData = data?.ventas || [];

  const content = useMemo(() => {
    if (isLoading) return <ChartSkeleton />;
    if (error) return <ChartError message={error} onRetry={onRetry} />;
    if (!chartData.length) return <EmptyState message="No hay ventas para mostrar" />;

    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="rgba(148,163,184,0.25)" />
          <XAxis dataKey="x" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${Number(v).toLocaleString("es-MX")}`} />
          <Tooltip formatter={(value) => [`$${Number(value).toLocaleString("es-MX")}`, "Ventas"] as [string, string]} labelFormatter={(label) => `Fecha: ${label}`} />
          <Area type="monotone" dataKey="y" stroke="#16a34a" strokeWidth={2} fill="url(#ventasGradient)" dot={false} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }, [chartData, error, isLoading, onRetry]);

  return (
    <div className="rounded-[10px] border border-stroke bg-white dark:bg-gray-800 p-5 shadow-sm dark:border-gray-700">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-dark dark:text-white">Ventas</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300">Monto total vendido en MXN</p>
        </div>
        <div className="flex rounded-full bg-gray-100 p-1 dark:bg-gray-700">
          {(["semana", "mes", "año"] as DashboardPeriod[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onPeriodoChange(option)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${periodo === option ? "bg-primary text-white" : "text-gray-600 hover:text-dark dark:text-gray-300 dark:hover:text-white"}`}
            >
              {labelPeriodo(option)}
            </button>
          ))}
        </div>
      </div>
      {content}
    </div>
  );
}

function labelPeriodo(periodo: DashboardPeriod) {
  if (periodo === "semana") return "Semana";
  if (periodo === "año") return "Año";
  return "Mes";
}

function ChartSkeleton() {
  return <div className="h-[320px] animate-pulse rounded-[10px] bg-gray-100 dark:bg-gray-700" />;
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex h-[320px] items-center justify-center rounded-[10px] border border-dashed border-stroke text-sm text-gray-500 dark:border-gray-700 dark:text-gray-300">{message}</div>;
}

function ChartError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-red-200 text-sm text-red-600 dark:border-red-900">
      <p>{message}</p>
      <button type="button" onClick={onRetry} className="rounded-lg bg-red-50 px-4 py-2 font-medium text-red-700">
        Reintentar
      </button>
    </div>
  );
}
