"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardPeriod, VentasAnalytics } from "@/hooks/useVentasData";

const LINE_COLOR = "#3d7a4f";
const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

type Props = {
  periodo: DashboardPeriod;
  onPeriodoChange: (p: DashboardPeriod) => void;
  data: VentasAnalytics | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatXLabel(x: string): string {
  const iso = x.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const d = new Date(`${x}T12:00:00`);
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  const slash = x.match(/^(\d+)\/(\d+)$/);
  if (slash) return `${slash[1]} ${MONTHS[parseInt(slash[2]) - 1] ?? ""}`.trim();
  return x;
}

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v}`;
}

function fmtMXN(v: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function MetricCard({ label, main, sub }: { label: string; main: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-[130px] rounded-xl border border-[#C5CFB0]/60 bg-[#F4F0E3]/60 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#1F3A2E]/50">{label}</p>
      <p className="mt-1 text-lg font-black text-[#1F3A2E] leading-tight">{main}</p>
      {sub && <p className="mt-0.5 text-xs text-[#3D6B3F]/70">{sub}</p>}
    </div>
  );
}

function VentasTooltip({
  active, payload, label, promedio,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  promedio: number;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  const diff = val - promedio;
  const positive = diff >= 0;
  return (
    <div className="rounded-xl border border-[#C5CFB0] bg-[#F4F0E3] px-4 py-3 text-sm shadow-[0_4px_12px_rgba(61,107,63,0.15)] min-w-[180px]">
      <p className="font-semibold text-[#1F3A2E] mb-1.5">{label}</p>
      <p className="font-bold text-[#1F3A2E] text-base">{fmtMXN(val)}</p>
      {promedio > 0 && (
        <p className={`text-xs mt-1.5 font-medium ${positive ? "text-[#3d7a4f]" : "text-[#C97A3E]"}`}>
          {positive ? "▲" : "▼"} {fmtMXN(Math.abs(diff))} vs promedio diario
        </p>
      )}
    </div>
  );
}

// Punto visible sólo en días con ventas > 0
function CustomDot(props: {
  cx?: number; cy?: number; payload?: { y: number }; key?: string;
}) {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload || payload.y === 0) return <circle cx={cx} cy={cy} r={0} fill="none" />;
  return (
    <circle
      cx={cx} cy={cy} r={4}
      fill={LINE_COLOR} stroke="white" strokeWidth={2}
    />
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function VentasChart({ periodo, onPeriodoChange, data, isLoading, error, onRetry }: Props) {
  const rawData = data?.ventas ?? [];

  const { chartData, metrics } = useMemo(() => {
    const labeled = rawData.map((r) => ({ ...r, xLabel: formatXLabel(r.x) }));

    if (!labeled.length) return { chartData: labeled, metrics: null };

    const total = labeled.reduce((s, r) => s + r.y, 0);
    const avg = labeled.length > 0 ? total / labeled.length : 0;
    const peak = labeled.reduce((a, b) => b.y > a.y ? b : a, labeled[0]);
    const noSales = labeled.filter((r) => r.y === 0).length;

    return {
      chartData: labeled,
      metrics: { total, avg, peak, noSales },
    };
  }, [rawData]);

  return (
    <div id="export-ventas-chart" className="rounded-2xl border border-[#C5CFB0] bg-white shadow-[0_2px_8px_rgba(61,107,63,0.08)] p-5 w-full">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">
            Ventas
          </h3>
          <p className="text-sm text-[#3D6B3F]/70">Monto total vendido en MXN</p>
        </div>
        <div className="flex rounded-full bg-[#F4F0E3] border border-[#C5CFB0]/50 p-1">
          {(["semana", "mes", "año"] as DashboardPeriod[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onPeriodoChange(opt)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                periodo === opt
                  ? "bg-[#3d7a4f] text-white shadow-sm"
                  : "text-[#3D6B3F]/70 hover:text-[#1F3A2E]"
              }`}
            >
              {opt === "semana" ? "Semana" : opt === "mes" ? "Mes" : "Año"}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas de métricas */}
      {metrics && (
        <div className="mb-5 flex flex-wrap gap-3">
          <MetricCard label="Total del mes" main={fmtMXN(metrics.total)} />
          <MetricCard
            label="Día pico"
            main={fmtMXN(metrics.peak.y)}
            sub={metrics.peak.xLabel}
          />
          <MetricCard
            label="Promedio diario"
            main={fmtMXN(metrics.avg)}
          />
          <MetricCard
            label="Días sin ventas"
            main={String(metrics.noSales)}
            sub={`de ${chartData.length} días`}
          />
        </div>
      )}

      {/* Gráfica */}
      {isLoading ? (
        <div className="h-[320px] animate-pulse rounded-xl bg-[#F4F0E3]" />
      ) : error ? (
        <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-red-200 text-sm text-red-500">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-red-50 px-4 py-2 font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : !chartData.length ? (
        <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-[#C5CFB0] text-sm text-[#3D6B3F]/60">
          No hay ventas para mostrar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart
            data={chartData}
            margin={{ top: 16, right: 20, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="ventasGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={LINE_COLOR} stopOpacity={0.18} />
                <stop offset="95%" stopColor={LINE_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="rgba(197,207,176,0.5)"
            />
            <XAxis
              dataKey="xLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#3D6B3F", fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#3D6B3F", fontSize: 11 }}
              tickFormatter={fmtAxis}
              width={60}
            />
            {metrics && metrics.avg > 0 && (
              <ReferenceLine
                y={metrics.avg}
                stroke={LINE_COLOR}
                strokeDasharray="6 4"
                strokeOpacity={0.45}
                strokeWidth={1.5}
                label={{
                  value: `Prom. ${fmtAxis(metrics.avg)}`,
                  position: "insideTopRight",
                  fill: LINE_COLOR,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}
            <Tooltip
              content={(props: any) => (
                <VentasTooltip {...props} promedio={metrics?.avg ?? 0} />
              )}
              cursor={{ stroke: LINE_COLOR, strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="y"
              stroke={LINE_COLOR}
              strokeWidth={2.5}
              fill="url(#ventasGrad)"
              dot={(props: any) => <CustomDot {...props} />}
              activeDot={{ r: 6, fill: LINE_COLOR, stroke: "white", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
