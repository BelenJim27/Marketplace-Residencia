"use client";

import { Eye, Pencil, Trash2, Search, Package, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ProductItem = {
  id_producto: number;
  nombre: string;
  descripcion?: string | null;
  imagen_principal_url?: string | null;
  precio_base?: string | number | null;
  moneda_base?: string | null;
  status?: string | null;
  peso_kg?: string | number | null;
  alto_cm?: string | number | null;
  ancho_cm?: string | number | null;
  largo_cm?: string | number | null;
  categorias?: { categoria: { id_categoria: number; nombre: string } }[];
};

type ModalState = {
  modo: "ver" | "editar" | null;
  producto: ProductItem | null;
};

export default function ProductorProductos() {
  const [productos, setProductos] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ modo: null, producto: null });
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/productos`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al cargar productos");
      setProductos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return productos;
    const q = query.toLowerCase();
    return productos.filter(p => p.nombre.toLowerCase().includes(q));
  }, [productos, query]);

  const formatPrice = (precio: string | number | null | undefined, moneda: string | null | undefined) => {
    const num = typeof precio === "string" ? parseFloat(precio) : (precio || 0);
    return `${moneda || "MXN"} ${num.toFixed(2)}`;
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este producto?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/productos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      loadProductos();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mis Productos</h1>
          <p className="text-sm text-gray-500">Gestiona tus productos</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full rounded-lg border bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-green-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase text-gray-500">
              <tr>
                <th className="p-4">Imagen</th>
                <th className="p-4">Nombre</th>
                <th className="p-4 text-center">Precio</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Peso</th>
                <th className="p-4 text-center">Dimensiones</th>
                <th className="p-4">Categorías</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-500">
                    No hay productos
                  </td>
                </tr>
              ) : (
                filtered.map((producto) => (
                  <tr key={producto.id_producto} className="group hover:bg-gray-50">
                    <td className="p-4">
                      {producto.imagen_principal_url ? (
                        <img
                          src={producto.imagen_principal_url}
                          alt={producto.nombre}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                          <Package className="h-6 w-6 text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{producto.nombre}</div>
                      <div className="text-xs text-gray-500 max-w-[150px] truncate">
                        {producto.descripcion || "Sin descripción"}
                      </div>
                    </td>
                    <td className="p-4 text-center font-semibold text-green-600">
                      {formatPrice(producto.precio_base, producto.moneda_base)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        producto.status === "activo" 
                          ? "bg-green-50 text-green-700" 
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {producto.status || "N/A"}
                      </span>
                    </td>
                    <td className="p-4 text-center text-sm">
                      {producto.peso_kg ? `${producto.peso_kg} kg` : "—"}
                    </td>
                    <td className="p-4 text-center text-sm text-gray-500">
                      {producto.alto_cm && producto.ancho_cm && producto.largo_cm
                        ? `${producto.alto_cm}x${producto.ancho_cm}x${producto.largo_cm} cm`
                        : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {producto.categorias?.length ? (
                          producto.categorias.map((c) => (
                            <span key={c.categoria.id_categoria} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {c.categoria.nombre}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModal({ modo: "ver", producto })}
                          className="rounded-lg p-2 hover:bg-gray-100 text-gray-500"
                          title="Ver"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setModal({ modo: "editar", producto })}
                          className="rounded-lg p-2 hover:bg-green-50 text-green-600"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(producto.id_producto)}
                          disabled={deleting === producto.id_producto}
                          className="rounded-lg p-2 hover:bg-red-50 text-red-500"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {modal.modo && modal.producto && (
        <ModalProducto
          producto={modal.producto}
          modo={modal.modo}
          onClose={() => setModal({ modo: null, producto: null })}
          onRefresh={loadProductos}
        />
      )}
    </div>
  );
}

function ModalProducto({
  producto,
  modo,
  onClose,
  onRefresh,
}: {
  producto: ProductItem;
  modo: "ver" | "editar";
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [formData, setFormData] = useState({
    nombre: producto.nombre || "",
    descripcion: producto.descripcion || "",
    precio_base: String(producto.precio_base || "0"),
    status: producto.status || "activo",
    peso_kg: String(producto.peso_kg || ""),
    alto_cm: String(producto.alto_cm || ""),
    ancho_cm: String(producto.ancho_cm || ""),
    largo_cm: String(producto.largo_cm || ""),
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/productos/${producto.id_producto}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            precio_base: formData.precio_base,
            status: formData.status,
            peso_kg: formData.peso_kg || null,
            alto_cm: formData.alto_cm || null,
            ancho_cm: formData.ancho_cm || null,
            largo_cm: formData.largo_cm || null,
          }),
        }
      );
      if (!res.ok) throw new Error("Error al guardar");
      await onRefresh();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">
            {modo === "ver" ? "Detalles" : "Editar"} Producto
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              disabled={modo === "ver"}
              className="w-full rounded-lg border p-2 text-sm disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              disabled={modo === "ver"}
              rows={2}
              className="w-full rounded-lg border p-2 text-sm disabled:bg-gray-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Precio</label>
              <input
                type="number"
                step="0.01"
                value={formData.precio_base}
                onChange={(e) => setFormData({ ...formData, precio_base: e.target.value })}
                disabled={modo === "ver"}
                className="w-full rounded-lg border p-2 text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={modo === "ver"}
                className="w-full rounded-lg border p-2 text-sm disabled:bg-gray-50"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Peso (kg)</label>
            <input
              type="number"
              step="0.001"
              value={formData.peso_kg}
              onChange={(e) => setFormData({ ...formData, peso_kg: e.target.value })}
              disabled={modo === "ver"}
              className="w-full rounded-lg border p-2 text-sm disabled:bg-gray-50"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500">Alto (cm)</label>
              <input
                type="number"
                value={formData.alto_cm}
                onChange={(e) => setFormData({ ...formData, alto_cm: e.target.value })}
                disabled={modo === "ver"}
                className="w-full rounded-lg border p-2 text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Ancho (cm)</label>
              <input
                type="number"
                value={formData.ancho_cm}
                onChange={(e) => setFormData({ ...formData, ancho_cm: e.target.value })}
                disabled={modo === "ver"}
                className="w-full rounded-lg border p-2 text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Largo (cm)</label>
              <input
                type="number"
                value={formData.largo_cm}
                onChange={(e) => setFormData({ ...formData, largo_cm: e.target.value })}
                disabled={modo === "ver"}
                className="w-full rounded-lg border p-2 text-sm disabled:bg-gray-50"
              />
            </div>
          </div>

          {producto.categorias?.length ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Categorías</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {producto.categorias.map((c) => (
                  <span key={c.categoria.id_categoria} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {c.categoria.nombre}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              {modo === "ver" ? "Cerrar" : "Cancelar"}
            </button>
            {modo === "editar" && (
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}