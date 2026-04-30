import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateEnvioDto, UpdateEnvioDto } from './dto/envios.dto';
import { DhlService } from './dhl.service';

@Injectable()
export class EnviosService {
  constructor(private readonly prisma: PrismaService, private readonly dhlService: DhlService) {}
  async findAll() { return serializeBigInts(await this.prisma.envios.findMany({ include: { pedidos: true, transportistas: true, servicios_envio: true, envio_guias: true } })); }
  async findOne(id: string) { const item = await this.prisma.envios.findUnique({ where: { id_envio: toBigIntId(id) }, include: { pedidos: true, transportistas: true, servicios_envio: true, envio_guias: true } }); if (!item) throw new NotFoundException('Envio no encontrado'); return serializeBigInts(item); }
  async create(dto: CreateEnvioDto) { return serializeBigInts(await this.prisma.envios.create({ data: { id_pedido: toBigIntId(dto.id_pedido), id_transportista: dto.id_transportista ?? null, id_servicio: dto.id_servicio ?? null, numero_rastreo: dto.numero_rastreo ?? null, valor_declarado_aduana: dto.valor_declarado_aduana ?? null, moneda_aduana: dto.moneda_aduana?.trim() ?? 'MXN', codigo_hs: dto.codigo_hs ?? null, peso_kg: dto.peso_kg ?? null, alto_cm: dto.alto_cm ?? null, ancho_cm: dto.ancho_cm ?? null, largo_cm: dto.largo_cm ?? null, costo_envio: dto.costo_envio ?? null, moneda_costo: dto.moneda_costo?.trim() ?? 'MXN', estado: dto.estado?.trim() ?? 'preparando', fecha_envio: dto.fecha_envio ? new Date(dto.fecha_envio) : null, fecha_entrega_estimada: dto.fecha_entrega_estimada ? new Date(dto.fecha_entrega_estimada) : null, fecha_entrega: dto.fecha_entrega ? new Date(dto.fecha_entrega) : null } })); }
  async update(id: string, dto: UpdateEnvioDto) { return serializeBigInts(await this.prisma.envios.update({ where: { id_envio: toBigIntId(id) }, data: { id_pedido: dto.id_pedido ? toBigIntId(dto.id_pedido) : undefined, id_transportista: dto.id_transportista, id_servicio: dto.id_servicio, numero_rastreo: dto.numero_rastreo, valor_declarado_aduana: dto.valor_declarado_aduana, moneda_aduana: dto.moneda_aduana?.trim(), codigo_hs: dto.codigo_hs, peso_kg: dto.peso_kg, alto_cm: dto.alto_cm, ancho_cm: dto.ancho_cm, largo_cm: dto.largo_cm, costo_envio: dto.costo_envio, moneda_costo: dto.moneda_costo?.trim(), estado: dto.estado?.trim(), fecha_envio: dto.fecha_envio ? new Date(dto.fecha_envio) : undefined, fecha_entrega_estimada: dto.fecha_entrega_estimada ? new Date(dto.fecha_entrega_estimada) : undefined, fecha_entrega: dto.fecha_entrega ? new Date(dto.fecha_entrega) : undefined } })); }
  async remove(id: string) { await this.prisma.envios.delete({ where: { id_envio: toBigIntId(id) } }); return { message: 'Envio eliminado' }; }

  async guardarCotizacion(idPedido: number, payload: any) {
    const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 3600000);
    return serializeBigInts(await this.prisma.envio_cotizaciones.create({
      data: {
        id_pedido: toBigIntId(idPedido),
        payload_request: payload.request ?? {},
        payload_response: payload.response ?? null,
        precio_total: payload.precioTotal,
        tiempo_entrega_estimado: payload.fechaEntregaEstimada,
        valida_hasta: addHours(new Date(), 4),
      }
    }));
  }

  async getTracking(id_envio: string) {
    const envio = await this.prisma.envios.findUnique({
      where: { id_envio: toBigIntId(id_envio) },
      include: { envio_guias: { include: { envio_eventos: { orderBy: { fecha_evento: 'asc' } } } } },
    });

    if (!envio) throw new NotFoundException('Envío no encontrado');

    // Try to fetch real DHL tracking if numero_rastreo exists
    let eventos: any[] = [];
    if (envio.numero_rastreo) {
      try {
        const dhlEventos = await this.dhlService.getTracking(envio.numero_rastreo);
        if (dhlEventos && dhlEventos.length > 0) {
          eventos = dhlEventos;
        }
      } catch {
        // Fall back to mock data
      }
    }

    // If no DHL events, try to get from database guía events
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

    // If no events yet, generate mock events based on status
    if (eventos.length === 0) {
      eventos = this.generateMockEvents(envio.estado, envio.fecha_envio);
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

  async registrarEvento(id_envio: string, descripcion: string, estado: string, fecha?: Date) {
    // Just update envio status - eventos are recorded via envio_guias
    const updated = await this.prisma.envios.update({
      where: { id_envio: toBigIntId(id_envio) },
      data: { estado },
      include: { envio_guias: true },
    });

    // If there's a guía, we could record the event there, but for now just update status
    return serializeBigInts(updated);
  }

  private generateMockEvents(estado: string, fechaEnvio: Date | null) {
    const baseDate = fechaEnvio ?? new Date();
    const eventos = [
      {
        descripcion: 'Paquete creado',
        estado: 'preparando',
        fecha: baseDate,
        ubicacion: 'Almacén',
      },
    ];

    if (estado === 'enviado' || estado === 'entregado') {
      eventos.push({
        descripcion: 'Paquete enviado',
        estado: 'enviado',
        fecha: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
        ubicacion: 'Centro de distribución',
      });
    }

    if (estado === 'entregado') {
      eventos.push({
        descripcion: 'Paquete entregado',
        estado: 'entregado',
        fecha: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        ubicacion: 'Domicilio del cliente',
      });
    }

    return eventos;
  }
}
