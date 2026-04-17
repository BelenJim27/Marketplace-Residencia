import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';

const { Client } = require('pg');

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async listByUsuario(id_usuario: string) {
    const client = this.createPgClient();

    try {
      await client.connect();
      const result = await client.query(
        `
          SELECT
            ldi.id_item,
            ldi.id_producto,
            ldi.fecha_agregado,
            p.nombre AS producto_nombre,
            p.precio_base,
            p.imagen_principal_url,
            COALESCE(
              json_agg(json_build_object('url', pi.url) ORDER BY pi.orden) FILTER (WHERE pi.id_imagen IS NOT NULL),
              '[]'::json
            ) AS producto_imagenes
          FROM lista_deseos_item ldi
          INNER JOIN productos p ON p.id_producto = ldi.id_producto
          LEFT JOIN producto_imagenes pi ON pi.id_producto = p.id_producto
          WHERE ldi.id_usuario = $1
          GROUP BY ldi.id_item, ldi.id_producto, ldi.fecha_agregado, p.id_producto
          ORDER BY ldi.fecha_agregado DESC
        `,
        [id_usuario],
      );

      return result.rows.map((row: any) => ({
        id_item: row.id_item,
        id_producto: row.id_producto,
        fecha_agregado: row.fecha_agregado,
        producto: {
          nombre: row.producto_nombre,
          precio_base: row.precio_base,
          imagen_principal_url: row.imagen_principal_url,
          producto_imagenes: row.producto_imagenes,
        },
      }));
    } finally {
      await client.end();
    }
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

  private createPgClient() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL no está configurada');
    }

    return new Client({ connectionString: process.env.DATABASE_URL }) as any;
  }
}
