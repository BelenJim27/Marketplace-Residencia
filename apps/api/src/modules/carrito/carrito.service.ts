import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateCarritoItemDto, UpdateCarritoItemDto } from './dto/carrito.dto';

@Injectable()
export class CarritoService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.carrito_item.findMany({ include: { usuarios: true, productos: true } })); }
  async findByUser(id_usuario: string) { return serializeBigInts(await this.prisma.carrito_item.findMany({ where: { id_usuario }, include: { productos: true } })); }
  async create(dto: CreateCarritoItemDto) {
    const usuarioId = String(dto.id_usuario);
    const productoId = toBigIntId(dto.id_producto);
    return serializeBigInts(
      await this.prisma.carrito_item.upsert({
        where: { id_usuario_id_producto: { id_usuario: usuarioId, id_producto: productoId } },
        update: { cantidad: { increment: dto.cantidad }, precio_unitario_snapshot: dto.precio_unitario_snapshot },
        create: { id_usuario: usuarioId, id_producto: productoId, cantidad: dto.cantidad, precio_unitario_snapshot: dto.precio_unitario_snapshot, moneda_snapshot: dto.moneda_snapshot ?? 'MXN' }
      })
    );
  }
  async update(id: string, dto: UpdateCarritoItemDto) { return serializeBigInts(await this.prisma.carrito_item.update({ where: { id_item: toBigIntId(id) }, data: { id_usuario: dto.id_usuario ? String(dto.id_usuario) : undefined, id_producto: dto.id_producto ? toBigIntId(dto.id_producto) : undefined, cantidad: dto.cantidad, precio_unitario_snapshot: dto.precio_unitario_snapshot, moneda_snapshot: dto.moneda_snapshot } })); }
  async remove(id: string) { await this.prisma.carrito_item.delete({ where: { id_item: toBigIntId(id) } }); return { message: 'Item eliminado' }; }
  async clearByUser(id_usuario: string) { await this.prisma.carrito_item.deleteMany({ where: { id_usuario } }); return { message: 'Carrito limpiado' }; }
}
