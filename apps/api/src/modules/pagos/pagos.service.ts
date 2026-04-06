import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateMonedaDto, CreatePagoDto, UpdateMonedaDto, UpdatePagoDto } from './dto/pagos.dto';

@Injectable()
export class PagosService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return serializeBigInts(await this.prisma.pagos.findMany({ include: { pedidos: true, monedas: true } })); }
  async findOne(id_pago: string) { const item = await this.prisma.pagos.findUnique({ where: { id_pago: toBigIntId(id_pago) }, include: { pedidos: true, monedas: true } }); if (!item) throw new NotFoundException('Pago no encontrado'); return serializeBigInts(item); }
  async create(dto: CreatePagoDto) { return serializeBigInts(await this.prisma.pagos.create({ data: { id_pedido: toBigIntId(dto.id_pedido), proveedor: dto.proveedor ?? null, payment_intent_id: dto.payment_intent_id ?? null, estado: dto.estado?.trim() ?? 'pendiente', monto: dto.monto, moneda: dto.moneda } })); }
  async update(id_pago: string, dto: UpdatePagoDto) { return serializeBigInts(await this.prisma.pagos.update({ where: { id_pago: toBigIntId(id_pago) }, data: { id_pedido: dto.id_pedido ? toBigIntId(dto.id_pedido) : undefined, proveedor: dto.proveedor, payment_intent_id: dto.payment_intent_id, estado: dto.estado?.trim(), monto: dto.monto, moneda: dto.moneda } })); }
  async remove(id_pago: string) { await this.prisma.pagos.delete({ where: { id_pago: toBigIntId(id_pago) } }); return { message: 'Pago eliminado' }; }
  async listMonedas() { return serializeBigInts(await this.prisma.monedas.findMany()); }
  async createMoneda(dto: CreateMonedaDto) { return serializeBigInts(await this.prisma.monedas.create({ data: { codigo: dto.codigo.trim(), nombre: dto.nombre.trim(), simbolo: dto.simbolo ?? null, activo: dto.activo ?? true } })); }
  async updateMoneda(codigo: string, dto: UpdateMonedaDto) { return serializeBigInts(await this.prisma.monedas.update({ where: { codigo }, data: { codigo: dto.codigo?.trim(), nombre: dto.nombre?.trim(), simbolo: dto.simbolo, activo: dto.activo } })); }
  async removeMoneda(codigo: string) { await this.prisma.monedas.delete({ where: { codigo } }); return { message: 'Moneda eliminada' }; }
}
