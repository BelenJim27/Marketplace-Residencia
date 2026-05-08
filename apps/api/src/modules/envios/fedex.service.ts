import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CotizarEnvioDto } from './dto/envios.dto';
import { ICarrierService, ShippingQuote, TrackingEvent } from './interfaces/carrier.interface';

@Injectable()
export class FedexService implements ICarrierService {
  readonly carrierCode = 'fedex';
  private readonly logger = new Logger('FedexService');
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accountNumber: string;
  private shipperCountryCode: string;
  private shipperPostalCode: string;
  private shipperCity: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  private readonly MX_STATE_CODES: Record<string, string> = {
    'aguascalientes': 'AG', 'baja california': 'BC', 'baja california sur': 'BS',
    'campeche': 'CP', 'chiapas': 'CS', 'chihuahua': 'CH',
    'ciudad de mexico': 'DF', 'cdmx': 'DF', 'distrito federal': 'DF',
    'coahuila': 'CO', 'colima': 'CL', 'durango': 'DG', 'guanajuato': 'GT',
    'guerrero': 'GR', 'hidalgo': 'HG', 'jalisco': 'JA',
    'mexico': 'ME', 'estado de mexico': 'ME', 'michoacan': 'MI',
    'morelos': 'MO', 'nayarit': 'NA', 'nuevo leon': 'NL', 'oaxaca': 'OA',
    'puebla': 'PU', 'queretaro': 'QT', 'quintana roo': 'QR',
    'san luis potosi': 'SL', 'sinaloa': 'SI', 'sonora': 'SO',
    'tabasco': 'TB', 'tamaulipas': 'TM', 'tlaxcala': 'TL',
    'veracruz': 'VE', 'yucatan': 'YU', 'zacatecas': 'ZA',
  };

  constructor(
    private http: HttpService,
    private config: ConfigService,
  ) {
    const env = this.config.get('FEDEX_ENV', 'sandbox');
    this.baseUrl = env === 'sandbox' ? 'https://apis-sandbox.fedex.com' : 'https://apis.fedex.com';
    this.clientId = this.config.get('FEDEX_CLIENT_ID', '');
    this.clientSecret = this.config.get('FEDEX_CLIENT_SECRET', '');
    this.accountNumber = this.config.get('FEDEX_ACCOUNT_NUMBER', '');
    this.shipperCountryCode = this.config.get('FEDEX_SHIPPER_COUNTRY_CODE', 'MX');
    this.shipperPostalCode = this.config.get('FEDEX_SHIPPER_POSTAL_CODE', '68000');
    this.shipperCity = this.config.get('FEDEX_SHIPPER_CITY', 'Oaxaca de Juárez');
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    if (!this.clientId || !this.clientSecret) {
      this.logger.error('FedEx credentials not configured');
      throw new HttpException('FEDEX_NOT_CONFIGURED', HttpStatus.BAD_REQUEST);
    }

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      this.logger.debug(`Solicitando token a FedEx: ${this.baseUrl}/oauth/token`);
      const response = await firstValueFrom(
        this.http.post(`${this.baseUrl}/oauth/token`, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );

      const data = response?.data;
      this.cachedToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
      return this.cachedToken!;
    } catch (error: any) {
      this.logger.error('Error obteniendo token de FedEx', error.response?.data || error.message);
      this.cachedToken = null;
      throw new HttpException('FEDEX_AUTH_FAILED', HttpStatus.UNAUTHORIZED);
    }
  }

  async cotizarEnvio(dto: CotizarEnvioDto, adultSignature = false): Promise<ShippingQuote[]> {
    if (!this.clientId || !this.clientSecret || !this.accountNumber) {
      throw new Error('FEDEX_NOT_CONFIGURED');
    }

    try {
      const token = await this.getAccessToken();

      // Normalización de Estado
      const stateRaw = dto.destino.estado || '';
      const stateKey = stateRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const stateOrProvinceCode = (this.MX_STATE_CODES[stateKey] ?? stateRaw.substring(0, 2).toUpperCase()) || undefined;

      const body: any = {
        accountNumber: { value: this.accountNumber },
        requestedShipment: {
          shipper: {
            address: {
              postalCode: this.shipperPostalCode,
              countryCode: this.shipperCountryCode,
            },
          },
          recipient: {
            address: {
              city: dto.destino.ciudad,
              stateOrProvinceCode,
              postalCode: dto.destino.codigo_postal,
              countryCode: dto.destino.pais,
              residential: false,
            },
          },
          // Cambio sugerido: DROPOFF es más estable en Sandbox
          pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
          shippingChargesPayment: {
            paymentType: 'SENDER',
            payor: {
              responsibleParty: {
                accountNumber: { value: this.accountNumber }
              }
            }
          },
          requestedPackageLineItems: [
            {
              weight: { units: 'KG', value: Number(dto.peso_kg) },
              dimensions: {
                length: Math.round(dto.largo_cm || 20),
                width: Math.round(dto.ancho_cm || 15),
                height: Math.round(dto.alto_cm || 15),
                units: 'CM',
              },
            },
          ],
          rateRequestType: ['LIST', 'PREFERRED'],
        },
      };

      // Manejo de Aduanas para Internacional
      if (dto.destino.pais !== 'MX') {
        body.requestedShipment.customsClearanceDetail = {
          dutiesPayment: {
            paymentType: 'SENDER',
            payor: { responsibleParty: { accountNumber: { value: this.accountNumber } } }
          },
          documentShipment: false,
          commodities: [{
            description: 'Export Goods',
            countryOfManufacture: 'MX',
            quantity: 1,
            quantityUnits: 'PCS',
            unitPrice: { amount: 10.00, currency: 'USD' },
            customsValue: { amount: 10.00, currency: 'USD' },
            weight: { units: 'KG', value: Number(dto.peso_kg) }
          }]
        };
      }

      if (adultSignature) {
        body.requestedShipment.specialServicesRequested = {
          specialServiceTypes: ['ADULT_SIGNATURE_REQUIRED'],
        };
      }

      const response = await firstValueFrom(
        this.http.post(`${this.baseUrl}/rate/v1/rates/quotes`, body, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-locale': 'es_MX',
          },
        })
      );

