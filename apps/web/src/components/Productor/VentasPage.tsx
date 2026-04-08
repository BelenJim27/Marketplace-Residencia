"use client";

import { useMemo, useState } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Eye, Plus } from "lucide-react";
import type { ReactNode } from "react";

type SaleStatus = "completada" | "pendiente" | "cancelada";

type SaleItem = {
  id: number;
  producto: string;
  tienda: string;
  precio_unitario: number;
  cantidad: number;
  status: SaleStatus;
  fecha: string;
};

const MOCK_SALES: SaleItem[] = [
  {
    id: 1,
    producto: "Mezcal Espadín Joven 750ml",
    tienda: "Casa Ramirez Mezcal",
    precio_unitario: 680,
    cantidad: 2,
    status: "completada",
    fecha: "2026-04-01T12:30:00",
  },
  {
    id: 2,
    producto: "Mezcal Tobalá Reserva",
    tienda: "Destilados del Valle",
    precio_unitario: 1800,
    cantidad: 1,
    status: "pendiente",
    fecha: "2026-04-02T09:10:00",
  },
  {
    id: 3,
    producto: "Mezcal Ensamble Artesanal",
    tienda: "Casa Ramirez Mezcal",
    precio_unitario: 420,
    cantidad: 4,
    status: "cancelada",
    fecha: "2026-04-03T18:00:00",
  },
  {
    id: 4,
    producto: "Mezcal Cuishe Edición Limitada",
    tienda: "Destilados del Valle",
    precio_unitario: 320,
    cantidad: 3,
    status: "completada",
    fecha: "2026-04-04T14:40:00",
  },
];

export function VentasPage() {
  const [query, setQuery] = useState("");

  const filteredSales = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return MOCK_SALES;

    return MOCK_SALES.filter((sale) => {
      return (
        sale.producto.toLowerCase().includes(normalized) ||
        sale.tienda.toLowerCase().includes(normalized) ||
        sale.status.toLowerCase().includes(normalized)
      );
    });
  }, [query]);

  const totals = useMemo(() => {
    const totalVentas = filteredSales.length;
    const ingresos = filteredSales.reduce((sum, sale) => sum + sale.precio_unitario * sale.cantidad, 0);
    const pendientes = filteredSales.filter((sale) => sale.status === "pendiente").length;

    return { totalVentas, ingresos, pendientes };
  }, [filteredSales]);

  const stats = [
    { label: "Total Ventas", value: totals.totalVentas },
    { label: "Ingresos Totales (MXN)", value: formatCurrency(totals.ingresos) },
    { label: "Pendientes", value: totals.pendientes },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <Breadcrumb pageName="Ventas" title="Ventas" />

      <div className="mb-6 flex flex-col gap-4 rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Ventas</h1>
          <p className="text-sm text-gray-500">Consulta el estado de tus movimientos comerciales.</p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-white transition hover:bg-opacity-90">
          <Plus size={18} />
          Nueva Venta
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label} title={item.label} value={item.value} />
        ))}
      </div>

      <div className="mb-4 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por producto o tienda"
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2"
        />
      </div>

      <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-gray-2 dark:bg-dark-2">
              <tr className="text-sm text-gray-500">
                <th className="px-5 py-4">Producto</th>
                <th className="px-5 py-4">Tienda</th>
                <th className="px-5 py-4">Precio unitario</th>
                <th className="px-5 py-4">Cantidad</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Fecha</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredSales.map((sale) => {
                const total = sale.precio_unitario * sale.cantidad;

                return (
                  <tr key={sale.id} className="border-t border-stroke text-sm dark:border-dark-3">
                    <td className="px-5 py-4 font-medium text-dark dark:text-white">{sale.producto}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-3">{sale.tienda}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-3">{formatCurrency(sale.precio_unitario)}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-3">{sale.cantidad}</td>
                    <td className="px-5 py-4 font-medium text-dark dark:text-white">{formatCurrency(total)}</td>
                    <td className="px-5 py-4">
                      <Badge status={sale.status} />
                    </td>
                    <td className="px-5 py-4 text-gray-500">{formatDate(sale.fecha)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <ActionButton label="Ver detalle" icon={<Eye size={16} />} />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-500">
                    No hay ventas para mostrar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark">
      <p className="text-sm text-gray-500">{title}</p>
      <div className="mt-2 text-2xl font-bold text-dark dark:text-white">{value}</div>
    </div>
  );
}

function Badge({ status }: { status: SaleStatus }) {
  const className =
    status === "completada"
      ? "bg-green-50 text-green-700"
      : status === "pendiente"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${className}`}>{status}</span>;
}

function ActionButton({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      className="rounded-lg p-2 text-gray-500 transition hover:bg-[rgba(124,58,237,0.08)] hover:text-primary"
    >
      {icon}
    </button>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
}
