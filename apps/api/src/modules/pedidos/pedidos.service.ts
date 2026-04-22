import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateDetallePedidoDto, CreateFacturaDto, CreatePedidoDto, UpdateDetallePedidoDto, UpdateFacturaDto, UpdatePedidoDto } from './dto/pedidos.dto';

type Periodo = 'week' | 'month' | 'year';

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) { }
  async findAll() { return serializeBigInts(await this.prisma.pedidos.findMany({ include: { detalle_pedido: true, facturas: true, usuarios: true, monedas: true } })); }
  async findOne(id: string) { const item = await this.prisma.pedidos.findUnique({ where: { id_pedido: toBigIntId(id) }, include: { detalle_pedido: true, facturas: true, usuarios: true, monedas: true } }); if (!item || item.eliminado_en) throw new NotFoundException('Pedido no encontrado'); return serializeBigInts(item); }

  async getMisVentas(accessToken: string) {
    const id_productor = await this.resolveProductorId(accessToken);

    if (!id_productor) {
      return { resumen: { totalVentas: 0, ingresosTotales: 0, pendientes: 0 }, ventas: [] };
    }

    const pedidos = await this.findPedidosByProductor(id_productor);
    const ventas = pedidos.flatMap((pedido) =>
      pedido.detalle_pedido.map((detalle) => ({
        id_pedido: pedido.id_pedido,
        id_detalle: detalle.id_detalle,
        producto: detalle.productos.nombre,
        tienda: detalle.productos.tiendas?.nombre ?? 'Sin tienda',
        precio_unitario: Number(detalle.precio_compra),
        cantidad: Number(detalle.cantidad),
        total: Number((Number(detalle.precio_compra) * Number(detalle.cantidad)).toFixed(2)),
        status: pedido.estado,
        fecha: pedido.fecha_creacion,
        moneda: pedido.moneda,
        moneda_referencia: pedido.moneda_referencia,
        pais_destino_iso2: pedido.pais_destino_iso2,
        tipo_cambio: pedido.tipo_cambio,
        pedido_total: Number(pedido.total),
      })),
    );

    return serializeBigInts({
      resumen: {
        totalVentas: pedidos.length,
        ingresosTotales: Number(pedidos.reduce((sum, pedido) => sum + Number(pedido.total), 0).toFixed(2)),
        pendientes: pedidos.filter((pedido) => normalizeEstado(pedido.estado) === 'pendiente').length,
      },
      ventas,
    });
  }

  async getEstadisticas(periodoRaw: string, accessToken?: string, fallbackProductorId?: number) {
    const id_productor = await this.resolveProductorId(accessToken, fallbackProductorId);
    if (!id_productor) {
      const periodo = normalizePeriodo(periodoRaw);
      const { start, bucketSize } = getRangeConfig(periodo);
      const buckets = buildBuckets(start, periodo, bucketSize);
      return {
        periodo,
        resumen: {
          pedidos: 0,
          productosVendidos: 0,
          ingresos: 0,
        },
        ventas: buckets.map((bucket) => ({ x: bucket.label, y: 0 })),
        productos: [],
        rawRows: [],
      };
    }

    const periodo = normalizePeriodo(periodoRaw);
    const { start, bucketSize, formatBucketLabel } = getRangeConfig(periodo);

    const pedidos = await this.findPedidosByProductor(id_productor, start, 'asc');

    const rawRows = pedidos.flatMap((pedido) =>
      pedido.detalle_pedido
        .map((detalle) => {
          const amount = Number(detalle.precio_compra) * Number(detalle.cantidad);
          return {
            fecha: pedido.fecha_creacion,
            producto: detalle.productos.nombre,
            cantidad: Number(detalle.cantidad),
            monto: amount,
            tienda: detalle.productos.tiendas?.nombre ?? 'Sin tienda',
            status: pedido.estado,
          };
        }),
    );

    const ventasMap = new Map<string, number>();
    const productosMap = new Map<string, { cantidad: number; monto: number }>();
    const buckets = buildBuckets(start, periodo, bucketSize);

    for (const row of rawRows) {
      const bucketKey = getBucketKey(new Date(row.fecha), periodo);
      const label = formatBucketLabel(bucketKey);
      ventasMap.set(label, (ventasMap.get(label) || 0) + row.monto);

      const existing = productosMap.get(row.producto) || { cantidad: 0, monto: 0 };
      productosMap.set(row.producto, {
        cantidad: existing.cantidad + row.cantidad,
        monto: existing.monto + row.monto,
      });
    }

    const ventas = buckets.map((bucket) => ({ x: bucket.label, y: Number((ventasMap.get(bucket.label) || 0).toFixed(2)) }));

    const productos = Array.from(productosMap.entries())
      .map(([producto, data]) => ({ x: producto, y: data.cantidad, monto: Number(data.monto.toFixed(2)) }))
      .sort((a, b) => b.y - a.y);

    return {
      periodo,
      resumen: {
        pedidos: pedidos.length,
        productosVendidos: rawRows.reduce((sum, row) => sum + row.cantidad, 0),
        ingresos: Number(rawRows.reduce((sum, row) => sum + row.monto, 0).toFixed(2)),
      },
      ventas,
      productos,
      rawRows,
    };
  }
  async create(dto: CreatePedidoDto) { return serializeBigInts(await this.prisma.pedidos.create({ data: { id_usuario: dto.id_usuario, estado: dto.estado?.trim() ?? 'pendiente', total: dto.total, moneda: dto.moneda, tipo_cambio: dto.tipo_cambio ?? undefined, moneda_referencia: dto.moneda_referencia?.trim() ?? 'USD', pais_destino_iso2: dto.pais_destino_iso2 ?? undefined, direccion_envio_snapshot: dto.direccion_envio_snapshot as Prisma.InputJsonValue | undefined, direccion_facturacion_snapshot: dto.direccion_facturacion_snapshot as Prisma.InputJsonValue | undefined, devolucion_estado: dto.devolucion_estado ?? undefined, devolucion_motivo: dto.devolucion_motivo ?? undefined } })); }
  async update(id: string, dto: UpdatePedidoDto) { return serializeBigInts(await this.prisma.pedidos.update({ where: { id_pedido: toBigIntId(id) }, data: { id_usuario: dto.id_usuario, estado: dto.estado?.trim(), total: dto.total, moneda: dto.moneda, tipo_cambio: dto.tipo_cambio, moneda_referencia: dto.moneda_referencia?.trim(), pais_destino_iso2: dto.pais_destino_iso2, direccion_envio_snapshot: dto.direccion_envio_snapshot as Prisma.InputJsonValue | undefined, direccion_facturacion_snapshot: dto.direccion_facturacion_snapshot as Prisma.InputJsonValue | undefined, devolucion_estado: dto.devolucion_estado, devolucion_motivo: dto.devolucion_motivo } })); }
  async remove(id: string) { return serializeBigInts(await this.prisma.pedidos.update({ where: { id_pedido: toBigIntId(id) }, data: { eliminado_en: new Date() } })); }
  async addDetalle(id: string, dto: CreateDetallePedidoDto) { return serializeBigInts(await this.prisma.detalle_pedido.create({ data: { id_pedido: toBigIntId(id), id_producto: dto.id_producto, cantidad: dto.cantidad, precio_compra: dto.precio_compra, moneda_compra: dto.moneda_compra?.trim() ?? 'MXN', impuesto: dto.impuesto ?? '0' } })); }
  async updateDetalle(id_detalle: string, dto: UpdateDetallePedidoDto) { return serializeBigInts(await this.prisma.detalle_pedido.update({ where: { id_detalle: toBigIntId(id_detalle) }, data: { id_producto: dto.id_producto, cantidad: dto.cantidad, precio_compra: dto.precio_compra, moneda_compra: dto.moneda_compra?.trim(), impuesto: dto.impuesto } })); }
  async removeDetalle(id_detalle: string) { await this.prisma.detalle_pedido.delete({ where: { id_detalle: toBigIntId(id_detalle) } }); return { message: 'Detalle eliminado' }; }
  async addFactura(id: string, dto: CreateFacturaDto) { return serializeBigInts(await this.prisma.facturas.create({ data: { id_pedido: toBigIntId(id), uuid_fiscal: dto.uuid_fiscal ?? null, pdf_url: dto.pdf_url ?? null, xml_url: dto.xml_url ?? null, rfc_emisor: dto.rfc_emisor ?? null, rfc_receptor: dto.rfc_receptor ?? null, uso_cfdi: dto.uso_cfdi ?? null, regimen_fiscal: dto.regimen_fiscal ?? null, subtotal: dto.subtotal ?? null, impuestos_total: dto.impuestos_total ?? null, total: dto.total ?? null, moneda: dto.moneda ?? null, estado: dto.estado?.trim() ?? 'pendiente' } })); }
  async updateFactura(id_factura: string, dto: UpdateFacturaDto) { return serializeBigInts(await this.prisma.facturas.update({ where: { id_factura: toBigIntId(id_factura) }, data: { uuid_fiscal: dto.uuid_fiscal, pdf_url: dto.pdf_url, xml_url: dto.xml_url, rfc_emisor: dto.rfc_emisor, rfc_receptor: dto.rfc_receptor, uso_cfdi: dto.uso_cfdi, regimen_fiscal: dto.regimen_fiscal, subtotal: dto.subtotal, impuestos_total: dto.impuestos_total, total: dto.total, moneda: dto.moneda, estado: dto.estado } })); }
  async removeFactura(id_factura: string) { await this.prisma.facturas.delete({ where: { id_factura: toBigIntId(id_factura) } }); return { message: 'Factura eliminada' }; }

  private async resolveProductorId(accessToken?: string, fallbackProductorId?: number) {
    if (accessToken) {
      const user = await this.authService.getMe(accessToken);
      const productor = await this.prisma.productores.findFirst({
        where: { id_usuario: user.id_usuario, eliminado_en: null },
        select: { id_productor: true },
      });

      return productor?.id_productor ?? null;
    }

    return fallbackProductorId ?? null;
  }

  private findPedidosByProductor(
    id_productor: number,
    start?: Date,
    direction: 'asc' | 'desc' = 'desc',
  ) {
    const relationWhere: Prisma.detalle_pedidoWhereInput = {
      productos: {
        OR: [
          { tiendas: { id_productor, eliminado_en: null } },
          { lotes: { id_productor, eliminado_en: null } },
        ],
      },
    };

    return this.prisma.pedidos.findMany({
      where: {
        eliminado_en: null,
        ...(start ? { fecha_creacion: { gte: start } } : {}),
        detalle_pedido: {
          some: relationWhere,
        },
      },
      include: {
        detalle_pedido: {
          where: relationWhere,
          include: {
            productos: {
              include: {
                lotes: true,
                tiendas: true,
              },
            },
          },
        },
      },
      orderBy: { fecha_creacion: direction },
    });
  }
}