      if (!response?.data) return [];
      return this.mapFedexResponse(response.data, dto.destino.pais);

    } catch (error: any) {
      const status = error.response?.status;
      const fedexErrors = error.response?.data?.errors;
      
      this.logger.error(`FedEx Rate API error [${status}]:`, fedexErrors || error.message);
      
      if (status === 403) {
        throw new HttpException(
          'Acceso Prohibido (403): Tu API Key no tiene permisos para la Rate API o el número de cuenta no está vinculado al proyecto.',
          HttpStatus.FORBIDDEN
        );
      }
      
      const apiMsg = fedexErrors?.[0]?.message || error.message;
      throw new HttpException(`FedEx dice: ${apiMsg}`, HttpStatus.BAD_REQUEST);
    }
  }

  private mapFedexResponse(data: any, destinationCountry: string): ShippingQuote[] {
    const rateReplyDetails: any[] = data.output?.rateReplyDetails || [];
    const seen = new Set<string>();
    const quotes: ShippingQuote[] = [];

    for (const rate of rateReplyDetails) {
      const serviceType: string = rate.serviceType || '';
      if (seen.has(serviceType)) continue;
      seen.add(serviceType);

      const ratedShipments: any[] = rate.ratedShipmentDetails || [];
      const preferred = ratedShipments.find((r: any) => r.rateType === 'PREFERRED_CURRENCY')
        ?? ratedShipments.find((r: any) => r.rateType === 'PAYOR_ACCOUNT_PACKAGE')
        ?? ratedShipments[0];

      if (!preferred) continue;

      const totalCharge = preferred.totalNetChargeWithDutiesAndTaxes ?? preferred.totalNetCharge;
      const currency: string = preferred.currency || (destinationCountry === 'MX' ? 'MXN' : 'USD');
      const deliveryDate: string = rate.operationalDetail?.deliveryDate || '';

      quotes.push({
        productCode: serviceType,
        productName: this.humanizeFedexService(serviceType),
        carrier: this.carrierCode,
        tipo: destinationCountry === 'MX' ? 'nacional' : 'internacional',
        precioTotal: Number(totalCharge) || 0,
        moneda: currency,
        fechaEntregaEstimada: deliveryDate,
        diasHabilesEstimados: this.calcularDiasHabiles(deliveryDate),
      });
    }

    return quotes;
  }

  private humanizeFedexService(serviceType: string): string {
    const names: Record<string, string> = {
      FEDEX_INTERNATIONAL_PRIORITY: 'FedEx International Priority',
      FEDEX_INTERNATIONAL_ECONOMY: 'FedEx International Economy',
      INTERNATIONAL_FIRST: 'FedEx International First',
      FEDEX_GROUND: 'FedEx Ground',
      FEDEX_EXPRESS_SAVER: 'FedEx Express Saver',
      STANDARD_OVERNIGHT: 'FedEx Standard Overnight',
      PRIORITY_OVERNIGHT: 'FedEx Priority Overnight',
    };
    return names[serviceType] ?? serviceType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  async getTracking(trackingNumber: string): Promise<TrackingEvent[]> {
    try {
      const token = await this.getAccessToken();
      const body = {
        includeDetailedScans: true,
        trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
      };

      const response = await firstValueFrom(
        this.http.post(`${this.baseUrl}/track/v1/trackingnumbers`, body, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
      );

      const trackResults = response.data.output?.completeTrackResults?.[0]?.trackResults?.[0];
      const scanEvents = trackResults?.scanEvents || [];

      if (scanEvents.length === 0 && trackResults?.latestStatusDetail) {
        return [{
          descripcion: trackResults.latestStatusDetail.description,
          estado: trackResults.latestStatusDetail.statusByLocale,
          fecha: new Date(),
          ubicacion: 'En tránsito'
        }];
      }

      return scanEvents.map((event: any) => ({
        descripcion: event.eventDescription || event.eventType,
        estado: event.derivedStatus || event.eventType,
        fecha: new Date(event.date),
        ubicacion: [event.scanLocation?.city, event.scanLocation?.countryCode].filter(Boolean).join(', '),
      }));
    } catch (error: any) {
      this.logger.error(`Error de tracking: ${error.message}`);
      return [];
    }
  }

  private calcularDiasHabiles(fecha: string): number {
    if (!fecha) return 0;
    const diff = new Date(fecha).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  }
}