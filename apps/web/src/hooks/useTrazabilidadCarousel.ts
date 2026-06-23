"use client";

import { useEffect, useState } from "react";
import { landingApi } from "@/lib/landing-api";

export interface LoteAtributo {
  clave: string;
  valor: string | null;
  unidad: string | null;
  fecha: string;
}

export interface LoteInfo {
  codigo_lote: string;
  nombre_comun: string | null;
  nombre_cientifico: string | null;
  grado_alcohol: number | null;
  unidades: number | null;
  botellas_750ml: number | null;
  fecha_produccion: string | null;
  sitio: string | null;
  url_trazabilidad: string | null;
  url_foto_especie: string | null;
  productor: string | null;
  region: string | null;
  atributos: LoteAtributo[];
}

export interface ProductoTrazabilidad {
  nombre: string;
  imagen: string;
  descripcion: string;
  cantidad: number;
  lote: LoteInfo | null;
}

export function useTrazabilidadCarousel(top = 4) {
  const [productos, setProductos] = useState<ProductoTrazabilidad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    landingApi
      .topProductosConLote<ProductoTrazabilidad>(top, controller.signal)
      .then((data) => setProductos(Array.isArray(data) ? data : []))
      .catch(() => {
        if (controller.signal.aborted) return;
        setProductos([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [top]);

  return { productos, loading };
}
