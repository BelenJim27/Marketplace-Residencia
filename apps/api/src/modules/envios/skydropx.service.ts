import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CotizarEnvioDto } from './dto/envios.dto';
import { ICarrierService, ShippingQuote, TrackingEvent, ShipmentResult } from './interfaces/carrier.interface';

const SKYDROPX_SUPPORTED_COUNTRIES = ['MX', 'US', 'CA', 'CO', 'ES', 'FR', 'GB', 'CN'];
const POLL_MAX_ATTEMPTS = 15;
const POLL_DELAY_MS = 1000;

// Carriers that accept alcoholic beverages via SkydropX (DHL, FedEx, Estafeta, Paquetexpress, Redpack).
// J&T Express, Sendex, and 99minutos prohibit alcohol by policy.
// Use RegExp to tolerate display name variations (e.g. "DHL Express" vs "DHL International").
const ALCOHOL_CARRIER_PATTERNS = [/dhl/i, /fedex/i, /estafeta/i, /paquetex/i, /redpack/i];

@Injectable()
export class SkydropxService implements ICarrierService {
  readonly carrierCode = 'skydropx';
  private readonly logger = new Logger('SkydropxService');
  private readonly baseUrl: string;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;
  private cachedConsignmentCodes: string[] | null = null;
  private cachedHsCodes: string[] | null = null;

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

    this.shipperName = this.config.get('SKYDROPX_SHIPPER_NAME', 'Productor Mezcal');
    this.shipperPhone = this.config.get('SKYDROPX_SHIPPER_PHONE', '9511234567');
    this.shipperEmail = this.config.get('SKYDROPX_SHIPPER_EMAIL', 'envios@marketplace.mx');
    this.shipperStreet = this.config.get('SKYDROPX_SHIPPER_STREET', 'Calle Principal 1');
    this.shipperZip = this.config.get('SKYDROPX_SHIPPER_POSTAL_CODE', '68000');
    this.shipperAreaLevel1 = this.config.get('SKYDROPX_SHIPPER_STATE', 'Oaxaca');
    this.shipperAreaLevel2 = this.config.get('SKYDROPX_SHIPPER_CITY', 'Oaxaca de Juárez');
    this.shipperAreaLevel3 = this.config.get('SKYDROPX_SHIPPER_COLONIA', 'Centro');
    // HS 2208.907200 = mezcal (catálogo SkydropX)
    this.hsCodeDefault = this.config.get('SKYDROPX_HS_CODE_DEFAULT', '2208.907200');
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
      const errBody = data as any;
      const msg = errBody?.errors ?? errBody?.message ?? errBody?.error ?? err?.message ?? 'Error SkydropX';
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

  // ─── Shared helpers ───────────────────────────────────────────────────────

  private delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** Builds the address_from object for quotations and shipments.
   *  Uses per-producer fields when provided; falls back to global ENV vars. */
  private buildFromAddress(shipper?: {
    codigo_postal?: string | null;
    estado?: string | null;
    ciudad?: string | null;
    colonia?: string | null;
  }) {
    return {
      country_code: 'MX',
      postal_code: shipper?.codigo_postal ?? this.shipperZip,
      area_level1: shipper?.estado ?? this.shipperAreaLevel1,
      area_level2: shipper?.ciudad ?? this.shipperAreaLevel2,
      area_level3: shipper?.colonia ?? this.shipperAreaLevel3,
    };
  }

  /** Builds the shipper identity block for shipment creation. */
  private buildShipperIdentity(productor?: {
    nombre_marca?: string | null;
    rfc?: string | null;
    direccion_bodega?: { linea_1?: string | null; telefono?: string | null } | null;
  } | null) {
    return {
      name: productor?.nombre_marca ?? this.shipperName,
      company: '',
      reference: productor?.nombre_marca ?? this.shipperName,
      street1: productor?.direccion_bodega?.linea_1 ?? this.shipperStreet,
      phone: productor?.direccion_bodega?.telefono ?? this.shipperPhone,
      email: this.shipperEmail,
      ...(productor?.rfc ? { tax_id: productor.rfc } : {}),
    };
  }

