"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface Categoria {
  id_categoria: number;
  nombre: string;
  slug: string;
  descripcion?: string | null;
  tipo?: string | null;
  imagen_url?: string | null;
  activo: boolean;
  id_padre?: number | null;
}

export function useCategorias(limit = 4) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (api.categorias.getAll() as Promise<Categoria[]>)
      .then((data) => {
        setCategorias(
          data
            .filter((c) => c.activo && (c.id_padre == null || c.id_padre === 0))
            .slice(0, limit),
        );
      })
      .catch(() => setCategorias([]))
      .finally(() => setLoading(false));
  }, [limit]);

  return { categorias, loading };
}
