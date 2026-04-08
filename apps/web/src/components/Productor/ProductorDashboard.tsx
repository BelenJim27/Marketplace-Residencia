"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { useAuth } from "@/context/AuthContext";
import { Eye, MapPin, Package, Pencil, Plus, Store, Trash2, User } from "lucide-react";

type Product = {
  id_producto: number;
  id_tienda: number;
  nombre: string;
  descripcion?: string | null;
  precio_base?: string | number | null;
  moneda_base?: string | null;
  status?: string | null;
};

type StoreItem = {
  id_tienda: number;
  id_productor: number;
  nombre: string;
  descripcion?: string | null;
  pais_operacion?: string | null;
  status?: string | null;
};

type Producer = {
  id_productor: number;
  id_usuario: string;
  descripcion?: string | null;
  biografia?: string | null;
  otras_caracteristicas?: string | null;
  usuarios?: { nombre?: string; email?: string; id_usuario?: string };
};

type ProductFormState = {
  nombre: string;
  descripcion: string;
  id_tienda: number;
  precio_base: string;
  moneda_base: string;
  status: string;
};

type StoreFormState = {
  nombre: string;
  descripcion: string;
  pais_operacion: string;
  status: string;
};

const EMPTY_PRODUCT: ProductFormState = {
  nombre: "",
  descripcion: "",
  id_tienda: 0,
  precio_base: "0",
  moneda_base: "MXN",
  status: "activo",
};

const EMPTY_STORE: StoreFormState = {
  nombre: "",
  descripcion: "",
  pais_operacion: "MX",
  status: "activa",
};

