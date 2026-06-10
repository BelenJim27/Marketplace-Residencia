import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { serializeBigInts } from '../shared/serialize';
import { CreateLoteAtributoDto, CreateLoteDto, UpdateLoteAtributoDto, UpdateLoteDto } from './dto/lotes.dto';

const API_TRAZABILIDAD = 'https://geoportal-trazabilidad-1.onrender.com/lotes/publico';

@Injectable()
export class LotesService {
  private readonly logger = new Logger(LotesService.name);

  constructor(private readonly prisma: PrismaService) { }

  async findAll(query: PaginacionQueryDto = {}) {
    const pagina = query.pagina ?? 1;
    const limite = query.limite ?? 20;
    const skip = (pagina - 1) * limite;
    const where = { eliminado_en: null };
    const [items, total] = await Promise.all([
      this.prisma.lotes.findMany({
        where,
        include: { lote_atributos: true, productores: true, regiones: true },
        take: limite,
        skip,
      }),
      this.prisma.lotes.count({ where }),
    ]);
    return serializeBigInts({ items, paginacion: { pagina, limite, total, paginas: Math.ceil(total / limite) } });
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
    const tienda = await this.prisma.tiendas.findFirst({
      where: { id_productor, eliminado_en: null, status: 'activa' },
      select: { id_tienda: true },
    });

    if (!tienda) {
      this.logger.warn(`Productor ${id_productor} sin tienda activa, no se crea producto para lote ${id_lote}.`);
      return;
    }

    // El endpoint individual tiene la especie en recolecciones[0].especie
    const especie = loteApi.recolecciones?.[0]?.especie ?? loteApi.especies?.[0];

    const nombreProducto = especie?.nombre_comun || loteApi.folio || 'Mezcal sin nombre';

    // Calcular botellas a partir de capacidad_ml (del endpoint lista) y unidades
    const capacidad_ml: number | null = loteApi.capacidad_ml ?? null;
    const botellas750 = capacidad_ml === 750
      ? (loteApi.unidades ?? loteApi.botellas_750ml ?? 0)
      : (loteApi.botellas_750ml ?? 0);
    const botellas350 = capacidad_ml === 350
      ? (loteApi.unidades ?? loteApi.botellas_350ml ?? 0)
      : (loteApi.botellas_350ml ?? 0);

    // Descripción enriquecida con toda la info disponible de la API
    const partesDesc: string[] = [];
    if (especie?.nombre_comun)      partesDesc.push(`Agave: ${especie.nombre_comun}`);
    if (especie?.nombre_cientifico) partesDesc.push(`Especie científica: ${especie.nombre_cientifico}`);
    if (loteApi.grado_alcohol)      partesDesc.push(`Grado alcohólico: ${loteApi.grado_alcohol}%`);
    if (loteApi.sitio?.nombre)      partesDesc.push(`Sitio de producción: ${loteApi.sitio.nombre}`);
    if (loteApi.fecha_elaboracion)  partesDesc.push(`Fecha de elaboración: ${String(loteApi.fecha_elaboracion).split('T')[0]}`);
    if (loteApi.unidades)           partesDesc.push(`Unidades: ${loteApi.unidades}`);
    if (capacidad_ml)               partesDesc.push(`Capacidad por botella: ${capacidad_ml} ml`);
    if (botellas750 > 0)            partesDesc.push(`Botellas 750 ml: ${botellas750}`);
    if (botellas350 > 0)            partesDesc.push(`Botellas 350 ml: ${botellas350}`);
    if (loteApi.folio)              partesDesc.push(`Folio de trazabilidad: ${loteApi.folio}`);
    const etapasCompletadas = ((loteApi.etapas ?? []) as any[])
      .filter((e: any) => e.estado === 'completada')
      .map((e: any) => e.catalogo_nombre)
      .filter(Boolean);
    if (etapasCompletadas.length > 0) partesDesc.push(`Etapas de producción: ${etapasCompletadas.join(', ')}`);
    if (loteApi.impacto?.total_kg_maguey)             partesDesc.push(`Maguey utilizado: ${loteApi.impacto.total_kg_maguey} kg`);
    if (loteApi.impacto?.total_pinas)                 partesDesc.push(`Piñas cosechadas: ${loteApi.impacto.total_pinas}`);
    if (loteApi.impacto?.porcentaje_evidencia != null) partesDesc.push(`Evidencia de trazabilidad: ${loteApi.impacto.porcentaje_evidencia}%`);
    const descripcion = partesDesc.length > 0
      ? partesDesc.join('. ') + '.'
      : `Mezcal artesanal registrado en el sistema de trazabilidad. Folio: ${loteApi.folio ?? '-'}`;

    const metadata = {
      grado_alcohol:     loteApi.grado_alcohol          ?? null,
      capacidad_ml:      capacidad_ml,
      sitio:             loteApi.sitio?.nombre           ?? null,
      nombre_cientifico: especie?.nombre_cientifico      ?? null,
      nombre_comun:      especie?.nombre_comun           ?? null,
      folio:             loteApi.folio                   ?? null,
      marca:             loteApi.marca                   ?? null,
      estado_lote:       loteApi.estado                  ?? null,
      fecha_registro:    loteApi.fecha_registro           ?? null,
      fecha_elaboracion: loteApi.fecha_elaboracion        ?? null,
      url_trazabilidad:  loteApi.url_trazabilidad         ?? null,
      recolecciones:     loteApi.recolecciones            ?? null,
      impacto:           loteApi.impacto                  ?? null,
      etapas_resumen:    ((loteApi.etapas ?? []) as any[]).map((e: any) => ({
        nombre:   e.catalogo_nombre,
        estado:   e.estado,
        imagenes: ((e.multimedia ?? []) as any[]).filter((m: any) => m?.url).map((m: any) => m.url),
      })),
      origen:            'api_trazabilidad',
    };

    const tieneBotellas = botellas350 > 0 || botellas750 > 0;

    // Buscar categoría Mezcal para auto-asignarla
    const categoriaMezcal = await this.prisma.categorias.findFirst({
      where: {
        OR: [
          { slug: 'mezcal' },
          { nombre: { contains: 'mezcal', mode: 'insensitive' } },
        ],
        activo: true,
      },
      select: { id_categoria: true },
    });

    const productoExistente = await this.prisma.productos.findFirst({
      where: { id_lote, eliminado_en: null },
      include: { inventario: { select: { id_inventario: true } } },
    });

    let id_producto: bigint;

    if (productoExistente) {
      await this.prisma.productos.update({
        where: { id_producto: productoExistente.id_producto },
        data: {
          nombre:               nombreProducto,
          descripcion,
          botellas_350ml:       botellas350 > 0 ? botellas350 : productoExistente.botellas_350ml,
          botellas_750ml:       botellas750 > 0 ? botellas750 : productoExistente.botellas_750ml,
          unidad_medida:        tieneBotellas ? 'botella' : undefined,
          requiere_firma_adulto: true,
          requiere_edad_minima:  18,
          metadata:             metadata as any,
          actualizado_en:       new Date(),
        },
      });

      id_producto = productoExistente.id_producto;

      if (loteApi.unidades != null) {
        if (productoExistente.inventario.length > 0) {
          await this.prisma.inventario.update({
            where: { id_inventario: productoExistente.inventario[0].id_inventario },
            data:  { stock: loteApi.unidades, actualizado_en: new Date() },
          });
        } else {
          await this.prisma.inventario.create({
            data: { id_producto: productoExistente.id_producto, stock: loteApi.unidades },
          });
        }
      }
    } else {
      const nuevoProducto = await this.prisma.productos.create({
        data: {
          id_tienda:            tienda.id_tienda,
          id_lote,
          nombre:               nombreProducto,
          descripcion,
          precio_base:          0,
          moneda_base:          'MXN',
          status:               'activo',
          botellas_350ml:       botellas350,
          botellas_750ml:       botellas750,
          unidad_medida:        tieneBotellas ? 'botella' : null,
          requiere_firma_adulto: true,
          requiere_edad_minima:  18,
          metadata:             metadata as any,
          imagen_principal_url: null,
        },
      });

      id_producto = nuevoProducto.id_producto;

      if (loteApi.unidades != null) {
        await this.prisma.inventario.create({
          data: { id_producto: nuevoProducto.id_producto, stock: loteApi.unidades },
        });
      }
    }

    // Auto-asignar categoría Mezcal si existe en el sistema
    if (categoriaMezcal) {
      await this.prisma.categorias_productos.upsert({
        where: {
          id_categoria_id_producto: {
            id_categoria: categoriaMezcal.id_categoria,
            id_producto,
          },
        },
        create: { id_categoria: categoriaMezcal.id_categoria, id_producto },
        update: {},
      });
    }
  }

