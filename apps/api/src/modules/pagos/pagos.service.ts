import { BadRequestException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { calcularEdadEnAnios } from '../productos/edad.helper';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateMonedaDto, CreatePagoDto, CreateStripeIntentDto, UpdateMonedaDto, UpdatePagoDto } from './dto/pagos.dto';
import { StripeService } from './stripe.service';

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly emailService: EmailService,
  ) {}
  async findAll() { return serializeBigInts(await this.prisma.pagos.findMany({ include: { pedidos: true, monedas: true } })); }
  async findOne(id_pago: string) { const item = await this.prisma.pagos.findUnique({ where: { id_pago: toBigIntId(id_pago) }, include: { pedidos: true, monedas: true } }); if (!item) throw new NotFoundException('Pago no encontrado'); return serializeBigInts(item); }
  async create(dto: CreatePagoDto) { return serializeBigInts(await this.prisma.pagos.create({ data: { id_pedido: toBigIntId(dto.id_pedido), proveedor: dto.proveedor ?? null, payment_intent_id: dto.payment_intent_id ?? null, estado: dto.estado?.trim() ?? 'pendiente', monto: dto.monto, moneda: dto.moneda } })); }
  async update(id_pago: string, dto: UpdatePagoDto) { return serializeBigInts(await this.prisma.pagos.update({ where: { id_pago: toBigIntId(id_pago) }, data: { id_pedido: dto.id_pedido ? toBigIntId(dto.id_pedido) : undefined, proveedor: dto.proveedor, payment_intent_id: dto.payment_intent_id, estado: dto.estado?.trim(), monto: dto.monto, moneda: dto.moneda } })); }
  async remove(id_pago: string) { await this.prisma.pagos.delete({ where: { id_pago: toBigIntId(id_pago) } }); return { message: 'Pago eliminado' }; }
  async listMonedas() { return serializeBigInts(await this.prisma.monedas.findMany()); }
  async createMoneda(dto: CreateMonedaDto) { return serializeBigInts(await this.prisma.monedas.create({ data: { codigo: dto.codigo.trim(), nombre: dto.nombre.trim(), simbolo: dto.simbolo ?? null, activo: dto.activo ?? true } })); }
  async updateMoneda(codigo: string, dto: UpdateMonedaDto) { return serializeBigInts(await this.prisma.monedas.update({ where: { codigo }, data: { codigo: dto.codigo?.trim(), nombre: dto.nombre?.trim(), simbolo: dto.simbolo, activo: dto.activo } })); }
  async removeMoneda(codigo: string) { await this.prisma.monedas.delete({ where: { codigo } }); return { message: 'Moneda eliminada' }; }

  async getIngresosResumen(id_productor: number) {
    const pedidoProductores = await this.prisma.pedido_productor.findMany({
      where: { id_productor },
      select: {
        monto_neto_productor: true,
        subtotal_bruto: true,
        comision_marketplace: true,
        estado: true,
      },
    });

    const payouts = await this.prisma.payouts.findMany({
      where: {
        id_productor,
        estado: { in: ['procesado', 'pagado'] },
      },
      select: {
        monto_neto: true,
        monto_bruto: true,
        monto_comision: true,
      },
    });

    const ventasTotales = pedidoProductores.reduce(
      (acc, pp) => acc + (Number(pp.monto_neto_productor) || 0),
      0,
    );
    const comisionTotal = pedidoProductores.reduce(
      (acc, pp) => acc + (Number(pp.comision_marketplace) || 0),
      0,
    );
    const brutoTotal = pedidoProductores.reduce(
      (acc, pp) => acc + (Number(pp.subtotal_bruto) || 0),
      0,
    );

    const ingresosRecibidos = payouts.reduce(
      (acc, p) => acc + (Number(p.monto_neto) || 0),
      0,
    );
    const pendienteRecibir = ventasTotales - ingresosRecibidos;

    return {
      ventas_totales: ventasTotales.toFixed(2),
      comision_total: comisionTotal.toFixed(2),
      bruto_total: brutoTotal.toFixed(2),
      ingresos_recibidos: ingresosRecibidos.toFixed(2),
      pendiente_recibir: Math.max(0, pendienteRecibir).toFixed(2),
      total_pedidos: pedidoProductores.length,
      total_payouts: payouts.length,
    };
  }

  async createStripePaymentIntent(dto: CreateStripeIntentDto) {
    const moneda = dto.moneda.toUpperCase();

    const monedaRow = await this.prisma.monedas.findUnique({ where: { codigo: moneda } });
    if (!monedaRow || monedaRow.activo === false) {
      throw new BadRequestException(`Moneda no soportada: ${moneda}`);
    }

    const id_pedido_bi = toBigIntId(dto.id_pedido);
    const pedido = await this.prisma.pedidos.findUnique({ where: { id_pedido: id_pedido_bi } });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');

    // Trigger 3 (autoritativo): bloqueo por edad. Si algún ítem requiere edad mínima,
    // exigir DOB del comprador y validar que cumpla la más restrictiva del carrito.
    await this.validarEdadDelComprador(id_pedido_bi, pedido.id_usuario);

    const directCharge = await this.resolveDirectCharge(id_pedido_bi, dto.subtotal, dto.shipping_amount ?? 0);

    const intent = await this.stripeService.createPaymentIntent({
      subtotal: dto.subtotal,
      shippingAmount: dto.shipping_amount ?? 0,
      currency: moneda,
      shippingAddress: dto.shipping_address,
      recipientName: dto.recipient_name,
      customerId: dto.customer_id,
      automaticTax: dto.automatic_tax ?? true,
      metadata: {
        id_pedido: dto.id_pedido,
        ...(directCharge ? { id_productor: String(directCharge.id_productor) } : {}),
      },
      connectedAccountId: directCharge?.connectedAccountId,
      applicationFeeAmount: directCharge?.applicationFeeAmount,
      transferGroup: `pedido-${dto.id_pedido}`,
    });

    await this.prisma.pedidos.update({
      where: { id_pedido: id_pedido_bi },
      data: {
        tax_amount: intent.taxAmount.toFixed(2),
        shipping_amount: intent.shippingAmount.toFixed(2),
        total: intent.totalAmount.toFixed(2),
        moneda,
      },
    });

    const pago = await this.prisma.pagos.create({
      data: {
        id_pedido: id_pedido_bi,
        proveedor: 'stripe',
        payment_intent_id: intent.paymentIntentId,
        estado: 'pendiente',
        monto: intent.totalAmount.toFixed(2),
        moneda,
      },
    });

    return serializeBigInts({
      ...pago,
      clientSecret: intent.clientSecret,
      paymentIntentId: intent.paymentIntentId,
      subtotal: intent.subtotal,
      taxAmount: intent.taxAmount,
      shippingAmount: intent.shippingAmount,
      totalAmount: intent.totalAmount,
      taxCalculationId: intent.taxCalculationId,
    });
  }

  async updatePaymentStatus(payment_intent_id: string, estado: string, isDirectCharge = false, taxCalculationId?: string) {
    const pago = await this.prisma.pagos.findFirst({
      where: { payment_intent_id },
      include: { pedidos: { include: { usuarios: true } } },
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    const updated = await this.prisma.pagos.update({
      where: { id_pago: pago.id_pago },
      data: { estado },
      include: { pedidos: true },
    });

    // Update order status based on payment status
    if (estado === 'completado') {
      // Record tax transaction with Stripe Tax if calculation exists
      if (taxCalculationId) {
        try {
          await this.stripeService.createTaxTransactionFromCalculation(
            taxCalculationId,
            `pi-${payment_intent_id}`,
          );
        } catch (err: any) {
          console.error('[pagos] createTaxTransactionFromCalculation failed:', err?.message);
        }
      }

      await this.prisma.pedidos.update({
        where: { id_pedido: pago.id_pedido },
        data: { estado: 'pagado' },
      });
      await this.prisma.pedido_productor.updateMany({
        where: { id_pedido: pago.id_pedido },
        data: { estado: 'confirmado' },
      });

      // Transfers now occur when order is marked as 'entregado' in updateOrderStatusForProductor
      // NOT here. Money is retained in platform account for escrow period until delivery confirmed.
      // if (!isDirectCharge) {
      //   await this.createTransfersForPedido(pago.id_pedido, updated.moneda);
      // }

      const buyer = (pago as any).pedidos?.usuarios;
      if (buyer?.email) {
        try {
          const incluyeAlcohol = await this.pedidoIncluyeAlcohol(pago.id_pedido);
          await this.emailService.sendOrderConfirmationEmail(
            buyer.email,
            String(pago.id_pedido),
            Number(pago.monto),
            { incluyeAlcohol },
          );
        } catch (err: any) {
          console.error('[pagos] sendOrderConfirmationEmail failed:', err?.message);
        }
      }
    } else if (estado === 'fallido') {
      await this.prisma.pedidos.update({
        where: { id_pedido: pago.id_pedido },
        data: { estado: 'pendiente' },
      });
    }

    return serializeBigInts(updated);
  }

  /**
   * Best-effort detection of whether the pedido contains alcoholic items.
   * Used only to decide whether to render the Surgeon General Warning in the
   * confirmation email; not a regulatory gate (that's the dry-state check + age gate).
   * Recognises any categoría named like alcohol/mezcal/destilado/licor/etc. with
   * requiere_edad_minima >= 18.
   */
  private async pedidoIncluyeAlcohol(id_pedido: bigint): Promise<boolean> {
    const detalles = await this.prisma.detalle_pedido.findMany({
      where: { id_pedido },
      select: {
        productos: {
          select: {
            categorias_productos: {
              select: { categorias: { select: { nombre: true, requiere_edad_minima: true } } },
            },
          },
        },
      },
    });
    const re = /mezcal|alcohol|destilad|licor|spirit|tequila|wine|vino|cerveza|beer/i;
    for (const d of detalles) {
      for (const link of d.productos?.categorias_productos ?? []) {
        const cat = link.categorias;
        if (!cat) continue;
        const minAge = cat.requiere_edad_minima ?? 0;
        if (minAge >= 18 && re.test(cat.nombre ?? '')) return true;
      }
    }
    return false;
  }

  /**
   * Authoritative checkout-time age verification.
   *
   * Inspects every line item in the pedido, takes the most restrictive
   * `requiere_edad_minima` (producto override or any of its categorias) and:
   *   - throws AGE_DOB_REQUIRED if the buyer has no fecha_nacimiento on file
   *   - throws AGE_INSUFFICIENT if the buyer's age is below the threshold
   *
   * No-op when nothing in the cart is age-restricted.
   */
  private async validarEdadDelComprador(id_pedido: bigint, id_usuario: string) {
    const detalles = await this.prisma.detalle_pedido.findMany({
      where: { id_pedido },
      select: {
        productos: {
          select: {
            requiere_edad_minima: true,
            categorias_productos: {
              select: { categorias: { select: { requiere_edad_minima: true } } },
            },
          },
        },
      },
    });

    let edadRequerida = 0;
    for (const d of detalles) {
      const p = d.productos;
      if (!p) continue;
      if (typeof p.requiere_edad_minima === 'number' && p.requiere_edad_minima > edadRequerida) {
        edadRequerida = p.requiere_edad_minima;
      }
      for (const link of p.categorias_productos ?? []) {
        const v = link.categorias?.requiere_edad_minima;
        if (typeof v === 'number' && v > edadRequerida) edadRequerida = v;
      }
    }

    if (edadRequerida === 0) return; // ningún ítem restringido

    const usuario = await this.prisma.usuarios.findUnique({
      where: { id_usuario },
      select: { fecha_nacimiento: true },
    });

    if (!usuario?.fecha_nacimiento) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'AGE_DOB_REQUIRED',
        edadRequerida,
        message: `Necesitamos tu fecha de nacimiento para verificar que tienes al menos ${edadRequerida} años.`,
      });
    }

    const edad = calcularEdadEnAnios(usuario.fecha_nacimiento);
    if (edad < edadRequerida) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'AGE_INSUFFICIENT',
        edadRequerida,
        edadActual: edad,
        message: `Debes tener al menos ${edadRequerida} años para comprar estos productos.`,
      });
    }
  }

  private readonly DEFAULT_FEE_PCT = 0.10;

  /**
   * Always returns null to force manual transfers to all productores.
   * This ensures multi-productor support - all payments go to the platform account
   * and then transfers are created to each productor's Stripe Connect account.
   */
  private async resolveDirectCharge(
    id_pedido: bigint,
    subtotal: number,
    shippingAmount: number,
  ): Promise<{ connectedAccountId: string; applicationFeeAmount: number; id_productor: number } | null> {
    return null;
  }

  /**
   * Legacy direct charge - disabled. Use manual transfers instead.
   */
  private async resolveDirectChargeLegacy(
    id_pedido: bigint,
    subtotal: number,
    shippingAmount: number,
  ): Promise<{ connectedAccountId: string; applicationFeeAmount: number; id_productor: number } | null> {
    const rows = await this.prisma.pedido_productor.findMany({
      where: { id_pedido },
      select: { id_productor: true },
    });
    const distinct = Array.from(new Set(rows.map((r) => r.id_productor)));
    if (distinct.length !== 1) return null;
    const id_productor = distinct[0];

    const prod = await this.prisma.productores.findUnique({
      where: { id_productor },
      select: { stripe_account_id: true, stripe_onboarding_completed: true },
    });
    if (!prod?.stripe_account_id) return null;

    let onboardingOk = prod.stripe_onboarding_completed;
    if (!onboardingOk) {
      try {
        const account = await this.stripeService.retrieveAccount(prod.stripe_account_id);
        if (account.charges_enabled && account.payouts_enabled) {
          onboardingOk = true;
          await this.prisma.productores.update({
            where: { id_productor },
            data: { stripe_onboarding_completed: true },
          });
        }
      } catch (error: any) {
        console.warn('[pagos] retrieveAccount failed for', prod.stripe_account_id, ':', error?.message);
      }
    }
    if (!onboardingOk) return null;

    const now = new Date();
    const productorRule = await this.prisma.comisiones.findFirst({
      where: {
        activo: true,
        id_productor,
        vigente_desde: { lte: now },
        OR: [{ vigente_hasta: null }, { vigente_hasta: { gt: now } }],
      },
      orderBy: { prioridad: 'asc' },
    });
    const globalRule = productorRule
      ? null
      : await this.prisma.comisiones.findFirst({
          where: {
            activo: true,
            alcance: 'global',
            id_productor: null,
            id_categoria: null,
            pais_iso2: null,
            vigente_desde: { lte: now },
            OR: [{ vigente_hasta: null }, { vigente_hasta: { gt: now } }],
          },
          orderBy: { prioridad: 'asc' },
        });
    const rule = productorRule ?? globalRule;
    const pct = rule ? Number(rule.porcentaje) : this.DEFAULT_FEE_PCT;
    const gross = subtotal + shippingAmount;
    const applicationFeeAmount = Math.max(0, Math.round(gross * pct * 100) / 100);

    return {
      connectedAccountId: prod.stripe_account_id,
      applicationFeeAmount,
      id_productor,
    };
  }

  private async createTransfersForPedido(id_pedido: bigint, moneda: string) {
    const pedidoProductores = await this.prisma.pedido_productor.findMany({
      where: { id_pedido },
      include: { productores: { select: { stripe_account_id: true, stripe_onboarding_completed: true, id_usuario: true } } },
    });

    this.logger.log(`[pagos] Iniciando transfers para pedido ${id_pedido}: ${pedidoProductores.length} productor(es)`);

    for (const pp of pedidoProductores) {
      if (!pp.productores?.stripe_account_id || !pp.productores.stripe_onboarding_completed) {
        const monto = pp.monto_neto_productor?.toString() || '0';
        this.logger.warn(
          `[pagos] Transfer skipped: productor ${pp.id_productor} sin onboarding en pedido ${id_pedido}, monto pendiente: ${monto} ${moneda}`,
        );
        try {
          await this.prisma.notificaciones.create({
            data: {
              id_usuario: pp.productores?.id_usuario || '',
              tipo: 'pago_pendiente_onboarding',
              titulo: 'Tienes un pago pendiente por transferir',
              cuerpo: `Tienes un pago de ${monto} ${moneda} en el pedido #${id_pedido} que está pendiente de transferir. Por favor completa tu configuración de Stripe para recibirlo.`,
              url_accion: '/dashboard/productor/ingresos',
            },
          });
        } catch (err: any) {
          this.logger.error('[pagos] Failed to create notification for productor', pp.id_productor, ':', err?.message);
        }
        continue;
      }

      const montoNetoCents = pp.monto_neto_productor ? Math.round(Number(pp.monto_neto_productor) * 100) : 0;
      if (montoNetoCents <= 0) {
        this.logger.warn('[pagos] skipping transfer for productor with non-positive monto_neto', pp.id_productor);
        continue;
      }

      try {
        const transfer = await this.stripeService.createTransfer({
          amountCents: montoNetoCents,
          currency: moneda,
          destination: pp.productores.stripe_account_id,
          transferGroup: `pedido-${id_pedido}`,
          idempotencyKey: `transfer-${id_pedido}-${pp.id_productor}`,
          metadata: {
            id_pedido: String(id_pedido),
            id_productor: String(pp.id_productor),
          },
        });

        // Create payout record with transfer_id for traceability and refund support
        const today = new Date();
        const payout = await this.prisma.payouts.create({
          data: {
            id_productor: pp.id_productor,
            moneda: moneda.toLowerCase(),
            monto_bruto: pp.subtotal_bruto ?? pp.monto_neto_productor ?? 0,
            monto_comision: pp.comision_marketplace,
            monto_neto: pp.monto_neto_productor ?? 0,
            estado: 'procesado',
            proveedor: 'stripe',
            referencia_externa: transfer.id,
            periodo_desde: today,
            periodo_hasta: today,
          },
        });

        // Link payout to pedido_productor for traceability
        await this.prisma.pedido_productor.update({
          where: { id_pedido_id_productor: { id_pedido, id_productor: pp.id_productor } },
          data: { id_payout: payout.id_payout },
        });

        this.logger.log(`[pagos] Transfer exitoso para productor ${pp.id_productor}: ${transfer.id}`);
      } catch (error: any) {
        this.logger.error(`[pagos] createTransfer failed for productor ${pp.id_productor}:`, error?.message);
        const today = new Date();
        const payoutFallido = await this.prisma.payouts.create({
          data: {
            id_productor: pp.id_productor,
            moneda: moneda.toLowerCase(),
            monto_bruto: pp.subtotal_bruto ?? pp.monto_neto_productor ?? 0,
            monto_comision: pp.comision_marketplace,
            monto_neto: pp.monto_neto_productor ?? 0,
            estado: 'fallido',
            proveedor: 'stripe',
            periodo_desde: today,
            periodo_hasta: today,
            intentos: 1,
            ultimo_error: error?.message?.slice(0, 500),
            proximo_reintento: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
        await this.prisma.pedido_productor.update({
          where: { id_pedido_id_productor: { id_pedido, id_productor: pp.id_productor } },
          data: { id_payout: payoutFallido.id_payout },
        });
      }
    }
  }

  async reembolsarPago(id_pago: string) {
    const pago = await this.prisma.pagos.findUnique({
      where: { id_pago: toBigIntId(id_pago) },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    if (pago.estado === 'reembolsado') throw new BadRequestException('El pago ya fue reembolsado');
    if (pago.estado !== 'completado') throw new BadRequestException('Solo se pueden reembolsar pagos completados');
    if (!pago.payment_intent_id) throw new BadRequestException('Sin payment_intent_id');

    const pi = await this.stripeService.retrievePaymentIntent(pago.payment_intent_id);
    const isDirectCharge = !!(pi.transfer_data?.destination);

    if (isDirectCharge) {
      // Direct charge: Stripe reverts transfer automatically
      await this.stripeService.createRefund({
        paymentIntentId: pago.payment_intent_id,
        reverseTransfer: true,
        refundApplicationFee: true,
      });
    } else {
      // Manual transfers: need to revert each transfer individually
      const rows = await this.prisma.pedido_productor.findMany({
        where: { id_pedido: pago.id_pedido },
        include: { payout: { select: { referencia_externa: true, estado: true, intentos: true, ultimo_error: true } } },
      });

      const missingTransfers = rows.filter((r) => !r.payout?.referencia_externa);
      if (missingTransfers.length > 0) {
        const detalles = missingTransfers
          .map((r) => `Productor ${r.id_productor}: estado=${r.payout?.estado}, intentos=${r.payout?.intentos}, error=${r.payout?.ultimo_error}`)
          .join('; ');
        throw new UnprocessableEntityException(
          `No se pueden revertir las transferencias automáticamente: ${missingTransfers.length} transfer(s) faltante(s). Detalles: ${detalles}. Requiere reconciliación manual.`,
        );
      }

      for (const r of rows) {
        if (r.payout?.referencia_externa) {
          try {
            await this.stripeService.createTransferReversal(r.payout.referencia_externa);
          } catch (err: any) {
            console.error('[pagos] createTransferReversal failed for transfer', r.payout.referencia_externa, ':', err?.message);
          }
        }
      }

      // After reverting all transfers, refund the payment intent
      await this.stripeService.createRefund({
        paymentIntentId: pago.payment_intent_id,
      });
    }

    // Update payment and order status
    await this.prisma.pagos.update({
      where: { id_pago: pago.id_pago },
      data: { estado: 'reembolsado' },
    });
    await this.prisma.pedidos.update({
      where: { id_pedido: pago.id_pedido },
      data: { estado: 'cancelado' },
    });

    return serializeBigInts({ id_pago: pago.id_pago, estado: 'reembolsado' });
  }

  @Cron('*/15 * * * *')
  async retryFailedTransfers() {
    const MAX_INTENTOS = 5;
    this.logger.debug('[pagos] Iniciando retry de transfers fallidos');

    const failed = await this.prisma.payouts.findMany({
      where: {
        estado: 'fallido',
        intentos: { lt: MAX_INTENTOS },
        OR: [{ proximo_reintento: null }, { proximo_reintento: { lte: new Date() } }],
      },
      include: {
        pedido_productor: {
          take: 1,
          include: {
            productores: {
              select: { stripe_account_id: true, stripe_onboarding_completed: true },
            },
          },
        },
      },
    });

    if (failed.length === 0) return;

    this.logger.log(`[pagos] Retrying ${failed.length} fallidos transfer(s)`);

    for (const payout of failed) {
      const pp = payout.pedido_productor[0];
      if (!pp?.productores?.stripe_account_id || !pp.productores.stripe_onboarding_completed) {
        this.logger.warn(`[pagos] Skipping retry para productor ${pp.id_productor}: sin onboarding`);
        continue;
      }

      try {
        const transfer = await this.stripeService.createTransfer({
          amountCents: Math.round(Number(payout.monto_neto) * 100),
          currency: payout.moneda,
          destination: pp.productores.stripe_account_id,
          transferGroup: `pedido-${pp.id_pedido}`,
          idempotencyKey: `transfer-${pp.id_pedido}-${pp.id_productor}`,
          metadata: {
            id_pedido: String(pp.id_pedido),
            id_productor: String(pp.id_productor),
          },
        });

        await this.prisma.payouts.update({
          where: { id_payout: payout.id_payout },
          data: {
            estado: 'procesado',
            referencia_externa: transfer.id,
            procesado_en: new Date(),
            ultimo_error: null,
          },
        });

        this.logger.log(`[pagos] Transfer exitoso en retry para productor ${pp.id_productor}: ${transfer.id}`);
      } catch (error: any) {
        const nuevosIntentos = payout.intentos + 1;
        const backoffMs = Math.min(24 * 60, 15 * Math.pow(2, nuevosIntentos)) * 60_000;

        await this.prisma.payouts.update({
          where: { id_payout: payout.id_payout },
          data: {
            intentos: nuevosIntentos,
            ultimo_error: error?.message?.slice(0, 500),
            estado: nuevosIntentos >= MAX_INTENTOS ? 'agotado' : 'fallido',
            proximo_reintento: new Date(Date.now() + backoffMs),
          },
        });

        if (nuevosIntentos >= MAX_INTENTOS) {
          this.logger.error(
            `[pagos] Transfer AGOTADO para productor ${pp.id_productor} pedido ${pp.id_pedido}: requiere revisión manual. Error: ${error?.message}`,
          );
        } else {
          this.logger.warn(
            `[pagos] Retry intento ${nuevosIntentos}/${MAX_INTENTOS} para productor ${pp.id_productor}: ${error?.message}`,
          );
        }
      }
    }
  }
}
