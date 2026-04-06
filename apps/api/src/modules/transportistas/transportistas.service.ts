import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateIntegracionEnvioDto, CreateServicioEnvioDto, CreateTransportistaDto, UpdateIntegracionEnvioDto, UpdateServicioEnvioDto, UpdateTransportistaDto } from './dto/transportistas.dto';

@Injectable()
export class TransportistasService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.transportistas.findMany({ include: { servicios_envio: true, integraciones_envio: true, envios: true } })); }
  async findOne(id_transportista: number) { const item = await this.prisma.transportistas.findUnique({ where: { id_transportista }, include: { servicios_envio: true, integraciones_envio: true, envios: true } }); if (!item) throw new NotFoundException('Transportista no encontrado'); return serializeBigInts(item); }
  async create(dto: CreateTransportistaDto) { return serializeBigInts(await this.prisma.transportistas.create({ data: { codigo: dto.codigo.trim(), nombre: dto.nombre.trim(), paises_operacion: dto.paises_operacion, api_base_url: dto.api_base_url ?? null, notas_integracion: dto.notas_integracion ?? null, activo: dto.activo ?? true } })); }
  async update(id_transportista: number, dto: UpdateTransportistaDto) { return serializeBigInts(await this.prisma.transportistas.update({ where: { id_transportista }, data: { codigo: dto.codigo?.trim(), nombre: dto.nombre?.trim(), paises_operacion: dto.paises_operacion, api_base_url: dto.api_base_url, notas_integracion: dto.notas_integracion, activo: dto.activo } })); }
  async remove(id_transportista: number) { await this.prisma.transportistas.delete({ where: { id_transportista } }); return { message: 'Transportista eliminado' }; }
  async createServicio(dto: CreateServicioEnvioDto) { return serializeBigInts(await this.prisma.servicios_envio.create({ data: { id_transportista: dto.id_transportista, codigo_servicio: dto.codigo_servicio.trim(), nombre: dto.nombre.trim(), tiempo_estimado: dto.tiempo_estimado ?? null, es_internacional: dto.es_internacional ?? false, activo: dto.activo ?? true } })); }
  async updateServicio(id_servicio: number, dto: UpdateServicioEnvioDto) { return serializeBigInts(await this.prisma.servicios_envio.update({ where: { id_servicio }, data: { id_transportista: dto.id_transportista, codigo_servicio: dto.codigo_servicio?.trim(), nombre: dto.nombre?.trim(), tiempo_estimado: dto.tiempo_estimado, es_internacional: dto.es_internacional, activo: dto.activo } })); }
  async removeServicio(id_servicio: number) { await this.prisma.servicios_envio.delete({ where: { id_servicio } }); return { message: 'Servicio eliminado' }; }
  async createIntegracion(dto: CreateIntegracionEnvioDto) { return serializeBigInts(await this.prisma.integraciones_envio.create({ data: { id_transportista: dto.id_transportista, entorno: dto.entorno?.trim() ?? 'produccion', api_url: dto.api_url ?? null, api_key: dto.api_key ? Buffer.from(dto.api_key) : null, api_secret: dto.api_secret ? Buffer.from(dto.api_secret) : null, credenciales_extra: (dto.credenciales_extra ?? {}) as Prisma.InputJsonValue, activo: dto.activo ?? true } })); }
  async updateIntegracion(id_integracion: number, dto: UpdateIntegracionEnvioDto) { return serializeBigInts(await this.prisma.integraciones_envio.update({ where: { id_integracion }, data: { id_transportista: dto.id_transportista, entorno: dto.entorno?.trim(), api_url: dto.api_url, api_key: dto.api_key ? Buffer.from(dto.api_key) : undefined, api_secret: dto.api_secret ? Buffer.from(dto.api_secret) : undefined, credenciales_extra: dto.credenciales_extra as Prisma.InputJsonValue | undefined, activo: dto.activo } })); }
  async removeIntegracion(id_integracion: number) { await this.prisma.integraciones_envio.delete({ where: { id_integracion } }); return { message: 'Integracion eliminada' }; }
}
