import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import {
  CreateResenaDto,
  ModerarResenaDto,
  ResponderResenaDto,
  UpdateResenaDto,
} from './dto/resenas.dto';

@Injectable()
export class ResenasService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Existentes (sin cambios) ──────────────────────────────────────────────

  async findAll() {
    return serializeBigInts(
      await this.prisma.resenas.findMany({
        where: { eliminado_en: null },
        include: { usuarios: true, productos: true },
      }),
    );
  }

  async findOne(id: string) {
    const item = await this.prisma.resenas.findUnique({
      where: { id_resena: toBigIntId(id) },
      include: { usuarios: true, productos: true },
    });
    if (!item || item.eliminado_en) throw new NotFoundException('Resena no encontrada');
    return serializeBigInts(item);
  }

  async create(dto: CreateResenaDto) {
    // Verificar que no exista ya una reseña del mismo usuario para el mismo producto
    const existente = await this.prisma.resenas.findUnique({
      where: {
        id_usuario_id_producto: {
          id_usuario: dto.id_usuario,
          id_producto: BigInt(dto.id_producto),
        },
      },
    });
    if (existente && !existente.eliminado_en) {
      throw new BadRequestException('Ya existe una reseña de este usuario para este producto');
    }

    return serializeBigInts(
      await this.prisma.resenas.create({
        data: {
          id_usuario: dto.id_usuario,
          id_producto: BigInt(dto.id_producto),
          calificacion: dto.calificacion,
          comentario: dto.comentario ?? null,
          idioma_comentario: dto.idioma_comentario ?? null,
          compra_verificada: dto.compra_verificada ?? false,
          respuesta_vendedor: dto.respuesta_vendedor ?? null,
        },
      }),
    );
  }

  async update(id: string, dto: UpdateResenaDto) {
    return serializeBigInts(
      await this.prisma.resenas.update({
        where: { id_resena: toBigIntId(id) },
        data: {
          calificacion: dto.calificacion,
          comentario: dto.comentario,
          idioma_comentario: dto.idioma_comentario,
          compra_verificada: dto.compra_verificada,
          respuesta_vendedor: dto.respuesta_vendedor,
        },
      }),
    );
  }

  async remove(id: string) {
    return serializeBigInts(
      await this.prisma.resenas.update({
        where: { id_resena: toBigIntId(id) },
        data: { eliminado_en: new Date() },
      }),
    );
  }

  // ─── Nuevos endpoints ──────────────────────────────────────────────────────

  /**
   * GET /resenas/producto/:id
   * Reseñas de un producto con filtro opcional por calificacion y paginación
   */
  async findByProducto(
    idProducto: string,
    calificacion?: number,
    pagina: number = 1,
    limite: number = 10,
  ) {
    const where: Record<string, unknown> = {
      id_producto: toBigIntId(idProducto),
      eliminado_en: null,
    };
    if (calificacion) where.calificacion = calificacion;

    const [total, resenas] = await Promise.all([
      this.prisma.resenas.count({ where }),
      this.prisma.resenas.findMany({
        where,
        include: {
          usuarios: {
            select: {
              nombre: true,
              apellido_paterno: true,
              foto_url: true,
            },
          },
        },
        orderBy: { fecha: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
    ]);

    return serializeBigInts({
      data: resenas,
      meta: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
    });
  }

  /**
   * GET /resenas/producto/:id/agregado
   * Promedio de calificación y conteo total — para mostrar en catálogo
   */
  async getAgregadoByProducto(idProducto: string) {
    const result = await this.prisma.resenas.aggregate({
      where: {
        id_producto: toBigIntId(idProducto),
        eliminado_en: null,
      },
      _avg: { calificacion: true },
      _count: { calificacion: true },
    });

    // Distribución por estrella (1-5) para la barra de desglose
    const distribucion = await this.prisma.resenas.groupBy({
      by: ['calificacion'],
      where: {
        id_producto: toBigIntId(idProducto),
        eliminado_en: null,
      },
      _count: { calificacion: true },
      orderBy: { calificacion: 'desc' },
    });

    return {
      promedio: result._avg.calificacion
        ? Number(result._avg.calificacion.toFixed(1))
        : 0,
      total: result._count.calificacion,
      distribucion: distribucion.map((d) => ({
        estrellas: d.calificacion,
        cantidad: d._count.calificacion,
      })),
    };
  }

  /**
   * PATCH /resenas/:id/moderar
   * Moderación admin: soft-delete si se rechaza, o marcar respuesta_vendedor
   */
  async moderar(id: string, dto: ModerarResenaDto) {
    const resena = await this.prisma.resenas.findUnique({
      where: { id_resena: toBigIntId(id) },
    });
    if (!resena || resena.eliminado_en) throw new NotFoundException('Reseña no encontrada');

    if (dto.accion === 'rechazar') {
      return serializeBigInts(
        await this.prisma.resenas.update({
          where: { id_resena: toBigIntId(id) },
          data: { eliminado_en: new Date() },
        }),
      );
    }

    // accion === 'aprobar': no hay campo estado en el schema,
    // se mantiene visible (eliminado_en: null)
    return serializeBigInts(resena);
  }

  /**
   * PATCH /resenas/:id/responder
   * El vendedor responde una reseña
   */
  async responder(id: string, dto: ResponderResenaDto) {
    return serializeBigInts(
      await this.prisma.resenas.update({
        where: { id_resena: toBigIntId(id) },
        data: {
          respuesta_vendedor: dto.respuesta_vendedor,
          fecha_respuesta: new Date(),
        },
      }),
    );
  }

  /**
   * GET /resenas/producto/:id/similares
   * Productos de la misma categoría (excluye el actual)
   */
  async getSimilares(idProducto: string, limite: number = 6) {
    // 1. Obtener categorías del producto actual
    const categoriasDelProducto = await this.prisma.categorias_productos.findMany({
      where: { id_producto: toBigIntId(idProducto) },
      select: { id_categoria: true },
    });

    if (!categoriasDelProducto.length) return [];

    const idsCategorias = categoriasDelProducto.map((c) => c.id_categoria);

    // 2. Buscar otros productos en esas categorías
    const similares = await this.prisma.productos.findMany({
      where: {
        status: 'activo',
        eliminado_en: null,
        id_producto: { not: toBigIntId(idProducto) },
        categorias_productos: {
          some: { id_categoria: { in: idsCategorias } },
        },
      },
      select: {
        id_producto: true,
        nombre: true,
        precio_base: true,
        moneda_base: true,
        imagen_principal_url: true,
        categorias_productos: {
          select: { categorias: { select: { nombre: true, slug: true } } },
        },
        resenas: {
          where: { eliminado_en: null },
          select: { calificacion: true },
        },
      },
      take: limite,
    });

    return serializeBigInts(
      similares.map((p) => ({
        ...p,
        promedio_calificacion:
          p.resenas.length > 0
            ? Number(
                (
                  p.resenas.reduce((acc, r) => acc + r.calificacion, 0) /
                  p.resenas.length
                ).toFixed(1),
              )
            : 0,
        total_resenas: p.resenas.length,
        resenas: undefined, // no exponer el array crudo
      })),
    );
  }

  /**
   * GET /resenas/producto/:id/tambien-compraron
   * Productos que compraron otros usuarios que también compraron este producto
   */
  async getTambienCompraron(idProducto: string, limite: number = 6) {
    // 1. Pedidos que contienen este producto
    const pedidosConProducto = await this.prisma.detalle_pedido.findMany({
      where: { id_producto: toBigIntId(idProducto) },
      select: { id_pedido: true },
    });

    if (!pedidosConProducto.length) return [];

    const idsPedidos = pedidosConProducto.map((d) => d.id_pedido);

    // 2. Otros productos en esos mismos pedidos
    const otrosProductos = await this.prisma.detalle_pedido.groupBy({
      by: ['id_producto'],
      where: {
        id_pedido: { in: idsPedidos },
        id_producto: { not: toBigIntId(idProducto) },
      },
      _count: { id_producto: true },
      orderBy: { _count: { id_producto: 'desc' } },
      take: limite,
    });

    if (!otrosProductos.length) return [];

    // 3. Obtener datos de esos productos
    const productos = await this.prisma.productos.findMany({
      where: {
        id_producto: { in: otrosProductos.map((p) => p.id_producto) },
        status: 'activo',
        eliminado_en: null,
      },
      select: {
        id_producto: true,
        nombre: true,
        precio_base: true,
        moneda_base: true,
        imagen_principal_url: true,
        resenas: {
          where: { eliminado_en: null },
          select: { calificacion: true },
        },
      },
    });

    // 4. Ordenar por frecuencia de co-compra
    const frecuenciaMap = new Map(
      otrosProductos.map((p) => [p.id_producto.toString(), p._count.id_producto]),
    );

    return serializeBigInts(
      productos
        .map((p) => ({
          ...p,
          veces_comprado_junto: frecuenciaMap.get(p.id_producto.toString()) ?? 0,
          promedio_calificacion:
            p.resenas.length > 0
              ? Number(
                  (
                    p.resenas.reduce((acc, r) => acc + r.calificacion, 0) /
                    p.resenas.length
                  ).toFixed(1),
                )
              : 0,
          total_resenas: p.resenas.length,
          resenas: undefined,
        }))
        .sort((a, b) => b.veces_comprado_junto - a.veces_comprado_junto),
    );
  }
}