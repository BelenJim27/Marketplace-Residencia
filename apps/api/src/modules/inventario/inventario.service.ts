import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { serializeBigInts, toBigIntId } from "../shared/serialize";
import {
  CreateInventarioDto,
  CreateMovimientoInventarioDto,
  UpdateInventarioDto,
} from "./dto/inventario.dto";

@Injectable()
export class InventarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async listInventario() {
    const inventarios = await this.prisma.inventario.findMany({
      include: {
        productos: {
          include: {
            lotes: true,
          },
        },
      },
    });

    const items = await Promise.all(
      inventarios.map(async (inv) => {
        let nombre_producto = inv.productos?.nombre || "Sin nombre";
        let productor = "Sin productor";
        let region = "Sin región";

        if (inv.productos?.id_lote) {
          const lote = await this.prisma.lotes.findUnique({
            where: { id_lote: inv.productos.id_lote },
            include: { regiones: true },
          });
          if (lote) {
            const prod = await this.prisma.productores.findFirst({
              where: { id_productor: lote.id_productor },
            });
            if (prod) {
              const usuario = await this.prisma.usuarios.findUnique({
                where: { id_usuario: prod.id_usuario },
              });
              productor = usuario?.nombre || "Sin productor";
            }
            region = lote.regiones?.nombre || "Sin región";
          }
        }

        return {
          id_producto: String(inv.id_producto),
          nombre_producto,
          productor,
          region,
          stock: inv.stock,
          status: inv.productos?.status || "inactivo",
          imagen: inv.productos?.imagen_principal_url || null,
        };
      }),
    );

    const uniqueProductors = new Set(
      items.filter((i) => i.productor !== "Sin productor").map((i) => i.productor),
    );

    const summary = {
      productos_activos: items.filter((i) => i.status === "activo").length,
      productos_inactivos: items.filter((i) => i.status === "inactivo").length,
      total_productos: items.length,
      total_productores: uniqueProductors.size,
    };

    return serializeBigInts({ summary, items });
  }
  async getInventario(id: string) {
    const item = await this.prisma.inventario.findUnique({
      where: { id_inventario: toBigIntId(id) },
      include: { productos: true },
    });
    if (!item) throw new NotFoundException("Inventario no encontrado");
    return serializeBigInts(item);
  }
  async getByProducto(id_producto: string) {
    const item = await this.prisma.inventario.findFirst({
      where: { id_producto: toBigIntId(id_producto) },
      include: { productos: true },
    });
    if (!item) return null;
    return serializeBigInts(item);
  }
  async createInventario(dto: CreateInventarioDto) {
    return serializeBigInts(
      await this.prisma.inventario.create({
        data: {
          id_producto: dto.id_producto,
          stock: dto.stock,
          stock_minimo: dto.stock_minimo ?? 0,
        },
      }),
    );
  }
  async updateInventario(id: string, dto: UpdateInventarioDto) {
    const current = await this.prisma.inventario.findUnique({
      where: { id_inventario: toBigIntId(id) },
    });
    if (!current) throw new NotFoundException("Inventario no encontrado");

    const updated = await this.prisma.inventario.update({
      where: { id_inventario: toBigIntId(id) },
      data: {
        id_producto: dto.id_producto,
        stock: dto.stock,
        stock_minimo: dto.stock_minimo,
      },
    });

    const nuevoStock = dto.stock ?? current.stock;
    const minimo = dto.stock_minimo ?? current.stock_minimo;

    if (dto.stock !== undefined && nuevoStock <= minimo) {
      this.notifyProductorStockBajo(current.id_producto, nuevoStock).catch(() => {});
    }

    return serializeBigInts(updated);
  }

  private async notifyProductorStockBajo(id_producto: bigint, stock: number) {
    const producto = await this.prisma.productos.findUnique({
      where: { id_producto },
      select: {
        nombre: true,
        tiendas: {
          select: {
            productores: { select: { id_usuario: true } },
          },
        },
      },
    });
    if (!producto?.tiendas?.productores?.id_usuario) return;

    const id_usuario = producto.tiendas.productores.id_usuario;
    const mensaje = stock === 0
      ? `Tu producto "${producto.nombre}" se quedó sin existencias.`
      : `Tu producto "${producto.nombre}" tiene stock bajo (${stock} unidades restantes).`;

    await this.notificaciones.create({
      id_usuario,
      tipo: stock === 0 ? 'sin_existencias' : 'stock_bajo',
      titulo: stock === 0 ? 'Sin existencias' : 'Stock bajo',
      cuerpo: mensaje,
      url_accion: '/dashboard/productor/productos',
    });
  }
  async removeInventario(id: string) {
    await this.prisma.inventario.delete({
      where: { id_inventario: toBigIntId(id) },
    });
    return { message: "Inventario eliminado" };
  }

  async listMovimientos() {
    return serializeBigInts(
      await this.prisma.movimientos_inventario.findMany({
        include: { inventario: true, pedidos: true, usuarios: true },
      }),
    );
  }
  async createMovimiento(dto: CreateMovimientoInventarioDto) {
    return serializeBigInts(
      await this.prisma.movimientos_inventario.create({
        data: {
          id_inventario: dto.id_inventario,
          id_usuario: dto.id_usuario ?? null,
          tipo: dto.tipo.trim(),
          cantidad: dto.cantidad,
          stock_resultante: dto.stock_resultante,
          motivo: dto.motivo ?? null,
          id_pedido: dto.id_pedido ?? null,
        },
      }),
    );
  }
}
