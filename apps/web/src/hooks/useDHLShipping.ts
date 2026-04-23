export type DHLServiceType = "express" | "estandar" | "economico";

export interface DHLQuote {
  proveedor: "DHL";
  servicio: string;
  precio: number;
  diasEntrega: string;
  pesoKg: number;
}

const SERVICIOS: Record<DHLServiceType, { nombre: string; base: number; porKg: number; dias: string }> = {
  express: { nombre: "DHL Express", base: 250, porKg: 30, dias: "1-2 días hábiles" },
  estandar: { nombre: "DHL Estándar", base: 150, porKg: 20, dias: "3-5 días hábiles" },
  economico: { nombre: "DHL Económico", base: 80, porKg: 10, dias: "7-10 días hábiles" },
};

export function useDHLShipping() {
  function calcular(pesoKg: number, _destino: string, tipo: DHLServiceType): DHLQuote {
    const servicio = SERVICIOS[tipo];
    const precio = Math.round(servicio.base + pesoKg * servicio.porKg);
    return {
      proveedor: "DHL",
      servicio: servicio.nombre,
      precio,
      diasEntrega: servicio.dias,
      pesoKg,
    };
  }

  function cotizarTodos(pesoKg: number, destino: string): DHLQuote[] {
    return (["express", "estandar", "economico"] as DHLServiceType[]).map((tipo) =>
      calcular(pesoKg, destino, tipo)
    );
  }

  return { calcular, cotizarTodos };
}
