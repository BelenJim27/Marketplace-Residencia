import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CreatePagoDto, CreateStripeIntentDto, UpdatePagoDto, CreatePaypalOrderDto, CapturePaypalOrderDto, ConfirmStripeDto } from './dto/pagos.dto';
import { ConnectService } from './connect.service';
import { PagosService } from './pagos.service';
import { PaypalService } from './paypal.service';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';
import { Throttle } from '@nestjs/throttler';

// Límite para creación de pagos (sensible). Los webhooks NO se limitan: los invoca
// el proveedor (Stripe/PayPal) y limitarlos podría descartar eventos legítimos.
const PAGO_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

@Controller('pagos')
export class PagosController {
  constructor(
    private readonly service: PagosService,
    private readonly stripeService: StripeService,
    private readonly paypalService: PaypalService,
    private readonly connectService: ConnectService,
    private readonly configService: ConfigService,
  ) {}
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.VER_REPORTES_PRODUCTOR, PERMISOS.GESTIONAR_PAYOUTS)
  @Get('ingresos/:id_productor')
  async getIngresosResumen(@Param('id_productor', ParseIntPipe) id_productor: number, @Req() req: Request) {
    const user = (req as any).user;
    const isAdmin = user?.permisos?.includes(PERMISOS.GESTIONAR_PAYOUTS);
    if (!isAdmin) {
      // 1. JWT id_productor (fresh after re-login)
      const jwtId = user.id_productor != null ? Number(user.id_productor) : null;
      // 2. DB lookup by id_usuario
      const dbId = await this.service.getIdProductorByUserId(user.id_usuario);
      let actualIdProductor = jwtId ?? dbId;
      // 3. If still unresolved (UUID drift), verify ownership via direct join
      if (actualIdProductor == null) {
        const owned = await this.service.verifyProductorOwnership(user.id_usuario, id_productor);
        if (owned) actualIdProductor = id_productor;
      }
      if (actualIdProductor == null || actualIdProductor !== id_productor) {
        throw new UnauthorizedException('Solo puedes ver tus propios ingresos');
      }
    }
    return this.service.getIngresosResumen(id_productor);
  }

  @Throttle(PAGO_THROTTLE)
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.PAGAR, PERMISOS.GESTIONAR_PEDIDOS)
  @Post('stripe/intent')
  async createStripeIntent(@Body() dto: CreateStripeIntentDto, @Req() req: Request) {
    await this.service.validatePedidoOwnership(dto.id_pedido, (req as any).user.id_usuario);
    return this.service.createStripePaymentIntent(dto);
  }

  // Confirmación síncrona tras un pago con tarjeta exitoso: no depende del webhook.
  @Throttle(PAGO_THROTTLE)
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.PAGAR, PERMISOS.GESTIONAR_PEDIDOS)
  @Post('stripe/confirm')
  async confirmStripe(@Body() dto: ConfirmStripeDto, @Req() req: Request) {
    return this.service.confirmStripePayment(dto.id_pedido, (req as any).user.id_usuario);
  }

  @Post('stripe/webhook')
  async handleStripeWebhook(@Req() req: Request) {
    const signature = req.headers['stripe-signature'] as string;
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    const event = this.stripeService.constructWebhookEvent((req as any).rawBody as Buffer, signature, secret!);

    const isNew = await this.service.deduplicateWebhookEvent('stripe', event.id, event.type);
    if (!isNew) return { received: true };

    try {
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as any;
        const isDirectCharge = !!(paymentIntent.transfer_data?.destination);
        const taxCalculationId = paymentIntent.metadata?.tax_calculation as string | undefined;
        await this.service.updatePaymentStatus(paymentIntent.id, 'completado', isDirectCharge, taxCalculationId);
      } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as any;
        await this.service.updatePaymentStatus(paymentIntent.id, 'fallido');
      } else if (event.type === 'account.updated') {
        // Connect onboarding progress — flip stripe_onboarding_completed when KYC clears.
        await this.connectService.syncFromAccountUpdated(event.data.object);
      } else if (event.type === 'charge.dispute.closed') {
        const dispute = event.data.object as any;
        const paymentIntentId: string = dispute.payment_intent ?? '';
        if (paymentIntentId) {
          await this.service.handleDisputeClosed(paymentIntentId, dispute.status);
        }
      }
    } catch (err) {
      // Fallo transitorio: revertimos el dedup para que el reintento de Stripe
      // reprocese el evento en lugar de descartarse como duplicado y perderse.
      await this.service.discardWebhookEvent('stripe', event.id);
      throw err;
    }

    return { received: true };
  }

  @Throttle(PAGO_THROTTLE)
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.PAGAR, PERMISOS.GESTIONAR_PEDIDOS)
  @Post('paypal/order')
  async createPaypalOrder(@Body() dto: CreatePaypalOrderDto, @Req() req: Request) {
    await this.service.validatePedidoOwnership(dto.id_pedido, (req as any).user.id_usuario);
    return this.service.createPaypalOrder(dto);
  }

  @Throttle(PAGO_THROTTLE)
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.PAGAR, PERMISOS.GESTIONAR_PEDIDOS)
  @Post('paypal/capture')
  capturePaypalOrder(@Body() dto: CapturePaypalOrderDto) {
    return this.service.capturePaypalOrder(dto);
  }

  @Post('paypal/webhook')
  async handlePaypalWebhook(@Req() req: Request) {
    const headers = req.headers as Record<string, string>;
    const isValid = await this.paypalService.verifyWebhookSignature(headers, (req as any).rawBody as Buffer);

    if (!isValid) {
      throw new UnauthorizedException('Invalid PayPal webhook signature');
    }

    const event = JSON.parse(((req as any).rawBody as Buffer).toString());
    const eventType = event.event_type as string;
    const eventId: string = event.id ?? '';

    if (eventId) {
      const isNew = await this.service.deduplicateWebhookEvent('paypal', eventId, eventType);
      if (!isNew) return { received: true };
    }

    try {
      if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        const capture = event.resource as any;
        const captureId = capture.id;
        const captureCurrency = (capture.amount?.currency_code ?? '').toUpperCase();
        if (captureCurrency && captureCurrency !== 'USD') {
          throw new BadRequestException(`Moneda de capture inesperada: ${captureCurrency}. Solo se acepta USD.`);
        }
        await this.service.updatePaymentStatus(captureId, 'completado');
      } else if (eventType === 'PAYMENT.CAPTURE.DENIED' || eventType === 'PAYMENT.CAPTURE.REFUNDED') {
        const capture = event.resource as any;
        const captureId = capture.id;
        await this.service.updatePaymentStatus(captureId, 'fallido');
      }
    } catch (err) {
      // Fallo transitorio: revertir el dedup para que PayPal reintente el evento.
      if (eventId) await this.service.discardWebhookEvent('paypal', eventId);
      throw err;
    }

    return { received: true };
  }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_REEMBOLSOS)
  @Post(':id/reembolso')
  reembolsarPago(@Param('id') id: string) {
    return this.service.reembolsarPago(id);
  }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_PEDIDOS)
  @Get() findAll(@Query('estado') estado?: string, @Query('proveedor') proveedor?: string) {
    return this.service.findAll({ estado, proveedor });
  }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_PEDIDOS)
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_PEDIDOS)
  @Post() create(@Body() dto: CreatePagoDto) { return this.service.create(dto); }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_PEDIDOS)
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePagoDto) { return this.service.update(id, dto); }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_PEDIDOS)
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_PEDIDOS)
  @Post(':id/resolver-manual')
  resolverManual(@Param('id') id: string, @Body() body: { notas?: string }) {
    return this.service.resolverManual(id, body.notas);
  }
}
