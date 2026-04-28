import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { serializeBigInts, toBigIntId } from "../shared/serialize";
import { CreateDireccionDto, UpdateDireccionDto } from "./dto/direcciones.dto";

@Injectable()
export class DireccionesService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() {
    return serializeBigInts(
      await this.prisma.direcciones.findMany({
        where: { eliminado_en: null },
        include: { usuarios: true },
      }),
    );
  }
  async findByUser(id_usuario: string) {
    return serializeBigInts(
      await this.prisma.direcciones.findMany({
        where: { id_usuario, eliminado_en: null },
        include: { usuarios: true },
      }),
    );
  }
  async create(dto: CreateDireccionDto) {
    console.log("[DireccionesService.create] DTO recibido:", JSON.stringify(dto, null, 2));
    if (dto.es_predeterminada) {
      await this.prisma.direcciones.updateMany({
        where: { id_usuario: dto.id_usuario, es_predeterminada: true, eliminado_en: null },
        data: { es_predeterminada: false },
      });
    }
    const resultado = await this.prisma.direcciones.create({
      data: {
        id_usuario: dto.id_usuario,
        nombre_destinatario: dto.nombre_destinatario ?? null,
        telefono: dto.telefono ?? null,
        nombre_etiqueta: dto.nombre_etiqueta ?? null,
        es_predeterminada: dto.es_predeterminada ?? false,
        es_internacional: dto.es_internacional ?? false,
        calle: dto.calle ?? null,
        numero: dto.numero ?? null,
        colonia: dto.colonia ?? null,
        linea_1: dto.linea_1 ?? null,
        linea_2: dto.linea_2 ?? null,
        ciudad: dto.ciudad ?? null,
        estado: dto.estado ?? null,
        codigo_postal: dto.codigo_postal ?? null,
        pais_iso2: dto.pais_iso2 ?? null,
        referencia: dto.referencia ?? null,
        tipo: dto.tipo ?? null,
        ubicacion: (dto.ubicacion ?? {}) as Prisma.InputJsonValue,
      },
    });
    console.log("[DireccionesService.create] Guardado en BD:", JSON.stringify(resultado, null, 2));
    return serializeBigInts(resultado);
  }
  async update(id: string, dto: UpdateDireccionDto, callerUserId: string) {
    const direccion = await this.prisma.direcciones.findFirst({
      where: { id_direccion: toBigIntId(id) },
    });

    if (!direccion) {
      throw new NotFoundException('Dirección no encontrada');
    }

    if (direccion.id_usuario !== callerUserId) {
      throw new ForbiddenException('No tienes permiso para editar esta dirección');
    }

    if (dto.es_predeterminada) {
      await this.prisma.direcciones.updateMany({
        where: {
          id_usuario: callerUserId,
          es_predeterminada: true,
          eliminado_en: null,
          NOT: { id_direccion: toBigIntId(id) },
        },
        data: { es_predeterminada: false },
      });
    }

    return serializeBigInts(
      await this.prisma.direcciones.update({
        where: { id_direccion: toBigIntId(id) },
        data: {
          nombre_destinatario: dto.nombre_destinatario,
          telefono: dto.telefono,
          nombre_etiqueta: dto.nombre_etiqueta,
          es_predeterminada: dto.es_predeterminada,
          es_internacional: dto.es_internacional,
          calle: dto.calle,
          numero: dto.numero,
          colonia: dto.colonia,
          linea_1: dto.linea_1,
          linea_2: dto.linea_2,
          ciudad: dto.ciudad,
          estado: dto.estado,
          codigo_postal: dto.codigo_postal,
          pais_iso2: dto.pais_iso2,
          referencia: dto.referencia,
          tipo: dto.tipo,
          ubicacion: dto.ubicacion as Prisma.InputJsonValue | undefined,
        },
      }),
    );
  }
  async remove(id: string, callerUserId: string) {
    const direccion = await this.prisma.direcciones.findFirst({
      where: { id_direccion: toBigIntId(id) },
    });

    if (!direccion) {
      throw new NotFoundException('Dirección no encontrada');
    }

    if (direccion.id_usuario !== callerUserId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta dirección');
    }

    return serializeBigInts(
      await this.prisma.direcciones.update({
        where: { id_direccion: toBigIntId(id) },
        data: { eliminado_en: new Date() },
      }),
    );
  }
}
