import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { calcularEdadEnAnios } from '../productos/edad.helper';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateMonedaDto, CreatePagoDto, CreateStripeIntentDto, UpdateMonedaDto, UpdatePagoDto } from './dto/pagos.dto';
import { StripeService } from './stripe.service';

@Injectable()
export class PagosService {
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

  async updatePaymentStatus(payment_intent_id: string, estado: string) {
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
      await this.prisma.pedidos.update({
        where: { id_pedido: pago.id_pedido },
        data: { estado: 'pagado' },
      });
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
   * For single-productor pedidos with a Connect-enabled productor, resolves the
   * destination account and the marketplace application fee. Multi-productor
   * pedidos (or productores without onboarding) fall back to a regular PI and
   * the platform settles via the existing payouts pipeline.
   */
  private async resolveDirectCharge(
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
    if (!prod?.stripe_account_id || !prod.stripe_onboarding_completed) return null;

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
}
