import { CotizarEnvioDto } from '../dto/envios.dto';

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
}

export interface ICarrierService {
  readonly carrierCode: string;
  cotizarEnvio(dto: CotizarEnvioDto, adultSignature?: boolean): Promise<ShippingQuote[]>;
  getTracking(trackingNumber: string): Promise<TrackingEvent[]>;
  createShipment(envio: any): Promise<ShipmentResult>;
}
