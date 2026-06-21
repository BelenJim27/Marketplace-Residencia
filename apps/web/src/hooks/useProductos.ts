"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { useFeedback } from "@/hooks/useFeedback";
import { useDeleteAlert } from "@/hooks/useDeleteAlert";
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
  botellas_350ml: "",
  botellas_750ml: "",
};

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useProductos() {
  const { user, loading: authLoading } = useAuth();
  const token = getCookie("token") ?? "";
  const fb = useFeedback("producto_productor");
  const deleteAlert = useDeleteAlert("producto_productor");

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
  const [imagenesNuevas, setImagenesNuevas] = useState<File[]>([]);

  const [selectionEnabled, setSelectionEnabled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // ─── Obtener id_productor del usuario autenticado ─────────────────────────
  // Ajusta el campo según lo que devuelva tu AuthContext:
  // user?.id_productor  /  user?.productor?.id_productor  /  user?.productor_id
  const idProductor: number | null = user?.id_productor ?? null;

  const loadData = useCallback(async () => {
    if (authLoading) return;
    const pid = user?.id_productor;
    if (!pid) {
      setError("No se pudo identificar el productor autenticado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [producerData, productsData, storesData, categoriasData, lotesData] = await Promise.all([
        api.productores.getOne(pid),
        api.productos.getMine(token, pid),
        api.tiendas.getByProductor(pid, token),
        api.categorias.getAll(),
        api.lotes.getByProductor(pid),
      ]);

      setProducer(producerData as ProducerDetail);
      const rawStores = storesData as any;
      const storesArray: StoreItem[] = Array.isArray(rawStores)
        ? rawStores
        : Array.isArray(rawStores?.items)
          ? rawStores.items
          : [];
      setStores(storesArray);
      setCategorias(Array.isArray(categoriasData) ? (categoriasData as CategoriaItem[]) : []);
      setLotes(Array.isArray(lotesData) ? (lotesData as LoteItem[]) : []);
      setProducts(
        (productsData as ProductItem[]).map((p) => ({
          ...p,
          imagen_url: p.imagen_url ?? p.imagen_principal_url ?? null,
          stock: p.stock ?? 0,
          stock_minimo: p.stock_minimo ?? 0,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible cargar los productos",
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, token, user?.id_productor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const storeMap = useMemo(
    () => new Map(stores.map((s) => [s.id_tienda, s.nombre])),
    [stores],
  );

  const lotesDisponibles = useMemo(() => {
    if (mode !== "create") return lotes;
    const usados = new Set(products.map((p) => String(p.id_lote)).filter(Boolean));
    return lotes.filter((l) => !usados.has(String(l.id_lote)));
  }, [lotes, products, mode]);

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
  }, [products, query, storeMap, statusFilter, storeFilter, minPrice, maxPrice]);

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
    setError(null);
    setImagen(resetImagenProductoState(imagen));
    setForm({ ...EMPTY_FORM, id_tienda: String(stores[0]?.id_tienda ?? ""), status: "borrador" });
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
    const categoriaId =
      (product as any).categorias_full?.[0]?.id_categoria ??
      (product as any).id_categoria ??
      "";
    setForm({
      nombre: product.nombre,
      descripcion: product.descripcion ?? "",
      id_tienda: String(product.id_tienda),
      precio_base: String(product.precio_base ?? ""),
      moneda_base: product.moneda_base ?? "MXN",
      status: product.status ?? "activo",
      id_categoria: categoriaId ? String(categoriaId) : "",
      peso_kg: String(product.peso_kg ?? ""),
      alto_cm: String(product.alto_cm ?? ""),
      ancho_cm: String(product.ancho_cm ?? ""),
      largo_cm: String(product.largo_cm ?? ""),
      id_lote: String(product.id_lote ?? ""),
      stock_inicial: String(product.stock ?? ""),
      botellas_350ml: String((product as any).botellas_350ml ?? ""),
      botellas_750ml: String((product as any).botellas_750ml ?? ""),
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
      botellas_350ml: String((product as any).botellas_350ml ?? ""),
      botellas_750ml: String((product as any).botellas_750ml ?? ""),
    });
    setMode("view");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setError(null);
    setImagen(resetImagenProductoState(imagen));
    setImagenesNuevas([]);
  };

  // ─── Lote auto-fill ───────────────────────────────────────────────────────

  const handleLoteChange = (value: string) => {
    const lote = lotes.find((l) => String(l.id_lote) === value);
    if (!lote) {
      setForm((c) => ({ ...c, id_lote: value }));
      return;
    }

    // Leer datos enriquecidos del endpoint individual si están disponibles
    const datosApi = (lote as any).datos_api as Record<string, any> | null | undefined;
    const especie = datosApi?.recolecciones?.[0]?.especie ?? datosApi?.especies?.[0];

    // Nombre: solo el nombre del agave/especie, sin marca
    const nombreAuto = especie?.nombre_comun || lote.nombre_comun || lote.codigo_lote;

    // Descripción enriquecida
    const partes: string[] = [];
    const nombreComun = especie?.nombre_comun || lote.nombre_comun;
    const nombreCientifico = especie?.nombre_cientifico || lote.nombre_cientifico;
    if (nombreComun)       partes.push(`Maguey: ${nombreComun}`);
    if (nombreCientifico)  partes.push(`Especie: ${nombreCientifico}`);
    if (lote.grado_alcohol) partes.push(`Grado de alcohol: ${lote.grado_alcohol}%`);
    if (lote.sitio)        partes.push(`Sitio de producción: ${lote.sitio}`);
    if (lote.unidades)     partes.push(`Unidades: ${lote.unidades}`);
    if (datosApi?.impacto?.total_kg_maguey) partes.push(`Maguey utilizado: ${datosApi.impacto.total_kg_maguey} kg`);
    if (datosApi?.impacto?.porcentaje_evidencia != null) partes.push(`Evidencia de trazabilidad: ${datosApi.impacto.porcentaje_evidencia}%`);
    if (lote.codigo_lote)  partes.push(`Folio: ${lote.codigo_lote}`);
    const descripcionAuto = partes.join(" · ");

    // Calcular botellas usando capacidad_ml (del endpoint lista, guardado en datos_api o en el lote)
    const capacidadMl: number | null = (lote as any).capacidad_ml ?? datosApi?.capacidad_ml ?? null;
    const bot750 = capacidadMl === 750
      ? (lote.unidades ?? lote.botellas_750ml)
      : lote.botellas_750ml;
    const bot350 = capacidadMl === 350
      ? (lote.unidades ?? lote.botellas_350ml)
      : lote.botellas_350ml;

    setForm((c) => ({
      ...c,
      id_lote: value,
      nombre: nombreAuto,
      descripcion: descripcionAuto,
      stock_inicial: lote.unidades != null ? String(lote.unidades) : c.stock_inicial,
      botellas_350ml: bot350 != null ? String(bot350) : c.botellas_350ml,
      botellas_750ml: bot750 != null ? String(bot750) : c.botellas_750ml,
    }));
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id_usuario) return;

    if (!form.nombre.trim()) { setError("El nombre del producto es obligatorio."); return; }
    const precioNum = Number(form.precio_base);
    if (!form.precio_base.trim() || isNaN(precioNum) || precioNum <= 0) {
      setError("El precio base es obligatorio y debe ser mayor a cero."); return;
    }
    if (!form.id_tienda || Number(form.id_tienda) === 0) {
      setError("Debes seleccionar una tienda."); return;
    }
    if (!form.id_lote) { setError("Debes seleccionar un lote de trazabilidad."); return; }
    if (!form.descripcion.trim()) { setError("La descripción es obligatoria."); return; }
    if (!form.id_categoria) { setError("Debes seleccionar una categoría."); return; }
    if (mode === "create") {
      const loteEnUso = products.some((p) => String(p.id_lote) === form.id_lote);
      if (loteEnUso) {
        setError("Este lote ya tiene un producto asignado. Solo se permite un producto por lote.");
        return;
      }
    }

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
      if (form.botellas_350ml) payload.append("botellas_350ml", form.botellas_350ml);
      if (form.botellas_750ml) payload.append("botellas_750ml", form.botellas_750ml);
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
        if (imagenesNuevas.length > 0) {
          const fd = new FormData();
          for (const file of imagenesNuevas) fd.append("imagenes", file);
          await api.productos.addImagenes(token, String(selected.id_producto), fd);
        }
      } else {
        const created = await api.productos.create(token, payload);
        const idCreado = created?.id_producto;
        if (form.stock_inicial && idCreado) {
          await api.inventario.create(token, {
            id_producto: Number(idCreado),
            stock: Number(form.stock_inicial),
          });
        }
        if (imagenesNuevas.length > 0 && idCreado) {
          const fd = new FormData();
          for (const file of imagenesNuevas) fd.append("imagenes", file);
          await api.productos.addImagenes(token, String(idCreado), fd);
        }
      }
      const fueEdicion = mode === "edit" && !!selected;
      closeModal();
      await loadData();
      if (fueEdicion) fb.actualizado();
      else fb.creado();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(
          "Tu sesión no tiene permisos de productor activos. Por favor recarga la página para sincronizar tu rol.",
        );
      } else {
        setError(
          err instanceof Error ? err.message : "No fue posible guardar el producto",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (product: ProductItem) => {
    deleteAlert.abrir(product.nombre, async () => {
      try {
        await api.productos.delete(token, String(product.id_producto));
        await loadData();
        fb.eliminado();
      } catch (err) {
        fb.error(err, "No fue posible eliminar el producto");
      }
    });
  };

  const syncFromLotes = async () => {
    const currentIdProductor = user?.id_productor ? Number(user.id_productor) : undefined;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await api.lotes.sincronizarTodos(token, currentIdProductor);
      const { creados = 0, actualizados = 0 } = (result as any) ?? {};
      const total = creados + actualizados;
      if (total === 0) {
        setSyncMessage({
          text: "La API de trazabilidad no tiene lotes disponibles en este momento o todos ya estaban sincronizados.",
          type: "error",
        });
      } else {
        setSyncMessage({
          text: `¡Listo! ${creados} lote(s) y producto(s) creado(s), ${actualizados} actualizado(s). Puedes editar el precio e imagen de cada producto.`,
          type: "success",
        });
        setTimeout(() => setSyncMessage(null), 8000);
      }
      await loadData();
    } catch (err) {
      setSyncMessage({
        text: err instanceof Error ? err.message : "Error al sincronizar desde la API de trazabilidad.",
        type: "error",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const cantidad = selectedIds.length;
    deleteAlert.abrir(`${cantidad} producto(s)`, async () => {
      try {
        await Promise.all(
          selectedIds.map((id) => api.productos.delete(token, String(id))),
        );
        setSelectedIds([]);
        setSelectionEnabled(false);
        await loadData();
        fb.success(`${cantidad} producto(s) eliminado(s) correctamente.`);
      } catch (err) {
        fb.error(err, "No fue posible eliminar los productos seleccionados");
      }
    });
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
    reloadData: loadData,
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
    imagenesNuevas, setImagenesNuevas,
    openCreate,
    openEdit,
    openView,
    closeModal,
    handleLoteChange,
    lotesDisponibles,
    handleSubmit,
    handleDelete,
    handleDeleteSelected,
    deleteAlert,
    syncing,
    syncMessage,
    syncFromLotes,
  };
}