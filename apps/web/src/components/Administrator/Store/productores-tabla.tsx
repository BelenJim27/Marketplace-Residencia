"use client";

import { Edit2, Eye, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../lib/api";
import { getCookie } from "../../../lib/cookies";
import { ProductoresForm, type ProductorAdmin } from "./productores-form";

type Notice = { type: "success" | "error"; message: string };

export function ProductoresTabla() {
  const { user } = useAuth();
  const [productores, setProductores] = useState<ProductorAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [idFilter, setIdFilter] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activeMode, setActiveMode] = useState<"view" | null>(null);
  const [selectedProductor, setSelectedProductor] = useState<ProductorAdmin | null>(null);
  const [deleting, setDeleting] = useState<ProductorAdmin | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadProductores() {
    setLoading(true);
    try {
      const data = await api.productores.getAll();
      const transformed = (Array.isArray(data) ? data : []).map((p: any) => ({
        id: p.id_productor as number,
        nombre: p.usuarios?.nombre || "Sin nombre",
        apellido_paterno: p.usuarios?.apellido_paterno || "",
        apellido_materno: p.usuarios?.apellido_materno || "",
        region: p.regiones?.nombre || "Sin región",
        total_productos: p.lotes?.length || 0,
        status: (p.tiendas && p.tiendas.length > 0 && p.tiendas.some((t: any) => t.status === "activa") ? "ACTIVO" : "PAUSADO") as "ACTIVO" | "PAUSADO" | "INACTIVO",
        biografia: p.biografia || "",
        otras_caracteristicas: p.otras_caracteristicas || "",
        foto_url: p.foto_url || "",
        tienda: (p.tiendas?.[0]?.nombre as string) || null,
      }));
      setProductores(transformed);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "No fue posible cargar los productores." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProductores(); }, []);

  const regionOptions = useMemo(
    () => [...new Set(productores.map((p) => p.region).filter(Boolean))].sort(),
    [productores],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedId = idFilter.replace(/[^a-z0-9]/gi, "").toUpperCase();
    const filteredList = productores.filter((p) => {
      const producerId = `PR${String(p.id).padStart(4, "0")}`;
      const fullName = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}`.toLowerCase();
      return (
        (!normalizedQuery || fullName.includes(normalizedQuery)) &&
        (!regionFilter || p.region === regionFilter) &&
        (!statusFilter || p.status === statusFilter) &&
        (!normalizedId || producerId === normalizedId)
      );
    });
    const seen = new Set<number>();
    return filteredList.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
  }, [idFilter, productores, query, regionFilter, statusFilter]);

  const stats = [
    { label: "Total Productores", value: productores.length, color: "text-slate-800 dark:text-white" },
    { label: "Activos", value: productores.filter((p) => p.status === "ACTIVO").length, color: "text-green-600" },
    { label: "Inactivos", value: productores.filter((p) => p.status === "PAUSADO").length, color: "text-amber-500" },
  ];

  function clearFilters() { setQuery(""); setRegionFilter(""); setStatusFilter(""); setIdFilter(""); }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const token = getCookie("token");
      if (!token) throw new Error("No autorizado");
      await api.productores.delete(token, deleting.id);
      setProductores((c) => c.filter((p) => p.id !== deleting.id));
      setNotice({ type: "success", message: "Productor eliminado correctamente." });
      setDeleting(null);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "No fue posible eliminar el productor." });
    } finally {
      setDeleteLoading(false);
    }
  }

  function openModal(productor: ProductorAdmin) {
    setSelectedProductor(productor);
    setActiveMode("view");
  }
  function closeModal() { setActiveMode(null); setSelectedProductor(null); }

  const inputCls = "w-full rounded-xl border border-gray-100 dark:border-dark-3 bg-gray-50 dark:bg-dark-3 py-3 pl-12 pr-4 text-sm text-slate-700 dark:text-white placeholder-gray-400 dark:placeholder-dark-6 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20";
  const selectCls = "rounded-xl border border-gray-100 dark:border-dark-3 bg-gray-50 dark:bg-dark-3 px-4 py-3 text-sm text-slate-700 dark:text-white outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20";

  return (
    <div className="space-y-6">
      {/* Header — sin botón "Nuevo Productor" */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Gestión de Productores</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-6">Administra productores y el estado operativo.</p>
      </div>

      {/* Notice */}
      {notice && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {notice.message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-200 dark:border-dark-3 bg-white dark:bg-dark-2 p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-6">{item.label}</p>
            <h2 className={`mt-1 text-2xl font-black ${item.color}`}>{item.value}</h2>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 dark:border-dark-3 bg-white dark:bg-dark-2 p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-dark-6" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre..." className={inputCls} />
          </div>
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={selectCls}>
            <option value="">Todas las regiones</option>
            {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="">Cualquier estado</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="PAUSADO">Pausado</option>
          </select>
          <input value={idFilter} onChange={(e) => setIdFilter(e.target.value)} placeholder="Buscar por ID..."
            className="rounded-xl border border-gray-100 dark:border-dark-3 bg-gray-50 dark:bg-dark-3 px-4 py-3 text-sm text-slate-700 dark:text-white placeholder-gray-400 dark:placeholder-dark-6 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
          <button type="button" onClick={clearFilters}
            className="rounded-xl border border-gray-200 dark:border-dark-3 px-4 py-3 text-sm font-semibold text-gray-600 dark:text-dark-6 transition-colors hover:bg-gray-50 dark:hover:bg-dark-3"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-dark-3 bg-white dark:bg-dark-2 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gray-50 dark:bg-dark-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-dark-6">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Nombre</th>
                <th className="p-4">Región</th>
                <th className="p-4 text-center">Tienda</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-3">
              {loading ? (
                <tr><td colSpan={6} className="p-10 text-center text-sm text-gray-500 dark:text-dark-6">Cargando productores...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-sm text-gray-500 dark:text-dark-6">No hay productores para mostrar.</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="group transition-colors hover:bg-gray-50/60 dark:hover:bg-dark-3/60">
                    <td className="p-4 font-mono text-xs text-gray-400 dark:text-dark-6">#PR-{String(p.id).padStart(4, "0")}</td>
                    <td className="p-4 font-semibold text-slate-800 dark:text-white">{`${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}`.trim()}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-dark-6">{p.region}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-dark-6 text-center">{p.tienda ?? "—"}</td>
                    <td className="p-4 text-center"><StatusBadge status={p.status} /></td>
                    <td className="p-4">
                      {/* Sin botón Editar */}
                      <div className="flex justify-center gap-2 transition-opacity">
                        <Link
                          href={`/dashboard/admin/productores/${p.id}/productos`}
                          className="inline-flex items-center rounded-lg border border-gray-200 dark:border-dark-3 px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-dark-6 transition-colors hover:bg-gray-50 dark:hover:bg-dark-3 hover:text-slate-900 dark:hover:text-white"
                        >
                          Ver productos
                        </Link>
                        <ActionButton label="Ver" onClick={() => openModal(p)}><Eye className="h-4 w-4" /></ActionButton>
                        <ActionButton label="Eliminar" danger onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4" /></ActionButton>
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
        mode={activeMode ?? "view"}
        open={activeMode !== null}
        productor={selectedProductor}
        onClose={closeModal}
        onError={(message) => setNotice({ type: "error", message })}
        onSaved={(saved, message) => {
          setProductores((c) => c.map((p) => (p.id === saved.id ? saved : p)));
          setNotice({ type: "success", message });
        }}
      />

      {/* Delete modal */}
      {deleting && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-dark-2 p-6 sm:p-8 text-center shadow-2xl">
            <div className="mx-auto mb-3 sm:mb-4 flex h-14 sm:h-16 w-14 sm:w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Trash2 className="h-7 sm:h-8 w-7 sm:w-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">¿Eliminar productor?</h3>
            <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-dark-6">
              Vas a eliminar a <span className="font-semibold text-gray-700 dark:text-white">{`${deleting.nombre} ${deleting.apellido_paterno}`.trim()}</span>. Esta acción lo ocultará del panel.
            </p>
            <div className="mt-5 sm:mt-6 flex flex-col-reverse gap-2 sm:gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="flex-1 rounded-lg sm:rounded-xl border border-gray-200 dark:border-dark-3 px-3 py-2 sm:px-4 sm:py-3 text-sm font-semibold text-gray-600 dark:text-dark-6 transition-colors hover:bg-gray-50 dark:hover:bg-dark-3"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDelete}
                className="flex-1 rounded-lg sm:rounded-xl bg-red-600 px-3 py-2 sm:px-4 sm:py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deleteLoading ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ProductorAdmin["status"] }) {
  const cls =
    status === "ACTIVO"
      ? "bg-green-50 text-green-700 border-green-100"
      : status === "PAUSADO"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-gray-100 dark:bg-dark-3 text-gray-600 dark:text-dark-6 border-gray-200 dark:border-dark-4";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${cls}`}>{status}</span>
  );
}

function ActionButton({ children, label, danger = false, onClick }: { children: ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`rounded-lg p-2 transition-colors ${danger ? "text-slate-500 hover:bg-red-50 hover:text-red-600" : "text-slate-500 hover:bg-green-50 hover:text-green-700"}`}
    >
      {children}
    </button>
  );
}