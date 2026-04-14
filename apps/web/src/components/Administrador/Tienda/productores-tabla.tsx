"use client";

import { Edit2, Eye, Plus, Search, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ProductoresForm, type ProductorAdmin } from "./productores-form";

type Notice = {
  type: "success" | "error";
  message: string;
};

export function ProductoresTabla() {
  const [productores, setProductores] = useState<ProductorAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [idFilter, setIdFilter] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activeMode, setActiveMode] = useState<
    "create" | "edit" | "view" | null
  >(null);
  const [selectedProductor, setSelectedProductor] =
    useState<ProductorAdmin | null>(null);
  const [deleting, setDeleting] = useState<ProductorAdmin | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadProductores() {
    setLoading(true);

    try {
      const response = await fetch("/api/productores", { cache: "no-store" });
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(
          data?.message || "No fue posible cargar los productores.",
        );
      }

      setProductores(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No fue posible cargar los productores.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProductores();
  }, []);

  const getStock = (productor: ProductorAdmin) =>
    productor.total_productos ?? productor.stock;

  const regionOptions = useMemo(
    () => [...new Set(productores.map((productor) => productor.region))].sort(),
    [productores],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedId = idFilter.replace(/[^a-z0-9]/gi, "").toUpperCase();

    return productores.filter((productor) => {
      const producerId = `PR${String(productor.id).padStart(4, "0")}`;
      const stock = getStock(productor);

      const matchesQuery =
        !normalizedQuery ||
        productor.nombre.toLowerCase().includes(normalizedQuery);
      const matchesRegion = !regionFilter || productor.region === regionFilter;
      const matchesStatus = !statusFilter || productor.status === statusFilter;
      const matchesId = !normalizedId || producerId === normalizedId;
      const matchesStock =
        !stockFilter ||
        (stockFilter === "WITH_STOCK" && stock > 0) ||
        (stockFilter === "WITHOUT_STOCK" && stock === 0) ||
        (stockFilter === "LOW_STOCK" && stock < 5);

      return (
        matchesQuery &&
        matchesRegion &&
        matchesStatus &&
        matchesId &&
        matchesStock
      );
    });
  }, [idFilter, productores, query, regionFilter, statusFilter, stockFilter]);

  const stats = [
    {
      label: "Total Productores",
      value: productores.length,
      color: "text-slate-800",
    },
    {
      label: "Activos",
      value: productores.filter((item) => item.status === "ACTIVO").length,
      color: "text-green-600",
    },
    {
      label: "Inactivos",
      value: productores.filter((item) => item.status === "PAUSADO").length,
      color: "text-amber-500",
    },
    {
      label: "Stock Total",
      value: productores.reduce((acc, item) => acc + getStock(item), 0),
      color: "text-blue-600",
    },
  ];

  function clearFilters() {
    setQuery("");
    setRegionFilter("");
    setStockFilter("");
    setStatusFilter("");
    setIdFilter("");
  }

  async function handleDelete() {
    if (!deleting) return;

    setDeleteLoading(true);

    try {
      const response = await fetch(`/api/productores/${deleting.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "No fue posible eliminar el productor.",
        );
      }

      setProductores((current) =>
        current.filter((item) => item.id !== deleting.id),
      );
      setNotice({
        type: "success",
        message: "Productor eliminado correctamente.",
      });
      setDeleting(null);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No fue posible eliminar el productor.",
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  function openModal(
    mode: "create" | "edit" | "view",
    productor?: ProductorAdmin,
  ) {
    setSelectedProductor(productor ?? null);
    setActiveMode(mode);
  }

  function closeModal() {
    setActiveMode(null);
    setSelectedProductor(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Gestión de Productores
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Administra productores y el estado operativo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModal("create")}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo Productor
        </button>
      </div>

      {notice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
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
            placeholder="Buscar por nombre..."
            className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <select
            value={regionFilter}
            onChange={(event) => setRegionFilter(event.target.value)}
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          >
            <option value="">Todas las regiones</option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value)}
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          >
            <option value="">Cualquier stock</option>
            <option value="WITH_STOCK">Con stock (&gt;0)</option>
            <option value="WITHOUT_STOCK">Sin stock (=0)</option>
            <option value="LOW_STOCK">Bajo stock (&lt;5)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          >
            <option value="">Cualquier estado</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="PAUSADO">Pausado</option>
          </select>

          <input
            value={idFilter}
            onChange={(event) => setIdFilter(event.target.value)}
            placeholder="Buscar por ID..."
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />

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
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Nombre</th>
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
                    colSpan={6}
                    className="p-10 text-center text-sm text-gray-500"
                  >
                    Cargando productores...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-sm text-gray-500"
                  >
                    No hay productores para mostrar.
                  </td>
                </tr>
              ) : (
                filtered.map((productor) => (
                  <tr
                    key={productor.id}
                    className="group transition-colors hover:bg-gray-50/60"
                  >
                    <td className="p-4 font-mono text-xs text-gray-400">
                      #PR-{String(productor.id).padStart(4, "0")}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      {productor.nombre}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {productor.region}
                    </td>
                    <td className="p-4 text-center text-sm font-semibold">
                      <span
                        className={
                          getStock(productor) < 20
                            ? "text-red-600"
                            : "text-slate-700"
                        }
                      >
                        {getStock(productor)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={productor.status} />
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <ActionButton
                          label="Ver"
                          onClick={() => openModal("view", productor)}
                        >
                          <Eye className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton
                          label="Editar"
                          onClick={() => openModal("edit", productor)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton
                          label="Eliminar"
                          danger
                          onClick={() => setDeleting(productor)}
                        >
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

      <ProductoresForm
        mode={activeMode ?? "create"}
        open={activeMode !== null}
        productor={selectedProductor}
        onClose={closeModal}
        onError={(message) => setNotice({ type: "error", message })}
        onSaved={(saved, message) => {
          setProductores((current) => {
            if (activeMode === "create") return [saved, ...current];
            return current.map((item) => (item.id === saved.id ? saved : item));
          });
          setNotice({ type: "success", message });
        }}
      />

      {deleting ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">
              ¿Eliminar productor?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Vas a eliminar a{" "}
              <span className="font-semibold text-gray-700">
                {deleting.nombre}
              </span>
              . Esta acción lo ocultará del panel.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deleteLoading ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: ProductorAdmin["status"] }) {
  const className =
    status === "ACTIVO"
      ? "bg-green-50 text-green-700 border-green-100"
      : status === "PAUSADO"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${className}`}
    >
      {status}
    </span>
  );
}

function ActionButton({
  children,
  label,
  danger = false,
  onClick,
}: {
  children: ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`rounded-lg p-2 transition-colors ${danger ? "text-slate-400 hover:bg-red-50 hover:text-red-600" : "text-slate-400 hover:bg-green-50 hover:text-green-700"}`}
    >
      {children}
    </button>
  );
}
