import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { serializeBigInts } from "../shared/serialize";
import { CreateProductoDto, UpdateProductoDto } from "./dto/productos.dto";

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

type UsuarioNombre = {
  nombre?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
} | null;

type ProductoWithRelations = {
  [key: string]: any;
};

function buildNombreCompleto(usuario?: UsuarioNombre): string | null {
  if (!usuario?.nombre) return null;
  return [usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno]
    .filter(Boolean)
    .join(" ");
}

function getCategorias(item: ProductoWithRelations): string[] {
  const cats = item.categorias_productos;
  if (!cats || cats.length === 0) return [];
  return cats
    .map((cp: any) => cp.categorias?.nombre)
    .filter((n: string | undefined): n is string => !!n);
}

function getCategoriasFull(item: ProductoWithRelations): Array<{
  id_categoria: number;
  nombre: string;
  requiere_edad_minima: number | null;
}> {
  const cats = item.categorias_productos;
  if (!cats || cats.length === 0) return [];
  return cats
    .map((cp: any) => cp.categorias)
    .filter((c: any) => c && typeof c.id_categoria === 'number')
    .map((c: any) => ({
      id_categoria: c.id_categoria,
      nombre: c.nombre,
      requiere_edad_minima: c.requiere_edad_minima ?? null,
    }));
}

function computeEdadMinima(item: ProductoWithRelations): number | null {
  if (typeof item.requiere_edad_minima === 'number' && item.requiere_edad_minima > 0) {
    return item.requiere_edad_minima;
  }
  const ages: number[] = (item.categorias_productos ?? [])
    .map((cp: any) => cp.categorias?.requiere_edad_minima)
    .filter((v: any) => typeof v === 'number' && v > 0);
  return ages.length ? Math.max(...ages) : null;
}

function mapProductoResponse<
  T extends ProductoWithRelations | Array<ProductoWithRelations>,
>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((item) => ({
      ...item,
      imagen_url: item.imagen_principal_url ?? null,
      stock: getProductoStock(item.inventario),
      nombre_productor:
        buildNombreCompleto(item.lotes?.productores?.usuarios) ??
        buildNombreCompleto(item.tiendas?.productores?.usuarios) ??
        null,
      nombre_tienda: item.tiendas?.nombre ?? null,
      categorias: getCategorias(item),
      categoria: getCategorias(item)[0] ?? null,
      categorias_full: getCategoriasFull(item),
      edad_minima: computeEdadMinima(item),
    })) as unknown as T;
  }

  return {
    ...data,
    imagen_url: data.imagen_principal_url ?? null,
    stock: getProductoStock(data.inventario),
    nombre_productor:
      buildNombreCompleto(data.lotes?.productores?.usuarios) ??
      buildNombreCompleto(data.tiendas?.productores?.usuarios) ??
      null,
    nombre_tienda: data.tiendas?.nombre ?? null,
    categorias: getCategorias(data),
    categoria: getCategorias(data)[0] ?? null,
    categorias_full: getCategoriasFull(data),
    edad_minima: computeEdadMinima(data),
  } as T;
}

function getProductoStock(inventario?: Array<{ stock?: number | null }>) {
  return (inventario ?? []).reduce(
    (total, item) => total + Number(item.stock ?? 0),
    0,
  );
}

