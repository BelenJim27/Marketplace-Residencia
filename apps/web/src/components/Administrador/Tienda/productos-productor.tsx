"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

export function ProductosProductor({
  idProductor,
}: ProductosProductorProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProductItem | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  const token = getCookie("token") ?? "";

  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/productos/por-productor/${idProductor}`);

      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => ({ message: "No fue posible cargar los productos del productor." }));
        throw new Error(
          payload.message || "No fue posible cargar los productos del productor.",
        );
      }

      const data = await response.json();
      const normalized = Array.isArray(data)
        ? data.map((item) => normalizeProduct(item as ProductItem))
        : [];
      setProducts(normalized);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los productos del productor.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, [idProductor]);

  const activeCount = useMemo(
    () =>
      products.filter((product) => String(product.status).toLowerCase() === "activo")
        .length,
    [products],
  );

  const totalStock = useMemo(
    () => products.reduce((acc, product) => acc + Number(product.stock ?? 0), 0),
    [products],
  );

  const openModal = (nextMode: "view" | "edit", product: ProductItem) => {
    setSelected(product);
    setMode(nextMode);
    setForm({
      nombre: product.nombre,
      descripcion: product.descripcion ?? "",
      precio_base: String(product.precio_base ?? "0"),
      moneda_base: product.moneda_base ?? product.moneda ?? "MXN",
      status: String(product.status ?? "activo").toLowerCase(),
    });
  };

  const closeModal = () => {
    setSelected(null);
    setMode(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (product: ProductItem) => {
    if (!token) {
      setError("No autorizado para eliminar productos.");
      return;
    }

    if (!confirm(`¿Eliminar ${product.nombre}?`)) {
      return;
    }

    try {
      await api.productos.delete(token, String(product.id_producto));
      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible eliminar el producto.",
      );
    }
  };

  const handleSave = async () => {
    if (!selected || !token) {
      setError("No autorizado para editar productos.");
      return;
    }

    if (!selected.id_tienda) {
      setError("No se pudo identificar la tienda del producto.");
      return;
    }

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

      if (user?.id_usuario) {
        payload.append("actualizado_por", user.id_usuario);
      }

      await api.productos.update(token, String(selected.id_producto), payload);
      closeModal();
      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar el producto.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Total productos" value={products.length} />
        <SummaryCard label="Activos" value={activeCount} accent="text-green-600" />
        <SummaryCard label="Stock total" value={totalStock} accent="text-blue-600" />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
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
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    Cargando productos...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    Este productor no tiene productos registrados.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id_producto}
                    className="border-t border-stroke text-sm dark:border-dark-3"
                  >
                    <td className="px-5 py-4">
                      <ProductThumbnail
                        src={product.imagen_url ?? null}
                        alt={product.nombre}
                      />
                    </td>
                    <td className="px-5 py-4 font-medium text-dark dark:text-white">
                      {product.nombre}
                    </td>
                    <td className="px-5 py-4">
                      {Number(product.precio_base ?? 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-4">{product.moneda_base || "MXN"}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={String(product.status ?? "activo")} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {product.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          title="Ver"
                          onClick={() => openModal("view", product)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-green-50 hover:text-green-600"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => openModal("edit", product)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => void handleDelete(product)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
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

      {selected && mode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-[10px] bg-white p-6 shadow-1">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-dark">
                {mode === "edit" ? "Editar producto" : "Detalle de producto"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nombre"
                  value={form.nombre}
                  onChange={(value) => setForm((current) => ({ ...current, nombre: value }))}
                  disabled={mode === "view"}
                />
                <Field
                  label="Precio base"
                  value={form.precio_base}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, precio_base: value }))
                  }
                  disabled={mode === "view"}
                  type="number"
                />
              </div>

              <Field
                label="Descripción"
                value={form.descripcion}
                onChange={(value) =>
                  setForm((current) => ({ ...current, descripcion: value }))
                }
                disabled={mode === "view"}
                textarea
              />

              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Moneda"
                  value={form.moneda_base}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, moneda_base: value }))
                  }
                  disabled={mode === "view"}
                />
                <Field label="Stock" value={String(selected.stock ?? 0)} disabled />
                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, status: value }))
                  }
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
                className="rounded-lg border border-stroke px-5 py-3 font-medium text-dark"
              >
                Cerrar
              </button>
              {mode === "edit" ? (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-lg bg-primary px-5 py-3 font-medium text-white hover:bg-opacity-90 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent = "text-slate-800",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <h2 className={`mt-1 text-2xl font-black ${accent}`}>{value}</h2>
    </div>
  );
}

function ProductThumbnail({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-[10px] font-semibold uppercase text-gray-400">
        Sin
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-12 w-12 rounded-xl object-cover"
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const className =
    normalized === "activo"
      ? "bg-green-50 text-green-700"
      : "bg-gray-100 text-gray-600";

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
  const className =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 outline-none transition-all focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <label className="block space-y-1">
      <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          disabled={disabled}
          rows={4}
          className={className}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          disabled={disabled}
          className={className}
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
      <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 outline-none transition-all focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
