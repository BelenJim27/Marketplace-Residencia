import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Moneda } from '@prisma/client';
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

    const inventario = await this.prisma.inventario.findFirst({
      where: { id_producto: productoId },
      select: { stock: true },
    });

    const stockDisponible = inventario ? Number(inventario.stock) : 0;

    const itemExistente = await this.prisma.carrito_item.findUnique({
      where: { id_usuario_id_producto: { id_usuario: usuarioId, id_producto: productoId } },
      select: { cantidad: true },
    });

    const cantidadActual = itemExistente ? Number(itemExistente.cantidad) : 0;
    const cantidadTotal = cantidadActual + dto.cantidad;

    if (cantidadTotal > stockDisponible) {
      throw new BadRequestException(`Stock insuficiente. Disponible: ${stockDisponible}, en carrito: ${cantidadActual}, solicitado: ${dto.cantidad}`);
    }

    return serializeBigInts(
      await this.prisma.carrito_item.upsert({
        where: { id_usuario_id_producto: { id_usuario: usuarioId, id_producto: productoId } },
        update: { cantidad: dto.cantidad, precio_unitario_snapshot: dto.precio_unitario_snapshot },
        create: { id_usuario: usuarioId, id_producto: productoId, cantidad: dto.cantidad, precio_unitario_snapshot: dto.precio_unitario_snapshot, moneda_snapshot: (dto.moneda_snapshot ?? 'MXN') as Moneda }
      })
    );
  }

  async update(id: string, dto: UpdateCarritoItemDto) {
    if (dto.cantidad !== undefined && dto.id_producto !== undefined) {
      const productoId = toBigIntId(dto.id_producto as any);
      const inventario = await this.prisma.inventario.findFirst({
        where: { id_producto: productoId },
        select: { stock: true },
      });
      const stockDisponible = inventario ? Number(inventario.stock) : 0;
      if (dto.cantidad > stockDisponible) {
        throw new BadRequestException(`Stock insuficiente. Disponible: ${stockDisponible}`);
      }
    }
    return serializeBigInts(await this.prisma.carrito_item.update({ where: { id_item: toBigIntId(id) }, data: { id_usuario: dto.id_usuario ? String(dto.id_usuario) : undefined, id_producto: dto.id_producto ? toBigIntId(dto.id_producto) : undefined, cantidad: dto.cantidad, precio_unitario_snapshot: dto.precio_unitario_snapshot, moneda_snapshot: dto.moneda_snapshot as Moneda | undefined } }));
  }
  async remove(id: string) { await this.prisma.carrito_item.delete({ where: { id_item: toBigIntId(id) } }); return { message: 'Item eliminado' }; }
  async clearByUser(id_usuario: string) { await this.prisma.carrito_item.deleteMany({ where: { id_usuario } }); return { message: 'Carrito limpiado' }; }
}
