import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateNotificacionDto, UpdateNotificacionDto } from './dto/notificaciones.dto';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(private readonly prisma: PrismaService) {}
  async findAll(query: PaginacionQueryDto = {}) {
    const pagina = query.pagina ?? 1;
    const limite = query.limite ?? 20;
    const skip = (pagina - 1) * limite;
    const [items, total] = await Promise.all([
      this.prisma.notificaciones.findMany({ include: { usuarios: true }, orderBy: { creado_en: 'desc' }, take: limite, skip }),
      this.prisma.notificaciones.count(),
    ]);
    return serializeBigInts({ items, paginacion: { pagina, limite, total, paginas: Math.ceil(total / limite) } });
  }
  async findByUser(id_usuario: string) { return serializeBigInts(await this.prisma.notificaciones.findMany({ where: { id_usuario }, include: { usuarios: true } })); }
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

  async notifyUser(id_usuario: string, tipo: string, titulo: string, cuerpo: string, url_accion?: string) {
    try {
      await this.prisma.notificaciones.create({
        data: { id_usuario, tipo, titulo, cuerpo, url_accion: url_accion ?? null, leido: false },
      });
    } catch (e) {
      this.logger.error(`[Notificaciones] notifyUser error: ${(e as Error)?.message}`);
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
      this.logger.error(`[Notificaciones] notifyAdmins error: ${(e as Error)?.message}`);
    }
  }
}
