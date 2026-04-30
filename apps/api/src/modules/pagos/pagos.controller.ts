import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { CreateMonedaDto, CreatePagoDto, UpdateMonedaDto, UpdatePagoDto } from './dto/pagos.dto';
import { PagosService } from './pagos.service';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Controller('pagos')
export class PagosController {
  constructor(private readonly service: PagosService, private readonly stripeService: StripeService, private readonly configService: ConfigService) {}
  @Get('monedas') listMonedas() { return this.service.listMonedas(); }
  @Post('monedas') createMoneda(@Body() dto: CreateMonedaDto) { return this.service.createMoneda(dto); }
  @Patch('monedas/:codigo') updateMoneda(@Param('codigo') codigo: string, @Body() dto: UpdateMonedaDto) { return this.service.updateMoneda(codigo, dto); }
  @Delete('monedas/:codigo') removeMoneda(@Param('codigo') codigo: string) { return this.service.removeMoneda(codigo); }

  @Post('stripe/intent') createStripeIntent(@Body() dto: { monto: number; moneda: string; id_pedido: string }) {
    return this.service.createStripePaymentIntent(dto.monto, dto.moneda, dto.id_pedido);
  }

  @Post('stripe/webhook')
  async handleStripeWebhook(@Req() req: Request) {
    const signature = req.headers['stripe-signature'] as string;
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    const event = this.stripeService.constructWebhookEvent((req as any).rawBody as Buffer, signature, secret!);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any;
      await this.service.updatePaymentStatus(paymentIntent.id, 'completado');
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as any;
      await this.service.updatePaymentStatus(paymentIntent.id, 'fallido');
    }

    return { received: true };
  }

  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreatePagoDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePagoDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
