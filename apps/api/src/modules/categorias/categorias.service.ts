import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categorias.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() { return serializeBigInts(await this.prisma.categorias.findMany({ include: { categorias: true }, orderBy: { orden: 'asc' } })); }
  async findOne(id_categoria: number) { const item = await this.prisma.categorias.findUnique({ where: { id_categoria }, include: { categorias: true } }); if (!item) throw new NotFoundException('Categoria no encontrada'); return serializeBigInts(item); }

  async create(dto: CreateCategoriaDto) { 
    const idPadre = dto.id_padre === undefined || dto.id_padre === null || dto.id_padre === 0 ? null : dto.id_padre;
    try { return serializeBigInts(await this.prisma.categorias.create({ data: { id_padre: idPadre, nombre: dto.nombre.trim(), slug: dto.slug.trim(), descripcion: dto.descripcion ?? null, tipo: dto.tipo?.trim() ?? 'general', orden: dto.orden ?? 0, imagen_url: dto.imagen_url ?? null, activo: dto.activo ?? true } })); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Slug ya existe'); throw error; } 
  }

  async update(id_categoria: number, dto: UpdateCategoriaDto) { 
    const current = await this.prisma.categorias.findUnique({ where: { id_categoria } }); 
    if (!current) throw new NotFoundException('Categoria no encontrada'); 
    const idPadre = dto.id_padre === undefined ? undefined : (dto.id_padre === null || dto.id_padre === 0 ? null : dto.id_padre);
    return serializeBigInts(await this.prisma.categorias.update({ where: { id_categoria }, data: { id_padre: idPadre, nombre: dto.nombre?.trim(), slug: dto.slug?.trim(), descripcion: dto.descripcion, tipo: dto.tipo?.trim(), orden: dto.orden, imagen_url: dto.imagen_url, activo: dto.activo } })); 
  }

  async remove(id_categoria: number) { await this.prisma.categorias.updateMany({ where: { id_padre: id_categoria }, data: { id_padre: null } }); await this.prisma.categorias.delete({ where: { id_categoria } }); return { message: 'Categoria eliminada' }; }
}
