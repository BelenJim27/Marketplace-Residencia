import { useEffect, useMemo, useState } from "react";

type CategoriaProductor = {
  id_categoria: number;
  nombre: string;
  slug: string;
};

const CATEGORIAS_CON_LOTES = ["Bebidas", "Bebidas_mezcal"];

export function useProductorCategorias(token: string) {
  const [categorias, setCategorias] = useState<CategoriaProductor[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  useEffect(() => {
    if (!token) { setLoadingCategorias(false); return; }
    let cancelled = false;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/productores/mi-solicitud`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled) return;
        setCategorias(Array.isArray(data?.categorias) ? data.categorias : []);
      })
       .catch((err) => {
    console.error("error mi-solicitud:", err); 
  })
      .finally(() => { if (!cancelled) setLoadingCategorias(false); });

    return () => { cancelled = true; };
  }, [token]);

  const tieneLotes = useMemo(
    () => categorias.some(
      (c) => CATEGORIAS_CON_LOTES.includes(c.nombre) || CATEGORIAS_CON_LOTES.includes(c.slug)
    ),
    [categorias]
  );

  return { categorias, loadingCategorias, tieneLotes };
}