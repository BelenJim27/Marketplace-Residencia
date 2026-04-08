"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardPeriod, VentasAnalytics } from "../hooks/useVentasData";

type Props = {
  periodo: DashboardPeriod;
  onPeriodoChange: (periodo: DashboardPeriod) => void;
  data: VentasAnalytics | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function ProductosChart({ periodo, onPeriodoChange, data, isLoading, error, onRetry }: Props) {
  const chartData = data?.productos || [];

  return (
    <div className="rounded-[10px] border border-stroke bg-white p-5 shadow-sm dark:border-form-strokedark dark:bg-form-input">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-dark dark:text-white">Productos</h3>
          <p className="text-sm text-gray-500">Ranking de productos por cantidad vendida</p>
        </div>
        <div className="flex rounded-full bg-gray-100 p-1 dark:bg-white/5">
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

      {isLoading ? (
        <ChartSkeleton />
      ) : error ? (
        <ChartError message={error} onRetry={onRetry} />
      ) : chartData.length === 0 ? (
        <EmptyState message="No hay productos para mostrar" />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="5 5" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="x" tickLine={false} axisLine={false} width={180} tickFormatter={(value) => truncate(String(value), 24)} />
            <Tooltip formatter={(value, _name, entry) => [`${Number(value)} unidades`, `${(entry as any)?.payload?.x ?? ""}`] as [string, string]} labelFormatter={() => ""} />
            <Bar dataKey="y" radius={[0, 8, 8, 0]} animationDuration={600}>
              {chartData.map((item, index) => (
                <Cell key={item.x} fill={barColor(index, chartData.length)} />
              ))}
              <LabelList dataKey="y" position="right" fill="#64748b" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function labelPeriodo(periodo: DashboardPeriod) {
  if (periodo === "semana") return "Semana";
  if (periodo === "año") return "Año";
  return "Mes";
}

function barColor(index: number, total: number) {
  if (index === 0) return "#16a34a";
  if (index === total - 1) return "#fb923c";
  return "#d1d5db";
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength).trimEnd()}...`;
}

function ChartSkeleton() {
  return <div className="h-[320px] animate-pulse rounded-[10px] bg-gray-100 dark:bg-white/5" />;
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex h-[320px] items-center justify-center rounded-[10px] border border-dashed border-stroke text-sm text-gray-500 dark:border-form-strokedark">{message}</div>;
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
