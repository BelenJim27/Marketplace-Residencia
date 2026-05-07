import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CotizarEnvioDto } from './dto/envios.dto';
import { ICarrierService, ShippingQuote, TrackingEvent } from './interfaces/carrier.interface';

@Injectable()
export class DhlService implements ICarrierService {
  readonly carrierCode = 'dhl';
  private readonly logger = new Logger('DhlService');
  private baseUrl: string;
  private accountNumber: string;
  private shipperCountryCode: string;
  private shipperPostalCode: string;
  private shipperCity: string;

  constructor(
    private http: HttpService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const env = this.config.get('DHL_ENV', 'sandbox');
    this.baseUrl = env === 'sandbox'
      ? 'https://express.api.dhl.com/mydhlapi/test'
      : 'https://express.api.dhl.com/mydhlapi';
    this.accountNumber = this.config.get('DHL_ACCOUNT_NUMBER', '');
    this.shipperCountryCode = this.config.get('DHL_SHIPPER_COUNTRY_CODE', 'MX');
    this.shipperPostalCode = this.config.get('DHL_SHIPPER_POSTAL_CODE', '68000');
    this.shipperCity = this.config.get('DHL_SHIPPER_CITY', 'Oaxaca de Juárez');
  }

  async cotizarEnvio(dto: CotizarEnvioDto, adultSignature = false): Promise<ShippingQuote[]> {
    const apiKey = this.config.get('DHL_API_KEY', '');
    const apiSecret = this.config.get('DHL_API_SECRET', '');
    if (!apiKey || !apiSecret || !this.accountNumber) {
      throw new Error('DHL_NOT_CONFIGURED');
    }
    try {
      const params: Record<string, any> = {
        accountNumber: this.accountNumber,
        originCountryCode: this.shipperCountryCode,
        originCityName: this.shipperCity,
        originPostalCode: this.shipperPostalCode,
        destinationCountryCode: dto.destino.pais,
        destinationCityName: dto.destino.ciudad,
        destinationPostalCode: dto.destino.codigo_postal,
        weight: dto.peso_kg,
        length: dto.largo_cm || 20,
        width: dto.ancho_cm || 15,
        height: dto.alto_cm || 15,
        plannedShippingDateAndTime: this.getNextBusinessDay(),
      };
      if (adultSignature) {
        // DHL Express adult signature (21+) value-added service code
        params.specialServices = 'SA';
      }

      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

      const response = await this.http.get(`${this.baseUrl}/rates`, {
        params,
        headers: { Authorization: `Basic ${auth}` },
        timeout: 10000,
      }).toPromise();

      if (!response) {
        return [];
      }
      return this.mapDhlResponse(response.data, dto.destino.pais);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`DHL API error: ${err.message}`, (error as any)?.response?.data);
      const apiMsg = (error as any)?.response?.data?.detail
        || (error as any)?.response?.data?.title
        || err.message;
      throw new Error(apiMsg);
    }
  }

  private mapDhlResponse(data: any, destinationCountry: string): ShippingQuote[] {
    return (data.products || []).map((product: any) => ({
      productCode: product.productCode,
      productName: product.productName,
      carrier: this.carrierCode,
      tipo: destinationCountry === 'MX' ? 'nacional' : 'internacional',
      precioTotal: product.totalPrice?.[0]?.price || 0,
      moneda: destinationCountry === 'MX' ? 'MXN' : 'USD',
      fechaEntregaEstimada: product.deliveryCapabilities?.estimatedDeliveryDateAndTime,
      diasHabilesEstimados: this.calcularDiasHabiles(product.deliveryCapabilities?.estimatedDeliveryDateAndTime),
    }));
  }

  private getNextBusinessDay(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  private calcularDiasHabiles(fecha: string): number {
    if (!fecha) return 0;
    const days = Math.ceil((new Date(fecha).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(days, 1);
  }

  async getTracking(trackingNumber: string): Promise<TrackingEvent[]> {
    try {
      const apiKey = this.config.get('DHL_API_KEY', '');
      const apiSecret = this.config.get('DHL_API_SECRET', '');
      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

      const response = await this.http.get(`${this.baseUrl}/shipments/${trackingNumber}/tracking`, {
        headers: { Authorization: `Basic ${auth}` },
        timeout: 10000,
      }).toPromise();

      if (!response) {
        return [];
      }

      return (response.data.shipments?.[0]?.events || []).map((event: any) => ({
        descripcion: event.description || event.status,
        estado: event.status,
        fecha: new Date(event.timestamp),
        ubicacion: event.location?.address || '',
      }));
    } catch (error) {
      this.logger.error(`DHL Tracking API error: ${error.message}`);
      return [];
    }
  }
}
