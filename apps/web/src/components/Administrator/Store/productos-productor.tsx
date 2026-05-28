"use client";

import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

type ProductosProductorProps = {
  idProductor: number;
};

type ProductItem = {
  id_producto: number;
  id_tienda?: number | null;
  nombre: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  imagen_principal_url?: string | null;
  producto_imagenes?: { url?: string | null }[];
  precio_base?: string | number | null;
  moneda_base?: string | null;
  moneda?: string | null;
  status?: string | null;
  estado?: string | null;
  stock?: number | null;
  metadata?: {
    stock?: number | string;
    inventario?: {
      stock?: number | string;
    };
    [key: string]: unknown;
  } | null;
};

type ProductFormState = {
  nombre: string;
  descripcion: string;
  precio_base: string;
  moneda_base: string;
  status: string;
};

const EMPTY_FORM: ProductFormState = {
  nombre: "",
  descripcion: "",
  precio_base: "0",
  moneda_base: "MXN",
  status: "activo",
};

function normalizeProduct(product: ProductItem): ProductItem {
  const metadata =
    product.metadata && typeof product.metadata === "object" ? product.metadata : null;
  const metadataStock =
    typeof metadata?.stock === "number"
      ? metadata.stock
      : typeof metadata?.stock === "string"
        ? Number(metadata.stock)
        : typeof metadata?.inventario?.stock === "number"
          ? metadata.inventario.stock
          : typeof metadata?.inventario?.stock === "string"
            ? Number(metadata.inventario.stock)
            : 0;

  return {
    ...product,
    nombre: product.nombre || "Sin nombre",
    descripcion: product.descripcion ?? "",
    imagen_url:
      product.imagen_url ??
      product.imagen_principal_url ??
      product.producto_imagenes?.[0]?.url ??
      null,
    precio_base: product.precio_base ?? 0,
    moneda_base: product.moneda_base ?? product.moneda ?? "MXN",
    status: String(product.status ?? product.estado ?? "activo").toLowerCase(),
    stock: Number(product.stock ?? metadataStock ?? 0),
  };
}

