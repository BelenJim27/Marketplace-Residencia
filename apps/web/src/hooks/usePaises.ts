"use client";

import { useEffect, useState } from "react";
import { api, type Pais } from "@/lib/api";

type Filter = "venta" | "envio" | "todos";

const cache: Record<Filter, Pais[] | undefined> = {
  venta: undefined,
  envio: undefined,
  todos: undefined,
};
const inflight: Record<Filter, Promise<Pais[]> | undefined> = {
  venta: undefined,
  envio: undefined,
  todos: undefined,
};

function fetchPaises(filter: Filter): Promise<Pais[]> {
  if (cache[filter]) return Promise.resolve(cache[filter]!);
  if (inflight[filter]) return inflight[filter]!;

  const q =
    filter === "venta"
      ? { activo_venta: true }
      : filter === "envio"
        ? { activo_envio: true }
        : undefined;

  inflight[filter] = api.paises
    .list(q)
    .then((paises) => {
      cache[filter] = paises;
      return paises;
    })
    .finally(() => {
      inflight[filter] = undefined;
    });

  return inflight[filter]!;
}

/**
 * Hook que devuelve el catálogo de países cacheado en memoria.
 * - filter='envio' (default): solo países con activo_envio=true (uso típico: direcciones / checkout)
 * - filter='venta': países con activo_venta=true
 * - filter='todos': sin filtro (uso típico: admin)
 */
export function usePaises(filter: Filter = "envio") {
  const [paises, setPaises] = useState<Pais[]>(cache[filter] ?? []);
  const [loading, setLoading] = useState<boolean>(!cache[filter]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (cache[filter]) {
      setPaises(cache[filter]!);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPaises(filter)
      .then((res) => {
        if (!cancelled) {
          setPaises(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Error cargando países");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return { paises, loading, error };
}
