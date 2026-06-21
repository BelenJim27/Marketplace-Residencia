"use client";

import { useState, useCallback, useMemo } from "react";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";

export interface DireccionDestino {
  pais: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
}

export interface ShippingQuote {
  productCode: string;
  productName: string;
  carrier: string;
  providerName?: string;
  tipo: 'nacional' | 'internacional';
  precioTotal: number;
  moneda: string;
  fechaEntregaEstimada: string;
  diasHabilesEstimados: number;
  skydropxQuotationId?: string;
  skydropxRateId?: string;
}

export interface GrupoEnvio {
  id_productor: number;
  nombre_productor: string;
  peso_real_kg: number;
  peso_volumetrico_kg: number;
  peso_facturable_kg: number;
  dimensiones: { largo_cm: number; ancho_cm: number; alto_cm: number };
  contiene_alcohol?: boolean;
  valor_declarado_mxn?: number;
  proteccion_estimada_mxn?: number;
  quotes: ShippingQuote[];
  error?: string;
}

export interface OpcionAgregada {
  key: string;                                        // "FedEx|FedEx International Economy"
  providerName: string;                               // "FedEx"
  productName: string;                                // "FedEx International Economy"
  precioTotal: number;                                // suma de todos los grupos (en moneda original)
  moneda: string;
  diasMax: number;                                    // max(diasHabilesEstimados)
  tipo: 'nacional' | 'internacional';
  quotesByProductor: Record<number, ShippingQuote>;   // para derivar seleccionados
  totalProteccionEstimadaMXN: number;                 // suma estimada de seguro por productor
}

