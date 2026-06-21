import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../../common/utilities/serialize';
import { CreateServicioEnvioDto, CreateTransportistaDto, UpdateServicioEnvioDto, UpdateTransportistaDto } from './dto/transportistas.dto';

@Injectable()
export class TransportistasService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.transportistas.findMany({ include: { servicios_envio: true, envios: true } })); }
  async findOne(id_transportista: number) { const item = await this.prisma.transportistas.findUnique({ where: { id_transportista }, include: { servicios_envio: true, envios: true } }); if (!item) throw new NotFoundException('Transportista no encontrado'); return serializeBigInts(item); }
  async create(dto: CreateTransportistaDto) { return serializeBigInts(await this.prisma.transportistas.create({ data: { codigo: dto.codigo.trim(), nombre: dto.nombre.trim(), paises_operacion: dto.paises_operacion, api_base_url: dto.api_base_url ?? null, notas_integracion: dto.notas_integracion ?? null, activo: dto.activo ?? true } })); }
  async update(id_transportista: number, dto: UpdateTransportistaDto) { return serializeBigInts(await this.prisma.transportistas.update({ where: { id_transportista }, data: { codigo: dto.codigo?.trim(), nombre: dto.nombre?.trim(), paises_operacion: dto.paises_operacion, api_base_url: dto.api_base_url, notas_integracion: dto.notas_integracion, activo: dto.activo } })); }
  async remove(id_transportista: number) { await this.prisma.transportistas.delete({ where: { id_transportista } }); return { message: 'Transportista eliminado' }; }
  async createServicio(dto: CreateServicioEnvioDto) { return serializeBigInts(await this.prisma.servicios_envio.create({ data: { id_transportista: dto.id_transportista, codigo_servicio: dto.codigo_servicio.trim(), nombre: dto.nombre.trim(), tiempo_estimado: dto.tiempo_estimado ?? null, es_internacional: dto.es_internacional ?? false, activo: dto.activo ?? true } })); }
  async updateServicio(id_servicio: number, dto: UpdateServicioEnvioDto) { return serializeBigInts(await this.prisma.servicios_envio.update({ where: { id_servicio }, data: { id_transportista: dto.id_transportista, codigo_servicio: dto.codigo_servicio?.trim(), nombre: dto.nombre?.trim(), tiempo_estimado: dto.tiempo_estimado, es_internacional: dto.es_internacional, activo: dto.activo } })); }
  async removeServicio(id_servicio: number) { await this.prisma.servicios_envio.delete({ where: { id_servicio } }); return { message: 'Servicio eliminado' }; }
}
