import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Moneda, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateTasaCambioDto } from './dto/tasas-cambio.dto';

// Last-resort static fallback rates. Used ONLY when the DB has no active rate
// (cron hasn't run yet or failed repeatedly). These pueden quedar obsoletas y
// distorsionar precios USD, por eso se pueden sobreescribir por entorno
// (FX_FALLBACK_MXN_USD, FX_FALLBACK_USD_MXN) y se loguea a nivel ERROR cuando se usan.
const STATIC_FALLBACK_RATES: Record<string, number> = {
  'MXN:USD': 0.055,  // ~18.2 MXN/USD (revisar manualmente)
  'USD:MXN': 18.2,
};

function resolveFallbackRate(o: string, d: string): number | undefined {
  const envValue = process.env[`FX_FALLBACK_${o}_${d}`];
  if (envValue !== undefined && envValue !== '' && !Number.isNaN(Number(envValue))) {
    return Number(envValue);
  }
  return STATIC_FALLBACK_RATES[`${o}:${d}`];
}

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
      const fallbackRate = resolveFallbackRate(o, d);
      if (fallbackRate !== undefined) {
        this.logger.error(
          `[tasas-cambio] ⚠️ Sin tasa vigente ${o}→${d} en BD. Usando fallback ${fallbackRate} ` +
          `(posiblemente OBSOLETO → distorsiona precios USD). Revisa el cron de ExchangeRate-API ` +
          `o define FX_FALLBACK_${o}_${d} con la tasa actual.`,
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
