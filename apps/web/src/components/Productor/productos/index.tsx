"use client";

import { useEffect, useMemo, useState } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { Eye, Pencil, Plus, Store, Trash2 } from "lucide-react";

type StoreItem = {
  id_tienda: number;
  id_productor: number;
  nombre: string;
  status?: string | null;
};

type ProductItem = {
  id_producto: number;
  id_tienda: number;
  nombre: string;
  descripcion?: string | null;
  precio_base?: string | number | null;
  moneda_base?: string | null;
  status?: string | null;
  creado_en?: string | Date | null;
};

type ProducerDetail = {
  id_productor: number;
  tiendas?: StoreItem[];
};

type FormState = {
  nombre: string;
  descripcion: string;
  id_tienda: string;
  precio_base: string;
  moneda_base: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  nombre: "",
  descripcion: "",
  id_tienda: "",
  precio_base: "0",
  moneda_base: "MXN",
  status: "activo",
};

export function ProductorProductos() {
  const { user } = useAuth();
  const token = getCookie("token") ?? "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [producer, setProducer] = useState<ProducerDetail | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [storeFilter, setStoreFilter] = useState("todos");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [selected, setSelected] = useState<ProductItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const loadData = async () => {
    if (!user?.id_productor) {
      setError("No se pudo identificar el productor autenticado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [producerData, productsData] = await Promise.all([
        api.productores.getOne(user.id_productor),
        api.productos.getAll(),
      ]);

      const detail = producerData as ProducerDetail;
      const storesData = (detail.tiendas || []) as StoreItem[];
      setProducer(detail);
      setStores(storesData);
      setProducts(productsData as ProductItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar los productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id_productor]);

  const storeMap = useMemo(() => new Map(stores.map((store) => [store.id_tienda, store.nombre])), [stores]);
  const storeIds = useMemo(() => new Set(stores.map((store) => Number(store.id_tienda))), [stores]);

  const visibleProducts = useMemo(() => {
    const q = query.toLowerCase().trim();
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);

    return products
      .filter((product) => storeIds.has(Number(product.id_tienda)))
      .filter((product) => {
        const productName = product.nombre.toLowerCase();
        const productStatus = String(product.status || "activo").toLowerCase();
        const storeName = String(storeMap.get(Number(product.id_tienda)) || "").toLowerCase();
        const price = Number(product.precio_base || 0);

        const matchesQuery = !q || productName.includes(q) || productStatus.includes(q) || storeName.includes(q);
        const matchesStatus = statusFilter === "todos" || productStatus === statusFilter;
        const matchesStore = storeFilter === "todos" || String(product.id_tienda) === storeFilter;
        const matchesMin = min === null || Number.isNaN(min) ? true : price >= min;
        const matchesMax = max === null || Number.isNaN(max) ? true : price <= max;

        return matchesQuery && matchesStatus && matchesStore && matchesMin && matchesMax;
      });
  }, [products, storeIds, query, storeMap, statusFilter, storeFilter, minPrice, maxPrice]);

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("todos");
    setStoreFilter("todos");
    setMinPrice("");
    setMaxPrice("");
  };

  const openCreate = () => {
    setSelected(null);
    setForm({
      ...EMPTY_FORM,
      id_tienda: String(stores[0]?.id_tienda ?? ""),
    });
    setMode("create");
    setModalOpen(true);
  };

  const openEdit = (product: ProductItem) => {
    setSelected(product);
    setForm({
      nombre: product.nombre,
      descripcion: product.descripcion ?? "",
      id_tienda: String(product.id_tienda),
      precio_base: String(product.precio_base ?? "0"),
      moneda_base: product.moneda_base ?? "MXN",
      status: product.status ?? "activo",
    });
    setMode("edit");
    setModalOpen(true);
  };

  const openView = (product: ProductItem) => {
    setSelected(product);
    setForm({
      nombre: product.nombre,
      descripcion: product.descripcion ?? "",
      id_tienda: String(product.id_tienda),
      precio_base: String(product.precio_base ?? "0"),
      moneda_base: product.moneda_base ?? "MXN",
      status: product.status ?? "activo",
    });
    setMode("view");
    setModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id_usuario) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        id_tienda: Number(form.id_tienda),
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        precio_base: form.precio_base,
        moneda_base: form.moneda_base,
        status: form.status,
        creado_por: user.id_usuario,
        actualizado_por: user.id_usuario,
      };

      if (mode === "edit" && selected) {
        await api.productos.update(token, String(selected.id_producto), payload);
      } else {
        await api.productos.create(token, payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: ProductItem) => {
    if (!confirm(`¿Eliminar ${product.nombre}?`)) return;

    try {
      await api.productos.delete(token, String(product.id_producto));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar el producto");
    }
  };

  const createdAt = (value?: string | Date | null) => {
    if (!value) return "-";
    const date = new Date(value);
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(date);
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <Breadcrumb pageName="Productos del Productor" />

      <div className="mb-6 flex items-center justify-between gap-4 rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Gestión de productos</h1>
          <p className="text-sm text-gray-500">Solo se muestran productos de tus tiendas</p>
        </div>
        <button onClick={openCreate} disabled={stores.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Productos" value={visibleProducts.length} />
        <Card title="Tiendas" value={stores.length} />
        <Card title="Productor" value={producer?.id_productor ?? "-"} />
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o tienda"
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
        />
      </div>

      <div className="mb-6 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 xl:grid-cols-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-dark dark:text-white">Filtro por Estatus</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            >
              <option value="todos">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="borrador">Borrador</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-dark dark:text-white">Filtro por Tienda</span>
            <select
              value={storeFilter}
              onChange={(event) => setStoreFilter(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            >
              <option value="todos">Todas</option>
              {stores.map((store) => (
                <option key={store.id_tienda} value={String(store.id_tienda)}>
                  {store.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-dark dark:text-white">Precio mín</span>
            <input
              type="number"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="Precio mín"
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-dark dark:text-white">Precio máx</span>
            <input
              type="number"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Precio máx"
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            />
          </label>

          <div className="flex items-end xl:col-span-1">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-lg border border-stroke px-4 py-3 text-sm font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-white/5"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-gray-2 dark:bg-dark-2">
              <tr className="text-sm text-gray-500">
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4">Precio base</th>
                <th className="px-5 py-4">Moneda</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Tienda</th>
                <th className="px-5 py-4">Creado en</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => (
                <tr key={product.id_producto} className="border-t border-stroke text-sm dark:border-dark-3">
                  <td className="px-5 py-4 font-medium text-dark dark:text-white">{product.nombre}</td>
                  <td className="px-5 py-4">{Number(product.precio_base || 0).toFixed(2)}</td>
                  <td className="px-5 py-4">{product.moneda_base || "MXN"}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">{product.status || "activo"}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Store size={16} className="text-gray-400" />
                      {storeMap.get(Number(product.id_tienda)) || `#${product.id_tienda}`}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{createdAt(product.creado_en)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openView(product)} className="rounded-lg p-2 text-gray-500 hover:bg-green-50 hover:text-green-600"><Eye size={16} /></button>
                      <button onClick={() => openEdit(product)} className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(product)} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">No hay productos para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-dark dark:text-white">
                {mode === "create" ? "Nuevo producto" : mode === "edit" ? "Editar producto" : "Detalle de producto"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre" value={form.nombre} onChange={(value) => setForm((current) => ({ ...current, nombre: value }))} disabled={mode === "view"} />
                <Field label="Precio base" value={form.precio_base} onChange={(value) => setForm((current) => ({ ...current, precio_base: value }))} disabled={mode === "view"} type="number" />
              </div>

              <Field label="Descripción" value={form.descripcion} onChange={(value) => setForm((current) => ({ ...current, descripcion: value }))} disabled={mode === "view"} textarea />

              <div className="grid gap-4 md:grid-cols-3">
                <SelectField label="Tienda" value={form.id_tienda} onChange={(value) => setForm((current) => ({ ...current, id_tienda: value }))} disabled={mode === "view"} options={stores.map((store) => ({ label: store.nombre, value: String(store.id_tienda) }))} />
                <SelectField label="Moneda" value={form.moneda_base} onChange={(value) => setForm((current) => ({ ...current, moneda_base: value }))} disabled={mode === "view"} options={[{ label: "MXN", value: "MXN" }, { label: "USD", value: "USD" }]} />
                <SelectField label="Status" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value }))} disabled={mode === "view"} options={[{ label: "activo", value: "activo" }, { label: "inactivo", value: "inactivo" }]} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-stroke px-5 py-3 font-medium text-dark dark:border-dark-3 dark:text-white">
                  Cerrar
                </button>
                {mode !== "view" && (
                  <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-3 font-medium text-white hover:bg-opacity-90 disabled:opacity-60">
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
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

function Field({ label, value, onChange, disabled, textarea, type = "text" }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; textarea?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-dark dark:text-white">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={4}
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 disabled:opacity-60"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 disabled:opacity-60"
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-dark dark:text-white">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 disabled:opacity-60"
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
