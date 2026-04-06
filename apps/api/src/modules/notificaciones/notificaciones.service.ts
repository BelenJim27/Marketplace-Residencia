import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateNotificacionDto, UpdateNotificacionDto } from './dto/notificaciones.dto';

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.notificaciones.findMany({ include: { usuarios: true } })); }
  async findByUser(id_usuario: string) { return serializeBigInts(await this.prisma.notificaciones.findMany({ where: { id_usuario }, include: { usuarios: true } })); }
  async create(dto: CreateNotificacionDto) { return serializeBigInts(await this.prisma.notificaciones.create({ data: { id_usuario: dto.id_usuario, tipo: dto.tipo.trim(), titulo: dto.titulo.trim(), cuerpo: dto.cuerpo ?? null, url_accion: dto.url_accion ?? null, leido: dto.leido ?? false } })); }
  async update(id: string, dto: UpdateNotificacionDto) { return serializeBigInts(await this.prisma.notificaciones.update({ where: { id_notificacion: toBigIntId(id) }, data: { id_usuario: dto.id_usuario, tipo: dto.tipo?.trim(), titulo: dto.titulo?.trim(), cuerpo: dto.cuerpo, url_accion: dto.url_accion, leido: dto.leido } })); }
  async remove(id: string) { await this.prisma.notificaciones.delete({ where: { id_notificacion: toBigIntId(id) } }); return { message: 'Notificacion eliminada' }; }
}