export function ProductorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [currentProducer, setCurrentProducer] = useState<Producer | null>(null);

  const [productMode, setProductMode] = useState<"create" | "edit" | "view" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT);

  const [storeMode, setStoreMode] = useState<"create" | "view" | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [storeForm, setStoreForm] = useState<StoreFormState>(EMPTY_STORE);

  const token = getCookie("token") ?? "";

  const ownedStores = useMemo(
    () => stores.filter((store) => currentProducer && store.id_productor === currentProducer.id_productor),
    [stores, currentProducer],
  );

  const storeIds = useMemo(() => new Set(ownedStores.map((store) => Number(store.id_tienda))), [ownedStores]);
  const ownedProducts = useMemo(
    () => products.filter((product) => storeIds.has(Number(product.id_tienda))),
    [products, storeIds],
  );

  const loadData = async () => {
    if (authLoading || !user?.id_productor) return;

    setLoading(true);
    setError(null);

    try {
      const [productsRes, storesRes, producerRes] = await Promise.all([
        api.productos.getByProductor(user.id_productor),
        api.tiendas.getByProductor(user.id_productor),
        api.productores.getOne(user.id_productor),
      ]);

      setProducts(productsRes as Product[]);
      setStores(storesRes as StoreItem[]);
      setCurrentProducer(producerRes as Producer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el panel de productor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user?.id_productor) return;
    loadData();
  }, [authLoading, user?.id_productor]);

  const stats = [
    { label: "Productos", value: ownedProducts.length, icon: Package },
    { label: "Tiendas", value: ownedStores.length, icon: Store },
    { label: "Activos", value: ownedProducts.filter((item) => (item.status || "activo").toLowerCase() === "activo").length, icon: Eye },
    { label: "Perfil", value: currentProducer ? "Completo" : "Pendiente", icon: User },
  ];

  const openProductModal = (mode: "create" | "edit" | "view", product?: Product) => {
    if (mode === "create" && ownedStores.length === 0) {
      setError("Primero crea una tienda para poder registrar productos.");
      return;
    }

    setError(null);
    setProductMode(mode);
    setSelectedProduct(product ?? null);

    if (product) {
      setProductForm({
        nombre: product.nombre,
        descripcion: product.descripcion ?? "",
        id_tienda: Number(product.id_tienda),
        precio_base: String(product.precio_base ?? "0"),
        moneda_base: product.moneda_base ?? "MXN",
        status: product.status ?? "activo",
      });
      return;
    }

    setProductForm({
      ...EMPTY_PRODUCT,
      id_tienda: ownedStores[0]?.id_tienda ?? 0,
    });
  };

  const openStoreModal = (mode: "create" | "view", store?: StoreItem) => {
    setError(null);
    setStoreMode(mode);
    setSelectedStore(store ?? null);

    if (store) {
      setStoreForm({
        nombre: store.nombre,
        descripcion: store.descripcion ?? "",
        pais_operacion: store.pais_operacion ?? "MX",
        status: store.status ?? "activa",
      });
      return;
    }

    setStoreForm(EMPTY_STORE);
  };

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentProducer) return;

    try {
      const payload = {
        id_tienda: Number(productForm.id_tienda),
        nombre: productForm.nombre,
        descripcion: productForm.descripcion || undefined,
        precio_base: productForm.precio_base,
        moneda_base: productForm.moneda_base,
        status: productForm.status,
        creado_por: user?.id_usuario || user?.sub,
        actualizado_por: user?.id_usuario || user?.sub,
      };

      if (productMode === "edit" && selectedProduct) {
        await api.productos.update(token, String(selectedProduct.id_producto), payload);
      } else {
        await api.productos.create(token, payload);
      }

      setProductMode(null);
      setSelectedProduct(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el producto");
    }
  };

  const saveStore = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentProducer) {
      setError("No se pudo identificar tu perfil de productor.");
      return;
    }

    try {
      const payload = {
        id_productor: currentProducer.id_productor,
        nombre: storeForm.nombre,
        descripcion: storeForm.descripcion || undefined,
        pais_operacion: storeForm.pais_operacion,
        status: storeForm.status,
      };

      if (storeMode === "view" && selectedStore) {
        setStoreMode(null);
        setSelectedStore(null);
        return;
      }

      await api.tiendas.create(token, payload);
      setStoreMode(null);
      setSelectedStore(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la tienda");
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("¿Eliminar este producto?")) return;

    try {
      await api.productos.delete(token, String(id));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar el producto");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[10px] border border-stroke bg-white p-6 shadow-sm dark:border-form-strokedark dark:bg-form-input">
        <h1 className="text-2xl font-bold text-dark dark:text-white">Dashboard Productor</h1>
        <p className="text-gray-500">Panel de Maestro Mezcalero con acceso limitado</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-[10px] border border-stroke bg-white p-5 shadow-sm dark:border-form-strokedark dark:bg-form-input">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{stat.label}</span>
                <Icon className="h-5 w-5 text-green-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-dark dark:text-white">{stat.value}</div>
            </div>
          );
        })}
      </div>

      <section id="productos" className="rounded-[10px] border border-stroke bg-white p-6 shadow-sm dark:border-form-strokedark dark:bg-form-input">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-dark dark:text-white">Productos</h2>
            <p className="text-sm text-gray-500">Solo tus productos, filtrados por tus tiendas</p>
          </div>
          <button onClick={() => openProductModal("create")} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700">
            <Plus size={16} /> Nuevo producto
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-stroke text-left text-sm text-gray-500 dark:border-form-strokedark">
                <th className="py-3">Nombre</th>
                <th className="py-3">Tienda</th>
                <th className="py-3">Precio</th>
                <th className="py-3">Estado</th>
                <th className="py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ownedProducts.map((product) => (
                <tr key={product.id_producto} className="border-b border-stroke text-sm dark:border-form-strokedark">
                  <td className="py-3 font-medium text-dark dark:text-white">{product.nombre}</td>
                  <td className="py-3 text-gray-500">#{product.id_tienda}</td>
                  <td className="py-3 text-gray-500">{Number(product.precio_base || 0).toFixed(2)} {product.moneda_base || "MXN"}</td>
                  <td className="py-3 text-gray-500">{product.status || "activo"}</td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openProductModal("view", product)} className="rounded-lg p-2 text-gray-500 hover:bg-green-50 hover:text-green-600"><Eye size={16} /></button>
                      <button onClick={() => openProductModal("edit", product)} className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button>
                      <button onClick={() => deleteProduct(product.id_producto)} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {ownedProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-500">No hay productos para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="tiendas" className="rounded-[10px] border border-stroke bg-white p-6 shadow-sm dark:border-form-strokedark dark:bg-form-input">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-dark dark:text-white">Tiendas</h2>
            <p className="text-sm text-gray-500">Tiendas vinculadas a tu perfil de productor</p>
          </div>
          <button onClick={() => openStoreModal("create")} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700">
            <Plus size={16} /> Nueva tienda
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ownedStores.map((store) => (
            <div key={store.id_tienda} className="rounded-xl border border-stroke p-4 dark:border-form-strokedark">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-dark dark:text-white">{store.nombre}</h3>
                  <p className="text-sm text-gray-500">Tienda #{store.id_tienda}</p>
                </div>
                <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">{store.status || "activa"}</span>
              </div>
              <p className="mt-3 flex items-start gap-2 text-sm text-gray-500"><MapPin size={16} className="mt-0.5" /> {store.pais_operacion || "MX"}</p>
              <p className="mt-2 text-sm text-gray-500">{store.descripcion || "Sin descripción"}</p>
              <div className="mt-4 flex justify-end">
                <button onClick={() => openStoreModal("view", store)} className="rounded-lg border border-stroke px-3 py-2 text-sm text-dark hover:bg-gray-50 dark:border-form-strokedark dark:text-white">Ver</button>
              </div>
            </div>
          ))}
          {ownedStores.length === 0 && <div className="rounded-xl border border-dashed border-stroke p-6 text-sm text-gray-500">Aún no tienes tiendas registradas.</div>}
        </div>
      </section>

      <section id="perfil" className="rounded-[10px] border border-stroke bg-white p-6 shadow-sm dark:border-form-strokedark dark:bg-form-input">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-dark dark:text-white">Perfil</h2>
          <p className="text-sm text-gray-500">Información del Maestro Mezcalero</p>
        </div>

        {currentProducer ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/30">
              <p className="text-xs uppercase tracking-wide text-gray-400">Nombre</p>
              <p className="mt-1 font-medium text-dark dark:text-white">{currentProducer.usuarios?.nombre || user?.nombre || "Sin nombre"}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/30">
              <p className="text-xs uppercase tracking-wide text-gray-400">Correo</p>
              <p className="mt-1 font-medium text-dark dark:text-white">{currentProducer.usuarios?.email || user?.email}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/30 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-gray-400">Descripción</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{currentProducer.descripcion || "Sin descripción"}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stroke p-6 text-sm text-gray-500">No se encontró un perfil de productor para este usuario.</div>
        )}
      </section>

      {productMode && (
        <Modal
          title={productMode === "create" ? "Nuevo producto" : productMode === "edit" ? "Editar producto" : "Ver producto"}
          onClose={() => setProductMode(null)}
          footer={
            <>
              <button type="button" onClick={() => setProductMode(null)} className="rounded-lg border border-stroke px-4 py-2 text-sm text-dark dark:border-form-strokedark dark:text-white">
                Cerrar
              </button>
              {productMode !== "view" && (
                <button form="product-form" type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                  Guardar
                </button>
              )}
            </>
          }
        >
          <form id="product-form" onSubmit={saveProduct} className="space-y-4">
            <Field label="Nombre" value={productForm.nombre} onChange={(value) => setProductForm({ ...productForm, nombre: value })} disabled={productMode === "view"} />
            <Field label="Descripción" value={productForm.descripcion} onChange={(value) => setProductForm({ ...productForm, descripcion: value })} disabled={productMode === "view"} textarea />
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Tienda" value={String(productForm.id_tienda)} onChange={(value) => setProductForm({ ...productForm, id_tienda: Number(value) })} disabled={productMode === "view"} options={ownedStores.map((store) => ({ label: `${store.nombre} (#${store.id_tienda})`, value: String(store.id_tienda) }))} />
              <Field label="Precio base" value={productForm.precio_base} onChange={(value) => setProductForm({ ...productForm, precio_base: value })} disabled={productMode === "view"} type="number" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Moneda" value={productForm.moneda_base} onChange={(value) => setProductForm({ ...productForm, moneda_base: value })} disabled={productMode === "view"} options={[{ label: "MXN", value: "MXN" }, { label: "USD", value: "USD" }]} />
              <SelectField label="Estado" value={productForm.status} onChange={(value) => setProductForm({ ...productForm, status: value })} disabled={productMode === "view"} options={[{ label: "activo", value: "activo" }, { label: "inactivo", value: "inactivo" }]} />
            </div>
          </form>
        </Modal>
      )}

      {storeMode && (
        <Modal
          title={storeMode === "create" ? "Nueva tienda" : "Ver tienda"}
          onClose={() => setStoreMode(null)}
          footer={
            <>
              <button type="button" onClick={() => setStoreMode(null)} className="rounded-lg border border-stroke px-4 py-2 text-sm text-dark dark:border-form-strokedark dark:text-white">
                Cerrar
              </button>
              {storeMode !== "view" && (
                <button form="store-form" type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                  Guardar
                </button>
              )}
            </>
          }
        >
          <form id="store-form" onSubmit={saveStore} className="space-y-4">
            <Field label="Nombre" value={storeForm.nombre} onChange={(value) => setStoreForm({ ...storeForm, nombre: value })} disabled={storeMode === "view"} />
            <Field label="Descripción" value={storeForm.descripcion} onChange={(value) => setStoreForm({ ...storeForm, descripcion: value })} disabled={storeMode === "view"} textarea />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="País" value={storeForm.pais_operacion} onChange={(value) => setStoreForm({ ...storeForm, pais_operacion: value })} disabled={storeMode === "view"} />
              <SelectField label="Estado" value={storeForm.status} onChange={(value) => setStoreForm({ ...storeForm, status: value })} disabled={storeMode === "view"} options={[{ label: "activa", value: "activa" }, { label: "inactiva", value: "inactiva" }]} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, footer, onClose }: { title: string; children: React.ReactNode; footer: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-dark dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="mt-6 flex justify-end gap-3 border-t border-stroke pt-4 dark:border-form-strokedark">{footer}</div>
      </div>
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
          className="min-h-24 w-full rounded-lg border border-stroke bg-white px-3 py-2 outline-none focus:border-green-500 dark:border-form-strokedark dark:bg-gray-800 disabled:opacity-60"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-stroke bg-white px-3 py-2 outline-none focus:border-green-500 dark:border-form-strokedark dark:bg-gray-800 disabled:opacity-60"
        />
      )}
    </label>
  );
}

function SelectField({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ label: string; value: string }>; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-dark dark:text-white">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-stroke bg-white px-3 py-2 outline-none focus:border-green-500 dark:border-form-strokedark dark:bg-gray-800 disabled:opacity-60"
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
