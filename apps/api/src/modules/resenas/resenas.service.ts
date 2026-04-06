import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateResenaDto, UpdateResenaDto } from './dto/resenas.dto';

@Injectable()
export class ResenasService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.resenas.findMany({ where: { eliminado_en: null }, include: { usuarios: true, productos: true } })); }
  async findOne(id: string) { const item = await this.prisma.resenas.findUnique({ where: { id_resena: toBigIntId(id) }, include: { usuarios: true, productos: true } }); if (!item || item.eliminado_en) throw new NotFoundException('Resena no encontrada'); return serializeBigInts(item); }
  async create(dto: CreateResenaDto) { return serializeBigInts(await this.prisma.resenas.create({ data: { id_usuario: dto.id_usuario, id_producto: dto.id_producto, calificacion: dto.calificacion, comentario: dto.comentario ?? null, idioma_comentario: dto.idioma_comentario ?? null, compra_verificada: dto.compra_verificada ?? false, respuesta_vendedor: dto.respuesta_vendedor ?? null } })); }
  async update(id: string, dto: UpdateResenaDto) { return serializeBigInts(await this.prisma.resenas.update({ where: { id_resena: toBigIntId(id) }, data: { id_usuario: dto.id_usuario, id_producto: dto.id_producto, calificacion: dto.calificacion, comentario: dto.comentario, idioma_comentario: dto.idioma_comentario, compra_verificada: dto.compra_verificada, respuesta_vendedor: dto.respuesta_vendedor } })); }
  async remove(id: string) { return serializeBigInts(await this.prisma.resenas.update({ where: { id_resena: toBigIntId(id) }, data: { eliminado_en: new Date() } })); }
}
