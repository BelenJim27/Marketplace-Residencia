"use client";

import React from "react";
import { Search, Edit2, Trash2, X, ChevronRight, ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDeleteAlert } from "@/hooks/useDeleteAlert";
import { useSuccessToast } from "@/hooks/useSuccessToast";
import { DeleteAlertModal } from "@/components/ui/DeleteAlertModal";
import { SuccessToast } from "@/components/ui/SuccessToast";

type Categoria = {
  id_categoria: number;
  id_padre: number | null;
  nombre: string;
  slug: string;
  descripcion: string | null;
  tipo: string;
  imagen_url: string | null;
  activo: boolean;
  other_categorias?: Categoria[];
};

type Notice = { type: "error"; message: string };

const API_URL = "";

export default function CategoriasAdminPage() {
  const [query, setQuery]                       = useState("");
  const [loading, setLoading]                   = useState(true);
  const [notice, setNotice]                     = useState<Notice | null>(null);
  const [categorias, setCategorias]             = useState<Categoria[]>([]);
  const [showModal, setShowModal]               = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({ nombre: "", slug: "", tipo: "general", activo: true, id_padre: "", jerarquia: "categoria" as "categoria" | "subcategoria" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const deleteAlert  = useDeleteAlert("categoria");
  const successToast = useSuccessToast("categoria");

  useEffect(() => { loadCategorias(); }, []);
  useEffect(() => { setCurrentPage(1); }, [query]);

  const loadCategorias = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/categorias`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al cargar categorías");
      setCategorias(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Error al cargar categorías" });
    } finally { setLoading(false); }
  };

  // Sólo categorías padre (sin id_padre)
  const padres = useMemo(
    () => categorias.filter((c) => c.id_padre === null),
    [categorias],
  );

  // Cuando hay búsqueda: lista plana de todas las que coincidan
  const busquedaPlana = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return categorias.filter(
      (c) => c.nombre.toLowerCase().includes(normalized) || c.descripcion?.toLowerCase().includes(normalized),
    );
  }, [categorias, query]);

  const currentList = query.trim() ? busquedaPlana : padres;
  const totalPages = Math.ceil(currentList.length / itemsPerPage);
  const paginatedList = currentList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openCreateModal = (parentId?: number) => {
    setEditingCategoria(null);
    setFormData({ nombre: "", slug: "", tipo: "general", activo: true, id_padre: parentId ? String(parentId) : "", jerarquia: parentId ? "subcategoria" : "categoria" });
    setShowModal(true);
  };

  const openEditModal = (c: Categoria) => {
    setEditingCategoria(c);
    setFormData({ nombre: c.nombre, slug: c.slug, tipo: c.tipo, activo: c.activo, id_padre: c.id_padre ? String(c.id_padre) : "", jerarquia: c.id_padre ? "subcategoria" : "categoria" });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const isEditing = !!editingCategoria;
    const method    = isEditing ? "PATCH" : "POST";
    const url       = isEditing ? `${API_URL}/categorias/${editingCategoria!.id_categoria}` : `${API_URL}/categorias`;
    const payload   = { nombre: formData.nombre, slug: formData.slug, tipo: formData.tipo, activo: formData.activo, id_padre: formData.jerarquia === "subcategoria" && formData.id_padre ? parseInt(formData.id_padre) : null };
    try {
      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setShowModal(false);
      loadCategorias();
      if (isEditing) successToast.mostrarActualizado();
      else successToast.mostrarRegistrado();
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Error al guardar" });
    }
  };

  const handleDelete = (id: number, nombre: string) => {
    deleteAlert.abrir(nombre, async () => {
      try {
        const res  = await fetch(`${API_URL}/categorias/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error al eliminar");
        loadCategorias();
        successToast.mostrar("Categoría eliminada correctamente.");
      } catch (error) {
        setNotice({ type: "error", message: error instanceof Error ? error.message : "Error al eliminar" });
      }
    });
  };

  const fieldCls  = "mt-1 w-full rounded-lg border border-[#C5CFB0] bg-white text-[#1F3A2E] px-3 py-2 text-sm outline-none focus:border-[#3D6B3F] focus:ring-1 focus:ring-[#3D6B3F]/20";
  const labelCls  = "block text-sm font-medium text-[#1F3A2E]";

  const renderAcciones = (cat: Categoria) => (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={() => openEditModal(cat)} className="rounded-lg p-2 text-[#3D6B3F]/40 hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F] transition-all duration-200"><Edit2 className="h-4 w-4" /></button>
      <button type="button" onClick={() => handleDelete(cat.id_categoria, cat.nombre)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"><Trash2 className="h-4 w-4" /></button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Gestión de Categorías</h1>
          <p className="mt-0.5 text-sm text-[#3D6B3F]/70">Administra las categorías y subcategorías del sistema.</p>
        </div>
        <button
          type="button"
          onClick={() => openCreateModal()}
          className="rounded-xl bg-[#3D6B3F] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#1F3A2E]"
        >
          + Nueva Categoría
        </button>
      </div>

      {/* Notice (solo errores) */}
      {notice && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {notice.message}
        </div>
      )}

      {/* Search */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3D6B3F]/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar categorías..."
            className="w-full rounded-xl border border-[#C5CFB0] bg-white py-3 pl-12 pr-4 text-sm text-[#1F3A2E] placeholder-[#3D6B3F]/40 outline-none focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-[#1F3A2E] text-[11px] font-bold uppercase tracking-wider text-white">
              <tr>
                <th className="p-4">Nombre</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5CFB0]/30">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-[#3D6B3F]/70 bg-white">Cargando...</td></tr>
              ) : query.trim() ? (
                /* ── Vista plana al buscar ── */
                busquedaPlana.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-[#3D6B3F]/70 bg-white">Sin resultados.</td></tr>
                ) : (
                  paginatedList.map((cat) => (
                    <tr key={cat.id_categoria} className="odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20 transition-all duration-200">
                      <td className="p-4 font-semibold text-[#1F3A2E]">
                        {cat.id_padre !== null && <span className="mr-1 text-[#3D6B3F]/40">↳</span>}
                        {cat.nombre}
                      </td>
                      <td className="p-4 text-sm text-[#1F3A2E]/70">{cat.slug}</td>
                      <td className="p-4 text-sm text-[#1F3A2E]/70">{cat.tipo}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${cat.activo ? "bg-[#A8C26B]/20 text-[#3D6B3F]" : "bg-[#C97A3E]/15 text-[#C97A3E]"}`}>
                          {cat.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="p-4">{renderAcciones(cat)}</td>
                    </tr>
                  ))
                )
              ) : padres.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-[#3D6B3F]/70 bg-white">No hay categorías.</td></tr>
              ) : (
                /* ── Vista jerárquica ── */
                paginatedList.map((cat) => (
                  <React.Fragment key={cat.id_categoria}>
                    {/* Fila padre */}
                    <tr key={cat.id_categoria} className="bg-white hover:bg-[#C5CFB0]/20 transition-all duration-200">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1F3A2E]">{cat.nombre}</span>
                          {(cat.other_categorias?.length ?? 0) > 0 && (
                            <span className="rounded-full bg-[#3D6B3F]/10 px-2 py-0.5 text-[10px] font-semibold text-[#3D6B3F]">
                              {cat.other_categorias!.length} sub
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-[#1F3A2E]/70">{cat.slug}</td>
                      <td className="p-4 text-sm text-[#1F3A2E]/70">{cat.tipo}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${cat.activo ? "bg-[#A8C26B]/20 text-[#3D6B3F]" : "bg-[#C97A3E]/15 text-[#C97A3E]"}`}>
                          {cat.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {renderAcciones(cat)}
                          <button
                            type="button"
                            title="Agregar subcategoría"
                            onClick={() => openCreateModal(cat.id_categoria)}
                            className="rounded-lg p-2 text-[#3D6B3F]/40 hover:bg-[#3D6B3F]/10 hover:text-[#3D6B3F] transition-all duration-200 text-xs font-semibold"
                          >
                            + sub
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Filas hijas */}
                    {cat.other_categorias?.map((sub) => (
                      <tr key={`sub-${sub.id_categoria}`} className="bg-[#F4F0E3]/60 hover:bg-[#C5CFB0]/20 transition-all duration-200">
                        <td className="p-4 pl-10">
                          <div className="flex items-center gap-2 text-[#1F3A2E]/80">
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#3D6B3F]/40" />
                            <span className="font-medium">{sub.nombre}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-[#1F3A2E]/60">{sub.slug}</td>
                        <td className="p-4 text-sm text-[#1F3A2E]/60">{sub.tipo}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${sub.activo ? "bg-[#A8C26B]/20 text-[#3D6B3F]" : "bg-[#C97A3E]/15 text-[#C97A3E]"}`}>
                            {sub.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="p-4">{renderAcciones(sub)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-[#C5CFB0] px-4 py-3 bg-white rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <p className="text-sm text-[#1F3A2E]">
            Mostrando <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-semibold">{Math.min(currentPage * itemsPerPage, currentList.length)}</span> de <span className="font-semibold">{currentList.length}</span> categorías
          </p>
          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm">
            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[#1F3A2E] ring-1 ring-inset ring-[#C5CFB0]">
              Página {currentPage} de {totalPages}
            </span>
            <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        </div>
      )}

      <DeleteAlertModal estado={deleteAlert.estado} onClose={deleteAlert.cerrar} />

      <SuccessToast toast={successToast.estado} onClose={successToast.cerrar} />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_24px_48px_rgba(31,58,46,0.25)] overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-lg font-semibold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">{editingCategoria ? "Editar" : "Nueva"} Categoría</h2>
              <button type="button" onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-[#C5CFB0]/30 text-[#3D6B3F]/50"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
              <div>
                <label className={labelCls}>Nombre</label>
                <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Slug</label>
                <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Jerarquía</label>
                <div className="mt-1 flex gap-3">
                  {(["categoria", "subcategoria"] as const).map((opcion) => (
                    <label key={opcion} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-150 ${formData.jerarquia === opcion ? "border-[#3D6B3F] bg-[#3D6B3F]/10 text-[#1F3A2E]" : "border-[#C5CFB0] bg-white text-[#1F3A2E]/60 hover:bg-[#F4F0E3]"}`}>
                      <input type="radio" name="jerarquia" value={opcion} checked={formData.jerarquia === opcion} onChange={() => setFormData({ ...formData, jerarquia: opcion, id_padre: "" })} className="sr-only" />
                      {opcion === "categoria" ? "Categoría" : "Subcategoría"}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Tipo</label>
                <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} className={fieldCls}>
                  <option value="general">General</option>
                  <option value="maguey">Maguey</option>
                  <option value="tipo_mezcal">Tipo Mezcal</option>
                </select>
              </div>
              {formData.jerarquia === "subcategoria" && (
                <div>
                  <label className={labelCls}>Categoría padre</label>
                  <select value={formData.id_padre} onChange={(e) => setFormData({ ...formData, id_padre: e.target.value })} required className={fieldCls}>
                    <option value="">— Selecciona una categoría —</option>
                    {padres.map((p) => (
                      <option key={p.id_categoria} value={String(p.id_categoria)}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.activo} onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} className="h-4 w-4 rounded border-[#C5CFB0] text-[#3D6B3F]" />
                <label className="text-sm text-[#1F3A2E]">Activo</label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-[#1F3A2E] border border-[#C5CFB0] hover:bg-[#C5CFB0]/30 transition-all duration-200">Cancelar</button>
                <button type="submit" className="rounded-xl bg-[#3D6B3F] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F3A2E] transition-all duration-200">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
