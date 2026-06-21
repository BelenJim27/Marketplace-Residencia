import { useEffect, useMemo, useState } from "react";

type CategoriaProductor = {
  id_categoria: number;
  nombre: string;
  slug: string;
};

const CATEGORIAS_CON_LOTES = ["Bebidas", "Bebidas_mezcal"];

export function useProductorCategorias(skip = false) {
  const [categorias, setCategorias] = useState<CategoriaProductor[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(!skip);

  useEffect(() => {
    if (skip) { setLoadingCategorias(false); return; }
    let cancelled = false;

    fetch('/productores/mi-solicitud', {
      credentials: 'include',
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
  }, [skip]);

  const tieneLotes = useMemo(
    () => categorias.some(
      (c) => CATEGORIAS_CON_LOTES.includes(c.nombre) || CATEGORIAS_CON_LOTES.includes(c.slug)
    ),
    [categorias]
  );

  return { categorias, loadingCategorias, tieneLotes };
}