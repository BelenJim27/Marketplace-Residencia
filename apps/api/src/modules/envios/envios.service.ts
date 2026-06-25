import { ConflictException, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException, UnprocessableEntityException, forwardRef } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Moneda } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { serializeBigInts, toBigIntId } from "../../common/utilities/serialize";
import { CreateEnvioDto, CotizarEnvioDto, DireccionDestinoDto, UpdateEnvioDto } from "./dto/envios.dto";
import { ICarrierService } from "./interfaces/carrier.interface";
import { SkydropxService } from "./skydropx.service";
import { EmailService } from "../email/email.service";
import { PedidosService } from "../pedidos/pedidos.service";

@Injectable()
export class EnviosService {
  private readonly logger = new Logger(EnviosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly skydropxService: SkydropxService,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => PedidosService)) private readonly pedidosService: PedidosService,
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
    const include = { pedidos: true, transportistas: true, envio_guias: true };
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

    // 1. Resolver id_transportista desde código si no se pasa ID directo
    let id_transportista = dto.id_transportista ?? null;
    if (!id_transportista && dto.transportista_codigo) {
      const t = await this.prisma.transportistas.findUnique({
        where: { codigo: dto.transportista_codigo.toUpperCase() },
      });
      id_transportista = t?.id_transportista ?? null;
    }

    // 2. Creamos el registro
    return serializeBigInts(
      await this.prisma.envios.create({
        data: {
          id_pedido: toBigIntId(dto.id_pedido),
          id_transportista,
          numero_rastreo: dto.numero_rastreo ?? null,
          valor_declarado_aduana: dto.valor_declarado_aduana ?? null,
          moneda_aduana: (dto.moneda_aduana?.trim() ?? "MXN") as Moneda,
          codigo_hs: dto.codigo_hs ?? null,
          peso_kg: dto.peso_kg ?? null,
          alto_cm: dto.alto_cm ?? null,
          ancho_cm: dto.ancho_cm ?? null,
          largo_cm: dto.largo_cm ?? null,
          costo_envio: dto.costo_envio ?? null,
          moneda_costo: (dto.moneda_costo?.trim() ?? "MXN") as Moneda,
          solicitar_proteccion: dto.solicitar_proteccion ?? false,
          costo_proteccion: dto.costo_proteccion ?? null,
          estado: dto.estado?.trim() ?? "preparando",
          requires_adult_signature,
          fecha_envio: dto.fecha_envio ? new Date(dto.fecha_envio) : null,
        },
      }),
    );
  }
  private async detectarFirmaAdulto(id_pedido: number, id_productor?: bigint | number): Promise<boolean> {
    const detalles = await this.prisma.detalle_pedido.findMany({
      where: {
        id_pedido: BigInt(id_pedido),
        ...(id_productor != null ? { id_productor: Number(id_productor) } : undefined),
      },
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
          select: { direccion_envio_snapshot: true, total: true, moneda: true, id_usuario: true },
        },
        transportistas: true,
        envio_guias: { where: { eliminado_en: null } },
      },
    });

    if (!envio) throw new NotFoundException('Envío no encontrado');
    if (envio.envio_guias?.length > 0) throw new ConflictException('GUIA_YA_EXISTE');
    if (!envio.pedidos?.direccion_envio_snapshot) throw new UnprocessableEntityException('SIN_DIRECCION');

    const clienteUser = envio.pedidos.id_usuario
      ? await this.prisma.usuarios.findUnique({
          where: { id_usuario: envio.pedidos.id_usuario },
          select: { email: true },
        })
      : null;

    const snap = envio.pedidos.direccion_envio_snapshot as any;
    const destPais = snap.pais_iso2 ?? snap.pais ?? 'MX';
    const destEstado = snap.estado || '';

    // Resolve producer first — needed to scope restriction checks and address lookup to
    // this producer's items only, avoiding cross-producer interference in multi-producer orders.
    const producerFields = {
      id_usuario: true,
      nombre_marca: true,
      rfc: true,
      usuarios: { select: { nombre: true, email: true } },
      direccion_bodega: {
        select: {
          linea_1: true,
          colonia: true,
          referencia: true,
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
      select: {
        id_productor: true,
        subtotal_bruto: true,
        productores: { select: producerFields },
      },
    });

    const detalles = await this.prisma.detalle_pedido.findMany({
      where: {
        id_pedido: envio.id_pedido,
        ...(pedidoProd?.id_productor ? { id_productor: pedidoProd.id_productor } : {}),
      },
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

    const preferred_provider     = cotPayload?.providerName ?? cotPayload?.carrier ?? null;
    const preferred_service      = cotPayload?.productName ?? cotPayload?.productCode ?? null;
    const skydropx_quotation_id: string | null = cotPayload?.skydropxQuotationId ?? null;
    const skydropx_rate_id: string | null = cotPayload?.skydropxRateId ?? null;
    this.logger.debug(
      `[crearGuia] cotizacion payload_response=${JSON.stringify(cotPayload)} → preferred_provider=${preferred_provider} preferred_service=${preferred_service} quotation_id=${skydropx_quotation_id} rate_id=${skydropx_rate_id}`,
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
    // Valor declarado de aduana 100% automático: el productor captura precios solo en MXN
    // y el sistema deriva el valor real desde la BD y lo convierte a USD. NUNCA se pide al
    // productor convertir ni capturar un valor manual.
    // Fuente del valor real en MXN, en orden de preferencia:
    //   1) subtotal_bruto del productor (subtotal real de SUS productos en el pedido)
    //   2) suma de detalle_pedido (precio_compra * cantidad) de este productor
    //   3) total del pedido (fallback final, multi-producer)
    const subtotalDetallesMxn = detalles.reduce(
      (acc, d) => acc + Number(d.precio_compra) * d.cantidad,
      0,
    );
    let valorRealMxn: number | null = null;
    if (pedidoProd?.subtotal_bruto != null) {
      valorRealMxn = Number(pedidoProd.subtotal_bruto);
    } else if (subtotalDetallesMxn > 0) {
      valorRealMxn = subtotalDetallesMxn;
    } else if (envio.pedidos?.total) {
      const totalPedido = Number(envio.pedidos.total);
      const monedaPedido = (envio.pedidos as any).moneda ?? 'MXN';
      // Si el pedido ya está en USD, no re-convertir; si está en MXN, convertir abajo.
      valorRealMxn = monedaPedido === 'USD' ? totalPedido * tipoCambio : totalPedido;
    }
    if (valorRealMxn == null || valorRealMxn <= 0) {
      throw new UnprocessableEntityException(
        'No se pudo determinar el valor real de la mercancía para la declaración aduanal. Verifica que el pedido tenga productos con precio.',
      );
    }
    const valor_declarado_usd = Math.round((valorRealMxn / tipoCambio) * 100) / 100;

    // Para internacionales: siempre se pasa en USD (aduana lo exige en products[].price).
    // Para nacionales: solo si el productor solicita protección (opt-in), en MXN.
    // Sin protección en nacional, omitir evita cargos extra de seguro y mantiene
    // el precio igual al cotizado.
    const valor_declarado_para_carrier = destPais !== 'MX'
      ? valor_declarado_usd
      : (envio.solicitar_proteccion ? valorRealMxn : undefined);

    const result = await carrier.createShipment({
      ...envio,
      productor: productorData,
      cliente_email: clienteUser?.email ?? null,
      contenido_descripcion: productNames || 'Mezcal artesanal',
      preferred_provider,
      preferred_service,
      valor_declarado_usd: valor_declarado_para_carrier,
      skydropx_quotation_id,
      skydropx_rate_id,
    });

    // El carrier aceptó el envío pero la etiqueta puede seguir generándose de forma asíncrona
    // ("in_creation"). En ese caso NO fallamos: persistimos la guía "en proceso" y se completa
    // luego con refrescarGuia. (En sandbox las guías internacionales nunca terminan de generarse.)
    const isPending = result.pending || !result.labelBuffer;

    if (!isPending) {
      // Validar que el buffer es un PDF real (magic bytes %PDF) antes de persistir.
      const pdfMagic = result.labelBuffer!.slice(0, 4).toString('ascii');
      if (pdfMagic !== '%PDF') {
        throw new UnprocessableEntityException(
          `El label recibido del carrier no es un PDF válido (magic bytes: ${pdfMagic}). Intenta de nuevo.`,
        );
      }
    }

    // Protección SkydropX — se llama fuera de la transacción (HTTP externo). Solo aplica cuando
    // la etiqueta ya está lista; si está pendiente, se omite (se podrá proteger al completarse).
    let proteccionData: { costo_proteccion?: string; moneda_proteccion?: any } = {};
    if (!isPending && envio.solicitar_proteccion && result.providerShipmentId && carrier.protegerEnvio) {
      try {
        const prot = await carrier.protegerEnvio(result.providerShipmentId, valor_declarado_usd, 'USD');
        proteccionData = {
          costo_proteccion: prot.costo.toFixed(2),
          moneda_proteccion: 'MXN' as any,
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
            // numero_guia es @unique y obligatorio: si la etiqueta aún no existe usamos el
            // shipment_id del carrier como placeholder; refrescarGuia lo sustituye por el real.
            numero_guia: isPending
              ? (result.providerShipmentId ?? result.trackingNumber)
              : result.trackingNumber,
            label_pdf: isPending ? null : result.labelBuffer,
            formato_etiqueta: result.labelFormat,
            estado_paqueteria: isPending ? 'in_creation' : 'creada',
            payload_response: {
              trackingNumber: result.trackingNumber,
              labelFormat: result.labelFormat,
              carrierName: result.carrierName,
              providerShipmentId: result.providerShipmentId,
              pending: isPending,
            } as any,
          },
        });
        // Persist actual carrier cost. tracking_number/estado final solo cuando hay etiqueta;
        // si está pendiente, estado='in_creation' y numero_rastreo se completa al refrescar.
        await tx.envios.update({
          where: { id_envio: toBigIntId(id_envio) },
          data: {
            ...(isPending
              ? { estado: 'in_creation' }
              : { numero_rastreo: result.trackingNumber, estado: 'label_purchased' }),
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
          tiene_pdf: !isPending,
          pendiente: isPending,
          providerShipmentId: result.providerShipmentId,
          ...(result.tarifa_fallback ? {
            tarifa_fallback: true,
            tarifa_original_solicitada: result.tarifa_original_solicitada,
          } : {}),
        };
      }),
    );
  }

  /**
   * Completa una guía que quedó "en proceso" (in_creation): re-consulta al carrier por el
   * shipment_id guardado y, si la etiqueta ya está lista, la persiste (PDF + número real de
   * rastreo). Si sigue generándose, devuelve { pendiente: true } sin error.
   */
  async refrescarGuiaPendiente(id_envio: string) {
    const envio = await this.prisma.envios.findUnique({
      where: { id_envio: toBigIntId(id_envio) },
      include: {
        envio_guias: {
          where: { eliminado_en: null },
          orderBy: { fecha_creacion: 'desc' },
          take: 1,
        },
      },
    });
    if (!envio) throw new NotFoundException('Envío no encontrado');

    const guia = envio.envio_guias?.[0];
    if (!guia) throw new UnprocessableEntityException('SIN_GUIA');

    // Ya completada: devolver metadata tal cual.
    if (guia.estado_paqueteria !== 'in_creation' && guia.label_pdf) {
      const { label_pdf: _done, ...meta } = guia as any;
      return serializeBigInts({ ...meta, tiene_pdf: true, pendiente: false });
    }

    const payload = (guia.payload_response ?? {}) as any;
    const providerShipmentId = payload.providerShipmentId;
    if (!providerShipmentId) throw new UnprocessableEntityException('GUIA_SIN_SHIPMENT_ID');

    const carrier = this.selectCarrier();
    if (!carrier.obtenerGuiaPendiente) {
      throw new UnprocessableEntityException('El carrier no soporta refrescar guías pendientes.');
    }

    const result = await carrier.obtenerGuiaPendiente(String(providerShipmentId));

    // Sigue en generación → responder pendiente (sin error) para que el frontend reintente.
    if (result.pending || !result.labelBuffer) {
      return serializeBigInts({ id_guia: guia.id_guia, pendiente: true, tiene_pdf: false });
    }

    const pdfMagic = result.labelBuffer.slice(0, 4).toString('ascii');
    if (pdfMagic !== '%PDF') {
      throw new UnprocessableEntityException(
        `El label recibido del carrier no es un PDF válido (magic bytes: ${pdfMagic}).`,
      );
    }

    return serializeBigInts(
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.envio_guias.update({
          where: { id_guia: guia.id_guia },
          data: {
            numero_guia: result.trackingNumber,
            label_pdf: result.labelBuffer,
            estado_paqueteria: 'creada',
            payload_response: {
              ...payload,
              trackingNumber: result.trackingNumber,
              carrierName: result.carrierName ?? payload.carrierName,
              pending: false,
            } as any,
          },
        });
        await tx.envios.update({
          where: { id_envio: envio.id_envio },
          data: { numero_rastreo: result.trackingNumber, estado: 'label_purchased' },
        });
        const { label_pdf: _, ...meta } = updated as any;
        return { ...meta, tiene_pdf: true, pendiente: false };
      }),
    );
  }

  // Máximo tiempo que una guía puede permanecer 'in_creation' antes de marcarse
  // como error y escalarse a admins para recreación manual.
  private static readonly GUIA_PENDIENTE_MAX_HORAS = 24;

  /**
   * Completa o sanea las guías que quedaron en 'in_creation'. SkydropX genera las
   * etiquetas de forma asíncrona (sobre todo internacionales); sin este cron una
   * guía pendiente quedaría colgada indefinidamente si el frontend no hace polling
   * (cliente cierra la pestaña, etc.) → el pedido nunca se envía y nadie se entera.
   * - Dentro de ventana: refrescarGuiaPendiente la completa si la etiqueta ya está lista.
   * - Pasado GUIA_PENDIENTE_MAX_HORAS: se marca 'error' y se alerta a admins.
   */
  @Cron('*/10 * * * *')
  async completarGuiasPendientes() {
    const pendientes = await this.prisma.envio_guias.findMany({
      where: { estado_paqueteria: 'in_creation', eliminado_en: null },
      select: { id_guia: true, id_envio: true, numero_guia: true, fecha_creacion: true, payload_response: true },
    });
    if (pendientes.length === 0) return;

    const limite = new Date(Date.now() - EnviosService.GUIA_PENDIENTE_MAX_HORAS * 60 * 60 * 1000);
    this.logger.log(`[envios] completarGuiasPendientes: ${pendientes.length} guía(s) in_creation`);

    for (const guia of pendientes) {
      try {
        if (guia.fecha_creacion < limite) {
          // Demasiado tiempo pendiente: marcar error y escalar (revisión/recreación manual).
          await this.prisma.$transaction(async (tx) => {
            await tx.envio_guias.update({
              where: { id_guia: guia.id_guia },
              data: {
                estado_paqueteria: 'error',
                payload_response: {
                  ...((guia.payload_response as any) ?? {}),
                  error: `Etiqueta no generada por SkydropX tras ${EnviosService.GUIA_PENDIENTE_MAX_HORAS}h`,
                  error_en: new Date().toISOString(),
                } as any,
              },
            });
            await tx.envios.update({
              where: { id_envio: guia.id_envio },
              data: { estado: 'error' },
            });
          });
          await this.notificarAdmins(
            'guia_pendiente_error',
            'Guía de envío no generada',
            `La guía del envío ${guia.id_envio} (placeholder ${guia.numero_guia}) lleva más de ${EnviosService.GUIA_PENDIENTE_MAX_HORAS}h sin generarse en SkydropX. Requiere revisión/recreación manual.`,
          );
          this.logger.error(`[envios] Guía ${guia.id_guia} (envío ${guia.id_envio}) marcada 'error' tras timeout`);
          continue;
        }
        // Aún dentro de ventana: intentar completar (no lanza si sigue pendiente).
        await this.refrescarGuiaPendiente(String(guia.id_envio));
      } catch (err: any) {
        this.logger.warn(`[envios] completarGuiasPendientes: guía ${guia.id_guia} aún pendiente/error: ${err?.message}`);
      }
    }
  }

  /** Crea notificaciones in-app para todos los administradores activos. Best-effort. */
  private async notificarAdmins(tipo: string, titulo: string, cuerpo: string) {
    try {
      const adminRole = await this.prisma.roles.findFirst({
        where: { nombre: { in: ['administrador', 'admin', 'ADMIN'] } },
        select: { id_rol: true },
      });
      if (!adminRole) return;
      const admins = await this.prisma.usuario_rol.findMany({
        where: { id_rol: adminRole.id_rol, estado: 'activo' },
        select: { id_usuario: true },
      });
      await Promise.all(
        admins.map(({ id_usuario }) =>
          this.prisma.notificaciones.create({ data: { id_usuario, tipo, titulo, cuerpo, leido: false } }),
        ),
      );
    } catch (err: any) {
      this.logger.error(`[envios] notificarAdmins failed: ${err?.message}`);
    }
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
      include: {
        envios: {
          select: {
            id_envio: true,
            id_pedido: true,
            pedidos: { select: { moneda: true, usuarios: { select: { email: true, nombre: true, idioma_preferido: true } } } },
          },
        },
      },
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
      data: {
        estado: estadoNormalizado ?? estado,
      },
    });

    // Sync pedidos.estado so buyer-facing order list stays current
    const PEDIDO_ESTADO_MAP: Record<string, string> = {
      recogido: 'preparando',
      en_transito: 'enviado',
      en_reparto: 'enviado',
      entregado: 'entregado',
    };
    const nuevoPedidoEstado = estadoNormalizado ? PEDIDO_ESTADO_MAP[estadoNormalizado] : null;
    if (nuevoPedidoEstado && guia.envios?.id_pedido) {
      await this.prisma.pedidos.update({
        where: { id_pedido: guia.envios.id_pedido },
        data: { estado: nuevoPedidoEstado },
      });
    }

    // Cuando el carrier confirma la entrega, sincronizar pedido_productor y disparar payout
    if (estadoNormalizado === 'entregado' && guia.id_envio) {
      const pps = await this.prisma.pedido_productor.findMany({
        where: { id_envio: guia.id_envio },
      });
      for (const pp of pps) {
        // isAdmin=true: el carrier es fuente autoritativa; idempotente si ya está en entregado
        this.pedidosService
          .updateOrderStatusForProductor(String(pp.id_pedido), pp.id_productor, 'entregado', true)
          .catch(err =>
            this.logger.warn(
              `[tracking] Auto-entregado falló para pedido ${pp.id_pedido} productor ${pp.id_productor}: ${err?.message}`,
            ),
          );
      }
    }

    // Notificar al comprador por email en estados clave
    const ESTADOS_NOTIFICAR = new Set(['en_transito', 'en_reparto', 'entregado']);
    if (estadoNormalizado && ESTADOS_NOTIFICAR.has(estadoNormalizado)) {
      const usuario = guia.envios?.pedidos?.usuarios;
      const emailCliente = usuario?.email;
      if (emailCliente) {
        const nombreCliente = usuario?.nombre ?? 'Cliente';
        const pedidoId = String(guia.envios?.id_pedido ?? '');
        // Idioma: preferencia del usuario, o inglés si el pedido es en USD (destino internacional).
        const lang: 'es' | 'en' =
          usuario?.idioma_preferido === 'en' || guia.envios?.pedidos?.moneda === 'USD' ? 'en' : 'es';
        this.emailService.sendTrackingUpdateEmail(emailCliente, nombreCliente, pedidoId, numero_guia, estadoNormalizado, lang)
          .catch(err => this.logger.warn(`[tracking] Email a ${emailCliente} falló: ${err?.message}`));
      }
    }

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
          valor_declarado_mxn: Number(valorTotalMxn.toFixed(2)),
          proteccion_estimada_mxn: Number(
            (
              valorTotalMxn * (parseFloat(process.env.SKYDROPX_PROTECTION_PCT ?? '2') / 100) +
              parseFloat(process.env.SKYDROPX_PROTECTION_FIXED_MXN ?? '0')
            ).toFixed(2),
          ),
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
   * Creates the envio DB record for ONE specific producer in the order.
   * Does NOT call SkydropX — the guide is purchased separately via crearGuia().
   * Idempotent: returns the existing id_envio if already set.
   */
  async iniciarEnvioParaProductor(id_pedido: number, id_productor: number): Promise<{ id_envio: number }> {
    const pp = await this.prisma.pedido_productor.findUnique({
      where: { id_pedido_id_productor: { id_pedido: BigInt(id_pedido), id_productor } },
      include: {
        productores: {
          select: { direccion_bodega: { select: { linea_1: true, codigo_postal: true } } },
        },
      },
    });
    if (!pp) throw new NotFoundException('No tienes acceso a este pedido');
    if (pp.id_envio) return { id_envio: Number(pp.id_envio) };

    if (!pp.productores?.direccion_bodega?.linea_1 || !pp.productores?.direccion_bodega?.codigo_postal) {
      throw new UnprocessableEntityException(
        'No tienes configurada la dirección de bodega. Configúrala en tu perfil antes de generar envíos.',
      );
    }

    const items = await this.prisma.detalle_pedido.findMany({
      where: { id_pedido: BigInt(id_pedido), id_productor },
      include: { productos: { select: { nombre: true, peso_kg: true, alto_cm: true, ancho_cm: true, largo_cm: true } } },
    });

    const pesoReal = items.reduce((s, d) => s + Number(d.productos?.peso_kg ?? 1) * Number(d.cantidad), 0);
    const sinDims = items.filter(d => !d.productos?.largo_cm || !d.productos?.ancho_cm || !d.productos?.alto_cm);
    if (sinDims.length > 0) {
      this.logger.warn(`[iniciarEnvio] Pedido ${id_pedido}: ${sinDims.length} producto(s) sin dimensiones, usando fallback 30×12×12`);
    }
    const maxLargo = Math.max(30, ...items.map(d => Number(d.productos?.largo_cm ?? 30)));
    const maxAncho = Math.max(12, ...items.map(d => Number(d.productos?.ancho_cm ?? 12)));
    const alturaTotal = items.reduce((s, d) => s + Number(d.productos?.alto_cm ?? 12) * Number(d.cantidad), 0);
    const pesoVolumetrico = (maxLargo * maxAncho * alturaTotal) / 5000;
    const pesoFacturable = Math.max(pesoReal, pesoVolumetrico);
    const esAlcohol = await this.detectarFirmaAdulto(id_pedido, id_productor);

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

    await this.prisma.pedido_productor.updateMany({
      where: { id_pedido: BigInt(id_pedido), id_productor },
      data: { id_envio: envio.id_envio, estado: 'preparando' },
    });

    return { id_envio: Number(envio.id_envio) };
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

    // Leer solicitar_proteccion y costo_envio del envío preliminar (creado en
    // prepararPago antes del pago) para propagarlos a cada envío por productor
    // que se crea aquí.
    const envioBase = await this.prisma.envios.findFirst({
      where: { id_pedido: BigInt(id_pedido) },
      orderBy: { id_envio: 'asc' },
      select: { id_envio: true, solicitar_proteccion: true, costo_envio: true, moneda_costo: true },
    });
    const solicitarProteccion = envioBase?.solicitar_proteccion ?? false;
    const costoEnvioTotal = envioBase?.costo_envio
      ? parseFloat(envioBase.costo_envio.toString())
      : 0;
    const monedaCostoBase = (envioBase?.moneda_costo ?? 'MXN') as Moneda;

    // Calcular subtotales por productor para prorratear el costo de envío
    const todosItems = await this.prisma.detalle_pedido.findMany({
      where: { id_pedido: BigInt(id_pedido) },
      select: { id_productor: true, cantidad: true, precio_compra: true },
    });
    const subtotalTotal = todosItems.reduce(
      (s, i) => s + Number(i.precio_compra) * i.cantidad, 0,
    );
    const subtotalPorProductor: Record<number, number> = {};
    for (const item of todosItems) {
      if (item.id_productor == null) continue;
      subtotalPorProductor[item.id_productor] =
        (subtotalPorProductor[item.id_productor] ?? 0) +
        Number(item.precio_compra) * item.cantidad;
    }

    // Cada productor genera un envío + guía (API de paquetería) de forma
    // independiente. Se procesan en paralelo con allSettled-equivalente (cada
    // iteración captura su propio error y devuelve un resultado) en vez de serie,
    // reduciendo la latencia de O(n × latencia_API) a ~max(latencia_API).
    const results: any[] = await Promise.all(
      pedidoProds.map(async (pp) => {
      if (pp.id_envio) {
        this.logger.log(`[envios] Productor ${pp.id_productor} en pedido ${id_pedido} ya tiene envío #${pp.id_envio}, omitiendo`);
        return { id_productor: pp.id_productor, skipped: true, id_envio: Number(pp.id_envio) };
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

        // Validar dirección de bodega ANTES de crear el registro de envío para
        // evitar registros huérfanos cuando el productor no tiene bodega configurada.
        if (!pp.productores?.direccion_bodega?.linea_1 || !pp.productores?.direccion_bodega?.codigo_postal) {
          throw new Error(
            `Productor ${pp.id_productor} sin dirección de bodega configurada. Configure la bodega antes de generar guías.`,
          );
        }

        const esAlcohol = await this.detectarFirmaAdulto(id_pedido, pp.id_productor);

        // Prorratear el costo de envío total según la proporción de items del productor
        const prodSubtotal = subtotalPorProductor[pp.id_productor] ?? 0;
        const costoEnvioProrrateado = subtotalTotal > 0 && costoEnvioTotal > 0
          ? ((costoEnvioTotal * prodSubtotal) / subtotalTotal).toFixed(2)
          : null;

        const envio = await this.prisma.envios.create({
          data: {
            id_pedido: BigInt(id_pedido),
            peso_kg: pesoFacturable.toFixed(3),
            largo_cm: maxLargo.toFixed(2),
            ancho_cm: maxAncho.toFixed(2),
            alto_cm: alturaTotal.toFixed(2),
            estado: 'preparando',
            requires_adult_signature: esAlcohol,
            solicitar_proteccion: solicitarProteccion,
            costo_envio: costoEnvioProrrateado,
            moneda_costo: monedaCostoBase,
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
        return {
          id_productor: pp.id_productor,
          id_envio: Number(envio.id_envio),
          guia: guiaResult,
        };
      } catch (err: any) {
        this.logger.error(
          `[envios] Error creando guía: productor=${pp.id_productor} pedido=${id_pedido}: ${err?.message}`,
        );
        return { id_productor: pp.id_productor, error: err?.message };
      }
      }),
    );

    // Limpiar costo_envio del envío preliminar para evitar doble conteo
    // ahora que cada envío por productor tiene su costo prorrateado.
    if (envioBase?.id_envio) {
      await this.prisma.envios.update({
        where: { id_envio: envioBase.id_envio },
        data: { costo_envio: null },
      }).catch(() => {});
    }

    return results;
  }

  private normalizarEstado(estado: string): string | null {
    const STATE_MAP: Record<string, string> = {
      // Estados de tracking genéricos del carrier (devueltos por SkydropX/paquetería).
      // NOTA: no es integración FedEx — son strings de estado estándar a normalizar.
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
