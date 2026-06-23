import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ESTADOS_PEDIDO_VALIDOS = ['completado', 'entregado', 'pagado'];
export const DEFAULT_TOP_PRODUCTOS = 4;
export const MAX_TOP_PRODUCTOS = 20;

type ProductoDestacado = {
  id: number;
  nombre: string;
  imagen: string;
  descripcion: string;
  cantidad: number;
};

type EstadisticasLandingRow = {
  totalProductores: number | bigint;
  totalProductos: number | bigint;
  totalRegiones: number | bigint;
  ingresosTotales: Prisma.Decimal | number | string;
};

type ProductoConLoteRow = {
  nombre: string;
  imagen: string | null;
  descripcion: string | null;
  cantidad: number | bigint;
  codigo_lote: string | null;
  nombre_comun: string | null;
  nombre_cientifico: string | null;
  grado_alcohol: Prisma.Decimal | null;
  unidades: number | null;
  botellas_750ml: number | null;
  fecha_produccion: Date | null;
  sitio: string | null;
  url_trazabilidad: string | null;
  url_foto_especie: string | null;
  productor: string | null;
  region: string | null;
};

@Injectable()
export class EstadisticasLandingService {
  constructor(private readonly prisma: PrismaService) {}

  async getTopProductos(top = DEFAULT_TOP_PRODUCTOS): Promise<ProductoDestacado[]> {
    const limite = validarTop(top);
    const ventas = await this.getVentasAgrupadas(limite);
    const ids = ventas.map((venta) => venta.id_producto);

    const productos = ids.length
      ? await this.prisma.productos.findMany({
          where: { id_producto: { in: ids } },
          select: {
            id_producto: true,
            nombre: true,
            descripcion: true,
            imagen_principal_url: true,
          },
        })
      : [];

    const productosPorId = new Map(
      productos.map((producto) => [producto.id_producto.toString(), producto]),
    );
    const resultado: ProductoDestacado[] = ventas.flatMap((venta) => {
      const producto = productosPorId.get(venta.id_producto.toString());
      if (!producto) return [];

      return [{
        id: Number(producto.id_producto),
        nombre: producto.nombre,
        imagen: producto.imagen_principal_url ?? '',
        descripcion: producto.descripcion ?? '',
        cantidad: Number(venta._sum.cantidad ?? 0),
      }];
    });

    if (resultado.length < limite) {
      const idsIncluidos = resultado.map((producto) => BigInt(producto.id));
      const restantes = await this.prisma.productos.findMany({
        where: {
          status: 'activo',
          eliminado_en: null,
          id_producto: { notIn: idsIncluidos },
        },
        select: {
          id_producto: true,
          nombre: true,
          descripcion: true,
          imagen_principal_url: true,
        },
        orderBy: { creado_en: 'desc' },
        take: limite - resultado.length,
      });

      resultado.push(
        ...restantes.map((producto) => ({
          id: Number(producto.id_producto),
          nombre: producto.nombre,
          imagen: producto.imagen_principal_url ?? '',
          descripcion: producto.descripcion ?? '',
          cantidad: 0,
        })),
      );
    }

    return resultado;
  }

