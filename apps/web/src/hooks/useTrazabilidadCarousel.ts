"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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
    api.estadisticas
      .topProductosConLote(top)
      .then((data: any) => setProductos(Array.isArray(data) ? data : []))
      .catch(() => setProductos([]))
      .finally(() => setLoading(false));
  }, [top]);

  return { productos, loading };
}
