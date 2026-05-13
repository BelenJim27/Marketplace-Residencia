// context/ProductorContext.tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCookie } from "@/lib/cookies";

type CategoriaProductor = {
  id_categoria: number;
  nombre: string;
  slug: string;
};

type ProductorContextType = {
  categorias: CategoriaProductor[];
  tieneLotes: boolean;
  loadingCategorias: boolean;
};

const CATEGORIAS_CON_LOTES = ["Bebidas", "Bebidas_mezcal"];

const ProductorContext = createContext<ProductorContextType>({
  categorias: [],
  tieneLotes: false,
  loadingCategorias: true,
});

export function ProductorProvider({ children }: { children: React.ReactNode }) {
  const [categorias, setCategorias] = useState<CategoriaProductor[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const token = getCookie("token") ?? "";

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
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingCategorias(false); });

    return () => { cancelled = true; };
  }, [token]);

  const tieneLotes = useMemo(
    () => categorias.some(
      (c) => CATEGORIAS_CON_LOTES.includes(c.nombre) || CATEGORIAS_CON_LOTES.includes(c.slug)
    ),
    [categorias]
  );

  return (
    <ProductorContext.Provider value={{ categorias, tieneLotes, loadingCategorias }}>
      {children}
    </ProductorContext.Provider>
  );
}

export const useProductorContext = () => useContext(ProductorContext);