export function ProductosProductor({ idProductor }: ProductosProductorProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProductItem | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create" | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [page, setPage] = useState(1);

  const token = getCookie("token") ?? "";

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.admin.getProductos(token, idProductor);
      const normalized = Array.isArray(data)
        ? data.map((item) => normalizeProduct(item as ProductItem))
        : [];
      setProducts(normalized);
      setPage(1);
    } catch (err) {
      console.error("Error loading productos:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los productos del productor.",
      );
    } finally {
      setLoading(false);
    }
  }, [idProductor, token]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const activeCount = useMemo(
    () => products.filter((p) => String(p.status).toLowerCase() === "activo").length,
    [products],
  );

  const totalStock = useMemo(
    () => products.reduce((acc, p) => acc + Number(p.stock ?? 0), 0),
    [products],
  );

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const paginated = useMemo(
    () => products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [products, page],
  );

  const openModal = (nextMode: "view" | "edit" | "create", product?: ProductItem) => {
    setSelected(product ?? null);
    setMode(nextMode);
    setForm(
      product
        ? {
            nombre: product.nombre,
            descripcion: product.descripcion ?? "",
            precio_base: String(product.precio_base ?? "0"),
            moneda_base: product.moneda_base ?? product.moneda ?? "MXN",
            status: String(product.status ?? "activo").toLowerCase(),
          }
        : EMPTY_FORM,
    );
  };

  const closeModal = () => {
    setSelected(null);
    setMode(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (product: ProductItem) => {
    if (!token) { setError("No autorizado para eliminar productos."); return; }
    if (!confirm(`¿Eliminar ${product.nombre}?`)) return;
    try {
      await api.productos.delete(token, String(product.id_producto));
      setSuccess("Producto eliminado correctamente.");
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar el producto.");
    }
  };

  const handleSave = async () => {
    if (!selected || !token) { setError("No autorizado para editar productos."); return; }
    if (!selected.id_tienda) { setError("No se pudo identificar la tienda del producto."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = new FormData();
      payload.append("id_tienda", String(selected.id_tienda));
      payload.append("nombre", form.nombre);
      payload.append("descripcion", form.descripcion);
      payload.append("precio_base", form.precio_base);
      payload.append("moneda_base", form.moneda_base);
      payload.append("status", form.status);
      if (user?.id_usuario) payload.append("actualizado_por", user.id_usuario);
      await api.productos.update(token, String(selected.id_producto), payload);
      setSuccess("Producto actualizado correctamente.");
      closeModal();
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!token) { setError("No autorizado para crear productos."); return; }
    if (!form.nombre.trim()) { setError("El nombre del producto es obligatorio."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = new FormData();
      payload.append("id_productor", String(idProductor));
      payload.append("nombre", form.nombre);
      payload.append("descripcion", form.descripcion);
      payload.append("precio_base", form.precio_base);
      payload.append("moneda_base", form.moneda_base);
      payload.append("status", form.status);
      if (user?.id_usuario) payload.append("creado_por", user.id_usuario);
      await api.productos.create(token, payload);
      setSuccess("Producto creado correctamente.");
      closeModal();
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el producto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Botón Nuevo Producto ── */}
      <div className="flex justify-end mb-6">
        <button
          type="button"
          onClick={() => openModal("create")}
          className="flex items-center gap-2 rounded-xl bg-[#3D6B3F] px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#1F3A2E]"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      {/* ── Tarjetas de resumen ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Total productos" value={products.length} />
        <SummaryCard label="Activos" value={activeCount} accent="text-[#3D6B3F]" />
        <SummaryCard label="Stock total" value={totalStock} accent="text-[#3D6B3F]" />
      </div>

      {/* ── Notificaciones ── */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-[#A8C26B]/40 bg-[#A8C26B]/10 px-4 py-3 text-sm text-[#3D6B3F]">
          {success}
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="bg-[#1F3A2E] text-[11px] font-bold uppercase tracking-wider text-white">
              <tr>
                <th className="px-5 py-4">Imagen</th>
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4">Precio base</th>
                <th className="px-5 py-4">Moneda</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Stock</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[#3D6B3F]/70 bg-white">
                    Cargando productos...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[#3D6B3F]/70 bg-white">
                    Este productor no tiene productos registrados.
                  </td>
                </tr>
              ) : (
                paginated.map((product) => (
                  <tr
                    key={product.id_producto}
                    className="odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20 transition-all duration-200 text-sm"
                  >
                    <td className="px-5 py-4">
                      <ProductThumbnail src={product.imagen_url ?? null} alt={product.nombre} />
                    </td>
                    <td className="px-5 py-4 font-medium text-[#1F3A2E]">
                      {product.nombre}
                    </td>
                    <td className="px-5 py-4 text-[#1F3A2E]">
                      {Number(product.precio_base ?? 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-[#1F3A2E]">
                      {product.moneda_base || "MXN"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={String(product.status ?? "activo")} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#3D6B3F]/10 px-2 py-1 text-xs font-medium text-[#3D6B3F]">
                        {product.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          title="Ver"
                          onClick={() => openModal("view", product)}
                          className="rounded-lg p-2 text-[#3D6B3F]/50 hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F] transition-all duration-200"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => openModal("edit", product)}
                          className="rounded-lg p-2 text-[#3D6B3F]/50 hover:bg-[#C97A3E]/10 hover:text-[#C97A3E] transition-all duration-200"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => void handleDelete(product)}
                          className="rounded-lg p-2 text-[#3D6B3F]/50 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Paginación ── */}
      {products.length > PAGE_SIZE && (
        <div className="flex items-center justify-between rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] px-5 py-3">
          <p className="text-sm text-[#3D6B3F]/70">
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, products.length)} de {products.length} productos
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg p-2 text-[#1F3A2E] transition-all duration-200 hover:bg-[#C5CFB0]/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`h-8 w-8 rounded-lg text-sm font-medium transition-all duration-200 ${
                  n === page
                    ? "bg-[#1F3A2E] text-white"
                    : "text-[#1F3A2E] hover:bg-[#C5CFB0]/40"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg p-2 text-[#1F3A2E] transition-all duration-200 hover:bg-[#C5CFB0]/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Ver / Editar / Crear ── */}
      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-[#F4F0E3] shadow-[0_24px_48px_rgba(31,58,46,0.25)] border border-[#C5CFB0] overflow-hidden">
            <div className="flex items-center justify-between bg-[#1F3A2E] px-6 py-5">
              <h2 className="text-xl font-bold text-white [font-family:'Playfair_Display',serif]">
                {mode === "create"
                  ? "Nuevo Producto"
                  : mode === "edit"
                    ? "Editar producto"
                    : "Detalle de producto"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nombre"
                  value={form.nombre}
                  onChange={(value) => setForm((c) => ({ ...c, nombre: value }))}
                  disabled={mode === "view"}
                />
                <Field
                  label="Precio base"
                  value={form.precio_base}
                  onChange={(value) => setForm((c) => ({ ...c, precio_base: value }))}
                  disabled={mode === "view"}
                  type="number"
                />
              </div>

              <Field
                label="Descripción"
                value={form.descripcion}
                onChange={(value) => setForm((c) => ({ ...c, descripcion: value }))}
                disabled={mode === "view"}
                textarea
              />

              <div className="grid gap-4 md:grid-cols-3">
                <SelectField
                  label="Moneda"
                  value={form.moneda_base}
                  onChange={(value) => setForm((c) => ({ ...c, moneda_base: value }))}
                  disabled={mode === "view"}
                  options={[
                    { label: "MXN", value: "MXN" },
                    { label: "USD", value: "USD" },
                  ]}
                />
                {mode !== "create" && (
                  <Field
                    label="Stock"
                    value={String(selected?.stock ?? 0)}
                    disabled
                  />
                )}
                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(value) => setForm((c) => ({ ...c, status: value }))}
                  disabled={mode === "view"}
                  options={[
                    { label: "activo", value: "activo" },
                    { label: "inactivo", value: "inactivo" },
                  ]}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-[#C5CFB0] pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-[#C5CFB0] px-5 py-3 text-sm font-medium text-[#1F3A2E] hover:bg-[#C5CFB0]/30 transition-all duration-200"
                >
                  Cancelar
                </button>
                {mode === "edit" && (
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="rounded-xl bg-[#3D6B3F] px-5 py-3 text-sm font-medium text-white hover:bg-[#1F3A2E] transition-all duration-200 disabled:opacity-60"
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                )}
                {mode === "create" && (
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={saving}
                    className="rounded-xl bg-[#3D6B3F] px-5 py-3 text-sm font-medium text-white hover:bg-[#1F3A2E] transition-all duration-200 disabled:opacity-60"
                  >
                    {saving ? "Creando..." : "Crear producto"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent = "text-[#1F3A2E]",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-5 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
      <p className="text-xs font-semibold text-[#3D6B3F]/70 uppercase tracking-wider">
        {label}
      </p>
      <h2 className={`mt-1 text-2xl font-bold [font-family:'DM_Sans',sans-serif] ${accent}`}>{value}</h2>
    </div>
  );
}

function ProductThumbnail({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C5CFB0]/30 text-[10px] font-semibold uppercase text-[#3D6B3F]/50">
        Sin
      </div>
    );
  }
  return <img src={src} alt={alt} className="h-12 w-12 rounded-xl object-cover" />;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const className =
    normalized === "activo"
      ? "bg-[#A8C26B]/20 text-[#3D6B3F] border border-[#A8C26B]/40"
      : "bg-[#C97A3E]/15 text-[#C97A3E] border border-[#C97A3E]/30";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {normalized}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled = false,
  textarea = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  textarea?: boolean;
  type?: string;
}) {
  const inputClass =
    "w-full rounded-xl border border-[#C5CFB0] bg-[#F4F0E3] px-4 py-3 text-[#1F3A2E] outline-none transition-all placeholder-[#3D6B3F]/40 focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <label className="block space-y-1">
      <span className="block text-sm font-medium text-[#1F3A2E] mb-1">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          rows={4}
          className={inputClass}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  disabled,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-sm font-medium text-[#1F3A2E] mb-1">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-[#C5CFB0] bg-[#F4F0E3] px-4 py-3 text-[#1F3A2E] outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}