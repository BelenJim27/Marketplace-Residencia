import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Moneda } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { serializeBigInts, toBigIntId } from "../shared/serialize";
import { CreateEnvioDto, CotizarEnvioDto, DireccionDestinoDto, UpdateEnvioDto } from "./dto/envios.dto";
import { ICarrierService } from "./interfaces/carrier.interface";
import { SkydropxService } from "./skydropx.service";

@Injectable()
export class EnviosService {
  private readonly logger = new Logger(EnviosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly skydropxService: SkydropxService,
  ) {}

  private async toUsd(precio: any, moneda: string): Promise<number> {
    const p = Number(precio ?? 0);
    if (moneda === 'USD') return p;
    const tasa = await this.prisma.tasas_cambio.findFirst({
      where: {
        moneda_origen: 'MXN' as Moneda,
        moneda_destino: 'USD' as Moneda,
        vigente_desde: { lte: new Date() },
        OR: [{ vigente_hasta: null }, { vigente_hasta: { gte: new Date() } }],
      },
      orderBy: { vigente_desde: 'desc' },
    });
    if (!tasa) {
      throw new InternalServerErrorException(
        'No hay tasa de cambio MXN→USD vigente. Configurar en la tabla tasas_cambio.',
      );
    }
    return p / Number(tasa.tasa);
  }

  private selectCarrier(_codigo?: string): ICarrierService {
    return this.skydropxService;
  }
  async findAll(query: PaginacionQueryDto = {}) {
    const pagina = query.pagina ?? 1;
    const limite = query.limite ?? 20;
    const skip = (pagina - 1) * limite;
    const include = { pedidos: true, transportistas: true, servicios_envio: true, envio_guias: true };
    const [items, total] = await Promise.all([
      this.prisma.envios.findMany({ include, orderBy: { id_envio: 'desc' }, take: limite, skip }),
      this.prisma.envios.count(),
    ]);
    return serializeBigInts({ items, paginacion: { pagina, limite, total, paginas: Math.ceil(total / limite) } });
  }
  async findOne(id: string) {
    const item = await this.prisma.envios.findUnique({
      where: { id_envio: toBigIntId(id) },
      include: {
        pedidos: true,
        transportistas: true,
        servicios_envio: true,
        envio_guias: true,
      },
    });
    if (!item) throw new NotFoundException("Envio no encontrado");
    return serializeBigInts(item);
  }
  async create(dto: CreateEnvioDto) {
    const requires_adult_signature = await this.detectarFirmaAdulto(
      dto.id_pedido,
    );

    // 1. Inicializamos con lo que viene en el DTO
    let id_transportista = dto.id_transportista ?? null;
    let id_servicio = dto.id_servicio ?? null;

    // 2. Si no hay ID pero hay código de transportista, lo buscamos
    if (!id_transportista && dto.transportista_codigo) {
      const t = await this.prisma.transportistas.findUnique({
        where: { codigo: dto.transportista_codigo.toUpperCase() },
      });
      id_transportista = t?.id_transportista ?? null;
    }

    // 3. Si no hay ID de servicio pero tenemos transportista y código de servicio, lo buscamos
    if (!id_servicio && id_transportista && dto.codigo_servicio) {
      const s = await this.prisma.servicios_envio.findUnique({
        where: {
          id_transportista_codigo_servicio: {
            id_transportista,
            codigo_servicio: dto.codigo_servicio,
          },
        },
      });
      id_servicio = s?.id_servicio ?? null;
    }

    // 4. Creamos el registro usando las variables resueltas arriba.
    // costo_envio se almacena como null en este registro preliminar: el valor
    // real lo establece crearGuia() con el costo devuelto por el carrier.
    return serializeBigInts(
      await this.prisma.envios.create({
        data: {
          id_pedido: toBigIntId(dto.id_pedido),
          id_transportista, // Usamos la variable local resuelta
          id_servicio,      // Usamos la variable local resuelta
          numero_rastreo: dto.numero_rastreo ?? null,
          valor_declarado_aduana: dto.valor_declarado_aduana ?? null,
          moneda_aduana: (dto.moneda_aduana?.trim() ?? "MXN") as Moneda,
          codigo_hs: dto.codigo_hs ?? null,
          peso_kg: dto.peso_kg ?? null,
          alto_cm: dto.alto_cm ?? null,
          ancho_cm: dto.ancho_cm ?? null,
          largo_cm: dto.largo_cm ?? null,
          costo_envio: null,
          moneda_costo: (dto.moneda_costo?.trim() ?? "MXN") as Moneda,
          estado: dto.estado?.trim() ?? "preparando",
          requires_adult_signature,
          fecha_envio: dto.fecha_envio ? new Date(dto.fecha_envio) : null,
          fecha_entrega_estimada: dto.fecha_entrega_estimada
            ? new Date(dto.fecha_entrega_estimada)
            : null,
          fecha_entrega: dto.fecha_entrega ? new Date(dto.fecha_entrega) : null,
        },
      }),
    );
  }
  private async detectarFirmaAdulto(id_pedido: number): Promise<boolean> {
    const detalles = await this.prisma.detalle_pedido.findMany({
      where: { id_pedido: BigInt(id_pedido) },
      select: {
        productos: {
          select: {
            requiere_firma_adulto: true,
            requiere_edad_minima: true,
          },
        },
      },
    });
    return detalles.some((d) => {
      const requiereFirma = d.productos?.requiere_firma_adulto === true;
      const esAlcohol = (d.productos?.requiere_edad_minima ?? 0) >= 18;
      return requiereFirma || esAlcohol;
    });
  }
  async update(id: string, dto: UpdateEnvioDto) {
    return serializeBigInts(
      await this.prisma.envios.update({
        where: { id_envio: toBigIntId(id) },
        data: {
          id_pedido: dto.id_pedido ? toBigIntId(dto.id_pedido) : undefined,
          id_transportista: dto.id_transportista,
          id_servicio: dto.id_servicio,
          numero_rastreo: dto.numero_rastreo,
          valor_declarado_aduana: dto.valor_declarado_aduana,
          moneda_aduana: dto.moneda_aduana?.trim() as Moneda | undefined,
          codigo_hs: dto.codigo_hs,
          peso_kg: dto.peso_kg,
          alto_cm: dto.alto_cm,
          ancho_cm: dto.ancho_cm,
          largo_cm: dto.largo_cm,
          costo_envio: dto.costo_envio,
          moneda_costo: dto.moneda_costo?.trim() as Moneda | undefined,
          estado: dto.estado?.trim(),
          fecha_envio: dto.fecha_envio ? new Date(dto.fecha_envio) : undefined,
          fecha_entrega_estimada: dto.fecha_entrega_estimada
            ? new Date(dto.fecha_entrega_estimada)
            : undefined,
          fecha_entrega: dto.fecha_entrega
            ? new Date(dto.fecha_entrega)
            : undefined,
        },
      }),
    );
  }
  async remove(id: string) {
    await this.prisma.envios.delete({ where: { id_envio: toBigIntId(id) } });
    return { message: "Envio eliminado" };
  }

