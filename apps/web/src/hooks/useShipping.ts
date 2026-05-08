"use client";

import { useState, useCallback } from "react";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";

export interface DireccionDestino {
  pais: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
}

// 3. Definido como tipo principal
export interface ShippingQuote {
  productCode: string;
  productName: string;
  carrier: string;
  tipo: 'nacional' | 'internacional';
  precioTotal: number;
  moneda: string;
  fechaEntregaEstimada: string;
  diasHabilesEstimados: number;
}

// 2. Función renombrada a useShipping
export function useShipping() {
  const [opciones, setOpciones] = useState<ShippingQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<ShippingQuote | null>(null);

  const cotizarTodos = useCallback(async (
    pesoKg: number,
    destino: DireccionDestino | null,
    dims?: { alto_cm: number; ancho_cm: number; largo_cm: number },
  ) => {
    if (!destino) {
      setError('La dirección seleccionada está incompleta (falta país, ciudad, estado o código postal). Edítala para continuar.');
      setOpciones([]);
      setSeleccionado(null);
      return;
    }
    if (!destino.codigo_postal) {
      setError('La dirección no tiene código postal. Edítala y agrega uno.');
      setOpciones([]);
      setSeleccionado(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = getCookie("token") || "";
      const data: unknown = await api.envios.cotizar(token, {
        destino,
        peso_kg: pesoKg,
        alto_cm: dims?.alto_cm ?? 15,
        ancho_cm: dims?.ancho_cm ?? 15,
        largo_cm: dims?.largo_cm ?? 20,
      });

      if (Array.isArray(data)) {
        setOpciones(data as ShippingQuote[]);
        setSeleccionado(data[0] as ShippingQuote || null);
      } else {
        setOpciones([]);
        setSeleccionado(null);
      }
    } catch (err: unknown) {
      const msg = (err as any)?.message || 'No se pudo obtener cotización de envío';
      setError(msg);
      setOpciones([]);
      setSeleccionado(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    opciones, 
    loading, 
    error, 
    seleccionado, 
    cotizarTodos, 
    setSeleccionado 
  };
}