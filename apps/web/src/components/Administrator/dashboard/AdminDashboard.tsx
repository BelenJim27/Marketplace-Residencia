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
  pedidosEnviados: number;
  productoresActivos: number;
  resumenFinanciero: {
    totalComisiones: number;
    totalEnvios: number;
    totalPaymentFees: number;
    totalPlataforma: number;
  };
  detalleProductores: Array<{
    id_productor: number;
    nombre: string;
    totalVentas: number;
    totalComisiones: number;
    totalNeto: number;
  }>;
};

const mxn = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);

const num = (v: number) => v.toLocaleString("es-MX");

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

  const pctActivos = useMemo(() => {
    if (!stats || stats.totalProductores <= 0) return 0;
    return Math.round((stats.productoresActivos / stats.totalProductores) * 100);
  }, [stats]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">
          Dashboard Administrador
        </h1>
        <p className="text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/70 mt-1">
          Resumen general del sistema
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 dark:border-red-900/30 dark:bg-red-950/20">
          <svg className="h-5 w-5 flex-shrink-0 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* ── Operación ── */}
          <section data-tour="admin-metrics">
            <Eyebrow>Operación</Eyebrow>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                className="lg:col-span-2"
                size="lg"
                label="Ventas totales"
                value={mxn(stats?.totalIngresos ?? 0)}
                sub={`${num(stats?.totalPedidos ?? 0)} pedidos pagados`}
                icon={ICONS.ingresos}
              />
              <MetricCard
                label="Pedidos pagados"
                value={num(stats?.totalPedidos ?? 0)}
                icon={ICONS.pedidos}
              />
              <MetricCard
                label="Pedidos enviados"
                value={num(stats?.pedidosEnviados ?? 0)}
                sub="Enviados y entregados"
                icon={ICONS.enviados}
              />
            </div>
          </section>

          {/* ── Comunidad ── */}
          <section>
            <Eyebrow>Comunidad</Eyebrow>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                className="lg:col-span-2"
                label="Usuarios"
                value={num(stats?.totalUsuarios ?? 0)}
                sub="Registrados en la plataforma"
                icon={ICONS.usuarios}
              />
              <ProductoresCard
                className="lg:col-span-2"
                total={stats?.totalProductores ?? 0}
                activos={stats?.productoresActivos ?? 0}
                inactivos={productoresInactivos}
                pctActivos={pctActivos}
              />
            </div>
          </section>

          {/* ── Resumen Financiero ── */}
          <section>
            <Eyebrow>Resumen Financiero</Eyebrow>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Comisiones cobradas"
                value={mxn(stats?.resumenFinanciero.totalComisiones ?? 0)}
                sub="Comisiones del marketplace"
                icon={ICONS.comisiones}
              />
              <MetricCard
                label="Envíos cobrados"
                value={mxn(stats?.resumenFinanciero.totalEnvios ?? 0)}
                sub="Cargos de envío a clientes"
                icon={ICONS.enviosIcon}
              />
              <MetricCard
                label="Fees de pago"
                value={mxn(stats?.resumenFinanciero.totalPaymentFees ?? 0)}
                sub="Stripe / PayPal"
                icon={ICONS.fees}
              />
              <MetricCard
                label="Total plataforma"
                value={mxn(stats?.resumenFinanciero.totalPlataforma ?? 0)}
                sub="Comisiones + envíos"
                accent="attention"
                icon={ICONS.totalPlataforma}
              />
            </div>
          </section>

          {/* ── Ganancias Netas por Productor ── */}
          {stats?.detalleProductores && stats.detalleProductores.length > 0 && (
            <section>
              <Eyebrow>Ganancias Netas por Productor</Eyebrow>
              <TablaProductoresNeto items={stats.detalleProductores} />
            </section>
          )}

          {/* ── Gráficas ── */}
          <section data-tour="admin-charts">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-base font-semibold text-[#1F3A2E] dark:text-[#E8E3D5] whitespace-nowrap [font-family:'Playfair_Display',serif]">
                Análisis y Estadísticas
              </h2>
              <span className="h-px flex-1 bg-[#C5CFB0] dark:bg-[#3D6B3F]/40" />
            </div>
            <AdminCharts stats={stats} />
          </section>
        </>
      )}
    </div>
  );
}

// ─── Eyebrow ────────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#3D6B3F]/60 dark:text-[#A8C26B]/60">
      {children}
    </p>
  );
}

// ─── MetricCard ─────────────────────────────────────────────────────────────

const CARD_BASE =
  "rounded-2xl border bg-white p-5 shadow-[0_2px_12px_rgba(61,107,63,0.08)] dark:bg-[#1F3A2E]/40";