  async guardarCotizacion(idPedido: number, payload: any) {
    const addHours = (date: Date, hours: number) =>
      new Date(date.getTime() + hours * 3600000);
    return serializeBigInts(
      await this.prisma.envio_cotizaciones.create({
        data: {
          id_pedido: toBigIntId(idPedido),
          payload_request: payload.request ?? {},
          payload_response: payload.response ?? null,
          precio_total: payload.precioTotal,
          tiempo_entrega_estimado: payload.fechaEntregaEstimada,
          moneda: payload.response?.moneda ?? null,
          valida_hasta: addHours(new Date(), 4),
        },
      }),
    );
  }

  async getTracking(id_envio: string) {
    const envio = await this.prisma.envios.findUnique({
      where: { id_envio: toBigIntId(id_envio) },
      include: {
        transportistas: { select: { codigo: true } },
        envio_guias: {
          include: { envio_eventos: { orderBy: { fecha_evento: "asc" } } },
        },
      },
    });

    if (!envio) throw new NotFoundException("Envío no encontrado");

    let eventos: any[] = [];
    if (envio.numero_rastreo) {
      try {
        const carrier = this.selectCarrier(envio.transportistas?.codigo ?? undefined);
        const payloadResp = (envio.envio_guias?.[0] as any)?.payload_response as Record<string, any> | null;
        const carrierEventos = await carrier.getTracking(
          envio.numero_rastreo,
          payloadResp ? { carrierName: payloadResp.carrierName } : undefined,
        );
        if (carrierEventos && carrierEventos.length > 0) {
          eventos = carrierEventos;
        }
      } catch {
        // Fall back to DB events
      }
    }

    // If no carrier events, try to get from database guía events
    if (eventos.length === 0) {
      const guiaEventos = envio.envio_guias?.[0]?.envio_eventos || [];
      if (guiaEventos.length > 0) {
        eventos = guiaEventos.map((e: any) => ({
          descripcion: e.descripcion,
          estado: e.estado_normalizado || e.estado_paqueteria,
          fecha: e.fecha_evento,
          ubicacion: e.ubicacion,
        }));
      }
    }

    return serializeBigInts({
      numero_rastreo: envio.numero_rastreo,
      estado_actual: envio.estado,
      fecha_entrega_estimada: envio.fecha_entrega_estimada,
      fecha_entrega_real: envio.fecha_entrega,
      eventos: eventos.map((e: any) => ({
        descripcion: e.descripcion,
        // Siempre normalizar para que el frontend reciba estados consistentes
        estado: this.normalizarEstado(e.estado ?? '') ?? e.estado,
        fecha: e.fecha,
        ubicacion: e.ubicacion,
      })),
    });
  }

