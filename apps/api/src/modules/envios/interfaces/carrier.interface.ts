import { CotizarEnvioDto } from '../dto/envios.dto';

export interface ShippingQuote {
  productCode: string;
  productName: string;
  carrier: string;
  /** Sub-carrier real (ej. "DHL", "Paquetexpress") cuando el carrier es un agregador */
  providerName?: string;
  tipo: 'nacional' | 'internacional';
  precioTotal: number;
  moneda: string;
  fechaEntregaEstimada: string;
  diasHabilesEstimados: number;
  /** IDs para reutilizar la cotización exacta en createShipment y evitar discrepancia de precio */
  skydropxQuotationId?: string;
  skydropxRateId?: string;
}

export interface TrackingEvent {
  descripcion: string;
  estado: string;
  fecha: Date;
  ubicacion: string;
}

export interface ShipmentResult {
  trackingNumber: string;
  labelBuffer?: Buffer;
  labelFormat: string;
  cost?: number;
  currency?: string;
  carrierName?: string;
  providerShipmentId?: string;
  /** true cuando el carrier aceptó el envío pero la etiqueta/tracking aún se está generando
   *  (estado asíncrono "in_creation"). No es error: se completa luego vía refrescarGuia. */
  pending?: boolean;
  /** true cuando no se encontró la tarifa preferida y se usó la más barata como fallback */
  tarifa_fallback?: boolean;
  tarifa_original_solicitada?: string;
}

export interface ProteccionResult {
  proteccionId: string;
  costo: number;
  costoFijo: number;
  porcentaje: number;
  moneda: string;
}

export interface ICarrierService {
  readonly carrierCode: string;
  cotizarEnvio(dto: CotizarEnvioDto, adultSignature?: boolean): Promise<ShippingQuote[]>;
  getTracking(trackingNumber: string, options?: Record<string, any>): Promise<TrackingEvent[]>;
  createShipment(envio: any): Promise<ShipmentResult>;
  /** Re-consulta un envío asíncrono ya creado y, si la etiqueta está lista, la devuelve;
   *  si sigue generándose, regresa { pending: true }. */
  obtenerGuiaPendiente?(shipmentId: string): Promise<ShipmentResult>;
  protegerEnvio?(shipmentId: string, valorDeclarado: number, moneda: string): Promise<ProteccionResult>;
}