  async getTopProductosConLote(top = DEFAULT_TOP_PRODUCTOS) {
    const limite = validarTop(top);
    const productos = await this.prisma.$queryRaw<ProductoConLoteRow[]>(
      Prisma.sql`
        WITH ventas AS (
          SELECT
            detalle.id_producto,
            SUM(detalle.cantidad)::integer AS cantidad
          FROM detalle_pedido AS detalle
          INNER JOIN pedidos AS pedido ON pedido.id_pedido = detalle.id_pedido
          WHERE pedido.estado IN ('completado', 'entregado', 'pagado')
            AND pedido.eliminado_en IS NULL
          GROUP BY detalle.id_producto
          ORDER BY cantidad DESC, detalle.id_producto ASC
          LIMIT ${limite}
        )
        SELECT
          producto.nombre,
          producto.imagen_principal_url AS imagen,
          producto.descripcion,
          ventas.cantidad,
          lote.codigo_lote,
          lote.nombre_comun,
          lote.nombre_cientifico,
          lote.grado_alcohol,
          lote.unidades,
          lote.botellas_750ml,
          lote.fecha_produccion,
          lote.sitio,
          lote.url_trazabilidad,
          lote.url_foto_especie,
          productor.nombre_marca AS productor,
          region.nombre AS region
        FROM ventas
        INNER JOIN productos AS producto ON producto.id_producto = ventas.id_producto
        LEFT JOIN lotes AS lote ON lote.id_lote = producto.id_lote
        LEFT JOIN productores AS productor ON productor.id_productor = lote.id_productor
        LEFT JOIN regiones AS region ON region.id_region = lote.id_region
        ORDER BY ventas.cantidad DESC, ventas.id_producto ASC
      `,
    );

    return productos.map((producto) => ({
      nombre: producto.nombre,
      imagen: producto.imagen ?? '',
      descripcion: producto.descripcion ?? '',
      cantidad: Number(producto.cantidad),
      lote: producto.codigo_lote
          ? {
              codigo_lote: producto.codigo_lote,
              nombre_comun: producto.nombre_comun,
              nombre_cientifico: producto.nombre_cientifico,
              grado_alcohol: producto.grado_alcohol,
              unidades: producto.unidades,
              botellas_750ml: producto.botellas_750ml,
              fecha_produccion: producto.fecha_produccion,
              sitio: producto.sitio,
              url_trazabilidad: producto.url_trazabilidad,
              url_foto_especie: producto.url_foto_especie,
              productor: producto.productor,
              region: producto.region,
            }
          : null,
    }));
  }

  async getEstadisticasPublicas() {
    const [estadisticas] = await this.prisma.$queryRaw<EstadisticasLandingRow[]>(
      Prisma.sql`
        SELECT
          (SELECT COUNT(*) FROM productores WHERE estado = 'aprobado' AND eliminado_en IS NULL) AS "totalProductores",
          (SELECT COUNT(*) FROM productos WHERE status = 'activo' AND eliminado_en IS NULL) AS "totalProductos",
          (SELECT COUNT(*) FROM regiones WHERE activo = true) AS "totalRegiones",
          COALESCE((
            SELECT SUM(total)
            FROM pedidos
            WHERE estado IN ('completado', 'entregado', 'pagado')
              AND eliminado_en IS NULL
          ), 0) AS "ingresosTotales"
      `,
    );

    const ingresosTotales = Number(estadisticas?.ingresosTotales ?? 0);

    return {
      totalProductores: Number(estadisticas?.totalProductores ?? 0),
      totalProductos: Number(estadisticas?.totalProductos ?? 0),
      totalRegiones: Number(estadisticas?.totalRegiones ?? 0),
      ingresosTotales,
      ingresosFormateado: formatearIngresos(ingresosTotales),
    };
  }

  private getVentasAgrupadas(top: number) {
    return this.prisma.detalle_pedido.groupBy({
      by: ['id_producto'],
      where: {
        pedidos: {
          estado: { in: ESTADOS_PEDIDO_VALIDOS },
          eliminado_en: null,
        },
      },
      _sum: { cantidad: true },
      orderBy: { _sum: { cantidad: 'desc' } },
      take: top,
    });
  }
}

function validarTop(top: number): number {
  if (!Number.isInteger(top) || top <= 0) {
    throw new BadRequestException('El límite de productos debe ser un entero positivo');
  }
  return Math.min(top, MAX_TOP_PRODUCTOS);
}

function formatearIngresos(monto: number): string {
  if (monto >= 1_000_000) return `$${(monto / 1_000_000).toFixed(1)} M`;
  if (monto >= 1_000) return `$${(monto / 1_000).toFixed(1)} K`;
  return `$${monto.toFixed(0)}`;
}
