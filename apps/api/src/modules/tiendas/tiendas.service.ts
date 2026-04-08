import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateTiendaDto, UpdateTiendaDto } from './dto/tiendas.dto';

@Injectable()
export class TiendasService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(id_productor: number) {
    if (!id_productor) throw new BadRequestException('id_productor es requerido');
    return serializeBigInts(
      await this.prisma.tiendas.findMany({
        where: { id_productor, eliminado_en: null },
        orderBy: { fecha_creacion: 'desc' },
      }),
    );
  }

  async findOne(id_tienda: number) {
    const item = await this.prisma.tiendas.findFirst({ where: { id_tienda, eliminado_en: null } });
    if (!item || item.eliminado_en) throw new NotFoundException('Tienda no encontrada');
    return serializeBigInts(item);
  }

  async create(dto: CreateTiendaDto) {
    if (!dto.nombre?.trim() || !dto.descripcion?.trim() || !dto.pais_operacion?.trim()) {
      throw new BadRequestException('Nombre, descripción y país son requeridos');
    }

    return serializeBigInts(
      await this.prisma.tiendas.create({
        data: {
          id_productor: dto.id_productor,
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion.trim(),
          pais_operacion: dto.pais_operacion.trim(),
          status: dto.status?.trim() ?? 'activo',
          fecha_creacion: dto.fecha_creacion ? new Date(dto.fecha_creacion) : new Date(),
          actualizado_en: new Date(),
        },
      }),
    );
  }

  async update(id_tienda: number, dto: UpdateTiendaDto) {
    if (!dto.nombre?.trim() || !dto.descripcion?.trim() || !dto.pais_operacion?.trim() || !dto.status?.trim()) {
      throw new BadRequestException('Nombre, descripción, país y status son requeridos');
    }

    const exists = await this.prisma.tiendas.findFirst({ where: { id_tienda, eliminado_en: null } });
    if (!exists) throw new NotFoundException('Tienda no encontrada');

    return serializeBigInts(
      await this.prisma.tiendas.update({
        where: { id_tienda },
        data: {
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion.trim(),
          pais_operacion: dto.pais_operacion.trim(),
          status: dto.status.trim(),
          actualizado_en: dto.actualizado_en ? new Date(dto.actualizado_en) : new Date(),
        },
      }),
    );
  }

  async remove(id_tienda: number) {
    const exists = await this.prisma.tiendas.findFirst({ where: { id_tienda, eliminado_en: null } });
    if (!exists) throw new NotFoundException('Tienda no encontrada');

    return serializeBigInts(
      await this.prisma.tiendas.update({
        where: { id_tienda },
        data: { eliminado_en: new Date() },
      }),
    );
  }
}