  async crearGuia(id_envio: string) {
    const envio = await this.prisma.envios.findUnique({
      where: { id_envio: toBigIntId(id_envio) },
      include: {
        pedidos: {
          select: { direccion_envio_snapshot: true, total: true, moneda: true },
        },
        servicios_envio: true,
        transportistas: true,
        envio_guias: { where: { eliminado_en: null } },
      },
    });

    if (!envio) throw new NotFoundException('Envío no encontrado');
    if (envio.envio_guias?.length > 0) throw new ConflictException('GUIA_YA_EXISTE');
    if (!envio.pedidos?.direccion_envio_snapshot) throw new UnprocessableEntityException('SIN_DIRECCION');

    const snap = envio.pedidos.direccion_envio_snapshot as any;
    const destPais = snap.pais_iso2 ?? snap.pais ?? 'MX';
    const destEstado = snap.estado || '';

    const detalles = await this.prisma.detalle_pedido.findMany({
      where: { id_pedido: envio.id_pedido },
      include: {
        productos: {
          select: {
            nombre: true,
            requiere_edad_minima: true,
            categorias_productos: {
              select: {
                id_categoria: true,
                categorias: { select: { codigo_hs_default: true } },
              },
            },
          },
        },
      },
    });

    for (const detalle of detalles) {
      const prod = detalle.productos;
      if (!prod?.requiere_edad_minima || prod.requiere_edad_minima < 18) continue;

      for (const catProd of prod.categorias_productos || []) {
        const restriction = await this.prisma.restricciones_envio_categoria.findUnique({
          where: {
            pais_iso2_estado_codigo_id_categoria: {
              id_categoria: catProd.id_categoria,
              pais_iso2: destPais,
              estado_codigo: destEstado,
            },
          },
        });

        if (restriction && !restriction.permitido) {
          throw new UnprocessableEntityException(
            `El producto "${prod.nombre}" no puede enviarse a ${destEstado || destPais} por restricciones legales de alcohol.`,
          );
        }
      }
    }

    const productNames = detalles
      .map((d) => d.productos?.nombre)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');

    // Derivar HS code de la primera categoría que lo tenga definido, solo si el envío no tiene uno.
    if (!envio.codigo_hs) {
      const hsCode = detalles
        .flatMap((d) => d.productos?.categorias_productos ?? [])
        .map((cp) => (cp as any).categorias?.codigo_hs_default)
        .find(Boolean) ?? null;
      if (hsCode) {
        await this.prisma.envios.update({
          where: { id_envio: envio.id_envio },
          data: { codigo_hs: hsCode },
        });
        (envio as any).codigo_hs = hsCode;
      }
    }

    // Prefer producer linked directly to this envio (multi-producer flow).
    // Fall back to the first producer in the order for backwards compatibility.
    const producerFields = {
      nombre_marca: true,
      rfc: true,
      direccion_bodega: {
        select: {
          linea_1: true,
          ciudad: true,
          estado: true,
          codigo_postal: true,
          pais_iso2: true,
          telefono: true,
        },
      },
    } as const;

    const pedidoProd = await this.prisma.pedido_productor.findFirst({
      where: { id_envio: envio.id_envio },
      select: { productores: { select: producerFields } },
    });

    const primerDetalle = pedidoProd
      ? null
      : await this.prisma.detalle_pedido.findFirst({
          where: { id_pedido: envio.id_pedido, id_productor: { not: null } },
          select: { productores: { select: producerFields } },
        });

    const productorData = pedidoProd?.productores ?? primerDetalle?.productores ?? null;

    if (!productorData?.direccion_bodega?.linea_1 || !productorData?.direccion_bodega?.codigo_postal) {
      throw new NotFoundException(
        'El productor no tiene configurada la dirección de bodega (campo id_direccion_bodega en su perfil). Configure la dirección antes de crear guías.',
      );
    }

    const carrier = this.selectCarrier(envio.transportistas?.codigo ?? undefined);

    const cotizacion = await this.prisma.envio_cotizaciones.findFirst({
      where: { id_pedido: envio.id_pedido },
      orderBy: { fecha_solicitud: 'desc' },
    });
    const cotPayload = cotizacion?.payload_response as any;

    const preferred_provider = cotPayload?.providerName ?? cotPayload?.carrier ?? null;
    const preferred_service = cotPayload?.productName ?? cotPayload?.productCode ?? null;
    this.logger.debug(
      `[crearGuia] cotizacion payload_response=${JSON.stringify(cotPayload)} → preferred_provider=${preferred_provider} preferred_service=${preferred_service}`,
    );

    const tasaRow = await this.prisma.tasas_cambio.findFirst({
      where: {
        moneda_origen: 'MXN' as Moneda,
        moneda_destino: 'USD' as Moneda,
        vigente_desde: { lte: new Date() },
        OR: [{ vigente_hasta: null }, { vigente_hasta: { gte: new Date() } }],
      },
      orderBy: { vigente_desde: 'desc' },
    });
    if (!tasaRow) {
      throw new InternalServerErrorException(
        'No hay tasa de cambio MXN→USD vigente. Configurar en la tabla tasas_cambio antes de crear guías internacionales.',
      );
    }
    const tipoCambio = Number(tasaRow.tasa);
    const valorAduana = envio.valor_declarado_aduana ? Number(envio.valor_declarado_aduana) : null;
    let valor_declarado_usd: number;
    if (valorAduana) {
      const raw = (envio.moneda_aduana as string) === 'USD' ? valorAduana : valorAduana / tipoCambio;
      valor_declarado_usd = Math.round(raw * 100) / 100;
    } else if (envio.pedidos?.total) {
      // Usar el total del pedido como valor declarado cuando no se especificó uno explícito
      const totalPedido = Number(envio.pedidos.total);
      const monedaPedido = (envio.pedidos as any).moneda ?? 'MXN';
      const raw = monedaPedido === 'USD' ? totalPedido : totalPedido / tipoCambio;
      valor_declarado_usd = Math.round(raw * 100) / 100;
    } else {
      valor_declarado_usd = 50;
    }

    const result = await carrier.createShipment({
      ...envio,
      productor: productorData,
      contenido_descripcion: productNames || 'Mezcal artesanal',
      preferred_provider,
      preferred_service,
      valor_declarado_usd,
    });

    if (!result.labelBuffer) {
      throw new UnprocessableEntityException(
        'El carrier generó la guía pero no devolvió el PDF de la etiqueta. Intenta de nuevo.',
      );
    }

    // Validar que el buffer es un PDF real (magic bytes %PDF) antes de persistir.
    const pdfMagic = result.labelBuffer.slice(0, 4).toString('ascii');
    if (pdfMagic !== '%PDF') {
      throw new UnprocessableEntityException(
        `El label recibido del carrier no es un PDF válido (magic bytes: ${pdfMagic}). Intenta de nuevo.`,
      );
    }

    // Protección SkydropX — se llama fuera de la transacción (HTTP externo)
    let proteccionData: { costo_proteccion?: string; moneda_proteccion?: any; proteccion_id?: string } = {};
    if (envio.solicitar_proteccion && result.providerShipmentId && carrier.protegerEnvio) {
      try {
        const prot = await carrier.protegerEnvio(result.providerShipmentId, valor_declarado_usd, 'USD');
        proteccionData = {
          costo_proteccion: prot.costo.toFixed(2),
          moneda_proteccion: 'MXN' as any,
          proteccion_id: prot.proteccionId,
        };
        this.logger.log(`[crearGuia] Protección: id=${prot.proteccionId} total=${prot.costo} (${prot.porcentaje}% + fijo ${prot.costoFijo})`);
      } catch (err: any) {
        this.logger.warn(`[crearGuia] Protección falló — guía creada sin protección: ${err?.message}`);
      }
    }

    return serializeBigInts(
      await this.prisma.$transaction(async (tx) => {
        const guia = await tx.envio_guias.create({
          data: {
            id_envio: toBigIntId(id_envio),
            id_transportista: envio.id_transportista ?? null,
            numero_guia: result.trackingNumber,
            label_pdf: result.labelBuffer,
            formato_etiqueta: result.labelFormat,
            estado_paqueteria: 'creada',
            payload_response: {
              trackingNumber: result.trackingNumber,
              labelFormat: result.labelFormat,
              carrierName: result.carrierName,
            } as any,
          },
        });
        // Persist actual carrier cost + tracking number + protection data
        await tx.envios.update({
          where: { id_envio: toBigIntId(id_envio) },
          data: {
            numero_rastreo: result.trackingNumber,
            estado: 'label_purchased',
            ...proteccionData,
            ...(result.cost && result.cost > 0
              ? { costo_envio: result.cost.toFixed(2), moneda_costo: (result.currency ?? 'MXN') as any }
              : {}),
          },
        });
        // No serializar label_pdf (Buffer) — devolver solo metadata
        const { label_pdf: _, ...guiaMeta } = guia as any;
        return {
          ...guiaMeta,
          tiene_pdf: true,
          ...(result.tarifa_fallback ? {
            tarifa_fallback: true,
            tarifa_original_solicitada: result.tarifa_original_solicitada,
          } : {}),
        };
      }),
    );
  }

