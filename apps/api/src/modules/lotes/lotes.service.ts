import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateLoteAtributoDto, CreateLoteDto, UpdateLoteAtributoDto, UpdateLoteDto } from './dto/lotes.dto';

const API_TRAZABILIDAD = 'https://geoportal-trazabilidad-1.onrender.com/lotes/publico';

@Injectable()
export class LotesService {
  private readonly logger = new Logger(LotesService.name);

  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    return serializeBigInts(
      await this.prisma.lotes.findMany({
        where: { eliminado_en: null },
        include: { lote_atributos: true, productores: true, regiones: true },
      }),
    );
  }

  async findByProductor(id_productor: number) {
    return serializeBigInts(
      await this.prisma.lotes.findMany({
        where: { id_productor, eliminado_en: null },
        include: {
          lote_atributos: true,
          productores: true,
          regiones: true,
          productos: {
            where: { eliminado_en: null },
            select: {
              id_producto: true,
              precio_base: true,
              status: true,
              inventario: {
                select: { id_inventario: true, stock: true },
              },
            },
          },
        },
      }),
    );
  }

  async ajustarStock(
    id_lote: number,
    cantidad: number,
    tipo: 'entrada' | 'salida' | 'ajuste',
    motivo: string,
    id_usuario?: string,
  ) {
    const producto = await this.prisma.productos.findFirst({
      where: { id_lote, eliminado_en: null },
      include: { inventario: true },
    });

    if (!producto) {
      throw new NotFoundException(
        'Este lote no tiene producto vinculado. Sincroniza primero.',
      );
    }

    let inv = producto.inventario[0];

    if (!inv) {
      inv = await this.prisma.inventario.create({
        data: { id_producto: producto.id_producto, stock: 0 },
      });
    }

    const stockNuevo =
      tipo === 'entrada'
        ? inv.stock + cantidad
        : tipo === 'salida'
        ? inv.stock - cantidad
        : cantidad;

    if (stockNuevo < 0) {
      throw new BadRequestException(
        `Stock insuficiente. Stock actual: ${inv.stock}`,
      );
    }

    const [inventarioActualizado] = await this.prisma.$transaction([
      this.prisma.inventario.update({
        where: { id_inventario: inv.id_inventario },
        data: { stock: stockNuevo, actualizado_en: new Date() },
      }),
      this.prisma.movimientos_inventario.create({
        data: {
          id_inventario: inv.id_inventario,
          id_usuario: id_usuario ?? null,
          tipo,
          cantidad,
          stock_resultante: stockNuevo,
          motivo: motivo || null,
        },
      }),
    ]);

    return serializeBigInts(inventarioActualizado);
  }

  async findOne(id_lote: number) {
    const item = await this.prisma.lotes.findUnique({
      where: { id_lote },
      include: { lote_atributos: true, productores: true, regiones: true },
    });
    if (!item || item.eliminado_en) throw new NotFoundException('Lote no encontrado');
    return serializeBigInts(item);
  }

  async create(dto: CreateLoteDto) {
    return serializeBigInts(
      await this.prisma.lotes.create({
        data: {
          id_productor: dto.id_productor,
          id_region: dto.id_region ?? null,
          codigo_lote: dto.codigo_lote.trim(),
          sitio: dto.sitio ?? null,
          fecha_produccion: dto.fecha_produccion ? new Date(dto.fecha_produccion) : null,
          volumen_total: dto.volumen_total ?? null,
          estado_lote: dto.estado_lote?.trim() ?? 'disponible',
          unidades: dto.unidades ?? null,
          grado_alcohol: dto.grado_alcohol ?? null,
          nombre_comun: dto.nombre_comun?.trim() ?? null,
          nombre_cientifico: dto.nombre_cientifico?.trim() ?? null,
          datos_api: (dto.datos_api ?? {}) as any,
        },
      }),
    );
  }

  async update(id_lote: number, dto: UpdateLoteDto) {
    return serializeBigInts(
      await this.prisma.lotes.update({
        where: { id_lote },
        data: {
          id_productor: dto.id_productor,
          id_region: dto.id_region ?? undefined,
          codigo_lote: dto.codigo_lote?.trim(),
          sitio: dto.sitio,
          fecha_produccion: dto.fecha_produccion ? new Date(dto.fecha_produccion) : undefined,
          volumen_total: dto.volumen_total,
          estado_lote: dto.estado_lote?.trim(),
          unidades: dto.unidades,
          grado_alcohol: dto.grado_alcohol,
          nombre_comun: dto.nombre_comun?.trim(),
          nombre_cientifico: dto.nombre_cientifico?.trim(),
          datos_api: dto.datos_api as any,
        },
      }),
    );
  }

  async remove(id_lote: number) {
    return serializeBigInts(
      await this.prisma.lotes.update({
        where: { id_lote },
        data: { eliminado_en: new Date() },
      }),
    );
  }

  // ─── HELPER PRIVADO: crear/actualizar producto desde datos de API ─────────────

  private async upsertProductoDesdeApi(
    id_lote: number,
    id_productor: number,
    loteApi: any,
  ): Promise<void> {
    // 1. Buscar tienda activa del productor
    const tienda = await this.prisma.tiendas.findFirst({
      where: { id_productor, eliminado_en: null, status: 'activa' },
      select: { id_tienda: true },
    });

    if (!tienda) {
      this.logger.warn(`Productor ${id_productor} sin tienda activa, no se crea producto para lote ${id_lote}.`);
      return;
    }

    const especie = loteApi.especies?.[0];

    // Nombre: "Espadín - MarcaX" o solo folio si no hay nada
    const nombreProducto = [
      especie?.nombre_comun,
      loteApi.marca,
    ].filter(Boolean).join(' - ') || loteApi.folio || 'Mezcal sin nombre';

    const metadata = {
      grado_alcohol:     loteApi.grado_alcohol       ?? null,
      sitio:             loteApi.sitio?.nombre        ?? null,
      nombre_cientifico: especie?.nombre_cientifico   ?? null,
      folio:             loteApi.folio                ?? null,
      origen:            'api_trazabilidad',
    };

    // 2. ¿Ya existe un producto vinculado a este lote?
    const productoExistente = await this.prisma.productos.findFirst({
      where: { id_lote, eliminado_en: null },
      include: {
        inventario: { select: { id_inventario: true } },
      },
    });

    if (productoExistente) {
      // ── Actualizar producto existente ─────────────────────────────────────
      await this.prisma.productos.update({
        where: { id_producto: productoExistente.id_producto },
        data: {
          nombre:         nombreProducto,
          metadata:       metadata as any,
          status:         loteApi.estado ?? 'activo',
          actualizado_en: new Date(),
        },
      });

      // Actualizar stock si viene unidades
      if (loteApi.unidades != null) {
        if (productoExistente.inventario.length > 0) {
          // Ya tiene inventario → actualizar el primer registro
          await this.prisma.inventario.update({
            where: { id_inventario: productoExistente.inventario[0].id_inventario },
            data:  { stock: loteApi.unidades, actualizado_en: new Date() },
          });
        } else {
          // Sin inventario → crear
          await this.prisma.inventario.create({
            data: {
              id_producto: productoExistente.id_producto,
              stock:       loteApi.unidades,
            },
          });
        }
      }
    } else {
      // ── Crear producto nuevo ──────────────────────────────────────────────
      const nuevoProducto = await this.prisma.productos.create({
        data: {
          id_tienda:            tienda.id_tienda,
          id_lote,
          nombre:               nombreProducto,
          descripcion:          `Mezcal registrado en trazabilidad. Folio: ${loteApi.folio ?? '-'}`,
          precio_base:          0,   // El productor lo ajusta manualmente en el panel
          moneda_base:          'MXN',
          status:               loteApi.estado ?? 'activo',
          metadata:             metadata as any,
          imagen_principal_url: null,
        },
      });

      // Crear inventario inicial si hay unidades
      if (loteApi.unidades != null) {
        await this.prisma.inventario.create({
          data: {
            id_producto: nuevoProducto.id_producto,
            stock:       loteApi.unidades,
          },
        });
      }
    }
  }

  // ─── INTEGRACIÓN CON API EXTERNA ─────────────────────────────────────────────

  async sincronizarDesdeApi(uuid_externo: string, id_productor: number, id_region?: number) {
    let apiData: any;
    try {
      const res = await fetch(`${API_TRAZABILIDAD}/${uuid_externo}`);
      if (!res.ok) throw new Error(`API respondió con status ${res.status}`);
      apiData = await res.json();
    } catch (error) {
      throw new BadRequestException(
        `No se pudo obtener el lote de la API externa: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const marcaApi = apiData.marca?.trim() ?? null;
    let productorIdFinal = id_productor;

    if (marcaApi) {
      const tiendaCoincide = await this.prisma.tiendas.findFirst({
        where: {
          nombre: { equals: marcaApi, mode: 'insensitive' },
          eliminado_en: null,
          status: 'activa',
        },
        select: { id_productor: true },
      });

      if (!tiendaCoincide) return null;
      productorIdFinal = tiendaCoincide.id_productor;
    }

    const especie = apiData.especies?.[0];
    const codigo_lote = apiData.folio ?? uuid_externo;

    const existente = await this.prisma.lotes.findFirst({
      where: { codigo_lote, eliminado_en: null },
    });

    if (existente) {
      const loteActualizado = await this.prisma.lotes.update({
        where: { id_lote: existente.id_lote },
        data: {
          id_productor:     productorIdFinal,
          marca:            apiData.marca            ?? null,
          grado_alcohol:    apiData.grado_alcohol    ?? null,
          unidades:         apiData.unidades         ?? null,
          fecha_elaboracion: apiData.fecha_elaboracion ? new Date(apiData.fecha_elaboracion) : null,
          nombre_comun:     especie?.nombre_comun    ?? null,
          nombre_cientifico: especie?.nombre_cientifico ?? null,
          estado_lote:      apiData.estado           ?? 'disponible',
          sitio:            apiData.sitio?.nombre    ?? null,
          url_trazabilidad: apiData.url_trazabilidad ?? null,
          datos_api: apiData as any,
          actualizado_en:   new Date(),
        },
      });

      // Sincronizar también el producto vinculado
      await this.upsertProductoDesdeApi(existente.id_lote, productorIdFinal, apiData);

      return serializeBigInts(loteActualizado);
    }

    const loteCreado = await this.prisma.lotes.create({
      data: {
        id_productor:     productorIdFinal,
        id_region:        id_region ?? null,
        codigo_lote,
        marca:            apiData.marca            ?? null,
        grado_alcohol:    apiData.grado_alcohol    ?? null,
        unidades:         apiData.unidades         ?? null,
        fecha_elaboracion: apiData.fecha_elaboracion ? new Date(apiData.fecha_elaboracion) : null,
        nombre_comun:     especie?.nombre_comun    ?? null,
        nombre_cientifico: especie?.nombre_cientifico ?? null,
        estado_lote:      apiData.estado           ?? 'disponible',
        sitio:            apiData.sitio?.nombre    ?? null,
        url_trazabilidad: apiData.url_trazabilidad ?? null,
        datos_api: apiData as any,
      },
    });

    // Sincronizar también el producto vinculado
    await this.upsertProductoDesdeApi(loteCreado.id_lote, productorIdFinal, apiData);

    return serializeBigInts(loteCreado);
  }

  // ─── SINCRONIZAR TODOS (botón + cron cada hora) ───────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async sincronizarTodos() {
    this.logger.log('Sincronizando lotes desde API externa...');

    let lotesApi: any[];
    try {
      const res = await fetch(API_TRAZABILIDAD);
      if (!res.ok) throw new Error(`API respondió con status ${res.status}`);
      lotesApi = await res.json();
    } catch (error) {
      this.logger.error(`Error conectando a API externa: ${error}`);
      throw new BadRequestException(`No se pudo conectar a la API externa: ${error}`);
    }

    const resultados = { creados: 0, actualizados: 0, ignorados: 0, eliminados: 0 };

    for (const loteApi of lotesApi) {
      const marcaApi = loteApi.marca?.trim() ?? null;

      // Lotes sin marca solo se sincronizan vía sincronizarDesdeApi (individual),
      // donde el productor provee su id_productor manualmente.
      if (!marcaApi) {
        resultados.ignorados++;
        continue;
      }

      const tienda = await this.prisma.tiendas.findFirst({
        where: {
          nombre: { equals: marcaApi, mode: 'insensitive' },
          eliminado_en: null,
          status: 'activa',
        },
        select: { id_productor: true },
      });

      if (!tienda) {
        resultados.ignorados++;
        continue;
      }

      const especie = loteApi.especies?.[0];
      const codigo_lote = loteApi.folio ?? loteApi.uuid;

      const existente = await this.prisma.lotes.findFirst({
        where: { codigo_lote, eliminado_en: null },
      });

      if (existente) {
        await this.prisma.lotes.update({
          where: { id_lote: existente.id_lote },
          data: {
            id_productor:     tienda.id_productor,
            marca:            loteApi.marca            ?? null,
            grado_alcohol:    loteApi.grado_alcohol    ?? null,
            unidades:         loteApi.unidades         ?? null,
            nombre_comun:     especie?.nombre_comun    ?? null,
            nombre_cientifico: especie?.nombre_cientifico ?? null,
            estado_lote:      loteApi.estado           ?? 'disponible',
            sitio:            loteApi.sitio?.nombre    ?? null,
            url_trazabilidad: loteApi.url_trazabilidad ?? null,
            datos_api:        loteApi,
            actualizado_en:   new Date(),
          },
        });

        // Sincronizar también el producto vinculado
        await this.upsertProductoDesdeApi(existente.id_lote, tienda.id_productor, loteApi);
        resultados.actualizados++;

      } else {
        const loteCreado = await this.prisma.lotes.create({
          data: {
            id_productor:     tienda.id_productor,
            codigo_lote,
            marca:            loteApi.marca            ?? null,
            grado_alcohol:    loteApi.grado_alcohol    ?? null,
            unidades:         loteApi.unidades         ?? null,
            nombre_comun:     especie?.nombre_comun    ?? null,
            nombre_cientifico: especie?.nombre_cientifico ?? null,
            estado_lote:      loteApi.estado           ?? 'disponible',
            sitio:            loteApi.sitio?.nombre    ?? null,
            url_trazabilidad: loteApi.url_trazabilidad ?? null,
            datos_api:        loteApi,
          },
        });

        // Sincronizar también el producto vinculado
        await this.upsertProductoDesdeApi(loteCreado.id_lote, tienda.id_productor, loteApi);
        resultados.creados++;
      }
    }

    // Soft-delete de lotes que ya no existen en la API externa.
    // Scope acotado: solo productores con tienda activa (mismo universo que el sync).
    const codigosEnApi = new Set(
      lotesApi.map((l: any) => l.folio ?? l.uuid).filter(Boolean),
    );

    const tiendasActivas = await this.prisma.tiendas.findMany({
      where: { eliminado_en: null, status: 'activa' },
      select: { id_productor: true },
    });
    const idsProductores = tiendasActivas.map((t) => t.id_productor);

    const { count: eliminados } = await this.prisma.lotes.updateMany({
      where: {
        eliminado_en: null,
        id_productor: { in: idsProductores },
        codigo_lote: { notIn: [...codigosEnApi] },
      },
      data: { eliminado_en: new Date() },
    });
    resultados['eliminados'] = eliminados;

    this.logger.log(`Sincronización completa: ${JSON.stringify(resultados)}`);
    return resultados;
  }

  // ─── ATRIBUTOS ────────────────────────────────────────────────────────────────

  async addAtributo(dto: CreateLoteAtributoDto) {
    return serializeBigInts(
      await this.prisma.lote_atributos.create({
        data: {
          id_lote: dto.id_lote,
          clave: dto.clave.trim(),
          valor: dto.valor ?? null,
          unidad: dto.unidad ?? null,
          fuente: dto.fuente?.trim() ?? 'manual',
        },
      }),
    );
  }

  async updateAtributo(id_atributo: string, dto: UpdateLoteAtributoDto) {
    return serializeBigInts(
      await this.prisma.lote_atributos.update({
        where: { id_atributo: BigInt(id_atributo) },
        data: {
          id_lote: dto.id_lote,
          clave: dto.clave?.trim(),
          valor: dto.valor,
          unidad: dto.unidad,
          fuente: dto.fuente?.trim(),
        },
      }),
    );
  }

  async removeAtributo(id_atributo: string) {
    await this.prisma.lote_atributos.delete({
      where: { id_atributo: BigInt(id_atributo) },
    });
    return { message: 'Atributo eliminado' };
  }

  // ─── SINCRONIZAR PRODUCTO DE UN LOTE ESPECÍFICO ──────────────────────────────

  async sincronizarProductoUnico(id_lote: number) {
    const lote = await this.prisma.lotes.findUnique({
      where: { id_lote },
      select: { id_lote: true, id_productor: true, datos_api: true },
    });

    if (!lote) {
      throw new NotFoundException('Lote no encontrado');
    }

    if (!lote.datos_api) {
      throw new BadRequestException('Este lote no tiene datos de API para sincronizar');
    }

    await this.upsertProductoDesdeApi(lote.id_lote, lote.id_productor, lote.datos_api);
    return { message: 'Producto sincronizado exitosamente' };
  }
}