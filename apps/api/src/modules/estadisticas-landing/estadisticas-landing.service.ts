import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EstadisticasLandingService {
  constructor(private readonly prisma: PrismaService) {}

  async getEstadisticasPublicas() {
    // Los estados que se consideran "completados" según tu lógica
    const estadosCompletados = ['completado', 'entregado', 'pagado'];

    const [
      totalProductores,
      totalProductos,
      totalRegiones,
      ingresos,
    ] = await Promise.all([
      // Total de productores aprobados y activos
      this.prisma.productores.count({
        where: {
          estado: 'aprobado',
          eliminado_en: null,
        },
      }),

      // Total de productos activos
      this.prisma.productos.count({
        where: {
          status: 'activo',
          eliminado_en: null,
        },
      }),

      // Total de regiones activas (comunidades)
      this.prisma.regiones.count({
        where: {
          activo: true,
        },
      }),

      // Suma de ingresos de pedidos completados
      this.prisma.pedidos.aggregate({
        _sum: { total: true },
        where: {
          estado: { in: estadosCompletados },
          eliminado_en: null,
        },
      }),
    ]);

    const ingresosTotales = Number(ingresos._sum.total ?? 0);

    return {
      totalProductores,
      totalProductos,
      totalRegiones,
      ingresosTotales,
      // Formateado para mostrar en la landing (ej: "$1.2 M")
      ingresosFormateado: formatearIngresos(ingresosTotales),
    };
  }
}

function formatearIngresos(monto: number): string {
  if (monto >= 1_000_000) {
    return `$${(monto / 1_000_000).toFixed(1)} M`;
  }
  if (monto >= 1_000) {
    return `$${(monto / 1_000).toFixed(1)} K`;
  }
  return `$${monto.toFixed(0)}`;
}