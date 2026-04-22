import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { CreateArchivoDto, UpdateArchivoDto } from './dto/archivos.dto';
import { ArchivosService } from './archivos.service';
import { AuthGuard } from '../auth/guards/auth.guard';

const archivoStorage = memoryStorage();

@Controller('archivos')
export class ArchivosController {
  constructor(private readonly service: ArchivosService) {}

  @Get()
  findAll(@Query('entidad_tipo') entidadTipo?: string, @Query('entidad_id') entidadId?: string) {
    return this.service.findAll(entidadTipo, entidadId ? Number(entidadId) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('archivo', { storage: archivoStorage }))
  async createWithUpload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateArchivoDto
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    ensureAllowedFile(file.originalname);

    const cloudinaryUrl = await this.service.uploadToCloudinary(file.buffer, file.originalname);

    return this.service.create({
      ...dto,
      url: cloudinaryUrl,
      tipo: dto.tipo?.trim() || inferTipo(file.originalname),
    });
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateArchivoDto) {
    return this.service.create(dto);
  }

  @Patch(':id/upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('archivo', { storage: archivoStorage }))
  updateWithUpload(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UpdateArchivoDto
  ) {
    if (file) {
      ensureAllowedFile(file.originalname);
    }

    return this.service.updateWithFile(id, dto, file ? {
      buffer: file.buffer,
      originalName: file.originalname,
    } : undefined);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateArchivoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
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