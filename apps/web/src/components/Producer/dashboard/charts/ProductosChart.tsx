"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardPeriod, VentasAnalytics } from "@/hooks/useVentasData";

// Colores por nivel de rotación
const COLOR_ALTA  = "#3d7a4f";  // ≥ 7 unidades
const COLOR_MEDIA = "#a0b86a";  // 3–6 unidades
const COLOR_BAJA  = "#d0a060";  // ≤ 2 unidades

type Props = {
  periodo: DashboardPeriod;
  onPeriodoChange: (p: DashboardPeriod) => void;
  data: VentasAnalytics | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function rotationColor(qty: number): string {
  if (qty >= 7) return COLOR_ALTA;
  if (qty >= 3) return COLOR_MEDIA;
  return COLOR_BAJA;
}

function rotationLabel(qty: number): string {
  if (qty >= 7) return "Alta";
  if (qty >= 3) return "Media";
  return "Baja";
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function MetricCard({ label, main, sub }: { label: string; main: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-[130px] rounded-xl border border-[#C5CFB0]/60 dark:border-[#2d4a35]/60 bg-[#F4F0E3]/60 dark:bg-[#1a2a1e]/60 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#1F3A2E]/50 dark:text-[#e2ede3]/50">{label}</p>
      <p className="mt-1 text-lg font-black text-[#1F3A2E] dark:text-[#e2ede3] leading-tight">{main}</p>
      {sub && <p className="mt-0.5 text-xs text-[#3D6B3F]/70 dark:text-[#9dc49e]/70 line-clamp-1">{sub}</p>}
    </div>
  );
}

function ProductosTooltip({ active, payload }: { active?: boolean; payload?: { payload: EnrichedItem }[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className="rounded-xl border border-[#C5CFB0] dark:border-[#2d4a35] bg-[#F4F0E3] dark:bg-[#162218] px-4 py-3 text-sm shadow-[0_4px_12px_rgba(61,107,63,0.15)] max-w-[260px]">
      <p className="font-semibold text-[#1F3A2E] dark:text-[#e2ede3] mb-1.5 text-xs leading-snug">{item.x}</p>
      <p className="font-bold text-base" style={{ color: rotationColor(item.y) }}>
        {item.y} unidades · {item.pct}% del total
      </p>
      <p className="text-xs text-[#3D6B3F]/60 dark:text-[#9dc49e]/60 mt-1">
        Rotación: {rotationLabel(item.y)}
      </p>
    </div>
  );
}

// ── Tipos internos ─────────────────────────────────────────────────────────────

type EnrichedItem = {
  x: string;
  y: number;
  monto: number;
  pct: number;
  label: string;
};

// ── Componente principal ───────────────────────────────────────────────────────

export function ProductosChart({ periodo, onPeriodoChange, data, isLoading, error, onRetry }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const axisColor = isDark ? "#9dc49e" : "#3D6B3F";
  const axisColorPrimary = isDark ? "#e2ede3" : "#1F3A2E";
  const gridColor = isDark ? "rgba(45,74,53,0.5)" : "rgba(197,207,176,0.5)";
  const labelColor = isDark ? "#9dc49e" : "#64748b";
  const cursorColor = isDark ? "rgba(45,74,53,0.25)" : "rgba(197,207,176,0.15)";

  const rawData = data?.productos ?? [];

  const { chartData, metrics } = useMemo(() => {
    const sorted = [...rawData].sort((a, b) => b.y - a.y);
    const total = sorted.reduce((s, d) => s + d.y, 0);

    const enriched: EnrichedItem[] = sorted.map((d) => ({
      ...d,
      pct: total > 0 ? Math.round((d.y / total) * 100) : 0,
      label: `${d.y}  (${total > 0 ? Math.round((d.y / total) * 100) : 0}%)`,
    }));

    const leader = enriched[0];
    const top2Pct =
      total > 0 && enriched.length >= 2
        ? Math.round(((enriched[0].y + enriched[1].y) / total) * 100)
        : leader?.pct ?? 0;
    const lowRotation = enriched.filter((d) => d.y <= 2).length;

    return {
      chartData: enriched,
      metrics: { total, leader, top2Pct, lowRotation },
    };
  }, [rawData]);

  // Altura dinámica: al menos 320px, 52px por producto
  const chartHeight = Math.max(320, chartData.length * 52);

  // Ancho del eje Y según el nombre más largo
  const maxNameLen = chartData.reduce((max, d) => Math.max(max, d.x.length), 0);
  const yAxisWidth = Math.min(Math.max(maxNameLen * 7, 120), 240);

  return (
    <div id="export-productos-chart" className="rounded-2xl border border-[#C5CFB0] dark:border-[#2d4a35] bg-white dark:bg-[#1a2a1e] shadow-[0_2px_8px_rgba(61,107,63,0.08)] p-5 w-full">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-[#1F3A2E] dark:text-[#e2ede3] [font-family:'Playfair_Display',serif]">
            Productos
          </h3>
          <p className="text-sm text-[#3D6B3F]/70 dark:text-[#9dc49e]/70">Ranking por cantidad vendida</p>
        </div>
        <div className="flex rounded-full bg-[#F4F0E3] dark:bg-[#162218] border border-[#C5CFB0]/50 dark:border-[#2d4a35]/50 p-1">
          {(["semana", "mes", "año"] as DashboardPeriod[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onPeriodoChange(opt)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                periodo === opt
                  ? "bg-[#3d7a4f] text-white shadow-sm"
                  : "text-[#3D6B3F]/70 dark:text-[#9dc49e]/70 hover:text-[#1F3A2E] dark:hover:text-[#e2ede3]"
              }`}
            >
              {opt === "semana" ? "Semana" : opt === "mes" ? "Mes" : "Año"}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas de métricas */}
      {chartData.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-3">
          <MetricCard label="Total unidades" main={String(metrics.total)} />
          <MetricCard
            label="Producto líder"
            main={`${metrics.leader?.pct ?? 0}%`}
            sub={metrics.leader?.x}
          />
          <MetricCard
            label="Top 2 representan"
            main={`${metrics.top2Pct}%`}
            sub="del total vendido"
          />
          <MetricCard
            label="Baja rotación"
            main={String(metrics.lowRotation)}
            sub="productos (≤2 uds.)"
          />
        </div>
      )}

      {/* Gráfica */}
      {isLoading ? (
        <div className="h-[320px] animate-pulse rounded-xl bg-[#F4F0E3] dark:bg-[#162218]" />
      ) : error ? (
        <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-red-200 dark:border-red-800 text-sm text-red-500">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-red-50 dark:bg-red-900/30 px-4 py-2 font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : !chartData.length ? (
        <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-[#C5CFB0] dark:border-[#2d4a35] text-sm text-[#3D6B3F]/60 dark:text-[#9dc49e]/60">
          No hay productos para mostrar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 100, left: 10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="4 4"
              horizontal={false}
              stroke={gridColor}
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: axisColor, fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="x"
              tickLine={false}
              axisLine={false}
              width={yAxisWidth}
              tick={{ fill: axisColorPrimary, fontSize: 12 }}
            />
            <Tooltip
              content={(props: any) => <ProductosTooltip {...props} />}
              cursor={{ fill: cursorColor }}
            />
            <Bar dataKey="y" radius={[0, 6, 6, 0]} animationDuration={600}>
              {chartData.map((item, i) => (
                <Cell key={`cell-${i}`} fill={rotationColor(item.y)} />
              ))}
              <LabelList
                dataKey="label"
                position="right"
                style={{ fill: labelColor, fontSize: 12, fontWeight: 500 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Leyenda de rotación */}
      {chartData.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#3D6B3F]/70 dark:text-[#9dc49e]/70 border-t border-[#C5CFB0]/30 dark:border-[#2d4a35]/30 pt-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_ALTA }} />
            Alta rotación (≥7 uds.)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_MEDIA }} />
            Media rotación (3–6 uds.)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_BAJA }} />
            Baja rotación (≤2 uds.)
          </span>
        </div>
      )}
    </div>
  );
}
