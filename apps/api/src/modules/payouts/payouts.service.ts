import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from '../pagos/stripe.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { GenerarPayoutsDto, ListPayoutsQueryDto, UpdatePayoutEstadoDto } from './dto/payouts.dto';

const ESTADOS_LIBERADOS_DEFAULT = ['entregado', 'liberado'];

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async findAll(query: ListPayoutsQueryDto = {}) {
    const where: Prisma.payoutsWhereInput = {};
    if (query.id_productor) where.id_productor = query.id_productor;
    if (query.estado) where.estado = query.estado;
    return serializeBigInts(
      await this.prisma.payouts.findMany({
        where,
        orderBy: { creado_en: 'desc' },
        include: { productores: { select: { id_productor: true, razon_social: true } } },
      }),
    );
  }

  async findOne(id_payout: string) {
    const payout = await this.prisma.payouts.findUnique({
      where: { id_payout: toBigIntId(id_payout) },
      include: {
        productores: true,
        pedido_productor: { include: { pedidos: { select: { id_pedido: true, total: true, fecha_creacion: true } } } },
      },
    });
    if (!payout) throw new NotFoundException('Payout no encontrado');
    return serializeBigInts(payout);
  }

  /**
   * Agrupa pedido_productor liberados sin payout dentro del rango y crea un payout
   * por (productor, moneda). Para productores con Stripe Connect onboardeado, crea
   * la transferencia y marca como 'procesado'; para otros, deja como 'pendiente'.
   * Persiste id_payout en cada pedido_productor incluido.
   */
  async generar(dto: GenerarPayoutsDto) {
    const desde = new Date(dto.desde);
    const hasta = new Date(dto.hasta);
    if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) {
      throw new BadRequestException('Fechas inválidas');
    }
    if (desde >= hasta) throw new BadRequestException('desde debe ser anterior a hasta');

    const estados = dto.estados_validos ?? ESTADOS_LIBERADOS_DEFAULT;

    const elegibles = await this.prisma.pedido_productor.findMany({
      where: {
        id_payout: null,
        estado: { in: estados },
        actualizado_en: { gte: desde, lt: hasta },
        moneda: { not: null },
        subtotal_bruto: { not: null },
        monto_neto_productor: { not: null },
      },
    });

    if (elegibles.length === 0) {
      return { creados: 0, payouts: [] };
    }

    const grupos = new Map<string, typeof elegibles>();
    for (const pp of elegibles) {
      const clave = `${pp.id_productor}|${pp.moneda}`;
      const arr = grupos.get(clave) ?? [];
      arr.push(pp);
      grupos.set(clave, arr);
    }

    const creados = await this.prisma.$transaction(async (tx) => {
      const result: { id_payout: string; id_productor: number; moneda: string; cuenta: number }[] = [];
      for (const grupo of grupos.values()) {
        const id_productor = grupo[0].id_productor;
        const moneda = grupo[0].moneda!;
        const monto_bruto = grupo.reduce((s, pp) => s + Number(pp.subtotal_bruto), 0);
        const monto_comision = grupo.reduce((s, pp) => s + Number(pp.comision_marketplace), 0);
        const monto_neto = grupo.reduce((s, pp) => s + Number(pp.monto_neto_productor), 0);

        const payout = await tx.payouts.create({
          data: {
            id_productor,
            moneda,
            monto_bruto: monto_bruto.toFixed(2),
            monto_comision: monto_comision.toFixed(2),
            monto_neto: monto_neto.toFixed(2),
            estado: 'pendiente',
            proveedor: dto.proveedor?.trim(),
            periodo_desde: desde,
            periodo_hasta: hasta,
          },
        });

        await tx.pedido_productor.updateMany({
          where: {
            OR: grupo.map((pp) => ({ id_pedido: pp.id_pedido, id_productor: pp.id_productor })),
          },
          data: { id_payout: payout.id_payout },
        });

        result.push({
          id_payout: payout.id_payout.toString(),
          id_productor,
          moneda,
          cuenta: grupo.length,
        });
      }
      return result;
    });

    // Procesar Stripe transfers fuera de la transacción
    const payoutIds = creados.map((c) => BigInt(c.id_payout));
    const payouts = await this.prisma.payouts.findMany({
      where: { id_payout: { in: payoutIds } },
      include: { productores: true },
    });

    for (const payout of payouts) {
      await this.procesarPayoutTransfer(payout);
    }

    return { creados: creados.length, payouts: creados };
  }

  private async procesarPayoutTransfer(payout: any) {
    const productor = payout.productores;

    // Si el productor no tiene Stripe account, dejar como pendiente
    if (!productor.stripe_account_id || !productor.stripe_onboarding_completed) {
      return;
    }

    const amountCents = Math.round(Number(payout.monto_neto) * 100);
    const transferGroup = `payout-${payout.id_payout}`;
    const idempotencyKey = `payout-transfer-${payout.id_payout}`;

    try {
      const transfer = await this.stripeService.createTransfer({
        amountCents,
        currency: payout.moneda,
        destination: productor.stripe_account_id,
        transferGroup,
        idempotencyKey,
        metadata: { id_payout: payout.id_payout.toString(), id_productor: String(payout.id_productor) },
      });

      // Marcar como procesado
      await this.prisma.payouts.update({
        where: { id_payout: payout.id_payout },
        data: {
          estado: 'procesado',
          referencia_externa: transfer.id,
          procesado_en: new Date(),
          proveedor: 'stripe',
        },
      });
    } catch (error: any) {
      // Marcar como fallido y configurar retry
      const errorMsg = error?.message || 'Unknown error';
      const proximoReintento = new Date(Date.now() + 15 * 60 * 1000); // +15 min

      await this.prisma.payouts.update({
        where: { id_payout: payout.id_payout },
        data: {
          estado: 'fallido',
          ultimo_error: errorMsg.substring(0, 500),
          intentos: 1,
          proximo_reintento: proximoReintento,
        },
      });

      // Log para debugging
      // eslint-disable-next-line no-console
      console.error(`[payouts] Stripe transfer failed for payout ${payout.id_payout}: ${errorMsg}`);
    }
  }

  async actualizarEstado(id_payout: string, dto: UpdatePayoutEstadoDto) {
    const id = toBigIntId(id_payout);
    const actual = await this.prisma.payouts.findUnique({ where: { id_payout: id } });
    if (!actual) throw new NotFoundException('Payout no encontrado');

    const procesado_en = ['pagado', 'fallido', 'cancelado'].includes(dto.estado)
      ? new Date()
      : actual.procesado_en;

    return serializeBigInts(
      await this.prisma.payouts.update({
        where: { id_payout: id },
        data: {
          estado: dto.estado,
          referencia_externa: dto.referencia_externa,
          notas: dto.notas,
          procesado_en,
        },
      }),
    );
  }

  async findByProductor(id_productor: number) {
    return serializeBigInts(
      await this.prisma.payouts.findMany({
        where: { id_productor },
        orderBy: { creado_en: 'desc' },
        include: {
          pedido_productor: {
            select: {
              id_pedido: true,
              estado: true,
              subtotal_bruto: true,
              comision_marketplace: true,
              monto_neto_productor: true,
              moneda: true,
            },
          },
        },
      }),
    );
  }
}
