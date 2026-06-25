import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AssignPermisoDto, CreatePermisoDto, CreateRolDto, UpdatePermisoDto, UpdateRolDto } from './dto/roles.dto';
import { RolesService } from './roles.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../auth/guards/rbac.guard';
import { RequireAnyPermission } from '../auth/guards/permisos.decorator';
import { PERMISOS } from '../../common/permisos-catalog';

@Controller('roles')
@UseGuards(AuthGuard, PermisosGuard)
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS, PERMISOS.GESTIONAR_USUARIOS)
  findAll() { return this.service.findAll(); }

  @Get('permisos')
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS)
  findAllPermisos() { return this.service.findAllPermisos(); }

  @Get('permisos/:id')
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS)
  findPermiso(@Param('id', ParseIntPipe) id: number) { return this.service.findPermiso(id); }

  @Get(':id')
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS, PERMISOS.GESTIONAR_USUARIOS)
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS)
  create(@Body() dto: CreateRolDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRolDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS)
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }

  @Post(':id/permisos')
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS)
  addPermiso(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignPermisoDto) { return this.service.addPermiso(id, dto.id_permiso); }

  @Delete(':id/permisos/:id_permiso')
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS)
  removePermisoFromRole(@Param('id', ParseIntPipe) id: number, @Param('id_permiso', ParseIntPipe) id_permiso: number) { return this.service.removePermisoFromRole(id, id_permiso); }

  @Post('permisos')
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS)
  createPermiso(@Body() dto: CreatePermisoDto) { return this.service.createPermiso(dto); }

  @Patch('permisos/:id')
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS)
  updatePermiso(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePermisoDto) { return this.service.updatePermiso(id, dto); }

  @Delete('permisos/:id')
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS)
  removePermiso(@Param('id', ParseIntPipe) id: number) { return this.service.removePermiso(id); }

  @Get(':id/permisos')
  @RequireAnyPermission(PERMISOS.GESTIONAR_ROLES_PERMISOS)
  getPermisosByRole(@Param('id', ParseIntPipe) id: number) { return this.service.getPermisosByRole(id); }
}
