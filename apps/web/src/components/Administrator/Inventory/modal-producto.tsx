"use client";

import { X } from "lucide-react";
import { useState } from "react";

type Productor = {
  id: string;
  nombre: string;
};

type Tienda = {
  id: string;
  nombre: string;
};

type InventarioItem = {
  id_producto: string;
  nombre_producto: string;
  productor: string;
  region: string;
  stock: number;
  status: string;
  imagen: string | null;
};

interface ModalProductoProps {
  editingItem: InventarioItem | null;
  productores: Productor[];
  tiendas: Tienda[];
  selectedProductor: string;
  selectedTienda: string;
  setSelectedProductor: (value: string) => void;
  setSelectedTienda: (value: string) => void;
  loadingTiendas: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalProducto({
  editingItem,
  productores,
  tiendas,
  selectedProductor,
  selectedTienda,
  setSelectedProductor,
  setSelectedTienda,
  loadingTiendas,
  onClose,
  onSuccess,
}: ModalProductoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre_producto: editingItem?.nombre_producto || "",
    stock: editingItem?.stock || 0,
    status: editingItem?.status || "ACTIVO",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!selectedProductor || !selectedTienda) {
        throw new Error("Por favor selecciona productor y tienda");
      }

      const method = editingItem ? "PUT" : "POST";
      const endpoint = editingItem
        ? `/api/inventario/${editingItem.id_producto}`
        : "/api/inventario";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          id_productor: selectedProductor,
          id_tienda: selectedTienda,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { message?: string }).message || "Error al guardar el producto"
        );
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500";

  const selectClass =
    "mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-lg">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {editingItem ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Productor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Productor {productores.length === 0 && "(No disponibles)"}
            </label>
            {productores.length === 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-2 text-sm text-amber-700 dark:text-amber-400 mb-2">
                No hay productores disponibles en el sistema
              </div>
            )}
            <select
              value={selectedProductor}
              onChange={(e) => setSelectedProductor(e.target.value)}
              className={selectClass}
            >
              <option value="">
                {productores.length === 0 ? "No hay productores" : "Selecciona un productor"}
              </option>
              {productores.map((prod) => (
                <option key={`prod-${prod.id}`} value={prod.id}>
                  {prod.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Tienda */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tienda
            </label>
            <select
              value={selectedTienda}
              onChange={(e) => setSelectedTienda(e.target.value)}
              disabled={!selectedProductor || loadingTiendas}
              className={selectClass}
            >
              <option value="">
                {loadingTiendas ? "Cargando tiendas..." : "Selecciona una tienda"}
              </option>
              {tiendas.map((tienda) => (
                <option key={`tienda-${tienda.id}`} value={tienda.id}>
                  {tienda.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nombre del Producto
            </label>
            <input
              type="text"
              value={formData.nombre_producto}
              onChange={(e) => setFormData({ ...formData, nombre_producto: e.target.value })}
              className={inputClass}
              placeholder="Ingresa el nombre del producto"
            />
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Stock
            </label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
              className={inputClass}
              placeholder="Ingresa la cantidad"
              min="0"
            />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Estado
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className={selectClass}
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Guardando..." : editingItem ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}