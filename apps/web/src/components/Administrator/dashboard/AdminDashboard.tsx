"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../lib/api";

type Stats = {
  totalUsuarios: number;
  totalProductores: number;
  totalPedidos: number;
  totalIngresos: number;
  pedidosPendientes: number;
  productoresActivos: number;
};

type RecentOrder = {
  id_pedido: number;
  fecha_creacion: string;
  total: number;
  estado: string;
  usuario?: { nombre: string; email: string };
};

type TopProductor = {
  id_productor: number;
  nombre: string;
  totalVentas: number;
  pedidos: number;
};

export function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProductores, setTopProductores] = useState<TopProductor[]>([]);
  const chartsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [statsRes, ordersRes] = await Promise.all([
          api.admin.getStats(),
          api.admin.getRecentOrders(),
        ]);

        if (cancelled) return;
        setStats(statsRes as Stats);
        setRecentOrders(Array.isArray(ordersRes) ? ordersRes.slice(0, 10) : []);
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
  }, [authLoading]);

  const activeProductores = useMemo(() => {
    if (!stats) return 0;
    return stats.productoresActivos;
  }, [stats]);

  const exportCsv = () => {
    const rows = [
      ...recentOrders.map((order) => ({
        id_pedido: order.id_pedido,
        fecha: order.fecha_creacion,
        total: order.total,
        estado: order.estado,
        cliente: order.usuario?.nombre || "",
        email: order.usuario?.email || "",
      })),
    ];

    const headers = ["id_pedido", "fecha", "total", "estado", "cliente", "email"];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((key) => escapeCsv(String((row as Record<string, unknown>)[key] ?? "")))
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dashboard-admin-pedidos.csv";
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
    pdf.text("Dashboard Administrador", margin, 12);
    pdf.setFontSize(10);
    pdf.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, margin, 18);
    pdf.addImage(imageData, "PNG", margin, 24, imageWidth, imageHeight);
    pdf.save("dashboard-admin.pdf");
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
          Dashboard Administrador
        </h1>
        <p className="text-gray-500 dark:text-gray-200">
          Panel de Administración del Marketplace
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Usuarios"
          value={stats?.totalUsuarios ?? 0}
          icon="Users"
        />
        <StatCard
          title="Productores"
          value={stats?.totalProductores ?? 0}
          icon="Store"
        />
        <StatCard
          title="Pedidos Totales"
          value={stats?.totalPedidos ?? 0}
          icon="ShoppingCart"
        />
        <StatCard
          title="Ingresos Totales"
          value={formatCurrency(stats?.totalIngresos ?? 0)}
          icon="DollarSign"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Pedidos Pendientes"
          value={stats?.pedidosPendientes ?? 0}
          icon="Clock"
          variant="warning"
        />
        <StatCard
          title="Productores Activos"
          value={activeProductores}
          icon="CheckCircle"
          variant="success"
        />
        <StatCard
          title="Ventas del Mes"
          value={formatCurrency(stats?.totalIngresos ?? 0)}
          icon="TrendingUp"
          variant="success"
        />
      </div>

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
              Resumen de pedidos recientes
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportPdf}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Exportar PDF
            </button>
            <button
              onClick={exportCsv}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <div ref={chartsRef} className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No hay pedidos recientes
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr
                      key={order.id_pedido}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-4 py-3">#{order.id_pedido}</td>
                      <td className="px-4 py-3">
                        {new Date(order.fecha_creacion).toLocaleDateString("es-MX")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{order.usuario?.nombre}</div>
                        <div className="text-xs text-gray-500">
                          {order.usuario?.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(Number(order.total))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                            ${order.estado === "completado" ? "bg-green-100 text-green-800" : ""}
                            ${order.estado === "pendiente" ? "bg-yellow-100 text-yellow-800" : ""}
                            ${order.estado === "cancelado" ? "bg-red-100 text-red-800" : ""}
                            ${order.estado === "enviado" ? "bg-blue-100 text-blue-800" : ""}
                          `}
                        >
                          {order.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  variant,
}: {
  title: string;
  value: number | string;
  icon?: string;
  variant?: "default" | "warning" | "success";
}) {
  const variantClasses = {
    default: "border-stroke dark:border-gray-700",
    warning: "border-yellow-300 dark:border-yellow-600",
    success: "border-green-300 dark:border-green-600",
  };

  return (
    <div
      className={`rounded-[10px] border bg-white p-4 shadow-sm dark:bg-gray-800 ${variantClasses[variant || "default"]}`}
    >
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">
        {title}
      </p>
      <div className="mt-2 text-xl font-semibold text-dark dark:text-white">
        {value}
      </div>
    </div>
  );
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
