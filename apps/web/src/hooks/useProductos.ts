"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import {
  type ImagenProductoState,
  EMPTY_IMAGEN_PRODUCTO,
  resetImagenProductoState,
  appendImagenProducto,
} from "@/components/Producer/Products/ImagenProducto";
import type {
  StoreItem,
  CategoriaItem,
  LoteItem,
  ProductItem,
  ProducerDetail,
  FormState,
  ModalMode,
} from "@/types/producer";

export type {
  StoreItem,
  CategoriaItem,
  LoteItem,
  ProductItem,
  ProducerDetail,
  FormState,
  ModalMode,
} from "@/types/producer";

export const EMPTY_FORM: FormState = {
  nombre: "",
  descripcion: "",
  id_tienda: "",
  precio_base: "",
  moneda_base: "MXN",
  status: "activo",
  id_categoria: "",
  peso_kg: "",
  alto_cm: "",
  ancho_cm: "",
  largo_cm: "",
  id_lote: "",
  stock_inicial: "",
};

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useProductos() {
  const { user, loading: authLoading } = useAuth();
  const token = getCookie("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [producer, setProducer] = useState<ProducerDetail | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [lotes, setLotes] = useState<LoteItem[]>([]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [storeFilter, setStoreFilter] = useState("todos");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [unidadFilter, setUnidadFilter] = useState("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("create");
  const [selected, setSelected] = useState<ProductItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imagen, setImagen] = useState<ImagenProductoState>(EMPTY_IMAGEN_PRODUCTO);

  const [selectionEnabled, setSelectionEnabled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // ─── Obtener id_productor del usuario autenticado ─────────────────────────
  // Ajusta el campo según lo que devuelva tu AuthContext:
  // user?.id_productor  /  user?.productor?.id_productor  /  user?.productor_id
  const idProductor: number | null = user?.id_productor ?? null;

  const loadData = async () => {
    if (authLoading) return;

    if (!idProductor) {
      setError("No se pudo identificar el productor autenticado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [producerData, productsData, storesData, categoriasData, lotesData] =
        await Promise.all([
          api.productores.getOne(idProductor),
          api.productos.getMine(token, idProductor),
          api.tiendas.getByProductor(idProductor, token),
          api.categorias.getAll(),
          api.lotes.getByProductor(idProductor),
        ]);

      setProducer(producerData as ProducerDetail);
      setStores(Array.isArray(storesData) ? (storesData as StoreItem[]) : []);
      setCategorias(Array.isArray(categoriasData) ? (categoriasData as CategoriaItem[]) : []);
      setLotes(Array.isArray(lotesData) ? (lotesData as LoteItem[]) : []);
      setProducts(
        (productsData as ProductItem[]).map((p) => ({
          ...p,
          imagen_url: p.imagen_url ?? p.imagen_principal_url ?? null,
          stock: p.stock ?? 0,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible cargar los productos",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [authLoading, idProductor, token]); // ← usa idProductor real, no hardcodeado

  // ─── Memos ────────────────────────────────────────────────────────────────

  const storeMap = useMemo(
    () => new Map(stores.map((s) => [s.id_tienda, s.nombre])),
    [stores],
  );

  const visibleProducts = useMemo(() => {
    const q = query.toLowerCase().trim();
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);
    return products.filter((p) => {
      const name = p.nombre.toLowerCase();
      const status = String(p.status || "activo").toLowerCase();
      const store = String(storeMap.get(Number(p.id_tienda)) || "").toLowerCase();
      const price = Number(p.precio_base || 0);
      return (
        (!q || name.includes(q) || status.includes(q) || store.includes(q)) &&
        (statusFilter === "todos" || status === statusFilter) &&
        (storeFilter === "todos" || String(p.id_tienda) === storeFilter) &&
        (min === null || Number.isNaN(min) || price >= min) &&
        (max === null || Number.isNaN(max) || price <= max)
      );
    });
  }, [products, query, storeMap, statusFilter, storeFilter, minPrice, maxPrice, unidadFilter]);

  const activeProductsCount = useMemo(
    () =>
      products.filter(
        (p) => String(p.status ?? "activo").toLowerCase() === "activo",
      ).length,
    [products],
  );

  const inactiveProductsCount = useMemo(
    () =>
      products.filter(
        (p) => String(p.status ?? "activo").toLowerCase() !== "activo",
      ).length,
    [products],
  );

  const visibleProductIds = useMemo(
    () => visibleProducts.map((p) => p.id_producto),
    [visibleProducts],
  );

  const allVisibleSelected =
    visibleProductIds.length > 0 &&
    visibleProductIds.every((id) => selectedIds.includes(id));

  // ─── Filtros ──────────────────────────────────────────────────────────────

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("todos");
    setStoreFilter("todos");
    setMinPrice("");
    setMaxPrice("");
    setUnidadFilter("todos");
  };

  // ─── Selección ────────────────────────────────────────────────────────────

  const toggleSelectionMode = (enabled: boolean) => {
    setSelectionEnabled(enabled);
    if (!enabled) setSelectedIds([]);
  };

  const toggleProductSelection = (id: number, checked: boolean) => {
    setSelectedIds((cur) =>
      checked ? Array.from(new Set([...cur, id])) : cur.filter((x) => x !== id),
    );
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((cur) =>
      checked
        ? Array.from(new Set([...cur, ...visibleProductIds]))
        : cur.filter((id) => !visibleProductIds.includes(id)),
    );
  };

  // ─── Modal ────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setSelected(null);
    setImagen(resetImagenProductoState(imagen));
    setForm({ ...EMPTY_FORM, id_tienda: String(stores[0]?.id_tienda ?? "") });
    setMode("create");
    setModalOpen(true);
  };

  const openEdit = (product: ProductItem) => {
    setSelected(product);
    setImagen(
      resetImagenProductoState(
        imagen,
        product.imagen_url ?? product.imagen_principal_url ?? null,
      ),
    );
    setForm({
      nombre: product.nombre,
      descripcion: product.descripcion ?? "",
      id_tienda: String(product.id_tienda),
      precio_base: String(product.precio_base ?? ""),
      moneda_base: product.moneda_base ?? "MXN",
      status: product.status ?? "activo",
      id_categoria: String(product.id_categoria ?? ""),
      peso_kg: String(product.peso_kg ?? ""),
      alto_cm: String(product.alto_cm ?? ""),
      ancho_cm: String(product.ancho_cm ?? ""),
      largo_cm: String(product.largo_cm ?? ""),
      id_lote: String(product.id_lote ?? ""),
      stock_inicial: String(product.stock ?? ""),
    });
    setMode("edit");
    setModalOpen(true);
  };

  const openView = (product: ProductItem) => {
    setSelected(product);
    setImagen(
      resetImagenProductoState(
        imagen,
        product.imagen_url ?? product.imagen_principal_url ?? null,
      ),
    );
    setForm({
      nombre: product.nombre,
      descripcion: product.descripcion ?? "",
      id_tienda: String(product.id_tienda),
      precio_base: String(product.precio_base ?? ""),
      moneda_base: product.moneda_base ?? "MXN",
      status: product.status ?? "activo",
      id_categoria: String(product.id_categoria ?? ""),
      peso_kg: String(product.peso_kg ?? ""),
      alto_cm: String(product.alto_cm ?? ""),
      ancho_cm: String(product.ancho_cm ?? ""),
      largo_cm: String(product.largo_cm ?? ""),
      id_lote: String(product.id_lote ?? ""),
      stock_inicial: String(product.stock ?? ""),
    });
    setMode("view");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setImagen(resetImagenProductoState(imagen));
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id_usuario) return;
    setSaving(true);
    setError(null);
    try {
      const payload = new FormData();
      payload.append("id_tienda", String(Number(form.id_tienda)));
      payload.append("nombre", form.nombre);
      payload.append("descripcion", form.descripcion);
      payload.append("precio_base", form.precio_base);
      payload.append("moneda_base", form.moneda_base);
      payload.append("status", form.status);
      payload.append("creado_por", user.id_usuario);
      payload.append("actualizado_por", user.id_usuario);
      if (form.id_categoria) payload.append("id_categoria", form.id_categoria);
      if (form.id_lote) payload.append("id_lote", form.id_lote);
      if (form.peso_kg) payload.append("peso_kg", form.peso_kg);
      if (form.alto_cm) payload.append("alto_cm", form.alto_cm);
      if (form.ancho_cm) payload.append("ancho_cm", form.ancho_cm);
      if (form.largo_cm) payload.append("largo_cm", form.largo_cm);

      appendImagenProducto(payload, imagen);

      if (mode === "edit" && selected) {
        await api.productos.update(token, String(selected.id_producto), payload);
        if (form.stock_inicial) {
          const inv = await api.inventario.getByProducto(selected.id_producto);
          if (inv?.id_inventario) {
            await api.inventario.update(token, String(inv.id_inventario), {
              stock: Number(form.stock_inicial),
            });
          } else {
            await api.inventario.create(token, {
              id_producto: Number(selected.id_producto),
              stock: Number(form.stock_inicial),
            });
          }
        }
      } else {
        const created = await api.productos.create(token, payload);
        if (form.stock_inicial && created?.id_producto) {
          await api.inventario.create(token, {
            id_producto: Number(created.id_producto),
            stock: Number(form.stock_inicial),
          });
        }
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible guardar el producto",
      );
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
      setError(
        err instanceof Error ? err.message : "No fue posible eliminar el producto",
      );
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.length} producto(s) seleccionados?`)) return;
    try {
      await Promise.all(
        selectedIds.map((id) => api.productos.delete(token, String(id))),
      );
      setSelectedIds([]);
      setSelectionEnabled(false);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible eliminar los productos seleccionados",
      );
    }
  };

  // ─── Return ───────────────────────────────────────────────────────────────

  return {
    loading,
    saving,
    error,
    producer,
    products,
    stores,
    categorias,
    lotes,
    query, setQuery,
    statusFilter, setStatusFilter,
    storeFilter, setStoreFilter,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    unidadFilter, setUnidadFilter,
    clearFilters,
    visibleProducts,
    activeProductsCount,
    inactiveProductsCount,
    storeMap,
    visibleProductIds,
    allVisibleSelected,
    selectionEnabled,
    selectedIds,
    toggleSelectionMode,
    toggleProductSelection,
    toggleSelectAllVisible,
    modalOpen,
    mode,
    selected,
    form, setForm,
    imagen, setImagen,
    openCreate,
    openEdit,
    openView,
    closeModal,
    handleSubmit,
    handleDelete,
    handleDeleteSelected,
  };
}