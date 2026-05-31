import { Headers, Logger, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { CreateEnvioDto, UpdateEnvioDto, CotizarEnvioDto } from './dto/envios.dto';
import { EnviosService } from './envios.service';
import { FedexService } from './fedex.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ShippingQuote } from './interfaces/carrier.interface';
import { TasasCambioService } from '../tasas-cambio/tasas-cambio.service';

@Controller('envios')
export class EnviosController {
  private readonly logger = new Logger('EnviosController');

  constructor(
    private readonly service: EnviosService,
    private readonly fedexService: FedexService,
    private readonly config: ConfigService,
    private readonly tasasCambio: TasasCambioService,
  ) {}

  // ─── Rutas públicas (solo lectura) ───────────────────────────────────────
  @Get(':id/tracking') getTracking(@Param('id') id: string) { return this.service.getTracking(id); }

  // ─── Rutas autenticadas (require login) ──────────────────────────────────
  @Get()
  @UseGuards(AuthGuard)
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateEnvioDto) { return this.service.create(dto); }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateEnvioDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post('cotizar')
  @UseGuards(AuthGuard)
  async cotizar(@Body() dto: CotizarEnvioDto, @Query('carrier') carrier = 'all'): Promise<ShippingQuote[]> {
    const adultSig = dto.adult_signature ?? false;
    let quotes: ShippingQuote[];
    try {
      quotes = await this.fedexService.cotizarEnvio(dto, adultSig);
      if (quotes.length === 0) {
        throw new HttpException(
          { message: 'FedEx: sin tarifas disponibles para esta dirección' },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      const msg = (err as any)?.message || 'Error al cotizar con FedEx';
      throw new HttpException({ message: msg }, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    if (dto.destino.pais === 'MX') {
      for (const q of quotes) {
        if (q.moneda !== 'MXN') {
          try {
            const conv = await this.tasasCambio.convertir(q.moneda, 'MXN', String(q.precioTotal));
            q.precioTotal = conv.monto_destino;
            q.moneda = 'MXN';
          } catch (err: any) {
            this.logger.warn(`Sin tasa de cambio ${q.moneda}→MXN para cotización ${q.productCode}: ${err?.message}`);
          }
        }
      }
    }

    return quotes;
  }

  @Post('cotizaciones')
  @UseGuards(AuthGuard)
  guardarCotizacion(@Body() data: any) { return this.service.guardarCotizacion(data.id_pedido, data); }

  @Post(':id/crear-guia')
  @UseGuards(AuthGuard)
  crearGuia(@Param('id') id: string) { return this.service.crearGuia(id); }

  /** Descarga el PDF de la etiqueta FedEx guardado en BD */
  @Get(':id/guia/download')
  @UseGuards(AuthGuard)
  async downloadGuia(@Param('id') id: string, @Res() res: Response) {
    const guia = await this.service.getGuiaPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${guia.numero_guia}.pdf"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(guia.label_pdf);
  }

  // ─── Webhook FedEx (sin AuthGuard — verificado por secret header) ────────
  /**
   * Endpoint para webhooks reales de FedEx.
   * FedEx envía eventos con `trackingNumber` en el payload; resolvemos
   * al id_envio interno buscando por numero_guia en envio_guias.
   *
   * Payload de ejemplo FedEx:
   * {
   *   "eventType": "TRACKING",
   *   "eventNotifications": [{
   *     "trackingInfo": {
   *       "trackingNumber": "794601234567",
   *       "events": [{
   *         "eventType": "DL",
   *         "eventDescription": "Delivered",
   *         "timestamp": "2026-05-28T14:30:00"
   *       }]
   *     }
   *   }]
   * }
   */
  @Post('webhook/fedex')
  async registrarEventoFedex(
    @Body() data: any,
    @Headers('x-fedex-secret') secret: string,
  ) {
    const configuredSecret = this.config.get('FEDEX_WEBHOOK_SECRET');
    if (!configuredSecret || secret !== configuredSecret) {
      throw new UnauthorizedException('Invalid FedEx webhook secret');
    }

    // Parsear payload real de FedEx
    const notifications: any[] = data.eventNotifications ?? [];
    const results: any[] = [];

    for (const notif of notifications) {
      const trackingInfo = notif.trackingInfo ?? notif;
      const trackingNumber: string =
        trackingInfo.trackingNumber ??
        trackingInfo.shipmentTrackingNumber ??
        data.trackingNumber ??
        '';

      if (!trackingNumber) continue;

      const events: any[] = trackingInfo.events ?? trackingInfo.trackingEvents ?? [];

      for (const event of events) {
        const estado: string =
          event.eventType ??
          event.derivedStatus ??
          event.eventDescription ??
          'UNKNOWN';
        const descripcion: string =
          event.eventDescription ??
          event.derivedStatusDescription ??
          estado;
        const fecha = event.timestamp
          ? new Date(event.timestamp)
          : undefined;

        try {
          const result = await this.service.registrarEventoPorGuia(
            trackingNumber,
            descripcion,
            estado,
            fecha,
          );
          results.push(result);
        } catch (err: any) {
          // Loggear pero no fallar para que FedEx no reintente infinitamente
          results.push({ error: err?.message, trackingNumber });
        }
      }

      // Si no hay array de eventos pero sí hay latestStatus
      if (events.length === 0 && (trackingInfo.latestStatusDetail || trackingInfo.statusByLocale)) {
        const estado = trackingInfo.latestStatusDetail?.code ?? 'UNKNOWN';
        const descripcion = trackingInfo.latestStatusDetail?.description ?? 'Actualización de estado';
        try {
          const result = await this.service.registrarEventoPorGuia(
            trackingNumber,
            descripcion,
            estado,
            undefined,
          );
          results.push(result);
        } catch (err: any) {
          results.push({ error: err?.message, trackingNumber });
        }
      }
    }

    return { procesados: results.length, resultados: results };
  }
}
