import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateLoteAtributoDto, CreateLoteDto, UpdateLoteAtributoDto, UpdateLoteDto } from './dto/lotes.dto';

const API_TRAZABILIDAD = 'https://geoportal-trazabilidad-1.onrender.com/lotes/publico';

@Injectable()
export class LotesService {
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
        include: { lote_atributos: true, productores: true, regiones: true },
      }),
    );
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
          datos_api: (dto.datos_api ?? {}) as Prisma.InputJsonValue,
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
          datos_api: dto.datos_api as Prisma.InputJsonValue | undefined,
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

  // ─── INTEGRACIÓN CON API EXTERNA ─────────────────────────────────────────

  /**
   * Consulta la API de trazabilidad con el UUID del lote externo,
   * y guarda/actualiza los datos en la tabla lotes de nuestra BD.
   */
  async sincronizarDesdeApi(uuid_externo: string, id_productor: number, id_region?: number) {
    // 1. Consultar la API externa
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
    // 2. Mapear los datos de la API a nuestra estructura
    const especie = apiData.especies?.[0];
    const codigo_lote = apiData.folio ?? uuid_externo;

    // 3. Verificar si ya existe ese lote (por codigo_lote)
    const existente = await this.prisma.lotes.findFirst({
      where: { codigo_lote, eliminado_en: null },
    });

    if (existente) {
      // Actualizar si ya existe
      return serializeBigInts(
        await this.prisma.lotes.update({
          where: { id_lote: existente.id_lote },
          data: {
            marca: apiData.marca ?? null,
            grado_alcohol: apiData.grado_alcohol ?? null,
            unidades: apiData.unidades ?? null,
            fecha_elaboracion: apiData.fecha_elaboracion ? new Date(apiData.fecha_elaboracion) : null,
            nombre_comun: especie?.nombre_comun ?? null,
            nombre_cientifico: especie?.nombre_cientifico ?? null,
            estado_lote: apiData.estado ?? 'disponible',
            sitio: apiData.sitio?.nombre ?? null,
            datos_api: apiData as Prisma.InputJsonValue,
            actualizado_en: new Date(),
          },
        }),
      );
    }

    // 4. Crear nuevo lote con los datos de la API
    return serializeBigInts(
      await this.prisma.lotes.create({
        data: {
          id_productor,
          id_region: id_region ?? null,
          codigo_lote,
          marca: apiData.marca ?? null,
          grado_alcohol: apiData.grado_alcohol ?? null,
          unidades: apiData.unidades ?? null,
          fecha_elaboracion: apiData.fecha_elaboracion ? new Date(apiData.fecha_elaboracion) : null,
          nombre_comun: especie?.nombre_comun ?? null,
          nombre_cientifico: especie?.nombre_cientifico ?? null,
          estado_lote: apiData.estado ?? 'disponible',
          sitio: apiData.sitio?.nombre ?? null,
          datos_api: apiData as Prisma.InputJsonValue,
        },
      }),
    );
  }

  // ─── ATRIBUTOS ────────────────────────────────────────────────────────────

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
}