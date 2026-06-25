import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../../prisma/prisma.service";
import { serializeBigInts } from "../../common/utilities/serialize";
import { deleteLocalUpload } from "../../common/utilities/local-upload";
import { CreateProductoDto, UpdateProductoDto } from "./dto/productos.dto";
import { PERMISOS } from "../../common/permisos-catalog";

/** Usuario autenticado resuelto por AuthGuard desde el JWT. */
export interface RequestUser {
  id_usuario: string;
  id_productor: number | null;
  roles?: string[];
  permisos?: string[];
}

function isAdmin(user?: RequestUser): boolean {
  return user?.permisos?.includes(PERMISOS.GESTIONAR_PRODUCTOS) ?? false;
}

export interface FiltrosProducto {
  busqueda?: string;
  tipoMezcal?: string;
  maguey?: string;
  precioMin?: string;
  precioMax?: string;
  destilacion?: string;
  molienda?: string;
  maestroMezcalero?: string;
  categorias?: string;
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
      stock_minimo: item.inventario?.[0]?.stock_minimo ?? 0,
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
    stock_minimo: data.inventario?.[0]?.stock_minimo ?? 0,
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

function getUserIdFromAccessToken(token: string): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new UnauthorizedException("JWT_ACCESS_SECRET no configurado");
  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] }) as {
      sub?: string;
      token_type?: string;
    };
    if (payload.token_type !== "access" || !payload.sub) {
      throw new UnauthorizedException("Token inválido");
    }
    return payload.sub;
  } catch (err) {
    if (err instanceof UnauthorizedException) throw err;
    throw new UnauthorizedException("Token inválido o expirado");
  }
}

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) { }

  // Cache en memoria del catálogo público sin filtros (el caso más frecuente).
  // Se invalida en create/update/remove o expira por TTL.
  private static readonly PUBLIC_CATALOG_TTL_MS = 60_000;
  private publicCatalogCache: { data: unknown; expires: number } | null = null;

  private invalidatePublicCatalogCache() {
    this.publicCatalogCache = null;
  }

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
      categorias?: string;
    },
    limit = 200,
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
      if (filtros.categorias) {
        const ids = filtros.categorias.split(',').map(Number).filter(Boolean);
        if (ids.length > 0) {
          where.categorias_productos = { some: { id_categoria: { in: ids } } };
        }
      }
    }

    const normalizar = (str: string) =>
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const matchesFilter = (filterValue: string | undefined, dataValue: string | undefined): boolean => {
      if (!filterValue) return true;
      const values = filterValue.split(',').map(v => normalizar(v)).filter(Boolean);
      if (values.length === 0) return true;
      const normalData = normalizar(dataValue ?? '');
      return values.some(v => normalData.includes(v) || v.includes(normalData));
    };

    const applyFiltersToProductos = (productos: any[]) => {
      if (!filtros) return productos;

      return productos.filter((p) => {
        const datosApi = p.lotes?.datos_api as Record<string, any> | undefined;

        if (!matchesFilter(filtros.tipoMezcal, datosApi?.tipo_mezcal)) return false;
        if (!matchesFilter(filtros.maguey, datosApi?.maguey)) return false;
        if (!matchesFilter(filtros.destilacion, datosApi?.destilacion)) return false;
        if (!matchesFilter(filtros.molienda, datosApi?.molienda)) return false;
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
          select: productorProductSelect as any,
        })
        : [];

      return serializeBigInts(
        mapProductoResponse(applyFiltersToProductos(productos)),
      );
    }

    // Vista pública: solo productos activos con stock disponible.
    // El catálogo por defecto (sin productor, sin búsqueda ni filtros) se cachea
    // en memoria por un TTL corto para evitar rehacer la query en cada request.
    const sinFiltros =
      !idProductor &&
      !filtros?.busqueda &&
      !filtros?.tipoMezcal &&
      !filtros?.maguey &&
      !filtros?.precioMin &&
      !filtros?.precioMax &&
      !filtros?.destilacion &&
      !filtros?.molienda &&
      !filtros?.maestroMezcalero &&
      !filtros?.categorias;
    const cacheable = sinFiltros && limit >= 200;

    if (
      cacheable &&
      this.publicCatalogCache &&
      this.publicCatalogCache.expires > Date.now()
    ) {
      return this.publicCatalogCache.data;
    }

    const items = await this.prisma.productos.findMany({
      where: {
        ...where,
        status: 'activo',
        inventario: { some: { stock: { gt: 0 } } },
      },
      select: productoListSelect as any,
      orderBy: { creado_en: 'desc' },
      take: Math.min(limit, 200),
    });

    // Excluir productos sin precio o sin imagen de la vista del cliente
    const itemsPublicos = items.filter((p: any) => {
      // Precio: Prisma devuelve Decimal, convertir a número con parseFloat
      const precio = parseFloat(String(p.precio_base ?? '0'));
      if (isNaN(precio) || precio <= 0) return false;

      // Imagen: verificar campo directo y tabla relacionada producto_imagenes
      const urlsDirectas = [p.imagen_principal_url].filter(
        (u): u is string => typeof u === 'string' && u.trim() !== '',
      );
      const urlsRelacionadas: string[] = (p.producto_imagenes ?? [])
        .map((img: any) => img.url)
        .filter((u: any): u is string => typeof u === 'string' && u.trim() !== '');

      const todasUrls = [...urlsDirectas, ...urlsRelacionadas];
      if (todasUrls.length === 0) return false;

      return true;
    });

    const resultado = serializeBigInts(
      mapProductoResponse(applyFiltersToProductos(itemsPublicos)),
    );

    if (cacheable) {
      this.publicCatalogCache = {
        data: resultado,
        expires: Date.now() + ProductosService.PUBLIC_CATALOG_TTL_MS,
      };
    }

    return resultado;
  }

  /**
   * Alertas de stock calculadas en el servidor (fuente autoritativa).
   * El productor se resuelve desde el token — nunca se confía en un id externo —
   * y solo se devuelven productos de sus propias tiendas. Sustituye el cálculo
   * que antes hacía el frontend para que toda alerta venga verificada del backend.
   *
   * Umbral: stock <= stock_minimo del producto (fallback a 10 si no hay mínimo
   * configurado, conservando el comportamiento histórico).
   */
  async getAlertasStock(token?: string) {
    if (!token) return [];

    const id_usuario = getUserIdFromAccessToken(token);
    const productor = await this.prisma.productores.findFirst({
      where: { id_usuario, eliminado_en: null },
      select: { id_productor: true },
    });
    if (!productor) return [];

    const stores = await this.prisma.tiendas.findMany({
      where: { id_productor: productor.id_productor, eliminado_en: null },
      select: { id_tienda: true, nombre: true },
    });
    if (stores.length === 0) return [];

    const storeMap = new Map(
      stores.map((s) => [
        Number(s.id_tienda),
        s.nombre ?? `Tienda #${Number(s.id_tienda)}`,
      ]),
    );

    const productos = await this.prisma.productos.findMany({
      where: {
        id_tienda: { in: stores.map((s) => s.id_tienda) },
        eliminado_en: null,
      },
      select: {
        id_producto: true,
        nombre: true,
        id_tienda: true,
        inventario: { select: { stock: true, stock_minimo: true } },
      },
    });

    const alertas = productos
      .map((p) => {
        const stock = getProductoStock(p.inventario);
        const minimo = Number(p.inventario?.[0]?.stock_minimo ?? 0) || 10;
        if (stock > minimo) return null;
        const tipo: "sin_existencias" | "stock_bajo" =
          stock === 0 ? "sin_existencias" : "stock_bajo";
        return {
          id: `alert-${Number(p.id_producto)}`,
          id_producto: Number(p.id_producto),
          tipo,
          producto: p.nombre ?? "Producto sin nombre",
          tienda:
            storeMap.get(Number(p.id_tienda)) ??
            `Tienda #${Number(p.id_tienda)}`,
          stock_actual: stock,
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);

    alertas.sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === "sin_existencias" ? -1 : 1;
      return a.producto.localeCompare(b.producto);
    });

    return alertas;
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
        inventario: { select: { stock: true, stock_minimo: true } },
      },
    });

    if (!item || item.eliminado_en) {
      throw new NotFoundException('Producto no encontrado');
    }

    return serializeBigInts(mapProductoResponse(item));
  }

  /** Valida que las dimensiones de envío sean números > 0 (no solo presentes). */
  private dimensionesValidas(...vals: (string | number | null | undefined)[]): boolean {
    return vals.every((v) => v != null && v !== '' && Number(v) > 0);
  }

  /**
   * Verifica que el usuario autenticado sea dueño del recurso (o admin).
   * El dueño de un producto es el productor de su tienda (o de su lote como fallback).
   * Evita BOLA: que un productor edite/elimine productos de otro.
   */
  private ensureCanManage(ownerProductorId: number | null | undefined, user?: RequestUser): void {
    if (isAdmin(user)) return;
    if (ownerProductorId == null || user?.id_productor == null || ownerProductorId !== user.id_productor) {
      throw new ForbiddenException('No tienes permiso para gestionar este producto.');
    }
  }

  async create(dto: CreateProductoDto, user?: RequestUser) {
    // Anti-BOLA: un productor solo puede crear productos en su propia tienda.
    if (!isAdmin(user)) {
      const tienda = await this.prisma.tiendas.findUnique({
        where: { id_tienda: dto.id_tienda },
        select: { id_productor: true },
      });
      if (!tienda) throw new NotFoundException('Tienda no encontrada');
      this.ensureCanManage(tienda.id_productor, user);
    }

    if (dto.id_lote) {
      const loteOcupado = await this.prisma.productos.findFirst({
        where: { id_lote: dto.id_lote },
        select: { id_producto: true },
      });
      if (loteOcupado) {
        throw new BadRequestException(
          'Este lote ya tiene un producto asignado. Solo se permite un producto por lote.',
        );
      }
    }

    const data: any = {
      id_tienda: dto.id_tienda,
      id_lote: dto.id_lote ?? null,
      nombre: dto.nombre,
      descripcion: dto.descripcion || null,
      traducciones: (dto.traducciones || {}) as Prisma.InputJsonValue,
      precio_base: new Prisma.Decimal(dto.precio_base),
      moneda_base: dto.moneda_base?.trim() ?? "MXN",
      metadata: (dto.metadata || {}) as Prisma.InputJsonValue,
      peso_kg: dto.peso_kg != null ? new Prisma.Decimal(dto.peso_kg) : null,
      alto_cm: dto.alto_cm != null ? new Prisma.Decimal(dto.alto_cm) : null,
      ancho_cm: dto.ancho_cm != null ? new Prisma.Decimal(dto.ancho_cm) : null,
      largo_cm: dto.largo_cm != null ? new Prisma.Decimal(dto.largo_cm) : null,
      botellas_350ml: dto.botellas_350ml != null ? Number(dto.botellas_350ml) : null,
      botellas_750ml: dto.botellas_750ml != null ? Number(dto.botellas_750ml) : null,
      status: dto.status || 'activo',
      creado_por: dto.creado_por ?? null,
      actualizado_por: dto.actualizado_por ?? null,
      imagen_principal_url: dto.imagen_principal_url ?? (dto as any).imagen_url ?? null,
    };

    // Require shipping dimensions when activating a product (not on borrador/inactivo)
    const targetStatus = (data.status as string) ?? 'activo';
    if (targetStatus !== 'borrador' && targetStatus !== 'inactivo') {
      if (!this.dimensionesValidas(dto.peso_kg, dto.alto_cm, dto.ancho_cm, dto.largo_cm)) {
        throw new BadRequestException(
          'Para publicar un producto debes especificar peso_kg, alto_cm, ancho_cm y largo_cm mayores a 0. ' +
          'Estos datos son necesarios para calcular el costo de envío. ' +
          'Guarda el producto como "borrador" si aún no tienes esta información.',
        );
      }
    }

    const producto = await this.prisma.productos.create({
      data,
      include: {
        tiendas: true,
        categorias_productos: { include: { categorias: true } },
        producto_imagenes: true,
      },
    });

    const categoriasToAssign: number[] = [
      ...(dto.categorias ?? []),
      ...(dto.id_categoria ? [Number(dto.id_categoria)] : []),
    ];
    if (categoriasToAssign.length > 0) {
      await Promise.all(
        categoriasToAssign.map((id_categoria) =>
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

    await this.prisma.auditoria.create({
      data: {
        accion: 'crear_producto',
        tabla_afectada: 'productos',
        registro_id: String(producto.id_producto),
        valor_nuevo: { nombre: producto.nombre, precio_base: dto.precio_base, status: dto.status ?? 'activo' } as any,
      },
    });

    this.invalidatePublicCatalogCache();
    return serializeBigInts(producto);
  }

  async update(id: string, dto: UpdateProductoDto, user?: RequestUser) {
    const current = await this.prisma.productos.findUnique({
      where: { id_producto: BigInt(id) },
      include: {
        tiendas: { select: { id_productor: true } },
        lotes: { select: { id_productor: true } },
      },
    });

    if (!current || current.eliminado_en) {
      throw new NotFoundException('Producto no encontrado');
    }

    this.ensureCanManage(current.tiendas?.id_productor ?? current.lotes?.id_productor, user);

    const data: Prisma.productosUpdateInput = {};

    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.traducciones !== undefined) data.traducciones = dto.traducciones as any;
    if (dto.precio_base !== undefined) data.precio_base = new Prisma.Decimal(dto.precio_base);
    if (dto.metadata !== undefined) data.metadata = dto.metadata as any;
    if (dto.status !== undefined) data.status = dto.status;
    // Solo validar dimensiones al ACTIVAR (transición desde otro estado, no al editar uno ya activo)
    if (dto.status === 'activo' && current.status !== 'activo') {
      const pesoFinal = dto.peso_kg !== undefined ? dto.peso_kg : (current.peso_kg ? String(current.peso_kg) : null);
      const altoFinal = dto.alto_cm !== undefined ? dto.alto_cm : (current.alto_cm ? String(current.alto_cm) : null);
      const anchoFinal = dto.ancho_cm !== undefined ? dto.ancho_cm : (current.ancho_cm ? String(current.ancho_cm) : null);
      const largoFinal = dto.largo_cm !== undefined ? dto.largo_cm : (current.largo_cm ? String(current.largo_cm) : null);
      if (!this.dimensionesValidas(pesoFinal, altoFinal, anchoFinal, largoFinal)) {
        throw new BadRequestException(
          'Para activar un producto debes especificar peso_kg, alto_cm, ancho_cm y largo_cm mayores a 0.',
        );
      }
    }
    if (dto.imagen_principal_url !== undefined) data.imagen_principal_url = dto.imagen_principal_url;
    if (dto.peso_kg !== undefined) data.peso_kg = dto.peso_kg != null ? new Prisma.Decimal(dto.peso_kg) : null;
    if (dto.alto_cm !== undefined) data.alto_cm = dto.alto_cm != null ? new Prisma.Decimal(dto.alto_cm) : null;
    if (dto.ancho_cm !== undefined) data.ancho_cm = dto.ancho_cm != null ? new Prisma.Decimal(dto.ancho_cm) : null;
    if (dto.largo_cm !== undefined) data.largo_cm = dto.largo_cm != null ? new Prisma.Decimal(dto.largo_cm) : null;
    if (dto.botellas_350ml !== undefined) data.botellas_350ml = dto.botellas_350ml != null ? Number(dto.botellas_350ml) : null;
    if (dto.botellas_750ml !== undefined) data.botellas_750ml = dto.botellas_750ml != null ? Number(dto.botellas_750ml) : null;
    if (dto.id_lote !== undefined) {
      if (dto.id_lote) {
        data.lotes = { connect: { id_lote: Number(dto.id_lote) } };
      } else {
        data.lotes = { disconnect: true };
      }
    }

    const producto = await this.prisma.productos.update({
      where: { id_producto: BigInt(id) },
      data,
      include: {
        tiendas: true,
        categorias_productos: { include: { categorias: true } },
        producto_imagenes: true,
      },
    });

    // Sync producto_imagenes when a new main image is uploaded
    if (dto.imagen_principal_url) {
      await this.prisma.producto_imagenes.deleteMany({ where: { id_producto: BigInt(id) } });
      await this.prisma.producto_imagenes.create({
        data: {
          id_producto: BigInt(id),
          url: dto.imagen_principal_url,
          orden: 0,
          es_principal: true,
        },
      });
    }

    const updateCategorias = dto.categorias && Array.isArray(dto.categorias);
    const updateIdCategoria = !updateCategorias && !!dto.id_categoria;
    if (updateCategorias || updateIdCategoria) {
      await this.prisma.categorias_productos.deleteMany({
        where: { id_producto: BigInt(id) },
      });

      const categoriasToAssign: number[] = updateCategorias
        ? dto.categorias!
        : dto.id_categoria ? [Number(dto.id_categoria)] : [];

      if (categoriasToAssign.length > 0) {
        await Promise.all(
          categoriasToAssign.map((id_categoria) =>
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

    await this.prisma.auditoria.create({
      data: {
        accion: 'actualizar_producto',
        tabla_afectada: 'productos',
        registro_id: id,
        valor_anterior: { nombre: current.nombre, precio_base: current.precio_base?.toString(), status: current.status } as any,
        valor_nuevo: { nombre: dto.nombre, precio_base: dto.precio_base, status: dto.status } as any,
      },
    });

    if (
      dto.imagen_principal_url
      && dto.imagen_principal_url !== current.imagen_principal_url
    ) {
      await deleteLocalUpload(current.imagen_principal_url);
    }

    this.invalidatePublicCatalogCache();
    return serializeBigInts(producto);
  }

  async remove(id: string, user?: RequestUser) {
    const current = await this.prisma.productos.findUnique({
      where: { id_producto: BigInt(id) },
      include: {
        tiendas: { select: { id_productor: true } },
        lotes: { select: { id_productor: true } },
      },
    });

    if (!current || current.eliminado_en) {
      throw new NotFoundException('Producto no encontrado');
    }

    this.ensureCanManage(current.tiendas?.id_productor ?? current.lotes?.id_productor, user);

    const producto = await this.prisma.productos.update({
      where: { id_producto: BigInt(id) },
      data: { eliminado_en: new Date() },
    });

    await this.prisma.auditoria.create({
      data: {
        accion: 'eliminar_producto',
        tabla_afectada: 'productos',
        registro_id: id,
        valor_anterior: { nombre: current.nombre, status: current.status } as any,
      },
    });

    this.invalidatePublicCatalogCache();
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

  async assignLotesMatching() {
    const productosSinLote = await this.prisma.productos.findMany({
      where: { id_lote: null },
      include: { tiendas: { select: { id_productor: true } } },
    });

    // Collect unique producer IDs to batch-load their latest lote
    const productorIds = [
      ...new Set(
        productosSinLote
          .map((p) => p.tiendas?.id_productor)
          .filter((id): id is number => id != null),
      ),
    ];

    // Batch load: one query per producer via a raw approach using groupBy workaround
    const lotes = await Promise.all(
      productorIds.map((id_productor) =>
        this.prisma.lotes.findFirst({
          where: { id_productor },
          orderBy: { creado_en: 'desc' },
          select: { id_lote: true, id_productor: true },
        }),
      ),
    );

    // Build lookup map id_productor → id_lote
    const lotePorProductor = new Map<number, number>();
    for (const lote of lotes) {
      if (lote) lotePorProductor.set(lote.id_productor, lote.id_lote);
    }

    // Assign lotes in batch using individual updates inside a transaction
    let asignados = 0;
    let skipped = 0;
    const updates: { id_producto: bigint; id_lote: number }[] = [];

    for (const producto of productosSinLote) {
      const idProductor = producto.tiendas?.id_productor;
      if (!idProductor) { skipped++; continue; }
      const idLote = lotePorProductor.get(idProductor);
      if (!idLote) { skipped++; continue; }
      updates.push({ id_producto: producto.id_producto, id_lote: idLote });
      asignados++;
    }

    if (updates.length > 0) {
      await this.prisma.$transaction(
        updates.map(({ id_producto, id_lote }) =>
          this.prisma.productos.update({
            where: { id_producto },
            data: { id_lote },
          }),
        ),
      );
      this.invalidatePublicCatalogCache();
    }

    return {
      exito: true,
      asignados,
      omitidos: skipped,
      total: asignados + skipped,
    };
  }

  async addImagenes(id: string, files: Express.Multer.File[], user?: RequestUser) {
    const current = await this.prisma.productos.findUnique({
      where: { id_producto: BigInt(id) },
      include: {
        tiendas: { select: { id_productor: true } },
        lotes: { select: { id_productor: true } },
      },
    });
    if (!current || current.eliminado_en) throw new NotFoundException('Producto no encontrado');
    this.ensureCanManage(current.tiendas?.id_productor ?? current.lotes?.id_productor, user);

    const last = await this.prisma.producto_imagenes.findFirst({
      where: { id_producto: BigInt(id) },
      orderBy: { orden: 'desc' },
    });
    const maxOrden = last?.orden ?? 0;

    const imagenes = await this.prisma.$transaction(
      files.map((file, index) =>
        this.prisma.producto_imagenes.create({
          data: {
            id_producto: BigInt(id),
            url: `/uploads/productos/${file.filename}`,
            orden: maxOrden + index + 1,
            es_principal: false,
          },
        }),
      ),
    );

    this.invalidatePublicCatalogCache();
    return serializeBigInts(imagenes);
  }

  async removeImagen(id: string, id_imagen: string, user?: RequestUser) {
    const current = await this.prisma.productos.findUnique({
      where: { id_producto: BigInt(id) },
      include: {
        tiendas: { select: { id_productor: true } },
        lotes: { select: { id_productor: true } },
      },
    });
    if (!current || current.eliminado_en) throw new NotFoundException('Producto no encontrado');
    this.ensureCanManage(current.tiendas?.id_productor ?? current.lotes?.id_productor, user);

    const imagen = await this.prisma.producto_imagenes.findFirst({
      where: { id_imagen: BigInt(id_imagen), id_producto: BigInt(id) },
    });
    if (!imagen) throw new NotFoundException('Imagen no encontrada');

    await this.prisma.producto_imagenes.delete({ where: { id_imagen: BigInt(id_imagen) } });

    await deleteLocalUpload(imagen.url);

    this.invalidatePublicCatalogCache();
    return { ok: true };
  }
}

const productoInclude = {
  inventario: {
    select: {
      stock: true,
      stock_minimo: true,
    },
  },
  producto_imagenes: {
    select: {
      id_imagen: true,
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
      botellas_350ml: true,
      botellas_750ml: true,
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

// Include aligerado para el listado del catálogo: solo los campos que consumen
// las tarjetas del catálogo (catalog/Client.tsx), mapProductoResponse y los
// filtros (applyFiltersToProductos lee lotes.datos_api). Omite biografía del
// productor, escalares de lote no usados y datos de contacto/origen de tienda.
const productoListInclude = {
  inventario: {
    select: {
      stock: true,
      stock_minimo: true,
    },
  },
  producto_imagenes: {
    select: {
      id_imagen: true,
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
      datos_api: true,
      botellas_350ml: true,
      botellas_750ml: true,
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
  tiendas: {
    select: {
      nombre: true,
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

// Versión `select` del listado público. A diferencia de `include`, NO trae todas
// las columnas escalares de `productos`: omite las JSONB pesadas `metadata`
// (~34 KB/fila, ~190 KB por listado) y `traducciones`, que las tarjetas del
// catálogo no consumen. Reutiliza los mismos sub-selects de relaciones.
const productoListSelect = {
  // Escalares usados por catalog/Client.tsx, mapProductoResponse (itemsPublicos)
  // y los filtros. metadata y traducciones se omiten a propósito.
  id_producto: true,
  id_tienda: true,
  id_lote: true,
  nombre: true,
  descripcion: true,
  precio_base: true,
  moneda_base: true,
  status: true,
  requiere_edad_minima: true,
  imagen_principal_url: true,
  inventario: productoListInclude.inventario,
  producto_imagenes: productoListInclude.producto_imagenes,
  categorias_productos: productoListInclude.categorias_productos,
  lotes: productoListInclude.lotes,
  tiendas: productoListInclude.tiendas,
};

// Versión `select` para el listado del productor autenticado.
// Similar a productoListSelect pero incluye campos escalares extra
// que necesita la página de edición de productos (peso, dimensiones,
// lote fields, etc.) y relaciones más completas para el modal.
// Sigue omitiendo metadata y traducciones (JSONB pesadas).
const productorProductSelect = {
  id_producto: true,
  id_tienda: true,
  id_lote: true,
  nombre: true,
  descripcion: true,
  precio_base: true,
  moneda_base: true,
  status: true,
  requiere_edad_minima: true,
  imagen_principal_url: true,
  peso_kg: true,
  alto_cm: true,
  ancho_cm: true,
  largo_cm: true,
  botellas_350ml: true,
  botellas_750ml: true,
  creado_por: true,
  actualizado_por: true,
  creado_en: true,
  actualizado_en: true,
  inventario: productoListInclude.inventario,
  producto_imagenes: productoListInclude.producto_imagenes,
  categorias_productos: productoListInclude.categorias_productos,
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
      botellas_350ml: true,
      botellas_750ml: true,
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