  /** Builds the parcel object for quotation (Rails body key: parcel). */
  private buildQuotationParcel(dims: {
    peso_kg?: number | null;
    largo_cm?: number | null;
    ancho_cm?: number | null;
    alto_cm?: number | null;
  }) {
    return {
      weight: Number(dims.peso_kg ?? 1),
      length: Number(dims.largo_cm ?? 40),
      width: Number(dims.ancho_cm ?? 30),
      height: Number(dims.alto_cm ?? 20),
      consignment_note: 'CP',
      package_type: 'BX',
    };
  }

  /** Builds the products array required by SkydropX for international /quotations.
   *  SkydropX field names: description_en, price, country_code, hs_code, quantity, weight. */
  private async buildQuotationProducts(dto: CotizarEnvioDto): Promise<object[]> {
    const descEn = (dto.descripcion_contenido_en && dto.descripcion_contenido_en.length >= 15)
      ? dto.descripcion_contenido_en
      : 'Artisanal agave distillate mezcal from Oaxaca Mexico';
    return [{
      description_en: descEn,
      quantity: 1,
      price: Math.round(Math.max(Number(dto.valor_declarado_usd) || 50, 1) * 100) / 100,
      weight: dto.peso_kg,
      hs_code: await this.resolveHsCode(dto.hs_code),
      country_code: 'MX',
    }];
  }

  /** Builds the packages array for shipment creation. */
  private buildShipmentPackages(
    dims: { peso_kg?: any; largo_cm?: any; ancho_cm?: any; alto_cm?: any },
    consignmentCode: string,
  ) {
    return [{
      package_number: 1,
      weight: Number(dims.peso_kg ?? 1),
      length: Number(dims.largo_cm ?? 40),
      width: Number(dims.ancho_cm ?? 30),
      height: Number(dims.alto_cm ?? 20),
      consignment_note: consignmentCode,
      package_type: '4G',
    }];
  }

  private hasSuccessfulRate(q: any): boolean {
    return (q.rates ?? []).some(
      (r: any) => r.success !== false && (r.total ?? r.price ?? r.amount) != null,
    );
  }