  // ─── INTEGRACIÓN CON API EXTERNA ─────────────────────────────────────────────

  async sincronizarDesdeApi(uuid_externo: string, id_productor: number, id_region?: number) {
    let apiData: any;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20_000);
      let res: Response;
      try {
        res = await fetch(`${API_TRAZABILIDAD}/${uuid_externo}`, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!res.ok) throw new Error(`La API de trazabilidad respondió con status ${res.status}`);
      apiData = await res.json();
    } catch (error) {
      const msg = error instanceof Error && error.name === 'AbortError'
        ? 'La API de trazabilidad tardó demasiado (>20s). Puede estar reiniciándose, intenta en un momento.'
        : `No se pudo obtener el lote de la API externa: ${error instanceof Error ? error.message : String(error)}`;
      throw new BadRequestException(msg);
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

    const especie = apiData.recolecciones?.[0]?.especie ?? apiData.especies?.[0];
    const codigo_lote = apiData.folio ?? uuid_externo;

    const existente = await this.prisma.lotes.findFirst({
      where: { codigo_lote },
    });

    const datosActualizacion = {
      id_productor:      productorIdFinal,
      marca:             apiData.marca            ?? null,
      grado_alcohol:     apiData.grado_alcohol    ?? null,
      unidades:          apiData.unidades         ?? null,
      botellas_350ml:    apiData.botellas_350ml   ?? null,
      botellas_750ml:    apiData.botellas_750ml   ?? null,
      fecha_elaboracion: apiData.fecha_elaboracion ? new Date(apiData.fecha_elaboracion) : null,
      nombre_comun:      especie?.nombre_comun    ?? null,
      nombre_cientifico: especie?.nombre_cientifico ?? null,
      estado_lote:       apiData.estado           ?? 'disponible',
      sitio:             apiData.sitio?.nombre    ?? null,
      url_trazabilidad:  apiData.url_trazabilidad ?? null,
      datos_api:         apiData as any,
      actualizado_en:    new Date(),
      eliminado_en:      null,
    };

    if (existente) {
      const loteActualizado = await this.prisma.lotes.update({
        where: { id_lote: existente.id_lote },
        data: datosActualizacion,
      });

      await this.upsertProductoDesdeApi(existente.id_lote, productorIdFinal, apiData);
      return serializeBigInts(loteActualizado);
    }

    const loteCreado = await this.prisma.lotes.create({
      data: {
        id_productor:      productorIdFinal,
        id_region:         id_region ?? null,
        codigo_lote,
        marca:             apiData.marca            ?? null,
        grado_alcohol:     apiData.grado_alcohol    ?? null,
        unidades:          apiData.unidades         ?? null,
        botellas_350ml:    apiData.botellas_350ml   ?? null,
        botellas_750ml:    apiData.botellas_750ml   ?? null,
        fecha_elaboracion: apiData.fecha_elaboracion ? new Date(apiData.fecha_elaboracion) : null,
        nombre_comun:      especie?.nombre_comun    ?? null,
        nombre_cientifico: especie?.nombre_cientifico ?? null,
        estado_lote:       apiData.estado           ?? 'disponible',
        sitio:             apiData.sitio?.nombre    ?? null,
        url_trazabilidad:  apiData.url_trazabilidad ?? null,
        datos_api:         apiData as any,
      },
    });

    await this.upsertProductoDesdeApi(loteCreado.id_lote, productorIdFinal, apiData);
    return serializeBigInts(loteCreado);
  }

