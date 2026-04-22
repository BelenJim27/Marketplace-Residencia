import { existsSync, mkdirSync, renameSync } from 'fs';
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, StorageEngine } from 'multer';
import { extname, join } from 'path';
import { CreateArchivoDto, UpdateArchivoDto } from './dto/archivos.dto';
import { ArchivosService } from './archivos.service';
import { AuthGuard } from '../auth/guards/auth.guard';

const uploadPath = join(process.cwd(), 'uploads', 'archivos');

const archivoStorage: StorageEngine = diskStorage({
  destination: (_request, _file, callback) => {
    mkdirSync(uploadPath, { recursive: true });
    callback(null, uploadPath);
  },
  filename: (_request, file, callback) => {
    const safeName = getSafeBaseName(file.originalname);
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${safeName || 'archivo'}-${suffix}${normalizeExtension(file.originalname)}`);
  },
});

@Controller('archivos')
export class ArchivosController {
  constructor(private readonly service: ArchivosService) {}
  @Get() findAll(@Query('entidad_tipo') entidadTipo?: string, @Query('entidad_id') entidadId?: string) {
    return this.service.findAll(entidadTipo, entidadId ? Number(entidadId) : undefined);
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('archivo', { storage: archivoStorage }))
  createWithUpload(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: CreateArchivoDto) {
    if (!file) throw new BadRequestException('Archivo requerido');
    ensureAllowedFile(file.originalname);

    const targetName = dto.nombre?.trim() ? `${getSafeBaseName(dto.nombre)}${normalizeExtension(file.originalname)}` : undefined;
    const finalUrl = targetName ? renameUploadedFile(file.filename, targetName) : `/uploads/archivos/${file.filename}`;

    return this.service.create({
      ...dto,
      url: finalUrl,
      tipo: dto.tipo?.trim() || inferTipo(file.originalname),
    });
  }
  @Post() 
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateArchivoDto) { return this.service.create(dto); }
  @Patch(':id/upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('archivo', { storage: archivoStorage }))
  updateWithUpload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @Body() dto: UpdateArchivoDto) {
    if (file) {
      ensureAllowedFile(file.originalname);
    }

    return this.service.updateWithFile(id, dto, file ? {
      fileName: file.filename,
      originalName: file.originalname,
    } : undefined);
  }
  @Patch(':id') 
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateArchivoDto) { return this.service.update(id, dto); }
  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}

function getSafeBaseName(fileName: string) {
  return fileName
    .replace(extname(fileName), '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function normalizeExtension(fileName: string) {
  const extension = extname(fileName).toLowerCase();
  return extension || '.bin';
}

function inferTipo(fileName: string) {
  return normalizeExtension(fileName).replace('.', '').toUpperCase();
}

function ensureAllowedFile(fileName: string) {
  const extension = normalizeExtension(fileName);
  if (!['.pdf', '.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    throw new BadRequestException('Solo se permiten archivos PDF o imagen');
  }
}

function renameUploadedFile(currentFileName: string, targetFileName: string) {
  const currentPath = join(uploadPath, currentFileName);
  const targetPath = join(uploadPath, targetFileName);

  if (existsSync(currentPath) && currentPath !== targetPath) {
    renameSync(currentPath, targetPath);
  }

  return `/uploads/archivos/${targetFileName}`;
}
