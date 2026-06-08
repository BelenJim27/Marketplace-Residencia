import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Moneda, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { ComisionesService } from "../comisiones/comisiones.service";
import { EmailService } from "../email/email.service";
import { SkydropxService } from "../envios/skydropx.service";
import { PaypalService } from "../pagos/paypal.service";
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
    private readonly emailService: EmailService,
    private readonly skydropxService: SkydropxService,
    private readonly stripeService: StripeService,
    private readonly paypalService: PaypalService,
  ) {}
  async findAll() {
    return serializeBigInts(
      await this.prisma.pedidos.findMany({
        include: {
          detalle_pedido: {
            include: {
              productos: { select: { nombre: true, imagen_principal_url: true } },
              productores: {
                select: {
                  id_productor: true,
                  nombre_marca: true,
                  usuarios: { select: { nombre: true, apellido_paterno: true } },
                },
              },
            },
          },
          facturas: true,
          usuarios: true,
        },
        orderBy: { fecha_creacion: 'desc' },
      }),
    );
  }
  async findOne(id: string) {
    const item = await this.prisma.pedidos.findUnique({
      where: { id_pedido: toBigIntId(id) },
      include: {
        detalle_pedido: {
          include: {
            productos: {
              select: {
                nombre: true,
                imagen_principal_url: true,
                producto_imagenes: { select: { url: true }, take: 1 },
              },
            },
          },
        },
        envios: true,
        facturas: true,
        usuarios: true,
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
      pedido.detalle_pedido
        .filter((d) => {
          // Only expose line items that belong to this producer
          const prod = d.productos;
          return (
            prod?.tiendas?.id_productor === id_productor ||
            prod?.lotes?.id_productor === id_productor
          );
        })
        .map((detalle) => ({
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
    // Validar que el país destino esté habilitado para ventas en la plataforma.
    // Esto evita crear pedidos a destinos que aún no están operativos (e.g., USA en MVP).
    if (dto.pais_destino_iso2) {
      const pais = await this.prisma.paises.findUnique({
        where: { iso2: dto.pais_destino_iso2.toUpperCase() },
        select: { activo_venta: true, nombre: true },
      });
      if (pais && !pais.activo_venta) {
        throw new BadRequestException(
          `Las ventas con destino ${pais.nombre ?? dto.pais_destino_iso2} no están habilitadas en este momento.`,
        );
      }
    }

    // El total real lo calcula el backend en createStripePaymentIntent/createPaypalOrder
    // (validando subtotal contra BD, recalculando envío e impuestos).
    // El valor que envía el frontend se ignora; se almacena 0 como placeholder.
    const pedido = await this.prisma.pedidos.create({
      data: {
        id_usuario: dto.id_usuario,
        estado: dto.estado?.trim() ?? "pendiente",
        total: "0",
        moneda: dto.moneda,
        tipo_cambio: dto.tipo_cambio ?? undefined,
        moneda_referencia: (dto.moneda_referencia?.trim() ?? "USD") as Moneda,
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

    // Calcular el número de orden del usuario (cuántos pedidos ha hecho)
    const numeroOrden = await this.prisma.pedidos.count({
      where: { id_usuario: pedido.id_usuario, eliminado_en: null },
    });

    return { ...serializeBigInts(pedido), numero_orden: numeroOrden };
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
        moneda_referencia: dto.moneda_referencia?.trim() as Moneda | undefined,
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

    // Precio autoritativo: siempre viene de BD, nunca del cliente.
    // Si el frontend envía un precio diferente (posible manipulación via DevTools),
    // se rechaza la solicitud.
    const precioReal = Number(producto.precio_base);
    const precioCliente = Number(dto.precio_compra);
    if (Math.abs(precioReal - precioCliente) > 0.01) {
      throw new BadRequestException(
        `El precio del producto ${dto.id_producto} no es válido. Recarga la página e intenta de nuevo.`,
      );
    }

    const detalle = await this.prisma.$transaction(
      async (tx) => {
        const createdDetalle = await tx.detalle_pedido.create({
        data: {
          id_pedido,
          id_producto,
          id_productor,
          id_tienda,
          cantidad: dto.cantidad,
          precio_compra: producto.precio_base,
          moneda_compra: (dto.moneda_compra?.trim() ?? "MXN") as Moneda,
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

      // Decremento atómico condicional: el WHERE stock >= N y el SET stock = stock - N
      // ocurren en una sola sentencia SQL, eliminando la race condition de overselling
      // cuando dos transacciones concurrentes leen el mismo stock antes de actualizarlo.
      const updateResult = await tx.inventario.updateMany({
        where: {
          id_inventario: inventario.id_inventario,
          stock: { gte: cantidadADecretar },
        },
        data: { stock: { decrement: cantidadADecretar } },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException(
          `Stock insuficiente para el producto ${dto.id_producto}. Disponible: ${inventario.stock}, solicitado: ${cantidadADecretar}.`,
        );
      }

      const stockResultante = inventario.stock - cantidadADecretar;

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
      },
      {
        timeout: 15000, // Aumentar timeout a 15 segundos para operaciones complejas
      }
    );

    // Notificar al productor si el stock quedó bajo (fuera de la transacción — best-effort)
    const finalStock = await this.prisma.inventario.findFirst({
      where: { id_producto },
      select: { stock: true },
    });
    const stockActual = finalStock ? Number(finalStock.stock) : -1;
    if (stockActual >= 0 && stockActual <= 10 && id_productor) {
      try {
        const productor = await this.prisma.productores.findUnique({
          where: { id_productor },
          select: { id_usuario: true },
        });
        if (productor?.id_usuario) {
          const nombreProducto = (detalle as any).productos?.nombre ?? 'tu producto';
          await this.prisma.notificaciones.create({
            data: {
              id_usuario: productor.id_usuario,
              tipo: 'stock_bajo',
              titulo: stockActual === 0 ? 'Producto agotado' : 'Stock bajo',
              cuerpo: stockActual === 0
                ? `"${nombreProducto}" se ha agotado. Actualiza tu inventario.`
                : `"${nombreProducto}" tiene solo ${stockActual} unidades restantes.`,
              url_accion: '/dashboard/productor/productos',
              leido: false,
            },
          });
        }
      } catch (err: any) {
        console.error('[pedidos] Failed to create stock_bajo notification:', err?.message);
      }
    }

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
    } catch (err: any) {
      // No silenciar: una comisión de 0% implica pérdida de ingresos sin alerta.
      // El admin debe garantizar que siempre exista una regla global activa en la tabla comisiones.
      throw new Error(
        `[pedidos] Sin regla de comisión para productor ${args.id_productor} / país ${args.pais_operacion}. Asegúrate de que exista una regla con alcance='global' y activo=true. Error original: ${err?.message}`,
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
          moneda_compra: dto.moneda_compra?.trim() as Moneda | undefined,
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
    const factura = await this.prisma.facturas.create({
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
    });

    // Enviar factura por correo
    try {
      const pedido = await this.prisma.pedidos.findUnique({
        where: { id_pedido: toBigIntId(id) },
        select: {
          total: true,
          moneda: true,
          fecha_creacion: true,
          usuarios: { select: { email: true, nombre: true, apellido_paterno: true } },
          detalle_pedido: {
            select: {
              cantidad: true,
              precio_compra: true,
              moneda_compra: true,
              productos: { select: { nombre: true } },
            },
          },
        },
      });

      const emailFactura = dto.email_factura?.trim() || null;
      const emailDestino = emailFactura ?? pedido?.usuarios?.email;

      const nombreCliente = dto.nombre_razon_social
        || [pedido?.usuarios?.nombre, pedido?.usuarios?.apellido_paterno].filter(Boolean).join(' ')
        || 'Cliente';

      const subtotal = (pedido?.detalle_pedido ?? []).reduce(
        (s: number, d: any) => s + Number(d.cantidad) * Number(d.precio_compra), 0
      );
      const total = pedido?.total ? Number(pedido.total) : subtotal;
      const iva = Math.round((total - subtotal) * 100) / 100 > 0
        ? Math.round((total - subtotal) * 100) / 100
        : Math.round(subtotal * 0.16 * 100) / 100;

      const conceptos = (pedido?.detalle_pedido ?? []).map((d: any) => ({
        descripcion: d.productos?.nombre ?? 'Producto',
        clave: '50202306',
        unidad: 'H87 · Pieza',
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precio_compra),
        descuento: 0,
        importe: Number(d.cantidad) * Number(d.precio_compra),
        objImpuesto: '02',
      }));

      if (emailDestino) {
        await this.emailService.sendFacturaEmail(emailDestino, {
          pedidoId: id,
          folio: `F-${id.padStart(6, '0')}`,
          fecha: pedido?.fecha_creacion ?? new Date(),
          rfc: dto.rfc_receptor ?? 'XAXX010101000',
          nombreRazonSocial: nombreCliente,
          usoCfdi: dto.uso_cfdi ?? 'G03',
          regimenFiscal: dto.regimen_fiscal ?? '616 - Sin obligaciones fiscales',
          domicilioFiscal: '68000',
          conceptos,
          subtotal,
          iva,
          total,
          moneda: pedido?.moneda ?? 'MXN',
          formaPago: '03',
          metodoPago: 'Pago en una sola exhibición',
        });
      }
    } catch (err: any) {
      console.error('[pedidos] Error enviando factura:', err?.message ?? err);
    }

    return serializeBigInts(factura);
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

  async testEmail(to: string) {
    return this.emailService.testEmail(to);
  }

  async getMisCompras(accessToken: string) {
    const user = await this.authService.getMe(accessToken);
    const pedidos = await this.prisma.pedidos.findMany({
      where: { id_usuario: user.id_usuario, eliminado_en: null },
      include: {
        detalle_pedido: {
          include: {
            productos: {
              select: {
                nombre: true,
                imagen_principal_url: true,
                producto_imagenes: { select: { url: true }, take: 1 },
              },
            },
          },
        },
        facturas: true,
        envios: true,
      },
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
              include: {
                productos: { include: { lotes: true, tiendas: true } },
              },
            },
            usuarios: true,
          },
        },
      },
      orderBy: { creado_en: "desc" },
    });

    const belongsToProductor = (d: any) =>
      d.productos?.lotes?.id_productor === id_productor ||
      d.productos?.tiendas?.id_productor === id_productor;

    return serializeBigInts(
      pedidosProductor.map((pp) => ({
        id_pedido: pp.id_pedido,
        estado_productor: pp.estado,
        estado_pedido: pp.pedidos.estado,
        cliente: pp.pedidos.usuarios,
        detalles: pp.pedidos.detalle_pedido.filter(belongsToProductor),
        fecha_creacion: pp.creado_en,
        id_envio: pp.id_envio,
        total_parcial: pp.pedidos.detalle_pedido
          .filter(belongsToProductor)
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
              include: {
                productos: { include: { lotes: true, tiendas: true } },
              },
            },
            usuarios: true,
            envios: {
              include: {
                envio_guias: {
                  where: { eliminado_en: null },
                  take: 1,
                  orderBy: { fecha_creacion: 'desc' as const },
                  select: { payload_response: true },
                },
              },
            },
          },
        },
      },
    });

    if (!pedidoProductor)
      throw new NotFoundException("Pedido no encontrado para este productor");

    const belongsToProductor = (d: any) =>
      d.productos?.lotes?.id_productor === id_productor ||
      d.productos?.tiendas?.id_productor === id_productor;

    const detallesFiltrados = pedidoProductor.pedidos.detalle_pedido.filter(belongsToProductor);

    // Carrier name: prefer guide (post-creation) over quotation (pre-creation)
    const envioData = pedidoProductor.pedidos.envios?.[0] ?? null;
    const guiaPayload = (envioData as any)?.envio_guias?.[0]?.payload_response as any;
    const cotizacion = await this.prisma.envio_cotizaciones.findFirst({
      where: { id_pedido: toBigIntId(id_pedido) },
      orderBy: { fecha_solicitud: 'desc' },
      select: { payload_response: true },
    });
    const cotPayload = cotizacion?.payload_response as any;
    const carrier_name: string | null = guiaPayload?.carrierName ?? cotPayload?.providerName ?? null;

    const is_alcohol = detallesFiltrados.some(
      (d: any) => (d.productos?.requiere_edad_minima ?? 0) >= 18,
    );

    return serializeBigInts({
      id_pedido: pedidoProductor.id_pedido,
      estado_productor: pedidoProductor.estado,
      pedido: pedidoProductor.pedidos,
      detalles: detallesFiltrados,
      envio: envioData ? { ...envioData, carrier_name, is_alcohol } : null,
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
    isAdmin = false,
  ) {
    // Máquina de estados: solo se permiten transiciones secuenciales hacia adelante.
    // Admins pueden forzar cualquier transición para corregir errores operativos.
    const VALID_TRANSITIONS: Record<string, string[]> = {
      pendiente:  ['confirmado'],
      confirmado: ['preparando'],
      preparando: ['enviado'],
      enviado:    ['entregado'],
      entregado:  [],
      cancelado:  [],
    };

    const id_pedido_big = toBigIntId(id_pedido);

    const anterior = await this.prisma.pedido_productor.findUnique({
      where: {
        id_pedido_id_productor: {
          id_pedido: id_pedido_big,
          id_productor,
        },
      },
    });

    if (!anterior) {
      throw new NotFoundException(
        `No se encontró el pedido ${id_pedido} para el productor ${id_productor}`,
      );
    }

    const estadoActual = anterior.estado ?? 'pendiente';
    const transicionesPermitidas = VALID_TRANSITIONS[estadoActual] ?? [];

    if (!isAdmin && !transicionesPermitidas.includes(nuevoEstado)) {
      const destinos = transicionesPermitidas.length
        ? transicionesPermitidas.join(', ')
        : 'ninguna (estado terminal)';
      throw new BadRequestException(
        `Transición inválida: ${estadoActual} → ${nuevoEstado}. Permitidas desde "${estadoActual}": ${destinos}.`,
      );
    }

    // Admins también deben apuntar a un estado conocido
    if (!(nuevoEstado in VALID_TRANSITIONS)) {
      throw new BadRequestException(
        `Estado desconocido: "${nuevoEstado}". Estados válidos: ${Object.keys(VALID_TRANSITIONS).join(', ')}.`,
      );
    }

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

    await this.prisma.auditoria.create({
      data: {
        accion: 'cambiar_estado_pedido_productor',
        tabla_afectada: 'pedido_productor',
        registro_id: String(id_pedido_big),
        valor_anterior: { estado: anterior?.estado ?? null } as any,
        valor_nuevo: { estado: nuevoEstado } as any,
      },
    });

    if (nuevoEstado === 'entregado') {
      const moneda = (updated.pedidos as any).moneda as Moneda;
      try {
        await this.triggerPayoutForProductor(id_pedido_big, id_productor, moneda);
      } catch (err: any) {
        // No bloquear el cambio de estado — el payout se rastrea en la tabla payouts
        // y el cron retryFailedTransfers intentará de nuevo cada 15 min
        console.error(
          `[pedidos] triggerPayoutForProductor falló para pedido ${id_pedido_big} productor ${id_productor}: ${err?.message}`,
        );
      }
    }

    return serializeBigInts(updated);
  }

  private async triggerPayoutForProductor(id_pedido: bigint, id_productor: number, moneda: Moneda) {
    const pp = (await this.prisma.pedido_productor.findUnique({
      where: {
        id_pedido_id_productor: { id_pedido, id_productor },
      },
      include: {
        productores: { select: { stripe_account_id: true, stripe_onboarding_completed: true, id_usuario: true } },
        pedidos: { include: { pagos: { select: { payment_intent_id: true, proveedor: true }, take: 1 } } },
      },
    })) as any;

    if (!pp) return;

    // Si ya hay un payout (transfer completado), no hacer nada
    if (pp.id_payout) {
      console.log(`[pedidos] Payout ya existe para productor ${id_productor} pedido ${id_pedido}: ${pp.id_payout}`);
      return;
    }

    const monto_neto = pp.monto_neto_productor ? Number(pp.monto_neto_productor) : 0;
    if (monto_neto <= 0) {
      console.warn(`[pedidos] Monto neto no positivo para productor ${id_productor}. Skipping payout.`);
      return;
    }

    // Determine payment provider from the pago record
    const pagoRecord = pp.pedidos?.pagos?.[0];
    const paymentProvider = pagoRecord?.proveedor || 'stripe';

    if (paymentProvider === 'paypal') {
      // PayPal Payouts flow
      if (!pp.productores?.paypal_email) {
        console.warn(`[pedidos] Productor ${id_productor} sin PayPal email. Dinero retenido en plataforma hasta completar configuración.`);
        try {
          await this.prisma.notificaciones.create({
            data: {
              id_usuario: pp.productores?.id_usuario || '',
              tipo: 'pago_pendiente_onboarding',
              titulo: 'Tienes un pago pendiente por transferir',
              cuerpo: `Tu pedido #${id_pedido} ha sido entregado, pero tu pago de ${monto_neto} ${moneda} está pendiente de transferir. Por favor configura tu email de PayPal en tu perfil.`,
              url_accion: '/dashboard/productor/ingresos',
            },
          });
        } catch (err: any) {
          console.error('[pedidos] Failed to create notification', err?.message);
        }
        return;
      }

      try {
        // Convert to USD for PayPal
        let amountUSD = monto_neto;
        if (moneda !== 'USD') {
          const tasa = await this.prisma.tasas_cambio.findFirst({
            where: {
              moneda_origen: moneda,
              moneda_destino: Moneda.USD,
              vigente_desde: { lte: new Date() },
              OR: [{ vigente_hasta: null }, { vigente_hasta: { gte: new Date() } }],
            },
            orderBy: { vigente_desde: 'desc' },
          });
          const tipoCambio = tasa ? Number(tasa.tasa) : 20;
          amountUSD = monto_neto / tipoCambio;
        }
        amountUSD = parseFloat(amountUSD.toFixed(2));

        const payoutResult = await this.paypalService.createPayout({
          paypalEmail: pp.productores.paypal_email,
          amountUSD,
          referenceId: `pedido-${id_pedido}-prod-${id_productor}`,
        });

        const today = new Date();
        const payout = await this.prisma.payouts.create({
          data: {
            id_productor,
            moneda,
            monto_bruto: pp.subtotal_bruto ?? monto_neto ?? 0,
            monto_comision: pp.comision_marketplace,
            monto_neto: monto_neto ?? 0,
            estado: 'procesado',
            proveedor: 'paypal',
            referencia_externa: payoutResult.batchId,
            periodo_desde: today,
            periodo_hasta: today,
          },
        });

        await this.prisma.pedido_productor.update({
          where: { id_pedido_id_productor: { id_pedido, id_productor } },
          data: { id_payout: payout.id_payout },
        });

        console.log(`[pedidos] PayPal Payout creado al confirmar entrega. Productor ${id_productor}, Batch: ${payoutResult.batchId}`);
      } catch (error: any) {
        console.error(`[pedidos] Error al crear PayPal payout post-entrega para productor ${id_productor}:`, error?.message);
        const today = new Date();
        const payoutFallido = await this.prisma.payouts.create({
          data: {
            id_productor,
            moneda,
            monto_bruto: pp.subtotal_bruto ?? monto_neto ?? 0,
            monto_comision: pp.comision_marketplace,
            monto_neto: monto_neto ?? 0,
            estado: 'fallido',
            proveedor: 'paypal',
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
    } else {
      // Stripe Connect flow (unchanged)
      if (!pp.productores?.stripe_account_id || !pp.productores.stripe_onboarding_completed) {
        console.warn(`[pedidos] Productor ${id_productor} sin onboarding Stripe. Dinero retenido en plataforma hasta completar configuración.`);
        try {
          await this.prisma.notificaciones.create({
            data: {
              id_usuario: pp.productores?.id_usuario || '',
              tipo: 'pago_pendiente_onboarding',
              titulo: 'Tienes un pago pendiente por transferir',
              cuerpo: `Tu pedido #${id_pedido} ha sido entregado, pero tu pago de ${monto_neto} ${moneda} está pendiente de transferir. Por favor completa tu configuración de Stripe.`,
              url_accion: '/dashboard/productor/ingresos',
            },
          });
        } catch (err: any) {
          console.error('[pedidos] Failed to create notification', err?.message);
        }
        return;
      }

      // Validar disputas abiertas antes de ejecutar el transfer
      const paymentIntent = pagoRecord?.payment_intent_id;
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

      const montoNetoCents = monto_neto ? Math.round(monto_neto * 100) : 0;
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
            moneda,
            monto_bruto: pp.subtotal_bruto ?? monto_neto ?? 0,
            monto_comision: pp.comision_marketplace,
            monto_neto: monto_neto ?? 0,
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
            moneda,
            monto_bruto: pp.subtotal_bruto ?? monto_neto ?? 0,
            monto_comision: pp.comision_marketplace,
            monto_neto: monto_neto ?? 0,
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

    const productIds = dto.items.map(i => BigInt(i.id_producto));

    const productos = await this.prisma.productos.findMany({
      where: { id_producto: { in: productIds }, eliminado_en: null },
      select: {
        id_producto: true,
        nombre: true,
        categorias_productos: { select: { id_categoria: true } },
      },
    });

    const categoriaIds = [
      ...new Set(
        productos.flatMap(p => p.categorias_productos.map(c => c.id_categoria))
      ),
    ];

    const restricciones = await this.prisma.restricciones_envio_categoria.findMany({
      where: {
        pais_iso2: "US",
        estado_codigo: dto.estado_codigo,
        id_categoria: { in: categoriaIds },
      },
      select: { id_categoria: true, permitido: true, notas: true },
    });

    const restriccionesMap = new Map(
      restricciones.map(r => [r.id_categoria, r])
    );
    const productoMap = new Map(
      productos.map(p => [Number(p.id_producto), p])
    );

    for (const item of dto.items) {
      const producto = productoMap.get(item.id_producto);
      if (!producto) continue;

      let bloqueado = false;
      for (const { id_categoria } of producto.categorias_productos) {
        const restriccion = restriccionesMap.get(id_categoria);
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

    const items = pedido.detalle_pedido;
    const pesoReal = items.reduce(
      (s, d) => s + Number(d.productos?.peso_kg ?? 1) * Number(d.cantidad), 0,
    );
    const maxLargo = Math.max(10, ...items.map(d => Number(d.productos?.largo_cm ?? 10)));
    const maxAncho = Math.max(10, ...items.map(d => Number(d.productos?.ancho_cm ?? 10)));
    const alturaTotal = items.reduce(
      (s, d) => s + Number(d.productos?.alto_cm ?? 5) * Number(d.cantidad), 0,
    );
    const pesoVolumetrico = (maxLargo * maxAncho * alturaTotal) / 5000;
    const pesoFacturable = Math.max(pesoReal, pesoVolumetrico);

    const dto: any = {
      destino: {
        ciudad: snapshot.ciudad ?? '',
        estado: snapshot.estado_codigo ?? snapshot.estado ?? '',
        codigo_postal: snapshot.codigo_postal,
        pais: snapshot.pais,
      },
      peso_kg: pesoFacturable,
      ancho_cm: maxAncho,
      alto_cm: alturaTotal,
      largo_cm: maxLargo,
    };

    const quotes = await this.skydropxService.cotizarEnvio(dto);

    for (const q of quotes) {
      await this.prisma.envio_cotizaciones.create({
        data: {
          id_pedido,
          precio_total: String(q.precioTotal),
          tiempo_entrega_estimado: q.fechaEntregaEstimada ?? null,
          moneda: (q.moneda ?? 'USD') as Moneda,
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
