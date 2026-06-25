import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, ParseUUIDPipe, ParseIntPipe, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssignUsuarioRolDto, CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuarios.dto';
import { UsuariosService } from './usuarios.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';
import { userPhotoOptions } from '../../common/config/multer.config';
import {
  buildLocalUploadUrl,
  deleteUploadedFile,
  validateUploadedFileContent,
} from '../../common/utilities/local-upload';

function isAdmin(user: any): boolean {
  return user?.permisos?.includes(PERMISOS.GESTIONAR_USUARIOS) ?? false;
}

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_USUARIOS)
  @Get()
  findAll(@Query() query: PaginacionQueryDto) {
    return this.service.findAll(query);
  }

  // CCPA: exportar mis datos personales (right to know). Anclado al token.
  @UseGuards(AuthGuard)
  @Get('me/export')
  exportMyData(@Req() req: any) {
    return this.service.exportData(req.user.id_usuario);
  }

  // CCPA: solicitar borrado de mi cuenta (right to delete). Anclado al token.
  @UseGuards(AuthGuard)
  @Post('me/deletion-request')
  requestMyDeletion(@Req() req: any) {
    return this.service.requestDeletion(req.user.id_usuario);
  }

  // CCPA: "Do Not Sell My Personal Information" (opt-out por email, sin sesión requerida).
  // Público intencionalmente: usuarios no autenticados también tienen este derecho bajo CCPA.
  @Post('ccpa/opt-out')
  ccpaOptOut(@Body() body: { email?: string }) {
    return this.service.ccpaOptOut(body?.email ?? '');
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    if (!isAdmin(req.user) && req.user.id_usuario !== id) {
      throw new ForbiddenException('No puedes ver el perfil de otro usuario');
    }
    return this.service.findOne(id);
  }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_USUARIOS)
  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.service.create(dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUsuarioDto, @Req() req: any) {
    if (!isAdmin(req.user) && req.user.id_usuario !== id) {
      throw new ForbiddenException('Solo puedes modificar tu propio perfil');
    }
    return this.service.update(id, dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/foto')
  @UseInterceptors(FileInterceptor('foto', userPhotoOptions))
  async uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    try {
      if (!isAdmin(req.user) && req.user.id_usuario !== id) {
        throw new ForbiddenException('Solo puedes cambiar tu propia foto');
      }
      if (!file) {
        throw new BadRequestException('Archivo de foto requerido');
      }
      await validateUploadedFileContent(file);
      const fotoUrl = buildLocalUploadUrl('usuarios', file.filename);
      return await this.service.update(id, { foto_url: fotoUrl });
    } catch (error) {
      await deleteUploadedFile(file);
      throw error;
    }
  }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_USUARIOS)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_USUARIOS)
  @Post(':id/roles')
  addRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignUsuarioRolDto) {
    return this.service.addRole(id, dto.id_rol);
  }

  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_USUARIOS)
  @Delete(':id/roles/:id_rol')
  removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('id_rol', ParseIntPipe) id_rol: number,
  ) {
    return this.service.removeRole(id, id_rol);
  }
}
