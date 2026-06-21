import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { serializeBigInts } from '../../common/utilities/serialize';
import { CreateTiendaDto, UpdateTiendaDto } from './dto/tiendas.dto';

@Injectable()
export class TiendasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(id_productor?: number, query: PaginacionQueryDto = {}) {
    const pagina = query.pagina ?? 1;
    const limite = query.limite ?? 20;
    const skip = (pagina - 1) * limite;
    const where = {
      eliminado_en: null,
      ...(id_productor ? { id_productor } : {}),
    };
    const include = {
      productores: {
        include: {
          usuarios: {
            select: { nombre: true, apellido_paterno: true, apellido_materno: true },
          },
        },
      },
    };

    const [stores, total] = await Promise.all([
      this.prisma.tiendas.findMany({ where, orderBy: { fecha_creacion: 'desc' }, include, take: limite, skip }),
      this.prisma.tiendas.count({ where }),
    ]);

    const storeIds = stores.map((store) => store.id_tienda);
    const productCounts =
      storeIds.length === 0
        ? []
        : await this.prisma.productos.groupBy({
            by: ['id_tienda'],
            where: { eliminado_en: null, id_tienda: { in: storeIds } },
            _count: { id_producto: true },
          });

    const stockByStore = new Map(
      productCounts.map((item) => [item.id_tienda, item._count.id_producto]),
    );

    return serializeBigInts({
      items: stores.map((store) => ({ ...store, stock: stockByStore.get(store.id_tienda) ?? 0 })),
      paginacion: { pagina, limite, total, paginas: Math.ceil(total / limite) },
    });
  }

  async getIdProductorByUserId(id_usuario: string): Promise<number | null> {
    const p = await this.prisma.productores.findUnique({ where: { id_usuario }, select: { id_productor: true } });
    return p?.id_productor ?? null;
  }

  async findOne(id_tienda: number) {
    const item = await this.prisma.tiendas.findFirst({
      where: { id_tienda, eliminado_en: null },
    });
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
    if (
      !dto.nombre?.trim() ||
      !dto.descripcion?.trim() ||
      !dto.pais_operacion?.trim() ||
      !dto.status?.trim()
    ) {
      throw new BadRequestException('Nombre, descripción, país y status son requeridos');
    }

    const exists = await this.prisma.tiendas.findFirst({
      where: { id_tienda, eliminado_en: null },
    });
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
    const exists = await this.prisma.tiendas.findFirst({
      where: { id_tienda, eliminado_en: null },
    });
    if (!exists) throw new NotFoundException('Tienda no encontrada');

    return serializeBigInts(
      await this.prisma.tiendas.update({
        where: { id_tienda },
        data: { eliminado_en: new Date() },
      }),
    );
  }
}