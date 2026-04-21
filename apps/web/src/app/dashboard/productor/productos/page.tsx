"use client";

import { useProductos } from "@/components/Producer/Products/acciones/useProductos";
import { ProductoModal } from "@/components/Producer/Products/acciones/ProductoModal";
import {
  ProductoHeader,
  ProductoStatCard,
  ProductoFiltros,
  ProductoSeleccion,
  ProductoTabla,
} from "@/components/Producer/Products/acciones/ProductoVistas";

export default function ProductosPage() {
  const ctx = useProductos();

  if (ctx.loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">

      <ProductoHeader
        onNew={ctx.openCreate}
        disableNew={ctx.stores.length === 0}
      />

      {ctx.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {ctx.error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ProductoStatCard title="Productos" value={ctx.products.length} />
        <ProductoStatCard title="Productos Activos" value={ctx.activeProductsCount} />
        <ProductoStatCard title="Productos Inactivos" value={ctx.inactiveProductsCount} />
        <ProductoStatCard title="Productor" value={ctx.producer?.id_productor ?? "-"} />
      </div>

      <ProductoFiltros
        query={ctx.query}
        setQuery={ctx.setQuery}
        statusFilter={ctx.statusFilter}
        setStatusFilter={ctx.setStatusFilter}
        storeFilter={ctx.storeFilter}
        setStoreFilter={ctx.setStoreFilter}
        minPrice={ctx.minPrice}
        setMinPrice={ctx.setMinPrice}
        maxPrice={ctx.maxPrice}
        setMaxPrice={ctx.setMaxPrice}
        stores={ctx.stores}
        onClear={ctx.clearFilters}
      />

      <ProductoSeleccion
        selectionEnabled={ctx.selectionEnabled}
        selectedIds={ctx.selectedIds}
        onToggleMode={ctx.toggleSelectionMode}
        onDeleteSelected={ctx.handleDeleteSelected}
      />

      <ProductoTabla
        products={ctx.visibleProducts}
        selectionEnabled={ctx.selectionEnabled}
        selectedIds={ctx.selectedIds}
        allVisibleSelected={ctx.allVisibleSelected}
        onToggleSelectAll={ctx.toggleSelectAllVisible}
        onToggleSelect={ctx.toggleProductSelection}
        onView={ctx.openView}
        onEdit={ctx.openEdit}
        onDelete={ctx.handleDelete}
      />

      {ctx.modalOpen && (
        <ProductoModal
          mode={ctx.mode}
          form={ctx.form}
          setForm={ctx.setForm}
          imagen={ctx.imagen}
          setImagen={ctx.setImagen}
          selected={ctx.selected}
          stores={ctx.stores}
          categorias={ctx.categorias}
          saving={ctx.saving}
          onSubmit={ctx.handleSubmit}
          onClose={ctx.closeModal}
        />
      )}

    </div>
  );
}