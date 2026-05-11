"use client";

import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { ProductoThumbnail } from "@/components/Producer/Products/ImagenProducto";
import type { ProductItem, StoreItem } from "@/hooks/useProductos";

// ─── Stat Card ────────────────────────────────────────────────────────────────

export function ProductoStatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark">
      <p className="text-sm text-gray-500">{title}</p>
      <div className="mt-2 text-2xl font-bold text-dark dark:text-white">{value}</div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function ProductoHeader({
  onNew,
  disableNew,
}: {
  onNew: () => void;
  disableNew: boolean;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">Gestión de productos</h1>
        <p className="text-sm text-gray-500">Solo se muestran productos de tus tiendas</p>
      </div>
      <button
        onClick={onNew}
        disabled={disableNew}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus size={18} /> Nuevo producto
      </button>
    </div>
  );
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

type FiltrosProps = {
  query: string;
  setQuery: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  storeFilter: string;
  setStoreFilter: (v: string) => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  stores: StoreItem[];
  onClear: () => void;
};

export function ProductoFiltros({
  query, setQuery,
  statusFilter, setStatusFilter,
  storeFilter, setStoreFilter,
  minPrice, setMinPrice,
  maxPrice, setMaxPrice,
  stores,
  onClear,
}: FiltrosProps) {
  const input = "w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2";
  const lbl = "mb-2 block text-sm font-medium text-dark dark:text-white";

  return (
    <>
      <div className="mb-4 flex items-center gap-3 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o tienda"
          className={input}
        />
      </div>

      <div className="mb-6 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:grid-cols-5">

          <label className="block">
            <span className={lbl}>Estatus</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={input}>
              <option value="todos">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="borrador">Borrador</option>
            </select>
          </label>

          <label className="block">
            <span className={lbl}>Tienda</span>
            <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className={input}>
              <option value="todos">Todas</option>
              {stores.map((s) => (
                <option key={s.id_tienda} value={String(s.id_tienda)}>{s.nombre}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={lbl}>Precio mín</span>
            <input type="text" inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Precio mín" className={input} />
          </label>

          <label className="block">
            <span className={lbl}>Precio máx</span>
            <input type="text" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Precio máx" className={input} />
          </label>

          <div className="flex items-end">
            <button type="button" onClick={onClear} className="w-full rounded-lg border border-stroke px-4 py-3 text-sm font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-white/5">
              Limpiar filtros
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Selección masiva ─────────────────────────────────────────────────────────

export function ProductoSeleccion({
  selectionEnabled,
  selectedIds,
  onToggleMode,
  onDeleteSelected,
}: {
  selectionEnabled: boolean;
  selectedIds: number[];
  onToggleMode: (v: boolean) => void;
  onDeleteSelected: () => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark md:flex-row md:items-center md:justify-between">
      <label className="inline-flex items-center gap-3 text-sm font-medium text-dark dark:text-white">
        <input
          type="checkbox"
          checked={selectionEnabled}
          onChange={(e) => onToggleMode(e.target.checked)}
          className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
        />
        <span>Seleccionar productos</span>
      </label>
      {selectedIds.length > 0 && (
        <button
          type="button"
          onClick={onDeleteSelected}
          className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          Eliminar seleccionados ({selectedIds.length})
        </button>
      )}
    </div>
  );
}

// ─── Banner precio pendiente ──────────────────────────────────────────────────

export function ProductoPrecioPendienteBanner({
  products,
  onEditarPrecio,
}: {
  products: ProductItem[];
  onEditarPrecio?: () => void;
}) {
  const sinPrecio = products.filter((p) => Number(p.precio_base) === 0).length;

  if (sinPrecio === 0) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-300">
      <span className="shrink-0 text-base">⚠</span>
      <span>
        <strong>
          {sinPrecio} producto{sinPrecio > 1 ? "s" : ""}
        </strong>{" "}
        sin precio configurado — {sinPrecio > 1 ? "fueron creados" : "fue creado"} desde
        la API de trazabilidad y {sinPrecio > 1 ? "requieren" : "requiere"} precio para
        poder venderse.
      </span>
      {onEditarPrecio && (
        <button
          type="button"
          onClick={onEditarPrecio}
          className="ml-auto shrink-0 rounded-md border border-amber-300 px-3 py-1 text-xs font-medium transition hover:bg-amber-100 dark:border-amber-600 dark:hover:bg-amber-900/40"
        >
          Ver productos
        </button>
      )}
    </div>
  );
}

// ─── Tabla ────────────────────────────────────────────────────────────────────

type TablaProps = {
  products: ProductItem[];
  selectionEnabled: boolean;
  selectedIds: number[];
  allVisibleSelected: boolean;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelect: (id: number, checked: boolean) => void;
  onView: (p: ProductItem) => void;
  onEdit: (p: ProductItem) => void;
  onDelete: (p: ProductItem) => void;
};

export function ProductoTabla({
  products,
  selectionEnabled,
  selectedIds,
  allVisibleSelected,
  onToggleSelectAll,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
}: TablaProps) {
  return (
    <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left">
          <thead className="bg-gray-2 dark:bg-dark-2">
            <tr className="text-sm text-gray-500">
              {selectionEnabled && (
                <th className="w-12 px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(e) => onToggleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
                  />
                </th>
              )}
              <th className="w-[40%] px-5 py-4">Nombre</th>
              <th className="w-[15%] px-5 py-4">Precio base</th>
              <th className="w-[10%] px-5 py-4">Moneda</th>
              <th className="w-[15%] px-5 py-4">Status</th>
              <th className="w-[20%] px-5 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const sinPrecio = Number(product.precio_base) === 0;

              return (
                <tr
                  key={product.id_producto}
                  className="border-t border-stroke text-sm dark:border-dark-3"
                >
                  {selectionEnabled && (
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id_producto)}
                        onChange={(e) => onToggleSelect(product.id_producto, e.target.checked)}
                        className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
                      />
                    </td>
                  )}

                  {/* ── Nombre + badge precio pendiente ── */}
                  <td className="px-5 py-4 font-medium text-dark dark:text-white">
                    <div className="flex items-center gap-3">
                      <ProductoThumbnail src={product.imagen_url} alt={product.nombre} />
                      <div className="flex flex-col gap-1">
                        <span>{product.nombre}</span>
                        {sinPrecio && (
                          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-600/50 dark:bg-amber-900/20 dark:text-amber-300">
                            ⚠ Precio pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* ── Precio — resaltado en ámbar si es 0 ── */}
                  <td className="px-5 py-4">
                    {sinPrecio ? (
                      <span className="font-semibold text-amber-500 dark:text-amber-400">
                        $0.00 ⚠
                      </span>
                    ) : (
                      <span>{Number(product.precio_base || 0).toFixed(2)}</span>
                    )}
                  </td>

                  <td className="px-5 py-4">{product.moneda_base || "MXN"}</td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      {product.status || "activo"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      {product.stock ?? 0}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onView(product)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-green-50 hover:text-green-600"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => onEdit(product)}
                        className={`rounded-lg p-2 transition ${
                          sinPrecio
                            ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                            : "text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                        }`}
                        title={sinPrecio ? "Editar — precio pendiente" : "Editar"}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(product)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {products.length === 0 && (
              <tr>
                <td
                  colSpan={selectionEnabled ? 7 : 6}
                  className="px-5 py-10 text-center text-gray-500"
                >
                  No hay productos para mostrar
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}