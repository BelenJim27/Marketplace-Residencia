import { Headers, Logger, UnauthorizedException, ForbiddenException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CreateEnvioDto, UpdateEnvioDto, CotizarEnvioDto, DireccionDestinoDto } from './dto/envios.dto';
import { EnviosService } from './envios.service';
import { SkydropxService } from './skydropx.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ShippingQuote } from './interfaces/carrier.interface';
import { TasasCambioService } from '../tasas-cambio/tasas-cambio.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('envios')
export class EnviosController {
  private readonly logger = new Logger('EnviosController');

  constructor(
    private readonly service: EnviosService,
    private readonly skydropxService: SkydropxService,
    private readonly config: ConfigService,
    private readonly tasasCambio: TasasCambioService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Tracking (requiere auth — solo el comprador/productor puede ver su envío) ─
  @Get(':id/tracking')
  @UseGuards(AuthGuard)
  async getTracking(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const isAdmin = user.roles?.some((r: string) => r.toLowerCase() === 'administrador');

    if (!isAdmin) {
      const envio = await this.prisma.envios.findUnique({
        where: { id_envio: BigInt(id) },
        include: { pedidos: { select: { id_usuario: true } } },
      });
      if (!envio) throw new NotFoundException('Envío no encontrado');

      const isBuyer = (envio as any).pedidos?.id_usuario === user.id_usuario;
      const isProductor = user.id_productor !== null;
      if (!isBuyer && !isProductor) {
        throw new ForbiddenException('No tienes acceso a este tracking');
      }
    }

    return this.service.getTracking(id);
  }

  // ─── Rutas autenticadas (require login) ──────────────────────────────────
  @Get()
  @UseGuards(AuthGuard)
  findAll(@Query() query: PaginacionQueryDto) { return this.service.findAll(query); }

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
      quotes = await this.skydropxService.cotizarEnvio(dto, adultSig);
    } catch (err: any) {
      this.logger.warn(`SkydropX cotizar falló: ${err?.message}`);
      throw new HttpException(
        { message: err?.message ?? 'Sin tarifas disponibles para esta dirección' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (quotes.length === 0) {
      throw new HttpException(
        { message: 'Sin tarifas disponibles para esta dirección' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (carrier !== 'all') {
      return quotes.filter((q) => q.carrier === carrier);
    }

    // Convertir a MXN para envíos nacionales
    if (dto.destino.pais === 'MX') {
      for (const q of quotes) {
        if (q.moneda !== 'MXN') {
          try {
            const conv = await this.tasasCambio.convertir(q.moneda, 'MXN', String(q.precioTotal));
            q.precioTotal = conv.monto_destino;
            q.moneda = 'MXN';
          } catch (err: any) {
            this.logger.warn(`Sin tasa de cambio ${q.moneda}→MXN para ${q.productCode}: ${err?.message}`);
          }
        }
      }
    }

    return quotes;
  }

  /**
   * Quotes shipping from raw cart items — does NOT require a pedido ID.
   * Body: { items: [{id_producto, cantidad}], destino }
   * Used during checkout before a pedido is created.
   */
  @Post('cotizar-carrito')
  @UseGuards(AuthGuard)
  async cotizarCarrito(
    @Body() body: { items: Array<{ id_producto: number; cantidad: number }>; destino: DireccionDestinoDto },
  ) {
    const grupos = await this.service.cotizarCarrito(body.items, body.destino);

    // Mirror the MXN conversion from /cotizar for national shipments
    if (body.destino.pais === 'MX') {
      for (const grupo of grupos) {
        for (const q of grupo.quotes ?? []) {
          if (q.moneda !== 'MXN') {
            try {
              const conv = await this.tasasCambio.convertir(q.moneda, 'MXN', String(q.precioTotal));
              q.precioTotal = conv.monto_destino;
              q.moneda = 'MXN';
            } catch (err: any) {
              this.logger.warn(`Sin tasa ${q.moneda}→MXN para ${q.productCode}: ${err?.message}`);
            }
          }
        }
      }
    }

    return grupos;
  }

  /**
   * Quotes shipping per producer group (requires existing pedido).
   * Body: { id_pedido: number, destino: DireccionDestinoDto }
   */
  @Post('cotizar-por-productor')
  @UseGuards(AuthGuard)
  async cotizarPorProductor(
    @Body() body: { id_pedido: number; destino: DireccionDestinoDto },
  ) {
    return this.service.cotizarPorProductor(body.id_pedido, body.destino);
  }

  /** Admin/system endpoint to retry guide creation for orders where automatic purchase failed. */
  @Post('pedido/:id_pedido/crear-guias')
  @UseGuards(AuthGuard)
  async crearGuiasPorPedido(@Param('id_pedido') id_pedido: string) {
    return this.service.crearEnviosPorProductor(Number(id_pedido));
  }

  @Post('cotizaciones')
  @UseGuards(AuthGuard)
  guardarCotizacion(@Body() data: any) { return this.service.guardarCotizacion(data.id_pedido, data); }

  @Post(':id/crear-guia')
  @UseGuards(AuthGuard)
  crearGuia(@Param('id') id: string) { return this.service.crearGuia(id); }

  @Get(':id/guia/download')
  @UseGuards(AuthGuard)
  async downloadGuia(@Param('id') id: string, @Res() res: Response) {
    const guia = await this.service.getGuiaPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${guia.numero_guia}.pdf"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(guia.label_pdf);
  }

  // ─── Webhook SkydropX (sin AuthGuard — verificado por secret header) ─────
  /**
   * SkydropX envía eventos de tracking a esta URL cuando hay actualizaciones.
   * Configura la URL en app.skydropx.com → Integraciones → Webhooks.
   *
   * Payload de ejemplo SkydropX:
   * {
   *   "tracking_number": "1234567890",
   *   "status": "in_transit",
   *   "events": [{
   *     "status": "in_transit",
   *     "description": "Paquete en camino",
   *     "location": "Ciudad de México",
   *     "timestamp": "2026-06-01T12:00:00Z"
   *   }]
   * }
   */
  @Post('webhook/skydropx')
  async registrarEventoSkydropx(
    @Body() data: any,
    @Headers('x-skydropx-secret') secret: string,
  ) {
    const configuredSecret = this.config.get<string>('SKYDROPX_WEBHOOK_SECRET', '');
    if (!configuredSecret) {
      throw new UnauthorizedException('SkydropX webhook secret not configured');
    }
    // Use timingSafeEqual to prevent timing oracle attacks.
    // Pad to equal length before comparison so Buffer.from lengths match.
    const provided = secret ?? '';
    const expectedBuf = Buffer.from(configuredSecret);
    const receivedBuf = Buffer.alloc(expectedBuf.length, 0);
    Buffer.from(provided).copy(receivedBuf);
    const lengthMatch = provided.length === configuredSecret.length;
    if (!lengthMatch || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      this.logger.warn(`[webhook] SkydropX: firma inválida recibida`);
      throw new UnauthorizedException('Invalid SkydropX webhook secret');
    }

    const trackingNumber: string =
      data.tracking_number ??
      data.shipment?.tracking_number ??
      data.data?.tracking_number ??
      '';

    if (!trackingNumber) {
      this.logger.warn('SkydropX webhook: payload sin tracking_number');
      return { procesados: 0 };
    }

    // Deduplicar usando el event_id de SkydropX si está presente
    const skydropxEventId: string = data.id ?? data.event_id ?? '';
    if (skydropxEventId) {
      try {
        await this.prisma.webhook_events_log.create({
          data: { provider: 'skydropx', event_id: skydropxEventId, event_type: data.status ?? 'tracking' },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          this.logger.warn(`[webhook] SkydropX evento duplicado ignorado: ${skydropxEventId}`);
          return { procesados: 0 };
        }
      }
    }

    const events: any[] = data.events ?? (data.status ? [data] : []);
    const results: any[] = [];

    for (const event of events) {
      const estado: string = event.status ?? 'UNKNOWN';
      const descripcion: string = event.description ?? event.status ?? 'Actualización SkydropX';
      const fecha = event.timestamp ? new Date(event.timestamp) : undefined;

      try {
        const result = await this.service.registrarEventoPorGuia(
          trackingNumber,
          descripcion,
          estado,
          fecha,
        );
        results.push(result);
      } catch (err: any) {
        this.logger.warn(`SkydropX webhook error para ${trackingNumber}: ${err?.message}`);
        results.push({ error: err?.message, trackingNumber });
      }
    }

    return { procesados: results.length, resultados: results };
  }
}
