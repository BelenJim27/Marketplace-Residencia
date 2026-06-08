import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, ParseUUIDPipe, ParseIntPipe, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { AssignUsuarioRolDto, CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuarios.dto';
import { UsuariosService } from './usuarios.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/guards/roles.decorator';

const USUARIOS_DIR = join(__dirname, '../../..', 'uploads', 'usuarios');

function isAdmin(user: any): boolean {
  return user?.roles?.some((r: string) => r.toLowerCase() === 'administrador') ?? false;
}

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Get()
  findAll(@Query() query: PaginacionQueryDto) {
    return this.service.findAll(query);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    if (!isAdmin(req.user) && req.user.id_usuario !== id) {
      throw new ForbiddenException('No puedes ver el perfil de otro usuario');
    }
    return this.service.findOne(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
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
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, USUARIOS_DIR),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase() || '.jpg';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          return cb(new BadRequestException('Solo se permiten imágenes JPG, PNG o WebP'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    if (!isAdmin(req.user) && req.user.id_usuario !== id) {
      throw new ForbiddenException('Solo puedes cambiar tu propia foto');
    }
    if (!file) {
      throw new BadRequestException('Archivo de foto requerido');
    }
    const fotoUrl = `/uploads/usuarios/${file.filename}`;
    return this.service.update(id, { foto_url: fotoUrl });
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Post(':id/roles')
  addRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignUsuarioRolDto) {
    return this.service.addRole(id, dto.id_rol);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('administrador')
  @Delete(':id/roles/:id_rol')
  removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('id_rol', ParseIntPipe) id_rol: number,
  ) {
    return this.service.removeRole(id, id_rol);
  }
}
