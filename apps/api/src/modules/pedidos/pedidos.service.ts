import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { ComisionesService } from "../comisiones/comisiones.service";
import { FedexService } from "../envios/fedex.service";
import { StripeService } from "../pagos/stripe.service";
import { serializeBigInts, toBigIntId } from "../shared/serialize";
import {
  CreateDetallePedidoDto,
  CreateFacturaDto,
  CreatePedidoDto,
  UpdateDetallePedidoDto,
  UpdateFacturaDto,
  UpdatePedidoDto,
  ValidarEnvioDto,
} from "./dto/pedidos.dto";

type Periodo = "week" | "month" | "year";

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly comisionesService: ComisionesService,
    private readonly fedexService: FedexService,
    private readonly stripeService: StripeService,
  ) {}
  async findAll() {
    return serializeBigInts(
      await this.prisma.pedidos.findMany({
        include: {
          detalle_pedido: true,
          facturas: true,
          usuarios: true,
          monedas: true,
        },
      }),
    );
  }
  async findOne(id: string) {
    const item = await this.prisma.pedidos.findUnique({
      where: { id_pedido: toBigIntId(id) },
      include: {
        detalle_pedido: true,
        facturas: true,
        usuarios: true,
        monedas: true,
      },
    });
    if (!item || item.eliminado_en)
      throw new NotFoundException("Pedido no encontrado");
    return serializeBigInts(item);
  }

  async getMisVentas(accessToken: string) {
    const id_productor = await this.resolveProductorId(accessToken);

    if (!id_productor) {
      return {
        resumen: { totalVentas: 0, ingresosTotales: 0, pendientes: 0 },
        ventas: [],
      };
    }

    const pedidos = await this.findPedidosByProductor(id_productor);
    const ventas = pedidos.flatMap((pedido) =>
      pedido.detalle_pedido.map((detalle) => ({
        id_pedido: pedido.id_pedido,
        id_detalle: detalle.id_detalle,
        producto: detalle.productos.nombre,
        tienda: detalle.productos.tiendas?.nombre ?? "Sin tienda",
        precio_unitario: Number(detalle.precio_compra),
        cantidad: Number(detalle.cantidad),
        total: Number(
          (Number(detalle.precio_compra) * Number(detalle.cantidad)).toFixed(2),
        ),
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
        ingresosTotales: Number(
          pedidos
            .reduce((sum, pedido) => sum + Number(pedido.total), 0)
            .toFixed(2),
        ),
        pendientes: pedidos.filter(
          (pedido) => normalizeEstado(pedido.estado) === "pendiente",
        ).length,
      },
      ventas,
    });
  }

  async getEstadisticas(
    periodoRaw: string,
    accessToken?: string,
    fallbackProductorId?: number,
  ) {
    const id_productor = await this.resolveProductorId(
      accessToken,
      fallbackProductorId,
    );
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

    const pedidos = await this.findPedidosByProductor(
      id_productor,
      start,
      "asc",
    );

    const rawRows = pedidos.flatMap((pedido) =>
      pedido.detalle_pedido.map((detalle) => {
        const amount = Number(detalle.precio_compra) * Number(detalle.cantidad);
        return {
          fecha: pedido.fecha_creacion,
          producto: detalle.productos.nombre,
          cantidad: Number(detalle.cantidad),
          monto: amount,
          tienda: detalle.productos.tiendas?.nombre ?? "Sin tienda",
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

      const existing = productosMap.get(row.producto) || {
        cantidad: 0,
        monto: 0,
      };
      productosMap.set(row.producto, {
        cantidad: existing.cantidad + row.cantidad,
        monto: existing.monto + row.monto,
      });
    }

    const ventas = buckets.map((bucket) => ({
      x: bucket.label,
      y: Number((ventasMap.get(bucket.label) || 0).toFixed(2)),
    }));

    const productos = Array.from(productosMap.entries())
      .map(([producto, data]) => ({
        x: producto,
        y: data.cantidad,
        monto: Number(data.monto.toFixed(2)),
      }))
      .sort((a, b) => b.y - a.y);

    return {
      periodo,
      resumen: {
        pedidos: pedidos.length,
        productosVendidos: rawRows.reduce((sum, row) => sum + row.cantidad, 0),
        ingresos: Number(
          rawRows.reduce((sum, row) => sum + row.monto, 0).toFixed(2),
        ),
      },
      ventas,
      productos,
      rawRows,
    };
  }
  async create(dto: CreatePedidoDto) {
    const pedido = await this.prisma.pedidos.create({
      data: {
        id_usuario: dto.id_usuario,
        estado: dto.estado?.trim() ?? "pendiente",
        total: dto.total,
        moneda: dto.moneda,
        tipo_cambio: dto.tipo_cambio ?? undefined,
        moneda_referencia: dto.moneda_referencia?.trim() ?? "USD",
        pais_destino_iso2: dto.pais_destino_iso2 ?? undefined,
        direccion_envio_snapshot: dto.direccion_envio_snapshot as
          | any
          | undefined,
        direccion_facturacion_snapshot: dto.direccion_facturacion_snapshot as
          | any
          | undefined,
        devolucion_estado: dto.devolucion_estado ?? undefined,
        devolucion_motivo: dto.devolucion_motivo ?? undefined,
      },
    });

    await this.prisma.auditoria.create({
      data: {
        accion: 'crear_pedido',
        tabla_afectada: 'pedidos',
        registro_id: String(pedido.id_pedido),
        valor_nuevo: {
          estado: pedido.estado,
          total: Number(pedido.total),
          moneda: pedido.moneda,
        } as any,
      },
    });

    return serializeBigInts(pedido);
  }
  async update(id: string, dto: UpdatePedidoDto) {
    const id_pedido = toBigIntId(id);

    const updated = await this.prisma.pedidos.update({
      where: { id_pedido },
      data: {
        id_usuario: dto.id_usuario,
        estado: dto.estado?.trim(),
        total: dto.total,
        moneda: dto.moneda,
        tipo_cambio: dto.tipo_cambio,
        moneda_referencia: dto.moneda_referencia?.trim(),
        pais_destino_iso2: dto.pais_destino_iso2,
        direccion_envio_snapshot: dto.direccion_envio_snapshot as
          | any
          | undefined,
        direccion_facturacion_snapshot: dto.direccion_facturacion_snapshot as
          | any
          | undefined,
        devolucion_estado: dto.devolucion_estado,
        devolucion_motivo: dto.devolucion_motivo,
      },
    });

    await this.prisma.auditoria.create({
      data: {
        accion: 'actualizar_pedido',
        tabla_afectada: 'pedidos',
        registro_id: String(id_pedido),
        valor_nuevo: {
          estado: updated.estado,
          total: Number(updated.total),
          moneda: updated.moneda,
        } as any,
      },
    });

    return serializeBigInts(updated);
  }
  async remove(id: string) {
    const id_pedido = toBigIntId(id);
    const removed = await this.prisma.pedidos.update({
      where: { id_pedido },
      data: { eliminado_en: new Date() },
    });

    await this.prisma.auditoria.create({
      data: {
        accion: 'eliminar_pedido',
        tabla_afectada: 'pedidos',
        registro_id: String(id_pedido),
        valor_nuevo: { eliminado_en: removed.eliminado_en } as any,
      },
    });

    return serializeBigInts(removed);
  }
  async addDetalle(id: string, dto: CreateDetallePedidoDto) {
    const id_pedido = toBigIntId(id);
    const id_producto = toBigIntId(dto.id_producto);

    // Resolver tienda y productor del producto. Preferimos tiendas.id_productor
    // (vínculo legal del marketplace); cae a lotes.id_productor si la tienda no lo tiene.
    const producto = await this.prisma.productos.findUnique({
      where: { id_producto },
      include: {
        tiendas: {
          select: { id_tienda: true, id_productor: true, pais_operacion: true },
        },
        lotes: { select: { id_productor: true } },
      },
    });
    if (!producto) throw new NotFoundException("Producto no encontrado");

    const id_tienda = producto.tiendas?.id_tienda ?? null;
    const id_productor =
      producto.tiendas?.id_productor ?? producto.lotes?.id_productor ?? null;
    if (!id_productor) {
      throw new NotFoundException(
        `El producto ${dto.id_producto} no tiene productor asignado. Asegúrate de que el producto pertenece a una tienda o lote con productor.`,
      );
    }

    const detalle = await this.prisma.$transaction(async (tx) => {
      const createdDetalle = await tx.detalle_pedido.create({
        data: {
          id_pedido,
          id_producto,
          id_productor,
          id_tienda,
          cantidad: dto.cantidad,
          precio_compra: dto.precio_compra,
          moneda_compra: dto.moneda_compra?.trim() ?? "MXN",
          impuesto: dto.impuesto ?? "0",
        },
        include: { productos: { include: { lotes: true } } },
      });

      const inventario = await tx.inventario.findFirst({
        where: { id_producto },
      });
      if (!inventario) {
        throw new NotFoundException(
          `No hay inventario registrado para el producto ${dto.id_producto}`,
        );
      }

      const cantidadADecretar = Number(dto.cantidad);
      const stockResultante = inventario.stock - cantidadADecretar;

      await tx.inventario.update({
        where: { id_inventario: inventario.id_inventario },
        data: { stock: stockResultante },
      });

      await tx.movimientos_inventario.create({
        data: {
          id_inventario: inventario.id_inventario,
          id_pedido,
          tipo: "venta",
          cantidad: cantidadADecretar,
          stock_resultante: stockResultante,
          motivo: `Venta en pedido ${id_pedido}`,
        },
      });

      if (id_productor) {
        await this.upsertPedidoProductorConComision(
          {
            id_pedido,
            id_productor,
            pais_operacion: producto.tiendas?.pais_operacion ?? null,
            moneda_pedido: createdDetalle.moneda_compra,
          },
          tx,
        );
      }

      await tx.auditoria.create({
        data: {
          accion: 'crear_detalle_pedido',
          tabla_afectada: 'detalle_pedido',
          registro_id: String(createdDetalle.id_detalle),
          valor_nuevo: {
            id_producto: Number(createdDetalle.id_producto),
            cantidad: Number(createdDetalle.cantidad),
            precio_compra: Number(createdDetalle.precio_compra),
          } as any,
        },
      });

      return createdDetalle;
    });

    return serializeBigInts(detalle);
  }

  /**
   * Crea/actualiza el pedido_productor agregando los detalles de ese productor:
   * recalcula subtotal_bruto (incluyendo prorrateo de tax y envío),
   * resuelve la comisión vigente y persiste todos los campos de marketplace
   * (subtotal_bruto, comision_marketplace, monto_neto_productor, moneda, id_comision_aplicada).
   *
   * El prorrateo garantiza transparencia: el productor ve exactamente cuánto generó
   * su parte del pedido (producto + impuesto + logística).
   */
  private async upsertPedidoProductorConComision(
    args: {
      id_pedido: bigint;
      id_productor: number;
      pais_operacion: string | null;
      moneda_pedido: string;
    },
    tx?: any,
  ) {
    const prismaClient = tx || this.prisma;

    const detalles = await prismaClient.detalle_pedido.findMany({
      where: { id_pedido: args.id_pedido, id_productor: args.id_productor },
    });
    if (detalles.length === 0) return;

    // Obtener el pedido para acceder a tax_amount y shipping_amount
    const pedido = await prismaClient.pedidos.findUnique({
      where: { id_pedido: args.id_pedido },
    });
    if (!pedido) return;

    // Calcular subtotal de items del productor
    const subtotal_items_productor = detalles.reduce(
      (sum: number, d: any) => sum + Number(d.precio_compra) * Number(d.cantidad),
      0,
    );

    // Calcular subtotal de todos los items del pedido (para prorrateo)
    const todos_detalles = await prismaClient.detalle_pedido.findMany({
      where: { id_pedido: args.id_pedido },
    });
    const subtotal_total_pedido = todos_detalles.reduce(
      (sum: number, d: any) => sum + Number(d.precio_compra) * Number(d.cantidad),
      0,
    );

    // Calcular porcentaje del productor
    const porcentaje_productor =
      subtotal_total_pedido > 0
        ? subtotal_items_productor / subtotal_total_pedido
        : 0;

    // Prorratear tax y shipping
    const tax_prorrateado = Number(pedido.tax_amount) * porcentaje_productor;
    const envio_prorrateado = Number(pedido.shipping_amount) * porcentaje_productor;

    // Subtotal bruto INCLUYE items + tax prorrateado + envío prorrateado
    const subtotal_bruto = Number(
      (subtotal_items_productor + tax_prorrateado + envio_prorrateado).toFixed(2),
    );

    let id_comision_aplicada: number | null = null;
    let comision_marketplace = 0;
    try {
      const comision = await this.comisionesService.resolver({
        id_productor: args.id_productor,
        pais_iso2: args.pais_operacion ?? undefined,
      });
      id_comision_aplicada = comision.id_comision;
      comision_marketplace = this.comisionesService.calcularMonto(
        subtotal_bruto,
        comision,
      );
    } catch {
      console.warn(
        `[pedidos] Sin regla de comisión para productor ${args.id_productor} / país ${args.pais_operacion}. Comisión aplicada: 0.`,
      );
    }

    const monto_neto_productor = Number(
      (subtotal_bruto - comision_marketplace).toFixed(2),
    );
    const moneda = args.moneda_pedido.toUpperCase();

    await prismaClient.pedido_productor.upsert({
      where: {
        id_pedido_id_productor: {
          id_pedido: args.id_pedido,
          id_productor: args.id_productor,
        },
      },
      update: {
        subtotal_bruto: subtotal_bruto.toFixed(2),
        comision_marketplace: comision_marketplace.toFixed(2),
        monto_neto_productor: monto_neto_productor.toFixed(2),
        moneda,
        id_comision_aplicada,
        actualizado_en: new Date(),
      },
      create: {
        id_pedido: args.id_pedido,
        id_productor: args.id_productor,
        estado: "pendiente",
        subtotal_bruto: subtotal_bruto.toFixed(2),
        comision_marketplace: comision_marketplace.toFixed(2),
        monto_neto_productor: monto_neto_productor.toFixed(2),
        moneda,
        id_comision_aplicada,
      },
    });
  }
  async updateDetalle(id_detalle: string, dto: UpdateDetallePedidoDto) {
    return serializeBigInts(
      await this.prisma.detalle_pedido.update({
        where: { id_detalle: toBigIntId(id_detalle) },
        data: {
          id_producto: dto.id_producto,
          cantidad: dto.cantidad,
          precio_compra: dto.precio_compra,
          moneda_compra: dto.moneda_compra?.trim(),
          impuesto: dto.impuesto,
        },
      }),
    );
  }
  async removeDetalle(id_detalle: string) {
    const id_detalle_big = toBigIntId(id_detalle);

    await this.prisma.detalle_pedido.delete({
      where: { id_detalle: id_detalle_big },
    });

    await this.prisma.auditoria.create({
      data: {
        accion: 'eliminar_detalle_pedido',
        tabla_afectada: 'detalle_pedido',
        registro_id: String(id_detalle_big),
      },
    });

    return { message: "Detalle eliminado" };
  }
  async addFactura(id: string, dto: CreateFacturaDto) {
    return serializeBigInts(
      await this.prisma.facturas.create({
        data: {
          id_pedido: toBigIntId(id),
          uuid_fiscal: dto.uuid_fiscal ?? null,
          pdf_url: dto.pdf_url ?? null,
          xml_url: dto.xml_url ?? null,
          rfc_emisor: dto.rfc_emisor ?? null,
          rfc_receptor: dto.rfc_receptor ?? null,
          uso_cfdi: dto.uso_cfdi ?? null,
          regimen_fiscal: dto.regimen_fiscal ?? null,
          subtotal: dto.subtotal ?? null,
          impuestos_total: dto.impuestos_total ?? null,
          total: dto.total ?? null,
          moneda: dto.moneda ?? null,
          estado: dto.estado?.trim() ?? "pendiente",
        },
      }),
    );
  }
  async updateFactura(id_factura: string, dto: UpdateFacturaDto) {
    return serializeBigInts(
      await this.prisma.facturas.update({
        where: { id_factura: toBigIntId(id_factura) },
        data: {
          uuid_fiscal: dto.uuid_fiscal,
          pdf_url: dto.pdf_url,
          xml_url: dto.xml_url,
          rfc_emisor: dto.rfc_emisor,
          rfc_receptor: dto.rfc_receptor,
          uso_cfdi: dto.uso_cfdi,
          regimen_fiscal: dto.regimen_fiscal,
          subtotal: dto.subtotal,
          impuestos_total: dto.impuestos_total,
          total: dto.total,
          moneda: dto.moneda,
          estado: dto.estado,
        },
      }),
    );
  }
  async removeFactura(id_factura: string) {
    await this.prisma.facturas.delete({
      where: { id_factura: toBigIntId(id_factura) },
    });
    return { message: "Factura eliminada" };
  }

  async getMisCompras(accessToken: string) {
    const user = await this.authService.getMe(accessToken);
    const pedidos = await this.prisma.pedidos.findMany({
      where: { id_usuario: user.id_usuario, eliminado_en: null },
      include: { detalle_pedido: true, facturas: true, envios: true },
      orderBy: { fecha_creacion: "desc" },
    });
    return serializeBigInts(pedidos);
  }

  async getMisPedidosProductor(accessToken: string) {
    const id_productor = await this.resolveProductorId(accessToken);
    if (!id_productor) return [];

    const relationWhere: Prisma.detalle_pedidoWhereInput = {
      productos: {
        OR: [
          { tiendas: { id_productor, eliminado_en: null } },
          { lotes: { id_productor, eliminado_en: null } },
        ],
      },
    };

    const pedidos = await this.prisma.pedidos.findMany({
      where: {
        eliminado_en: null,
        detalle_pedido: { some: relationWhere },
      },
      include: {
        detalle_pedido: {
          where: relationWhere,
          include: { productos: { include: { lotes: true } } },
        },
        usuarios: true,
      },
      orderBy: { fecha_creacion: "desc" },
    });

    return serializeBigInts(
      pedidos.map((p) => ({
        id_pedido: p.id_pedido,
        estado_productor: p.estado,
        estado_pedido: p.estado,
        cliente: { nombre: p.usuarios.nombre, email: p.usuarios.email },
        detalles: p.detalle_pedido,
        fecha_creacion: p.fecha_creacion,
        id_envio: null,
        total_parcial: p.detalle_pedido.reduce(
          (sum, d) => sum + Number(d.precio_compra) * Number(d.cantidad),
          0,
        ),
        moneda: p.moneda,
      })),
    );
  }

  async getOrdersByProductor(id_productor: number) {
    const pedidosProductor = await this.prisma.pedido_productor.findMany({
      where: { id_productor },
      include: {
        pedidos: {
          include: {
            detalle_pedido: {
              include: { productos: { include: { lotes: true } } },
            },
            usuarios: true,
          },
        },
      },
      orderBy: { creado_en: "desc" },
    });

    return serializeBigInts(
      pedidosProductor.map((pp) => ({
        id_pedido: pp.id_pedido,
        estado_productor: pp.estado,
        estado_pedido: pp.pedidos.estado,
        cliente: pp.pedidos.usuarios,
        detalles: pp.pedidos.detalle_pedido.filter(
          (d) => d.productos?.lotes?.id_productor === id_productor,
        ),
        fecha_creacion: pp.creado_en,
        id_envio: pp.id_envio,
        total_parcial: pp.pedidos.detalle_pedido
          .filter((d) => d.productos?.lotes?.id_productor === id_productor)
          .reduce(
            (sum, d) => sum + Number(d.precio_compra) * Number(d.cantidad),
            0,
          ),
        moneda: pp.pedidos.moneda,
      })),
    );
  }

  async getOrderDetailForProductor(id_pedido: string, id_productor: number) {
    const pedidoProductor = await this.prisma.pedido_productor.findUnique({
      where: {
        id_pedido_id_productor: {
          id_pedido: toBigIntId(id_pedido),
          id_productor,
        },
      },
      include: {
        pedidos: {
          include: {
            detalle_pedido: {
              include: { productos: { include: { lotes: true } } },
            },
            usuarios: true,
            envios: true,
          },
        },
      },
    });

    if (!pedidoProductor)
      throw new NotFoundException("Pedido no encontrado para este productor");

    return serializeBigInts({
      id_pedido: pedidoProductor.id_pedido,
      estado_productor: pedidoProductor.estado,
      pedido: pedidoProductor.pedidos,
      detalles: pedidoProductor.pedidos.detalle_pedido.filter(
        (d) => d.productos?.lotes?.id_productor === id_productor,
      ),
      envio: pedidoProductor.pedidos.envios?.[0] ?? null,
      desglose: {
        subtotal_bruto: pedidoProductor.subtotal_bruto,
        comision_marketplace: pedidoProductor.comision_marketplace,
        monto_neto_productor: pedidoProductor.monto_neto_productor,
        moneda: pedidoProductor.moneda,
        id_comision_aplicada: pedidoProductor.id_comision_aplicada,
        id_payout: pedidoProductor.id_payout,
      },
    });
  }

  async updateOrderStatusForProductor(
    id_pedido: string,
    id_productor: number,
    nuevoEstado: string,
  ) {
    const validStates = ["confirmado", "preparando", "enviado", "entregado"];
    if (!validStates.includes(nuevoEstado)) {
      throw new Error(
        `Estado inválido. Valores permitidos: ${validStates.join(", ")}`,
      );
    }

    const id_pedido_big = toBigIntId(id_pedido);

    const anterior = await this.prisma.pedido_productor.findUnique({
      where: {
        id_pedido_id_productor: {
          id_pedido: id_pedido_big,
          id_productor,
        },
      },
    });

    const updated = await this.prisma.pedido_productor.update({
      where: {
        id_pedido_id_productor: {
          id_pedido: id_pedido_big,
          id_productor,
        },
      },
      data: { estado: nuevoEstado },
      include: { pedidos: true },
    });

    // When delivery is confirmed, trigger Stripe Transfer for this productor's payment
    if (nuevoEstado === 'entregado' && anterior?.estado !== 'entregado') {
      try {
        await this.triggerPayoutForProductor(id_pedido_big, id_productor, updated.pedidos.moneda);
      } catch (err: any) {
        console.error(`[pedidos] Failed to trigger payout for productor ${id_productor}:`, err?.message);
        // Don't block the status update; payout can be retried manually
      }
    }

    await this.prisma.auditoria.create({
      data: {
        accion: 'cambiar_estado_pedido_productor',
        tabla_afectada: 'pedido_productor',
        registro_id: String(id_pedido_big),
        valor_anterior: { estado: anterior?.estado ?? null } as any,
        valor_nuevo: { estado: nuevoEstado } as any,
      },
    });

    return serializeBigInts(updated);
  }

  private async triggerPayoutForProductor(id_pedido: bigint, id_productor: number, moneda: string) {
    const pp = (await this.prisma.pedido_productor.findUnique({
      where: {
        id_pedido_id_productor: { id_pedido, id_productor },
      },
      include: {
        productores: { select: { stripe_account_id: true, stripe_onboarding_completed: true, id_usuario: true } },
        pedidos: { include: { pagos: { select: { payment_intent_id: true }, take: 1 } } },
      },
    })) as any;

    if (!pp) return;

    // Si ya hay un payout (transfer completado), no hacer nada
    if (pp.id_payout) {
      console.log(`[pedidos] Payout ya existe para productor ${id_productor} pedido ${id_pedido}: ${pp.id_payout}`);
      return;
    }

    if (!pp.productores?.stripe_account_id || !pp.productores.stripe_onboarding_completed) {
      console.warn(`[pedidos] Productor ${id_productor} sin onboarding Stripe. Dinero retenido en plataforma hasta completar configuración.`);
      try {
        await this.prisma.notificaciones.create({
          data: {
            id_usuario: pp.productores?.id_usuario || '',
            tipo: 'pago_pendiente_onboarding',
            titulo: 'Tienes un pago pendiente por transferir',
            cuerpo: `Tu pedido #${id_pedido} ha sido entregado, pero tu pago de ${pp.monto_neto_productor} ${moneda} está pendiente de transferir. Por favor completa tu configuración de Stripe.`,
            url_accion: '/dashboard/productor/ingresos',
          },
        });
      } catch (err: any) {
        console.error('[pedidos] Failed to create notification', err?.message);
      }
      return;
    }

    // Validar disputas abiertas antes de ejecutar el transfer
    const paymentIntent = pp.pedidos?.pagos?.[0]?.payment_intent_id;
    if (paymentIntent) {
      try {
        const openDisputes = await this.stripeService.countOpenDisputesForPaymentIntent(paymentIntent);
        if (openDisputes > 0) {
          console.warn(`[pedidos] Disputa(s) abierta(s) detectada(s) (${openDisputes}) para pedido ${id_pedido}. Reteniendo pago hasta resolución.`);
          return;
        }
      } catch (err: any) {
        console.error('[pedidos] Error checking disputes, skipping transfer:', err?.message);
        return;
      }
    }

    const montoNetoCents = pp.monto_neto_productor ? Math.round(Number(pp.monto_neto_productor) * 100) : 0;
    if (montoNetoCents <= 0) {
      console.warn(`[pedidos] Monto neto no positivo para productor ${id_productor}. Skipping transfer.`);
      return;
    }

    try {
      const transfer = await this.stripeService.createTransfer({
        amountCents: montoNetoCents,
        currency: moneda,
        destination: pp.productores.stripe_account_id,
        transferGroup: `pedido-${id_pedido}`,
        idempotencyKey: `transfer-${id_pedido}-${id_productor}`,
        metadata: {
          id_pedido: String(id_pedido),
          id_productor: String(id_productor),
        },
      });

      const today = new Date();
      const payout = await this.prisma.payouts.create({
        data: {
          id_productor,
          moneda: moneda.toLowerCase(),
          monto_bruto: pp.subtotal_bruto ?? pp.monto_neto_productor ?? 0,
          monto_comision: pp.comision_marketplace,
          monto_neto: pp.monto_neto_productor ?? 0,
          estado: 'procesado',
          proveedor: 'stripe',
          referencia_externa: transfer.id,
          periodo_desde: today,
          periodo_hasta: today,
        },
      });

      await this.prisma.pedido_productor.update({
        where: { id_pedido_id_productor: { id_pedido, id_productor } },
        data: { id_payout: payout.id_payout },
      });

      console.log(`[pedidos] Payout creado al confirmar entrega. Productor ${id_productor}, Transfer: ${transfer.id}`);
    } catch (error: any) {
      console.error(`[pedidos] Error al crear transfer post-entrega para productor ${id_productor}:`, error?.message);
      const today = new Date();
      const payoutFallido = await this.prisma.payouts.create({
        data: {
          id_productor,
          moneda: moneda.toLowerCase(),
          monto_bruto: pp.subtotal_bruto ?? pp.monto_neto_productor ?? 0,
          monto_comision: pp.comision_marketplace,
          monto_neto: pp.monto_neto_productor ?? 0,
          estado: 'fallido',
          proveedor: 'stripe',
          periodo_desde: today,
          periodo_hasta: today,
          intentos: 1,
          ultimo_error: error?.message?.slice(0, 500),
          proximo_reintento: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      await this.prisma.pedido_productor.update({
        where: { id_pedido_id_productor: { id_pedido, id_productor } },
        data: { id_payout: payoutFallido.id_payout },
      });

      throw error;
    }
  }

  async updateTrackingForProducer(
    id_pedido: string,
    id_productor: number,
    numero_rastreo: string,
  ) {
    const pedidoProductor = await this.prisma.pedido_productor.findUnique({
      where: {
        id_pedido_id_productor: {
          id_pedido: toBigIntId(id_pedido),
          id_productor,
        },
      },
      include: { pedidos: { include: { envios: true } } },
    });

    if (!pedidoProductor)
      throw new NotFoundException("Pedido no encontrado para este productor");

    const envio = pedidoProductor.pedidos.envios?.[0];
    if (!envio)
      throw new NotFoundException("No hay envío registrado para este pedido");

    const updated = await this.prisma.envios.update({
      where: { id_envio: envio.id_envio },
      data: {
        numero_rastreo,
        fecha_envio: new Date(),
        estado: "enviado",
      },
    });

    return serializeBigInts(updated);
  }

  async validarEnvio(dto: ValidarEnvioDto) {
    if (dto.pais_iso2 !== "US" || !dto.estado_codigo) {
      return { valido: true, items_bloqueados: [] };
    }

    const items_bloqueados: Array<{
      id_producto: number;
      nombre: string;
      razon: string;
    }> = [];

    for (const item of dto.items) {
      const producto = await this.prisma.productos.findFirst({
        where: { id_producto: BigInt(item.id_producto), eliminado_en: null },
        select: {
          nombre: true,
          categorias_productos: { select: { id_categoria: true } },
        },
      });
      if (!producto) continue;

      let bloqueado = false;
      for (const { id_categoria } of producto.categorias_productos) {
        const restriccion =
          await this.prisma.restricciones_envio_categoria.findUnique({
            where: {
              pais_iso2_estado_codigo_id_categoria: {
                pais_iso2: "US",
                estado_codigo: dto.estado_codigo,
                id_categoria,
              },
            },
            select: { permitido: true, notas: true },
          });

        if (restriccion && !restriccion.permitido) {
          items_bloqueados.push({
            id_producto: item.id_producto,
            nombre: producto.nombre,
            razon:
              restriccion.notas ?? `Envío no permitido a ${dto.estado_codigo}`,
          });
          bloqueado = true;
          break;
        }
      }
    }

    return { valido: items_bloqueados.length === 0, items_bloqueados };
  }

  private async resolveProductorId(
    accessToken?: string,
    fallbackProductorId?: number,
  ) {
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
    direction: "asc" | "desc" = "desc",
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

  async cotizarEnvio(id: string) {
    const id_pedido = toBigIntId(id);

    const pedido = await this.prisma.pedidos.findUnique({
      where: { id_pedido },
      include: {
        detalle_pedido: {
          include: { productos: { select: { peso_kg: true, ancho_cm: true, alto_cm: true, largo_cm: true } } },
        },
      },
    });

    if (!pedido) throw new NotFoundException('Pedido no encontrado');

    const snapshot = pedido.direccion_envio_snapshot as any;
    if (!snapshot?.codigo_postal || !snapshot?.pais) {
      throw new UnprocessableEntityException('El pedido no tiene dirección de envío completa');
    }

    const pesoTotal = pedido.detalle_pedido.reduce((sum, d) => {
      return sum + (Number(d.productos?.peso_kg ?? 1) * Number(d.cantidad));
    }, 0);

    const dto: any = {
      destino: {
        ciudad: snapshot.ciudad ?? '',
        estado: snapshot.estado_codigo ?? snapshot.estado ?? '',
        codigo_postal: snapshot.codigo_postal,
        pais: snapshot.pais,
      },
      peso_kg: pesoTotal,
      ancho_cm: 30,
      alto_cm: 20,
      largo_cm: 40,
    };

    const quotes = await this.fedexService.cotizarEnvio(dto);

    for (const q of quotes) {
      await this.prisma.envio_cotizaciones.create({
        data: {
          id_pedido,
          precio_total: String(q.precioTotal),
          tiempo_entrega_estimado: q.fechaEntregaEstimada ?? null,
          moneda: q.moneda ?? 'USD',
          valida_hasta: new Date(Date.now() + 4 * 3600000),
          payload_request: dto as any,
          payload_response: q as any,
        },
      });
    }

    return quotes;
  }
}

function normalizePeriodo(periodo: string): Periodo {
  if (periodo === "week" || periodo === "month" || periodo === "year")
    return periodo;
  return "month";
}

function getRangeConfig(periodo: Periodo) {
  const now = new Date();
  const start = new Date(now);

  if (periodo === "week") {
    start.setDate(now.getDate() - 6);
    return {
      start,
      bucketSize: "day" as const,
      formatBucketLabel: (key: string) => key,
    };
  }

  if (periodo === "month") {
    start.setDate(now.getDate() - 29);
    return {
      start,
      bucketSize: "day" as const,
      formatBucketLabel: (key: string) => key,
    };
  }

  start.setMonth(now.getMonth() - 11, 1);
  return {
    start,
    bucketSize: "month" as const,
    formatBucketLabel: (key: string) => key,
  };
}

function buildBuckets(
  start: Date,
  periodo: Periodo,
  bucketSize: "day" | "month",
) {
  const buckets: Array<{ label: string }> = [];
  const current = new Date(start);
  const now = new Date();

  if (bucketSize === "day") {
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
  if (periodo === "year") return formatMonthBucket(date);
  return formatDateBucket(date);
}

function formatDateBucket(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMonthBucket(date: Date) {
  return date.toLocaleString("es-MX", { month: "short", year: "2-digit" });
}

function normalizeEstado(estado: string) {
  return estado.trim().toLowerCase();
}
