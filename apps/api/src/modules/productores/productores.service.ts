import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateProductorDto, CreateRegionDto, UpdateProductorDto, UpdateRegionDto } from './dto/productores.dto';

@Injectable()
export class ProductoresService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.productores.findMany({ where: { eliminado_en: null }, include: { usuarios: true, regiones: true, lotes: true, tiendas: true } })); }
  async findOne(id_productor: number) { const item = await this.prisma.productores.findUnique({ where: { id_productor }, include: { usuarios: true, regiones: true, lotes: true, tiendas: true } }); if (!item || item.eliminado_en) throw new NotFoundException('Productor no encontrado'); return serializeBigInts(item); }
  async create(dto: CreateProductorDto) { return serializeBigInts(await this.prisma.productores.create({ data: { id_usuario: dto.id_usuario, id_region: dto.id_region ?? null, descripcion: dto.descripcion ?? null, biografia: dto.biografia ?? null, otras_caracteristicas: dto.otras_caracteristicas ?? null } })); }
  async update(id_productor: number, dto: UpdateProductorDto) { return serializeBigInts(await this.prisma.productores.update({ where: { id_productor }, data: { id_usuario: dto.id_usuario, id_region: dto.id_region ?? undefined, descripcion: dto.descripcion, biografia: dto.biografia, otras_caracteristicas: dto.otras_caracteristicas } })); }
  async remove(id_productor: number) { return serializeBigInts(await this.prisma.productores.update({ where: { id_productor }, data: { eliminado_en: new Date() } })); }
  async listRegiones() { return serializeBigInts(await this.prisma.regiones.findMany({ include: { lotes: false, productores: false } })); }
  async createRegion(dto: CreateRegionDto) { return serializeBigInts(await this.prisma.regiones.create({ data: { nombre: dto.nombre.trim(), estado_prov: dto.estado_prov ?? null, pais_iso2: dto.pais_iso2?.trim() ?? 'MX', activo: dto.activo ?? true } })); }
  async updateRegion(id_region: number, dto: UpdateRegionDto) { return serializeBigInts(await this.prisma.regiones.update({ where: { id_region }, data: { nombre: dto.nombre?.trim(), estado_prov: dto.estado_prov, pais_iso2: dto.pais_iso2?.trim(), activo: dto.activo } })); }
  async removeRegion(id_region: number) { await this.prisma.regiones.delete({ where: { id_region } }); return { message: 'Region eliminada' }; }
}
