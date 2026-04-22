import { existsSync, renameSync, unlinkSync } from 'fs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { extname, join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateArchivoDto, UpdateArchivoDto } from './dto/archivos.dto';

@Injectable()
export class ArchivosService {
  constructor(private readonly prisma: PrismaService) {}
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
    const item = await this.prisma.archivos.findUnique({ where: { id_archivo: BigInt(id_archivo) }, include: { usuarios: true } });
    if (!item) throw new NotFoundException('Archivo no encontrado');
    return serializeBigInts(mapArchivoResponse(item));
  }
  async create(dto: CreateArchivoDto) {
    const created = await this.prisma.archivos.create({ data: { entidad_tipo: dto.entidad_tipo.trim(), entidad_id: dto.entidad_id ?? BigInt(0), url: dto.url ?? '', tipo: dto.tipo ?? null, estado: dto.estado?.trim() ?? 'pendiente', validado_por: dto.validado_por ?? null } });
    return serializeBigInts(mapArchivoResponse(created));
  }
  async update(id_archivo: string, dto: UpdateArchivoDto) {
    const current = await this.prisma.archivos.findUnique({ where: { id_archivo: BigInt(id_archivo) } });
    if (!current) throw new NotFoundException('Archivo no encontrado');

    const nextUrl = dto.nombre?.trim() ? renameArchivoUrl(current.url, dto.nombre) : current.url;
    const updated = await this.prisma.archivos.update({ where: { id_archivo: BigInt(id_archivo) }, data: { entidad_tipo: dto.entidad_tipo?.trim(), entidad_id: dto.entidad_id, url: dto.url ?? nextUrl, tipo: dto.tipo, estado: dto.estado?.trim(), validado_por: dto.validado_por } });
    return serializeBigInts(mapArchivoResponse(updated));
  }
  async updateWithFile(id_archivo: string, dto: UpdateArchivoDto, file?: { fileName: string; originalName: string }) {
    const current = await this.prisma.archivos.findUnique({ where: { id_archivo: BigInt(id_archivo) } });
    if (!current) throw new NotFoundException('Archivo no encontrado');

    let nextUrl = current.url;
    if (file) {
      const preferredName = dto.nombre?.trim() ? `${safeFileBaseName(dto.nombre)}${extname(file.originalName).toLowerCase() || '.bin'}` : undefined;
      nextUrl = preferredName ? moveUploadedArchivo(file.fileName, preferredName) : `/uploads/archivos/${file.fileName}`;
    } else if (dto.nombre?.trim()) {
      nextUrl = renameArchivoUrl(current.url, dto.nombre);
    }

    const updated = await this.prisma.archivos.update({ where: { id_archivo: BigInt(id_archivo) }, data: { entidad_tipo: dto.entidad_tipo?.trim(), entidad_id: dto.entidad_id, url: nextUrl, tipo: dto.tipo ?? (file ? extname(file.originalName).replace('.', '').toUpperCase() : undefined), estado: dto.estado?.trim(), validado_por: dto.validado_por } });

    if (file && current.url !== nextUrl) {
      removeArchivoFile(current.url);
    }

    return serializeBigInts(mapArchivoResponse(updated));
  }
  async remove(id_archivo: string) {
    const current = await this.prisma.archivos.findUnique({ where: { id_archivo: BigInt(id_archivo) } });
    if (!current) throw new NotFoundException('Archivo no encontrado');
    await this.prisma.archivos.delete({ where: { id_archivo: BigInt(id_archivo) } });
    removeArchivoFile(current.url);
    return { message: 'Archivo eliminado' };
  }
}

function mapArchivoResponse<T extends { url: string } | Array<{ url: string }>>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((item) => ({
      ...item,
      nombre: getArchivoNameFromUrl(item.url),
    })) as unknown as T;
  }

  return {
    ...data,
    nombre: getArchivoNameFromUrl(data.url),
  } as T;
}

function getArchivoNameFromUrl(url: string) {
  const fileName = url.split('/').pop() || 'archivo';
  return decodeURIComponent(fileName);
}

function safeFileBaseName(fileName: string) {
  return fileName
    .replace(extname(fileName), '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'archivo';
}

function getArchivoDiskPath(url: string) {
  return join(process.cwd(), url.replace(/^\//, '').replace(/\//g, '\\'));
}

function renameArchivoUrl(currentUrl: string, nextName: string) {
  const extension = extname(currentUrl) || '.bin';
  const nextFileName = `${safeFileBaseName(nextName)}${extension}`;
  const currentPath = getArchivoDiskPath(currentUrl);
  const nextPath = join(currentPath.substring(0, currentPath.lastIndexOf('\\')), nextFileName);

  if (existsSync(currentPath) && currentPath !== nextPath) {
    renameSync(currentPath, nextPath);
  }

  return `/uploads/archivos/${nextFileName}`;
}

function moveUploadedArchivo(fileName: string, preferredName: string) {
  const currentPath = join(process.cwd(), 'uploads', 'archivos', fileName);
  const targetPath = join(process.cwd(), 'uploads', 'archivos', preferredName);

  if (existsSync(currentPath) && currentPath !== targetPath) {
    renameSync(currentPath, targetPath);
  }

  return `/uploads/archivos/${preferredName}`;
}

function removeArchivoFile(url?: string | null) {
  if (!url) return;
  const filePath = getArchivoDiskPath(url);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}
