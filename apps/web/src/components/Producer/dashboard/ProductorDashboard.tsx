"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { ExportButtons } from "./charts/ExportButtons";
import { ProductosChart } from "./charts/ProductosChart";
import { VentasChart } from "./charts/VentasChart";
import { StatsCards } from "./StatsCards";
import { DashboardPeriod, useVentasData } from "@/hooks/useVentasData";
import { useProductosData } from "@/hooks/useProductosData";
import { useProductorCategorias } from "@/hooks/useProductorCategorias";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type Producer = {
  id_productor: number;
  id_usuario: string;
  descripcion?: string | null;
  biografia?: string | null;
  otras_caracteristicas?: string | null;
  usuarios?: {
    nombre?: string;
    email?: string;
    id_usuario?: string;
  };
};

type Product = {
  status?: string | null;
};

type CategoriaProductor = {
  id_categoria: number;
  nombre: string;
  slug: string;
};

// ── Constante: categorías que tienen panel con Lotes ───────────────────────────
const CATEGORIAS_CON_LOTES = ["Bebidas", "Bebidas_mezcal"];

// ── Componente principal ───────────────────────────────────────────────────────
export function ProductorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const token = getCookie("token") ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [producer, setProducer] = useState<Producer | null>(null);

  const [salesPeriod, setSalesPeriod] = useState<DashboardPeriod>("mes");
  const [productsPeriod, setProductsPeriod] = useState<DashboardPeriod>("mes");
  const [pdfLoading, setPdfLoading] = useState(false);

  const chartsRef = useRef<HTMLDivElement | null>(null);

  const { categorias, loadingCategorias, tieneLotes } =
    useProductorCategorias(token);

    console.log("categorias del productor:", categorias);

  const { data: salesData, isLoading: salesLoading, error: salesError, refetch: retrySales } =
    useVentasData(salesPeriod);
  const { data: productsData, isLoading: productsLoading, error: productsError, refetch: retryProducts } =
    useProductosData(productsPeriod);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id_productor || !token) {
      setLoading(false);
      setError("No fue posible identificar el productor autenticado.");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [productsRes, producerRes] = await Promise.all([
          api.productos.getByProductor(user.id_productor as number, token),
          api.productores.getOne(user.id_productor as number),
        ]);
        if (cancelled) return;
        setProducts(Array.isArray(productsRes) ? productsRes : []);
        setProducer(producerRes as Producer);
      } catch (err) {
        if (cancelled) return;
        setError("Error al cargar los datos del dashboard.");
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user, authLoading, token]);

  const activeProducts = useMemo(
    () =>
      products.filter(
        (item) => String(item.status || "activo").toLowerCase() === "activo"
      ).length,
    [products]
  );

  // ── Exportación ────────────────────────────────────────────────────────────
  const exportCsv = () => {
    const rows = [
      ...(salesData?.rawRows || []).map((row) => ({ fuente: "ventas", ...row })),
      ...(productsData?.rawRows || []).map((row) => ({ fuente: "productos", ...row })),
    ];
    const headers = ["fuente", "fecha", "producto", "cantidad", "monto", "status"];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((key) => escapeCsv(String((row as any)[key] ?? ""))).join(",")
      ),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportPdf = useCallback(async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const { exportPdfReport } = await import("@/lib/exportPdfReport");
      await exportPdfReport({
        producerName:     producer?.usuarios?.nombre ?? "Productor",
        producerPhoto:    (producer as any)?.foto_url ?? null,
        salesData,
        productsData,
        ventasChartEl:    document.getElementById("export-ventas-chart"),
        productosChartEl: document.getElementById("export-productos-chart"),
      });
    } catch (err) {
      console.error("Error generando PDF:", err);
    } finally {
      setPdfLoading(false);
    }
  }, [pdfLoading, producer, salesData, productsData]);

  if (loading || loadingCategorias) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C5CFB0] border-t-[#3D6B3F]" />
      </div>
    );
  }

  const categoriasLabel =
    categorias.length > 0
      ? categorias.map((c) => c.nombre).join(", ")
      : "General";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#C5CFB0] dark:border-[#2d4a35] bg-[#F4F0E3] dark:bg-[#162218] p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <h1 className="text-2xl font-bold text-[#1F3A2E] dark:text-[#e2ede3] [font-family:'Playfair_Display',serif]">
          Dashboard Productor
        </h1>
        <p className="text-[#3D6B3F]/70 dark:text-[#9dc49e]/70">
          {tieneLotes ? "Panel de Maestro Mezcalero" : `Panel de Productor · ${categoriasLabel}`}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div data-tour="stats-cards">
        <StatsCards
          products={products.length}
          active={activeProducts}
          profileLabel={producer ? "Completo" : "Pendiente"}
        />
      </div>

      {tieneLotes && (
        <section className="rounded-2xl border border-[#C5CFB0] dark:border-[#2d4a35] bg-[#F4F0E3] dark:bg-[#162218] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <div className="border-b border-[#C5CFB0]/50 dark:border-[#2d4a35]/50 p-6">
            <h2 className="text-xl font-bold text-[#1F3A2E] dark:text-[#e2ede3] [font-family:'Playfair_Display',serif]">
              Lotes de Producción
            </h2>
            <p className="text-sm text-[#3D6B3F]/70 dark:text-[#9dc49e]/70">
              Gestiona los lotes de tu producción de mezcal
            </p>
          </div>
          <div className="p-6">
            <p className="text-sm text-[#3D6B3F]/50 dark:text-[#9dc49e]/50">
              Componente de Lotes aquí
            </p>
          </div>
        </section>
      )}

      <section data-tour="analytics-section" className="rounded-2xl border border-[#C5CFB0] dark:border-[#2d4a35] bg-[#F4F0E3] dark:bg-[#162218] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="border-b border-[#C5CFB0]/50 dark:border-[#2d4a35]/50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#1F3A2E] dark:text-[#e2ede3] [font-family:'Playfair_Display',serif]">Analíticas</h2>
              <p className="text-sm text-[#3D6B3F]/70 dark:text-[#9dc49e]/70">
                {tieneLotes
                  ? "Ventas y productos más vendidos de tu producción"
                  : "Ventas y productos más vendidos"}
              </p>
            </div>
            <div data-tour="export-buttons">
              <ExportButtons
                onExportPdf={exportPdf}
                onExportCsv={exportCsv}
                disabled={salesLoading || productsLoading}
                pdfLoading={pdfLoading}
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <div ref={chartsRef} className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MiniStat
                title="Periodo ventas"
                value={salesData?.resumen.pedidos ?? 0}
                subtitle={periodLabel(salesPeriod)}
              />
              <MiniStat
                title="Ingresos"
                value={formatCurrency(salesData?.resumen.ingresos ?? 0)}
                highlight
              />
              <MiniStat
                title="Productos vendidos"
                value={salesData?.resumen.productosVendidos ?? 0}
              />
            </div>

            <div className="flex flex-col gap-8">
              <VentasChart
                periodo={salesPeriod}
                onPeriodoChange={setSalesPeriod}
                data={salesData}
                isLoading={salesLoading}
                error={salesError}
                onRetry={retrySales}
              />
              <ProductosChart
                periodo={productsPeriod}
                onPeriodoChange={setProductsPeriod}
                data={productsData}
                isLoading={productsLoading}
                error={productsError}
                onRetry={retryProducts}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Componentes locales ────────────────────────────────────────────────────────

function MiniStat({
  title,
  value,
  subtitle,
  highlight,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-[#C5CFB0]/50 dark:border-[#2d4a35]/50 bg-white dark:bg-[#1a2a1e] p-5 transition-colors hover:bg-[#C5CFB0]/10 dark:hover:bg-[#2d4a35]/20">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#1F3A2E]/40 dark:text-[#e2ede3]/40">
        {title} {subtitle && `(${subtitle})`}
      </span>
      <span className={`mt-2 text-2xl font-black ${highlight ? "text-[#3D6B3F] dark:text-[#6ab86c]" : "text-[#1F3A2E] dark:text-[#e2ede3]"}`}>
        {value}
      </span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function periodLabel(periodo: DashboardPeriod) {
  const labels = { semana: "Semana", mes: "Mes", año: "Año" };
  return labels[periodo];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
