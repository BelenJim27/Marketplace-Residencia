import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateDireccionDto, UpdateDireccionDto } from './dto/direcciones.dto';

@Injectable()
export class DireccionesService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.direcciones.findMany({ where: { eliminado_en: null }, include: { usuarios: true } })); }
  async findByUser(id_usuario: string) { return serializeBigInts(await this.prisma.direcciones.findMany({ where: { id_usuario, eliminado_en: null }, include: { usuarios: true } })); }
  async create(dto: CreateDireccionDto) { return serializeBigInts(await this.prisma.direcciones.create({ data: { id_usuario: dto.id_usuario, ubicacion: (dto.ubicacion ?? {}) as Prisma.InputJsonValue, linea_1: dto.linea_1 ?? null, linea_2: dto.linea_2 ?? null, referencia: dto.referencia ?? null, tipo: dto.tipo ?? null, es_internacional: dto.es_internacional ?? false } })); }
  async update(id: string, dto: UpdateDireccionDto) { return serializeBigInts(await this.prisma.direcciones.update({ where: { id_direccion: toBigIntId(id) }, data: { id_usuario: dto.id_usuario, ubicacion: dto.ubicacion as Prisma.InputJsonValue | undefined, linea_1: dto.linea_1, linea_2: dto.linea_2, referencia: dto.referencia, tipo: dto.tipo, es_internacional: dto.es_internacional } })); }
  async remove(id: string) { return serializeBigInts(await this.prisma.direcciones.update({ where: { id_direccion: toBigIntId(id) }, data: { eliminado_en: new Date() } })); }
}