  // ─── SINCRONIZAR TODOS ────────────────────────────────────────────────────────
  // En ambos modos solo se importan lotes cuya marca coincida con el nombre de
  // una tienda activa. Con id_productor el match se hace contra ESA tienda;
  // sin id_productor (cron horario) se compara contra todas las tiendas activas.

  @Cron(CronExpression.EVERY_HOUR)
  async sincronizarTodos(id_productor?: number) {
    this.logger.log(`Sincronizando lotes${id_productor ? ` para productor ${id_productor}` : ' (global cron)'}...`);

    let lotesApi: any[];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20_000);
      let res: Response;
      try {
        res = await fetch(API_TRAZABILIDAD, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!res.ok) throw new Error(`La API de trazabilidad respondió con status ${res.status}`);
      lotesApi = await res.json();
    } catch (error) {
      const msg = error instanceof Error && error.name === 'AbortError'
        ? 'La API de trazabilidad tardó demasiado (>20s). Puede estar reiniciándose, intenta en un momento.'
        : `No se pudo conectar a la API de trazabilidad: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(msg);
      throw new BadRequestException(msg);
    }

    // Pre-cargar la tienda del productor (modo productor) para comparar marca
    const tiendaProductor = id_productor
      ? await this.prisma.tiendas.findFirst({
          where: { id_productor, eliminado_en: null, status: 'activa' },
          select: { nombre: true },
        })
      : null;

    if (id_productor && !tiendaProductor) {
      throw new BadRequestException('El productor no tiene una tienda activa para sincronizar lotes.');
    }

    const resultados = { creados: 0, actualizados: 0, ignorados: 0, eliminados: 0 };

    for (const loteApi of lotesApi) {
      const codigo_lote = loteApi.folio ?? loteApi.uuid ?? loteApi.id_lote;

      if (!codigo_lote) { resultados.ignorados++; continue; }

      // ── Determinar a qué productor le pertenece este lote ─────────────────
      let idProductorFinal: number | null = null;

      const marcaApi = loteApi.marca?.trim() ?? null;
      if (!marcaApi) { resultados.ignorados++; continue; }

      if (id_productor) {
        // Modo productor: solo importar si la marca coincide con la tienda de este productor
        if (marcaApi.toLowerCase() !== tiendaProductor!.nombre.trim().toLowerCase()) {
          resultados.ignorados++;
          continue;
        }
        idProductorFinal = id_productor;
      } else {
        // Modo global (cron): buscar la tienda activa cuyo nombre coincida con la marca
        const tienda = await this.prisma.tiendas.findFirst({
          where: { nombre: { equals: marcaApi, mode: 'insensitive' }, eliminado_en: null, status: 'activa' },
          select: { id_productor: true },
        });

        if (!tienda) { resultados.ignorados++; continue; }
        idProductorFinal = tienda.id_productor;
      }

      // ── Obtener datos enriquecidos del endpoint individual ─────────────────
      let loteDetalle: any = loteApi;
      const uuidExterno: string | undefined = loteApi.id_lote;
      if (uuidExterno) {
        try {
          const ctrlDetalle = new AbortController();
          const toDetalle = setTimeout(() => ctrlDetalle.abort(), 15_000);
          try {
            const resDetalle = await fetch(`${API_TRAZABILIDAD}/${uuidExterno}`, { signal: ctrlDetalle.signal });
            if (resDetalle.ok) loteDetalle = await resDetalle.json();
          } finally {
            clearTimeout(toDetalle);
          }
        } catch {
          this.logger.warn(`No se pudo obtener detalle del lote ${uuidExterno}, usando datos de lista`);
        }
      }

      // capacidad_ml viene del endpoint lista (fuente autoritativa), el individual no lo tiene
      if (loteApi.capacidad_ml != null) {
        loteDetalle = { ...loteDetalle, capacidad_ml: loteApi.capacidad_ml };
      }

      const especieDetalle = loteDetalle.recolecciones?.[0]?.especie ?? loteDetalle.especies?.[0];

      // Calcular botellas a partir de capacidad_ml y unidades
      const capacidadMl: number | null = loteDetalle.capacidad_ml ?? null;
      const bot750 = capacidadMl === 750
        ? (loteDetalle.unidades ?? loteDetalle.botellas_750ml ?? null)
        : (loteDetalle.botellas_750ml ?? null);
      const bot350 = capacidadMl === 350
        ? (loteDetalle.unidades ?? loteDetalle.botellas_350ml ?? null)
        : (loteDetalle.botellas_350ml ?? null);

      // ── Construir datos comunes ────────────────────────────────────────────
      const datosComunes = {
        id_productor:      idProductorFinal,
        marca:             loteDetalle.marca            ?? null,
        grado_alcohol:     loteDetalle.grado_alcohol    ?? null,
        unidades:          loteDetalle.unidades         ?? null,
        botellas_350ml:    bot350,
        botellas_750ml:    bot750,
        nombre_comun:      especieDetalle?.nombre_comun    ?? null,
        nombre_cientifico: especieDetalle?.nombre_cientifico ?? null,
        estado_lote:       loteDetalle.estado           ?? 'disponible',
        sitio:             loteDetalle.sitio?.nombre    ?? null,
        url_trazabilidad:  loteDetalle.url_trazabilidad ?? null,
        datos_api:         loteDetalle,
        actualizado_en:    new Date(),
        eliminado_en:      null,
      };

      const existente = await this.prisma.lotes.findFirst({ where: { codigo_lote } });

      try {
        if (existente) {
          await this.prisma.lotes.update({ where: { id_lote: existente.id_lote }, data: datosComunes });
          await this.upsertProductoDesdeApi(existente.id_lote, idProductorFinal, loteDetalle);
          resultados.actualizados++;
        } else {
          const loteCreado = await this.prisma.lotes.create({
            data: { ...datosComunes, codigo_lote, eliminado_en: undefined },
          });
          await this.upsertProductoDesdeApi(loteCreado.id_lote, idProductorFinal, loteDetalle);
          resultados.creados++;
        }
      } catch (loteError) {
        this.logger.error(`Error procesando lote ${codigo_lote}: ${loteError instanceof Error ? loteError.message : String(loteError)}`);
        resultados.ignorados++;
      }
    }

    // Soft-delete de lotes que ya no existen en la API (solo en modo global)
    if (!id_productor) {
      const codigosEnApi = new Set(lotesApi.map((l: any) => l.folio ?? l.uuid).filter(Boolean));
      const tiendasActivas = await this.prisma.tiendas.findMany({
        where: { eliminado_en: null, status: 'activa' },
        select: { id_productor: true },
      });
      const idsProductores = tiendasActivas.map((t) => t.id_productor);
      const { count: eliminados } = await this.prisma.lotes.updateMany({
        where: { eliminado_en: null, id_productor: { in: idsProductores }, codigo_lote: { notIn: [...codigosEnApi] } },
        data: { eliminado_en: new Date() },
      });
      resultados['eliminados'] = eliminados;
    }

    // Modo productor: limpiar lotes de API que pertenecen al productor pero
    // cuya marca NO coincide con su tienda (creados por sincronizaciones anteriores incorrectas)
    if (id_productor && tiendaProductor) {
      const lotesErroneos = await this.prisma.lotes.findMany({
        where: {
          id_productor,
          eliminado_en: null,
          AND: [
            { marca: { not: null } },
            { NOT: { marca: { equals: tiendaProductor.nombre.trim(), mode: 'insensitive' } } },
          ],
        },
        select: { id_lote: true },
      });

      for (const lote of lotesErroneos) {
        await this.prisma.productos.updateMany({
          where: { id_lote: lote.id_lote, eliminado_en: null },
          data: { eliminado_en: new Date() },
        });
        await this.prisma.lotes.update({
          where: { id_lote: lote.id_lote },
          data: { eliminado_en: new Date() },
        });
        resultados.eliminados++;
      }
    }

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
      select: {
        id_lote:           true,
        id_productor:      true,
        datos_api:         true,
        codigo_lote:       true,
        marca:             true,
        grado_alcohol:     true,
        unidades:          true,
        botellas_350ml:    true,
        botellas_750ml:    true,
        nombre_comun:      true,
        nombre_cientifico: true,
        estado_lote:       true,
        sitio:             true,
        url_trazabilidad:  true,
        fecha_elaboracion: true,
      },
    });

    if (!lote) throw new NotFoundException('Lote no encontrado');

    // Si el lote tiene UUID externo, refrescar datos desde la API individual
    let loteApiData: any = lote.datos_api;
    const uuidExterno: string | undefined = (lote.datos_api as any)?.id_lote;

    if (uuidExterno && typeof uuidExterno === 'string' && uuidExterno.includes('-')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20_000);
        let res: Response;
        try {
          res = await fetch(`${API_TRAZABILIDAD}/${uuidExterno}`, { signal: controller.signal });
        } finally {
          clearTimeout(timeoutId);
        }
        if (res.ok) {
          const freshData = await res.json();
          // El endpoint individual no tiene capacidad_ml → preservarlo del datos_api anterior
          const oldCapacidadMl = (lote.datos_api as any)?.capacidad_ml ?? null;
          if (oldCapacidadMl != null && !(freshData.capacidad_ml > 0)) {
            loteApiData = { ...freshData, capacidad_ml: oldCapacidadMl };
          } else {
            loteApiData = freshData;
          }
          await this.prisma.lotes.update({
            where: { id_lote: lote.id_lote },
            data: { datos_api: loteApiData as any, actualizado_en: new Date() },
          });
        }
      } catch (err) {
        this.logger.warn(`No se pudo refrescar datos del lote ${lote.id_lote} desde la API: ${err}`);
      }
    }

    // Lote manual (sin datos_api): construir objeto equivalente con los campos del lote
    if (!loteApiData) {
      loteApiData = {
        folio:             lote.codigo_lote,
        marca:             lote.marca,
        grado_alcohol:     lote.grado_alcohol,
        unidades:          lote.unidades,
        botellas_350ml:    lote.botellas_350ml,
        botellas_750ml:    lote.botellas_750ml,
        estado:            lote.estado_lote,
        sitio:             lote.sitio ? { nombre: lote.sitio } : null,
        url_trazabilidad:  lote.url_trazabilidad,
        fecha_elaboracion: lote.fecha_elaboracion,
        recolecciones: lote.nombre_comun || lote.nombre_cientifico
          ? [{ especie: { nombre_comun: lote.nombre_comun, nombre_cientifico: lote.nombre_cientifico } }]
          : [],
      };
    }

    await this.upsertProductoDesdeApi(lote.id_lote, lote.id_productor, loteApiData);
    return { message: 'Producto sincronizado exitosamente' };
  }
}