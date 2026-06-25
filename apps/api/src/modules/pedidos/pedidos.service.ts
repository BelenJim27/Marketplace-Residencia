import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Cron } from '@nestjs/schedule';
import { Moneda, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { ComisionesService } from "../comisiones/comisiones.service";
import { EmailService } from "../email/email.service";
import { FacturaPdfData, FacturaPdfService } from "../email/factura-pdf.service";
import { SkydropxService } from "../envios/skydropx.service";
import { LotesService } from "../lotes/lotes.service";
import { PaypalService } from "../pagos/paypal.service";
import { StripeService } from "../pagos/stripe.service";
import { serializeBigInts, toBigIntId } from "../../common/utilities/serialize";
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import {
  CreateDetallePedidoDto,
  CreateFacturaDto,
  CreatePedidoDto,
  UpdateDetallePedidoDto,
  UpdatePedidoDto,
  ValidarEnvioDto,
} from "./dto/pedidos.dto";

type Periodo = "week" | "month" | "year";

@Injectable()
export class PedidosService {
  private readonly logger = new Logger(PedidosService.name);

  // Cache en memoria para getEstadisticas: evita recomputar analytics
  // si el mismo productor consulta con el mismo periodo repetidamente
  // (ej: dashboard con VentasChart + ProductosChart en paralelo).
  private static readonly ESTADISTICAS_CACHE_TTL_MS = 15_000; // 15 segundos
  private estadisticasCache = new Map<string, { data: unknown; expires: number }>();

  private getEstadisticasCacheKey(periodo: string, id_productor?: number | null): string {
    return `${periodo}_${id_productor ?? 'null'}`;
  }

  private invalidateEstadisticasCache() {
    this.estadisticasCache.clear();
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly comisionesService: ComisionesService,
    private readonly emailService: EmailService,
    private readonly facturaPdfService: FacturaPdfService,
    private readonly skydropxService: SkydropxService,
    private readonly stripeService: StripeService,
    private readonly paypalService: PaypalService,
    private readonly lotesService: LotesService,
  ) {}
  async findAll(query: PaginacionQueryDto = {}) {
    const pagina = query.pagina ?? 1;
    const limite = query.limite ?? 20;
    const skip = (pagina - 1) * limite;
    const include = {
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
      usuarios: true,
    };
    const [items, total] = await Promise.all([
      this.prisma.pedidos.findMany({ include, orderBy: { fecha_creacion: 'desc' }, take: limite, skip }),
      this.prisma.pedidos.count(),
    ]);
    return serializeBigInts({ items, paginacion: { pagina, limite, total, paginas: Math.ceil(total / limite) } });
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
        envios: {
          include: {
            transportistas: true,
            envio_guias: {
              where: { eliminado_en: null },
              orderBy: { fecha_creacion: 'desc' },
              take: 1,
            },
          },
        },
        usuarios: true,
        pedido_productor: {
          include: {
            productores: { select: { nombre_marca: true, razon_social: true } },
          },
        },
      },
    });
    if (!item || item.eliminado_en)
      throw new NotFoundException("Pedido no encontrado");
    return serializeBigInts(item);
  }

  async getIdProductorByUserId(id_usuario: string): Promise<number | null> {
    const productor = await this.prisma.productores.findUnique({
      where: { id_usuario },
      select: { id_productor: true },
    });
    return productor?.id_productor ?? null;
  }

  // IDOR-safe: confirms the user owns a specific id_productor via direct join check
  async verifyProductorOwnership(id_usuario: string, id_productor: number): Promise<boolean> {
    const p = await this.prisma.productores.findFirst({
      where: { id_productor, id_usuario },
      select: { id_productor: true },
    });
    return p != null;
  }

  async getMisVentas(id_productor: number | null) {
    if (!id_productor) {
      return {
        resumen: { totalVentas: 0, ingresosTotales: 0 },
        ventas: [],
      };
    }

    const pedidos = await this.findPedidosByProductor(id_productor);
    // El resumen solo considera ventas efectivamente pagadas; la lista `ventas`
    // (tabla detallada) se mantiene completa para que el productor siga viendo
    // pedidos pendientes/cancelados con su estado en el frontend.
    const pedidosPagados = pedidos.filter((pedido) =>
      esVentaPagada(pedido.estado),
    );
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

    const ventasPagadas = ventas.filter((v) => esVentaPagada(v.status));

    return serializeBigInts({
      resumen: {
        totalVentas: pedidosPagados.length,
        ingresosTotales: Number(
          ventasPagadas.reduce((sum, v) => sum + v.total, 0).toFixed(2),
        ),
      },
      ventas,
    });
  }

  async getEstadisticas(
    periodoRaw: string,
    id_productor?: number | null,
  ) {
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
          comisiones: 0,
          neto: 0,
        },
        ventas: buckets.map((bucket) => ({ x: bucket.label, y: 0 })),
        productos: [],
        rawRows: [],
      };
    }

    const periodo = normalizePeriodo(periodoRaw);
    const cacheKey = this.getEstadisticasCacheKey(periodo, id_productor);
    const cached = this.estadisticasCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const { start, bucketSize, formatBucketLabel } = getRangeConfig(periodo);

    const pedidos = await this.findPedidosByProductorLight(
      id_productor,
      start,
    );

    // Solo ventas efectivamente pagadas alimentan métricas, gráfica y top de productos.
    const pedidosPagados = pedidos.filter((pedido) =>
      esVentaPagada(pedido.estado),
    );

    const rawRows = pedidosPagados.flatMap((pedido) =>
      pedido.detalle_pedido
        .filter((d) => {
          const prod = d.productos;
          return (
            prod?.tiendas?.id_productor === id_productor ||
            prod?.lotes?.id_productor === id_productor
          );
        })
        .map((detalle) => {
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

    // Comisiones y neto del productor desde pedido_productor
    const netoResult = await this.prisma.pedido_productor.aggregate({
      where: {
        id_productor,
        pedidos: {
          estado: { in: ESTADOS_VENTA_PAGADA },
          eliminado_en: null,
          fecha_creacion: { gte: start },
        },
      },
      _sum: {
        comision_marketplace: true,
        monto_neto_productor: true,
      },
    });

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

    const result = {
      periodo,
      resumen: {
        pedidos: pedidosPagados.length,
        productosVendidos: rawRows.reduce((sum, row) => sum + row.cantidad, 0),
        ingresos: Number(
          rawRows.reduce((sum, row) => sum + row.monto, 0).toFixed(2),
        ),
        comisiones: Number(netoResult._sum.comision_marketplace ?? 0),
        neto: Number(netoResult._sum.monto_neto_productor ?? 0),
      },
      ventas,
      productos,
      rawRows,
    };

    // Guardar en caché antes de retornar
    this.estadisticasCache.set(cacheKey, {
      data: result,
      expires: Date.now() + PedidosService.ESTADISTICAS_CACHE_TTL_MS,
    });

    return result;
  }
  async create(dto: CreatePedidoDto, id_usuario: string) {
    // El pedido siempre se crea a nombre del usuario autenticado (del token),
    // nunca del id_usuario que venga en el body — evita crear pedidos a nombre de otro.
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
        id_usuario,
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
  /**
   * Verifica que el pedido pertenezca al usuario (o que sea admin). Evita BOLA:
   * sin esto, cualquier usuario autenticado podía mutar pedidos ajenos por id.
   */
  private async assertPedidoOwner(id_pedido: bigint, id_usuario: string, isAdmin: boolean) {
    if (isAdmin) return;
    const pedido = await this.prisma.pedidos.findUnique({
      where: { id_pedido },
      select: { id_usuario: true },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (pedido.id_usuario !== id_usuario) {
      throw new ForbiddenException('No tienes permiso sobre este pedido');
    }
  }

  // Transiciones válidas del pedido maestro. Solo se aplican en el endpoint manual
  // PATCH /pedidos/:id; la automatización interna (pagos/envíos) escribe `estado`
  // vía prisma.pedidos.update directo y no pasa por aquí.
  private static readonly TRANSICIONES_PEDIDO: Record<string, string[]> = {
    pendiente: ['pagado', 'cancelado'],
    pagado: ['label_purchased', 'enviado', 'cancelado'],
    label_purchased: ['enviado', 'cancelado'],
    enviado: ['entregado', 'cancelado'],
    entregado: [],
    cancelado: [],
  };

  async update(id: string, dto: UpdatePedidoDto, id_usuario: string, isAdmin: boolean) {
    const id_pedido = toBigIntId(id);
    let estadoActual: string | null = null;

    // Una sola lectura cubre el owner-check (anti-BOLA) y la validación de
    // transición de estado. Antes eran 2 round-trips para no-admins que cambian
    // estado (assertPedidoOwner + lectura de estado).
    if (!isAdmin || dto.estado) {
      const actual = await this.prisma.pedidos.findUnique({
        where: { id_pedido },
        select: { id_usuario: true, estado: true },
      });
      if (!actual) throw new NotFoundException('Pedido no encontrado');
      estadoActual = actual.estado;
      if (!isAdmin && actual.id_usuario !== id_usuario) {
        throw new ForbiddenException('No tienes permiso sobre este pedido');
      }
      if (dto.estado) {
        const nuevoEstado = dto.estado.trim();
        const estadoBase = actual.estado ?? 'pendiente';
        if (nuevoEstado !== estadoBase) {
          const permitidas = PedidosService.TRANSICIONES_PEDIDO[estadoBase] ?? [];
          if (!permitidas.includes(nuevoEstado)) {
            throw new BadRequestException(
              `Transición de estado inválida: ${estadoBase} → ${nuevoEstado}.`,
            );
          }
          // Anti-fraude: un pedido sólo puede marcarse 'pagado' si existe un pago
          // realmente completado. El camino legítimo es el webhook de Stripe/PayPal;
          // ni siquiera un admin debe poder marcar pagado sin cobro real.
          if (nuevoEstado === 'pagado') {
            const pagoOk = await this.prisma.pagos.findFirst({
              where: { id_pedido, estado: 'completado' },
              select: { id_pago: true },
            });
            if (!pagoOk) {
              throw new BadRequestException(
                'No se puede marcar el pedido como pagado: no existe un pago completado asociado.',
              );
            }
          }
        }
      }
    }

    const pedidoData = {
      id_usuario: dto.id_usuario,
      estado: dto.estado?.trim(),
      total: dto.total,
      moneda: dto.moneda,
      tipo_cambio: dto.tipo_cambio,
      moneda_referencia: dto.moneda_referencia?.trim() as Moneda | undefined,
      pais_destino_iso2: dto.pais_destino_iso2,
      direccion_envio_snapshot: dto.direccion_envio_snapshot as any | undefined,
      direccion_facturacion_snapshot: dto.direccion_facturacion_snapshot as any | undefined,
      devolucion_estado: dto.devolucion_estado,
      devolucion_motivo: dto.devolucion_motivo,
    };

    // Cancelación manual: restaurar stock en la misma transacción para evitar
    // inventario bloqueado permanentemente. Solo aplica cuando realmente se cambia
    // a 'cancelado' (no si ya estaba cancelado).
    const esCancelacionNueva = dto.estado?.trim() === 'cancelado' && estadoActual !== 'cancelado';

    if (esCancelacionNueva) {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.pedidos.update({ where: { id_pedido }, data: pedidoData });

        await tx.pedido_productor.updateMany({
          where: { id_pedido },
          data: { estado: 'cancelado' },
        });

        const detalles = await tx.detalle_pedido.findMany({
          where: { id_pedido },
          select: { id_producto: true, cantidad: true, id_inventario: true },
        });

        for (const detalle of detalles) {
          const inv = detalle.id_inventario
            ? await tx.inventario.findUnique({
                where: { id_inventario: detalle.id_inventario },
                select: { id_inventario: true, stock: true },
              })
            : await tx.inventario.findFirst({
                where: { id_producto: detalle.id_producto },
                select: { id_inventario: true, stock: true },
              });
          if (inv) {
            const restaurar = Number(detalle.cantidad);
            await tx.inventario.update({
              where: { id_inventario: inv.id_inventario },
              data: { stock: { increment: restaurar } },
            });
            const prodLote = await tx.productos.findUnique({
              where: { id_producto: detalle.id_producto },
              select: { id_lote: true },
            });
            if (prodLote?.id_lote) {
              await this.lotesService.softDeleteEmptyLote(prodLote.id_lote, tx);
            }
            await tx.movimientos_inventario.create({
              data: {
                id_inventario: inv.id_inventario,
                id_pedido,
                tipo: 'cancelacion',
                cantidad: restaurar,
                stock_resultante: Number(inv.stock) + restaurar,
                motivo: `Pedido ${id_pedido} cancelado manualmente`,
              },
            });
          }
        }

        await tx.auditoria.create({
          data: {
            accion: 'actualizar_pedido',
            tabla_afectada: 'pedidos',
            registro_id: String(id_pedido),
            valor_nuevo: { estado: updated.estado, total: Number(updated.total), moneda: updated.moneda } as any,
          },
        });

        return serializeBigInts(updated);
      });
    }

    const updated = await this.prisma.pedidos.update({ where: { id_pedido }, data: pedidoData });

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
  async remove(id: string, id_usuario: string, isAdmin: boolean) {
    const id_pedido = toBigIntId(id);
    await this.assertPedidoOwner(id_pedido, id_usuario, isAdmin);
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
  async addDetalle(id: string, dto: CreateDetallePedidoDto, id_usuario: string, isAdmin: boolean) {
    const id_pedido = toBigIntId(id);
    await this.assertPedidoOwner(id_pedido, id_usuario, isAdmin);
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

    // La idempotencia (findFirst → create/update) no es atómica entre llamadas
    // concurrentes para el mismo (id_pedido, id_producto): ambas pueden ver `null` en el
    // findFirst y ambas intentar `create`, y la segunda viola el unique
    // `uq_detalle_pedido_producto` (Prisma P2002). Esto ocurre típicamente por el doble
    // disparo de efectos de React StrictMode en dev o por un reintento del cliente, y antes
    // se propagaba como un 500 que dejaba el checkout colgado. La unicidad real la garantiza
    // la BD; aquí reintentamos una vez: en el reintento el findFirst SÍ encuentra la fila que
    // creó la llamada ganadora y tomamos el camino de ajuste por delta (no-op si la cantidad
    // coincide, como en el checkout).
    const ejecutarTransaccion = () => this.prisma.$transaction(
      async (tx) => {
        const inventario = await tx.inventario.findFirst({
          where: { id_producto },
        });
        if (!inventario) {
          throw new NotFoundException(
            `No hay inventario registrado para el producto ${dto.id_producto}`,
          );
        }

        const nuevaCantidad = Number(dto.cantidad);

        // Idempotencia: si el producto ya está en el pedido, ajustamos por delta en
        // lugar de crear otra línea. Así un doble-click con el mismo payload (delta=0)
        // no duplica la línea ni vuelve a descontar stock. La unicidad real la garantiza
        // el @@unique([id_pedido, id_producto]) a nivel de BD (protege concurrencia).
        const existente = await tx.detalle_pedido.findFirst({
          where: { id_pedido, id_producto },
        });

        let lineaDetalle: any;

        if (existente) {
          const delta = nuevaCantidad - Number(existente.cantidad);

          if (delta > 0) {
            // Decremento atómico condicional sobre el incremento solicitado.
            const upd = await tx.inventario.updateMany({
              where: {
                id_inventario: inventario.id_inventario,
                stock: { gte: delta },
              },
              data: { stock: { decrement: delta } },
            });
            if (upd.count === 0) {
              throw new BadRequestException(
                `Stock insuficiente para el producto ${dto.id_producto}. Disponible: ${inventario.stock}, incremento solicitado: ${delta}.`,
              );
            }
            const prodLoteUp = await tx.productos.findUnique({
              where: { id_producto },
              select: { id_lote: true },
            });
            if (prodLoteUp?.id_lote) {
              await this.lotesService.softDeleteEmptyLote(prodLoteUp.id_lote, tx);
            }
          } else if (delta < 0) {
            await tx.inventario.update({
              where: { id_inventario: inventario.id_inventario },
              data: { stock: { increment: Math.abs(delta) } },
            });
            const prodLoteDown = await tx.productos.findUnique({
              where: { id_producto },
              select: { id_lote: true },
            });
            if (prodLoteDown?.id_lote) {
              await this.lotesService.softDeleteEmptyLote(prodLoteDown.id_lote, tx);
            }
          }

          if (delta !== 0) {
            await tx.movimientos_inventario.create({
              data: {
                id_inventario: inventario.id_inventario,
                id_pedido,
                tipo: 'ajuste_pedido',
                cantidad: Math.abs(delta),
                stock_resultante: Number(inventario.stock) - delta,
                motivo: `Ajuste de cantidad en pedido ${id_pedido} (delta: ${delta})`,
              },
            });
          }

          lineaDetalle = await tx.detalle_pedido.update({
            where: { id_detalle: existente.id_detalle },
            data: {
              cantidad: nuevaCantidad,
              precio_compra: producto.precio_base,
              moneda_compra: (dto.moneda_compra?.trim() ?? 'MXN') as Moneda,
              impuesto: dto.impuesto ?? '0',
              id_productor,
              id_tienda,
              // Lote del que se descontó: permite restaurar al MISMO lote al cancelar.
              id_inventario: inventario.id_inventario,
            },
            include: { productos: { include: { lotes: true } } },
          });
        } else {
          // Camino original: decremento atómico condicional (anti-overselling).
          const upd = await tx.inventario.updateMany({
            where: {
              id_inventario: inventario.id_inventario,
              stock: { gte: nuevaCantidad },
            },
            data: { stock: { decrement: nuevaCantidad } },
          });
          if (upd.count === 0) {
            throw new BadRequestException(
              `Stock insuficiente para el producto ${dto.id_producto}. Disponible: ${inventario.stock}, solicitado: ${nuevaCantidad}.`,
            );
          }

          const prodLote = await tx.productos.findUnique({
            where: { id_producto },
            select: { id_lote: true },
          });
          if (prodLote?.id_lote) {
            await this.lotesService.softDeleteEmptyLote(prodLote.id_lote, tx);
          }

          await tx.movimientos_inventario.create({
            data: {
              id_inventario: inventario.id_inventario,
              id_pedido,
              tipo: 'venta',
              cantidad: nuevaCantidad,
              stock_resultante: Number(inventario.stock) - nuevaCantidad,
              motivo: `Venta en pedido ${id_pedido}`,
            },
          });

          lineaDetalle = await tx.detalle_pedido.create({
            data: {
              id_pedido,
              id_producto,
              id_productor,
              id_tienda,
              cantidad: nuevaCantidad,
              precio_compra: producto.precio_base,
              moneda_compra: (dto.moneda_compra?.trim() ?? 'MXN') as Moneda,
              impuesto: dto.impuesto ?? '0',
              // Lote del que se descontó: permite restaurar al MISMO lote al cancelar.
              id_inventario: inventario.id_inventario,
            },
            include: { productos: { include: { lotes: true } } },
          });
        }

        if (id_productor) {
          await this.upsertPedidoProductorConComision(
            {
              id_pedido,
              id_productor,
              pais_operacion: producto.tiendas?.pais_operacion ?? null,
              moneda_pedido: lineaDetalle.moneda_compra,
            },
            tx,
          );
        }

        await tx.auditoria.create({
          data: {
            accion: existente ? 'actualizar_detalle_pedido' : 'crear_detalle_pedido',
            tabla_afectada: 'detalle_pedido',
            registro_id: String(lineaDetalle.id_detalle),
            valor_nuevo: {
              id_producto: Number(lineaDetalle.id_producto),
              cantidad: Number(lineaDetalle.cantidad),
              precio_compra: Number(lineaDetalle.precio_compra),
            } as any,
          },
        });

        return lineaDetalle;
      },
      {
        timeout: 15000, // Aumentar timeout a 15 segundos para operaciones complejas
      }
    );

    let detalle: any;
    try {
      detalle = await ejecutarTransaccion();
    } catch (err) {
      // P2002 sobre (id_pedido, id_producto): una llamada concurrente ganó la carrera e
      // insertó la línea entre nuestro findFirst y nuestro create. Reintentar una vez para
      // converger al camino idempotente de ajuste por delta.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        (err.meta?.target as string[] | undefined)?.includes('id_producto')
      ) {
        this.logger.warn(
          `[pedidos] Carrera detectada al agregar detalle (pedido ${id_pedido}, producto ${dto.id_producto}); reintentando como ajuste idempotente.`,
        );
        detalle = await ejecutarTransaccion();
      } else {
        throw err;
      }
    }

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
        this.logger.warn(`[pedidos] Failed to create stock_bajo notification: ${err?.message}`);
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

    // Política de reparto (ver memoria feedback_iva_incluido_envio_plataforma):
    // - IVA: incluido en el precio del producto → ya está dentro de subtotal_items_productor.
    //   No se prorratea pedido.tax_amount al productor (evita doble conteo / abonarle IVA recaudado).
    // - Envío: la plataforma compra las guías; el costo de envío se RETIENE en plataforma
    //   y NO se abona al productor. No se prorratea pedido.shipping_amount.
    // El neto del productor = subtotal de SUS productos (IVA dentro) − comisión.
    void subtotal_total_pedido; // se conserva la lectura para futura trazabilidad/auditoría
    const subtotal_bruto = Number(subtotal_items_productor.toFixed(2));

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
      // Sin regla de comisión: aplicar 0% como fallback seguro para no bloquear pedidos.
      // Se recomienda crear una regla global activa en /configuracion/comisiones.
      this.logger.warn(
        `[pedidos] Sin regla de comisión para productor ${args.id_productor} / país ${args.pais_operacion}. Aplicando 0% como fallback. Error: ${err?.message}`,
      );
      comision_marketplace = 0;
      id_comision_aplicada = null;
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
  async updateDetalle(id_detalle: string, id_usuario: string, dto: UpdateDetallePedidoDto) {
    const id_detalle_big = toBigIntId(id_detalle);

    return serializeBigInts(
      await this.prisma.$transaction(
        async (tx) => {
          const detalleExistente = await tx.detalle_pedido.findUnique({
            where: { id_detalle: id_detalle_big },
            include: { pedidos: { select: { id_usuario: true } } },
          });

          if (!detalleExistente)
            throw new NotFoundException('Detalle de pedido no encontrado');

          if (detalleExistente.pedidos.id_usuario !== id_usuario)
            throw new ForbiddenException('No tienes permiso para modificar este detalle de pedido');

          if (dto.cantidad !== undefined && dto.cantidad !== Number(detalleExistente.cantidad)) {
            const delta = dto.cantidad - Number(detalleExistente.cantidad);

            const inv = await tx.inventario.findFirst({
              where: { id_producto: detalleExistente.id_producto },
            });

            if (!inv)
              throw new NotFoundException(`No hay inventario registrado para el producto ${detalleExistente.id_producto}`);

            if (delta > 0) {
              const updateResult = await tx.inventario.updateMany({
                where: { id_inventario: inv.id_inventario, stock: { gte: delta } },
                data: { stock: { decrement: delta } },
              });
              if (updateResult.count === 0)
                throw new BadRequestException(
                  `Stock insuficiente. Disponible: ${inv.stock}, incremento solicitado: ${delta}.`,
                );
              const prodLoteEd = await tx.productos.findUnique({
                where: { id_producto: detalleExistente.id_producto },
                select: { id_lote: true },
              });
              if (prodLoteEd?.id_lote) {
                await this.lotesService.softDeleteEmptyLote(prodLoteEd.id_lote, tx);
              }
            } else {
              await tx.inventario.update({
                where: { id_inventario: inv.id_inventario },
                data: { stock: { increment: Math.abs(delta) } },
              });
              const prodLoteEd = await tx.productos.findUnique({
                where: { id_producto: detalleExistente.id_producto },
                select: { id_lote: true },
              });
              if (prodLoteEd?.id_lote) {
                await this.lotesService.softDeleteEmptyLote(prodLoteEd.id_lote, tx);
              }
            }

            await tx.movimientos_inventario.create({
              data: {
                id_inventario: inv.id_inventario,
                id_pedido: detalleExistente.id_pedido,
                tipo: 'ajuste_pedido',
                cantidad: Math.abs(delta),
                stock_resultante: inv.stock - delta,
                motivo: `Ajuste de cantidad en detalle ${id_detalle_big} (delta: ${delta})`,
              },
            });
          }

          return tx.detalle_pedido.update({
            where: { id_detalle: id_detalle_big },
            data: {
              id_producto: dto.id_producto ? BigInt(dto.id_producto) : undefined,
              cantidad: dto.cantidad,
              precio_compra: dto.precio_compra,
              moneda_compra: dto.moneda_compra?.trim() as Moneda | undefined,
              impuesto: dto.impuesto,
            },
          });
        },
        { timeout: 15000 },
      ),
    );
  }
  async removeDetalle(id_detalle: string, id_usuario: string, isAdmin: boolean) {
    const id_detalle_big = toBigIntId(id_detalle);

    await this.prisma.$transaction(async (tx) => {
      const detalle = await tx.detalle_pedido.findUnique({
        where: { id_detalle: id_detalle_big },
        select: { id_producto: true, cantidad: true, id_pedido: true, id_inventario: true, pedidos: { select: { id_usuario: true } } },
      });

      if (!detalle) throw new NotFoundException('Detalle de pedido no encontrado');

      if (!isAdmin && detalle.pedidos.id_usuario !== id_usuario) {
        throw new ForbiddenException('No tienes permiso para eliminar este detalle de pedido');
      }

      // Restaurar al MISMO lote del que se descontó. Fallback (pedidos previos a la
      // columna id_inventario): el de menor stock del producto.
      const inv = detalle.id_inventario
        ? await tx.inventario.findUnique({ where: { id_inventario: detalle.id_inventario } })
        : await tx.inventario.findFirst({
            where: { id_producto: detalle.id_producto },
            orderBy: { stock: 'asc' },
          });

      if (inv) {
        await tx.inventario.update({
          where: { id_inventario: inv.id_inventario },
          data: { stock: { increment: detalle.cantidad } },
        });
        const prodLoteDel = await tx.productos.findUnique({
          where: { id_producto: detalle.id_producto },
          select: { id_lote: true },
        });
        if (prodLoteDel?.id_lote) {
          await this.lotesService.softDeleteEmptyLote(prodLoteDel.id_lote, tx);
        }
        await tx.movimientos_inventario.create({
          data: {
            id_inventario: inv.id_inventario,
            id_pedido: detalle.id_pedido,
            tipo: 'devolucion',
            cantidad: detalle.cantidad,
            stock_resultante: inv.stock + detalle.cantidad,
            motivo: `Reversa por eliminación de detalle ${id_detalle_big}`,
          },
        });
      }

      await tx.detalle_pedido.delete({ where: { id_detalle: id_detalle_big } });

      await tx.auditoria.create({
        data: {
          accion: 'eliminar_detalle_pedido',
          tabla_afectada: 'detalle_pedido',
          registro_id: String(id_detalle_big),
        },
      });
    });

    return { message: "Detalle eliminado" };
  }
  private static readonly ESTADOS_FACTURABLES = ['pagado', 'label_purchased', 'enviado', 'entregado'];

  private buildFacturaPdfData(pedido: any, factura: any): FacturaPdfData {
    const conceptos = (pedido.detalle_pedido ?? []).map((detalle: any) => ({
      descripcion: detalle.productos?.nombre ?? 'Producto',
      clave: '50202306',
      unidad: 'H87 · Pieza',
      cantidad: Number(detalle.cantidad),
      precioUnitario: Number(detalle.precio_compra),
      descuento: 0,
      importe: Number(detalle.cantidad) * Number(detalle.precio_compra),
      objImpuesto: '02',
    }));

    return {
      serie: 'F',
      folio: String(pedido.id_pedido).padStart(6, '0'),
      fecha: factura.creado_en,
      pedidoId: String(pedido.id_pedido),
      emisor: {
        nombre: 'Marketplace de Mezcal',
        rfc: factura.rfc_emisor ?? '',
        regimen: factura.rfc_emisor ? '601 - General de Ley Personas Morales' : 'Pendiente de timbrado',
        direccion: 'Oaxaca de Juárez, Oaxaca, México',
        cp: '68000',
        lugarExpedicion: '68000',
      },
      receptor: {
        nombre: factura.nombre_razon_social ?? 'Cliente',
        rfc: factura.rfc_receptor ?? 'XAXX010101000',
        regimen: factura.regimen_fiscal ?? '616 - Sin obligaciones fiscales',
        usoCfdi: factura.uso_cfdi ?? 'G03',
        domicilioFiscal: factura.codigo_postal ?? undefined,
      },
      conceptos,
      subtotal: Number(factura.subtotal),
      iva: Number(factura.impuestos_total),
      total: Number(factura.total),
      moneda: factura.moneda ?? pedido.moneda,
      formaPago: '03',
      metodoPago: 'Pago en una sola exhibición',
    };
  }

  async addFactura(id: string, dto: CreateFacturaDto, id_usuario: string, adminFlag: boolean) {
    const id_pedido = toBigIntId(id);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const pedido = await tx.pedidos.findUnique({
          where: { id_pedido },
          select: {
            id_pedido: true,
            id_usuario: true,
            estado: true,
            eliminado_en: true,
            total: true,
            tax_amount: true,
            moneda: true,
            usuarios: { select: { email: true, nombre: true, apellido_paterno: true } },
            pagos: { where: { estado: 'completado' }, select: { id_pago: true }, take: 1 },
            detalle_pedido: {
              select: {
                cantidad: true,
                precio_compra: true,
                productos: { select: { nombre: true } },
              },
            },
          },
        });

        if (!pedido || pedido.eliminado_en) throw new NotFoundException('Pedido no encontrado');
        if (!adminFlag && pedido.id_usuario !== id_usuario) {
          throw new ForbiddenException('No tienes acceso a este pedido');
        }
        if (
          !PedidosService.ESTADOS_FACTURABLES.includes(normalizeEstado(pedido.estado))
          || pedido.pagos.length === 0
        ) {
          throw new BadRequestException('Solo se pueden facturar pedidos con un pago completado y vigente');
        }

        const existente = await tx.facturas.findFirst({
          where: { id_pedido, estado: { not: 'cancelada' } },
          select: { id_factura: true },
        });
        if (existente) {
          throw new ConflictException('El pedido ya tiene una factura activa. Consulta la factura existente.');
        }

        const nombreCliente = dto.nombre_razon_social?.trim()
          || [pedido.usuarios.nombre, pedido.usuarios.apellido_paterno].filter(Boolean).join(' ')
          || 'Cliente';
        const impuestos = pedido.tax_amount;
        const subtotal = pedido.total.minus(impuestos);
        const factura = await tx.facturas.create({
          data: {
            id_pedido,
            rfc_receptor: dto.rfc_receptor?.trim().toUpperCase() ?? null,
            nombre_razon_social: nombreCliente,
            email_factura: dto.email_factura?.trim() || pedido.usuarios.email,
            codigo_postal: dto.codigo_postal ?? null,
            uso_cfdi: dto.uso_cfdi?.trim() ?? null,
            regimen_fiscal: dto.regimen_fiscal?.trim() ?? null,
            subtotal,
            impuestos_total: impuestos,
            total: pedido.total,
            moneda: pedido.moneda,
            estado: 'preliminar',
          },
        });

        return { factura, pedido };
      });

      try {
        const emailDestino = result.factura.email_factura;
        if (emailDestino) {
          const pdfData = this.buildFacturaPdfData(result.pedido, result.factura);
          await this.emailService.sendFacturaEmail(emailDestino, {
            pedidoId: pdfData.pedidoId,
            folio: `${pdfData.serie}-${pdfData.folio}`,
            fecha: pdfData.fecha,
            rfc: pdfData.receptor.rfc,
            nombreRazonSocial: pdfData.receptor.nombre,
            usoCfdi: pdfData.receptor.usoCfdi,
            regimenFiscal: pdfData.receptor.regimen,
            domicilioFiscal: pdfData.receptor.domicilioFiscal,
            conceptos: pdfData.conceptos,
            subtotal: pdfData.subtotal,
            iva: pdfData.iva,
            total: pdfData.total,
            moneda: pdfData.moneda,
            formaPago: pdfData.formaPago,
            metodoPago: pdfData.metodoPago,
          });
        }
      } catch (err: any) {
        this.logger.error(`[pedidos] Error enviando documento preliminar: ${err?.message ?? err}`);
      }

      return serializeBigInts(result.factura);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('El pedido ya tiene una factura activa. Consulta la factura existente.');
      }
      throw error;
    }
  }

  async getFactura(id: string, id_usuario: string, adminFlag: boolean) {
    const pedido = await this.prisma.pedidos.findUnique({
      where: { id_pedido: toBigIntId(id) },
      select: {
        id_usuario: true,
        facturas: {
          where: { estado: { not: 'cancelada' } },
          orderBy: { creado_en: 'desc' },
          take: 1,
        },
      },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (!adminFlag && pedido.id_usuario !== id_usuario) {
      throw new ForbiddenException('No tienes acceso a este pedido');
    }
    const factura = pedido.facturas[0];
    if (!factura) throw new NotFoundException('El pedido todavía no tiene una factura activa');
    return serializeBigInts(factura);
  }

  async getFacturaPdf(id: string, id_usuario: string, adminFlag: boolean): Promise<Buffer> {
    const pedido = await this.prisma.pedidos.findUnique({
      where: { id_pedido: toBigIntId(id) },
      include: {
        usuarios: { select: { email: true, nombre: true, apellido_paterno: true } },
        detalle_pedido: {
          select: {
            cantidad: true,
            precio_compra: true,
            productos: { select: { nombre: true } },
          },
        },
        facturas: {
          where: { estado: { not: 'cancelada' } },
          orderBy: { creado_en: 'desc' },
          take: 1,
        },
      },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (!adminFlag && pedido.id_usuario !== id_usuario) {
      throw new ForbiddenException('No tienes acceso a este pedido');
    }
    const factura = pedido.facturas[0];
    if (!factura) throw new NotFoundException('El pedido todavía no tiene una factura activa');
    return this.facturaPdfService.generate(this.buildFacturaPdfData(pedido, factura));
  }

  async testEmail(to: string) {
    return this.emailService.testEmail(to);
  }

  async getMisCompras(id_usuario: string) {
    const pedidos = await this.prisma.pedidos.findMany({
      where: {
        id_usuario,
        eliminado_en: null,
        // Ocultar abandonos auto-cancelados por el cron expirarPedidosPendientes()
        // (cancelado y nunca cobrado). Los cancelados CON pago completado/reembolsado
        // sí se muestran: son el registro de un reembolso real para el cliente.
        NOT: {
          estado: 'cancelado',
          pagos: { none: { estado: { in: ['completado', 'reembolsado'] } } },
        },
      },
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
        facturas: {
          where: { estado: { not: 'cancelada' } },
          orderBy: { creado_en: 'desc' },
          take: 1,
        },
        envios: true,
      },
      orderBy: { fecha_creacion: "desc" },
    });
    return serializeBigInts(pedidos);
  }

  async getMisPedidosProductor(id_usuario: string, jwtIdProductor?: number | null) {
    const id_productor = jwtIdProductor ?? await this.getIdProductorByUserId(id_usuario);
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
      select: {
        id_pedido: true,
        estado: true,
        creado_en: true,
        id_envio: true,
        subtotal_bruto: true,
        moneda: true,
        pedidos: {
          select: {
            estado: true,
            moneda: true,
            usuarios: { select: { nombre: true, email: true } },
            detalle_pedido: {
              select: {
                id_detalle: true,
                cantidad: true,
                precio_compra: true,
                productos: {
                  select: {
                    nombre: true,
                    lotes: { select: { id_productor: true } },
                    tiendas: { select: { id_productor: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { creado_en: "desc" },
    });

    const belongsToProductor = (d: any) =>
      d.productos?.lotes?.id_productor === id_productor ||
      d.productos?.tiendas?.id_productor === id_productor;

    return serializeBigInts(
      pedidosProductor.map((pp) => {
        const misDetalles = pp.pedidos.detalle_pedido.filter(belongsToProductor);
        return {
          id_pedido: pp.id_pedido,
          estado_productor: pp.estado,
          estado_pedido: pp.pedidos.estado,
          cliente: pp.pedidos.usuarios,
          detalles: misDetalles,
          fecha_creacion: pp.creado_en,
          id_envio: pp.id_envio,
          total_parcial: misDetalles.reduce(
            (sum, d) => sum + Number(d.precio_compra) * Number(d.cantidad),
            0,
          ),
          moneda: pp.pedidos.moneda ?? pp.moneda,
        };
      }),
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
        envios: {
          include: {
            envio_guias: {
              where: { eliminado_en: null },
              take: 1,
              orderBy: { fecha_creacion: 'desc' as const },
              select: { id_guia: true, payload_response: true },
            },
          },
        },
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
                  select: { id_guia: true, payload_response: true },
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

    // Use the envio linked directly via pedido_productor.id_envio (set by crearEnviosPorProductor).
    // Legacy fallback: only for single-producer orders where id_envio was never set
    // (pre-multi-producer data). Multi-producer orders must NEVER fall back to another
    // producer's envio, even if only one guide has been generated so far.
    const ownEnvio = pedidoProductor.envios ?? null;
    const allPedidoEnvios = pedidoProductor.pedidos.envios ?? [];
    let envioData = ownEnvio;
    if (!envioData && allPedidoEnvios.length > 0) {
      const producerCount = await this.prisma.pedido_productor.count({
        where: { id_pedido: toBigIntId(id_pedido) },
      });
      envioData = producerCount === 1 ? (allPedidoEnvios[0] ?? null) : null;
    }
    const guiaPayload = envioData?.envio_guias?.[0]?.payload_response as any;
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

    const tiene_guia = (envioData?.envio_guias?.length ?? 0) > 0 || !!(envioData?.numero_rastreo);

    return serializeBigInts({
      id_pedido: pedidoProductor.id_pedido,
      estado_productor: pedidoProductor.estado,
      pedido: pedidoProductor.pedidos,
      detalles: detallesFiltrados,
      envio: envioData ? { ...envioData, carrier_name, is_alcohol, tiene_guia } : null,
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
        this.logger.error(
          `[pedidos] triggerPayoutForProductor falló para pedido ${id_pedido_big} productor ${id_productor}: ${err?.message}`,
        );
      }
    }

    return serializeBigInts(updated);
  }

  /**
   * Reserva atómicamente el payout de un pedido_productor ANTES de mover dinero.
   * Crea un payout placeholder (estado 'procesando') y marca pedido_productor.id_payout
   * sólo si aún era NULL. El updateMany condicional (where id_payout: null) actúa como
   * lock a nivel de fila en Postgres: si dos procesos compiten (entrega + batch admin,
   * doble webhook de entrega), únicamente uno gana la reserva. Devuelve el id_payout
   * reservado, o null si otro proceso ya lo reclamó (en cuyo caso NO se transfiere).
   */
  private async reservarPayout(args: {
    id_pedido: bigint;
    id_productor: number;
    moneda: Moneda;
    subtotal_bruto: any;
    comision_marketplace: any;
    monto_neto: number;
    proveedor: 'stripe' | 'paypal';
  }): Promise<bigint | null> {
    const today = new Date();
    return this.prisma.$transaction(async (tx) => {
      const placeholder = await tx.payouts.create({
        data: {
          id_productor: args.id_productor,
          moneda: args.moneda,
          monto_bruto: args.subtotal_bruto ?? args.monto_neto ?? 0,
          monto_comision: args.comision_marketplace,
          monto_neto: args.monto_neto ?? 0,
          estado: 'procesando',
          proveedor: args.proveedor,
          periodo_desde: today,
          periodo_hasta: today,
        },
      });

      const claim = await tx.pedido_productor.updateMany({
        where: { id_pedido: args.id_pedido, id_productor: args.id_productor, id_payout: null },
        data: { id_payout: placeholder.id_payout },
      });

      if (claim.count === 0) {
        // Otro proceso ya reservó el payout — revertir placeholder dentro del mismo tx.
        await tx.payouts.delete({ where: { id_payout: placeholder.id_payout } });
        return null;
      }

      return placeholder.id_payout;
    }).catch(() => null);
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

    // Fast-path: si ya hay un payout, no hacer nada (la garantía real es la reserva atómica).
    if (pp.id_payout) {
      this.logger.debug(`[pedidos] Payout ya existe para productor ${id_productor} pedido ${id_pedido}: ${pp.id_payout}`);
      return;
    }

    const monto_neto = pp.monto_neto_productor ? Number(pp.monto_neto_productor) : 0;
    if (monto_neto <= 0) {
      this.logger.warn(`[pedidos] Monto neto no positivo para productor ${id_productor}. Skipping payout.`);
      return;
    }

    // Determine payment provider from the pago record
    const pagoRecord = pp.pedidos?.pagos?.[0];
    const paymentProvider = pagoRecord?.proveedor || 'stripe';

    if (paymentProvider === 'paypal') {
      // PayPal Payouts flow
      if (!pp.productores?.paypal_email) {
        this.logger.warn(`[pedidos] Productor ${id_productor} sin PayPal email. Dinero retenido en plataforma hasta completar configuración.`);
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
          this.logger.warn(`[pedidos] Failed to create notification: ${err?.message}`);
        }
        return;
      }

      // Reserva atómica ANTES de transferir: si otro proceso ya reclamó, abortar sin pagar.
      const reservaId = await this.reservarPayout({
        id_pedido,
        id_productor,
        moneda,
        subtotal_bruto: pp.subtotal_bruto,
        comision_marketplace: pp.comision_marketplace,
        monto_neto,
        proveedor: 'paypal',
      });
      if (reservaId === null) {
        this.logger.debug(`[pedidos] Payout ya reclamado (PayPal) para productor ${id_productor} pedido ${id_pedido}. Abortando para evitar doble transferencia.`);
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
          if (!tasa) {
            throw new InternalServerErrorException(
              `No hay tasa de cambio ${moneda}→USD vigente. Configurar en la tabla tasas_cambio antes de procesar payouts.`,
            );
          }
          amountUSD = monto_neto / Number(tasa.tasa);
        }
        amountUSD = parseFloat(amountUSD.toFixed(2));

        const payoutResult = await this.paypalService.createPayout({
          paypalEmail: pp.productores.paypal_email,
          amountUSD,
          referenceId: `pedido-${id_pedido}-prod-${id_productor}`,
          // senderBatchId determinista por (pedido,productor): PayPal deduplica si un
          // reintento (cron) reenvía el mismo batch tras un crash a mitad de transferencia.
          senderBatchId: `payout-pp-${id_pedido}-prod-${id_productor}`,
        });

        await this.prisma.payouts.update({
          where: { id_payout: reservaId },
          data: {
            estado: 'procesado',
            referencia_externa: payoutResult.batchId,
            procesado_en: new Date(),
            ultimo_error: null,
          },
        });

        this.logger.log(`[pedidos] PayPal Payout creado al confirmar entrega. Productor ${id_productor}, Batch: ${payoutResult.batchId}`);
      } catch (error: any) {
        this.logger.error(`[pedidos] Error al crear PayPal payout post-entrega para productor ${id_productor}: ${error?.message}`);
        await this.prisma.payouts.update({
          where: { id_payout: reservaId },
          data: {
            estado: 'fallido',
            intentos: 1,
            ultimo_error: error?.message?.slice(0, 500),
            proximo_reintento: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
        throw error;
      }
    } else {
      // Stripe Connect flow
      if (!pp.productores?.stripe_account_id || !pp.productores.stripe_onboarding_completed) {
        this.logger.warn(`[pedidos] Productor ${id_productor} sin onboarding Stripe. Dinero retenido en plataforma hasta completar configuración.`);
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
          this.logger.warn(`[pedidos] Failed to create notification: ${err?.message}`);
        }
        return;
      }

      // Validar disputas abiertas antes de ejecutar el transfer
      const paymentIntent = pagoRecord?.payment_intent_id;
      if (paymentIntent) {
        try {
          const openDisputes = await this.stripeService.countOpenDisputesForPaymentIntent(paymentIntent);
          if (openDisputes > 0) {
            this.logger.warn(`[pedidos] Disputa(s) abierta(s) detectada(s) (${openDisputes}) para pedido ${id_pedido}. Reteniendo pago hasta resolución.`);
            return;
          }
        } catch (err: any) {
          this.logger.error(`[pedidos] Error checking disputes, skipping transfer: ${err?.message}`);
          return;
        }
      }

      const montoNetoCents = monto_neto ? Math.round(monto_neto * 100) : 0;
      if (montoNetoCents <= 0) {
        this.logger.warn(`[pedidos] Monto neto no positivo para productor ${id_productor}. Skipping transfer.`);
        return;
      }

      // Reserva atómica ANTES de transferir: si otro proceso ya reclamó, abortar sin pagar.
      const reservaId = await this.reservarPayout({
        id_pedido,
        id_productor,
        moneda,
        subtotal_bruto: pp.subtotal_bruto,
        comision_marketplace: pp.comision_marketplace,
        monto_neto,
        proveedor: 'stripe',
      });
      if (reservaId === null) {
        this.logger.debug(`[pedidos] Payout ya reclamado (Stripe) para productor ${id_productor} pedido ${id_pedido}. Abortando para evitar doble transferencia.`);
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

        await this.prisma.payouts.update({
          where: { id_payout: reservaId },
          data: {
            estado: 'procesado',
            referencia_externa: transfer.id,
            procesado_en: new Date(),
            ultimo_error: null,
          },
        });

        this.logger.log(`[pedidos] Payout creado al confirmar entrega. Productor ${id_productor}, Transfer: ${transfer.id}`);
      } catch (error: any) {
        this.logger.error(`[pedidos] Error al crear transfer post-entrega para productor ${id_productor}: ${error?.message}`);
        await this.prisma.payouts.update({
          where: { id_payout: reservaId },
          data: {
            estado: 'fallido',
            intentos: 1,
            ultimo_error: error?.message?.slice(0, 500),
            proximo_reintento: new Date(Date.now() + 15 * 60 * 1000),
          },
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
      include: { envios: true },
    });

    if (!pedidoProductor)
      throw new NotFoundException("Pedido no encontrado para este productor");

    if (!pedidoProductor.id_envio || !pedidoProductor.envios)
      throw new NotFoundException("No hay envío registrado para este productor en este pedido");

    const updated = await this.prisma.envios.update({
      where: { id_envio: pedidoProductor.id_envio },
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

  /**
   * Versión ligera de findPedidosByProductor para analytics.
   * Usa `select` en vez de `include` para evitar traer columnas
   * innecesarias de relaciones (lotes, tiendas, etc.).
   */
  private findPedidosByProductorLight(
    id_productor: number,
    start?: Date,
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
      select: {
        id_pedido: true,
        estado: true,
        fecha_creacion: true,
        detalle_pedido: {
          where: relationWhere,
          select: {
            id_detalle: true,
            cantidad: true,
            precio_compra: true,
            productos: {
              select: {
                nombre: true,
                tiendas: {
                  select: { id_productor: true, nombre: true },
                },
                lotes: {
                  select: { id_productor: true },
                },
              },
            },
          },
        },
      },
      orderBy: { fecha_creacion: "asc" },
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

  @Cron('0 */30 * * * *')
  async expirarPedidosPendientes() {
    // Ventana de 30 min: si el pago no se confirma, liberamos el stock reservado
    // rápido en vez de bloquearlo 2 h (hallazgo #13).
    const hace30Min = new Date(Date.now() - 30 * 60 * 1000);
    const zombies = await this.prisma.pedidos.findMany({
      where: {
        estado: 'pendiente',
        fecha_creacion: { lt: hace30Min },
        eliminado_en: null,
        // Protección contra webhooks perdidos/tardíos: NO cancelar un pedido
        // que ya tenga un pago cobrado. Si el cobro se realizó pero el webhook
        // que lo marca como 'pagado' falló o llegó tarde, el pedido sigue
        // 'pendiente' y antes era cancelado por error (falso positivo).
        pagos: {
          none: { estado: { in: ['completado', 'reembolsado'] } },
        },
      },
      include: {
        detalle_pedido: {
          select: { id_producto: true, cantidad: true, id_detalle: true, id_inventario: true },
        },
      },
    });

    if (zombies.length === 0) return;

    this.logger.log(`[pedidos] Expirando ${zombies.length} pedido(s) pendiente(s) sin pago confirmado`);

    for (const pedido of zombies) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Anti-race: marca cancelado SOLO si sigue 'pendiente'. Si un webhook
          // de pago corrió entre el findMany y este commit y ya avanzó el pedido
          // a 'pagado', count=0 y abortamos sin restaurar stock ni cancelar.
          const marcado = await tx.pedidos.updateMany({
            where: { id_pedido: pedido.id_pedido, estado: 'pendiente' },
            data: { estado: 'cancelado' },
          });
          if (marcado.count === 0) {
            this.logger.warn(
              `[pedidos] Expiración omitida para pedido ${pedido.id_pedido}: estado cambió antes del commit`,
            );
            return;
          }
          // Sincronizar pedido_productor para que el productor vea el pedido
          // expirado como cancelado en su panel, no como pendiente.
          await tx.pedido_productor.updateMany({
            where: { id_pedido: pedido.id_pedido },
            data: { estado: 'cancelado' },
          });
          for (const detalle of pedido.detalle_pedido) {
            // Restaurar al MISMO lote descontado; fallback para pedidos antiguos.
            const inv = detalle.id_inventario
              ? await tx.inventario.findUnique({
                  where: { id_inventario: detalle.id_inventario },
                  select: { id_inventario: true, stock: true },
                })
              : await tx.inventario.findFirst({
                  where: { id_producto: detalle.id_producto },
                  select: { id_inventario: true, stock: true },
                });
            if (inv) {
              const restaurar = Number(detalle.cantidad);
              await tx.inventario.update({
                where: { id_inventario: inv.id_inventario },
                data: { stock: { increment: restaurar } },
              });
              const prodLoteExp = await tx.productos.findUnique({
                where: { id_producto: detalle.id_producto },
                select: { id_lote: true },
              });
              if (prodLoteExp?.id_lote) {
                await this.lotesService.softDeleteEmptyLote(prodLoteExp.id_lote, tx);
              }
              await tx.movimientos_inventario.create({
                data: {
                  id_inventario: inv.id_inventario,
                  id_pedido: pedido.id_pedido,
                  tipo: 'cancelacion',
                  cantidad: restaurar,
                  stock_resultante: Number(inv.stock) + restaurar,
                  motivo: `Pedido ${pedido.id_pedido} expiró sin pago`,
                },
              });
            }
          }
          await tx.auditoria.create({
            data: {
              accion: 'expirar_pedido_sin_pago',
              tabla_afectada: 'pedidos',
              registro_id: String(pedido.id_pedido),
              valor_nuevo: { estado: 'cancelado', motivo: 'Sin pago confirmado en 30 minutos' } as any,
            },
          });
        });
      } catch (err: any) {
        this.logger.error(`[pedidos] Error al expirar pedido ${pedido.id_pedido}: ${err?.message}`);
      }
    }
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

// Estados que representan una venta efectivamente pagada (lista blanca).
// Excluye automáticamente pendiente, cancelado y cualquier otro estado que
// no represente una venta completada.
const ESTADOS_VENTA_PAGADA = ['pagado', 'label_purchased', 'enviado', 'entregado'];

function esVentaPagada(estado: string) {
  return ESTADOS_VENTA_PAGADA.includes(normalizeEstado(estado));
}
