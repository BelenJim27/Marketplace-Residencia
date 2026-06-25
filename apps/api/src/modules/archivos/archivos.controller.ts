import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { extname } from 'path';
import { CreateArchivoDto, UpdateArchivoDto } from './dto/archivos.dto';
import { ArchivosService } from './archivos.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';
import { Throttle } from '@nestjs/throttler';
import { documentUploadOptions } from '../../common/config/multer.config';
import {
  buildLocalUploadUrl,
  deleteUploadedFile,
  validateUploadedFileContent,
} from '../../common/utilities/local-upload';

// Subida de archivos es costosa (I/O + disco): límite por usuario más estricto que el global.
const UPLOAD_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

type AuthRequest = Request & {
  user?: { id_usuario?: string; permisos?: string[] };
};

@Controller('archivos')
export class ArchivosController {
  constructor(private readonly service: ArchivosService) {}

  private isGlobalManager(req: AuthRequest): boolean {
    return req.user?.permisos?.some((permiso) =>
      [PERMISOS.GESTIONAR_PRODUCTORES, PERMISOS.GESTIONAR_CONFIGURACION].includes(permiso as any),
    ) ?? false;
  }

  private assertUploadAccess(req: AuthRequest, entityType: string) {
    const permissions = req.user?.permisos ?? [];
    const canManage = permissions.includes(PERMISOS.GESTIONAR_ARCHIVOS);
    const canConfigureLanding = entityType === 'landing' && permissions.includes(PERMISOS.GESTIONAR_CONFIGURACION);
    const isApplicationCertificate = entityType === 'productor_certificado';
    if (!canManage && !canConfigureLanding && !isApplicationCertificate) {
      throw new ForbiddenException('No tienes permiso para subir este archivo');
    }
  }

  private async assertOwnership(req: AuthRequest, id: string) {
    if (this.isGlobalManager(req)) return;
    if (!req.user?.id_usuario) throw new ForbiddenException('Usuario no autorizado');
    await this.service.assertOwner(id, req.user.id_usuario);
  }

  @Get()
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_ARCHIVOS)
  findAll(@Req() req: Request, @Query('entidad_tipo') entidadTipo?: string, @Query('entidad_id') entidadId?: string) {
    const ownerId = this.isGlobalManager(req) ? undefined : (req as any).user.id_usuario;
    return this.service.findAll(entidadTipo, entidadId ? Number(entidadId) : undefined, ownerId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_ARCHIVOS)
  async findOne(@Param('id') id: string, @Req() req: Request) {
    await this.assertOwnership(req, id);
    return this.service.findOne(id);
  }

  @Post('upload')
  @Throttle(UPLOAD_THROTTLE)
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('archivo', documentUploadOptions))
  async createWithUpload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateArchivoDto,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    try {
      this.assertUploadAccess(req, dto.entidad_tipo);
      await validateUploadedFileContent(file);
      const localUrl = buildLocalUploadUrl('archivos', file.filename);
      return await this.service.create({
        ...dto,
        url: localUrl,
        tipo: dto.tipo?.trim() || inferTipo(file.originalname),
        validado_por: (req as any).user.id_usuario,
      });
    } catch (error) {
      await deleteUploadedFile(file);
      throw error;
    }
  }

  @Post()
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_ARCHIVOS)
  create(@Body() dto: CreateArchivoDto, @Req() req: Request) {
    return this.service.create({ ...dto, validado_por: (req as any).user.id_usuario });
  }

  @Patch(':id/upload')
  @Throttle(UPLOAD_THROTTLE)
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_ARCHIVOS)
  @UseInterceptors(FileInterceptor('archivo', documentUploadOptions))
  async updateWithUpload(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UpdateArchivoDto,
    @Req() req: Request,
  ) {
    try {
      await this.assertOwnership(req, id);
      if (file) await validateUploadedFileContent(file);
      return await this.service.updateWithFile(
        id,
        this.isGlobalManager(req) ? dto : { ...dto, validado_por: (req as any).user.id_usuario },
        file ? buildLocalUploadUrl('archivos', file.filename) : undefined,
      );
    } catch (error) {
      await deleteUploadedFile(file);
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_ARCHIVOS)
  async update(@Param('id') id: string, @Body() dto: UpdateArchivoDto, @Req() req: Request) {
    await this.assertOwnership(req, id);
    return this.service.update(id, this.isGlobalManager(req) ? dto : { ...dto, validado_por: (req as any).user.id_usuario });
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_ARCHIVOS)
  async remove(@Param('id') id: string, @Req() req: Request) {
    await this.assertOwnership(req, id);
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
