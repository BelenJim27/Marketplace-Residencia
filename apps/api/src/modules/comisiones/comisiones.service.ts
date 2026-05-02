import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateComisionDto, ResolverComisionQueryDto, UpdateComisionDto } from './dto/comisiones.dto';

export interface ComisionResuelta {
  id_comision: number;
  porcentaje: number;
  monto_fijo: number | null;
  alcance: string;
}

@Injectable()
export class ComisionesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return serializeBigInts(
      await this.prisma.comisiones.findMany({
        orderBy: [{ activo: 'desc' }, { prioridad: 'asc' }],
      }),
    );
  }

  async findOne(id_comision: number) {
    const item = await this.prisma.comisiones.findUnique({ where: { id_comision } });
    if (!item) throw new NotFoundException('Comisión no encontrada');
    return serializeBigInts(item);
  }

  async create(dto: CreateComisionDto) {
    this.validarAlcance(dto);
    return serializeBigInts(
      await this.prisma.comisiones.create({
        data: {
          alcance: dto.alcance,
          pais_iso2: dto.pais_iso2?.toUpperCase(),
          id_categoria: dto.id_categoria,
          id_productor: dto.id_productor,
          porcentaje: dto.porcentaje,
          monto_fijo: dto.monto_fijo,
          moneda_monto_fijo: dto.moneda_monto_fijo?.toUpperCase(),
          prioridad: dto.prioridad ?? this.prioridadDefault(dto.alcance),
          activo: dto.activo ?? true,
        },
      }),
    );
  }

  async update(id_comision: number, dto: UpdateComisionDto) {
    await this.findOne(id_comision);
    return serializeBigInts(
      await this.prisma.comisiones.update({
        where: { id_comision },
        data: {
          alcance: dto.alcance,
          pais_iso2: dto.pais_iso2?.toUpperCase(),
          id_categoria: dto.id_categoria,
          id_productor: dto.id_productor,
          porcentaje: dto.porcentaje,
          monto_fijo: dto.monto_fijo,
          moneda_monto_fijo: dto.moneda_monto_fijo?.toUpperCase(),
          prioridad: dto.prioridad,
          activo: dto.activo,
        },
      }),
    );
  }

  async remove(id_comision: number) {
    await this.findOne(id_comision);
    return serializeBigInts(
      await this.prisma.comisiones.update({
        where: { id_comision },
        data: { activo: false, vigente_hasta: new Date() },
      }),
    );
  }

  /**
   * Resuelve la comisión aplicable. La regla activa con menor prioridad
   * cuyo alcance haga match (productor > categoria > país > global) gana.
   */
  async resolver(query: ResolverComisionQueryDto, fecha: Date = new Date()): Promise<ComisionResuelta> {
    const where: Prisma.comisionesWhereInput = {
      activo: true,
      vigente_desde: { lte: fecha },
      OR: [{ vigente_hasta: null }, { vigente_hasta: { gt: fecha } }],
      AND: [
        {
          OR: [
            { alcance: 'global' },
            ...(query.id_productor ? [{ alcance: 'productor', id_productor: query.id_productor }] : []),
            ...(query.id_categoria ? [{ alcance: 'categoria', id_categoria: query.id_categoria }] : []),
            ...(query.pais_iso2 ? [{ alcance: 'pais', pais_iso2: query.pais_iso2.toUpperCase() }] : []),
          ],
        },
      ],
    };

    const candidata = await this.prisma.comisiones.findFirst({
      where,
      orderBy: [{ prioridad: 'asc' }, { creado_en: 'desc' }],
    });

    if (!candidata) {
      throw new NotFoundException('No hay regla de comisión aplicable (ni siquiera global)');
    }

    return {
      id_comision: candidata.id_comision,
      porcentaje: Number(candidata.porcentaje),
      monto_fijo: candidata.monto_fijo ? Number(candidata.monto_fijo) : null,
      alcance: candidata.alcance,
    };
  }

  /**
   * Calcula el monto de comisión para un subtotal dado, redondeado a 2 decimales.
   */
  calcularMonto(subtotal: number, comision: ComisionResuelta): number {
    const porPorcentaje = subtotal * comision.porcentaje;
    const fijo = comision.monto_fijo ?? 0;
    return Number((porPorcentaje + fijo).toFixed(2));
  }

  private validarAlcance(dto: CreateComisionDto) {
    if (dto.alcance === 'productor' && !dto.id_productor) {
      throw new BadRequestException('alcance=productor requiere id_productor');
    }
    if (dto.alcance === 'categoria' && !dto.id_categoria) {
      throw new BadRequestException('alcance=categoria requiere id_categoria');
    }
    if (dto.alcance === 'pais' && !dto.pais_iso2) {
      throw new BadRequestException('alcance=pais requiere pais_iso2');
    }
  }

  private prioridadDefault(alcance: string): number {
    return { productor: 100, categoria: 300, pais: 500, global: 1000 }[alcance] ?? 1000;
  }
}
