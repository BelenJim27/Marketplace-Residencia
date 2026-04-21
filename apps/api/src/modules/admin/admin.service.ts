import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
    totalIngresos: Number(totalIngresos._sum.total ?? 0),  // ← convierte Decimal/BigInt
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

  async getSolicitudesPendientes() {
    return this.prisma.productores.findMany({
      where: { estado: 'pendiente', eliminado_en: null },
      include: {
        usuarios: { select: { id_usuario: true, nombre: true, email: true, telefono: true } },
        regiones: true,
      },
      orderBy: { solicitado_en: 'desc' },
    });
  }

  async revisarSolicitud(id_productor: number, dto: RevisarSolicitudDto, revisor_id: string) {
    const productor = await this.prisma.productores.findUnique({ where: { id_productor } });
    if (!productor || productor.eliminado_en) throw new NotFoundException('Solicitud no encontrada');
    if (productor.estado !== 'pendiente') throw new BadRequestException('Esta solicitud ya fue procesada');

    const usuario = await this.prisma.usuarios.findUnique({ where: { id_usuario: productor.id_usuario } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    let rolProductor = null;

    if (dto.estado === 'aprobado') {
      rolProductor = await this.prisma.roles.findUnique({ where: { nombre: 'PRODUCTOR' } });
      if (rolProductor) {
        await this.prisma.usuario_rol.upsert({
          where: { id_usuario_id_rol: { id_usuario: usuario.id_usuario, id_rol: rolProductor.id_rol } },
          create: { id_usuario: usuario.id_usuario, id_rol: rolProductor.id_rol, estado: 'activo' },
          update: { estado: 'activo' },
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

    return actualizado;
  }
}