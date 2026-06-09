"use client";

import { Eye, Pencil, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductoThumbnail } from "@/components/Producer/Products/ImagenProducto";
import type { ProductItem, StoreItem } from "@/hooks/useProductos";

// ─── Stat Card ────────────────────────────────────────────────────────────────

export function ProductoStatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-5 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
      <p className="text-sm text-[#3D6B3F]/70">{title}</p>
      <div className="mt-2 text-2xl font-bold text-[#1F3A2E]">{value}</div>
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
    <div className="mb-6 rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Gestión de productos</h1>
          <p className="text-sm text-[#3D6B3F]/70">Solo se muestran productos de tus tiendas</p>
        </div>
        <button
          onClick={onNew}
          disabled={disableNew}
          title={disableNew ? "Debes crear una tienda antes de registrar productos" : undefined}
          className="inline-flex items-center gap-2 rounded-xl bg-[#3D6B3F] px-5 py-3 font-medium text-white transition hover:bg-[#1F3A2E] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={18} /> Nuevo producto
        </button>
      </div>
      {disableNew && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          ⚠️ Necesitas <a href="/dashboard/productor/tienda" className="font-semibold underline">crear una tienda</a> antes de poder registrar productos.
        </p>
      )}
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
  const input = "w-full rounded-lg border border-[#C5CFB0] bg-transparent px-3 py-2 text-sm text-[#1F3A2E] outline-none focus:border-[#3D6B3F] focus:ring-1 focus:ring-[#3D6B3F]/20 placeholder:text-[#3D6B3F]/40";
  const lbl = "mb-1 block text-xs font-medium text-[#1F3A2E]/70";

  return (
    <div className="mb-5 rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-3 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
      {/* Search row */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre o tienda"
        className={`${input} mb-3`}
      />

      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-2 lg:flex-nowrap">
        <label className="block min-w-0 flex-1">
          <span className={lbl}>Estatus</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={input}>
            <option value="todos">Todos</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="borrador">Borrador</option>
          </select>
        </label>

        <label className="block min-w-0 flex-[1.5]">
          <span className={lbl}>Tienda</span>
          <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className={input}>
            <option value="todos">Todas</option>
            {stores.map((s) => (
              <option key={s.id_tienda} value={String(s.id_tienda)}>{s.nombre}</option>
            ))}
          </select>
        </label>

        <label className="block min-w-0 flex-1">
          <span className={lbl}>Precio mín</span>
          <input type="text" inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" className={input} />
        </label>

        <label className="block min-w-0 flex-1">
          <span className={lbl}>Precio máx</span>
          <input type="text" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="∞" className={input} />
        </label>

        <button type="button" onClick={onClear}
          className="shrink-0 rounded-lg border border-[#C5CFB0] px-3 py-2 text-xs font-medium text-[#1F3A2E] transition hover:bg-[#C5CFB0]/20">
          Limpiar
        </button>
      </div>
    </div>
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
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)] md:flex-row md:items-center md:justify-between">
      <label className="inline-flex items-center gap-3 text-sm font-medium text-[#1F3A2E]">
        <input
          type="checkbox"
          checked={selectionEnabled}
          onChange={(e) => onToggleMode(e.target.checked)}
          className="h-4 w-4 rounded border-[#C5CFB0] text-[#3D6B3F] focus:ring-[#3D6B3F]"
        />
        <span>Seleccionar productos</span>
      </label>
      {selectedIds.length > 0 && (
        <button
          type="button"
          onClick={onDeleteSelected}
          className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
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
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-300">
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
          className="ml-auto shrink-0 rounded-lg border border-amber-300 px-3 py-1 text-xs font-medium transition hover:bg-amber-100 dark:border-amber-600 dark:hover:bg-amber-900/40"
        >
          Ver productos
        </button>
      )}
    </div>
  );
}

// ─── Paginación ───────────────────────────────────────────────────────────────

export function ProductoPaginacion({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border border-[#C5CFB0] px-4 py-3 mt-4 bg-white rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
      <p className="text-sm text-[#1F3A2E]">
        {totalItems === 0 ? "Sin resultados" : <>Mostrando <span className="font-semibold">{from}</span>–<span className="font-semibold">{to}</span> de <span className="font-semibold">{totalItems}</span> producto{totalItems !== 1 ? "s" : ""}</>}
      </p>
      <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[#1F3A2E] ring-1 ring-inset ring-[#C5CFB0]">
          Página {currentPage} de {totalPages}
        </span>
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}
          className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
          <ChevronRight className="h-5 w-5" />
        </button>
      </nav>
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
    <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left">
          <thead className="bg-[#1F3A2E]">
            <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
              {selectionEnabled && (
                <th className="w-12 px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(e) => onToggleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-white/30 text-[#A8C26B] focus:ring-[#A8C26B]"
                  />
                </th>
              )}
              <th className="w-[32%] px-5 py-4">Nombre</th>
              <th className="w-[13%] px-5 py-4">Precio base</th>
              <th className="w-[8%] px-5 py-4">Moneda</th>
              <th className="w-[12%] px-5 py-4">Status</th>
              <th className="w-[10%] px-5 py-4">Stock</th>
              <th className="w-[25%] px-5 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const sinPrecio = Number(product.precio_base) === 0;

              return (
                <tr
                  key={product.id_producto}
                  className="border-t border-[#C5CFB0]/30 bg-white text-sm transition-colors odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20"
                >
                  {selectionEnabled && (
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id_producto)}
                        onChange={(e) => onToggleSelect(product.id_producto, e.target.checked)}
                        className="h-4 w-4 rounded border-[#C5CFB0] text-[#3D6B3F] focus:ring-[#3D6B3F]"
                      />
                    </td>
                  )}

                  {/* ── Nombre + badge precio pendiente ── */}
                  <td className="px-5 py-4 font-medium text-[#1F3A2E]">
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
                      <span className="text-[#1F3A2E]">{Number(product.precio_base || 0).toFixed(2)}</span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-[#3D6B3F]/70">{product.moneda_base || "MXN"}</td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#A8C26B]/20 px-3 py-1 text-xs font-medium text-[#3D6B3F]">
                      {product.status || "activo"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {(() => {
                      const stock = product.stock ?? 0;
                      const minimo = product.stock_minimo ?? 0;
                      if (stock === 0) return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                          ⚠ Sin stock
                        </span>
                      );
                      if (minimo > 0 && stock <= minimo) return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                          ⚠ {stock}
                        </span>
                      );
                      return (
                        <span className="rounded-full bg-[#C5CFB0]/30 px-2 py-1 text-xs font-medium text-[#1F3A2E]">
                          {stock}
                        </span>
                      );
                    })()}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onView(product)}
                        className="rounded-lg p-2 text-[#3D6B3F]/50 hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F] transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => onEdit(product)}
                        className={`rounded-lg p-2 transition-colors ${
                          sinPrecio
                            ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                            : "text-[#3D6B3F]/50 hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F]"
                        }`}
                        title={sinPrecio ? "Editar — precio pendiente" : "Editar"}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(product)}
                        className="rounded-lg p-2 text-[#3D6B3F]/50 hover:bg-red-50 hover:text-red-600 transition-colors"
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
                  className="px-5 py-10 text-center text-[#3D6B3F]/60"
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
