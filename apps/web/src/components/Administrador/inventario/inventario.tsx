"use client";

import { Edit2, Eye, Search, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type InventarioSummary = {
  productos_activos: number;
  productos_inactivos: number;
  total_productos: number;
  total_productores: number;
};

type InventarioItem = {
  id_producto: string;
  nombre_producto: string;
  productor: string;
  region: string;
  stock: number;
  status: string;
};

type InventarioResponse = {
  summary: InventarioSummary;
  items: InventarioItem[];
};

type Notice = {
  type: "error" | "success";
  message: string;
};

const EMPTY_SUMMARY: InventarioSummary = {
  productos_activos: 0,
  productos_inactivos: 0,
  total_productos: 0,
  total_productores: 0,
};

export default function InventarioUI() {
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [producerFilter, setProducerFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [summary, setSummary] = useState<InventarioSummary>(EMPTY_SUMMARY);
  const [items, setItems] = useState<InventarioItem[]>([]);

  useEffect(() => {
    async function loadInventario() {
      setLoading(true);

      try {
        const response = await fetch("/api/inventario", { cache: "no-store" });
        const data = (await response
          .json()
          .catch(() => null)) as InventarioResponse | null;

        if (!response.ok || !data) {
          throw new Error(
            data && "message" in data
              ? String((data as { message?: string }).message || "")
              : "No fue posible cargar el inventario.",
          );
        }

        setSummary(data.summary ?? EMPTY_SUMMARY);
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        setNotice({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "No fue posible cargar el inventario.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadInventario();
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !normalized ||
        [item.nombre_producto, item.productor].some((value) =>
          value.toLowerCase().includes(normalized),
        );
      const matchesProduct =
        !productFilter || item.nombre_producto === productFilter;
      const matchesProducer =
        !producerFilter || item.productor === producerFilter;
      const matchesRegion = !regionFilter || item.region === regionFilter;
      const matchesStatus = !statusFilter || item.status === statusFilter;

      return (
        matchesQuery &&
        matchesProduct &&
        matchesProducer &&
        matchesRegion &&
        matchesStatus
      );
    });
  }, [items, productFilter, producerFilter, query, regionFilter, statusFilter]);

  const productOptions = useMemo(
    () => [...new Set(items.map((item) => item.nombre_producto))].sort(),
    [items],
  );

  const producerOptions = useMemo(
    () => [...new Set(items.map((item) => item.productor))].sort(),
    [items],
  );

  const regionOptions = useMemo(
    () => [...new Set(items.map((item) => item.region))].sort(),
    [items],
  );

  const cards = [
    {
      label: "Productos Activos",
      value: summary.productos_activos,
      color: "text-green-600",
    },
    {
      label: "Productos Inactivos",
      value: summary.productos_inactivos,
      color: "text-amber-500",
    },
    {
      label: "Total Productos",
      value: summary.total_productos,
      color: "text-slate-800",
    },
    {
      label: "Total Productores",
      value: summary.total_productores,
      color: "text-blue-600",
    },
  ];

  function clearFilters() {
    setQuery("");
    setProductFilter("");
    setProducerFilter("");
    setRegionFilter("");
    setStatusFilter("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Gestión de Inventarios
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Administra el stock real de productos y productores.
          </p>
        </div>
      </div>

      {notice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {item.label}
            </p>
            <h2 className={`mt-1 text-2xl font-black ${item.color}`}>
              {item.value}
            </h2>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre de producto o productor..."
            className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <select
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          >
            <option value="">Todos los productos</option>
            {productOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={producerFilter}
            onChange={(event) => setProducerFilter(event.target.value)}
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          >
            <option value="">Todos los productores</option>
            {producerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={regionFilter}
            onChange={(event) => setRegionFilter(event.target.value)}
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          >
            <option value="">Todas las regiones</option>
            {regionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          >
            <option value="">Cualquier estado</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Nombre Producto</th>
                <th className="p-4">Productor</th>
                <th className="p-4">Región</th>
                <th className="p-4 text-center">Stock</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center text-sm text-gray-500"
                  >
                    Cargando inventario...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center text-sm text-gray-500"
                  >
                    No hay productos para mostrar.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id_producto}
                    className="group transition-colors hover:bg-gray-50/60"
                  >
                    <td className="p-4 font-mono text-xs text-gray-400">
                      #PRD-{item.id_producto}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      {item.nombre_producto}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {item.productor}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {item.region}
                    </td>
                    <td className="p-4 text-center text-sm font-semibold">
                      <span
                        className={
                          item.stock <= 5 ? "text-red-600" : "text-slate-700"
                        }
                      >
                        {item.stock}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <ActionButton label="Ver">
                          <Eye className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton label="Editar">
                          <Edit2 className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton label="Eliminar" danger>
                          <Trash2 className="h-4 w-4" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const className =
    normalized === "ACTIVO"
      ? "bg-green-50 text-green-700 border-green-100"
      : normalized === "INACTIVO"
        ? "bg-gray-100 text-gray-600 border-gray-200"
        : "bg-amber-50 text-amber-700 border-amber-100";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${className}`}
    >
      {normalized}
    </span>
  );
}

function ActionButton({
  children,
  label,
  danger = false,
}: {
  children: ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      className={`rounded-lg p-2 transition-colors ${danger ? "text-slate-400 hover:bg-red-50 hover:text-red-600" : "text-slate-400 hover:bg-green-50 hover:text-green-700"}`}
    >
      {children}
    </button>
  );
}
