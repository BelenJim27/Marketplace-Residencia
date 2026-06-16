import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaypalService } from '../pagos/paypal.service';
import { StripeService } from '../pagos/stripe.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { GenerarPayoutsDto, ListPayoutsQueryDto, UpdatePayoutEstadoDto } from './dto/payouts.dto';

const ESTADOS_LIBERADOS_DEFAULT = ['entregado', 'liberado'];

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly paypalService: PaypalService,
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
  async generar(dto: GenerarPayoutsDto, aprobadoPor?: string) {
    // Sólo guardar aprobado_por si es un UUID válido (la columna es @db.Uuid).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const aprobado_por = aprobadoPor && UUID_RE.test(aprobadoPor) ? aprobadoPor : null;
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
        ...(dto.id_productor ? { id_productor: dto.id_productor } : {}),
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

        // Crear el payout primero (montos provisionales) y luego RECLAMAR atómicamente
        // sólo las filas que aún tengan id_payout = null. Esto evita doble pago si el
        // flujo automático (triggerPayoutForProductor al entregar) reclamó alguna fila
        // entre el SELECT de elegibles y este UPDATE.
        const payout = await tx.payouts.create({
          data: {
            id_productor,
            moneda,
            monto_bruto: '0',
            monto_comision: '0',
            monto_neto: '0',
            estado: 'pendiente',
            proveedor: dto.proveedor?.trim(),
            periodo_desde: desde,
            periodo_hasta: hasta,
            aprobado_por,
            aprobado_en: aprobado_por ? new Date() : null,
          },
        });

        const claim = await tx.pedido_productor.updateMany({
          where: {
            id_payout: null,
            OR: grupo.map((pp) => ({ id_pedido: pp.id_pedido, id_productor: pp.id_productor })),
          },
          data: { id_payout: payout.id_payout },
        });

        if (claim.count === 0) {
          // Todas las filas del grupo fueron reclamadas por otro proceso: descartar payout.
          await tx.payouts.delete({ where: { id_payout: payout.id_payout } });
          continue;
        }

        // Recalcular montos SÓLO con las filas efectivamente reclamadas por este payout.
        const claimed = await tx.pedido_productor.findMany({
          where: { id_payout: payout.id_payout },
          select: { subtotal_bruto: true, comision_marketplace: true, monto_neto_productor: true },
        });
        const monto_bruto = claimed.reduce((s, pp) => s + Number(pp.subtotal_bruto), 0);
        const monto_comision = claimed.reduce((s, pp) => s + Number(pp.comision_marketplace), 0);
        const monto_neto = claimed.reduce((s, pp) => s + Number(pp.monto_neto_productor), 0);

        await tx.payouts.update({
          where: { id_payout: payout.id_payout },
          data: {
            monto_bruto: monto_bruto.toFixed(2),
            monto_comision: monto_comision.toFixed(2),
            monto_neto: monto_neto.toFixed(2),
          },
        });

        result.push({
          id_payout: payout.id_payout.toString(),
          id_productor,
          moneda,
          cuenta: claim.count,
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
    const proveedor = payout.proveedor ?? 'stripe';

    if (proveedor === 'paypal') {
      return this.procesarPayoutPayPal(payout, productor);
    }

    // Stripe (default)
    return this.procesarPayoutStripe(payout, productor);
  }

  private async procesarPayoutStripe(payout: any, productor: any) {
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
      const errorMsg = error?.message || 'Unknown error';
      const proximoReintento = new Date(Date.now() + 15 * 60 * 1000);

      await this.prisma.payouts.update({
        where: { id_payout: payout.id_payout },
        data: {
          estado: 'fallido',
          ultimo_error: errorMsg.substring(0, 500),
          intentos: 1,
          proximo_reintento: proximoReintento,
        },
      });

      this.logger.error(`[payouts] Stripe transfer failed for payout ${payout.id_payout}: ${errorMsg}`);
    }
  }

  private async procesarPayoutPayPal(payout: any, productor: any) {
    if (!productor.paypal_email) {
      await this.prisma.payouts.update({
        where: { id_payout: payout.id_payout },
        data: {
          estado: 'fallido',
          ultimo_error: 'Productor no tiene paypal_email configurado',
        },
      });
      return;
    }

    try {
      const referenceId = `payout-${payout.id_payout}`;

      // PayPal solo acepta USD. Convertir si el payout está en otra moneda.
      let amountUSD = Number(payout.monto_neto);
      if ((payout.moneda ?? 'USD') !== 'USD') {
        const ahora = new Date();
        const tasa = await this.prisma.tasas_cambio.findFirst({
          where: {
            moneda_origen: payout.moneda,
            moneda_destino: 'USD',
            vigente_desde: { lte: ahora },
            OR: [{ vigente_hasta: null }, { vigente_hasta: { gte: ahora } }],
          },
          orderBy: { vigente_desde: 'desc' },
        });
        if (!tasa) {
          throw new Error(`Sin tasa de cambio activa ${payout.moneda}→USD para el payout ${payout.id_payout}`);
        }
        amountUSD = amountUSD * Number(tasa.tasa);
      }

      const payout_result = await this.paypalService.createPayout({
        paypalEmail: productor.paypal_email,
        amountUSD: Math.round(amountUSD * 100) / 100,
        referenceId,
      });

      const batchId = payout_result?.batchId || referenceId;

      await this.prisma.payouts.update({
        where: { id_payout: payout.id_payout },
        data: {
          estado: 'procesado',
          referencia_externa: batchId,
          procesado_en: new Date(),
          proveedor: 'paypal',
        },
      });
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      const proximoReintento = new Date(Date.now() + 15 * 60 * 1000);

      await this.prisma.payouts.update({
        where: { id_payout: payout.id_payout },
        data: {
          estado: 'fallido',
          ultimo_error: errorMsg.substring(0, 500),
          intentos: 1,
          proximo_reintento: proximoReintento,
        },
      });

      this.logger.error(`[payouts] PayPal payout failed for payout ${payout.id_payout}: ${errorMsg}`);
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

  async resumenPendientes() {
    const pendientes = await this.prisma.pedido_productor.findMany({
      where: {
        id_payout: null,
        estado: { in: ['entregado', 'liberado'] },
      },
      include: {
        productores: {
          select: {
            id_productor: true,
            razon_social: true,
            stripe_account_id: true,
            stripe_onboarding_completed: true,
            paypal_email: true,
            usuarios: { select: { nombre: true } },
          },
        },
      },
    });

    const grupos = new Map<
      number,
      {
        id_productor: number;
        nombre: string;
        monedas: Map<
          string,
          {
            moneda: string;
            pedidos: number;
            monto_bruto_total: number;
            comision_total: number;
            monto_neto_total: number;
          }
        >;
        stripe_onboarded: boolean;
        paypal_email?: string | null;
      }
    >();

    for (const pp of pendientes) {
      const id = pp.id_productor;
      const productor = pp.productores;
      const nombre = productor.razon_social || productor.usuarios?.nombre || 'Sin nombre';

      if (!grupos.has(id)) {
        grupos.set(id, {
          id_productor: id,
          nombre,
          monedas: new Map(),
          stripe_onboarded: productor.stripe_onboarding_completed ?? false,
          paypal_email: productor.paypal_email,
        });
      }

      const grupo = grupos.get(id)!;
      const moneda = pp.moneda!;

      if (!grupo.monedas.has(moneda)) {
        grupo.monedas.set(moneda, {
          moneda,
          pedidos: 0,
          monto_bruto_total: 0,
          comision_total: 0,
          monto_neto_total: 0,
        });
      }

      const stats = grupo.monedas.get(moneda)!;
      stats.pedidos += 1;
      stats.monto_bruto_total += Number(pp.subtotal_bruto);
      stats.comision_total += Number(pp.comision_marketplace);
      stats.monto_neto_total += Number(pp.monto_neto_productor);
    }

    return Array.from(grupos.values()).map((g) => ({
      id_productor: g.id_productor,
      nombre: g.nombre,
      resumen_por_moneda: Array.from(g.monedas.values()).map((m) => ({
        moneda: m.moneda,
        pedidos_pendientes: m.pedidos,
        monto_bruto_total: m.monto_bruto_total.toFixed(2),
        comision_total: m.comision_total.toFixed(2),
        monto_neto_total: m.monto_neto_total.toFixed(2),
      })),
      metodos_disponibles: {
        stripe: g.stripe_onboarded,
        paypal: !!g.paypal_email,
      },
    }));
  }
}
