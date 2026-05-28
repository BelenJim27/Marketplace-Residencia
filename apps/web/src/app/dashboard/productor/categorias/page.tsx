"use client";

import { Search } from "lucide-react";
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

const API_URL = "";

export default function CategoriasProductorPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <h1 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Categorías</h1>
        <p className="text-sm text-[#3D6B3F]/70">Explora las categorías disponibles del sistema.</p>
      </div>

      {notice && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${
          notice.type === "success"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {notice.message}
        </div>
      )}

      {/* Search */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3D6B3F]/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar categorías..."
            className="w-full rounded-xl border border-[#C5CFB0] bg-transparent py-3 pl-12 pr-4 text-sm text-[#1F3A2E] placeholder:text-[#3D6B3F]/40 outline-none focus:border-[#3D6B3F] focus:ring-1 focus:ring-[#3D6B3F]/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left">
            <thead className="bg-[#1F3A2E]">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4">Descripción</th>
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4 text-center">Orden</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-[#3D6B3F]/60">
                    Cargando...
                  </td>
                </tr>
              ) : filteredCategorias.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-[#3D6B3F]/60">
                    No hay categorías.
                  </td>
                </tr>
              ) : (
                filteredCategorias.map((cat) => (
                  <tr key={cat.id_categoria}
                    className="border-t border-[#C5CFB0]/30 bg-white text-sm transition-colors odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20">
                    <td className="px-5 py-4 font-medium text-[#1F3A2E]">
                      {cat.nombre}
                      {cat.categorias && cat.categorias.length > 0 && (
                        <span className="ml-2 text-xs text-[#3D6B3F]/50">
                          ({cat.categorias.length} subcategorías)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#3D6B3F]/70">
                      {cat.descripcion || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#3D6B3F]/70">{cat.tipo}</td>
                    <td className="px-5 py-4 text-center text-sm text-[#3D6B3F]/70">{cat.orden}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
