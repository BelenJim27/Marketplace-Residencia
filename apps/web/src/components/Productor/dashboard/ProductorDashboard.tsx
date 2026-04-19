"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ExportButtons } from "./charts/ExportButtons";
import { ProductosChart } from "./charts/ProductosChart";
import { VentasChart } from "./charts/VentasChart";
import { StatsCards } from "./StatsCards";
import { DashboardPeriod, useVentasData } from "./hooks/useVentasData";
import { useProductosData } from "./hooks/useProductosData";

type Producer = {
  id_productor: number;
  id_usuario?: string;
  biografia?: string | null;
  usuarios?: { nombre?: string; email?: string; id_usuario?: string };
};

type Product = {
  status?: string | null;
};

export function ProductorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [producer, setProducer] = useState<Producer | null>(null);
  const [salesPeriod, setSalesPeriod] = useState<DashboardPeriod>("mes");
  const [productsPeriod, setProductsPeriod] = useState<DashboardPeriod>("mes");
  const chartsRef = useRef<HTMLDivElement | null>(null);

  const {
    data: salesData,
    isLoading: salesLoading,
    error: salesError,
    refetch: retrySales,
  } = useVentasData(salesPeriod);
  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
    refetch: retryProducts,
  } = useProductosData(productsPeriod);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id_productor) {
      setLoading(false);
      setError("No fue posible identificar el productor autenticado.");
      setProducts([]);
      setProducer(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const productsRes = await api.productos.getByProductor(user.id_productor as number);

        if (cancelled) return;
        setProducts(Array.isArray(productsRes) ? productsRes : []);
        setProducer({
          id_productor: user.id_productor as number,
        });
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Error al cargar el dashboard",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id_productor]);

  const ownedProducts = products;
  const activeProducts = useMemo(
    () =>
      ownedProducts.filter(
        (item) => String(item.status || "activo").toLowerCase() === "activo",
      ).length,
    [ownedProducts],
  );

  const exportCsv = () => {
    const rows = [
      ...(salesData?.rawRows || []).map((row) => ({
        fuente: `ventas_${salesPeriod}`,
        periodo: salesPeriod,
        ...row,
      })),
      ...(productsData?.rawRows || []).map((row) => ({
        fuente: `productos_${productsPeriod}`,
        periodo: productsPeriod,
        ...row,
      })),
    ];

    const headers = [
      "fuente",
      "periodo",
      "fecha",
      "producto",
      "cantidad",
      "monto",
      "tienda",
      "status",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((key) =>
            escapeCsv(String((row as Record<string, unknown>)[key] ?? "")),
          )
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dashboard-productor-ventas.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!chartsRef.current) return;

    const canvas = await html2canvas(chartsRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
    });
    const imageData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;

    pdf.setFontSize(14);
    pdf.text("Dashboard Productor", margin, 12);
    pdf.setFontSize(10);
    pdf.text(
      `Ventas: ${periodLabel(salesPeriod)} | Productos: ${periodLabel(productsPeriod)}`,
      margin,
      18,
    );
    pdf.addImage(imageData, "PNG", margin, 24, imageWidth, imageHeight);
    pdf.save("dashboard-productor.pdf");
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-gray-100 dark:bg-gray-900">
      <div className="rounded-[10px] border border-stroke bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Dashboard Productor
        </h1>
        <p className="text-gray-500 dark:text-gray-200">
          Panel de Maestro Mezcalero
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <StatsCards
        products={ownedProducts.length}
        active={activeProducts}
        profileLabel={producer ? "Completo" : "Pendiente"}
      />

      <section
        id="analiticas"
        className="rounded-[10px] border border-stroke bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-dark dark:text-white">
              Analíticas
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Ventas y productos más vendidos de tu productor
            </p>
          </div>

          <ExportButtons
            onExportPdf={exportPdf}
            onExportCsv={exportCsv}
            disabled={salesLoading || productsLoading}
          />
        </div>

        <div ref={chartsRef} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MiniStat
              title={`Periodo ventas (${periodLabel(salesPeriod)})`}
              value={salesData?.resumen.pedidos ?? 0}
            />
            <MiniStat
              title="Ingresos MXN"
              value={formatCurrency(salesData?.resumen.ingresos ?? 0)}
            />
            <MiniStat
              title="Productos vendidos"
              value={salesData?.resumen.productosVendidos ?? 0}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
      </section>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-[10px] border border-stroke bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">
        {title}
      </p>
      <div className="mt-2 text-xl font-semibold text-dark dark:text-white">
        {value}
      </div>
    </div>
  );
}

function periodLabel(periodo: DashboardPeriod) {
  if (periodo === "semana") return "Semana";
  if (periodo === "año") return "Año";
  return "Mes";
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}
