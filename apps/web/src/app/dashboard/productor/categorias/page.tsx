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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Categorías
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Explora las categorías disponibles del sistema.
          </p>
        </div>
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
          <table className="w-full min-w-[600px] text-left">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="p-4">Nombre</th>
                <th className="p-4">Descripción</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 text-center">Orden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : filteredCategorias.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-gray-500">
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
                          ({cat.categorias.length} subcategorías)
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {cat.descripcion || "—"}
                    </td>
                    <td className="p-4 text-sm text-gray-500">{cat.tipo}</td>
                    <td className="p-4 text-center text-sm">{cat.orden}</td>
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