"use client";

import { Eye, Search, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [asociacionFilter, setAsociacionFilter] = useState("");
  const [marcaFilter, setMarcaFilter] = useState("");
  const [asociaciones, setAsociaciones] = useState<string[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activeMode, setActiveMode] = useState<"view" | null>(null);
  const [selectedProductor, setSelectedProductor] = useState<ProductorAdmin | null>(null);
  const [deleting, setDeleting] = useState<ProductorAdmin | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  async function loadProductores() {
    setLoading(true);
    try {
      const token = getCookie("token") ?? "";
      const data = await api.admin.getProductores(token);
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
        asociacion: p.asociacion || null,
        marca: p.marca || p.tiendas?.[0]?.nombre || null,
      }));
      setProductores(transformed);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "No fue posible cargar los productores." });
    } finally {
      setLoading(false);
    }
  }

  async function loadAsociaciones() {
    try {
      const lista = await api.configuracion.getAsociaciones();
      setAsociaciones(lista);
    } catch {
      setAsociaciones([]);
    }
  }

  useEffect(() => {
    loadProductores();
    loadAsociaciones();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [query, regionFilter, statusFilter, idFilter, asociacionFilter, marcaFilter]);

  const regionOptions = useMemo(
    () => [...new Set(productores.map((p) => p.region).filter(Boolean))].sort(),
    [productores],
  );

  // Marcas disponibles filtradas por asociación seleccionada
  const marcaOptions = useMemo(() => {
    const base = asociacionFilter
      ? productores.filter((p) => p.asociacion === asociacionFilter)
      : productores;
    return [...new Set(base.map((p) => p.marca).filter(Boolean))].sort() as string[];
  }, [productores, asociacionFilter]);

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
        (!normalizedId || producerId === normalizedId) &&
        (!asociacionFilter || p.asociacion === asociacionFilter) &&
        (!marcaFilter || p.marca === marcaFilter)
      );
    });
    const seen = new Set<number>();
    return filteredList.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
  }, [idFilter, productores, query, regionFilter, statusFilter, asociacionFilter, marcaFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedFiltered = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = [
    { label: "Total Productores", value: productores.length, color: "text-[#1F3A2E]" },
    { label: "Activos", value: productores.filter((p) => p.status === "ACTIVO").length, color: "text-[#3D6B3F]" },
    { label: "Inactivos", value: productores.filter((p) => p.status === "PAUSADO").length, color: "text-[#C97A3E]" },
  ];

  function clearFilters() {
    setQuery("");
    setRegionFilter("");
    setStatusFilter("");
    setIdFilter("");
    setAsociacionFilter("");
    setMarcaFilter("");
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const token = getCookie("token");
      if (!token) throw new Error("No autorizado");
      await api.productores.delete(token, deleting.id as any);
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

  const inputCls = "w-full rounded-xl border border-[#C5CFB0] bg-white py-3 pl-12 pr-4 text-sm text-[#1F3A2E] placeholder-[#3D6B3F]/50 outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20";
  const selectCls = "rounded-xl border border-[#C5CFB0] bg-white px-4 py-3 text-sm text-[#1F3A2E] outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Gestión de Productores</h1>
        <p className="mt-0.5 text-sm text-[#3D6B3F]/70">Administra productores y el estado operativo.</p>
      </div>

      {notice && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {notice.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="bg-[#F4F0E3] rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)] p-5 flex flex-col gap-1">
            <p className="text-sm font-semibold text-[#3D6B3F]/70 uppercase tracking-wider">{item.label}</p>
            <h2 className={`mt-1 text-2xl font-bold [font-family:'DM_Sans',sans-serif] ${item.color}`}>{item.value}</h2>
          </div>
        ))}
      </div>

      {/* Filters — cascading: Asociación → Marca → Productor */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)] space-y-3">
        {/* Row 1: cascading hierarchy */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            value={asociacionFilter}
            onChange={(e) => { setAsociacionFilter(e.target.value); setMarcaFilter(""); }}
            className={selectCls}
          >
            <option value="">Todas las asociaciones</option>
            {asociaciones.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={marcaFilter}
            onChange={(e) => setMarcaFilter(e.target.value)}
            className={selectCls}
            disabled={marcaOptions.length === 0}
          >
            <option value="">Todas las marcas</option>
            {marcaOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="">Cualquier estado</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="PAUSADO">Pausado</option>
          </select>
        </div>

        {/* Row 2: text search + region + ID + clear */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3D6B3F]/50" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre..." className={inputCls} />
          </div>
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={selectCls}>
            <option value="">Todas las regiones</option>
            {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input value={idFilter} onChange={(e) => setIdFilter(e.target.value)} placeholder="Buscar por ID..."
            className="rounded-xl border border-[#C5CFB0] bg-white px-4 py-3 text-sm text-[#1F3A2E] placeholder-[#3D6B3F]/50 outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20"
          />
          <button type="button" onClick={clearFilters}
            className="rounded-xl border border-[#C5CFB0] px-4 py-3 text-sm font-semibold text-[#1F3A2E] transition-all duration-200 hover:bg-[#C5CFB0]/30"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-[#1F3A2E] text-xs font-semibold text-white uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Región</th>
                <th className="px-4 py-3 text-left">Asociación</th>
                <th className="px-4 py-3 text-center">Marca</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5CFB0]/30">
              {loading ? (
                <tr><td colSpan={7} className="p-10 text-center text-sm text-[#3D6B3F]/70 bg-white">Cargando productores...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-sm text-[#3D6B3F]/70 bg-white">No hay productores para mostrar.</td></tr>
              ) : (
                paginatedFiltered.map((p) => (
                  <tr key={p.id} className="odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20 transition-all duration-200 group">
                    <td className="px-4 py-3 font-mono text-xs text-[#3D6B3F]/70">#PR-{String(p.id).padStart(4, "0")}</td>
                    <td className="px-4 py-3 font-semibold text-[#1F3A2E]">{`${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}`.trim()}</td>
                    <td className="px-4 py-3 text-sm text-[#1F3A2E]">{p.region}</td>
                    <td className="px-4 py-3 text-sm text-[#1F3A2E]">
                      {p.asociacion ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#3D6B3F]/10 text-[#3D6B3F]">{p.asociacion}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1F3A2E] text-center">{p.marca ?? "—"}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2 transition-opacity">
                        <Link
                          href={`/Administrador/tienda/productores/${p.id}/productos`}
                          className="inline-flex items-center whitespace-nowrap rounded-lg border border-[#C5CFB0] px-2 py-1 text-xs font-medium text-[#1F3A2E] transition-all duration-200 hover:bg-[#A8C26B]/15 hover:text-[#1F3A2E]"
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-[#C5CFB0] px-4 py-3 bg-white rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <p className="text-sm text-[#1F3A2E]">
            Mostrando <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-semibold">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> de <span className="font-semibold">{filtered.length}</span> productores
          </p>
          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm">
            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[#1F3A2E] ring-1 ring-inset ring-[#C5CFB0]">
              Página {currentPage} de {totalPages}
            </span>
            <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        </div>
      )}

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

      {deleting && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#F4F0E3] p-6 sm:p-8 text-center shadow-[0_24px_48px_rgba(31,58,46,0.25)] border border-[#C5CFB0]">
            <div className="mx-auto mb-3 sm:mb-4 flex h-14 sm:h-16 w-14 sm:w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Trash2 className="h-7 sm:h-8 w-7 sm:w-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">¿Eliminar productor?</h3>
            <p className="mt-2 text-xs sm:text-sm text-[#3D6B3F]/70">
              Vas a eliminar a <span className="font-semibold text-[#1F3A2E]">{`${deleting.nombre} ${deleting.apellido_paterno}`.trim()}</span>. Esta acción lo ocultará del panel.
            </p>
            <div className="mt-5 sm:mt-6 flex flex-col-reverse gap-2 sm:gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="flex-1 rounded-lg sm:rounded-xl border border-[#C5CFB0] px-3 py-2 sm:px-4 sm:py-3 text-sm font-semibold text-[#1F3A2E] transition-all duration-200 hover:bg-[#C5CFB0]/30"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDelete}
                className="flex-1 rounded-lg sm:rounded-xl bg-red-600 px-3 py-2 sm:px-4 sm:py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
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
      ? "bg-[#A8C26B]/20 text-[#3D6B3F] border-[#A8C26B]/40"
      : status === "PAUSADO"
        ? "bg-[#C97A3E]/15 text-[#C97A3E] border-[#C97A3E]/30"
        : "bg-[#C5CFB0]/30 text-[#3D6B3F]/70 border-[#C5CFB0]";
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
      className={`rounded-lg p-2 transition-all duration-200 ${danger ? "text-[#3D6B3F]/50 hover:bg-red-50 hover:text-red-600" : "text-[#3D6B3F]/50 hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F]"}`}
    >
      {children}
    </button>
  );
}
