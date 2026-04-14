import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateInventarioDto, CreateMovimientoInventarioDto, UpdateInventarioDto } from './dto/inventario.dto';

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  async listInventario() { return serializeBigInts(await this.prisma.inventario.findMany({ include: { productos: true } })); }
  async getInventario(id: string) { const item = await this.prisma.inventario.findUnique({ where: { id_inventario: toBigIntId(id) }, include: { productos: true } }); if (!item) throw new NotFoundException('Inventario no encontrado'); return serializeBigInts(item); }
  async getByProducto(id_producto: string) { const item = await this.prisma.inventario.findFirst({ where: { id_producto: toBigIntId(id_producto) }, include: { productos: true } }); if (!item) return null; return serializeBigInts(item); }
  async createInventario(dto: CreateInventarioDto) { return serializeBigInts(await this.prisma.inventario.create({ data: { id_producto: dto.id_producto, stock: dto.stock, stock_minimo: dto.stock_minimo ?? 0 } })); }
  async updateInventario(id: string, dto: UpdateInventarioDto) { return serializeBigInts(await this.prisma.inventario.update({ where: { id_inventario: toBigIntId(id) }, data: { id_producto: dto.id_producto, stock: dto.stock, stock_minimo: dto.stock_minimo } })); }
  async removeInventario(id: string) { await this.prisma.inventario.delete({ where: { id_inventario: toBigIntId(id) } }); return { message: 'Inventario eliminado' }; }

  async listMovimientos() { return serializeBigInts(await this.prisma.movimientos_inventario.findMany({ include: { inventario: true, pedidos: true, usuarios: true } })); }
  async createMovimiento(dto: CreateMovimientoInventarioDto) { return serializeBigInts(await this.prisma.movimientos_inventario.create({ data: { id_inventario: dto.id_inventario, id_usuario: dto.id_usuario ?? null, tipo: dto.tipo.trim(), cantidad: dto.cantidad, stock_resultante: dto.stock_resultante, motivo: dto.motivo ?? null, id_pedido: dto.id_pedido ?? null } })); }
}