  async getGuiaPdf(id_envio: string): Promise<{ numero_guia: string; label_pdf: Buffer }> {
    const envio = await this.prisma.envios.findUnique({
      where: { id_envio: toBigIntId(id_envio) },
      include: {
        envio_guias: {
          where: { eliminado_en: null },
          take: 1,
          orderBy: { fecha_creacion: 'desc' },
        },
      },
    });

    if (!envio) throw new NotFoundException('Envío no encontrado');
    const guia = envio.envio_guias?.[0];
    if (!guia) throw new NotFoundException('Este envío no tiene guía generada');
    if (!guia.label_pdf) throw new NotFoundException('El PDF de la etiqueta no está disponible');

    return { numero_guia: guia.numero_guia, label_pdf: guia.label_pdf as Buffer };
  }

  /**
   * Registra un evento de tracking buscando por numero_guia.
   * Usado por el webhook de SkydropX que envía el tracking number.
   */
  async registrarEventoPorGuia(
    numero_guia: string,
    descripcion: string,
    estado: string,
    fecha?: Date,
  ) {
    const guia = await this.prisma.envio_guias.findUnique({
      where: { numero_guia },
      include: { envios: true },
    });

    if (!guia) {
      throw new NotFoundException(`Guía con número ${numero_guia} no encontrada`);
    }

    const estadoNormalizado = this.normalizarEstado(estado);

    await this.prisma.envio_eventos.create({
      data: {
        id_guia: guia.id_guia,
        id_transportista: guia.id_transportista ?? undefined,
        numero_guia: guia.numero_guia,
        origen: 'webhook',
        estado_paqueteria: estado,
        estado_normalizado: estadoNormalizado ?? undefined,
        descripcion,
        payload: {},
        fecha_evento: fecha ?? new Date(),
      },
    });

    const updated = await this.prisma.envios.update({
      where: { id_envio: guia.id_envio },
      data: { estado: estadoNormalizado ?? estado },
    });

    return serializeBigInts({ id_envio: updated.id_envio, estado: updated.estado, numero_guia });
  }

