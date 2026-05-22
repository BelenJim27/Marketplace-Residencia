import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EstadisticasLandingService {
  constructor(private readonly prisma: PrismaService) {}

  async getTopProductos(top = 4) {
    const estadosValidos = ['completado', 'entregado', 'pagado'];

    const detalles = await this.prisma.detalle_pedido.findMany({
      where: {
        pedidos: { estado: { in: estadosValidos }, eliminado_en: null },
      },
      include: {
        productos: {
          select: {
            id_producto: true,
            nombre: true,
            descripcion: true,
            imagen_principal_url: true,
          },
        },
      },
    });

    const map = new Map<
      number,
      { id: number; nombre: string; imagen: string; descripcion: string; cantidad: number }
    >();

    for (const d of detalles) {
      if (!d.productos) continue;
      const id = Number(d.productos.id_producto);
      const existing = map.get(id);
      if (existing) {
        existing.cantidad += Number(d.cantidad);
      } else {
        map.set(id, {
          id,
          nombre: d.productos.nombre,
          imagen: d.productos.imagen_principal_url ?? '',
          descripcion: d.productos.descripcion ?? '',
          cantidad: Number(d.cantidad),
        });
      }
    }

    const result = Array.from(map.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, top);

    // Si hay menos de `top` con ventas, rellenar con productos activos de la BD
    if (result.length < top) {
      const idsYaIncluidos = result.map((p) => BigInt(p.id));
      const restantes = await this.prisma.productos.findMany({
        where: {
          status: 'activo',
          eliminado_en: null,
          id_producto: { notIn: idsYaIncluidos },
        },
        select: {
          id_producto: true,
          nombre: true,
          descripcion: true,
          imagen_principal_url: true,
        },
        orderBy: { creado_en: 'desc' },
        take: top - result.length,
      });

      for (const p of restantes) {
        result.push({
          id: Number(p.id_producto),
          nombre: p.nombre,
          imagen: p.imagen_principal_url ?? '',
          descripcion: p.descripcion ?? '',
          cantidad: 0,
        });
      }
    }

    return result;
  }

  async getTopProductosConLote(top = 4) {
    const estadosValidos = ['completado', 'entregado', 'pagado'];

    const detalles = await this.prisma.detalle_pedido.findMany({
      where: {
        pedidos: { estado: { in: estadosValidos }, eliminado_en: null },
      },
      include: {
        productos: {
          select: {
            id_producto: true,
            nombre: true,
            descripcion: true,
            imagen_principal_url: true,
            lotes: {
              include: {
                lote_atributos: { orderBy: { fecha_obtencion: 'asc' } },
                productores: { select: { nombre_marca: true } },
                regiones: { select: { nombre: true } },
              },
            },
          },
        },
      },
    });

    const map = new Map<
      number,
      {
        nombre: string;
        imagen: string;
        descripcion: string;
        cantidad: number;
        lote: any;
      }
    >();

    for (const d of detalles) {
      if (!d.productos) continue;
      const id = Number(d.productos.id_producto);
      const existing = map.get(id);
      if (existing) {
        existing.cantidad += Number(d.cantidad);
      } else {
        const lote = d.productos.lotes ?? null;
        map.set(id, {
          nombre: d.productos.nombre,
          imagen: d.productos.imagen_principal_url ?? '',
          descripcion: d.productos.descripcion ?? '',
          cantidad: Number(d.cantidad),
          lote: lote
            ? {
                codigo_lote: lote.codigo_lote,
                nombre_comun: lote.nombre_comun ?? null,
                nombre_cientifico: lote.nombre_cientifico ?? null,
                grado_alcohol: lote.grado_alcohol ?? null,
                unidades: lote.unidades ?? null,
                botellas_750ml: lote.botellas_750ml ?? null,
                fecha_produccion: lote.fecha_produccion ?? null,
                sitio: lote.sitio ?? null,
                url_trazabilidad: lote.url_trazabilidad ?? null,
                url_foto_especie: lote.url_foto_especie ?? null,
                productor: lote.productores?.nombre_marca ?? null,
                region: lote.regiones?.nombre ?? null,
                atributos: lote.lote_atributos.map((a: any) => ({
                  clave: a.clave,
                  valor: a.valor ?? null,
                  unidad: a.unidad ?? null,
                  fecha: a.fecha_obtencion,
                })),
              }
            : null,
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, top);
  }

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