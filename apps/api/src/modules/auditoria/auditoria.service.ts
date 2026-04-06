import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateAuditoriaDto, UpdateAuditoriaDto } from './dto/auditoria.dto';

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.auditoria.findMany({ include: { usuarios: true } })); }
  async findOne(id: string) { const item = await this.prisma.auditoria.findUnique({ where: { id_auditoria: toBigIntId(id) }, include: { usuarios: true } }); if (!item) throw new NotFoundException('Auditoria no encontrada'); return serializeBigInts(item); }
  async create(dto: CreateAuditoriaDto) { return serializeBigInts(await this.prisma.auditoria.create({ data: { id_usuario: dto.id_usuario ?? undefined, accion: dto.accion.trim(), tabla_afectada: dto.tabla_afectada.trim(), registro_id: dto.registro_id ?? undefined, valor_anterior: dto.valor_anterior as Prisma.InputJsonValue | undefined, valor_nuevo: dto.valor_nuevo as Prisma.InputJsonValue | undefined, ip_origen: dto.ip_origen ?? undefined } })); }
  async update(id: string, dto: UpdateAuditoriaDto) { return serializeBigInts(await this.prisma.auditoria.update({ where: { id_auditoria: toBigIntId(id) }, data: { id_usuario: dto.id_usuario, accion: dto.accion?.trim(), tabla_afectada: dto.tabla_afectada?.trim(), registro_id: dto.registro_id, valor_anterior: dto.valor_anterior as Prisma.InputJsonValue | undefined, valor_nuevo: dto.valor_nuevo as Prisma.InputJsonValue | undefined, ip_origen: dto.ip_origen } })); }
  async remove(id: string) { await this.prisma.auditoria.delete({ where: { id_auditoria: toBigIntId(id) } }); return { message: 'Auditoria eliminada' }; }
}
