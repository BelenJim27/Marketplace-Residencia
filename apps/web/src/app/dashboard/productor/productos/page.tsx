"use client";

import { useEffect, useMemo, useState } from "react";
import { useProductos } from "@/hooks/useProductos";
import { ProductoModal } from "@/components/Producer/Products/acciones/ProductoModal";
import {
  ProductoHeader,
  ProductoStatCard,
  ProductoFiltros,
  ProductoSeleccion,
  ProductoTabla,
  ProductoPaginacion,
} from "@/components/Producer/Products/acciones/ProductoVistas";

const PAGE_SIZE = 10;

export default function ProductosPage() {
  const ctx = useProductos();
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [ctx.query, ctx.statusFilter, ctx.storeFilter, ctx.minPrice, ctx.maxPrice]);

  const totalPages = Math.max(1, Math.ceil(ctx.visibleProducts.length / PAGE_SIZE));

  const pagedProducts = useMemo(
    () => ctx.visibleProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [ctx.visibleProducts, currentPage],
  );

  const pagedIds = useMemo(() => pagedProducts.map((p) => p.id_producto), [pagedProducts]);

  const allPageSelected =
    pagedIds.length > 0 && pagedIds.every((id) => ctx.selectedIds.includes(id));

  const toggleSelectAllPage = (checked: boolean) => {
    pagedIds.forEach((id) => ctx.toggleProductSelection(id, checked));
  };

  if (ctx.loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C5CFB0] border-t-[#3D6B3F]" />
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
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
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
        products={pagedProducts}
        selectionEnabled={ctx.selectionEnabled}
        selectedIds={ctx.selectedIds}
        allVisibleSelected={allPageSelected}
        onToggleSelectAll={toggleSelectAllPage}
        onToggleSelect={ctx.toggleProductSelection}
        onView={ctx.openView}
        onEdit={ctx.openEdit}
        onDelete={ctx.handleDelete}
      />

      <ProductoPaginacion
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={ctx.visibleProducts.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
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
          lotes={ctx.lotes}
          saving={ctx.saving}
          onSubmit={ctx.handleSubmit}
          onClose={ctx.closeModal}
        />
      )}

    </div>
  );
}
