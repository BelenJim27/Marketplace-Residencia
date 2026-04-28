"use client";

import { useState, useCallback } from "react";
import { getCookie } from "@/lib/cookies";

export interface DireccionDestino {
  pais: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
}

export interface DHLQuote {
  productCode: string;
  productName: string;
  tipo: 'nacional' | 'internacional';
  precioTotal: number;
  moneda: string;
  fechaEntregaEstimada: string;
  diasHabilesEstimados: number;
}

export function useDHLShipping() {
  const [opciones, setOpciones] = useState<DHLQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<DHLQuote | null>(null);

  const cotizarTodos = useCallback(async (pesoKg: number, destino: DireccionDestino | null) => {
    if (!destino?.codigo_postal) {
      setOpciones([]);
      setSeleccionado(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = getCookie("token") || "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/envios/cotizar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          destino,
          peso_kg: pesoKg,
          alto_cm: 15,
          ancho_cm: 15,
          largo_cm: 20,
        }),
      });

      if (!res.ok) throw new Error('Cotización fallida');
      const data = await res.json();
      setOpciones(data);
      setSeleccionado(data[0] || null);
    } catch (err) {
      setError('No se pudo obtener cotización de DHL');
      setOpciones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { opciones, loading, error, seleccionado, cotizarTodos, setSeleccionado };
}
