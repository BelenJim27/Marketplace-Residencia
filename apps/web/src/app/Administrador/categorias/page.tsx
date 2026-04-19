"use client";

import { Plus, Search, Edit2, Trash2, X, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Categoria = {
  id_categoria: number;
  id_padre: number | null;
  nombre: string;
  slug: string;
  descripcion: string | null;
  tipo: string;
  orden: number;
  imagen_url: string | null;
  activo: boolean;
  categorias?: Categoria[];
};

type Notice = {
  type: "error" | "success";
  message: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function CategoriasAdminPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    slug: "",
    descripcion: "",
    tipo: "general",
    orden: 0,
    activo: true,
    id_padre: "",
  });

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/categorias`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al cargar categorías");
      setCategorias(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Error al cargar categorías",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCategorias = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return categorias;
    return categorias.filter(
      (c) =>
        c.nombre.toLowerCase().includes(normalized) ||
        c.descripcion?.toLowerCase().includes(normalized),
    );
  }, [categorias, query]);

  const openCreateModal = (parentId?: number) => {
    setEditingCategoria(null);
    setFormData({
      nombre: "",
      slug: "",
      descripcion: "",
      tipo: "general",
      orden: 0,
      activo: true,
      id_padre: parentId ? String(parentId) : "",
    });
    setShowModal(true);
  };

  const openEditModal = (c: Categoria) => {
    setEditingCategoria(c);
    setFormData({
      nombre: c.nombre,
      slug: c.slug,
      descripcion: c.descripcion || "",
      tipo: c.tipo,
      orden: c.orden,
      activo: c.activo,
      id_padre: c.id_padre ? String(c.id_padre) : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const method = editingCategoria ? "PATCH" : "POST";
const url = editingCategoria
      ? `${API_URL}/categorias/${editingCategoria.id_categoria}`
      : `${API_URL}/categorias`;

    const payload = {
      nombre: formData.nombre,
      slug: formData.slug,
      descripcion: formData.descripcion || null,
      tipo: formData.tipo,
      orden: Number(formData.orden) || 0,
      activo: formData.activo,
      id_padre: formData.id_padre ? parseInt(formData.id_padre) : null,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Error al guardar");

      setNotice({ type: "success", message: "Categoría guardada correctamente" });
      setShowModal(false);
      loadCategorias();
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Error al guardar",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;

    try {
      const res = await fetch(`${API_URL}/categorias/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al eliminar");
      setNotice({ type: "success", message: "Categoría eliminada" });
      loadCategorias();
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Error al eliminar",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Gestión de Categorías
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Administra las categorías y subcategorías del sistema.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreateModal()}
          className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
        >
          + Nueva Categoría
        </button>
      </div>

      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {notice.message}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar categorías..."
            className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="p-4">Nombre</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 text-center">Orden</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : filteredCategorias.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-500">
                    No hay categorías.
                  </td>
                </tr>
              ) : (
                filteredCategorias.map((cat) => (
                  <tr
                    key={cat.id_categoria}
                    className="group hover:bg-gray-50/60"
                  >
                    <td className="p-4 font-semibold text-slate-800">
                      {cat.nombre}
                      {cat.categorias && cat.categorias.length > 0 && (
                        <span className="ml-2 text-xs text-gray-400">
                          ({cat.categorias.length} sub)
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">{cat.slug}</td>
                    <td className="p-4 text-sm text-gray-500">{cat.tipo}</td>
                    <td className="p-4 text-center text-sm">{cat.orden}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${cat.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {cat.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-green-50 hover:text-green-700"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id_categoria)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingCategoria ? "Editar" : "Nueva"} Categoría
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) =>
                      setFormData({ ...formData, tipo: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                  >
                    <option value="general">General</option>
                    <option value="maguey">Maguey</option>
                    <option value="tipo_mezcal">Tipo Mezcal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Orden</label>
                  <input
                    type="number"
                    value={formData.orden}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        orden: parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) =>
                    setFormData({ ...formData, activo: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-green-600"
                />
                <label className="text-sm text-gray-700">Activo</label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}