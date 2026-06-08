import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateNotificacionDto, UpdateNotificacionDto } from './dto/notificaciones.dto';

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.notificaciones.findMany({ include: { usuarios: true } })); }
  async findByUser(id_usuario: string) {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id_usuario)) return [];
    return serializeBigInts(await this.prisma.notificaciones.findMany({ where: { id_usuario }, include: { usuarios: true } }));
  }
  async create(dto: CreateNotificacionDto) { return serializeBigInts(await this.prisma.notificaciones.create({ data: { id_usuario: dto.id_usuario, tipo: dto.tipo.trim(), titulo: dto.titulo.trim(), cuerpo: dto.cuerpo ?? null, url_accion: dto.url_accion ?? null, leido: dto.leido ?? false } })); }
  async update(id: string, dto: UpdateNotificacionDto) {
    return serializeBigInts(await this.prisma.notificaciones.update({
      where: { id_notificacion: toBigIntId(id) },
      data: {
        id_usuario: dto.id_usuario,
        tipo: dto.tipo?.trim(),
        titulo: dto.titulo?.trim(),
        cuerpo: dto.cuerpo,
        url_accion: dto.url_accion,
        leido: dto.leido,
        ...(dto.leido === true ? { leido_en: new Date() } : {}),
      },
    }));
  }

  async remove(id: string) { await this.prisma.notificaciones.delete({ where: { id_notificacion: toBigIntId(id) } }); return { message: 'Notificacion eliminada' }; }

  async notifyUser(id_usuario: string, tipo: string, titulo: string, cuerpo: string, url_accion?: string): Promise<void> {
    try {
      await this.prisma.notificaciones.create({
        data: { id_usuario, tipo, titulo, cuerpo, url_accion: url_accion ?? null, leido: false },
      });
    } catch (e) {
      console.error('[Notificaciones] notifyUser error:', e);
    }
  }

  async notifyAdmins(tipo: string, titulo: string, cuerpo: string, url_accion?: string) {
    try {
      const adminRole = await this.prisma.roles.findFirst({
        where: { nombre: { in: ['administrador', 'admin', 'ADMIN'] } },
        select: { id_rol: true },
      });
      if (!adminRole) return;

      const adminUsers = await this.prisma.usuario_rol.findMany({
        where: { id_rol: adminRole.id_rol, estado: 'activo' },
        select: { id_usuario: true },
      });

      await Promise.all(
        adminUsers.map(({ id_usuario }) =>
          this.prisma.notificaciones.create({
            data: { id_usuario, tipo, titulo, cuerpo, url_accion: url_accion ?? null, leido: false },
          })
        )
      );
    } catch (e) {
      console.error('[Notificaciones] notifyAdmins error:', e);
    }
  }
}
