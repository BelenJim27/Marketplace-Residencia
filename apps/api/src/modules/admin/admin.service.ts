import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
}