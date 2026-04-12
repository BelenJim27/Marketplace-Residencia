import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts, toBigIntId } from '../shared/serialize';
import { CreateProductoDto, UpdateProductoDto } from './dto/productos.dto';

export interface FiltrosProducto {
  busqueda?: string;
  tipoMezcal?: string;
  maguey?: string;
  precioMin?: string;
  precioMax?: string;
  destilacion?: string;
  molienda?: string;
  maestroMezcalero?: string;
}

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(id_productor?: number, filtros?: FiltrosProducto) {
    const where: Prisma.productosWhereInput = { eliminado_en: null };

    if (id_productor) {
      const stores = await this.prisma.tiendas.findMany({ where: { id_productor, eliminado_en: null }, select: { id_tienda: true } });
      const ids = stores.map((store) => store.id_tienda);
      where.id_tienda = { in: ids };
    }

    if (filtros?.busqueda) {
      where.OR = [
        { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
        { descripcion: { contains: filtros.busqueda, mode: 'insensitive' } },
      ];
    }

    if (filtros?.precioMin || filtros?.precioMax) {
      where.precio_base = {};
      if (filtros.precioMin) where.precio_base.gte = parseFloat(filtros.precioMin);
      if (filtros.precioMax) where.precio_base.lte = parseFloat(filtros.precioMax);
    }

    let productos = await this.prisma.productos.findMany({
      where,
      include: {
        producto_imagenes: true,
        producto_categoria: { include: { categorias: true } },
        lotes: { include: { productores: true } },
      },
    });

    if (filtros?.tipoMezcal || filtros?.maguey || filtros?.destilacion || filtros?.molienda || filtros?.maestroMezcalero) {
      productos = productos.filter((p) => {
        const lot = p.lotes;
        if (!lot) return true;

        const attrs = lot.datos_api as Record<string, string> || {};

        if (filtros.tipoMezcal && attrs.tipo_mezcal?.toLowerCase() !== filtros.tipoMezcal.toLowerCase()) return false;
        if (filtros.maguey && attrs.maguey?.toLowerCase() !== filtros.maguey.toLowerCase()) return false;
        if (filtros.destilacion && attrs.destilacion?.toLowerCase() !== filtros.destilacion.toLowerCase()) return false;
        if (filtros.molienda && attrs.molienda?.toLowerCase() !== filtros.molienda.toLowerCase()) return false;
        if (filtros.maestroMezcalero) {
          const maestro = lot.productores?.biografia || lot.productores?.otras_caracteristicas || '';
          if (!maestro.toLowerCase().includes(filtros.maestroMezcalero.toLowerCase())) return false;
        }

        return true;
      });
    }

    return serializeBigInts(mapProductoResponse(productos));
  }
  async findOne(id: string) { const item = await this.prisma.productos.findUnique({ where: { id_producto: toBigIntId(id) }, include: { producto_imagenes: true, producto_categoria: { include: { categorias: true } } } }); if (!item || item.eliminado_en) throw new NotFoundException('Producto no encontrado'); return serializeBigInts(mapProductoResponse(item)); }

  async create(dto: CreateProductoDto) {
    const created = await this.prisma.productos.create({
      data: {
        id_tienda: dto.id_tienda,
        id_lote: dto.id_lote ?? null,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion ?? null,
        traducciones: (dto.traducciones ?? {}) as Prisma.InputJsonValue,
        precio_base: dto.precio_base,
        moneda_base: dto.moneda_base?.trim() ?? 'MXN',
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        peso_kg: dto.peso_kg ?? null,
        alto_cm: dto.alto_cm ?? null,
        ancho_cm: dto.ancho_cm ?? null,
        largo_cm: dto.largo_cm ?? null,
        status: dto.status?.trim() ?? 'activo',
        creado_por: dto.creado_por ?? null,
        actualizado_por: dto.actualizado_por ?? null,
        imagen_principal_url: dto.imagen_principal_url ?? dto.imagen_url ?? null,
        producto_categoria: dto.categorias?.length ? { create: dto.categorias.map((id_categoria) => ({ id_categoria })) } : undefined,
        producto_imagenes: dto.imagenes?.length
          ? { create: dto.imagenes.map((item, index) => ({ url: item.url.trim(), orden: item.orden ?? index, es_principal: item.es_principal ?? index === 0, alt_text: item.alt_text ?? null })) }
          : undefined,
      },
      include: { producto_imagenes: true, producto_categoria: { include: { categorias: true } } },
    });

    return serializeBigInts(mapProductoResponse(created));
  }

  async update(id: string, dto: UpdateProductoDto) {
    const id_producto = toBigIntId(id);
    const current = await this.prisma.productos.findUnique({ where: { id_producto } });
    if (!current || current.eliminado_en) throw new NotFoundException('Producto no encontrado');

    const updated = await this.prisma.productos.update({
      where: { id_producto },
      data: {
        id_tienda: dto.id_tienda,
        id_lote: dto.id_lote ?? undefined,
        nombre: dto.nombre?.trim(),
        descripcion: dto.descripcion,
        traducciones: dto.traducciones as Prisma.InputJsonValue | undefined,
        precio_base: dto.precio_base,
        moneda_base: dto.moneda_base?.trim(),
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        peso_kg: dto.peso_kg,
        alto_cm: dto.alto_cm,
        ancho_cm: dto.ancho_cm,
        largo_cm: dto.largo_cm,
        status: dto.status?.trim(),
        creado_por: dto.creado_por,
        actualizado_por: dto.actualizado_por,
        imagen_principal_url: dto.imagen_principal_url ?? dto.imagen_url,
      },
      include: { producto_imagenes: true, producto_categoria: { include: { categorias: true } } },
    });

    if (dto.categorias) {
      await this.prisma.producto_categoria.deleteMany({ where: { id_producto } });
      await this.prisma.producto_categoria.createMany({ data: dto.categorias.map((id_categoria: number) => ({ id_producto, id_categoria })) });
    }
    if (dto.imagenes) {
      await this.prisma.producto_imagenes.deleteMany({ where: { id_producto } });
      await this.prisma.producto_imagenes.createMany({ data: dto.imagenes.map((item: { url: string; orden?: number; es_principal?: boolean; alt_text?: string }, index: number) => ({ id_producto, url: item.url.trim(), orden: item.orden ?? index, es_principal: item.es_principal ?? index === 0, alt_text: item.alt_text ?? null })) });
    }

    return serializeBigInts(mapProductoResponse(updated));
  }

  async remove(id: string) {
    const id_producto = toBigIntId(id);
    const current = await this.prisma.productos.findUnique({ where: { id_producto } });
    if (!current || current.eliminado_en) throw new NotFoundException('Producto no encontrado');
    return serializeBigInts(mapProductoResponse(await this.prisma.productos.update({ where: { id_producto }, data: { eliminado_en: new Date() } })));
  }
}

function mapProductoResponse<T extends { imagen_principal_url?: string | null } | Array<{ imagen_principal_url?: string | null }>>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((item) => ({ ...item, imagen_url: item.imagen_principal_url ?? null })) as unknown as T;
  }

  return {
    ...data,
    imagen_url: data.imagen_principal_url ?? null,
  } as T;
}
