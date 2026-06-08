import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Moneda, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateTasaCambioDto } from './dto/tasas-cambio.dto';

// Conservative static fallback rates (updated manually if needed).
// Used when the DB has no active rate (cron hasn't run yet or failed repeatedly).
const STATIC_FALLBACK_RATES: Record<string, number> = {
  'MXN:USD': 0.050,  // ~20 MXN/USD (conservative)
  'USD:MXN': 20.0,
};

@Injectable()
export class TasasCambioService {
  private readonly logger = new Logger(TasasCambioService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(origen?: string, destino?: string) {
    const where: Prisma.tasas_cambioWhereInput = {};
    if (origen) where.moneda_origen = origen.toUpperCase() as Moneda;
    if (destino) where.moneda_destino = destino.toUpperCase() as Moneda;
    return serializeBigInts(
      await this.prisma.tasas_cambio.findMany({
        where,
        orderBy: [{ moneda_origen: 'asc' }, { moneda_destino: 'asc' }, { vigente_desde: 'desc' }],
      }),
    );
  }

  async getVigente(origen: string, destino: string, fecha: Date = new Date()) {
    const o = origen.toUpperCase() as Moneda;
    const d = destino.toUpperCase() as Moneda;
    if (o === d) return { tasa: '1', moneda_origen: o, moneda_destino: d, vigente_desde: fecha };

    const tasa = await this.prisma.tasas_cambio.findFirst({
      where: {
        moneda_origen: o,
        moneda_destino: d,
        vigente_desde: { lte: fecha },
        OR: [{ vigente_hasta: null }, { vigente_hasta: { gt: fecha } }],
      },
      orderBy: { vigente_desde: 'desc' },
    });
    if (!tasa) {
      const fallbackKey = `${o}:${d}`;
      const fallbackRate = STATIC_FALLBACK_RATES[fallbackKey];
      if (fallbackRate !== undefined) {
        this.logger.warn(
          `[tasas-cambio] Sin tasa vigente ${o}→${d} en BD. Usando fallback estático ${fallbackRate}. ` +
          `Verifica que el cron de sincronización de ExchangeRate-API esté activo.`,
        );
        return { tasa: String(fallbackRate), moneda_origen: o, moneda_destino: d, vigente_desde: fecha };
      }
      throw new NotFoundException(`No hay tasa vigente ${o}→${d} para ${fecha.toISOString()}`);
    }
    return serializeBigInts(tasa);
  }

  async convertir(origen: string, destino: string, monto: string, fecha?: Date) {
    const tasa = await this.getVigente(origen, destino, fecha);
    const valor = Number(monto) * Number(tasa.tasa);
    return {
      monto_origen: Number(monto),
      monto_destino: Number(valor.toFixed(4)),
      moneda_origen: origen.toUpperCase(),
      moneda_destino: destino.toUpperCase(),
      tasa: tasa.tasa,
      vigente_desde: tasa.vigente_desde,
    };
  }

  async create(dto: CreateTasaCambioDto) {
    const o = dto.moneda_origen as Moneda;
    const d = dto.moneda_destino as Moneda;
    if (o === d) throw new BadRequestException('Origen y destino no pueden ser iguales');

    const vigente_desde = dto.vigente_desde ? new Date(dto.vigente_desde) : new Date();

    return serializeBigInts(
      await this.prisma.$transaction(async (tx) => {
        await tx.tasas_cambio.updateMany({
          where: { moneda_origen: o, moneda_destino: d, vigente_hasta: null },
          data: { vigente_hasta: vigente_desde },
        });
        return tx.tasas_cambio.create({
          data: {
            moneda_origen: o,
            moneda_destino: d,
            vigente_desde,
            tasa: dto.tasa,
            fuente: dto.fuente?.trim() ?? 'manual',
          },
        });
      }),
    );
  }
}
