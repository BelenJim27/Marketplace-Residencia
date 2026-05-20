import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { RevisarSolicitudDto } from '../productores/dto/productores.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
  ) {}

  async getStats() {
    const [
      totalUsuarios,
      totalProductores,
      totalPedidos,
      totalIngresos,
      pedidosPendientes,
      productoresActivos,
    ] = await Promise.all([
      this.prisma.usuarios.count({ where: { eliminado_en: null } }),
      this.prisma.productores.count({ where: { eliminado_en: null } }),
      this.prisma.pedidos.count({ where: { eliminado_en: null } }),
      this.prisma.pedidos.aggregate({
        where: { eliminado_en: null, estado: { in: ['completado', 'enviado'] } },
        _sum: { total: true },
      }),
      this.prisma.pedidos.count({
        where: { estado: 'pendiente', eliminado_en: null },
      }),
      this.prisma.productores.count({
        where: { eliminado_en: null },
      }),
    ]);

    return {
      totalUsuarios: Number(totalUsuarios),
      totalProductores: Number(totalProductores),
      totalPedidos: Number(totalPedidos),
      totalIngresos: Number(totalIngresos._sum.total ?? 0),
      pedidosPendientes: Number(pedidosPendientes),
      productoresActivos: Number(productoresActivos),
    };
  }

  async getRecentOrders(limit = 10) {
    return this.prisma.pedidos.findMany({
      take: limit,
      orderBy: { fecha_creacion: 'desc' },
      where: { eliminado_en: null },
      include: {
        usuarios: {
          select: { nombre: true, email: true },
        },
      },
    });
  }

  async getTopProductores(limit = 5) {
    const pedidos = await this.prisma.pedidos.findMany({
      where: { estado: { in: ['completado', 'enviado'] }, eliminado_en: null },
      include: {
        detalle_pedido: {
          include: {
            productos: {
              include: { tiendas: { include: { productores: true } } },
            },
          },
        },
      },
    });

    const productoresMap = new Map<number, { totalVentas: number; pedidos: number; nombre: string }>();

    for (const pedido of pedidos) {
      for (const detalle of pedido.detalle_pedido) {
        const idProductor = detalle.productos.tiendas.id_productor;
        const current = productoresMap.get(idProductor) || {
          totalVentas: 0,
          pedidos: 0,
          nombre: '',
        };
        current.totalVentas += Number(detalle.precio_compra) * detalle.cantidad;
        current.pedidos += 1;
        current.nombre = detalle.productos.tiendas.productores.biografia || 'Productor';
        productoresMap.set(idProductor, current);
      }
    }

    return Array.from(productoresMap.entries())
      .map(([id_productor, data]) => ({ id_productor, ...data }))
      .sort((a, b) => b.totalVentas - a.totalVentas)
      .slice(0, limit);
  }

  // ── FIX: incluye productor_categoria y mapea a "categorias" ──────────────
  async getSolicitudesPendientes() {
    const solicitudes = await this.prisma.productores.findMany({
      where: { eliminado_en: null },
      include: {
        usuarios: {
          select: { id_usuario: true, nombre: true, email: true, telefono: true },
        },
        regiones: true,
        productor_categoria: {
          include: {
            categorias: {
              select: { id_categoria: true, nombre: true },
            },
          },
        },
      },
      orderBy: { solicitado_en: 'desc' },
    });

    return serializeBigInts(
      solicitudes.map((s) => ({
        ...s,
        categorias: s.productor_categoria.map((pc) => pc.categorias),
      })),
    );
  }

  async getAllProductores(filters?: {
    estado?: string;
    asociacion?: string;
    marca?: string;
    id_categoria?: number;
  }) {
    const where: any = { eliminado_en: null };
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.asociacion) where.asociacion = filters.asociacion;
    if (filters?.marca) {
      where.tiendas = { some: { nombre: { contains: filters.marca, mode: 'insensitive' }, eliminado_en: null } };
    }
    if (filters?.id_categoria) {
      where.productor_categoria = { some: { id_categoria: filters.id_categoria } };
    }

    const rows = await this.prisma.productores.findMany({
      where,
      include: {
        usuarios: { select: { id_usuario: true, nombre: true, email: true, telefono: true, apellido_paterno: true, apellido_materno: true } },
        regiones: true,
        tiendas: { where: { eliminado_en: null }, select: { id_tienda: true, nombre: true, status: true } },
        productor_categoria: { include: { categorias: { select: { id_categoria: true, nombre: true } } } },
      },
      orderBy: { solicitado_en: 'desc' },
    });

    return serializeBigInts(rows.map((r) => ({
      ...r,
      categorias: r.productor_categoria.map((pc) => pc.categorias),
      marca: r.tiendas?.[0]?.nombre ?? null,
    })));
  }

  async revisarSolicitud(id_productor: number, dto: RevisarSolicitudDto, revisor_id: string) {
    const productor = await this.prisma.productores.findUnique({ where: { id_productor } });
    if (!productor || productor.eliminado_en) throw new NotFoundException('Solicitud no encontrada');
    if (productor.estado !== 'pendiente') throw new BadRequestException('Esta solicitud ya fue procesada');

    const usuario = await this.prisma.usuarios.findUnique({ where: { id_usuario: productor.id_usuario } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    let rolProductor = null;

    if (dto.estado === 'aprobado') {
      rolProductor = await this.prisma.roles.findUnique({ where: { nombre: 'productor' } });
      const rolCliente = await this.prisma.roles.findUnique({ where: { nombre: 'cliente' } });

      if (rolCliente) {
        await this.prisma.usuario_rol.updateMany({
          where: { id_usuario: usuario.id_usuario, id_rol: rolCliente.id_rol },
          data: { estado: 'inactivo' },
        });
      }

      if (rolProductor) {
        await this.prisma.usuario_rol.upsert({
          where: { id_usuario_id_rol: { id_usuario: usuario.id_usuario, id_rol: rolProductor.id_rol } },
          create: { id_usuario: usuario.id_usuario, id_rol: rolProductor.id_rol, estado: 'activo' },
          update: { estado: 'activo' },
        });
      }

      const existingTienda = await this.prisma.tiendas.findFirst({
        where: { id_productor, eliminado_en: null },
      });

      if (!existingTienda) {
        const nombreTienda = productor.nombre_marca || `${usuario.nombre}'s Store`;
        await this.prisma.tiendas.create({
          data: {
            id_productor,
            nombre: nombreTienda,
            descripcion: `Tienda de ${usuario.nombre}`,
            pais_operacion: 'MX',
            status: 'activa',
          },
        });
      }
    }

    const actualizado = await this.prisma.productores.update({
      where: { id_productor },
      data: {
        estado: dto.estado,
        revisado_por: revisor_id,
        revisado_en: new Date(),
        motivo_rechazo: dto.motivo_rechazo ?? null,
      },
    });

    const titulo = dto.estado === 'aprobado' ? 'Solicitud aprobada' : 'Solicitud rechazada';
    const cuerpo = dto.estado === 'aprobado'
      ? '¡Felicidades! Tu solicitud para convertirte en productor ha sido aprobada. Ahora puedes publicar tus productos.'
      : `Tu solicitud ha sido rechazada. Motivo: ${dto.motivo_rechazo || 'No especificado'}`;

    await this.notificaciones.create({
      id_usuario: usuario.id_usuario,
      tipo: `solicitud_${dto.estado}`,
      titulo,
      cuerpo,
    });

    return serializeBigInts(actualizado);
  }
}