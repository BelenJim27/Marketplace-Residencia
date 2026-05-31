"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import type { ReactNode } from "react";
import { Eye, Pencil, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { ModalAgregar, ModalEditar, ModalEliminar, ModalVer } from "./acciones";

type Tienda = {
  id_tienda: number;
  id_productor: number;
  nombre: string;
  descripcion: string | null;
  pais_operacion: string | null;
  stock: number;
  status: string | null;
  fecha_creacion: string;
  actualizado_en: string | null;
  eliminado_en: string | null;
};

export function TiendasPage() {
  const { user, loading: authLoading } = useAuth();
  const token = getCookie("token") ?? "";
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<Tienda[]>([]);
  const [activeModal, setActiveModal] = useState<"create" | "view" | "edit" | "delete" | null>(null);
  const [selectedStore, setSelectedStore] = useState<Tienda | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadStores = async () => {
    if (authLoading) return;

    if (!user?.id_productor) {
      setError("No se pudo identificar el productor autenticado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.tiendas.getByProductor(user.id_productor, token);
      setStores(
        Array.isArray(data)
          ? data.map((store) => ({
              ...(store as Omit<Tienda, 'stock'> & { stock?: number }),
              stock: Number((store as { stock?: number }).stock ?? 0),
            }))
          : [],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar las tiendas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadStores();
  }, [authLoading, user?.id_productor, token]);

  useEffect(() => { setCurrentPage(1); }, [query]);

  const filteredStores = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return stores;

    return stores.filter((store) => {
      return (
        store.nombre.toLowerCase().includes(normalized) ||
        String(store.descripcion || "").toLowerCase().includes(normalized) ||
        String(store.pais_operacion || "").toLowerCase().includes(normalized) ||
        String(store.status || "").toLowerCase().includes(normalized)
      );
    });
  }, [query, stores]);

  const totalPages = Math.ceil(filteredStores.length / itemsPerPage);
  const paginatedStores = filteredStores.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = [
    { label: "Total Tiendas", value: stores.length },
    { label: "Tiendas Activas", value: stores.filter((store) => normalizeStatus(store.status) === "activo").length },
    { label: "País", value: stores[0]?.pais_operacion || "MX" },
  ];

  const openStore = (modal: "view" | "edit" | "delete", store: Tienda) => {
    setSelectedStore(store);
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedStore(null);
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Mis Tiendas</h1>
          <p className="text-sm text-[#3D6B3F]/70">Administra tus puntos de venta y catálogo asociado.</p>
        </div>

        <button
          type="button"
          onClick={() => setActiveModal("create")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3D6B3F] px-5 py-3 font-medium text-white transition hover:bg-[#1F3A2E]"
        >
          <Plus size={18} />
          Nueva Tienda
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label} title={item.label} value={item.value} />
        ))}
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre de tienda"
          className="w-full rounded-xl border border-[#C5CFB0] bg-transparent px-4 py-3 text-[#1F3A2E] outline-none focus:border-[#3D6B3F] focus:ring-1 focus:ring-[#3D6B3F]/20 placeholder:text-[#3D6B3F]/40"
        />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[#1F3A2E]">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4">Descripción</th>
                <th className="px-5 py-4">País</th>
                <th className="px-5 py-4">Stock</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Fecha creación</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[#3D6B3F]/60">
                    Cargando tiendas...
                  </td>
                </tr>
              ) : (
                paginatedStores.map((store) => (
                  <tr key={store.id_tienda}
                    className="border-t border-[#C5CFB0]/30 bg-white text-sm transition-colors odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20">
                    <td className="px-5 py-4 font-medium text-[#1F3A2E]">{store.nombre}</td>
                    <td className="px-5 py-4 text-[#3D6B3F]/70">{truncate(store.descripcion || "", 60)}</td>
                    <td className="px-5 py-4 text-[#3D6B3F]/70">{store.pais_operacion || "-"}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#C5CFB0]/30 px-2 py-1 text-xs font-medium text-[#1F3A2E]">
                        {store.stock}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={store.status} />
                    </td>
                    <td className="px-5 py-4 text-[#3D6B3F]/60">{formatDate(store.fecha_creacion)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <ActionButton label="Ver" icon={<Eye size={16} />} onClick={() => openStore("view", store)} />
                        <ActionButton label="Editar" icon={<Pencil size={16} />} onClick={() => openStore("edit", store)} />
                        <ActionButton label="Eliminar" icon={<Trash2 size={16} />} onClick={() => openStore("delete", store)} danger />
                      </div>
                    </td>
                  </tr>
                ))
              )}

              {!loading && filteredStores.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[#3D6B3F]/60">
                    No hay tiendas para mostrar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-[#C5CFB0] px-4 py-3 bg-white rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <p className="text-sm text-[#1F3A2E]">
            Mostrando <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredStores.length)}</span> de <span className="font-semibold">{filteredStores.length}</span> tiendas
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

      <ModalAgregar
        isOpen={activeModal === "create"}
        onClose={closeModal}
        onSuccess={(created: Tienda) => setStores((current) => [{ ...created, stock: Number(created.stock ?? 0) }, ...current])}
      />
      <ModalVer isOpen={activeModal === "view"} onClose={closeModal} tienda={selectedStore} />
      <ModalEditar
        isOpen={activeModal === "edit"}
        onClose={closeModal}
        tienda={selectedStore}
        onSuccess={(updated: Tienda) =>
          setStores((current) => current.map((item) => (item.id_tienda === updated.id_tienda ? { ...updated, stock: Number(updated.stock ?? 0) } : item)))
        }
      />
      <ModalEliminar
        isOpen={activeModal === "delete"}
        onClose={closeModal}
        tienda={selectedStore}
        onSuccess={(deleted: Tienda) => setStores((current) => current.filter((item) => item.id_tienda !== deleted.id_tienda))}
      />
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-5 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
      <p className="text-sm text-[#3D6B3F]/70">{title}</p>
      <div className="mt-2 text-2xl font-bold text-[#1F3A2E]">{value}</div>
    </div>
  );
}

function Badge({ status }: { status: string | null }) {
  const normalized = normalizeStatus(status);
  const cls = normalized === "activo"
    ? "bg-[#A8C26B]/20 text-[#3D6B3F]"
    : "bg-[#C5CFB0]/30 text-[#1F3A2E]";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${cls}`}>{normalized}</span>;
}

function ActionButton({ label, icon, danger = false, onClick }: { label: string; icon: ReactNode; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${
        danger
          ? "text-[#3D6B3F]/50 hover:bg-red-50 hover:text-red-600"
          : "text-[#3D6B3F]/50 hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F]"
      }`}
    >
      {icon}
    </button>
  );
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength).trimEnd()}...`;
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "short" }).format(new Date(value));
}

function normalizeStatus(status: string | null | undefined) {
  const value = String(status || "activo").toLowerCase();
  return value === "activa" ? "activo" : value;
}
