import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateArchivoDto, UpdateArchivoDto } from './dto/archivos.dto';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const ARCHIVOS_DIR = join(__dirname, '../../..', 'uploads', 'archivos');

function ensureDir() {
  if (!existsSync(ARCHIVOS_DIR)) {
    mkdirSync(ARCHIVOS_DIR, { recursive: true });
  }
}

@Injectable()
export class ArchivosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Guarda el buffer en disco y devuelve la ruta relativa pública. */
  async uploadToLocal(buffer: Buffer, originalName: string): Promise<string> {
    ensureDir();
    const ext = extname(originalName).toLowerCase() || '.bin';
    const fileName = `${randomUUID()}${ext}`;
    const filePath = join(ARCHIVOS_DIR, fileName);
    writeFileSync(filePath, buffer);
    return `/uploads/archivos/${fileName}`;
  }

  /** Elimina el archivo local si existe. */
  async deleteLocal(url: string): Promise<void> {
    try {
      if (!url) return;
      // url es relativa: /uploads/archivos/{nombre}
      const fileName = url.split('/').pop();
      if (!fileName) return;
      const filePath = join(ARCHIVOS_DIR, fileName);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch (_) {
      // No lanzar — si el archivo ya no existe está bien
    }
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
      await this.deleteLocal(current.url);
      nextUrl = await this.uploadToLocal(file.buffer, file.originalName);
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
    await this.deleteLocal(current.url);
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