function getUserIdFromAccessToken(token: string) {
  const payload = token.split(".")[1];
  if (!payload) {
    throw new NotFoundException("Token inválido");
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    Math.ceil(normalized.length / 4) * 4,
    "=",
  );
  const decoded = Buffer.from(padded, "base64").toString("utf8");
  const parsed = JSON.parse(decoded) as { sub?: string };

  if (!parsed.sub) {
    throw new NotFoundException("Token inválido");
  }

  return parsed.sub;
}

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
    const where: Prisma.productosWhereInput = { eliminado_en: null };

    if (idProductor) {
      where.tiendas = { id_productor: idProductor };
    }

    if (filtros) {
      if (filtros.busqueda) {
        where.OR = [
          { nombre: { contains: filtros.busqueda, mode: "insensitive" } },
          { descripcion: { contains: filtros.busqueda, mode: "insensitive" } },
        ];
      }
      if (
        filtros.tipoMezcal ||
        filtros.maguey ||
        filtros.destilacion ||
        filtros.molienda ||
        filtros.maestroMezcalero
      ) {
        where.id_lote = { not: null };
      }
      if (filtros.precioMin || filtros.precioMax) {
        where.precio_base = {};
        if (filtros.precioMin)
          (where.precio_base as any).gte = new Prisma.Decimal(filtros.precioMin);
        if (filtros.precioMax)
          (where.precio_base as any).lte = new Prisma.Decimal(filtros.precioMax);
      }
    }

    const applyFiltersToProductos = (productos: any[]) => {
      if (!filtros) return productos;

      return productos.filter((p) => {
        const datosApi = p.lotes?.datos_api as Record<string, any> | undefined;

        if (filtros.tipoMezcal && datosApi?.tipo_mezcal !== filtros.tipoMezcal)
          return false;
        if (filtros.maguey && datosApi?.maguey !== filtros.maguey) return false;
        if (filtros.destilacion && datosApi?.destilacion !== filtros.destilacion)
          return false;
        if (filtros.molienda && datosApi?.molienda !== filtros.molienda)
          return false;
        if (filtros.maestroMezcalero) {
          const maestro =
            datosApi?.maestro_mezcalero || datosApi?.maestro || "";
          if (
            !maestro
              .toLowerCase()
              .includes(filtros.maestroMezcalero.toLowerCase())
          )
            return false;
        }

        return true;
      });
    };

    if (token) {
      const id_usuario = getUserIdFromAccessToken(token);
      const productor = await this.prisma.productores.findFirst({
        where: { id_usuario, eliminado_en: null },
        select: { id_productor: true },
      });

      if (!productor) return [];

      const stores = await this.prisma.tiendas.findMany({
        where: { id_productor: productor.id_productor, eliminado_en: null },
        select: { id_tienda: true },
      });

      const ids = stores.map((store) => store.id_tienda);
      const productos = ids.length
        ? await this.prisma.productos.findMany({
            where: { ...where, id_tienda: { in: ids } },
            include: productoInclude as any,
          })
        : [];

      return serializeBigInts(
        mapProductoResponse(applyFiltersToProductos(productos)),
      );
    }

    // Vista pública: solo productos con lote asociado (que vienen de API externa)
    const items = await this.prisma.productos.findMany({
      where: {
        ...where,
        id_lote: { not: null }, // Solo productos vinculados a lotes
      },
      include: productoInclude as any,
      orderBy: { creado_en: 'desc' },
    });

    return serializeBigInts(
      mapProductoResponse(applyFiltersToProductos(items)),
    );
  }

  async findOne(id: string) {
    const item = await this.prisma.productos.findUnique({
      where: { id_producto: BigInt(id) },
      include: {
        tiendas: {
          include: {
            productores: {
              include: {
                usuarios: {
                  select: {
                    nombre: true,
                    apellido_paterno: true,
                    apellido_materno: true,
                  },
                },
              },
            },
          },
        },
        lotes: {
          select: {
            id_lote: true,
            id_productor: true,
            codigo_lote: true,
            sitio: true,
            grado_alcohol: true,
            nombre_comun: true,
            nombre_cientifico: true,
            unidades: true,
            fecha_elaboracion: true,
            estado_lote: true,
            descripcion: true,
            marca: true,
            url_trazabilidad: true,
            datos_api: true,
            productores: {
              select: {
                biografia: true,
                otras_caracteristicas: true,
                usuarios: {
                  select: {
                    nombre: true,
                    apellido_paterno: true,
                    apellido_materno: true,
                  },
                },
              },
            },
          },
        },
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
    const data: any = {
      id_tienda: dto.id_tienda,
      id_lote: dto.id_lote ?? null,
      nombre: dto.nombre,
      descripcion: dto.descripcion || null,
      traducciones: (dto.traducciones || {}) as Prisma.InputJsonValue,
      precio_base: new Prisma.Decimal(dto.precio_base),
      moneda_base: dto.moneda_base?.trim() ?? "MXN",
      metadata: (dto.metadata || {}) as Prisma.InputJsonValue,
      peso_kg: dto.peso_kg ? new Prisma.Decimal(dto.peso_kg) : null,
      alto_cm: dto.alto_cm ? new Prisma.Decimal(dto.alto_cm) : null,
      ancho_cm: dto.ancho_cm ? new Prisma.Decimal(dto.ancho_cm) : null,
      largo_cm: dto.largo_cm ? new Prisma.Decimal(dto.largo_cm) : null,
      status: dto.status || 'activo',
      creado_por: dto.creado_por ?? null,
      actualizado_por: dto.actualizado_por ?? null,
      imagen_principal_url: dto.imagen_principal_url ?? (dto as any).imagen_url ?? null,
    };

    const producto = await this.prisma.productos.create({
      data,
      include: {
        tiendas: true,
        categorias_productos: { include: { categorias: true } },
        producto_imagenes: true,
      },
    });

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

  async findSinLote() {
    const total = await this.prisma.productos.count();
    const sinLote = await this.prisma.productos.count({ where: { id_lote: null } });
    const conLote = await this.prisma.productos.count({ where: { id_lote: { not: null } } });

    const productosAffectados = await this.prisma.productos.findMany({
      where: { id_lote: null },
      select: {
        id_producto: true,
        nombre: true,
        tiendas: { select: { nombre: true, productores: { select: { usuarios: { select: { nombre: true } } } } } }
      },
      take: 50,
    });

    return {
      resumen: {
        total,
        sinLote,
        conLote,
        porcentajeSinLote: total > 0 ? ((sinLote / total) * 100).toFixed(2) : '0.00',
      },
      productos: productosAffectados.map(p => ({
        id: p.id_producto,
        nombre: p.nombre,
        tienda: p.tiendas?.nombre || 'N/A',
        productor: p.tiendas?.productores?.usuarios?.nombre || 'N/A',
      })),
    };
  }
}

const productoInclude = {
  inventario: {
    select: {
      stock: true,
    },
  },
  producto_imagenes: {
    select: {
      url: true,
      orden: true,
      es_principal: true,
    },
    orderBy: {
      orden: "asc" as const,
    },
  },
  categorias_productos: {
    include: {
      categorias: {
        select: {
          id_categoria: true,
          nombre: true,
          requiere_edad_minima: true,
        },
      },
    },
  },
  lotes: {
    select: {
      id_productor: true,
      datos_api: true,
      codigo_lote: true,
      sitio: true,
      grado_alcohol: true,
      nombre_comun: true,
      nombre_cientifico: true,
      unidades: true,
      fecha_elaboracion: true,
      estado_lote: true,
      descripcion: true,
      marca: true,
      url_trazabilidad: true,
      productores: {
        select: {
          biografia: true,
          otras_caracteristicas: true,
          usuarios: {
            select: {
              nombre: true,
              apellido_paterno: true,
              apellido_materno: true,
            },
          },
        },
      },
    },
  },
  tiendas: {
    select: {
      nombre: true,
      descripcion: true,
      ciudad_origen: true,
      estado_origen: true,
      pais_operacion: true,
      nombre_contacto: true,
      telefono_contacto: true,
      productores: {
        select: {
          usuarios: {
            select: {
              nombre: true,
              apellido_paterno: true,
              apellido_materno: true,
            },
          },
        },
      },
    },
  },
};
