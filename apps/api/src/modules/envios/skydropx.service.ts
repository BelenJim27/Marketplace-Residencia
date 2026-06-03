import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CotizarEnvioDto } from './dto/envios.dto';
import { ICarrierService, ShippingQuote, TrackingEvent, ShipmentResult } from './interfaces/carrier.interface';

const SKYDROPX_SUPPORTED_COUNTRIES = ['MX', 'US', 'CA', 'CO', 'ES', 'FR', 'GB', 'CN'];
const POLL_MAX_ATTEMPTS = 6;
const POLL_DELAY_MS = 1500;

@Injectable()
export class SkydropxService implements ICarrierService {
  readonly carrierCode = 'skydropx';
  private readonly logger = new Logger('SkydropxService');
  private readonly baseUrl: string;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  private shipperName: string;
  private shipperPhone: string;
  private shipperEmail: string;
  private shipperStreet: string;
  private shipperZip: string;
  private shipperAreaLevel1: string; // estado, ej. "Oaxaca"
  private shipperAreaLevel2: string; // ciudad, ej. "Oaxaca de Juárez"
  private shipperAreaLevel3: string; // colonia, ej. "Centro"

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const env = this.config.get('SKYDROPX_ENV', 'sandbox');
    this.baseUrl = env === 'production'
      ? 'https://pro.skydropx.com/api/v1'
      : 'https://sb-pro.skydropx.com/api/v1';

    this.clientId = this.config.get('SKYDROPX_CLIENT_ID', '');
    this.clientSecret = this.config.get('SKYDROPX_CLIENT_SECRET', '');