function MetricCard({
  label,
  value,
  icon,
  sub,
  accent = "default",
  size = "md",
  className = "",
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
  accent?: "default" | "attention";
  size?: "md" | "lg";
  className?: string;
}) {
  const attention = accent === "attention";

  const borderCls = attention
    ? "border-[#C97A3E]/40 dark:border-[#C97A3E]/40"
    : "border-[#C5CFB0] dark:border-[#3D6B3F]/40";

  const iconCls = attention
    ? "bg-[#C97A3E]/15 text-[#C97A3E]"
    : "bg-[#3D6B3F]/12 text-[#3D6B3F] dark:bg-[#A8C26B]/15 dark:text-[#A8C26B]";

  const valueCls = attention
    ? "text-[#C97A3E]"
    : "text-[#1F3A2E] dark:text-[#E8E3D5]";

  return (
    <div className={`${CARD_BASE} ${borderCls} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">
          {label}
        </p>
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
          {icon}
        </span>
      </div>

      <p
        className={`mt-3 font-bold tabular-nums tracking-tight [font-family:'DM_Sans',sans-serif] ${valueCls} ${
          size === "lg" ? "text-4xl" : "text-3xl"
        }`}
      >
        {value}
      </p>

      {sub && (
        <p className="mt-1.5 text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/55">{sub}</p>
      )}
    </div>
  );
}

// ─── ProductoresCard (composite) ────────────────────────────────────────────

function ProductoresCard({
  total,
  activos,
  inactivos,
  pctActivos,
  className = "",
}: {
  total: number;
  activos: number;
  inactivos: number;
  pctActivos: number;
  className?: string;
}) {
  return (
    <div className={`${CARD_BASE} border-[#C5CFB0] dark:border-[#3D6B3F]/40 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">
            Productores
          </p>
          <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'DM_Sans',sans-serif]">
            {num(total)}
          </p>
        </div>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#3D6B3F]/12 text-[#3D6B3F] dark:bg-[#A8C26B]/15 dark:text-[#A8C26B]">
          {ICONS.productores}
        </span>
      </div>

      {/* Segmented bar: activos vs inactivos */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#3D6B3F] dark:text-[#A8C26B]">
            {pctActivos}% activos
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#C5CFB0]/50 dark:bg-[#3D6B3F]/30">
          <div
            className="h-full rounded-full bg-[#3D6B3F] dark:bg-[#A8C26B] transition-[width] duration-300"
            style={{ width: `${pctActivos}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center gap-4 text-xs text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3D6B3F] dark:bg-[#A8C26B]" />
            {num(activos)} activos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#C5CFB0]" />
            {num(inactivos)} inactivos
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  const block = "rounded-2xl border border-[#C5CFB0] bg-[#C5CFB0]/20 dark:border-[#3D6B3F]/40 dark:bg-[#3D6B3F]/20 h-[124px]";
  return (
    <div className="space-y-10 animate-pulse">
      <section>
        <div className="mb-3 h-3 w-24 rounded bg-[#C5CFB0]/40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${block} lg:col-span-2`} />
          <div className={block} />
          <div className={block} />
        </div>
      </section>
      <section>
        <div className="mb-3 h-3 w-24 rounded bg-[#C5CFB0]/40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${block} lg:col-span-2`} />
          <div className={`${block} lg:col-span-2`} />
        </div>
      </section>
    </div>
  );
}

// ─── TablaProductoresNeto ─────────────────────────────────────────────────────

function TablaProductoresNeto({ items }: { items: Stats['detalleProductores'] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1F3A2E]/40 shadow-[0_2px_12px_rgba(61,107,63,0.08)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#C5CFB0]/50 dark:border-[#3D6B3F]/30 bg-[#F4F0E3] dark:bg-[#1F3A2E]/60">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">#</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">Productor</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">Ventas Brutas</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">Comisión</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#C97A3E]">Neto Recibido</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p, i) => (
              <tr key={p.id_productor} className="border-b border-[#C5CFB0]/30 dark:border-[#3D6B3F]/20 hover:bg-[#F4F0E3]/50 dark:hover:bg-[#1F3A2E]/30 transition-colors">
                <td className="px-5 py-3.5 text-[#3D6B3F]/60 dark:text-[#A8C26B]/60">{i + 1}</td>
                <td className="px-5 py-3.5 font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{p.nombre}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-[#3D6B3F] dark:text-[#A8C26B]">{mxn(p.totalVentas)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-[#C97A3E]/80">{mxn(p.totalComisiones)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums font-bold text-[#1F3A2E] dark:text-[#E8E3D5]">{mxn(p.totalNeto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const ICONS = {
  usuarios: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  ingresos: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  pedidos: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  ),
  productores: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  ),
  enviados: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
  comisiones: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  enviosIcon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
  fees: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  totalPlataforma: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
};
