export type CheckoutStep = "direccion" | "envio" | "pago" | "resumen";

export interface Direccion {
  id_direccion?: number | string;
  id?: number | string;
  nombre_destinatario?: string;
  telefono?: string;
  nombre_etiqueta?: string;
  es_predeterminada?: boolean;
  es_internacional?: boolean;
  
  // Campos para direcciones nacionales (México)
  calle?: string;
  numero?: string;
  colonia?: string;
  
  // Campos para direcciones internacionales
  linea_1?: string;
  linea_2?: string;
  
  // Campos comunes
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  pais_iso2?: string;
  tipo?: string;
  referencia?: string;
  ubicacion?: Record<string, unknown>;
}

export interface TarjetaMock {
  numero: string;
  expiracion: string;
  cvv: string;
  nombre: string;
}
