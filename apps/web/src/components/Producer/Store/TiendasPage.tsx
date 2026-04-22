"use client";

import { useEffect, useMemo, useState } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import type { ReactNode } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
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
    <div className="mx-auto w-full max-w-[1200px]">
      
      <div className="mb-6 flex flex-col gap-4 rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Mis Tiendas</h1>
          <p className="text-sm text-gray-500">Administra tus puntos de venta y catálogo asociado.</p>
        </div>

        <button
          type="button"
          onClick={() => setActiveModal("create")}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-white transition hover:bg-opacity-90"
        >
          <Plus size={18} />
          Nueva Tienda
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
          placeholder="Buscar por nombre de tienda"
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2"
        />
      </div>

      {error ? <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-gray-2 dark:bg-dark-2">
              <tr className="text-sm text-gray-500">
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
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    Cargando tiendas...
                  </td>
                </tr>
              ) : (
                filteredStores.map((store) => (
                  <tr key={store.id_tienda} className="border-t border-stroke text-sm dark:border-dark-3">
                    <td className="px-5 py-4 font-medium text-dark dark:text-white">{store.nombre}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-3">{truncate(store.descripcion || "", 60)}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-3">{store.pais_operacion || "-"}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {store.stock}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={store.status} />
                    </td>
                    <td className="px-5 py-4 text-gray-500">{formatDate(store.fecha_creacion)}</td>
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
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    No hay tiendas para mostrar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark">
      <p className="text-sm text-gray-500">{title}</p>
      <div className="mt-2 text-2xl font-bold text-dark dark:text-white">{value}</div>
    </div>
  );
}

function Badge({ status }: { status: string | null }) {
  const normalized = normalizeStatus(status);
  const className = normalized === "activo" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${className}`}>{normalized}</span>;
}

function ActionButton({ label, icon, danger = false, onClick }: { label: string; icon: ReactNode; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${danger ? "text-gray-500 hover:bg-red-50 hover:text-red-600" : "text-gray-500 hover:bg-[rgba(124,58,237,0.08)] hover:text-primary"}`}
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
