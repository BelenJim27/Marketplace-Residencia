import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateAlmacenDto, CreateInventarioDto, CreateMovimientoInventarioDto, UpdateAlmacenDto, UpdateInventarioDto } from './dto/inventario.dto';

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  async listInventario() { return serializeBigInts(await this.prisma.inventario.findMany({ include: { almacenes: true, productos: true } })); }
  async getInventario(id: string) { const item = await this.prisma.inventario.findUnique({ where: { id_inventario: toBigIntId(id) }, include: { almacenes: true, productos: true } }); if (!item) throw new NotFoundException('Inventario no encontrado'); return serializeBigInts(item); }
  async createInventario(dto: CreateInventarioDto) { return serializeBigInts(await this.prisma.inventario.create({ data: { id_producto: dto.id_producto, id_almacen: dto.id_almacen, stock: dto.stock, stock_minimo: dto.stock_minimo ?? 0 } })); }
  async updateInventario(id: string, dto: UpdateInventarioDto) { return serializeBigInts(await this.prisma.inventario.update({ where: { id_inventario: toBigIntId(id) }, data: { id_producto: dto.id_producto, id_almacen: dto.id_almacen, stock: dto.stock, stock_minimo: dto.stock_minimo } })); }
  async removeInventario(id: string) { await this.prisma.inventario.delete({ where: { id_inventario: toBigIntId(id) } }); return { message: 'Inventario eliminado' }; }

  async listAlmacenes() { return serializeBigInts(await this.prisma.almacenes.findMany({ where: { eliminado_en: null } })); }
  async getAlmacen(id: string) { const item = await this.prisma.almacenes.findUnique({ where: { id_almacen: toBigIntId(id) } }); if (!item || item.eliminado_en) throw new NotFoundException('Almacen no encontrado'); return serializeBigInts(item); }
  async createAlmacen(dto: CreateAlmacenDto) { return serializeBigInts(await this.prisma.almacenes.create({ data: { nombre: dto.nombre.trim(), ubicacion: (dto.ubicacion ?? {}) as Prisma.InputJsonValue, pais_iso2: dto.pais_iso2 ?? null, activo: dto.activo ?? true } })); }
  async updateAlmacen(id: string, dto: UpdateAlmacenDto) { return serializeBigInts(await this.prisma.almacenes.update({ where: { id_almacen: toBigIntId(id) }, data: { nombre: dto.nombre?.trim(), ubicacion: dto.ubicacion as Prisma.InputJsonValue | undefined, pais_iso2: dto.pais_iso2, activo: dto.activo } })); }
  async removeAlmacen(id: string) { return serializeBigInts(await this.prisma.almacenes.update({ where: { id_almacen: toBigIntId(id) }, data: { eliminado_en: new Date() } })); }

  async listMovimientos() { return serializeBigInts(await this.prisma.movimientos_inventario.findMany({ include: { inventario: true, pedidos: true, usuarios: true } })); }
  async createMovimiento(dto: CreateMovimientoInventarioDto) { return serializeBigInts(await this.prisma.movimientos_inventario.create({ data: { id_inventario: dto.id_inventario, id_usuario: dto.id_usuario ?? null, tipo: dto.tipo.trim(), cantidad: dto.cantidad, stock_resultante: dto.stock_resultante, motivo: dto.motivo ?? null, id_pedido: dto.id_pedido ?? null } })); }
}
