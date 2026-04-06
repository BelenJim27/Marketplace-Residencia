import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateEnvioDto, UpdateEnvioDto } from './dto/envios.dto';

@Injectable()
export class EnviosService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.envios.findMany({ include: { pedidos: true, transportistas: true, servicios_envio: true, envio_guias: true } })); }
  async findOne(id: string) { const item = await this.prisma.envios.findUnique({ where: { id_envio: toBigIntId(id) }, include: { pedidos: true, transportistas: true, servicios_envio: true, envio_guias: true } }); if (!item) throw new NotFoundException('Envio no encontrado'); return serializeBigInts(item); }
  async create(dto: CreateEnvioDto) { return serializeBigInts(await this.prisma.envios.create({ data: { id_pedido: toBigIntId(dto.id_pedido), id_transportista: dto.id_transportista ?? null, id_servicio: dto.id_servicio ?? null, numero_rastreo: dto.numero_rastreo ?? null, valor_declarado_aduana: dto.valor_declarado_aduana ?? null, moneda_aduana: dto.moneda_aduana?.trim() ?? 'MXN', codigo_hs: dto.codigo_hs ?? null, peso_kg: dto.peso_kg ?? null, alto_cm: dto.alto_cm ?? null, ancho_cm: dto.ancho_cm ?? null, largo_cm: dto.largo_cm ?? null, costo_envio: dto.costo_envio ?? null, moneda_costo: dto.moneda_costo?.trim() ?? 'MXN', estado: dto.estado?.trim() ?? 'preparando', fecha_envio: dto.fecha_envio ? new Date(dto.fecha_envio) : null, fecha_entrega_estimada: dto.fecha_entrega_estimada ? new Date(dto.fecha_entrega_estimada) : null, fecha_entrega: dto.fecha_entrega ? new Date(dto.fecha_entrega) : null } })); }
  async update(id: string, dto: UpdateEnvioDto) { return serializeBigInts(await this.prisma.envios.update({ where: { id_envio: toBigIntId(id) }, data: { id_pedido: dto.id_pedido ? toBigIntId(dto.id_pedido) : undefined, id_transportista: dto.id_transportista, id_servicio: dto.id_servicio, numero_rastreo: dto.numero_rastreo, valor_declarado_aduana: dto.valor_declarado_aduana, moneda_aduana: dto.moneda_aduana?.trim(), codigo_hs: dto.codigo_hs, peso_kg: dto.peso_kg, alto_cm: dto.alto_cm, ancho_cm: dto.ancho_cm, largo_cm: dto.largo_cm, costo_envio: dto.costo_envio, moneda_costo: dto.moneda_costo?.trim(), estado: dto.estado?.trim(), fecha_envio: dto.fecha_envio ? new Date(dto.fecha_envio) : undefined, fecha_entrega_estimada: dto.fecha_entrega_estimada ? new Date(dto.fecha_entrega_estimada) : undefined, fecha_entrega: dto.fecha_entrega ? new Date(dto.fecha_entrega) : undefined } })); }
  async remove(id: string) { await this.prisma.envios.delete({ where: { id_envio: toBigIntId(id) } }); return { message: 'Envio eliminado' }; }
}
