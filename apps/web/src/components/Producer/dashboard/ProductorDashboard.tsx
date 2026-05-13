"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  const chartsRef = useRef<HTMLDivElement | null>(null);

  const { categorias, loadingCategorias, tieneLotes } =
    useProductorCategorias(token);

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
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportPdf = async () => {
    if (!chartsRef.current) return;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(chartsRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.text("Reporte de Rendimiento - Productor", 10, 10);
    pdf.addImage(imgData, "PNG", 10, 20, pdfWidth, pdfHeight);
    pdf.save("dashboard-analiticas.pdf");
  };

  if (loading || loadingCategorias) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  const categoriasLabel =
    categorias.length > 0
      ? categorias.map((c) => c.nombre).join(", ")
      : "General";

  return (
    <div className="min-h-screen space-y-6 bg-gray-100 p-4 dark:bg-gray-900 sm:p-6">
      {/* Header */}
      <div className="rounded-xl border border-stroke bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Dashboard Productor
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {tieneLotes ? "Panel de Maestro Mezcalero" : `Panel de Productor · ${categoriasLabel}`}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <StatsCards
        products={products.length}
        active={activeProducts}
        profileLabel={producer ? "Completo" : "Pendiente"}
      />

      {tieneLotes && (
        <section className="rounded-xl border border-stroke bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-stroke p-6 dark:border-gray-700">
            <h2 className="text-xl font-bold text-dark dark:text-white">
              Lotes de Producción
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestiona los lotes de tu producción de mezcal
            </p>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-400">
              Componente de Lotes aquí
            </p>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-stroke bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-stroke p-6 dark:border-gray-700">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-dark dark:text-white">Analíticas</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tieneLotes
                  ? "Ventas y productos más vendidos de tu producción"
                  : "Ventas y productos más vendidos"}
              </p>
            </div>
            <ExportButtons
              onExportPdf={exportPdf}
              onExportCsv={exportCsv}
              disabled={salesLoading || productsLoading}
            />
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

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
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
    <div className="flex flex-col rounded-xl bg-gray-50 p-5 transition-colors hover:bg-gray-100 dark:bg-gray-700/50">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {title} {subtitle && `(${subtitle})`}
      </span>
      <span className={`mt-2 text-2xl font-black ${highlight ? "text-green-600" : "text-dark dark:text-white"}`}>
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
