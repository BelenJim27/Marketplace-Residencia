import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async listByUsuario(id_usuario: string) {
    return serializeBigInts(
      await this.prisma.listaDeseosItem.findMany({
        where: { id_usuario },
        include: { producto: true },
        orderBy: { fecha_agregado: 'desc' },
      })
    );
  }

  async add(id_usuario: string, id_producto: string) {
    const existing = await this.prisma.listaDeseosItem.findUnique({
      where: {
        id_usuario_id_producto: {
          id_usuario,
          id_producto: toBigIntId(id_producto),
        },
      },
    });

    if (existing) {
      throw new ConflictException('El producto ya está en la lista de deseos');
    }

    return serializeBigInts(
      await this.prisma.listaDeseosItem.create({
        data: {
          id_usuario,
          id_producto: toBigIntId(id_producto),
        },
        include: { producto: true },
      })
    );
  }

  async remove(id_usuario: string, id_producto: string) {
    const deleted = await this.prisma.listaDeseosItem.deleteMany({
      where: {
        id_usuario,
        id_producto: toBigIntId(id_producto),
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Producto no encontrado en la lista de deseos');
    }

    return { message: 'Producto eliminado de la lista de deseos' };
  }

  async removeById(id: string) {
    await this.prisma.listaDeseosItem.delete({
      where: { id_item: toBigIntId(id) },
    });

    return { message: 'Producto eliminado de la lista de deseos' };
  }

  async check(id_usuario: string, id_producto: string) {
    const item = await this.prisma.listaDeseosItem.findUnique({
      where: {
        id_usuario_id_producto: {
          id_usuario,
          id_producto: toBigIntId(id_producto),
        },
      },
    });

    return { inWishlist: !!item };
  }
}