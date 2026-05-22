import { useEffect, useMemo, useState } from "react";

type CategoriaProductor = {
  id_categoria: number;
  nombre: string;
  slug: string;
};

const CATEGORIAS_CON_LOTES = ["Bebidas", "Bebidas_mezcal"];

export function useProductorCategorias(token: string, skip = false) {
  const [categorias, setCategorias] = useState<CategoriaProductor[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(!skip);

  useEffect(() => {
    if (skip || !token) { setLoadingCategorias(false); return; }
    let cancelled = false;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/productores/mi-solicitud`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) return null;
        return r.text().then((text) => {
          if (!text || !text.trim()) return null;
          try { return JSON.parse(text); } catch { return null; }
        });
      })
      .then((data) => {
        if (cancelled) return;
        setCategorias(Array.isArray(data?.categorias) ? data.categorias : []);
      })
      .catch(() => { /* best-effort */ })
      .finally(() => { if (!cancelled) setLoadingCategorias(false); });

    return () => { cancelled = true; };
  }, [token, skip]);

  const tieneLotes = useMemo(
    () => categorias.some(
      (c) => CATEGORIAS_CON_LOTES.includes(c.nombre) || CATEGORIAS_CON_LOTES.includes(c.slug)
    ),
    [categorias]
  );

  return { categorias, loadingCategorias, tieneLotes };
}