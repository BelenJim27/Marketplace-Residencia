"use client";

import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

  const token = getCookie("token") ?? "";

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Loading productos for productor:", idProductor, "with token:", token);
      const data = await api.productos.getByProductor(idProductor, token);
      console.log("Productos data received:", data);
      const normalized = Array.isArray(data)
        ? data.map((item) => normalizeProduct(item as ProductItem))
        : [];
      console.log("Productos normalized:", normalized);
      setProducts(normalized);
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
          className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      {/* ── Tarjetas de resumen ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Total productos" value={products.length} />
        <SummaryCard label="Activos" value={activeCount} accent="text-green-600 dark:text-green-400" />
        <SummaryCard label="Stock total" value={totalStock} accent="text-blue-600 dark:text-blue-400" />
      </div>

      {/* ── Notificaciones ── */}
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/60 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
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
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                    Cargando productos...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                    Este productor no tiene productos registrados.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id_producto}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors text-sm"
                  >
                    <td className="px-5 py-4">
                      <ProductThumbnail src={product.imagen_url ?? null} alt={product.nombre} />
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                      {product.nombre}
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                      {Number(product.precio_base ?? 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                      {product.moneda_base || "MXN"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={String(product.status ?? "activo")} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {product.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          title="Ver"
                          onClick={() => openModal("view", product)}
                          className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => openModal("edit", product)}
                          className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => void handleDelete(product)}
                          className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
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

      {/* ── Modal Ver / Editar / Crear ── */}
      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {mode === "create"
                  ? "Nuevo Producto"
                  : mode === "edit"
                    ? "Editar producto"
                    : "Detalle de producto"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
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
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-gray-200 dark:border-gray-600 px-5 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              {mode === "edit" && (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              )}
              {mode === "create" && (
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={saving}
                  className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? "Creando..." : "Crear producto"}
                </button>
              )}
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
  accent = "text-slate-800 dark:text-white",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <h2 className={`mt-1 text-2xl font-black ${accent}`}>{value}</h2>
    </div>
  );
}

function ProductThumbnail({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500">
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
      ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
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
    "w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-gray-700 dark:text-gray-200 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <label className="block space-y-1">
      <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">
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
      <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-gray-700 dark:text-gray-200 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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