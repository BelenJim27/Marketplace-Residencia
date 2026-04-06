import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateTiendaDto, UpdateTiendaDto } from './dto/tiendas.dto';

@Injectable()
export class TiendasService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.tiendas.findMany({ where: { eliminado_en: null }, include: { productores: true, productos: true } })); }
  async findOne(id_tienda: number) { const item = await this.prisma.tiendas.findUnique({ where: { id_tienda }, include: { productores: true, productos: true } }); if (!item || item.eliminado_en) throw new NotFoundException('Tienda no encontrada'); return serializeBigInts(item); }
  async create(dto: CreateTiendaDto) { return serializeBigInts(await this.prisma.tiendas.create({ data: { id_productor: dto.id_productor, nombre: dto.nombre.trim(), descripcion: dto.descripcion ?? null, pais_operacion: dto.pais_operacion?.trim() ?? 'MX', status: dto.status?.trim() ?? 'activa' } })); }
  async update(id_tienda: number, dto: UpdateTiendaDto) { return serializeBigInts(await this.prisma.tiendas.update({ where: { id_tienda }, data: { id_productor: dto.id_productor, nombre: dto.nombre?.trim(), descripcion: dto.descripcion, pais_operacion: dto.pais_operacion?.trim(), status: dto.status?.trim() } })); }
  async remove(id_tienda: number) { return serializeBigInts(await this.prisma.tiendas.update({ where: { id_tienda }, data: { eliminado_en: new Date() } })); }
}