  private async pollQuotation(id: string): Promise<any> {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      const q = await this.get<any>(`/quotations/${id}`);
      if (q.is_completed || this.hasSuccessfulRate(q)) {
        if (!q.is_completed) {
          this.logger.log(`[pollQuotation] ${id} — tarifa disponible tras ${i + 1} intentos, sin esperar is_completed`);
        }
        return q;
      }
      await this.delay(POLL_DELAY_MS);
    }
    this.logger.warn(`SkydropX quotation ${id} no completó en ${POLL_MAX_ATTEMPTS} intentos`);
    return await this.get<any>(`/quotations/${id}`);
  }

  // ─── ICarrierService ──────────────────────────────────────────────────────

  async cotizarEnvio(dto: CotizarEnvioDto, _adultSignature?: boolean): Promise<ShippingQuote[]> {
    if (!this.clientId || !this.clientSecret) return [];

    const destPais = (dto.destino?.pais ?? 'MX').toUpperCase();
    if (!SKYDROPX_SUPPORTED_COUNTRIES.includes(destPais)) return [];

    const tipo: 'nacional' | 'internacional' = destPais === 'MX' ? 'nacional' : 'internacional';

    const parcel = this.buildQuotationParcel(dto);
    const fromAddress = this.buildFromAddress(dto.shipper);
    this.logger.log(
      `[cotizarEnvio] payload → from CP=${fromAddress.postal_code} | to CP=${dto.destino.codigo_postal} país=${destPais} | ` +
      `parcel: weight=${parcel.weight} kg largo=${parcel.length} ancho=${parcel.width} alto=${parcel.height} cm`,
    );

    // Rails API: body envuelto en { quotation: {...} }
    // parcel es singular; area_level1=estado, area_level2=ciudad
    // products[] requerido por SkydropX solo en destinos internacionales (no MX)
    const quotationBody: any = {
      address_from: fromAddress,
      address_to: {
        country_code: destPais,
        postal_code: dto.destino.codigo_postal,
        area_level1: dto.destino.estado ?? '',
        area_level2: dto.destino.ciudad ?? '',
        area_level3: dto.destino.colonia || dto.destino.ciudad || 'Centro',
      },
      parcel,
    };
    if (destPais !== 'MX') {
      quotationBody.products = await this.buildQuotationProducts(dto);
    }
    let quotation: any;
    try {
      quotation = await this.post<any>('/quotations', { quotation: quotationBody });
    } catch (err: any) {
      const body = (err as any)?.response?.data ?? {};
      const isHsError = JSON.stringify(body).includes('código harmonizado');
      if (isHsError) {
        const env = this.config.get('SKYDROPX_ENV', 'sandbox');
        this.logger.warn(
          `[cotizarEnvio] SkydropX rechazó el código armonizado "${this.hsCodeDefault}" para envío internacional a ${destPais}. ` +
          (env !== 'production'
            ? 'El sandbox de SkydropX no tiene catálogo de códigos harmonizados — esto funcionará en producción con el código correcto configurado en SKYDROPX_HS_CODE_DEFAULT.'
            : 'Verifica que SKYDROPX_HS_CODE_DEFAULT tenga un código válido del portal SkydropX → Catálogos → Códigos armonizados.'),
        );
      } else {
        this.logger.warn(`[cotizarEnvio] Sin cotizaciones para ${destPais} CP=${dto.destino.codigo_postal}: ${err?.message}`);
      }
      return [];
    }

    const completed = (quotation.is_completed || this.hasSuccessfulRate(quotation))
      ? quotation
      : await this.pollQuotation(quotation.id);

    const rates: any[] = completed.rates ?? [];

    this.logger.log(`[cotizarEnvio] SkydropX devolvió ${rates.length} tarifas:`);

    // Dump raw keys of first rate without price so we can find the right field
    const sinPrecio = rates.filter(r => r.total == null && r.price == null && r.amount == null);
    if (sinPrecio.length > 0) {
      this.logger.warn(`[cotizarEnvio] ${sinPrecio.length} tarifas sin precio. Keys de la primera: ${Object.keys(sinPrecio[0]).join(', ')}`);
      this.logger.warn(`[cotizarEnvio] raw[0] = ${JSON.stringify(sinPrecio[0])}`);
    }

    for (const r of rates) {
      const precio = r.total ?? r.price ?? r.amount ?? r.total_price ?? r.final_price ?? r.rate ?? null;
      const dias = r.days ?? r.delivery_days ?? r.estimated_days ?? null;
      this.logger.log(
        `  ${r.provider_display_name ?? r.provider ?? '?'} | ${r.provider_service_name ?? r.service ?? '?'} | ` +
        `$${precio ?? '?'} ${r.currency ?? 'MXN'} | ${dias ?? '?'} días | success=${r.success}`,
      );
    }

    return rates
      .filter((r) => r.success !== false)
      .map((rate) => {
        // Extended price field lookup covering multiple SkydropX API versions
        const precioRaw = rate.total ?? rate.price ?? rate.amount ?? rate.total_price ?? rate.final_price ?? rate.rate ?? '0';
        const precio = parseFloat(String(precioRaw));
        const diasRaw = rate.days ?? rate.delivery_days ?? rate.estimated_days ?? 3;
        const dias = parseInt(String(diasRaw), 10);
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
          moneda: (rate.currency_code ?? rate.currency ?? rate.currency_local ?? 'MXN') as string,
          fechaEntregaEstimada: fechaEstimada,
          diasHabilesEstimados: dias,
        } satisfies ShippingQuote;
      })
      .filter((q) => q.precioTotal > 0)  // descartar tarifas sin precio confirmado
      .filter((q) => {
        if (!dto.adult_signature) return true;
        const compatible = ALCOHOL_CARRIER_PATTERNS.some(p =>
          p.test(q.providerName ?? ''),
        );
        if (!compatible) {
          this.logger.warn(`[cotizarEnvio] Carrier "${q.providerName}" excluido — no acepta bebidas alcohólicas`);
        }
        return compatible;
      })
      .sort((a, b) => a.precioTotal - b.precioTotal);
  }

  private readonly hsCodeDefault: string;

  // Fetches valid HS codes from SkydropX catalog and returns one suitable for mezcal/spirits.
  // Falls back to SKYDROPX_HS_CODE_DEFAULT if the catalog endpoint is unavailable.
  private async resolveHsCode(preferred?: string): Promise<string> {
    if (preferred) return preferred;

    if (this.cachedHsCodes === null) {
      const endpoints = ['/harmonized_codes', '/catalogs/harmonized_codes', '/products/harmonized_codes'];
      this.cachedHsCodes = [];
      for (const path of endpoints) {
        try {
          const data = await this.get<any>(path);
          const items: any[] = Array.isArray(data) ? data : (data?.data ?? data?.harmonized_codes ?? []);
          const codes = items
            .map((i: any) => i?.code ?? i?.attributes?.code ?? String(i?.id ?? ''))
            .filter(Boolean);
          if (codes.length > 0) {
            this.cachedHsCodes = codes;
            this.logger.log(`SkydropX HS codes via ${path} (${codes.length}): ${codes.slice(0, 5).join(', ')}`);
            break;
          }
        } catch {
          // try next path
        }
      }
      if (this.cachedHsCodes.length === 0) {
        this.logger.warn('SkydropX: catálogo de HS codes no disponible — usando SKYDROPX_HS_CODE_DEFAULT');
      }
    }

    if (this.cachedHsCodes.length > 0) {
      // Prefer spirits/mezcal codes (HS chapter 2208)
      const spiritsPrefixes = ['2208.907200', '22089005', '22089099', '22089000', '220890', '2208'];
      for (const prefix of spiritsPrefixes) {
        const match = this.cachedHsCodes.find(c => c.replace(/\./g, '').startsWith(prefix.replace(/\./g, '')));
        if (match) return match;
      }
      return this.cachedHsCodes[0];
    }

    return this.hsCodeDefault;
  }

  // Fetches valid consignment_note class codes from SkydropX catalog. Cached after first call.
  private async getConsignmentNoteCode(): Promise<string> {
    if (!this.cachedConsignmentCodes) {
      try {
        // Try the Pro API catalog endpoint path
        const data = await this.get<any>('/consignment_notes/packagings');
        const items: any[] = Array.isArray(data) ? data : (data?.data ?? data?.packagings ?? []);
        this.cachedConsignmentCodes = items
          .map((i: any) => i?.code ?? i?.attributes?.code ?? String(i?.id ?? ''))
          .filter(Boolean);
        this.logger.log(`SkydropX consignment_note codes (${this.cachedConsignmentCodes.length}): ${this.cachedConsignmentCodes.slice(0, 10).join(', ')}`);
      } catch (err: any) {
        this.logger.warn(`Catálogo consignment_notes no disponible: ${err?.message}`);
        this.cachedConsignmentCodes = [];
      }
    }
    // UNSPSC/SAT class codes for mezcal/spirits. Package codes like "1H1" are for consignment_note_packaging_code (different field).
    const preferred = ['50202200', '50202300', '50202306', '1H1', '1H2', 'BV', 'BO', '4B'];
    for (const code of preferred) {
      if (this.cachedConsignmentCodes.includes(code)) return code;
    }
    // If catalog returned codes, use first; otherwise use known valid SAT class code for spirits
    return this.cachedConsignmentCodes[0] ?? '50202200';
  }

  async createShipment(envio: any): Promise<ShipmentResult> {
    const snap = (envio.pedidos?.direccion_envio_snapshot ?? {}) as Record<string, any>;
    const destPais = (snap.pais_iso2 ?? snap.pais ?? 'MX').toUpperCase();

    // Use per-producer address when available, fall back to global ENV config
    const productor = (envio as any).productor as {
      nombre_marca?: string | null;
      rfc?: string | null;
      direccion_bodega?: {
        linea_1?: string | null;
        ciudad?: string | null;
        estado?: string | null;
        codigo_postal?: string | null;
        pais_iso2?: string | null;
        telefono?: string | null;
      } | null;
    } | null;

    const fromAddress = this.buildFromAddress({
      codigo_postal: productor?.direccion_bodega?.codigo_postal,
      estado: productor?.direccion_bodega?.estado,
      ciudad: productor?.direccion_bodega?.ciudad,
      colonia: (productor?.direccion_bodega as any)?.colonia,
    });

    // 1. Cotizar para obtener quotation_id + rate_id frescos
    const shipmentQuotationBody: any = {
      address_from: fromAddress,
      address_to: {
        country_code: destPais,
        postal_code: snap.codigo_postal ?? '06600',
        area_level1: snap.estado_codigo ?? snap.estado ?? '',
        area_level2: snap.ciudad ?? '',
        area_level3: snap.colonia || snap.ciudad || 'Centro',
      },
      parcel: {
        weight: Number(envio.peso_kg ?? 1),
        length: Number(envio.largo_cm ?? 40),
        width: Number(envio.ancho_cm ?? 30),
        height: Number(envio.alto_cm ?? 20),
        // SAT Carta Porte codes: BX = Caja (c_TipoEmbalaje), CP = Carta Porte
        consignment_note: 'CP',
        package_type: 'BX',
      },
    };
    if (destPais !== 'MX') {
      const valorUsd = Math.round((Number((envio as any).valor_declarado_usd) || 50) * 100) / 100;
      shipmentQuotationBody.products = [{
        description_en: 'Artisanal agave distillate mezcal from Oaxaca Mexico',
        quantity: 1,
        price: valorUsd,
        weight: Number(envio.peso_kg ?? 1),
        hs_code: await this.resolveHsCode((envio as any).codigo_hs),
        country_code: 'MX',
      }];
    }
    const quotationRaw = await this.post<any>('/quotations', { quotation: shipmentQuotationBody });

    const quotation = (quotationRaw.is_completed || this.hasSuccessfulRate(quotationRaw))
      ? quotationRaw
      : await this.pollQuotation(quotationRaw.id);

    const quotationKeys = Object.keys(quotation).filter(k => k !== 'rates');
    this.logger.debug(`[createShipment] quotation keys=${quotationKeys.join(',')} packages=${JSON.stringify(quotation.packages ?? quotation.parcel ?? quotation.parcels ?? '?')}`);

    const rates: any[] = (quotation.rates ?? []).filter((r: any) => r.success !== false);
    if (rates.length === 0) {
      throw new HttpException(
        'SkydropX: sin tarifas disponibles para esta dirección',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Rate IDs are ephemeral UUIDs that expire after each quotation session.
    // Match against the stable provider/service names saved at checkout time instead.
    const preferred_provider = ((envio as any).preferred_provider ?? '').toLowerCase();
    const preferred_service = ((envio as any).preferred_service ?? '').toLowerCase();

    this.logger.debug(
      `[createShipment] buscando tarifa: preferred_provider="${preferred_provider}" preferred_service="${preferred_service}" tarifas_disponibles=${JSON.stringify(
        rates.map(r => ({
          id: r.id,
          provider: r.provider_display_name ?? r.provider_name ?? r.carrier_name ?? r.provider,
          service: r.provider_service_name ?? r.service ?? r.service_level_name,
          precio: r.total ?? r.price,
          moneda: r.currency ?? r.currency_local,
        })),
      )}`,
    );

    const matchedRate = rates.find((r) => {
      const rProvider = (
        r.provider_display_name ?? r.provider_name ?? r.carrier_name ?? r.provider ?? ''
      ).toLowerCase();
      const rService = (
        r.provider_service_name ?? r.service ?? r.service_level_name ?? ''
      ).toLowerCase();
      return (
        (preferred_provider &&
          (rProvider.includes(preferred_provider) || preferred_provider.includes(rProvider))) ||
        (preferred_service &&
          (rService.includes(preferred_service) || preferred_service.includes(rService)))
      );
    });

    const cheapestRate = [...rates].sort((a, b) =>
      parseFloat(a.total ?? a.price ?? '0') - parseFloat(b.total ?? b.price ?? '0'),
    )[0];

    const selectedRate = matchedRate ?? cheapestRate;

    if (matchedRate) {
      this.logger.debug(
        `[createShipment] tarifa ENCONTRADA por nombre: provider="${matchedRate.provider_display_name ?? matchedRate.provider}" service="${matchedRate.provider_service_name ?? matchedRate.service}" precio=${matchedRate.total ?? matchedRate.price}`,
      );
    } else {
      this.logger.warn(
        `[createShipment] tarifa preferida NO encontrada → usando más barata: provider="${cheapestRate.provider_display_name ?? cheapestRate.provider}" service="${cheapestRate.provider_service_name ?? cheapestRate.service}" precio=${cheapestRate.total ?? cheapestRate.price}`,
      );
    }

    const pedidoRef = String(envio.id_pedido ?? envio.id ?? 'ORD');
    this.logger.debug(`[createShipment] selectedRate.id=${selectedRate.id} packaging_type=${selectedRate.packaging_type} shipment_creation_type=${selectedRate.shipment_creation_type}`);

    // package_type: SAT c_TipoEmbalaje code for outer shipping container (4G = caja de fibra/cartón)
    // consignment_note: SAT c_TipoEmbalaje code for inner product packaging, fetched from catalog
    const consignmentNoteCode = await this.getConsignmentNoteCode();

    const requiresAdultSignature = (envio as any).requires_adult_signature === true;
    const shipmentBody: any = {
      shipment: {
        quotation_id: quotation.id,
        rate_id: selectedRate.id ?? selectedRate.rate_id,
        address_from: {
          ...this.buildShipperIdentity(productor),
          postal_code: fromAddress.postal_code,
          country_code: fromAddress.country_code,
          area_level1: fromAddress.area_level1,
          area_level2: fromAddress.area_level2,
          area_level3: fromAddress.area_level3,
        },
        address_to: {
          name: snap.nombre_destinatario ?? snap.nombre ?? 'Destinatario',
          company: '',
          reference: pedidoRef,
          street1: snap.calle ?? snap.direccion ?? '',
          phone: snap.telefono ?? snap.phone ?? '0000000000',
          email: snap.email || this.shipperEmail,
          postal_code: snap.codigo_postal ?? '',
          country_code: destPais,
          area_level1: snap.estado_codigo ?? snap.estado ?? '',
          area_level2: snap.ciudad ?? '',
          area_level3: snap.colonia ?? snap.ciudad ?? 'Centro',
        },
        packages: this.buildShipmentPackages(envio, consignmentNoteCode),
        ...(requiresAdultSignature ? {
          adult_signature: true,
          content_description: (envio as any).contenido_descripcion ?? 'Destilado de agave artesanal',
        } : {}),
        ...(destPais !== 'MX' ? {
          customs_payment_payer: 'shipper',
          shipment_purpose: 'commercial',
          products: shipmentQuotationBody.products,
        } : {}),
      },
    };
    this.logger.debug(`[createShipment] body=${JSON.stringify(shipmentBody)}`);
    // 2. Crear guía — quotation_id + rate_id ambos requeridos según la API
    const shipment = await this.post<any>('/shipments', shipmentBody);

    // 3. SkydropX creates shipments asynchronously — poll until tracking_number + label_url are ready
    const shipmentId: string = shipment?.data?.id ?? shipment?.data?.attributes?.id;
    if (!shipmentId) {
      throw new HttpException('SkydropX: no se obtuvo ID del shipment creado', HttpStatus.BAD_GATEWAY);
    }

    let resolvedShipment = shipment;
    for (let attempt = 0; attempt < 20; attempt++) {
      await this.delay(2000);
      resolvedShipment = await this.get<any>(`/shipments/${shipmentId}`);
      const pkg = (resolvedShipment?.included ?? []).find(
        (i: any) => i?.type === 'package' || i?.type === 'packages',
      );
      const pkgA = pkg?.attributes ?? {};
      this.logger.debug(`[createShipment] poll attempt=${attempt + 1} tracking_status=${pkgA.tracking_status} tracking_number=${pkgA.tracking_number}`);
      if (pkgA.tracking_number && pkgA.label_url) break;
      if (pkgA.tracking_status === 'error') {
        throw new HttpException('SkydropX: error al generar la guía', HttpStatus.UNPROCESSABLE_ENTITY);
      }
    }

    const shipAttrs = resolvedShipment?.data?.attributes ?? {};
    const included: any[] = resolvedShipment?.included ?? [];
    const pkgIncluded = included.find((i: any) => i?.type === 'package' || i?.type === 'packages');
    const pkgAttrs = pkgIncluded?.attributes ?? included[0]?.attributes ?? {};

    const trackingNumber: string =
      pkgAttrs.tracking_number ??
      shipAttrs.master_tracking_number ??
      shipAttrs.tracking_number ??
      shipmentId;

    const labelUrl: string | undefined =
      pkgAttrs.label_url ??
      shipAttrs.label_url;

    this.logger.log(`[createShipment] done: tracking=${trackingNumber} labelUrl=${labelUrl}`);

    const carrierName: string =
      shipAttrs.carrier_name ??
      selectedRate.provider_display_name ??
      selectedRate.carrier_name ??
      selectedRate.provider ?? '';

    // 4. Descargar PDF — la URL es pre-firmada (JWT en el path), no requiere Bearer token
    let labelBuffer: Buffer | undefined;
    if (labelUrl) {
      // Try without auth first (pre-signed URL), then with Bearer as fallback
      for (const useAuth of [false, true]) {
        try {
          const reqConfig: any = { responseType: 'arraybuffer', timeout: 15000 };
          if (useAuth) {
            const token = await this.getToken();
            reqConfig.headers = { Authorization: `Bearer ${token}` };
          }
          const pdfRes = await firstValueFrom(this.http.get(labelUrl, reqConfig));
          const buf = Buffer.from(pdfRes.data as ArrayBuffer);
          const magic = buf.slice(0, 4).toString('ascii');
          this.logger.debug(`[createShipment] PDF download useAuth=${useAuth} bytes=${buf.length} magic=${magic}`);
          if (magic === '%PDF') {
            labelBuffer = buf;
            break;
          }
          this.logger.warn(`[createShipment] PDF descargado pero no es PDF válido (magic=${magic}), ${useAuth ? 'desistiendo' : 'intentando con auth'}`);
        } catch (err: any) {
          this.logger.warn(`[createShipment] PDF download useAuth=${useAuth} failed: ${err?.message}`);
        }
      }
    }

    return {
      trackingNumber,
      labelBuffer,
      labelFormat: 'PDF',
      cost: parseFloat(selectedRate.total ?? selectedRate.price ?? '0'),
      currency: selectedRate.currency ?? selectedRate.currency_local ?? 'MXN',
      carrierName,
      providerShipmentId: shipmentId,
      tarifa_fallback: !matchedRate,
      tarifa_original_solicitada: matchedRate ? undefined : `${preferred_provider}/${preferred_service}`,
    };
  }

  async protegerEnvio(shipmentId: string, valorDeclarado: number, _moneda: string): Promise<import('./interfaces/carrier.interface').ProteccionResult> {
    const body = {
      protect: {
        declared_value: String(Math.round(valorDeclarado * 100) / 100),
        shipment_id: shipmentId,
      },
    };
    const res = await this.post<any>(`/shipments/${shipmentId}/protect`, body);
    const attrs = res?.data?.attributes ?? {};
    this.logger.log(`[protegerEnvio] shipmentId=${shipmentId} total=${attrs.total} pct=${attrs.percentage}`);
    return {
      proteccionId: String(res?.data?.id ?? attrs?.id ?? 'unknown'),
      costo: parseFloat(String(attrs?.total ?? '0')),
      costoFijo: parseFloat(String(attrs?.fixed_cost ?? '0')),
      porcentaje: Number(attrs?.percentage ?? 0),
      moneda: 'MXN',
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
