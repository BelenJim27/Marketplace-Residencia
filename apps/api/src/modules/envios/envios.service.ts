import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { serializeBigInts, toBigIntId } from "../shared/serialize";
import { CreateEnvioDto, UpdateEnvioDto } from "./dto/envios.dto";
import { FedexService } from "./fedex.service";

@Injectable()
export class EnviosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fedexService: FedexService,
  ) {}
  async findAll() {
    return serializeBigInts(
      await this.prisma.envios.findMany({
        include: {
          pedidos: true,
          transportistas: true,
          servicios_envio: true,
          envio_guias: true,
        },
      }),
    );
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

    // 4. Creamos el registro usando las variables resueltas arriba
    return serializeBigInts(
      await this.prisma.envios.create({
        data: {
          id_pedido: toBigIntId(dto.id_pedido),
          id_transportista, // Usamos la variable local resuelta
          id_servicio,      // Usamos la variable local resuelta
          numero_rastreo: dto.numero_rastreo ?? null,
          valor_declarado_aduana: dto.valor_declarado_aduana ?? null,
          moneda_aduana: dto.moneda_aduana?.trim() ?? "MXN",
          codigo_hs: dto.codigo_hs ?? null,
          peso_kg: dto.peso_kg ?? null,
          alto_cm: dto.alto_cm ?? null,
          ancho_cm: dto.ancho_cm ?? null,
          largo_cm: dto.largo_cm ?? null,
          costo_envio: dto.costo_envio ?? null,
          moneda_costo: dto.moneda_costo?.trim() ?? "MXN",
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
      select: { productos: { select: { requiere_firma_adulto: true } } },
    });
    return detalles.some((d) => d.productos?.requiere_firma_adulto === true);
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
          moneda_aduana: dto.moneda_aduana?.trim(),
          codigo_hs: dto.codigo_hs,
          peso_kg: dto.peso_kg,
          alto_cm: dto.alto_cm,
          ancho_cm: dto.ancho_cm,
          largo_cm: dto.largo_cm,
          costo_envio: dto.costo_envio,
          moneda_costo: dto.moneda_costo?.trim(),
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
        const carrierEventos = await this.fedexService.getTracking(
          envio.numero_rastreo,
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
        estado: e.estado,
        fecha: e.fecha,
        ubicacion: e.ubicacion,
      })),
    });
  }

  async crearGuia(id_envio: string) {
    const envio = await this.prisma.envios.findUnique({
      where: { id_envio: toBigIntId(id_envio) },
      include: {
        pedidos: true,
        servicios_envio: true,
        transportistas: true,
        envio_guias: { where: { eliminado_en: null } },
      },
    });

    if (!envio) throw new NotFoundException('Envío no encontrado');
    if (envio.envio_guias.length > 0) throw new ConflictException('GUIA_YA_EXISTE');
    if (!envio.pedidos?.direccion_envio_snapshot) throw new UnprocessableEntityException('SIN_DIRECCION');

    const result = await this.fedexService.createShipment(envio);

    return serializeBigInts(
      await this.prisma.$transaction(async (tx) => {
        const guia = await tx.envio_guias.create({
          data: {
            id_envio: toBigIntId(id_envio),
            id_transportista: envio.id_transportista ?? null,
            numero_guia: result.trackingNumber,
            url_etiqueta: result.labelUrl ?? null,
            formato_etiqueta: result.labelFormat,
            estado_paqueteria: 'creada',
            payload_response: result as any,
          },
        });
        await tx.envios.update({
          where: { id_envio: toBigIntId(id_envio) },
          data: { numero_rastreo: result.trackingNumber },
        });
        return guia;
      }),
    );
  }

  private normalizarEstadoFedex(estado: string): string | null {
    const FEDEX_STATE_MAP: Record<string, string> = {
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
    };

    const normalized = estado
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');

    return FEDEX_STATE_MAP[normalized] ?? null;
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

    const estadoNormalizado = this.normalizarEstadoFedex(estado);

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