    this.shipperName = this.config.get('FEDEX_SHIPPER_NAME', 'Productor Mezcal');
    this.shipperPhone = this.config.get('FEDEX_SHIPPER_PHONE', '9511234567');
    this.shipperEmail = this.config.get('SKYDROPX_SHIPPER_EMAIL', 'envios@marketplace.mx');
    this.shipperStreet = this.config.get('FEDEX_SHIPPER_STREET', 'Calle Principal 1');
    this.shipperZip = this.config.get('FEDEX_SHIPPER_POSTAL_CODE', '68000');
    this.shipperAreaLevel1 = this.config.get('SKYDROPX_SHIPPER_STATE', 'Oaxaca');
    this.shipperAreaLevel2 = this.config.get('FEDEX_SHIPPER_CITY', 'Oaxaca de Juárez');
    this.shipperAreaLevel3 = this.config.get('SKYDROPX_SHIPPER_COLONIA', '') || 'Centro';
  }

  // ─── OAuth2 client_credentials ───────────────────────────────────────────

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt) return this.cachedToken;

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const res = await firstValueFrom(
        this.http.post(`${this.baseUrl}/oauth/token`, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      const { access_token, expires_in } = res.data;
      this.cachedToken = access_token;
      this.tokenExpiresAt = now + ((expires_in ?? 7200) - 60) * 1000;
      this.logger.log('SkydropX token obtenido');
      return access_token;
    } catch (err: any) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      this.logger.error(`SkydropX auth [${status}]: ${JSON.stringify(body ?? err?.message)}`);
      throw new HttpException(
        `SkydropX auth falló [${status}] — revisa CLIENT_ID y CLIENT_SECRET`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // ─── HTTP helpers ─────────────────────────────────────────────────────────

  private async post<T>(path: string, body: any): Promise<T> {
    const token = await this.getToken();
    try {
      const res = await firstValueFrom(
        this.http.post(`${this.baseUrl}${path}`, body, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }),
      );
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      this.logger.error(`POST ${path} [${status}]: ${JSON.stringify(data ?? err?.message)}`);
      const msg = (data as any)?.message ?? (data as any)?.error ?? err?.message ?? 'Error SkydropX';
      throw new HttpException(`SkydropX: ${msg}`, status ?? HttpStatus.BAD_GATEWAY);
    }
  }

  private async get<T>(path: string): Promise<T> {
    const token = await this.getToken();
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.baseUrl}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      this.logger.error(`GET ${path} [${status}]: ${JSON.stringify(data ?? err?.message)}`);
      const msg = (data as any)?.message ?? err?.message ?? 'Error SkydropX';
      throw new HttpException(`SkydropX: ${msg}`, status ?? HttpStatus.BAD_GATEWAY);
    }
  }

  // ─── Polling helpers ──────────────────────────────────────────────────────

  private delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async pollQuotation(id: string): Promise<any> {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      const q = await this.get<any>(`/quotations/${id}`);
      if (q.is_completed) return q;
      await this.delay(POLL_DELAY_MS);
    }
    this.logger.warn(`SkydropX quotation ${id} no completó en ${POLL_MAX_ATTEMPTS} intentos`);
    return await this.get<any>(`/quotations/${id}`); // último intento aunque no esté completa
  }

  // ─── ICarrierService ──────────────────────────────────────────────────────

  async cotizarEnvio(dto: CotizarEnvioDto, _adultSignature?: boolean): Promise<ShippingQuote[]> {
    if (!this.clientId || !this.clientSecret) return [];

    const destPais = (dto.destino?.pais ?? 'MX').toUpperCase();
    if (!SKYDROPX_SUPPORTED_COUNTRIES.includes(destPais)) return [];

    const tipo: 'nacional' | 'internacional' = destPais === 'MX' ? 'nacional' : 'internacional';

    // Rails API: body envuelto en { quotation: {...} }
    // parcel es singular; area_level1=estado, area_level2=ciudad
    const quotation = await this.post<any>('/quotations', {
      quotation: {
        address_from: {
          country_code: 'MX',
          postal_code: this.shipperZip,
          area_level1: this.shipperAreaLevel1,
          area_level2: this.shipperAreaLevel2,
          area_level3: this.shipperAreaLevel3,
        },
        address_to: {
          country_code: destPais,
          postal_code: dto.destino.codigo_postal,
          area_level1: dto.destino.estado ?? '',
          area_level2: dto.destino.ciudad ?? '',
          area_level3: dto.destino.colonia || dto.destino.ciudad || 'Centro',
        },
        parcel: {
          weight: dto.peso_kg ?? 1,
          length: dto.largo_cm ?? 40,
          width: dto.ancho_cm ?? 30,
          height: dto.alto_cm ?? 20,
        },
      },
    });

    const completed = quotation.is_completed
      ? quotation
      : await this.pollQuotation(quotation.id);

    const rates: any[] = completed.rates ?? [];

    if (rates.length > 0) {
      this.logger.debug(`SkydropX rate sample: ${JSON.stringify(rates[0])}`);
    }

    return rates
      .filter((r) => r.success !== false)
      .map((rate) => {
        const precio = parseFloat(rate.total ?? rate.price ?? rate.amount ?? '0');
        const dias = parseInt(String(rate.days ?? rate.delivery_days ?? 3), 10);
        const fechaEstimada = new Date(Date.now() + dias * 86_400_000).toISOString();
        const providerName: string =
          rate.provider_display_name ?? rate.provider_name ?? rate.carrier_name ?? rate.provider ?? 'SkydropX';
        const serviceName: string = rate.provider_service_name ?? rate.service ?? rate.service_level_name ?? providerName;

        return {
          productCode: String(rate.id ?? rate.rate_id),
          productName: serviceName,
          carrier: 'skydropx',
          providerName,
          tipo,
          precioTotal: precio,
          moneda: (rate.currency ?? rate.currency_local ?? 'MXN') as string,
          fechaEntregaEstimada: fechaEstimada,
          diasHabilesEstimados: dias,
        } satisfies ShippingQuote;
      });
  }

  async createShipment(envio: any): Promise<ShipmentResult> {
    const snap = (envio.pedidos?.direccion_envio_snapshot ?? {}) as Record<string, any>;
    const destPais = (snap.pais_iso2 ?? snap.pais ?? 'MX').toUpperCase();

    // 1. Cotizar para obtener quotation_id + rate_id frescos
    const quotationRaw = await this.post<any>('/quotations', {
      quotation: {
        address_from: {
          country_code: 'MX',
          postal_code: this.shipperZip,
          area_level1: this.shipperAreaLevel1,
          area_level2: this.shipperAreaLevel2,
          area_level3: this.shipperAreaLevel3,
        },
        address_to: {
          country_code: destPais,
          postal_code: snap.codigo_postal ?? '06600',
          area_level1: snap.estado_codigo ?? snap.estado ?? '',
          area_level2: snap.ciudad ?? '',
          area_level3: snap.colonia || snap.ciudad || 'Centro',
        },
        parcel: {
          weight: envio.peso_kg ?? 1,
          length: envio.largo_cm ?? 40,
          width: envio.ancho_cm ?? 30,
          height: envio.alto_cm ?? 20,
        },
      },
    });

    const quotation = quotationRaw.is_completed
      ? quotationRaw
      : await this.pollQuotation(quotationRaw.id);

    const rates: any[] = (quotation.rates ?? []).filter((r: any) => r.success !== false);
    if (rates.length === 0) {
      throw new HttpException(
        'SkydropX: sin tarifas disponibles para esta dirección',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Seleccionar la tarifa más barata (o la que coincida con el servicio elegido)
    const codigoServicio = envio.servicios_envio?.codigo_servicio?.toLowerCase();
    const selectedRate = (
      rates.find((r) =>
        r.carrier_name?.toLowerCase() === codigoServicio ||
        r.service?.toLowerCase() === codigoServicio,
      ) ??
      [...rates].sort((a, b) =>
        parseFloat(a.total ?? a.price ?? '0') - parseFloat(b.total ?? b.price ?? '0'),
      )[0]
    );

    const pedidoRef = String(envio.id_pedido ?? envio.id ?? 'ORD');

    // 2. Crear guía (shipment también envuelto en root key)
    const shipment = await this.post<any>('/shipments', {
      shipment: {
        rate_id: selectedRate.id ?? selectedRate.rate_id,
        address_from: {
          name: this.shipperName,
          company: '',
          reference: this.shipperName,
          street1: this.shipperStreet,
          phone: this.shipperPhone,
          email: this.shipperEmail,
        },
        address_to: {
          name: snap.nombre_destinatario ?? snap.nombre ?? 'Destinatario',
          company: '',
          reference: pedidoRef,
          street1: snap.calle ?? snap.direccion ?? '',
          phone: snap.telefono ?? snap.phone ?? '0000000000',
          email: snap.email || this.shipperEmail,
        },
        parcels: [
          {
            weight: envio.peso_kg ?? 1,
            length: envio.largo_cm ?? 40,
            width: envio.ancho_cm ?? 30,
            height: envio.alto_cm ?? 20,
            consignment_note: 'Mezcal artesanal',
            package_type: 'box',
          },
        ],
      },
    });

    // 3. Extraer tracking + label de la respuesta JSON:API
    const included: any[] = shipment?.included ?? [];
    const firstIncluded = included[0]?.attributes ?? {};
    const trackingNumber: string =
      firstIncluded.tracking_number ??
      shipment?.data?.attributes?.tracking_number ??
      shipment?.data?.id ?? '';
    const labelUrl: string | undefined =
      firstIncluded.label_url ?? shipment?.data?.attributes?.label_url;
    const carrierName: string =
      selectedRate.carrier_name ?? selectedRate.provider ?? '';

    // 4. Descargar PDF
    let labelBuffer: Buffer | undefined;
    if (labelUrl) {
      try {
        const token = await this.getToken();
        const pdfRes = await firstValueFrom(
          this.http.get(labelUrl, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'arraybuffer',
          }),
        );
        labelBuffer = Buffer.from(pdfRes.data as ArrayBuffer);
      } catch (err: any) {
        this.logger.warn(`No se pudo descargar label PDF: ${err?.message}`);
      }
    }

    return {
      trackingNumber,
      labelBuffer,
      labelFormat: 'PDF',
      cost: parseFloat(selectedRate.total ?? selectedRate.price ?? '0'),
      currency: selectedRate.currency ?? selectedRate.currency_local ?? 'MXN',
      carrierName,
    };
  }

  async getTracking(trackingNumber: string, options?: Record<string, any>): Promise<TrackingEvent[]> {
    const carrierName = options?.carrierName ?? '';
    // Tracking API de SkydropX (radar-api) usa el mismo bearer token
    const token = await this.getToken();
    try {
      const res = await firstValueFrom(
        this.http.post(
          'https://radar-api.skydropx.com/v1/tracking',
          { tracking_numbers: [{ carrier: carrierName, tracking_number: trackingNumber }] },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        ),
      );
      const items: any[] = Array.isArray(res.data) ? res.data : [res.data];
      const events: any[] = items[0]?.events ?? [];
      return events.map((e) => ({
        descripcion: e.description ?? String(e.status ?? ''),
        estado: String(e.status ?? 'unknown'),
        fecha: e.date ? new Date(e.date) : new Date(),
        ubicacion: e.location ?? e.city ?? '',
      }));
    } catch (err: any) {
      this.logger.warn(`SkydropX tracking falló: ${err?.message}`);
      return [];
    }
  }
}
