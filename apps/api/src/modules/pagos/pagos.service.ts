import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException, Optional, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Moneda } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ComisionesService } from '../comisiones/comisiones.service';
import { EmailService } from '../email/email.service';
import { EnviosService } from '../envios/envios.service';
import { LotesService } from '../lotes/lotes.service';
import { calcularEdadEnAnios } from '../productos/edad.helper';
import { serializeBigInts, toBigIntId } from '../../common/utilities/serialize';
import { TasasCambioService } from '../tasas-cambio/tasas-cambio.service';
import { CreatePagoDto, CreateStripeIntentDto, UpdatePagoDto, CreatePaypalOrderDto, CapturePaypalOrderDto } from './dto/pagos.dto';
import { PaypalService } from './paypal.service';
import { StripeService } from './stripe.service';

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly paypalService: PaypalService,
    private readonly emailService: EmailService,
    private readonly comisionesService: ComisionesService,
    private readonly tasasCambioService: TasasCambioService,
    private readonly lotesService: LotesService,
    @Optional() private readonly enviosService: EnviosService | null,
  ) {}
  async findAll(filtros?: { estado?: string; proveedor?: string }) {
    const where: any = {};
    if (filtros?.estado) where.estado = filtros.estado;
    if (filtros?.proveedor) where.proveedor = filtros.proveedor;
    return serializeBigInts(
      await this.prisma.pagos.findMany({
        where,
        orderBy: { creado_en: 'desc' },
        include: {
          pedidos: {
            select: {
              id_pedido: true,
              estado: true,
              total: true,
              moneda: true,
              usuarios: { select: { nombre: true, apellido_paterno: true, email: true } },
            },
          },
        },
      }),
    );
  }

  /**
   * Inserta el event_id en webhook_events_log antes de procesar.
   * Si el insert falla por unique constraint (P2002) el evento ya fue procesado → retorna false.
   * El caller debe retornar inmediatamente cuando recibe false.
   */
  async deduplicateWebhookEvent(provider: string, event_id: string, event_type: string): Promise<boolean> {
    try {
      await this.prisma.webhook_events_log.create({ data: { provider, event_id, event_type } });
      return true;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        this.logger.warn(`[webhook] Evento duplicado ignorado: provider=${provider} event_id=${event_id}`);
        return false;
      }
      throw err;
    }
  }

  /**
   * Revierte el registro de dedup de un webhook. Se usa cuando el procesamiento
   * falla por un error transitorio: al borrar el registro, el reintento del
   * proveedor (Stripe/PayPal) volverá a procesarse en lugar de descartarse como
   * "duplicado" y perderse silenciosamente.
   */
  async discardWebhookEvent(provider: string, event_id: string): Promise<void> {
    await this.prisma.webhook_events_log.deleteMany({ where: { provider, event_id } });
  }

  @Cron('0 3 * * *') // Diario a las 3am
  async purgeOldWebhookEvents(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.webhook_events_log.deleteMany({
      where: { processed_at: { lt: cutoff } },
    });
    if (count > 0) {
      this.logger.log(`[webhook-purge] Eliminados ${count} eventos con más de 30 días`);
    }
  }

  async resolverManual(id_pago: string, notas?: string) {
    const pago = await this.prisma.pagos.findUnique({ where: { id_pago: toBigIntId(id_pago) } });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    if (pago.estado !== 'reembolso_pendiente_manual') {
      throw new BadRequestException(`Solo se pueden resolver pagos en estado 'reembolso_pendiente_manual'. Estado actual: ${pago.estado}`);
    }
    const updated = await this.prisma.pagos.update({
      where: { id_pago: pago.id_pago },
      data: { estado: 'reembolsado' },
    });
    this.logger.log(`[pagos] Reembolso manual resuelto por admin: pago=${id_pago}${notas ? ` notas="${notas}"` : ''}`);
    return serializeBigInts(updated);
  }
  async findOne(id_pago: string) { const item = await this.prisma.pagos.findUnique({ where: { id_pago: toBigIntId(id_pago) }, include: { pedidos: true } }); if (!item) throw new NotFoundException('Pago no encontrado'); return serializeBigInts(item); }
  async create(dto: CreatePagoDto) { return serializeBigInts(await this.prisma.pagos.create({ data: { id_pedido: toBigIntId(dto.id_pedido), proveedor: dto.proveedor ?? null, payment_intent_id: dto.payment_intent_id ?? null, estado: dto.estado?.trim() ?? 'pendiente', monto: dto.monto, moneda: dto.moneda } })); }
  async update(id_pago: string, dto: UpdatePagoDto) { return serializeBigInts(await this.prisma.pagos.update({ where: { id_pago: toBigIntId(id_pago) }, data: { id_pedido: dto.id_pedido ? toBigIntId(dto.id_pedido) : undefined, proveedor: dto.proveedor, payment_intent_id: dto.payment_intent_id, estado: dto.estado?.trim(), monto: dto.monto, moneda: dto.moneda } })); }
  async remove(id_pago: string) { await this.prisma.pagos.delete({ where: { id_pago: toBigIntId(id_pago) } }); return { message: 'Pago eliminado' }; }

  async getIdProductorByUserId(id_usuario: string): Promise<number | null> {
    const productor = await this.prisma.productores.findUnique({
      where: { id_usuario },
      select: { id_productor: true },
    });
    return productor?.id_productor ?? null;
  }

  async verifyProductorOwnership(id_usuario: string, id_productor: number): Promise<boolean> {
    const p = await this.prisma.productores.findFirst({
      where: { id_productor, id_usuario },
      select: { id_productor: true },
    });
    return p != null;
  }

  async getIngresosResumen(id_productor: number) {
    const pedidoProductores = await this.prisma.pedido_productor.findMany({
      where: { id_productor, estado: { not: 'cancelado' } },
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

  async validatePedidoOwnership(id_pedido: string, id_usuario: string): Promise<void> {
    const pedido = await this.prisma.pedidos.findUnique({
      where: { id_pedido: toBigIntId(id_pedido) },
      select: { id_pedido: true, id_usuario: true },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (pedido.id_usuario !== id_usuario) {
      throw new ForbiddenException('No tienes permiso para operar sobre este pedido');
    }
  }

  async createStripePaymentIntent(dto: CreateStripeIntentDto) {
    const id_pedido_bi = toBigIntId(dto.id_pedido);
    const pedido = await this.prisma.pedidos.findUnique({ where: { id_pedido: id_pedido_bi } });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');

    await this.validarEdadDelComprador(id_pedido_bi, pedido.id_usuario);
    await this.validarSubtotalContraDB(id_pedido_bi, dto.subtotal);
    await this.validarShippingContraDB(id_pedido_bi, dto.shipping_amount ?? 0);

    const categoriaIds = await this.obtenerCategoriasDelPedido(id_pedido_bi);
    const paisDestino = dto.shipping_address.country;
    await this.validarTasaCambioVigente(paisDestino);
    await this.validarNexoFiscal(paisDestino, dto.shipping_address.state);
    // Impuestos en MXN (canónico); el reparto a productores y la contabilidad van en MXN.
    const { taxAmount: taxMxn, taxBreakdown } = await this.calcularImpuestos(dto.subtotal, dto.shipping_amount ?? 0, paisDestino, categoriaIds, dto.shipping_address.state);

    // C-4: moneda de cobro al cliente (USD para destino != MX) + conversión congelada.
    const cobro = await this.resolverCobro(paisDestino, { subtotal: dto.subtotal, shipping: dto.shipping_amount ?? 0, tax: taxMxn });

    const directCharge = await this.resolveDirectCharge(id_pedido_bi, dto.subtotal, dto.shipping_amount ?? 0);

    const intent = await this.stripeService.createPaymentIntent({
      subtotal: cobro.subtotal,
      shippingAmount: cobro.shipping,
      taxAmount: cobro.tax,
      currency: cobro.moneda,
      shippingAddress: dto.shipping_address,
      recipientName: dto.recipient_name,
      customerId: dto.customer_id,
      metadata: {
        id_pedido: dto.id_pedido,
        ...(directCharge ? { id_productor: String(directCharge.id_productor) } : {}),
      },
      connectedAccountId: directCharge?.connectedAccountId,
      applicationFeeAmount: directCharge?.applicationFeeAmount,
      transferGroup: `pedido-${dto.id_pedido}`,
    });

    // pedidos: contabilidad SIEMPRE en MXN (canónico, base de payouts a productores).
    await this.prisma.pedidos.update({
      where: { id_pedido: id_pedido_bi },
      data: {
        tax_amount: taxMxn.toFixed(2),
        shipping_amount: (dto.shipping_amount ?? 0).toFixed(2),
        total: cobro.totalMxn.toFixed(2),
        moneda: 'MXN',
      },
    });

    // Recalcular distribución por productor (siempre en MXN).
    await this.recalcularDistribucionPedido(id_pedido_bi, 'MXN');

    const pago = await this.prisma.pagos.create({
      data: {
        id_pedido: id_pedido_bi,
        proveedor: 'stripe',
        payment_intent_id: intent.paymentIntentId,
        estado: 'pendiente',
        monto: intent.totalAmount.toFixed(2), // cargo real (USD o MXN)
        moneda: cobro.moneda,
        monto_mxn: cobro.totalMxn.toFixed(2),
        tasa_cambio: cobro.tasa.toFixed(8),
      },
    });

    return serializeBigInts({
      ...pago,
      clientSecret: intent.clientSecret,
      paymentIntentId: intent.paymentIntentId,
      // El frontend convierte desde MXN para mostrar; devolvemos los montos canónicos MXN.
      subtotal: dto.subtotal,
      taxAmount: taxMxn,
      taxBreakdown,
      shippingAmount: dto.shipping_amount ?? 0,
      totalAmount: cobro.totalMxn,
      // Cargo real al cliente (la UI de Stripe ya lo muestra; útil para confirmaciones).
      monedaCobro: cobro.moneda,
      totalCobrado: intent.totalAmount,
      tasaCambio: cobro.tasa,
    });
  }

  async createPaypalOrder(dto: CreatePaypalOrderDto) {
    const id_pedido_bi = toBigIntId(dto.id_pedido);
    const pedido = await this.prisma.pedidos.findUnique({ where: { id_pedido: id_pedido_bi } });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');

    await this.validarEdadDelComprador(id_pedido_bi, pedido.id_usuario);
    await this.validarSubtotalContraDB(id_pedido_bi, dto.subtotal);
    await this.validarShippingContraDB(id_pedido_bi, dto.shipping_amount ?? 0);

    const categoriaIds = await this.obtenerCategoriasDelPedido(id_pedido_bi);
    const paisDestino = dto.shipping_address?.country ?? 'MX';
    await this.validarTasaCambioVigente(paisDestino);
    await this.validarNexoFiscal(paisDestino, dto.shipping_address?.state);
    const { taxAmount: taxMxn, taxBreakdown } = await this.calcularImpuestos(dto.subtotal, dto.shipping_amount ?? 0, paisDestino, categoriaIds, dto.shipping_address?.state);

    // C-4: moneda de cobro al cliente (USD para destino != MX) + conversión congelada.
    const cobro = await this.resolverCobro(paisDestino, { subtotal: dto.subtotal, shipping: dto.shipping_amount ?? 0, tax: taxMxn });

    const paypalOrder = await this.paypalService.createOrder({
      totalAmount: cobro.total,
      currency: cobro.moneda,
      referenceId: String(id_pedido_bi),
      shippingAddress: dto.shipping_address,
    });

    // pedidos: contabilidad SIEMPRE en MXN (canónico, base de payouts a productores).
    await this.prisma.pedidos.update({
      where: { id_pedido: id_pedido_bi },
      data: {
        shipping_amount: (dto.shipping_amount ?? 0).toFixed(2),
        tax_amount: taxMxn.toFixed(2),
        total: cobro.totalMxn.toFixed(2),
        moneda: 'MXN',
      },
    });

    // Recalcular distribución por productor (siempre en MXN).
    await this.recalcularDistribucionPedido(id_pedido_bi, 'MXN');

    const pago = await this.prisma.pagos.create({
      data: {
        id_pedido: id_pedido_bi,
        proveedor: 'paypal',
        payment_intent_id: paypalOrder.orderId,
        estado: 'pendiente',
        monto: cobro.total.toFixed(2), // cargo real (USD o MXN)
        moneda: cobro.moneda,
        monto_mxn: cobro.totalMxn.toFixed(2),
        tasa_cambio: cobro.tasa.toFixed(8),
      },
    });

    return serializeBigInts({
      ...pago,
      orderId: paypalOrder.orderId,
      approveUrl: paypalOrder.approveUrl,
      // El frontend convierte desde MXN para mostrar; devolvemos los montos canónicos MXN.
      subtotal: dto.subtotal,
      taxAmount: taxMxn,
      taxBreakdown,
      shippingAmount: dto.shipping_amount ?? 0,
      totalAmount: cobro.totalMxn,
      monedaCobro: cobro.moneda,
      totalCobrado: cobro.total,
      tasaCambio: cobro.tasa,
    });
  }

  async capturePaypalOrder(dto: CapturePaypalOrderDto) {
    const pago = await this.prisma.pagos.findFirst({
      where: { payment_intent_id: dto.paypal_order_id, proveedor: 'paypal' },
      include: { pedidos: true },
    });

    if (!pago) {
      throw new NotFoundException('PayPal order no encontrado');
    }

    // Capture the order
    const captureResult = await this.paypalService.captureOrder(dto.paypal_order_id);

    if (captureResult.status !== 'COMPLETED') {
      throw new BadRequestException(`PayPal capture failed with status: ${captureResult.status}`);
    }

    // Actualizar solo el payment_intent_id con el captureId de PayPal.
    // NO marcar como 'completado' aquí — updatePaymentStatus lo hará y
    // ejecutará todos los side effects (notificaciones, orden, etc.) exactamente una vez.
    await this.prisma.pagos.update({
      where: { id_pago: pago.id_pago },
      data: { payment_intent_id: captureResult.captureId },
    });

    const updated = await this.updatePaymentStatus(captureResult.captureId, 'completado');

    return updated;
  }

  /**
   * Confirmación SÍNCRONA del pago con tarjeta (Stripe). Se invoca desde el frontend al
   * volver de `confirmCardPayment` exitoso para no depender del webhook (que en sandbox/local
   * puede no llegar). Verifica el PaymentIntent contra Stripe y, si está 'succeeded', marca el
   * pago como 'completado' vía updatePaymentStatus (idempotente; el webhook queda de respaldo).
   */
  async confirmStripePayment(id_pedido: string, id_usuario: string) {
    await this.validatePedidoOwnership(id_pedido, id_usuario);

    const idPedidoBi = toBigIntId(id_pedido);
    const leerEstado = async () => {
      const p = await this.prisma.pedidos.findUnique({
        where: { id_pedido: idPedidoBi },
        select: { estado: true },
      });
      return p?.estado ?? 'pendiente';
    };

    const pago = await this.prisma.pagos.findFirst({
      where: { id_pedido: idPedidoBi, proveedor: 'stripe', payment_intent_id: { not: null } },
      orderBy: { creado_en: 'desc' },
    });

    if (!pago?.payment_intent_id) {
      return { estado: await leerEstado(), confirmado: false };
    }

    let pi: any;
    try {
      pi = await this.stripeService.retrievePaymentIntent(pago.payment_intent_id);
    } catch (err: any) {
      this.logger.warn(
        `[pagos] confirmStripePayment: no se pudo recuperar PI ${pago.payment_intent_id}: ${err?.message}`,
      );
      return { estado: await leerEstado(), confirmado: false };
    }

    if (pi?.status === 'succeeded') {
      const isDirectCharge = !!pi.transfer_data?.destination;
      const taxCalculationId = pi.metadata?.tax_calculation as string | undefined;
      await this.updatePaymentStatus(pago.payment_intent_id, 'completado', isDirectCharge, taxCalculationId);
    }

    return { estado: await leerEstado(), confirmado: pi?.status === 'succeeded' };
  }

  async updatePaymentStatus(payment_intent_id: string, estado: string, isDirectCharge = false, taxCalculationId?: string) {
    // Lookup para obtener id_pago y datos de usuario (necesarios después)
    const pago = await this.prisma.pagos.findFirst({
      where: { payment_intent_id },
      include: { pedidos: { include: { usuarios: true } } },
    });

    if (!pago) {
      // Dead-letter: el intent no coincide con ningún pago (p.ej. evento de otra
      // cuenta/sistema, o un pago borrado). NO relanzamos: si lo hiciéramos, Stripe
      // reintentaría indefinidamente un evento que nunca podrá resolverse. Lo
      // registramos y alertamos a admins para revisión manual.
      this.logger.error(
        `[pagos] Webhook sin pago coincidente: payment_intent_id=${payment_intent_id}, evento=${estado}`,
      );
      await this.notificarAdmins(
        'pago_sin_coincidencia',
        'Webhook de pago sin pago asociado',
        `Se recibió un webhook (estado="${estado}") para payment_intent_id=${payment_intent_id} pero no existe un pago con ese intent. Requiere revisión manual.`,
      );
      return null;
    }

    // Update atómico: solo actualiza si el estado actual NO es final.
    // Esto elimina la race condition entre check y update — si dos webhooks
    // concurrentes pasan el findFirst, solo uno logrará hacer el updateMany (count=1).
    const result = await this.prisma.pagos.updateMany({
      where: {
        id_pago: pago.id_pago,
        estado: { notIn: ['completado', 'reembolsado', 'cancelado'] },
      },
      data: { estado },
    });

    if (result.count === 0) {
      this.logger.warn(
        `[pagos] Webhook ignorado para payment_intent_id=${payment_intent_id}: estado actual=${pago.estado}, evento=${estado}`,
      );
      return serializeBigInts(pago);
    }

    const updated = await this.prisma.pagos.findUnique({
      where: { id_pago: pago.id_pago },
      include: { pedidos: true },
    });

    if (estado === 'completado') {
      await this.prisma.pedidos.update({
        where: { id_pedido: pago.id_pedido },
        data: { estado: 'pagado' },
      });
      await this.prisma.pedido_productor.updateMany({
        where: { id_pedido: pago.id_pedido },
        data: { estado: 'confirmado' },
      });

      // C-7: registrar la comisión real de Stripe en payment_fees para conciliación de
      // margen. Corre una sola vez (el updateMany de arriba garantiza count===1 por pago).
      // No bloquea el flujo del webhook si la lectura del fee falla.
      if ((pago.proveedor ?? 'stripe') === 'stripe') {
        try {
          const fee = await this.stripeService.getProcessingFee(payment_intent_id);
          if (fee && (fee.currency === 'MXN' || fee.currency === 'USD')) {
            await this.prisma.payment_fees.create({
              data: {
                id_pago: pago.id_pago,
                proveedor: 'stripe',
                monto_fee: (fee.feeMinor / 100).toFixed(6),
                moneda: fee.currency as Moneda,
                descripcion: 'Stripe processing fee',
              },
            });
          }
        } catch (err: any) {
          this.logger.error(`[pagos] No se pudo registrar payment_fee para pago ${pago.id_pago}: ${err?.message}`);
        }
      }

      // Transfers now occur when order is marked as 'entregado' in updateOrderStatusForProductor
      // NOT here. Money is retained in platform account for escrow period until delivery confirmed.
      // if (!isDirectCharge) {
      //   await this.createTransfersForPedido(pago.id_pedido, updated.moneda);
      // }

      const buyer = (pago as any).pedidos?.usuarios;
      if (buyer?.email) {
        try {
          const incluyeAlcohol = await this.pedidoIncluyeAlcohol(pago.id_pedido);

          const pedidoCompleto = await this.prisma.pedidos.findUnique({
            where: { id_pedido: pago.id_pedido },
            select: {
              shipping_amount: true,
              tax_amount: true,
              moneda: true,
              detalle_pedido: {
                select: {
                  cantidad: true,
                  precio_compra: true,
                  moneda_compra: true,
                  productos: { select: { nombre: true } },
                },
              },
            },
          });

          const items = pedidoCompleto?.detalle_pedido.map((d) => ({
            nombre: d.productos?.nombre ?? 'Producto',
            cantidad: d.cantidad,
            precio_unitario: Number(d.precio_compra),
            moneda: d.moneda_compra ?? pedidoCompleto.moneda ?? 'MXN',
          })) ?? [];

          const subtotalCalculado = items.reduce(
            (acc, i) => acc + i.precio_unitario * i.cantidad, 0,
          );

          const nombreCliente = [buyer.nombre, buyer.apellido_paterno].filter(Boolean).join(' ');

          // Idioma: inglés si el pedido es en USD (destino internacional), o si el
          // usuario tiene idioma_preferido = 'en'.
          const monedaPedido = pedidoCompleto?.moneda ?? 'MXN';
          const lang: 'es' | 'en' =
            monedaPedido === 'USD' || buyer.idioma_preferido === 'en' ? 'en' : 'es';

          await this.emailService.sendOrderConfirmationEmail(
            buyer.email,
            String(pago.id_pedido),
            Number(pago.monto),
            {
              incluyeAlcohol,
              items,
              subtotal: subtotalCalculado,
              shipping: pedidoCompleto ? Number(pedidoCompleto.shipping_amount) : 0,
              tax: pedidoCompleto ? Number(pedidoCompleto.tax_amount) : 0,
              moneda: monedaPedido,
              nombreCliente,
              fecha: new Date().toISOString(),
              metodoPago: pago.proveedor === 'paypal' ? 'PayPal' : 'Tarjeta de crédito/débito',
              lang,
            },
          );
        } catch (err: any) {
          this.logger.warn(`[pagos] sendOrderConfirmationEmail failed: ${err?.message}`);
        }
      }

      // Notificar a cada productor involucrado en el pedido
      try {
        const pedidoProductores = await this.prisma.pedido_productor.findMany({
          where: { id_pedido: pago.id_pedido },
          include: { productores: { select: { id_usuario: true } } },
        });
        await Promise.all(
          pedidoProductores
            .filter((pp) => pp.productores?.id_usuario)
            .map((pp) =>
              this.prisma.notificaciones.create({
                data: {
                  id_usuario: pp.productores!.id_usuario,
                  tipo: 'pedido_pagado',
                  titulo: 'Nuevo pedido recibido',
                  cuerpo: `Tienes un nuevo pedido #${pago.id_pedido} confirmado. Prepara el envío de tus productos.`,
                  url_accion: '/dashboard/productor/pedidos',
                  leido: false,
                },
              })
            )
        );
      } catch (err: any) {
        this.logger.error('[pagos] Failed to create pedido_pagado notifications:', err?.message);
      }

      // Fire-and-forget: auto-purchase shipping labels for each producer.
      // Failure here does NOT fail the webhook — order stays in 'pagado' for admin retry.
      if (this.enviosService) {
        this.crearGuiasPostPago(pago.id_pedido).catch((err) =>
          this.logger.error(`[pagos] crearGuiasPostPago failed for pedido=${pago.id_pedido}: ${err?.message}`),
        );
      }
    } else if (estado === 'fallido') {
      await this.prisma.pedidos.update({
        where: { id_pedido: pago.id_pedido },
        data: { estado: 'pendiente' },
      });
    }

    return serializeBigInts(updated ?? pago);
  }

  private async crearGuiasPostPago(id_pedido: bigint): Promise<void> {
    if (!this.enviosService) return;
    const resultados = await this.enviosService.crearEnviosPorProductor(Number(id_pedido));
    const exitosos = resultados.filter((r) => !r.error && !r.skipped);
    if (exitosos.length > 0) {
      await this.prisma.pedidos.update({
        where: { id_pedido },
        data: { estado: 'label_purchased' },
      });
    }
    this.logger.log(
      `[pagos] Guías post-pago: pedido=${id_pedido} exitosas=${exitosos.length} errores=${resultados.filter((r) => r.error).length}`,
    );
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
    // Detectar si hay productos con restricción de edad (mayores de 18)
    for (const d of detalles) {
      for (const link of d.productos?.categorias_productos ?? []) {
        const cat = link.categorias;
        if (!cat) continue;
        const minAge = cat.requiere_edad_minima ?? 0;
        if (minAge >= 18) return true;
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

  /**
   * Recalcula el subtotal desde detalle_pedido en BD y rechaza si difiere del
   * valor enviado por el cliente en más de $0.05 (tolerancia para redondeos de float).
   * Previene manipulación de precio desde el frontend.
   */
  private async validarSubtotalContraDB(id_pedido: bigint, subtotalCliente: number): Promise<void> {
    const detalles = await this.prisma.detalle_pedido.findMany({
      where: { id_pedido },
      select: { precio_compra: true, cantidad: true },
    });
    if (detalles.length === 0) {
      throw new BadRequestException('El pedido no tiene ítems.');
    }
    const subtotalReal = detalles.reduce(
      (sum, d) => sum + Math.round(Number(d.precio_compra) * d.cantidad * 100) / 100,
      0,
    );
    const subtotalRealRounded = Math.round(subtotalReal * 100) / 100;
    const subtotalClienteRounded = Math.round(subtotalCliente * 100) / 100;
    if (Math.abs(subtotalRealRounded - subtotalClienteRounded) > 0.05) {
      this.logger.error(
        `[pagos] Monto manipulado detectado: cliente=${subtotalClienteRounded}, BD=${subtotalRealRounded}, pedido=${id_pedido}`,
      );
      throw new BadRequestException(
        `El subtotal enviado (${subtotalClienteRounded}) no coincide con el total de los ítems (${subtotalRealRounded}). Recarga el carrito e intenta de nuevo.`,
      );
    }
  }

  /**
   * Validates shipping amount against the sum of the most-recent valid quotations stored in DB
   * (one per productor, saved by the frontend after carrier selection).
   * Allows ±2% tolerance for float-to-currency-conversion rounding only.
   * Rejects any amount meaningfully below what was quoted to prevent price manipulation.
   */
  private async validarShippingContraDB(id_pedido: bigint, shippingCliente: number): Promise<void> {
    if (shippingCliente < 0) {
      throw new BadRequestException('El costo de envío no puede ser negativo.');
    }
    const cotizaciones = await this.prisma.envio_cotizaciones.findMany({
      where: {
        id_pedido,
        valida_hasta: { gte: new Date() },
      },
      select: { precio_total: true },
      orderBy: { fecha_solicitud: 'desc' },
    });
    if (cotizaciones.length === 0) {
      // Verificar si existen cotizaciones pero expiradas para dar mensaje más específico
      const expiradas = await this.prisma.envio_cotizaciones.count({
        where: { id_pedido, valida_hasta: { lt: new Date() } },
      });
      if (expiradas > 0) {
        throw new BadRequestException(
          'COTIZACIONES_EXPIRADAS: Las cotizaciones de envío han expirado. Regresa al paso de envío para seleccionar una tarifa actualizada.',
        );
      }
      throw new BadRequestException(
        'Se requieren cotizaciones de envío guardadas para procesar el pago. Regresa al paso de envío y selecciona una tarifa.',
      );
    }
    const precioTotal = cotizaciones.reduce((s, c) => s + Number(c.precio_total ?? 0), 0);
    if (precioTotal <= 0) return;
    const shippingRounded = Math.round(shippingCliente * 100) / 100;
    // Tolerancia del 2%: cubre redondeos de conversión MXN↔USD, no manipulación real
    if (shippingRounded < precioTotal * 0.98) {
      this.logger.error(
        `[pagos] Shipping manipulado detectado: cliente=${shippingRounded}, cotizado=${precioTotal.toFixed(2)}, pedido=${id_pedido}`,
      );
      throw new BadRequestException(
        `El costo de envío enviado (${shippingRounded}) no coincide con las tarifas cotizadas (${precioTotal.toFixed(2)}). Recarga la página e intenta de nuevo.`,
      );
    }

  }

  /**
   * A-1: Bloquea el checkout si la tasa MXN→USD está obsoleta cuando el destino no es MX.
   * El precio que ve y acepta el cliente internacional se deriva de esta tasa; si el cron
   * de ExchangeRate-API está caído (tasa stale o solo fallback), no procesamos el pago para
   * no cobrar/mostrar un monto basado en una tasa incorrecta. Para MX no aplica.
   */
  private async validarTasaCambioVigente(paisDestino?: string): Promise<void> {
    if (!paisDestino || paisDestino.toUpperCase() === 'MX') return;
    let rate: any;
    try {
      rate = await this.tasasCambioService.getVigente('MXN', 'USD');
    } catch {
      rate = null;
    }
    if (!rate || rate.stale) {
      this.logger.error(
        `[pagos] Checkout bloqueado: tasa MXN→USD obsoleta/ausente para destino ${paisDestino.toUpperCase()}.`,
      );
      throw new BadRequestException(
        'No podemos procesar pagos internacionales en este momento porque la tasa de cambio no está actualizada. Intenta de nuevo en unos minutos.',
      );
    }
  }

  /**
   * C-3: Si el negocio declaró nexo fiscal (obligación de cobrar impuesto) en el país/estado
   * de destino pero no existe una tasa vigente para calcularlo, bloquea el checkout para no
   * vender sin cobrar el impuesto donde hay obligación. Si no hay nexo declarado, no bloquea
   * (se permite el cálculo normal, que puede dar 0).
   */
  private async validarNexoFiscal(paisDestino: string, estadoDestino?: string): Promise<void> {
    const pais = paisDestino.toUpperCase();
    const estado = estadoDestino?.trim().toUpperCase();
    const ahora = new Date();

    // ¿Hay nexo declarado para este destino? (país-estado específico, o país completo).
    const nexoFilas = await this.prisma.tasas_impuesto.findMany({
      where: {
        pais_iso2: pais,
        nexo_activo: true,
        OR: [{ estado_codigo: null }, ...(estado ? [{ estado_codigo: estado }] : [])],
      },
      select: { estado_codigo: true, activo: true, vigente_desde: true, vigente_hasta: true, tasa_porcentaje: true },
    });
    if (nexoFilas.length === 0) return; // sin nexo declarado → no se bloquea

    // Con nexo declarado, exigir al menos una tasa VIGENTE y activa para el destino.
    const tieneTasaVigente = nexoFilas.some(
      (f) =>
        f.activo &&
        f.tasa_porcentaje != null &&
        new Date(f.vigente_desde) <= ahora &&
        (f.vigente_hasta == null || new Date(f.vigente_hasta) >= ahora),
    );
    if (!tieneTasaVigente) {
      this.logger.error(
        `[pagos] Checkout bloqueado: nexo fiscal declarado para ${pais}${estado ? '/' + estado : ''} sin tasa vigente.`,
      );
      throw new BadRequestException(
        `No podemos completar la compra para ${estado ? estado + ', ' : ''}${pais} en este momento porque el impuesto aplicable no está disponible. Intenta más tarde o elige otra dirección.`,
      );
    }
  }

  /**
   * C-4: Determina la moneda de COBRO al cliente según el país destino y convierte los
   * montos canónicos (en MXN) a esa moneda con la tasa congelada de ExchangeRate-API.
   *   - Destino MX  → MXN (sin conversión, tasa 1).
   *   - Otro destino → USD (cobro nativo; el cliente paga exactamente lo mostrado, sin
   *     fee de transacción extranjera).
   * La contabilidad interna y el payout al productor SIEMPRE quedan en MXN (totalMxn).
   * La frescura de la tasa ya fue validada por validarTasaCambioVigente.
   */
  private async resolverCobro(
    paisDestino: string,
    montosMxn: { subtotal: number; shipping: number; tax: number },
  ): Promise<{
    moneda: Moneda;
    tasa: number;
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    totalMxn: number;
  }> {
    const totalMxn = Math.round((montosMxn.subtotal + montosMxn.shipping + montosMxn.tax) * 100) / 100;
    if ((paisDestino ?? 'MX').toUpperCase() === 'MX') {
      return { moneda: 'MXN', tasa: 1, ...montosMxn, total: totalMxn, totalMxn };
    }
    const r: any = await this.tasasCambioService.getVigente('MXN', 'USD');
    if (!r?.tasa) {
      throw new ServiceUnavailableException(
        'Tasa de cambio MXN→USD no disponible. Intente de nuevo en unos momentos.',
      );
    }
    const tasa = Number(r.tasa);
    if (!isFinite(tasa) || tasa <= 0) {
      throw new ServiceUnavailableException('Tasa de cambio MXN→USD inválida. Contacte al administrador.');
    }
    const conv = (n: number) => Math.round(n * tasa * 100) / 100;
    return {
      moneda: 'USD',
      tasa,
      subtotal: conv(montosMxn.subtotal),
      shipping: conv(montosMxn.shipping),
      tax: conv(montosMxn.tax),
      total: conv(totalMxn),
      totalMxn,
    };
  }

  /**
   * Recalcula pedido_productor (subtotal_bruto, comision, monto_neto) para todos los
   * productores del pedido usando los valores reales de tax_amount y shipping_amount
   * que acaban de ser guardados en pedidos. Llamar DESPUÉS de actualizar pedidos.
   */
  private async recalcularDistribucionPedido(id_pedido: bigint, moneda: Moneda): Promise<void> {
    const pedido = await this.prisma.pedidos.findUnique({
      where: { id_pedido },
      select: { tax_amount: true, shipping_amount: true },
    });
    if (!pedido) return;

    const todosDetalles = await this.prisma.detalle_pedido.findMany({
      where: { id_pedido },
      select: { id_productor: true, precio_compra: true, cantidad: true },
    });
    if (todosDetalles.length === 0) return;

    const subtotalTotal = todosDetalles.reduce(
      (s, d) => s + Number(d.precio_compra) * Number(d.cantidad),
      0,
    );
    if (subtotalTotal <= 0) return;

    const productorIds = [...new Set(todosDetalles.map((d) => d.id_productor).filter(Boolean))] as number[];

    // Cada productor es independiente (resolver comisión + update de su slice):
    // se procesan en paralelo en vez de en serie para reducir round-trips.
    await Promise.all(
      productorIds.map(async (id_productor) => {
        const detallesProd = todosDetalles.filter((d) => d.id_productor === id_productor);
        const subtotalProd = detallesProd.reduce(
          (s, d) => s + Number(d.precio_compra) * Number(d.cantidad),
          0,
        );
        // Política de reparto (memoria feedback_iva_incluido_envio_plataforma):
        // IVA va incluido en el precio del producto (ya dentro de subtotalProd) y el
        // costo de envío lo retiene la plataforma (compra las guías). Por eso el bruto
        // del productor = subtotal de SUS productos, sin prorratear tax ni envío.
        const subtotalBruto = Number(subtotalProd.toFixed(2));

        const comision = await this.comisionesService.resolver({ id_productor });
        const comisionMonto = this.comisionesService.calcularMonto(subtotalBruto, comision);
        const montoNeto = Number((subtotalBruto - comisionMonto).toFixed(2));

        await this.prisma.pedido_productor.updateMany({
          where: { id_pedido, id_productor },
          data: {
            subtotal_bruto: subtotalBruto.toFixed(2),
            comision_marketplace: comisionMonto.toFixed(2),
            monto_neto_productor: montoNeto.toFixed(2),
            moneda,
            id_comision_aplicada: comision.id_comision ?? undefined,
            actualizado_en: new Date(),
          },
        });
      }),
    );
  }

  /** Devuelve todos los id_categoria distintos de los productos en un pedido. */
  private async obtenerCategoriasDelPedido(id_pedido: bigint): Promise<number[]> {
    const rows = await this.prisma.detalle_pedido.findMany({
      where: { id_pedido },
      select: {
        productos: {
          select: { categorias_productos: { select: { id_categoria: true } } },
        },
      },
    });
    const ids = new Set<number>();
    for (const r of rows) {
      for (const cp of r.productos?.categorias_productos ?? []) {
        ids.add(cp.id_categoria);
      }
    }
    return [...ids];
  }

  /**
   * Calcula impuestos filtrando por país Y por las categorías de los productos del pedido.
   * Tasas globales (id_categoria = null) se aplican a todos los pedidos del país.
   * Tasas específicas de categoría (ej. FET para mezcal USA) solo se aplican si el pedido
   * contiene productos de esa categoría.
   */
  private async calcularImpuestos(
    subtotal: number,
    shippingAmount: number,
    paisDestino: string,
    categoriaIds: number[] = [],
    estadoDestino?: string,
  ): Promise<{ taxAmount: number; taxBreakdown: { tipo: string; nombre: string; tasa: number; monto: number }[] }> {
    const ahora = new Date();
    const estado = estadoDestino?.trim().toUpperCase();
    const tasas = await this.prisma.tasas_impuesto.findMany({
      where: {
        pais_iso2: paisDestino.toUpperCase(),
        activo: true,
        incluido_en_precio: false,
        vigente_desde: { lte: ahora },
        OR: [{ vigente_hasta: null }, { vigente_hasta: { gte: ahora } }],
        AND: [
          // Tasas globales (sin categoría) Y tasas de las categorías del pedido.
          {
            OR: [
              { id_categoria: null },
              ...(categoriaIds.length > 0 ? [{ id_categoria: { in: categoriaIds } }] : []),
            ],
          },
          // Sales tax por estado (US): aplica tasas a nivel país (estado_codigo NULL)
          // Y, si hay estado destino, las específicas de ese estado. Para US el negocio
          // configura filas por estado con nexo; MX usa estado_codigo NULL (IVA país).
          {
            OR: [
              { estado_codigo: null },
              ...(estado ? [{ estado_codigo: estado }] : []),
            ],
          },
        ],
      },
    });
    const base = subtotal + shippingAmount;
    const taxBreakdown = tasas.map((t) => {
      const tasa = Number(t.tasa_porcentaje ?? 0);
      return { tipo: t.tipo, nombre: t.nombre, tasa, monto: Math.round(base * tasa * 100) / 100 };
    });
    const taxAmount = Math.round(taxBreakdown.reduce((acc, t) => acc + t.monto, 0) * 100) / 100;
    return { taxAmount, taxBreakdown };
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
        this.logger.warn(`[pagos] retrieveAccount failed for ${prod.stripe_account_id}: ${error?.message}`);
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
    if (!rule) {
      this.logger.error(
        `[pagos] ALERTA CRÍTICA: Sin regla de comisión para productor ${id_productor}. Se aplica DEFAULT_FEE_PCT=${this.DEFAULT_FEE_PCT * 100}%. Agrega una regla con alcance='global' en la tabla comisiones.`,
      );
    }
    const pct = rule ? Number(rule.porcentaje) : this.DEFAULT_FEE_PCT;
    const gross = subtotal + shippingAmount;
    const applicationFeeAmount = Math.max(0, Math.round(gross * pct * 100) / 100);

    return {
      connectedAccountId: prod.stripe_account_id,
      applicationFeeAmount,
      id_productor,
    };
  }

  /** Crea una notificación in-app para todos los administradores activos. */
  private async notificarAdmins(tipo: string, titulo: string, cuerpo: string, url_accion?: string) {
    try {
      const adminRole = await this.prisma.roles.findFirst({
        where: { nombre: { in: ['administrador', 'admin', 'ADMIN'] } },
        select: { id_rol: true },
      });
      if (!adminRole) return;
      const adminUsers = await this.prisma.usuario_rol.findMany({
        where: { id_rol: adminRole.id_rol, estado: 'activo' },
        select: { id_usuario: true },
      });
      await Promise.all(
        adminUsers.map(({ id_usuario }) =>
          this.prisma.notificaciones.create({
            data: { id_usuario, tipo, titulo, cuerpo, url_accion: url_accion ?? null, leido: false },
          }),
        ),
      );
    } catch (err: any) {
      this.logger.error(`[pagos] notificarAdmins failed: ${err?.message}`);
    }
  }

  private async createTransfersForPedido(id_pedido: bigint, moneda: Moneda) {
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
            moneda,
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
            moneda,
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

    // C-4: registrar el reembolso en `refunds` para trazabilidad/conciliación.
    // Se crea en estado 'pendiente' y se marca 'procesado'/'fallido' según el resultado
    // del reembolso al comprador (la reversión de transfers a productores se rastrea aparte).
    const refund = await this.prisma.refunds.create({
      data: {
        id_pago: pago.id_pago,
        id_pedido: pago.id_pedido,
        monto: pago.monto,
        moneda: pago.moneda,
        motivo: 'Reembolso total solicitado',
        estado: 'pendiente',
        tipo: 'total',
        proveedor_ref_id: pago.payment_intent_id,
      },
    });

    // Branch by provider
    if (pago.proveedor === 'paypal') {
      // PayPal refund: payment_intent_id holds the capture ID
      try {
        await this.paypalService.createRefund(pago.payment_intent_id);
      } catch (err: any) {
        this.logger.error('[pagos] PayPal refund failed:', err?.message);
        await this.prisma.refunds
          .update({ where: { id_refund: refund.id_refund }, data: { estado: 'fallido' } })
          .catch(() => undefined);
        throw new BadRequestException(`PayPal refund failed: ${err?.message}`);
      }

      // Revertir transfers de Stripe si el productor ya recibió su pago
      const rows = await this.prisma.pedido_productor.findMany({
        where: { id_pedido: pago.id_pedido },
        include: { payout: { select: { referencia_externa: true } } },
      });

      const reversalErrors: string[] = [];
      for (const r of rows) {
        if (r.payout?.referencia_externa) {
          try {
            await this.stripeService.createTransferReversal(r.payout.referencia_externa);
          } catch (err: any) {
            this.logger.error('[pagos] createTransferReversal failed for transfer', r.payout.referencia_externa, ':', err?.message);
            reversalErrors.push(`transfer ${r.payout.referencia_externa}: ${err?.message}`);
          }
        }
      }

      if (reversalErrors.length > 0) {
        // El comprador SÍ fue reembolsado (createRefund ok); sólo falló revertir transfers.
        await this.prisma.refunds
          .update({ where: { id_refund: refund.id_refund }, data: { estado: 'procesado', procesado_en: new Date() } })
          .catch(() => undefined);
        await this.prisma.pagos.update({
          where: { id_pago: pago.id_pago },
          data: { estado: 'reembolso_pendiente_manual', monto_reembolsado: pago.monto },
        });
        throw new UnprocessableEntityException(
          `PayPal reembolsado pero ${reversalErrors.length} transfer(s) no pudo revertirse. Requiere reconciliación manual: ${reversalErrors.join('; ')}`,
        );
      }
    } else {
      // Stripe refund logic (unchanged)
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
        // Manual transfers: reembolsar al comprador PRIMERO (idempotente en Stripe),
        // luego intentar revertir transfers de productores.
        // Si una reversión falla, se registra para reconciliación manual pero NO bloquea
        // el reembolso al comprador.
        await this.stripeService.createRefund({
          paymentIntentId: pago.payment_intent_id,
        });

        const rows = await this.prisma.pedido_productor.findMany({
          where: { id_pedido: pago.id_pedido },
          include: { payout: { select: { id_payout: true, referencia_externa: true } } },
        });

        for (const r of rows) {
          if (r.payout?.referencia_externa) {
            try {
              await this.stripeService.createTransferReversal(r.payout.referencia_externa);
            } catch (err: any) {
              this.logger.error('[pagos] createTransferReversal fallida para', r.payout.referencia_externa, ':', err?.message);
              if (r.payout?.id_payout) {
                await this.prisma.payouts.update({
                  where: { id_payout: r.payout.id_payout },
                  data: { estado: 'reversal_pendiente_manual', ultimo_error: err?.message ?? 'reversal failed' },
                }).catch(() => undefined);
                this.emailService.sendAdminAlert(
                  `Reversal manual requerido — Payout #${r.payout.id_payout}`,
                  `No se pudo revertir automáticamente el transfer Stripe ${r.payout.referencia_externa}.\n\nError: ${err?.message}\n\nAcción requerida: Revertir manualmente en el dashboard de Stripe y actualizar el estado del payout #${r.payout.id_payout}.`,
                ).catch(() => undefined);
              }
            }
          }
        }
      }
    }

    // En este punto el comprador fue reembolsado (las rutas que fallan lanzan antes).
    // Marcar el refund como procesado (cubre Stripe y PayPal sin errores de reversión).
    await this.prisma.refunds
      .update({ where: { id_refund: refund.id_refund }, data: { estado: 'procesado', procesado_en: new Date() } })
      .catch(() => undefined);

    // Restore stock for each order item before marking as cancelled
    const detalles = await this.prisma.detalle_pedido.findMany({
      where: { id_pedido: pago.id_pedido },
      select: { id_producto: true, cantidad: true, id_pedido: true },
    });
    for (const d of detalles) {
      const inv = await this.prisma.inventario.findFirst({
        where: { id_producto: d.id_producto },
        orderBy: { stock: 'asc' },
      });
      if (inv) {
        await this.prisma.inventario.update({
          where: { id_inventario: inv.id_inventario },
          data: { stock: { increment: d.cantidad } },
        });
        const prodLotePago = await this.prisma.productos.findUnique({
          where: { id_producto: d.id_producto },
          select: { id_lote: true },
        });
        if (prodLotePago?.id_lote) {
          await this.lotesService.softDeleteEmptyLote(prodLotePago.id_lote);
        }
        await this.prisma.movimientos_inventario.create({
          data: {
            id_inventario: inv.id_inventario,
            id_pedido: d.id_pedido,
            tipo: 'cancelacion',
            cantidad: d.cantidad,
            stock_resultante: inv.stock + d.cantidad,
            motivo: `Reversa por reembolso pago ${pago.id_pago}`,
          },
        });
      }
    }

    // Update payment and order status
    await this.prisma.pagos.update({
      where: { id_pago: pago.id_pago },
      data: { estado: 'reembolsado', monto_reembolsado: pago.monto },
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

    let failed: any[];
    try {
      failed = await this.prisma.payouts.findMany({
        where: {
          intentos: { lt: MAX_INTENTOS },
          OR: [
            // Fallidos cuyo backoff ya venció (o nunca se programó).
            {
              estado: 'fallido',
              OR: [{ proximo_reintento: null }, { proximo_reintento: { lte: new Date() } }],
            },
            // Recuperación de crash: payouts 'procesando' colgados >10min (la reserva
            // se hizo pero el transfer no llegó a confirmarse). Reintentar es seguro:
            // los idempotency keys (Stripe) y senderBatchId (PayPal) son deterministas.
            { estado: 'procesando', creado_en: { lt: new Date(Date.now() - 10 * 60 * 1000) } },
          ],
        },
        include: {
          pedido_productor: {
            take: 1,
            include: {
              productores: {
                select: { stripe_account_id: true, stripe_onboarding_completed: true, paypal_email: true },
              },
            },
          },
        },
      });
    } catch (dbErr: any) {
      this.logger.warn(`[pagos] retryFailedTransfers: DB no disponible, se reintentará en el siguiente ciclo. ${dbErr?.message}`);
      return;
    }

    if (failed.length === 0) return;

    this.logger.log(`[pagos] Retrying ${failed.length} fallidos transfer(s)`);

    for (const payout of failed) {
      const pp = payout.pedido_productor[0];
      const nuevosIntentos = payout.intentos + 1;
      const backoffMs = Math.min(24 * 60, 15 * Math.pow(2, nuevosIntentos)) * 60_000;

      const markFailed = async (errorMsg: string) => {
        await this.prisma.payouts.update({
          where: { id_payout: payout.id_payout },
          data: {
            intentos: nuevosIntentos,
            ultimo_error: errorMsg.slice(0, 500),
            estado: nuevosIntentos >= MAX_INTENTOS ? 'agotado' : 'fallido',
            proximo_reintento: new Date(Date.now() + backoffMs),
          },
        });
        if (nuevosIntentos >= MAX_INTENTOS) {
          this.logger.error(`[pagos] Payout AGOTADO productor ${pp?.id_productor} pedido ${pp?.id_pedido}: revisión manual requerida. Error: ${errorMsg}`);
          this.emailService.sendAdminAlert(
            `Payout agotado — Pedido #${pp?.id_pedido} Productor #${pp?.id_productor}`,
            `El payout para el productor ${pp?.id_productor} del pedido ${pp?.id_pedido} ha fallado ${MAX_INTENTOS} veces y requiere revisión manual.\n\nÚltimo error: ${errorMsg}\n\nAcción requerida: Revisar en el panel admin y procesar manualmente.`,
          ).catch(() => undefined);
        } else {
          this.logger.warn(`[pagos] Retry intento ${nuevosIntentos}/${MAX_INTENTOS} productor ${pp?.id_productor}: ${errorMsg}`);
        }
      };

      if (payout.proveedor === 'paypal') {
        if (!pp?.productores?.paypal_email) {
          this.logger.warn(`[pagos] Skipping retry PayPal para productor ${pp?.id_productor}: sin paypal_email`);
          continue;
        }

        try {
          let amountUSD = Number(payout.monto_neto);
          if (payout.moneda !== 'USD') {
            const tasa = await this.prisma.tasas_cambio.findFirst({
              where: {
                moneda_origen: payout.moneda,
                moneda_destino: 'USD' as any,
                vigente_desde: { lte: new Date() },
                OR: [{ vigente_hasta: null }, { vigente_hasta: { gte: new Date() } }],
              },
              orderBy: { vigente_desde: 'desc' },
            });
            if (!tasa) {
              await this.notificarAdmins(
                'fx_faltante',
                'Falta tasa de cambio para procesar un payout',
                `No hay tasa ${payout.moneda}→USD vigente. El payout #${payout.id_payout} (productor ${payout.id_productor ?? '—'}) no se puede procesar hasta configurarla en tasas_cambio.`,
                '/dashboard/admin/tasas-cambio',
              );
              throw new InternalServerErrorException(
                `No hay tasa de cambio ${payout.moneda}→USD vigente. Configurar en la tabla tasas_cambio antes de procesar payouts.`,
              );
            }
            amountUSD = amountUSD / Number(tasa.tasa);
          }
          amountUSD = parseFloat(amountUSD.toFixed(2));

          const payoutResult = await this.paypalService.createPayout({
            paypalEmail: pp.productores.paypal_email,
            amountUSD,
            referenceId: `pedido-${pp.id_pedido}-prod-${pp.id_productor}`,
            // senderBatchId determinista (igual que en la entrega): PayPal deduplica el reenvío.
            senderBatchId: `payout-pp-${pp.id_pedido}-prod-${pp.id_productor}`,
          });

          await this.prisma.payouts.update({
            where: { id_payout: payout.id_payout },
            data: {
              estado: 'procesado',
              referencia_externa: payoutResult.batchId,
              procesado_en: new Date(),
              ultimo_error: null,
            },
          });

          this.logger.log(`[pagos] PayPal payout exitoso en retry productor ${pp.id_productor}: ${payoutResult.batchId}`);
        } catch (error: any) {
          await markFailed(error?.message ?? 'Unknown error');
        }
      } else {
        // Stripe Connect flow
        if (!pp?.productores?.stripe_account_id || !pp.productores.stripe_onboarding_completed) {
          this.logger.warn(`[pagos] Skipping retry Stripe para productor ${pp?.id_productor}: sin onboarding`);
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

          this.logger.log(`[pagos] Stripe transfer exitoso en retry productor ${pp.id_productor}: ${transfer.id}`);
        } catch (error: any) {
          await markFailed(error?.message ?? 'Unknown error');
        }
      }
    }
  }

  /**
   * C-7: conciliación financiera diaria. Corre los chequeos de integridad del módulo
   * de pagos (los mismos del informe de auditoría) y alerta al admin ante discrepancias:
   * pedidos pagados sin pago, doble payout, payouts sin evidencia y descuadres bruto/neto.
   */
  @Cron('0 6 * * *')
  async conciliacionFinanciera() {
    try {
      const problemas: string[] = [];

      const pagadosSinPago = await this.prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT COUNT(*)::bigint AS n FROM pedidos pe
        WHERE pe.estado = 'pagado'
          AND NOT EXISTS (SELECT 1 FROM pagos p WHERE p.id_pedido = pe.id_pedido AND p.estado = 'completado')`;
      if (Number(pagadosSinPago[0]?.n ?? 0) > 0)
        problemas.push(`${pagadosSinPago[0].n} pedido(s) marcados 'pagado' sin pago completado`);

      const doblePayout = await this.prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT COUNT(*)::bigint AS n FROM (
          SELECT pp.id_pedido, pp.id_productor
          FROM pedido_productor pp JOIN payouts po ON po.id_payout = pp.id_payout
          WHERE po.estado = 'procesado'
          GROUP BY pp.id_pedido, pp.id_productor HAVING COUNT(*) > 1
        ) t`;
      if (Number(doblePayout[0]?.n ?? 0) > 0)
        problemas.push(`${doblePayout[0].n} (pedido,productor) con doble payout 'procesado' (posible doble transferencia)`);

      const sinRef = await this.prisma.payouts.count({
        where: { estado: 'procesado', OR: [{ referencia_externa: null }, { referencia_externa: '' }] },
      });
      if (sinRef > 0) problemas.push(`${sinRef} payout(s) 'procesado' sin referencia_externa (sin evidencia)`);

      const descuadre = await this.prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT COUNT(*)::bigint AS n FROM payouts
        WHERE estado IN ('procesado', 'pendiente')
          AND ROUND(monto_neto + monto_comision, 2) <> ROUND(monto_bruto, 2)`;
      if (Number(descuadre[0]?.n ?? 0) > 0)
        problemas.push(`${descuadre[0].n} payout(s) con descuadre neto+comisión≠bruto`);

      if (problemas.length > 0) {
        this.logger.error(`[pagos] Conciliación detectó ${problemas.length} problema(s): ${problemas.join(' | ')}`);
        await this.emailService
          .sendAdminAlert(
            `Conciliación financiera: ${problemas.length} discrepancia(s)`,
            `La conciliación diaria detectó:\n\n- ${problemas.join('\n- ')}\n\nRevisar en el panel admin.`,
          )
          .catch(() => undefined);
      } else {
        this.logger.log('[pagos] Conciliación financiera OK: sin discrepancias');
      }
    } catch (err: any) {
      this.logger.error(`[pagos] Error en conciliación financiera: ${err?.message}`);
    }
  }

  /**
   * Fase 3: alerta de fondos retenidos. Detecta pedido_productor ENTREGADOS con neto
   * positivo y sin payout (id_payout null) por más de 7 días — típicamente productores
   * que aún no completan onboarding de Stripe/PayPal — y notifica al admin para gestionarlo.
   */
  /**
   * C-3: reconciliación de pagos PayPal. Si el cliente capturó la orden pero la
   * confirmación al backend se perdió (red caída tras capturePaypalOrder), el pago
   * queda 'pendiente' aunque PayPal ya cobró. Este cron consulta PayPal y finaliza
   * los pagos cuya orden está COMPLETED, evitando dinero cobrado sin pedido confirmado.
   */
  @Cron('*/30 * * * *')
  async reconciliarPagosPaypal() {
    const desde = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const hasta = new Date(Date.now() - 10 * 60 * 1000); // dar margen al webhook normal
    let pendientes: Array<{ id_pago: bigint; payment_intent_id: string | null }>;
    try {
      pendientes = await this.prisma.pagos.findMany({
        where: {
          proveedor: 'paypal',
          estado: 'pendiente',
          creado_en: { gte: desde, lte: hasta },
          payment_intent_id: { not: null },
        },
        select: { id_pago: true, payment_intent_id: true },
        take: 50,
      });
    } catch (dbErr: any) {
      this.logger.warn(`[pagos] reconciliarPagosPaypal: DB no disponible. ${dbErr?.message}`);
      return;
    }

    if (pendientes.length === 0) return;

    for (const p of pendientes) {
      if (!p.payment_intent_id) continue;
      try {
        const order = await this.paypalService.getOrderDetails(p.payment_intent_id);
        if (order.status !== 'COMPLETED') continue; // APPROVED sin capturar: no cobrar aquí

        const captureId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id;
        if (!captureId) continue;

        // Persistir captureId y finalizar como el flujo normal de captura.
        await this.prisma.pagos.update({
          where: { id_pago: p.id_pago },
          data: { payment_intent_id: captureId },
        });
        await this.updatePaymentStatus(captureId, 'completado');
        this.logger.warn(`[pagos] Reconciliación PayPal: pago ${p.id_pago} finalizado fuera de banda (capture ${captureId})`);
      } catch (err: any) {
        this.logger.error(`[pagos] reconciliarPagosPaypal error en pago ${p.id_pago}: ${err?.message}`);
      }
    }
  }

  @Cron('0 7 * * *')
  async alertarFondosRetenidos() {
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const retenidos = await this.prisma.pedido_productor.findMany({
        where: {
          estado: 'entregado',
          id_payout: null,
          monto_neto_productor: { gt: 0 },
          actualizado_en: { lt: cutoff },
        },
        select: { id_pedido: true, id_productor: true, monto_neto_productor: true, moneda: true },
        take: 200,
      });

      if (retenidos.length === 0) {
        this.logger.debug('[pagos] Sin fondos retenidos >7d');
        return;
      }

      const total = retenidos.reduce((s, r) => s + Number(r.monto_neto_productor ?? 0), 0);
      const productores = new Set(retenidos.map((r) => r.id_productor)).size;
      this.logger.warn(`[pagos] ${retenidos.length} pago(s) retenidos >7d (${productores} productor(es), total ~${total.toFixed(2)})`);

      await this.notificarAdmins(
        'fondos_retenidos',
        `Fondos retenidos: ${retenidos.length} pago(s) sin transferir`,
        `Hay ${retenidos.length} pago(s) entregados hace más de 7 días sin transferir (≈${total.toFixed(2)}), de ${productores} productor(es). Suele deberse a onboarding de pagos incompleto. Revisar en el panel de payouts.`,
        '/dashboard/admin/payouts',
      );
    } catch (err: any) {
      this.logger.error(`[pagos] Error en alertarFondosRetenidos: ${err?.message}`);
    }
  }

  @Cron('*/30 * * * *')
  async retryGuiasFallidas() {
    if (!this.enviosService) return;

    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    let pedidos: any[];
    try {
      pedidos = await this.prisma.pedidos.findMany({
        where: {
          estado: 'pagado',
          fecha_creacion: { lt: cutoff },
          envios: {
            none: {
              envio_guias: { some: {} },
            },
          },
        },
        take: 10,
        orderBy: { fecha_creacion: 'asc' },
        select: { id_pedido: true },
      });
    } catch (dbErr: any) {
      this.logger.warn(`[pagos] retryGuiasFallidas: DB no disponible. ${dbErr?.message}`);
      return;
    }

    if (pedidos.length === 0) return;

    this.logger.log(`[pagos] retryGuiasFallidas: reintentando guías para ${pedidos.length} pedido(s)`);

    for (const pedido of pedidos) {
      try {
        await this.crearGuiasPostPago(pedido.id_pedido);
      } catch (err: any) {
        this.logger.error(`[pagos] retryGuiasFallidas pedido ${pedido.id_pedido}: ${err?.message}`);
      }
    }
  }

  /**
   * Llamado cuando Stripe cierra una disputa (charge.dispute.closed).
   * Si el merchant ganó ('won') → re-encola los payouts fallidos para ese pedido.
   * Si el merchant perdió ('lost') → marca los payouts como agotados con motivo 'disputa_perdida'.
   */
  async handleDisputeClosed(paymentIntentId: string, disputeStatus: 'won' | 'lost' | string): Promise<void> {
    const pago = await this.prisma.pagos.findFirst({
      where: { payment_intent_id: paymentIntentId },
      select: { id_pago: true, id_pedido: true },
    });

    if (!pago) {
      this.logger.warn(`[disputa] No se encontró pago para payment_intent=${paymentIntentId}`);
      return;
    }

    this.logger.log(`[disputa] charge.dispute.closed status=${disputeStatus} pedido=${pago.id_pedido}`);

    const payouts = await this.prisma.payouts.findMany({
      where: {
        pedido_productor: { some: { id_pedido: pago.id_pedido } },
        estado: { in: ['fallido', 'pendiente'] },
      },
      select: { id_payout: true, id_productor: true },
    });

    if (payouts.length === 0) {
      this.logger.log(`[disputa] Sin payouts pendientes para pedido=${pago.id_pedido}`);
      return;
    }

    if (disputeStatus === 'won') {
      // El merchant ganó — resetear intentos para que el cron de retry los procese
      await this.prisma.payouts.updateMany({
        where: { id_payout: { in: payouts.map((p) => p.id_payout) } },
        data: { intentos: 0, proximo_reintento: null, ultimo_error: 'Disputa ganada — reintento automático' },
      });
      this.logger.log(`[disputa] ${payouts.length} payout(s) re-encolados para pedido=${pago.id_pedido}`);
    } else if (disputeStatus === 'lost') {
      await this.prisma.payouts.updateMany({
        where: { id_payout: { in: payouts.map((p) => p.id_payout) } },
        data: { estado: 'agotado', ultimo_error: 'Disputa perdida — pago retenido por plataforma' },
      });
      this.logger.warn(`[disputa] ${payouts.length} payout(s) marcados como agotados (disputa perdida) para pedido=${pago.id_pedido}`);
    }
  }
}