function buildOpcionesAgregadas(grupos: GrupoEnvio[]): OpcionAgregada[] {
  if (!grupos.length) return [];

  const map = new Map<string, OpcionAgregada>();

  for (const grupo of grupos) {
    for (const q of grupo.quotes) {
      const key = `${q.providerName ?? q.carrier}|${q.productName}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          providerName: q.providerName ?? q.carrier,
          productName: q.productName,
          precioTotal: 0,
          moneda: q.moneda,
          diasMax: 0,
          tipo: q.tipo,
          quotesByProductor: {},
          totalProteccionEstimadaMXN: 0,
        });
      }
      const agg = map.get(key)!;
      agg.precioTotal += q.precioTotal;
      agg.diasMax = Math.max(agg.diasMax, q.diasHabilesEstimados);
      agg.quotesByProductor[grupo.id_productor] = q;
      agg.totalProteccionEstimadaMXN += grupo.proteccion_estimada_mxn ?? 0;
    }
  }

  // Only show options that cover ALL producer groups
  const completas = [...map.values()].filter(
    a => grupos.every(g => a.quotesByProductor[g.id_productor] != null),
  );

  if (completas.length > 0) {
    return completas.sort((a, b) => a.precioTotal - b.precioTotal);
  }

  // Fallback: no complete option (different carriers per producer).
  // Return cheapest per producer aggregated as a single synthetic option.
  const syntheticKey = '__cheapest__';
  const synthetic: OpcionAgregada = {
    key: syntheticKey,
    providerName: 'Más económico',
    productName: 'Opción más económica por vendedor',
    precioTotal: 0,
    moneda: grupos[0]?.quotes[0]?.moneda ?? 'MXN',
    diasMax: 0,
    tipo: grupos[0]?.quotes[0]?.tipo ?? 'internacional',
    quotesByProductor: {},
    totalProteccionEstimadaMXN: 0,
  };
  for (const grupo of grupos) {
    const cheapest = grupo.quotes[0]; // already sorted cheapest first by backend
    if (cheapest) {
      synthetic.precioTotal += cheapest.precioTotal;
      synthetic.diasMax = Math.max(synthetic.diasMax, cheapest.diasHabilesEstimados);
      synthetic.quotesByProductor[grupo.id_productor] = cheapest;
      synthetic.totalProteccionEstimadaMXN += grupo.proteccion_estimada_mxn ?? 0;
    }
  }
  // If no producer had any quotes, don't show a $0 phantom option
  if (Object.keys(synthetic.quotesByProductor).length === 0) return [];
  return [synthetic];
}

export function useShipping() {
  const [grupos, setGrupos] = useState<GrupoEnvio[]>([]);
  const [nivelKey, setNivelKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opcionesAgregadas = useMemo(() => buildOpcionesAgregadas(grupos), [grupos]);

  // seleccionados is derived from nivelKey — one ShippingQuote per producer
  const seleccionados = useMemo<Record<number, ShippingQuote>>(() => {
    if (!nivelKey) return {};
    const opcion = opcionesAgregadas.find(o => o.key === nivelKey);
    if (!opcion) return {};
    const result: Record<number, ShippingQuote> = {};
    for (const g of grupos) {
      const q = opcion.quotesByProductor[g.id_productor] ?? g.quotes[0];
      if (q) result[g.id_productor] = q;
    }
    console.group(`[useShipping] Guías asignadas por productor → opción: "${opcion.productName}"`);
    for (const [idP, q] of Object.entries(result)) {
      const nombre = grupos.find(g => g.id_productor === Number(idP))?.nombre_productor ?? `Prod ${idP}`;
      console.log(`  🚚 ${nombre} (id=${idP}): ${q.productName} · $${q.precioTotal} ${q.moneda} · ${q.diasHabilesEstimados} días`);
    }
    const total = Object.values(result).reduce((s, q) => s + q.precioTotal, 0);
    console.log(`  💰 Total envío: $${total.toFixed(2)}`);
    console.groupEnd();
    return result;
  }, [nivelKey, opcionesAgregadas, grupos]);

  const setNivel = useCallback((key: string) => {
    setNivelKey(key);
  }, []);

  const cotizarPorCarrito = useCallback(async (
    items: Array<{ id_producto: number; cantidad: number }>,
    destino: DireccionDestino | null,
  ) => {
    if (!destino) {
      setError('La dirección seleccionada está incompleta (falta país, ciudad, estado o código postal). Edítala para continuar.');
      setGrupos([]);
      setNivelKey(null);
      return;
    }
    if (!destino.codigo_postal) {
      setError('La dirección no tiene código postal. Edítala y agrega uno.');
      setGrupos([]);
      setNivelKey(null);
      return;
    }
    if (!items.length) {
      setGrupos([]);
      setNivelKey(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = getCookie("token") || "";
      const data = await api.envios.cotizarCarrito(token, { items, destino });
      const gs: GrupoEnvio[] = Array.isArray(data) ? data : [];
      setGrupos(gs);

      // Log per-producer quotes for debugging
      console.group('[useShipping] Cotizaciones por productor');
      for (const g of gs) {
        console.group(`📦 ${g.nombre_productor} (id=${g.id_productor}) — ${g.peso_facturable_kg?.toFixed(2)} kg facturable`);
        if (g.error) {
          console.warn('Error:', g.error);
        } else {
          for (const q of g.quotes) {
            console.log(`  ${q.providerName ?? q.carrier} | ${q.productName} | $${q.precioTotal} ${q.moneda} | ${q.diasHabilesEstimados} días`);
          }
        }
        console.groupEnd();
      }
      console.groupEnd();

      // Auto-select cheapest aggregated option
      const opciones = buildOpcionesAgregadas(gs);
      if (opciones.length > 0) {
        setNivelKey(opciones[0].key);
        console.group('[useShipping] Opciones agregadas (precio = suma por productor)');
        for (const op of opciones) {
          const desglose = Object.entries(op.quotesByProductor)
            .map(([idP, q]) => {
              const grupo = gs.find(g => g.id_productor === Number(idP));
              return `${grupo?.nombre_productor ?? `Prod ${idP}`}: $${q.precioTotal} ${q.moneda}`;
            })
            .join(' + ');
          console.log(`${op.key === opciones[0].key ? '✅' : '  '} ${op.productName} | Total: $${op.precioTotal} ${op.moneda} | ${op.diasMax} días | (${desglose})`);
        }
        console.groupEnd();
      } else {
        setNivelKey(null);
      }
    } catch (err: unknown) {
      const msg = (err as any)?.message ?? 'No se pudo obtener cotización de envío';
      setError(msg);
      setGrupos([]);
      setNivelKey(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const todosSeleccionados =
    nivelKey !== null &&
    opcionesAgregadas.length > 0 &&
    grupos.length > 0;

  const tieneAlcohol = grupos.some(g => g.contiene_alcohol);

  return {
    grupos,
    opcionesAgregadas,
    nivelKey,
    setNivel,
    seleccionados,
    loading,
    error,
    cotizarPorCarrito,
    todosSeleccionados,
    tieneAlcohol,
  };
}
