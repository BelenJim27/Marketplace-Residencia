import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../../common/utilities/serialize';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categorias.dto';


@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return serializeBigInts(
      await this.prisma.categorias.findMany({
        include: { other_categorias: { orderBy: { nombre: 'asc' } } },
        orderBy: { nombre: 'asc' },
      }),
    );
  }

  async findOne(id_categoria: number) {
    const item = await this.prisma.categorias.findUnique({
      where: { id_categoria },
      include: { other_categorias: { orderBy: { nombre: 'asc' } } },
    });
    if (!item) throw new NotFoundException('Categoria no encontrada');
    return serializeBigInts(item);
  }

  async create(dto: CreateCategoriaDto) {
    const idPadre =
      dto.id_padre === undefined || dto.id_padre === null || dto.id_padre === 0
        ? null
        : dto.id_padre;
    try {
      const categoria = await this.prisma.categorias.create({
        data: {
          id_padre: idPadre,
          nombre: dto.nombre.trim(),
          slug: dto.slug.trim(),
          descripcion: dto.descripcion ?? null,
          tipo: dto.tipo?.trim() ?? 'general',
          activo: dto.activo ?? true,
        },
      });
      await this.prisma.auditoria.create({
        data: {
          accion: 'crear_categoria',
          tabla_afectada: 'categorias',
          registro_id: String(categoria.id_categoria),
          valor_nuevo: { nombre: categoria.nombre, slug: categoria.slug } as any,
        },
      });
      return serializeBigInts(categoria);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Slug ya existe');
      throw error;
    }
  }

  async update(id_categoria: number, dto: UpdateCategoriaDto) {
    const current = await this.prisma.categorias.findUnique({ where: { id_categoria } });
    if (!current) throw new NotFoundException('Categoria no encontrada');
    const idPadre =
      dto.id_padre === undefined
        ? undefined
        : dto.id_padre === null || dto.id_padre === 0
          ? null
          : dto.id_padre;
    const updated = await this.prisma.categorias.update({
      where: { id_categoria },
      data: {
        id_padre: idPadre,
        nombre: dto.nombre?.trim(),
        slug: dto.slug?.trim(),
        descripcion: dto.descripcion,
        tipo: dto.tipo?.trim(),
        activo: dto.activo,
      },
    });
    await this.prisma.auditoria.create({
      data: {
        accion: 'actualizar_categoria',
        tabla_afectada: 'categorias',
        registro_id: String(id_categoria),
        valor_anterior: { nombre: current.nombre, slug: current.slug, activo: current.activo } as any,
        valor_nuevo: { nombre: dto.nombre, slug: dto.slug, activo: dto.activo } as any,
      },
    });
    return serializeBigInts(updated);
  }

  async remove(id_categoria: number) {
    const current = await this.prisma.categorias.findUnique({ where: { id_categoria } });
    await this.prisma.categorias.updateMany({
      where: { id_padre: id_categoria },
      data: { id_padre: null },
    });
    await this.prisma.categorias.delete({ where: { id_categoria } });
    await this.prisma.auditoria.create({
      data: {
        accion: 'eliminar_categoria',
        tabla_afectada: 'categorias',
        registro_id: String(id_categoria),
        valor_anterior: { nombre: current?.nombre, slug: current?.slug } as any,
      },
    });
    return { message: 'Categoria eliminada' };
  }
}