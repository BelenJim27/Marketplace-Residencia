import { Injectable, NotFoundException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../../prisma/prisma.service';
import { configureCloudinary, uploadToCloudinary as uploadBufferToCloudinary } from '../shared/cloudinary';
import { serializeBigInts } from '../shared/serialize';
import { CreateArchivoDto, UpdateArchivoDto } from './dto/archivos.dto';

@Injectable()
export class ArchivosService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadToCloudinary(buffer: Buffer, originalName: string): Promise<string> {
    void originalName;
    return uploadBufferToCloudinary(buffer, 'archivos');
  }

  async deleteFromCloudinary(url: string) {
    try {
      configureCloudinary();
      const parts = url.split('/');
      const publicId = `archivos/${parts[parts.length - 1].split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (_) {}
  }

  async findAll(entidad_tipo?: string, entidad_id?: number) {
    return serializeBigInts(mapArchivoResponse(await this.prisma.archivos.findMany({
      where: {
        ...(entidad_tipo ? { entidad_tipo } : {}),
        ...(entidad_id != null ? { entidad_id } : {}),
      },
      include: { usuarios: true },
      orderBy: { creado_en: 'desc' },
    })));
  }

  async findOne(id_archivo: string) {
    const item = await this.prisma.archivos.findUnique({
      where: { id_archivo: BigInt(id_archivo) },
      include: { usuarios: true }
    });
    if (!item) throw new NotFoundException('Archivo no encontrado');
    return serializeBigInts(mapArchivoResponse(item));
  }

  async create(dto: CreateArchivoDto) {
    const created = await this.prisma.archivos.create({
      data: {
        entidad_tipo: dto.entidad_tipo.trim(),
        entidad_id: dto.entidad_id ?? BigInt(0),
        url: dto.url ?? '',
        tipo: dto.tipo ?? null,
        estado: dto.estado?.trim() ?? 'pendiente',
        validado_por: dto.validado_por ?? null,
      }
    });
    return serializeBigInts(mapArchivoResponse(created));
  }

  async update(id_archivo: string, dto: UpdateArchivoDto) {
    const current = await this.prisma.archivos.findUnique({
      where: { id_archivo: BigInt(id_archivo) }
    });
    if (!current) throw new NotFoundException('Archivo no encontrado');

    const updated = await this.prisma.archivos.update({
      where: { id_archivo: BigInt(id_archivo) },
      data: {
        entidad_tipo: dto.entidad_tipo?.trim(),
        entidad_id: dto.entidad_id,
        url: dto.url ?? current.url,
        tipo: dto.tipo,
        estado: dto.estado?.trim(),
        validado_por: dto.validado_por,
      }
    });
    return serializeBigInts(mapArchivoResponse(updated));
  }

  async updateWithFile(id_archivo: string, dto: UpdateArchivoDto, file?: { buffer: Buffer; originalName: string }) {
    const current = await this.prisma.archivos.findUnique({
      where: { id_archivo: BigInt(id_archivo) }
    });
    if (!current) throw new NotFoundException('Archivo no encontrado');

    let nextUrl = current.url;
    if (file) {
      // Elimina el archivo viejo de Cloudinary
      await this.deleteFromCloudinary(current.url);
      // Sube el nuevo
      nextUrl = await this.uploadToCloudinary(file.buffer, file.originalName);
    }

    const updated = await this.prisma.archivos.update({
      where: { id_archivo: BigInt(id_archivo) },
      data: {
        entidad_tipo: dto.entidad_tipo?.trim(),
        entidad_id: dto.entidad_id,
        url: nextUrl,
        tipo: dto.tipo,
        estado: dto.estado?.trim(),
        validado_por: dto.validado_por,
      }
    });
    return serializeBigInts(mapArchivoResponse(updated));
  }

  async remove(id_archivo: string) {
    const current = await this.prisma.archivos.findUnique({
      where: { id_archivo: BigInt(id_archivo) }
    });
    if (!current) throw new NotFoundException('Archivo no encontrado');
    await this.prisma.archivos.delete({ where: { id_archivo: BigInt(id_archivo) } });
    await this.deleteFromCloudinary(current.url);
    return { message: 'Archivo eliminado' };
  }
}

function mapArchivoResponse<T extends { url: string } | Array<{ url: string }>>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((item) => ({
      ...item,
      nombre: item.url.split('/').pop() || 'archivo',
    })) as unknown as T;
  }
  return { ...data, nombre: data.url.split('/').pop() || 'archivo' } as T;
}
