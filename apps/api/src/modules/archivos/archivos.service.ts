import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateArchivoDto, UpdateArchivoDto } from './dto/archivos.dto';

@Injectable()
export class ArchivosService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.archivos.findMany({ include: { usuarios: true } })); }
  async findOne(id_archivo: string) { const item = await this.prisma.archivos.findUnique({ where: { id_archivo: BigInt(id_archivo) }, include: { usuarios: true } }); if (!item) throw new NotFoundException('Archivo no encontrado'); return serializeBigInts(item); }
  async create(dto: CreateArchivoDto) { return serializeBigInts(await this.prisma.archivos.create({ data: { entidad_tipo: dto.entidad_tipo.trim(), entidad_id: dto.entidad_id, url: dto.url, tipo: dto.tipo ?? null, estado: dto.estado?.trim() ?? 'pendiente', validado_por: dto.validado_por ?? null } })); }
  async update(id_archivo: string, dto: UpdateArchivoDto) { return serializeBigInts(await this.prisma.archivos.update({ where: { id_archivo: BigInt(id_archivo) }, data: { entidad_tipo: dto.entidad_tipo?.trim(), entidad_id: dto.entidad_id, url: dto.url, tipo: dto.tipo, estado: dto.estado?.trim(), validado_por: dto.validado_por } })); }
  async remove(id_archivo: string) { await this.prisma.archivos.delete({ where: { id_archivo: BigInt(id_archivo) } }); return { message: 'Archivo eliminado' }; }
}
