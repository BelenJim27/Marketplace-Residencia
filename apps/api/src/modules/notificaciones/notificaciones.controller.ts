import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { CreateNotificacionDto, UpdateNotificacionDto } from './dto/notificaciones.dto';
import { NotificacionesService } from './notificaciones.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}

  private canManageUsers(req: Request & { user?: { permisos?: string[] } }): boolean {
    return req.user?.permisos?.includes(PERMISOS.GESTIONAR_USUARIOS) ?? false;
  }

  private assertUserAccess(req: Request & { user?: { id_usuario?: string; permisos?: string[] } }, idUsuario: string) {
    if (req.user?.id_usuario !== idUsuario && !this.canManageUsers(req)) {
      throw new ForbiddenException('No tienes permiso para acceder a estas notificaciones');
    }
  }
  @Get()
  @UseGuards(AuthGuard, PermisosGuard)
  @RequireAnyPermission(PERMISOS.GESTIONAR_USUARIOS)
  findAll(@Query() query: PaginacionQueryDto) { return this.service.findAll(query); }
  @Get(':id_usuario')
  @UseGuards(AuthGuard)
  findByUser(@Param('id_usuario', ParseUUIDPipe) id_usuario: string, @Req() req: Request) {
    this.assertUserAccess(req, id_usuario);
    return this.service.findByUser(id_usuario);
  }
  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateNotificacionDto, @Req() req: Request) {
    this.assertUserAccess(req, dto.id_usuario);
    return this.service.create(dto);
  }
  @Patch(':id')
  @UseGuards(AuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateNotificacionDto, @Req() req: Request) {
    const ownerId = await this.service.findOwnerId(id);
    this.assertUserAccess(req, ownerId);
    if (dto.id_usuario && dto.id_usuario !== ownerId && !this.canManageUsers(req)) {
      throw new ForbiddenException('No puedes transferir esta notificación a otro usuario');
    }
    return this.service.update(id, dto);
  }
  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Param('id') id: string, @Req() req: Request) {
    this.assertUserAccess(req, await this.service.findOwnerId(id));
    return this.service.remove(id);
  }
}
