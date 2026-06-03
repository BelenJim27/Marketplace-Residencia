import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CotizarEnvioDto } from './dto/envios.dto';
import { ICarrierService, ShippingQuote, TrackingEvent, ShipmentResult } from './interfaces/carrier.interface';

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
  private shipperName: string;
  private shipperPhone: string;
  private shipperCompany: string;
  private shipperStreet: string;
  private shipperStateCode: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  private readonly MX_STATE_CODES: Record<string, string> = {
    'aguascalientes': 'AG', 'baja california': 'BC', 'baja california sur': 'BS',
    'campeche': 'CP', 'chiapas': 'CS', 'chihuahua': 'CH',
    'ciudad de mexico': 'CMX', 'cdmx': 'CMX', 'distrito federal': 'CMX',
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
    this.shipperName = this.config.get('FEDEX_SHIPPER_NAME', 'Productor Mezcal');
    this.shipperPhone = this.config.get('FEDEX_SHIPPER_PHONE', '9511234567');
    this.shipperCompany = this.config.get('FEDEX_SHIPPER_COMPANY', '');
    this.shipperStreet = this.config.get('FEDEX_SHIPPER_STREET', 'Calle Principal 1');
    this.shipperStateCode = this.config.get('FEDEX_SHIPPER_STATE_CODE', 'OA');
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

    // Domestic MX: PRIORITY_OVERNIGHT and STANDARD_OVERNIGHT are the Express services for Mexico.
    // FEDEX_EXPRESS_SAVER and FEDEX_2_DAY are US-domestic only and fail for MX routes.
    const MX_DOMESTIC_SERVICES = ['PRIORITY_OVERNIGHT', 'STANDARD_OVERNIGHT'];
    const isInternational = dto.destino.pais !== 'MX';

    if (isInternational && (dto.valor_declarado_usd == null || dto.valor_declarado_usd <= 0)) {
      throw new HttpException(
        'valor_declarado_usd es obligatorio y debe ser mayor a 0 para envíos internacionales (requerido por aduanas)',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const token = await this.getAccessToken();

      // Normalización de Estado
      const stateRaw = dto.destino.estado || '';
      const stateKey = stateRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const stateOrProvinceCode = (this.MX_STATE_CODES[stateKey] ?? stateRaw.substring(0, 2).toUpperCase()) || undefined;

      const baseBody: any = {
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
              residential: true,
            },
          },
          pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
          shippingChargesPayment: {
            paymentType: 'SENDER',
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
          rateRequestType: ['ACCOUNT', 'LIST'],
        },
      };

      // Manejo de Aduanas para Internacional
      if (isInternational) {
        baseBody.requestedShipment.customsClearanceDetail = {
          dutiesPayment: {
            paymentType: 'SENDER',
            payor: { responsibleParty: { accountNumber: { value: this.accountNumber } } }
          },
          documentShipment: false,
          commodities: [{
            // US Customs requires English descriptions for international shipments.
            description: dto.descripcion_contenido_en ?? dto.descripcion_contenido ?? 'Artisanal Mezcal - Distilled Agave Spirit',
            countryOfManufacture: 'MX',
            quantity: 1,
            quantityUnits: 'PCS',
            unitPrice: { amount: dto.valor_declarado_usd, currency: 'USD' },
            customsValue: { amount: dto.valor_declarado_usd, currency: 'USD' },
            weight: { units: 'KG', value: Number(dto.peso_kg) }
          }]
        };
      }

      if (adultSignature) {
        baseBody.requestedShipment.specialServicesRequested = {
          specialServiceTypes: ['ADULT_SIGNATURE_REQUIRED'],
        };
      }

      const quotes: ShippingQuote[] = [];
      let lastError = '';
      const rateHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-locale': 'es_MX',
      };

      if (isInternational) {
        // International: single request with no serviceType — FedEx returns all available
        // services for the route. Specifying serviceType for international from MX triggers
        // "service type missing or invalid" in sandbox.
        const body = JSON.parse(JSON.stringify(baseBody));
        body.requestedShipment.packagingType = 'YOUR_PACKAGING';
        try {
          const response = await firstValueFrom(
            this.http.post(`${this.baseUrl}/rate/v1/rates/quotes`, body, { headers: rateHeaders })
          );
          if (response?.data) {
            quotes.push(...this.mapFedexResponse(response.data, dto.destino.pais));
            this.logger.debug(`FedEx Rate international success: ${quotes.length} quotes`);
          }
        } catch (err: any) {
          const fedexErrors = err?.response?.data?.errors;
          const code = fedexErrors?.[0]?.code || '';
          lastError = fedexErrors?.[0]?.message || err?.message || '';
          this.logger.warn(`FedEx Rate international [${err?.response?.status}] (${code}): ${lastError}`);
        }
      } else {
        // Domestic MX: parallel per-service to isolate packaging combination failures.
        const results = await Promise.allSettled(
          MX_DOMESTIC_SERVICES.map((serviceType) => {
            const body = JSON.parse(JSON.stringify(baseBody));
            body.requestedShipment.serviceType = serviceType;
            body.requestedShipment.packagingType = 'YOUR_PACKAGING';
            return firstValueFrom(
              this.http.post(`${this.baseUrl}/rate/v1/rates/quotes`, body, { headers: rateHeaders })
            );
          })
        );

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === 'fulfilled' && result.value?.data) {
            this.logger.debug(`FedEx Rate success for ${MX_DOMESTIC_SERVICES[i]}`);
            quotes.push(...this.mapFedexResponse(result.value.data, dto.destino.pais));
          } else if (result.status === 'rejected') {
            const error = result.reason;
            const fedexErrors = error?.response?.data?.errors;
            const code = fedexErrors?.[0]?.code || '';
            const apiMsg = fedexErrors?.[0]?.message || error?.message || '';
            this.logger.warn(`FedEx Rate skipped ${MX_DOMESTIC_SERVICES[i]} [${error?.response?.status}] (${code}): ${apiMsg}`);
            lastError = apiMsg;
          }
        }
      }

      if (quotes.length === 0) {
        const isSandbox = this.config.get('FEDEX_ENV', 'sandbox') === 'sandbox';
        if (isSandbox) {
          // Mocks solo en desarrollo/sandbox; en producción FEDEX_ENV debe ser 'production'.
          // Si ves estas tarifas en prod, verifica la variable de entorno FEDEX_ENV.
          this.logger.warn(
            `[FedEx] SANDBOX: sin cotizaciones reales. Retornando tarifas mock. ` +
            `PRODUCCIÓN requiere FEDEX_ENV=production. Ruta: ${isInternational ? 'internacional' : 'nacional'}`,
          );
          if (isInternational) {
            return [
              { productCode: 'FEDEX_INTERNATIONAL_PRIORITY', productName: 'FedEx International Priority (SANDBOX)', carrier: 'fedex', tipo: 'internacional' as const, precioTotal: 85, moneda: 'USD', fechaEntregaEstimada: '', diasHabilesEstimados: 3 },
              { productCode: 'FEDEX_INTERNATIONAL_ECONOMY', productName: 'FedEx International Economy (SANDBOX)', carrier: 'fedex', tipo: 'internacional' as const, precioTotal: 55, moneda: 'USD', fechaEntregaEstimada: '', diasHabilesEstimados: 6 },
            ];
          }
          return [
            { productCode: 'PRIORITY_OVERNIGHT', productName: 'FedEx Priority Overnight (SANDBOX)', carrier: 'fedex', tipo: 'nacional' as const, precioTotal: 450, moneda: 'MXN', fechaEntregaEstimada: '', diasHabilesEstimados: 1 },
            { productCode: 'STANDARD_OVERNIGHT', productName: 'FedEx Standard Overnight (SANDBOX)', carrier: 'fedex', tipo: 'nacional' as const, precioTotal: 320, moneda: 'MXN', fechaEntregaEstimada: '', diasHabilesEstimados: 1 },
          ];
        }
        if (lastError) {
          throw new HttpException(`FedEx dice: ${lastError}`, HttpStatus.BAD_REQUEST);
        }
        throw new HttpException('FedEx dice: Sin cotizaciones disponibles', HttpStatus.BAD_REQUEST);
      }

      return quotes;

    } catch (error: any) {
      if (error instanceof HttpException) throw error;
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

  async createShipment(envio: any): Promise<ShipmentResult> {
    if (!this.clientId || !this.clientSecret || !this.accountNumber) {
      throw new HttpException('FEDEX_NOT_CONFIGURED', HttpStatus.BAD_REQUEST);
    }

    const token = await this.getAccessToken();
    const snap = envio.pedidos?.direccion_envio_snapshot ?? {};
    const serviceType: string = envio.servicios_envio?.codigo_servicio ?? 'FEDEX_GROUND';
    const destCountry: string = snap.pais_iso2 ?? snap.pais ?? 'MX';

    const stateRaw: string = snap.estado ?? snap.state ?? '';
    const stateKey = stateRaw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const recipientState = (this.MX_STATE_CODES[stateKey] ?? stateRaw.substring(0, 2).toUpperCase()) || undefined;

    const streetLines = [
      snap.linea_1 ?? snap.calle ?? 'Sin direccion',
      snap.linea_2 ?? snap.colonia,
    ].filter((s) => typeof s === 'string' && s.trim().length > 0);
    if (streetLines.length === 0) streetLines.push('Sin direccion');

    // FedEx rejects all-zero phone numbers; fall back to a fictitious but well-formed number.
    const cleanPhone = (raw: string | undefined) => {
      const digits = (raw ?? '').replace(/\D/g, '');
      if (!digits) return '5550000000';
      const trimmed = digits.slice(-10).padStart(10, '0');
      return trimmed === '0000000000' ? '5550000000' : trimmed;
    };

    const body: any = {
      labelResponseOptions: 'LABEL',
      accountNumber: { value: this.accountNumber },
      requestedShipment: {
        shipper: {
          contact: {
            personName: envio.productor?.nombre_marca || this.shipperName || 'Remitente',
            phoneNumber: cleanPhone(envio.productor?.bodega_telefono ?? this.shipperPhone),
            ...(this.shipperCompany && { companyName: this.shipperCompany }),
          },
          address: {
            streetLines: [envio.productor?.bodega_calle || this.shipperStreet || 'Sin direccion'],
            city: envio.productor?.bodega_ciudad || this.shipperCity || 'Oaxaca de Juarez',
            stateOrProvinceCode: this.shipperStateCode || 'OA',
            postalCode: envio.productor?.bodega_codigo_postal || this.shipperPostalCode || '68000',
            countryCode: envio.productor?.bodega_pais_iso2 || this.shipperCountryCode || 'MX',
          },
        },
        recipients: [{
          contact: {
            personName: snap.nombre_destinatario ?? snap.nombre ?? 'Destinatario',
            phoneNumber: cleanPhone(snap.telefono ?? snap.phone),
          },
          address: {
            streetLines,
            city: snap.ciudad ?? snap.city ?? '',
            ...(recipientState && { stateOrProvinceCode: recipientState }),
            postalCode: snap.codigo_postal ?? snap.postal_code ?? '',
            countryCode: destCountry,
            residential: true,
          },
        }],
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        serviceType,
        packagingType: 'YOUR_PACKAGING',
        labelSpecification: {
          labelFormatType: 'COMMON2D',
          imageType: 'PDF',
          labelStockType: 'PAPER_85X11_TOP_HALF_LABEL',
        },
        shippingChargesPayment: {
          paymentType: 'SENDER',
          payor: { responsibleParty: { accountNumber: { value: this.accountNumber } } },
        },
        requestedPackageLineItems: [{
          weight: { units: 'KG', value: Number(envio.peso_kg || 1) },
          dimensions: {
            length: Math.round(Number(envio.largo_cm) || 20),
            width: Math.round(Number(envio.ancho_cm) || 15),
            height: Math.round(Number(envio.alto_cm) || 15),
            units: 'CM',
          },
        }],
      },
    };

    if (envio.requires_adult_signature) {
      body.requestedShipment.specialServicesRequested = {
        specialServiceTypes: ['ADULT_SIGNATURE_REQUIRED'],
      };
    }

    if (destCountry !== 'MX') {
      if (!envio.valor_declarado_aduana || Number(envio.valor_declarado_aduana) < 1) {
        this.logger.warn(`Envío ${envio.id_envio ?? 'N/A'}: valor_declarado_aduana no definido; usando $20 USD. Actualiza el envío con el valor real del pedido.`);
      }
      // FedEx international customs always requires USD regardless of the DB default (MXN).
      const declaredCurrency = 'USD';
      const declaredValue = Number(envio.valor_declarado_aduana || 20);
      // US Customs requires English. Never use the Spanish product name as fallback.
      const customsDescription = envio.contenido_descripcion_en ?? 'Artisanal Mezcal - Distilled Agave Spirit';
      body.requestedShipment.customsClearanceDetail = {
        dutiesPayment: {
          paymentType: 'SENDER',
          payor: { responsibleParty: { accountNumber: { value: this.accountNumber } } },
        },
        documentShipment: false,
        commodities: [{
          description: customsDescription,
          countryOfManufacture: 'MX',
          quantity: 1,
          quantityUnits: 'PCS',
          unitPrice: { amount: declaredValue, currency: declaredCurrency },
          customsValue: { amount: declaredValue, currency: declaredCurrency },
          weight: { units: 'KG', value: Number(envio.peso_kg || 1) },
          harmonizedCode: envio.codigo_hs ?? '220890',
        }],
      };
    }

    try {
      this.logger.debug('FedEx Ship: enviando solicitud');
      const response = await firstValueFrom(
        this.http.post(`${this.baseUrl}/ship/v1/shipments`, body, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-locale': 'es_MX',
          },
        }),
      );

      const output = response.data?.output;
      const shipment = output?.transactionShipments?.[0];
      const pieceResponse = shipment?.pieceResponses?.[0];
      const trackingNumber: string =
        pieceResponse?.trackingNumber ??
        shipment?.masterTrackingNumber ??
        '';
      const encodedLabel: string | undefined =
        pieceResponse?.packageDocuments?.[0]?.encodedLabel ??
        shipment?.shipmentDocuments?.[0]?.encodedLabel;
      const labelBuffer: Buffer | undefined = encodedLabel
        ? Buffer.from(encodedLabel, 'base64')
        : undefined;

      this.logger.debug('FedEx Ship response output:', JSON.stringify(shipment));
      if (!trackingNumber) {
        throw new HttpException(
          'FedEx no devolvió número de guía. Revisa los logs del API para ver el response completo.',
          HttpStatus.BAD_GATEWAY,
        );
      }
      if (!labelBuffer) {
        this.logger.warn(`FedEx no devolvió PDF para guía ${trackingNumber}. encodedLabel ausente en response.`);
      }
      return { trackingNumber, labelBuffer, labelFormat: 'PDF' };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      const status = error.response?.status;
      const fedexErrors = error.response?.data?.errors;
      this.logger.error(`FedEx Ship API error [${status}]:`, fedexErrors || error.message);
      const apiMsg = fedexErrors?.[0]?.message || error.message;
      throw new HttpException(`FedEx dice: ${apiMsg}`, HttpStatus.BAD_REQUEST);
    }
  }

  private calcularDiasHabiles(fecha: string): number {
    if (!fecha) return 0;
    const diff = new Date(fecha).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  }
}