function normalizePeriodo(periodo: string): Periodo {
  if (periodo === 'week' || periodo === 'month' || periodo === 'year') return periodo;
  return 'month';
}

function getRangeConfig(periodo: Periodo) {
  const now = new Date();
  const start = new Date(now);

  if (periodo === 'week') {
    start.setDate(now.getDate() - 6);
    return {
      start,
      bucketSize: 'day' as const,
      formatBucketLabel: (key: string) => key,
    };
  }

  if (periodo === 'month') {
    start.setDate(now.getDate() - 29);
    return {
      start,
      bucketSize: 'day' as const,
      formatBucketLabel: (key: string) => key,
    };
  }

  start.setMonth(now.getMonth() - 11, 1);
  return {
    start,
    bucketSize: 'month' as const,
    formatBucketLabel: (key: string) => key,
  };
}

function buildBuckets(start: Date, periodo: Periodo, bucketSize: 'day' | 'month') {
  const buckets: Array<{ label: string }> = [];
  const current = new Date(start);
  const now = new Date();

  if (bucketSize === 'day') {
    while (current <= now) {
      buckets.push({ label: formatDateBucket(current) });
      current.setDate(current.getDate() + 1);
    }
    return buckets;
  }

  while (current <= now) {
    buckets.push({ label: formatMonthBucket(current) });
    current.setMonth(current.getMonth() + 1);
  }
  return buckets;
}

function getBucketKey(date: Date, periodo: Periodo) {
  if (periodo === 'year') return formatMonthBucket(date);
  return formatDateBucket(date);
}

function formatDateBucket(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMonthBucket(date: Date) {
  return date.toLocaleString('es-MX', { month: 'short', year: '2-digit' });
}

function normalizeEstado(estado: string) {
  return estado.trim().toLowerCase();
}