  /**
   * Quotes shipping from raw cart items (no pedido required).
   * Looks up product dimensions and producer address from DB,
   * groups by producer and quotes SkydropX for each group.
   * Used during checkout BEFORE a pedido is created.
   */
  async cotizarCarrito(
    items: Array<{ id_producto: number; cantidad: number }>,
    destino: DireccionDestinoDto,
  ) {
    if (!Array.isArray(items) || !items.length) return [];

    const productos = await this.prisma.productos.findMany({
      where: { id_producto: { in: items.map(i => BigInt(i.id_producto)) } },
      include: {
        tiendas: {
          select: {
            id_productor: true,
            productores: {
              select: {
                id_productor: true,
                nombre_marca: true,
                direccion_bodega: {
                  select: { codigo_postal: true, estado: true, ciudad: true },
                },
              },
            },
          },
        },
        categorias_productos: {
          select: { id_categoria: true, categorias: { select: { codigo_hs_default: true } } },
        },
      },
    });

    const productosMap = new Map(productos.map(p => [Number(p.id_producto), p]));

    // Group by producer
    const grupos = new Map<number, { productor: any; items: Array<{ producto: any; cantidad: number }> }>();
    for (const item of items) {
      const prod = productosMap.get(item.id_producto);
      if (!prod) continue;
      const id_productor = prod.tiendas?.id_productor;
      if (id_productor == null) continue;
      if (!grupos.has(id_productor)) {
        grupos.set(id_productor, { productor: prod.tiendas?.productores, items: [] });
      }
      grupos.get(id_productor)!.items.push({ producto: prod, cantidad: item.cantidad });
    }

    // Validate alcohol shipping restrictions BEFORE quoting (so user learns before payment)
    const destPais = destino.pais.toUpperCase();
    const destEstado = destino.estado.toUpperCase();
    for (const grupo of grupos.values()) {
      for (const { producto } of grupo.items) {
        if (!producto.requiere_edad_minima || producto.requiere_edad_minima < 18) continue;
        for (const catProd of (producto.categorias_productos as any[]) ?? []) {
          const restriction = await this.prisma.restricciones_envio_categoria.findUnique({
            where: {
              pais_iso2_estado_codigo_id_categoria: {
                id_categoria: catProd.id_categoria,
                pais_iso2: destPais,
                estado_codigo: destEstado,
              },
            },
          });
          if (restriction && !restriction.permitido) {
            throw new UnprocessableEntityException(
              `"${producto.nombre}" no puede enviarse a ${destino.estado}, ${destino.pais} por restricciones legales de alcohol.`,
            );
          }
        }
      }
    }

    if (grupos.size === 0) return [];

    const resultados = await Promise.allSettled(
      Array.from(grupos.entries()).map(async ([id_productor, grupo]) => {
        const gItems = grupo.items;
        const pesoReal = gItems.reduce(
          (s, i) => s + Number(i.producto.peso_kg ?? 1) * i.cantidad, 0,
        );
        const sinDims = gItems.filter(i => !i.producto.largo_cm || !i.producto.ancho_cm || !i.producto.alto_cm);
        if (sinDims.length > 0) {
          this.logger.warn(
            `[cotizarCarrito] Productor ${id_productor}: ${sinDims.length} producto(s) sin dimensiones registradas. ` +
            `Usando fallback conservador 30×12×12 cm. Configura las dimensiones en el catálogo para evitar subcotización. ` +
            `Productos: ${sinDims.map(i => i.producto.nombre).join(', ')}`,
          );
        }
        const maxLargo = Math.max(30, ...gItems.map(i => Number(i.producto.largo_cm ?? 30)));
        const maxAncho = Math.max(12, ...gItems.map(i => Number(i.producto.ancho_cm ?? 12)));
        const alturaTotal = gItems.reduce(
          (s, i) => s + Number(i.producto.alto_cm ?? 12) * i.cantidad, 0,
        );
        const pesoVolumetrico = (maxLargo * maxAncho * alturaTotal) / 5000;
        const pesoFacturable = Math.max(pesoReal, pesoVolumetrico);

        this.logger.log(`[cotizarCarrito] Productor ${id_productor}: pesoReal=${pesoReal.toFixed(3)} kg | pesoVol=${pesoVolumetrico.toFixed(3)} kg | pesoFacturable=${pesoFacturable.toFixed(3)} kg | dims=${maxLargo}×${maxAncho}×${alturaTotal} cm`);

        const prod = grupo.productor;
        const bodega = prod?.direccion_bodega;
        const shipper = bodega?.codigo_postal
          ? { codigo_postal: bodega.codigo_postal, estado: bodega.estado ?? '', ciudad: bodega.ciudad ?? '' }
          : undefined;

        this.logger.log(`  → shipper CP=${shipper?.codigo_postal ?? 'ENV_FALLBACK'} destino CP=${destino.codigo_postal} país=${destino.pais}`);

        const isAlcohol = gItems.some(i => (i.producto.requiere_edad_minima ?? 0) >= 18);
        const valorTotalMxn = gItems.reduce(
          (s, i) => s + Number(i.producto.precio_base ?? 0) * i.cantidad, 0,
        );
        const valorTotalUsd = await this.toUsd(valorTotalMxn, 'MXN');
        const descripcionContenido = gItems
          .map(i => i.producto.nombre).filter(Boolean).slice(0, 3).join(', ');
        const hsCode = gItems
          .flatMap(i => (i.producto as any).categorias_productos ?? [])
          .map((cp: any) => cp.categorias?.codigo_hs_default)
          .find(Boolean) ?? undefined;
        const descripcionEn = gItems
          .map(i => ((i.producto as any).traducciones as any)?.en?.nombre as string | undefined)
          .find((s): s is string => Boolean(s)) ?? undefined;
        const cotDto: CotizarEnvioDto = {
          destino, peso_kg: pesoFacturable, largo_cm: maxLargo, ancho_cm: maxAncho, alto_cm: alturaTotal, shipper,
          adult_signature: isAlcohol || undefined,
          descripcion_contenido: descripcionContenido || undefined,
          descripcion_contenido_en: descripcionEn,
          valor_declarado_usd: valorTotalUsd || undefined,
          hs_code: hsCode,
        };
        const quotes = await this.skydropxService.cotizarEnvio(cotDto);

        return {
          id_productor: Number(id_productor),
          nombre_productor: prod?.nombre_marca ?? `Productor ${id_productor}`,
          peso_real_kg: Number(pesoReal.toFixed(3)),
          peso_volumetrico_kg: Number(pesoVolumetrico.toFixed(3)),
          peso_facturable_kg: Number(pesoFacturable.toFixed(3)),
          dimensiones: { largo_cm: maxLargo, ancho_cm: maxAncho, alto_cm: alturaTotal },
          contiene_alcohol: isAlcohol,
          quotes,
        };
      }),
    );

    const result = resultados.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const pid = Array.from(grupos.keys())[i];
      const errMsg = (r.reason as any)?.message ?? (r.reason as any)?.response?.message ?? 'Error al cotizar';
      this.logger.error(`[cotizarCarrito] Productor ${pid} falló: ${errMsg}`, (r.reason as any)?.stack);
      return { id_productor: Number(pid), nombre_productor: grupos.get(pid)?.productor?.nombre_marca ?? `Productor ${pid}`, error: errMsg, quotes: [] };
    });
    this.logger.log(`[cotizarCarrito] Completado — ${result.length} grupos, ${result.filter(g => !('error' in g)).length} exitosos`);
    return result;
  }

  /**
   * Groups cart items by producer, computes chargeable weight per group,
   * and quotes SkydropX independently for each group.
   * Returns one entry per producer with their available shipping options.
   */
  async cotizarPorProductor(id_pedido: number, destino: DireccionDestinoDto) {
    const detalles = await this.prisma.detalle_pedido.findMany({
      where: { id_pedido: BigInt(id_pedido) },
      include: {
        productos: {
          select: {
            nombre: true, peso_kg: true, alto_cm: true, ancho_cm: true, largo_cm: true,
            requiere_edad_minima: true, precio_base: true, moneda_base: true,
            traducciones: true,
            categorias_productos: {
              select: { categorias: { select: { codigo_hs_default: true } } },
            },
          },
        },
        productores: {
          select: {
            id_productor: true,
            nombre_marca: true,
            direccion_bodega: {
              select: { codigo_postal: true, estado: true, ciudad: true },
            },
          },
        },
      },
    });

    // Group items by producer
    const grupos = new Map<number, { productor: any; items: typeof detalles }>();
    for (const d of detalles) {
      const pid = d.id_productor;
      if (pid == null) continue;
      if (!grupos.has(pid)) grupos.set(pid, { productor: d.productores, items: [] });
      grupos.get(pid)!.items.push(d);
    }

    const resultados = await Promise.allSettled(
      Array.from(grupos.entries()).map(async ([id_productor, grupo]) => {
        const items = grupo.items;
        const pesoReal = items.reduce(
          (s, d) => s + Number(d.productos?.peso_kg ?? 1) * Number(d.cantidad), 0,
        );
        const sinDimsPedido = items.filter(d => !d.productos?.largo_cm || !d.productos?.ancho_cm || !d.productos?.alto_cm);
        if (sinDimsPedido.length > 0) {
          this.logger.warn(
            `[cotizarEnvio] Productor ${id_productor}: ${sinDimsPedido.length} producto(s) sin dimensiones. ` +
            `Usando fallback conservador 30×12×12 cm. Actualiza el catálogo. ` +
            `Productos: ${sinDimsPedido.map(d => d.productos?.nombre).join(', ')}`,
          );
        }
        const maxLargo = Math.max(30, ...items.map(d => Number(d.productos?.largo_cm ?? 30)));
        const maxAncho = Math.max(12, ...items.map(d => Number(d.productos?.ancho_cm ?? 12)));
        const alturaTotal = items.reduce(
          (s, d) => s + Number(d.productos?.alto_cm ?? 12) * Number(d.cantidad), 0,
        );
        const pesoVolumetrico = (maxLargo * maxAncho * alturaTotal) / 5000;
        const pesoFacturable = Math.max(pesoReal, pesoVolumetrico);

        const prod = grupo.productor;
        const bodega = prod?.direccion_bodega;
        const shipper = bodega?.codigo_postal
          ? { codigo_postal: bodega.codigo_postal, estado: bodega.estado ?? '', ciudad: bodega.ciudad ?? '' }
          : undefined;

        const isAlcohol = items.some(d => (d.productos?.requiere_edad_minima ?? 0) >= 18);
        const valorTotalMxn = items.reduce(
          (s, d) => s + Number(d.productos?.precio_base ?? 0) * Number(d.cantidad), 0,
        );
        const valorTotalUsd = await this.toUsd(valorTotalMxn, 'MXN');
        const descripcionContenido = items
          .map(d => d.productos?.nombre).filter(Boolean).slice(0, 3).join(', ');
        const hsCode = items
          .flatMap(d => (d.productos as any)?.categorias_productos ?? [])
          .map((cp: any) => cp.categorias?.codigo_hs_default)
          .find(Boolean) ?? undefined;
        const descripcionEn = items
          .map(d => ((d.productos as any)?.traducciones as any)?.en?.nombre as string | undefined)
          .find((s): s is string => Boolean(s)) ?? undefined;
        const cotDto: CotizarEnvioDto = {
          destino,
          peso_kg: pesoFacturable,
          largo_cm: maxLargo,
          ancho_cm: maxAncho,
          alto_cm: alturaTotal,
          shipper,
          adult_signature: isAlcohol || undefined,
          descripcion_contenido: descripcionContenido || undefined,
          descripcion_contenido_en: descripcionEn,
          valor_declarado_usd: valorTotalUsd || undefined,
          hs_code: hsCode,
        };

        const quotes = await this.skydropxService.cotizarEnvio(cotDto);

        return {
          id_productor,
          nombre_productor: prod?.nombre_marca ?? `Productor ${id_productor}`,
          peso_real_kg: Number(pesoReal.toFixed(3)),
          peso_volumetrico_kg: Number(pesoVolumetrico.toFixed(3)),
          peso_facturable_kg: Number(pesoFacturable.toFixed(3)),
          dimensiones: { largo_cm: maxLargo, ancho_cm: maxAncho, alto_cm: alturaTotal },
          contiene_alcohol: isAlcohol,
          quotes,
        };
      }),
    );

    return resultados.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const pid = Array.from(grupos.keys())[i];
      const prod = grupos.get(pid)?.productor;
      return {
        id_productor: pid,
        nombre_productor: prod?.nombre_marca ?? `Productor ${pid}`,
        error: (r.reason as any)?.message ?? 'Error al cotizar',
        quotes: [],
      };
    });
  }

  /**
   * Creates one envio record + shipping label per producer group in the order.
   * Called automatically after payment confirmation.
   * Errors per producer are caught individually so partial success is possible.
   */
  async crearEnviosPorProductor(id_pedido: number): Promise<any[]> {
    const pedidoProds = await this.prisma.pedido_productor.findMany({
      where: { id_pedido: BigInt(id_pedido) },
      include: {
        productores: {
          select: {
            id_productor: true,
            nombre_marca: true,
            rfc: true,
            direccion_bodega: {
              select: {
                linea_1: true,
                ciudad: true,
                estado: true,
                codigo_postal: true,
                pais_iso2: true,
                telefono: true,
              },
            },
          },
        },
      },
    });

    if (pedidoProds.length === 0) return [];

    const results: any[] = [];

    for (const pp of pedidoProds) {
      if (pp.id_envio) {
        this.logger.log(`[envios] Productor ${pp.id_productor} en pedido ${id_pedido} ya tiene envío #${pp.id_envio}, omitiendo`);
        results.push({ id_productor: pp.id_productor, skipped: true, id_envio: Number(pp.id_envio) });
        continue;
      }

      try {
        const items = await this.prisma.detalle_pedido.findMany({
          where: { id_pedido: BigInt(id_pedido), id_productor: pp.id_productor },
          include: {
            productos: { select: { nombre: true, peso_kg: true, alto_cm: true, ancho_cm: true, largo_cm: true } },
          },
        });

        const pesoReal = items.reduce(
          (s, d) => s + Number(d.productos?.peso_kg ?? 1) * Number(d.cantidad), 0,
        );
        const sinDimsGuia = items.filter(d => !d.productos?.largo_cm || !d.productos?.ancho_cm || !d.productos?.alto_cm);
        if (sinDimsGuia.length > 0) {
          this.logger.warn(
            `[comprarGuias] Pedido ${id_pedido}: ${sinDimsGuia.length} producto(s) sin dimensiones. ` +
            `Usando fallback conservador 30×12×12 cm. ` +
            `Productos: ${sinDimsGuia.map(d => d.productos?.nombre).join(', ')}`,
          );
        }
        const maxLargo = Math.max(30, ...items.map(d => Number(d.productos?.largo_cm ?? 30)));
        const maxAncho = Math.max(12, ...items.map(d => Number(d.productos?.ancho_cm ?? 12)));
        const alturaTotal = items.reduce(
          (s, d) => s + Number(d.productos?.alto_cm ?? 12) * Number(d.cantidad), 0,
        );
        const pesoVolumetrico = (maxLargo * maxAncho * alturaTotal) / 5000;
        const pesoFacturable = Math.max(pesoReal, pesoVolumetrico);

        const esAlcohol = await this.detectarFirmaAdulto(id_pedido);

        const envio = await this.prisma.envios.create({
          data: {
            id_pedido: BigInt(id_pedido),
            peso_kg: pesoFacturable.toFixed(3),
            largo_cm: maxLargo.toFixed(2),
            ancho_cm: maxAncho.toFixed(2),
            alto_cm: alturaTotal.toFixed(2),
            estado: 'preparando',
            requires_adult_signature: esAlcohol,
          },
        });

        // Link envio to this producer's order slice
        await this.prisma.pedido_productor.updateMany({
          where: { id_pedido: BigInt(id_pedido), id_productor: pp.id_productor },
          data: { id_envio: envio.id_envio, estado: 'preparando' },
        });

        // Purchase guide (crearGuia will now find the producer via pedido_productor.id_envio)
        const guiaResult = await this.crearGuia(String(envio.id_envio));

        this.logger.log(`[envios] Guía creada: productor=${pp.id_productor} pedido=${id_pedido} envio=${envio.id_envio}`);
        results.push({
          id_productor: pp.id_productor,
          id_envio: Number(envio.id_envio),
          guia: guiaResult,
        });
      } catch (err: any) {
        this.logger.error(
          `[envios] Error creando guía: productor=${pp.id_productor} pedido=${id_pedido}: ${err?.message}`,
        );
        results.push({ id_productor: pp.id_productor, error: err?.message });
      }
    }

    return results;
  }

  private normalizarEstado(estado: string): string | null {
    const STATE_MAP: Record<string, string> = {
      // FedEx
      delivered: 'entregado',
      in_transit: 'en_transito',
      in_transit_en_ruta: 'en_transito',
      out_for_delivery: 'en_reparto',
      out_for_delivery_en_reparto: 'en_reparto',
      picked_up: 'recogido',
      picked_up_recogido: 'recogido',
      delay: 'retrasado',
      delayed: 'retrasado',
      exception: 'fallido',
      failed: 'fallido',
      returned: 'devuelto',
      return_to_sender: 'devuelto',
      // SkydropX
      pending: 'preparando',
      label_created: 'preparando',
      collected: 'recogido',
      transit: 'en_transito',
      out_of_delivery: 'en_reparto',
      incident: 'fallido',
    };

    const normalized = estado
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');

    return STATE_MAP[normalized] ?? null;
  }

  async registrarEvento(
    id_envio: string,
    descripcion: string,
    estado: string,
    fecha?: Date,
  ) {
    const id_envio_big = toBigIntId(id_envio);

    const envio = await this.prisma.envios.findUnique({
      where: { id_envio: id_envio_big },
      include: { envio_guias: { where: { eliminado_en: null }, take: 1 } },
    });

    if (!envio) throw new NotFoundException('Envío no encontrado');

    const estadoNormalizado = this.normalizarEstado(estado);

    const guia = envio.envio_guias?.[0];
    if (guia) {
      await this.prisma.envio_eventos.create({
        data: {
          id_guia: guia.id_guia,
          id_transportista: envio.id_transportista ?? undefined,
          numero_guia: guia.numero_guia,
          origen: 'webhook',
          estado_paqueteria: estado,
          estado_normalizado: estadoNormalizado ?? undefined,
          descripcion,
          payload: {},
          fecha_evento: fecha ?? new Date(),
        },
      });
    }

    const updated = await this.prisma.envios.update({
      where: { id_envio: id_envio_big },
      data: { estado: estadoNormalizado ?? estado },
      include: { envio_guias: true },
    });

    return serializeBigInts(updated);
  }

}
