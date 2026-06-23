import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { CreateArchivoDto, UpdateArchivoDto } from './dto/archivos.dto';
import { ArchivosService } from './archivos.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { Throttle } from '@nestjs/throttler';
import { documentUploadOptions } from '../../common/config/multer.config';
import {
  buildLocalUploadUrl,
  deleteUploadedFile,
  validateUploadedFileContent,
} from '../../common/utilities/local-upload';

// Subida de archivos es costosa (I/O + disco): límite por usuario más estricto que el global.
const UPLOAD_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

@Controller('archivos')
export class ArchivosController {
  constructor(private readonly service: ArchivosService) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  findAll(@Query('entidad_tipo') entidadTipo?: string, @Query('entidad_id') entidadId?: string) {
    return this.service.findAll(entidadTipo, entidadId ? Number(entidadId) : undefined);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('upload')
  @Throttle(UPLOAD_THROTTLE)
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('archivo', documentUploadOptions))
  async createWithUpload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateArchivoDto
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    try {
      await validateUploadedFileContent(file);
      const localUrl = buildLocalUploadUrl('archivos', file.filename);
      return await this.service.create({
        ...dto,
        url: localUrl,
        tipo: dto.tipo?.trim() || inferTipo(file.originalname),
      });
    } catch (error) {
      await deleteUploadedFile(file);
      throw error;
    }
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateArchivoDto) {
    return this.service.create(dto);
  }

  @Patch(':id/upload')
  @Throttle(UPLOAD_THROTTLE)
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('archivo', documentUploadOptions))
  async updateWithUpload(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UpdateArchivoDto
  ) {
    try {
      if (file) await validateUploadedFileContent(file);
      return await this.service.updateWithFile(
        id,
        dto,
        file ? buildLocalUploadUrl('archivos', file.filename) : undefined,
      );
    } catch (error) {
      await deleteUploadedFile(file);
      throw error;
    }
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
