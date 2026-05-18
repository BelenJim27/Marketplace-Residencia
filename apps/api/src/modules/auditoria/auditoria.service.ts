import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateAuditoriaDto, UpdateAuditoriaDto, ListAuditoriaQueryDto } from './dto/auditoria.dto';

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(query: ListAuditoriaQueryDto = {}) {
    const pagina = query.pagina ?? 1;
    const limite = query.limite ?? 50;
    const skip = (pagina - 1) * limite;

    const where: Prisma.auditoriaWhereInput = {};
    if (query.fecha_inicio || query.fecha_fin) {
      where.fecha = {};
      if (query.fecha_inicio) where.fecha.gte = new Date(query.fecha_inicio);
      if (query.fecha_fin) where.fecha.lte = new Date(query.fecha_fin);
    }
    if (query.id_usuario) where.id_usuario = query.id_usuario;
    if (query.tabla_afectada) where.tabla_afectada = { contains: query.tabla_afectada };

    const [items, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        include: { usuarios: true },
        orderBy: { fecha: 'desc' },
        take: limite,
        skip,
      }),
      this.prisma.auditoria.count({ where }),
    ]);

    return serializeBigInts({
      items,
      paginacion: {
        pagina,
        limite,
        total,
        paginas: Math.ceil(total / limite),
      },
    });
  }
  async findOne(id: string) { const item = await this.prisma.auditoria.findUnique({ where: { id_auditoria: toBigIntId(id) }, include: { usuarios: true } }); if (!item) throw new NotFoundException('Auditoria no encontrada'); return serializeBigInts(item); }
  async create(dto: CreateAuditoriaDto) { return serializeBigInts(await this.prisma.auditoria.create({ data: { id_usuario: dto.id_usuario ?? undefined, accion: dto.accion.trim(), tabla_afectada: dto.tabla_afectada.trim(), registro_id: dto.registro_id ?? undefined, valor_anterior: dto.valor_anterior as any | undefined, valor_nuevo: dto.valor_nuevo as any | undefined, ip_origen: dto.ip_origen ?? undefined } })); }
  async update(id: string, dto: UpdateAuditoriaDto) { return serializeBigInts(await this.prisma.auditoria.update({ where: { id_auditoria: toBigIntId(id) }, data: { id_usuario: dto.id_usuario, accion: dto.accion?.trim(), tabla_afectada: dto.tabla_afectada?.trim(), registro_id: dto.registro_id, valor_anterior: dto.valor_anterior as any | undefined, valor_nuevo: dto.valor_nuevo as any | undefined, ip_origen: dto.ip_origen } })); }
  async remove(id: string) { await this.prisma.auditoria.delete({ where: { id_auditoria: toBigIntId(id) } }); return { message: 'Auditoria eliminada' }; }
}
