import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateProductoDto, UpdateProductoDto } from './dto/productos.dto';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(
    token?: string,
    idProductor?: number,
    filtros?: {
      busqueda?: string;
      tipoMezcal?: string;
      maguey?: string;
      precioMin?: string;
      precioMax?: string;
      destilacion?: string;
      molienda?: string;
      maestroMezcalero?: string;
    },
  ) {
    const where: Prisma.productosWhereInput = {
      eliminado_en: null,
    };

    if (idProductor) {
      where.tiendas = { id_productor: idProductor };
    }

    if (filtros?.busqueda) {
      where.OR = [
        { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
        { descripcion: { contains: filtros.busqueda, mode: 'insensitive' } },
      ];
    }

    if (filtros?.precioMin || filtros?.precioMax) {
      where.precio_base = {};
      if (filtros.precioMin) {
        (where.precio_base as any).gte = new Prisma.Decimal(filtros.precioMin);
      }
      if (filtros.precioMax) {
        (where.precio_base as any).lte = new Prisma.Decimal(filtros.precioMax);
      }
    }

    const items = await this.prisma.productos.findMany({
      where,
      include: {
        tiendas: true,
        categorias_productos: { include: { categorias: true } },
        producto_imagenes: true,
      },
      orderBy: { creado_en: 'desc' },
    });

    return serializeBigInts(items);
  }

  async findOne(id: string) {
    const item = await this.prisma.productos.findUnique({
      where: { id_producto: BigInt(id) },
      include: {
        tiendas: true,
        categorias_productos: { include: { categorias: true } },
        producto_imagenes: true,
        resenas: true,
      },
    });

    if (!item || item.eliminado_en) {
      throw new NotFoundException('Producto no encontrado');
    }

    return serializeBigInts(item);
  }

  async create(dto: CreateProductoDto) {
    const data: Prisma.productosCreateInput = {
      nombre: dto.nombre,
      descripcion: dto.descripcion || null,
      traducciones: (dto.traducciones || {}) as any,
      precio_base: new Prisma.Decimal(dto.precio_base),
      metadata: (dto.metadata || {}) as any,
      status: dto.status || 'activo',
      imagen_principal_url: dto.imagen_principal_url || null,
      tiendas: { connect: { id_tienda: dto.id_tienda } },
    };

    if (dto.id_lote) {
      data.lotes = { connect: { id_lote: dto.id_lote } };
    }

    if (dto.peso_kg) {
      data.peso_kg = new Prisma.Decimal(dto.peso_kg);
    }

    if (dto.alto_cm) {
      data.alto_cm = new Prisma.Decimal(dto.alto_cm);
    }

    if (dto.ancho_cm) {
      data.ancho_cm = new Prisma.Decimal(dto.ancho_cm);
    }

    if (dto.largo_cm) {
      data.largo_cm = new Prisma.Decimal(dto.largo_cm);
    }

    const producto = await this.prisma.productos.create({
      data,
      include: {
        tiendas: true,
        categorias_productos: { include: { categorias: true } },
        producto_imagenes: true,
      },
    });

    // Crear asociaciones con categorías si se proporcionan
    if (dto.categorias && dto.categorias.length > 0) {
      await Promise.all(
        dto.categorias.map((id_categoria) =>
          this.prisma.categorias_productos.create({
            data: {
              id_producto: producto.id_producto,
              id_categoria,
            },
          }),
        ),
      );
    }

    // Crear imágenes adicionales si se proporcionan
    if (dto.imagenes && dto.imagenes.length > 0) {
      await Promise.all(
        dto.imagenes.map((img, index) =>
          this.prisma.producto_imagenes.create({
            data: {
              id_producto: producto.id_producto,
              url: img.url,
              orden: img.orden ?? index,
              es_principal: img.es_principal ?? false,
              alt_text: img.alt_text || null,
            },
          }),
        ),
      );
    }

    return serializeBigInts(producto);
  }

  async update(id: string, dto: UpdateProductoDto) {
    const current = await this.prisma.productos.findUnique({
      where: { id_producto: BigInt(id) },
    });

    if (!current || current.eliminado_en) {
      throw new NotFoundException('Producto no encontrado');
    }

    const data: Prisma.productosUpdateInput = {};

    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.traducciones !== undefined) data.traducciones = dto.traducciones as any;
    if (dto.precio_base !== undefined) data.precio_base = new Prisma.Decimal(dto.precio_base);
    if (dto.metadata !== undefined) data.metadata = dto.metadata as any;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.imagen_principal_url !== undefined) data.imagen_principal_url = dto.imagen_principal_url;
    if (dto.peso_kg !== undefined) data.peso_kg = dto.peso_kg ? new Prisma.Decimal(dto.peso_kg) : null;
    if (dto.alto_cm !== undefined) data.alto_cm = dto.alto_cm ? new Prisma.Decimal(dto.alto_cm) : null;
    if (dto.ancho_cm !== undefined) data.ancho_cm = dto.ancho_cm ? new Prisma.Decimal(dto.ancho_cm) : null;
    if (dto.largo_cm !== undefined) data.largo_cm = dto.largo_cm ? new Prisma.Decimal(dto.largo_cm) : null;

    const producto = await this.prisma.productos.update({
      where: { id_producto: BigInt(id) },
      data,
      include: {
        tiendas: true,
        categorias_productos: { include: { categorias: true } },
        producto_imagenes: true,
      },
    });

    // Actualizar categorías si se proporcionan
    if (dto.categorias && Array.isArray(dto.categorias)) {
      await this.prisma.categorias_productos.deleteMany({
        where: { id_producto: BigInt(id) },
      });

      if (dto.categorias.length > 0) {
        await Promise.all(
          dto.categorias.map((id_categoria) =>
            this.prisma.categorias_productos.create({
              data: {
                id_producto: BigInt(id),
                id_categoria,
              },
            }),
          ),
        );
      }
    }

    return serializeBigInts(producto);
  }

  async remove(id: string) {
    const current = await this.prisma.productos.findUnique({
      where: { id_producto: BigInt(id) },
    });

    if (!current || current.eliminado_en) {
      throw new NotFoundException('Producto no encontrado');
    }

    const producto = await this.prisma.productos.update({
      where: { id_producto: BigInt(id) },
      data: { eliminado_en: new Date() },
    });

    return serializeBigInts(producto);
  }
}